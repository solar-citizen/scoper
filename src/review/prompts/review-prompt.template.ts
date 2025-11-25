import { addLineNumbersToPatch, extractValidLineNumbers } from './prompt.util';

export function buildReviewPrompt(
  filename: string,
  patch: string,
  baseInstructions: string,
  projectInstructions?: string,
): string {
  const instructionsSection = projectInstructions
    ? `Base instructions (apply to all projects): ${baseInstructions}
    Project-specific instructions (take priority): ${projectInstructions}`
    : baseInstructions;

  const validLines = extractValidLineNumbers(patch);
  const numberedPatch = addLineNumbersToPatch(patch);

  const lineNumberHint =
    validLines.length > 0
      ? `\n\nVALID LINE NUMBERS: ${validLines.join(', ')}\n(You must ONLY comment on these specific line numbers)`
      : '';

  return `You are a code-review system analyzing a git diff.

    CRITICAL INSTRUCTION - LINE NUMBERS:
    - The code below has been pre-processed to show line numbers at the start of each line.
    - Format: "LINE_NUMBER:(+) CODE"
    - Example: "15:(+) const x = 1;" means line 15 is a new line.
    - You MUST use the exact line number provided at the start of the line.
    - ONLY comment on lines marked with (+) (added/changed lines).
    - DO NOT comment on lines marked with [-] or context lines (no (+)).

    OTHER RULES:
    - Provide actionable, specific feedback
    - Keep messages concise (under 200 characters)
    - If no issues found, return empty comments array
    
    Focus areas:
    - Bugs and logical errors
    - Security vulnerabilities
    - Performance issues
    - Code style violations
    - Type safety issues (e.g., using 'any')

    Review instructions:
    ${instructionsSection}

    File: ${filename}
    ${lineNumberHint}

    Diff to review (with explicit line numbers):
    ${numberedPatch}
    `;
}
