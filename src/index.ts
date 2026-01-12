#!/usr/bin/env node
import { confirm } from "@inquirer/prompts";
import { ensureGitRepo, getChangedFiles, runGitCommit } from "./cli/git";
import { promptDescription, promptScope, promptType } from "./cli/prompts";
import { printChangedFilesByModule } from "./cli/printer";

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

async function main() {
  if (!isDryRun) {
    ensureGitRepo();
  }

  const type = await promptType();

  const files = getChangedFiles();
  printChangedFilesByModule(files);

  const scopeRaw = await promptScope(files);
  console.log("Selected scope:", scopeRaw || "none");

  const scope = sanitizeScope(scopeRaw);

  const desc = await promptDescription();

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
