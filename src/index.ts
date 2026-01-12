#!/usr/bin/env node
import { select, input, confirm } from "@inquirer/prompts";
import { execSync } from "node:child_process";
import { ensureGitRepo, getChangedFiles, runGitCommit } from "./cli/git";

/**
 * コミット種別の定義
 *
 */
const TYPES = [
  { value: "feat", name: "feat - 機能追加" },
  { value: "fix", name: "fix - バグ修正" },
  { value: "docs", name: "docs - ドキュメント" },
  { value: "style", name: "style - 見た目・整形" },
  { value: "refactor", name: "refactor - リファクタ" },
  { value: "test", name: "test - テスト" },
  { value: "chore", name: "chore - 雑務" },
  { value: "perf", name: "perf - パフォーマンス改善" },
] as const;

type CommitType = (typeof TYPES)[number]["value"];

/**
 * CLI に渡されたコマンドライン引数
 *
 */
const args = process.argv.slice(2);

/**
 * dry-run モード判定
 *
 */
const isDryRun = args.includes("--dry-run");

/**
 * scope をコミットメッセージで安全に使える形式に正規化する
 *
 * - 前後の空白を除去する
 * - 連続する空白はハイフン（-）に変換する
 * - 英数字・`._-` 以外の文字は除去する
 *
 * @param scope - ユーザーが入力した文字列
 * @returns 正規化された文字列
 */
function sanitizeScope(scope: string): string {
  return scope
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

/**
 * 変更ファイルのパスからscope候補を抽出する
 *
 * 各ファイルパスに含まれる「ディレクトリ階層」をすべてscope候補として扱う。
 * 例:
 *   src/AAA/BBB/CCC/modify.ts
 *   → ["src", "AAA", "BBB", "CCC"]
 *
 *
 * @param files - ステージング済みの変更ファイルパス一覧
 * @returns 重複を除去し、アルファベット順にソートされたscope候補配列
 */
function extractScopeCandidates(files: string[]): string[] {
  const scopes: string[] = [];

  for (const file of files) {
    const normalized = file.replaceAll("\\", "/");
    const parts = normalized.split("/").filter(Boolean);
    const dirs = parts.slice(0, -1);

    for (const dir of dirs) {
      scopes.push(dir);
    }
  }
  return Array.from(new Set(scopes)).sort();
}

/**
 * scopeをユーザーに選択・入力させるためのプロンプト
 *
 * 変更ファイルから抽出したscope候補数に応じて、
 * 入力方法を切り替えることでユーザーの負担を最小化する。
 *
 * - 候補が 0 件:
 *   → 自由入力のみ（文脈が存在しないため）
 * - 候補が 1 件:
 *   → suggestedとして提示し、Enterでそのまま採用できる
 * - 候補が複数件:
 *   → selectで候補一覧を表示し、必要であればcustom入力も可能
 *
 * @param files - ステージング済みの変更ファイルパス一覧
 * @returns 選択または入力されたscope文字列（未指定の場合は空文字）
 */
async function promptScope(files: string[]): Promise<string> {
  const candidates = extractScopeCandidates(files);

  if (candidates.length === 0) {
    return await input({ message: "Scope(任意)", default: "" });
  }

  if (candidates.length === 1) {
    return await input({
      message: `Scope(任意) [suggested: ${candidates[0]}]`,
      default: "",
    });
  }

  const picked = await select<string>({
    message: "Scope を選択(または custom)",
    choices: [
      ...candidates.map((c) => ({ value: c, name: c })),
      { value: "", name: "(none)" },
      { value: "__custom__", name: "(custom)" },
    ],
  });

  if (picked === "__custom__") {
    return await input({ message: "Scope(任意・自由入力)", default: "" });
  }

  return picked;
}

/**
 * ファイルパスからモジュール名を取得する
 *
 * stamp では、変更ファイル一覧を分かりやすく表示するために
 * 「トップレベルディレクトリ」をモジュールとして扱う。
 *
 * @param filePath - 変更されたファイルのパス
 * @returns モジュール名（トップレベルディレクトリ）
 */
function getModuleKey(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length === 0) return "(unknown)";

  return parts[0];
}

/**
 * 変更ファイルをモジュール単位でグルーピングする
 *
 * getModuleKey()で判定したモジュール名をキーとして、
 * 各モジュールに属するファイル一覧をMap形式でまとめる。
 *
 * @param files - ステージング済みの変更ファイルパス一覧
 * @returns
 *   モジュール名をキー、ファイルパス配列を値とする Map
 *   - key: モジュール名
 *   - value: そのモジュールに属するファイル一覧
 */
function groupFilesByModule(files: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const f of files) {
    const key = getModuleKey(f);
    const arr = map.get(key) ?? [];
    arr.push(f);
    map.set(key, arr);
  }

  for (const [k, arr] of map) {
    map.set(k, arr.slice().sort());
  }

  return map;
}

/**
 * 変更ファイルをモジュール単位で標準出力に表示する
 *
 * @param files - ステージング済みの変更ファイルパス一覧
 * @returns void
 */
function printChangedFilesByModule(files: string[]) {
  if (files.length === 0) {
    console.log("Changed files: none");
    return;
  }

  const grouped = groupFilesByModule(files);

  const keys = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  console.log("\nChanged files (by module):");
  for (const key of keys) {
    const list = grouped.get(key)!;
    console.log(`\n[${key}] (${list.length})`);
    for (const f of list) {
      console.log(`- ${f}`);
    }
  }
}

async function main() {
  if (!isDryRun) {
    ensureGitRepo();
  }

  const type = await select<CommitType>({
    message: "Type を選択",
    choices: TYPES.map((t) => ({ value: t.value, name: t.name })),
  });

  const files = getChangedFiles();
  printChangedFilesByModule(files);

  const scopeRaw = await promptScope(files);
  console.log("Selected scope:", scopeRaw || "none");

  const description = await input({
    message: "説明(必須)",
    validate: (v) => (v.trim() ? true : "説明は必須です"),
  });

  const scope = sanitizeScope(scopeRaw);
  const desc = description.trim();

  const message = scope ? `${type}(${scope}): ${desc}` : `${type}: ${desc}`;

  console.log("\ncommit message:");
  console.log(message);

  if (isDryRun) {
    console.log("\n[dry-run] commit was not executed.");
  } else {
    const ok = await confirm({
      message: "このメッセージで git commit しますか？",
      default: true,
    });

    if (ok) runGitCommit(message);
  }
}

main().catch((e) => {
  if (e?.name === "ExitPromptError") process.exit(0);
  console.error("stamp:", e?.message ?? e);
  process.exit(1);
});
