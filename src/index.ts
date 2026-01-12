#!/usr/bin/env node
import { select, input } from "@inquirer/prompts";

const TYPES = [
  { value: "feat", name: "feat - 機能追加" },
  { value: "fix", name: "fix - バグ修正" },
  { value: "docs", name: "docs - ドキュメント" },
  { value: "style", name: "style - 見た目・整形" },
  { value: "refactor", name: "refactor - リファクタ" },
  { value: "test", name: "test - テスト" },
  { value: "chore", name: "chore - 雑務" },
  { value: "perf", name: "perf - パフォーマンス改善" },
];

async function main() {
  const type = await select({
    message: "Type を選択",
    choices: TYPES,
  });

  const scope = await input({
    message: "Scope（任意）",
    default: "",
  });

  const description = await input({
    message: "説明",
  });

  const message = scope
    ? `${type}(${scope}): ${description}`
    : `${type}: ${description}`;

  console.log("\ncommit message:");
  console.log(message);
}

main();
