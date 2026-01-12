#!/usr/bin/env node
import { select, input, confirm } from "@inquirer/prompts";
import { execSync } from "node:child_process";
import { ensureGitRepo, getChangedFiles, runGitCommit } from "./cli/git";
import { promptDescription, promptScope, pronptType } from "./cli/prompts";

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

  const type = await pronptType();

  const files = getChangedFiles();
  printChangedFilesByModule(files);

  const scopeRaw = await promptScope(files);
  console.log("Selected scope:", scopeRaw || "none");

  const description = await promptDescription();

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
