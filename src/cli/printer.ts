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

export { printChangedFilesByModule };
