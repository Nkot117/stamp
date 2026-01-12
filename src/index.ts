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

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

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

function getChangedFiles(): string[] {
  try {
    const staged = execSync("git diff --name-only --cached", {
      encoding: "utf-8",
    }).trim();

    if (staged) return staged.split("\n");

    const unstaged = execSync("git diff --name-only", {
      encoding: "utf-8",
    }).trim();

    return unstaged ? unstaged.split("\n") : [];
  } catch {
    return [];
  }
}

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

  // 候補複数 → select
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

function getModuleKey(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length === 0) return "(unknown)";

  // monorepo よくあるやつ
  if ((parts[0] === "packages" || parts[0] === "apps") && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }

  // 基本はトップ階層
  return parts[0];
}

function groupFilesByModule(files: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const f of files) {
    const key = getModuleKey(f);
    const arr = map.get(key) ?? [];
    arr.push(f);
    map.set(key, arr);
  }

  // 各モジュール内をソート
  for (const [k, arr] of map) {
    map.set(k, arr.slice().sort());
  }

  return map;
}

function printChangedFilesByModule(files: string[]) {
  if (files.length === 0) {
    console.log("Changed files: none");
    return;
  }

  const grouped = groupFilesByModule(files);

  // モジュール名をソートして出す
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
