# stamp 🏷️

stamp is a CLI tool to create Git commit messages  
in the `Type(Scope): description` format.

> Stop writing messy commits.  
> **Stamp them.**

---

## Features

- Guided commit message creation
- Conventional `Type(Scope): description` format
- Scope suggestions based on staged files
- Preview changes before committing
- Dry-run support

---

## Supported Types

| Type     | Description                  |
| -------- | ---------------------------- |
| feat     | 機能追加                     |
| fix      | バグ修正                     |
| docs     | ドキュメント                 |
| style    | 見た目・整形（挙動変更なし） |
| refactor | リファクタ（挙動変更なし）   |
| test     | テスト                       |
| chore    | 雑務（設定・依存更新など）   |
| perf     | パフォーマンス改善           |

---

## Usage

Run the following command inside a Git repository:

```bash
stamp
```

You will be prompted to select:

1. Type (e.g. feat, fix)
2. Scope (optional, suggested from file paths)
3. Description (required)

Before committing, stamp shows the staged files grouped by module:

```text
Changed files (by module):

[src] (2)
- src/api/user.ts
- src/api/auth.ts
```

Example commit message:

```text
feat(api): add user authentication
```

---

## Dry Run

To preview the commit message without executing `git commit`:

```bash
stamp --dry-run
```

---

## Installation (Local Development)

```bash
git clone https://github.com/Nkot117/stamp.git
cd stamp
npm install
npm run build
npm link
```

After that, you can run `stamp` from anywhere.

---

## Project Structure

```text
src/
  index.ts        # CLI entry point
  lib/
    git.ts        # Git operations
    prompts.ts    # Interactive prompts
    printer.ts    # Output formatting
```

---

## Why stamp?

Commit messages are records.  
They should be readable, consistent, and meaningful.

stamp helps you:

- avoid vague messages like "fix bug"
- keep commit history clean
- focus on _what_ you changed, not _how_ to format it

---

## License

MIT
