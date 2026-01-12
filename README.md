# stamp 🏷️

stamp is a CLI tool to create Git commit messages  
in the `Type(Scope): description` format.

> Stop writing messy commits.  
> **Stamp them.**

---

## Features

- Interactive CLI for commit messages
- Enforces `Type(Scope): description` format
- Free-form scope (optional)
- Prevents empty commit messages
- Works with any Git repository

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

    stamp

You will be prompted to select:

1. Type (e.g. feat, fix)
2. Scope (optional)
3. Description (required)

Example commit message:

    feat(core): add input validation for login form

---

## Installation (Local Development)

    git clone https://github.com/Nkot117/stamp.git
    cd stamp
    npm install
    npm run build
    npm link

After that, you can run `stamp` from anywhere.

---

## Why stamp?

Commit messages are records.  
They should be readable, consistent, and meaningful.

stamp helps you:

- avoid vague messages like "fix bug"
- keep commit history clean
- focus on what you changed, not how to format it

---

## License

MIT
