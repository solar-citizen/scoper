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
  let previousWasRemoval = false;

  for (const line of lines) {
    const match = hunkHeaderPattern.exec(line);

    if (match) {
      currentLine = parseInt(match[1]);
      result.push(line);
      previousWasRemoval = false;

      continue;
    }

    if (line.startsWith('+++') || line.startsWith('---')) {
      result.push(line);
      previousWasRemoval = false;

      continue;
    }

    if (line.startsWith('-')) {
      result.push(`[-] ${line}`);
      previousWasRemoval = true;

      continue;
    }

    const isAddition = line.startsWith('+');
    const isReplacement = isAddition && previousWasRemoval;

    let prefix = '   ';
    let marker = '';

    if (isAddition) {
      prefix = '(+)';

      if (isReplacement) {
        marker = ' [REPLACEMENT - review carefully, old code was removed above]';
      }
    }

    result.push(`${currentLine}:${prefix} ${line.substring(1)}${marker}`);
    currentLine++;
    previousWasRemoval = false;
  }

  return result.join('\n');
}
