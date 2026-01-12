#!/usr/bin/env node
import { select, input, confirm } from "@inquirer/prompts";
import { execSync } from "node:child_process";

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

function ensureGitRepo() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  } catch {
    console.error("stamp: not a git repository");
    process.exit(1);
  }
}

function sanitizeScope(scope: string): string {
  return scope
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function runGitCommit(message: string) {
  const quoted = JSON.stringify(message);
  execSync(`git commit -m ${quoted}`, { stdio: "inherit" });
}

async function main() {
  ensureGitRepo();

  const type = await select<CommitType>({
    message: "Type を選択",
    choices: TYPES.map((t) => ({ value: t.value, name: t.name })),
  });

  const scopeRaw = await input({
    message: "Scope（任意）",
    default: "",
  });

  const description = await input({
    message: "説明（必須）",
    validate: (v) => (v.trim() ? true : "説明は必須です"),
  });

  const scope = sanitizeScope(scopeRaw);
  const desc = description.trim();

  const message = scope ? `${type}(${scope}): ${desc}` : `${type}: ${desc}`;

  console.log("\ncommit message:");
  console.log(message);

  const ok = await confirm({
    message: "このメッセージで git commit しますか？",
    default: true,
  });

  if (ok) runGitCommit(message);
}

main().catch((e) => {
  if (e?.name === "ExitPromptError") process.exit(0);
  console.error("stamp:", e?.message ?? e);
  process.exit(1);
});
