import { execSync } from "child_process";

/**
 * 現在のディレクトリが Git リポジトリかどうかを検証する
 *
 */
function ensureGitRepo() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  } catch {
    console.error("stamp: not a git repository");
    process.exit(1);
  }
}

/**
 * ステージング済み(git add済み)の変更ファイル一覧を取得する
 *
 * @returns ステージング済みファイルのパス配列
 */
function getChangedFiles(): string[] {
  try {
    const staged = execSync("git diff --name-only --cached", {
      encoding: "utf-8",
    }).trim();

    return staged ? staged.split("\n") : [];
  } catch {
    return [];
  }
}

/**
 * 生成したコミットメッセージで git commit を実行する
 *
 * @param message - 実行するコミットメッセージ
 * @returns void
 */
function runGitCommit(message: string) {
  const quoted = JSON.stringify(message);
  execSync(`git commit -m ${quoted}`, { stdio: "inherit" });
}

export { ensureGitRepo, getChangedFiles, runGitCommit };
