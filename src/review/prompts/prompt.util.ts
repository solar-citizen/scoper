const hunkHeaderPattern = /^@@ -\d+,?\d* \+(\d+),?\d* @@/;

export function extractValidLineNumbers(patch: string): number[] {
  const validLines: number[] = [];
  const lines = patch.split('\n');
  let currentLine = 0;

  for (const line of lines) {
    const match = hunkHeaderPattern.exec(line);

    if (match) {
      currentLine = parseInt(match[1]);
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      validLines.push(currentLine);
    }

    if (!line.startsWith('-')) {
      currentLine++;
    }
  }

  return validLines;
}

export function addLineNumbersToPatch(patch: string): string {
  const lines = patch.split('\n');
  let currentLine = 0;
  const result: string[] = [];

  for (const line of lines) {
    const match = hunkHeaderPattern.exec(line);

    if (match) {
      currentLine = parseInt(match[1]);
      result.push(line);
      continue;
    }

    if (line.startsWith('+++') || line.startsWith('---')) {
      result.push(line);
      continue;
    }

    if (line.startsWith('-')) {
      result.push(`[-] ${line}`);
      continue;
    }

    const prefix = line.startsWith('+') ? '(+)' : '   ';
    result.push(`${currentLine}:${prefix} ${line.substring(1)}`);
    currentLine++;
  }

  return result.join('\n');
}
