import { input, select } from "@inquirer/prompts";

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
 * Type を選択させるためのプロンプト
 *
 */
async function pronptType(): Promise<CommitType> {
  return await select<CommitType>({
    message: "Type を選択",
    choices: TYPES.map((t) => ({ value: t.value, name: t.name })),
  });
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
 * descriptionをユーザーに入力させるためのプロンプト
 *
 */
async function promptDescription(): Promise<string> {
  return await input({
    message: "説明（必須）",
    validate: (v) => (v.trim() ? true : "説明は必須です"),
  });
}

/**
 * 変更ファイルのパスからscope候補を抽出する
 *
 * 各ファイルパスに含まれる「ディレクトリ階層」をすべてscope候補として扱う。
 * 例:
 *   src/AAA/BBB/CCC/modify.ts
 *   → ["src", "AAA", "BBB", "CCC"]
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

export { pronptType, promptScope, promptDescription };
