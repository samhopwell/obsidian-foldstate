const FOLD_MARKER = "%% fold %%";
const FOLD_MARKER_REGEX = /\s*%%\s*fold\s*%%\s*$/;

/** ATX headings only — other foldable ranges (frontmatter, code blocks,
 *  lists) must never receive a marker; on `---` it breaks the YAML block. */
export function isHeadingLine(line: string): boolean {
  return /^#{1,6}(\s|$)/.test(line);
}

export function hasFoldMarker(line: string): boolean {
  return FOLD_MARKER_REGEX.test(line);
}

export function addFoldMarker(line: string): string {
  if (hasFoldMarker(line)) return line;
  // Splitting CRLF content on "\n" leaves "\r" at the end of the line.
  // Keep the marker before it so it stays on the heading's line.
  const ending = line.endsWith("\r") ? "\r" : "";
  const text = ending ? line.slice(0, -1) : line;
  return `${text} ${FOLD_MARKER}${ending}`;
}

export function removeFoldMarker(line: string): string {
  const ending = line.endsWith("\r") ? "\r" : "";
  const text = ending ? line.slice(0, -1) : line;
  return text.replace(FOLD_MARKER_REGEX, "") + ending;
}

export function parseFoldedHeadings(content: string): Set<number> {
  const lines = content.split("\n");
  const folded = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (isHeadingLine(lines[i]) && hasFoldMarker(lines[i])) {
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
