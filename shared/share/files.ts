/** Safe file name for an exported table: «My Game!» → «my-game.diceroulette.json». */
export function exportFileName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return `${slug || 'table'}.diceroulette.json`
}
