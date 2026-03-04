const FOLD_MARKER = "%% fold %%";
const FOLD_MARKER_REGEX = /\s*%%\s*fold\s*%%\s*$/;

export function hasFoldMarker(line: string): boolean {
  return FOLD_MARKER_REGEX.test(line);
}

export function addFoldMarker(line: string): string {
  if (hasFoldMarker(line)) return line;
  return `${line} ${FOLD_MARKER}`;
}

export function removeFoldMarker(line: string): string {
  return line.replace(FOLD_MARKER_REGEX, "");
}

export function parseFoldedHeadings(content: string): Set<number> {
  const lines = content.split("\n");
  const folded = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (hasFoldMarker(lines[i])) {
      folded.add(i);
    }
  }
  return folded;
}

export function updateFoldMarker(
  content: string,
  lineIndex: number,
  folded: boolean
): string {
  const lines = content.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  lines[lineIndex] = folded
    ? addFoldMarker(lines[lineIndex])
    : removeFoldMarker(lines[lineIndex]);
  return lines.join("\n");
}
