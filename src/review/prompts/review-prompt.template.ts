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
      ? `\n\nVALID LINE NUMBERS FOR REVIEW: ${validLines.join(', ')}\n(You MUST comment ONLY on these line numbers. Any other line numbers are FORBIDDEN.)`
      : '';

  return `You are a code-review system analyzing a git diff.

    CRITICAL RULES (READ CAREFULLY):

    1. OUTPUT FORMAT:
      - ONLY output valid JSON with NO markdown, NO explanations, NO preamble
      - Required JSON shape:
        {
          "comments": [
            {
              "line": <number>,
              "severity": "info"|"warning"|"error",
              "message": "<string>"
            }
          ]
        }

    2. LINE NUMBERS (ABSOLUTE REQUIREMENT):
      - Code is pre-processed with line numbers: "LINE_NUMBER:(+) CODE"
      - Example: "15:(+) const x = 1;" means line 15 is a NEW line
      - ONLY comment on lines with "(+)" prefix (new/changed lines)
      - NEVER comment on lines with "[-]" prefix (removed lines)
      - NEVER comment on context lines (no prefix)
      - Use EXACT line numbers from the start of each line
      ${lineNumberHint}

    3. WHEN TO COMMENT (CRITICAL - READ TWICE):
      - ONLY comment if you find ACTUAL PROBLEMS (bugs, security, performance issues, clear violations)
      - DO NOT comment on code that is already correct
      - DO NOT provide validation comments like "This is correct" or "Good practice"
      - DO NOT comment on simple, self-explanatory logic
      - DO NOT comment on removed/old code (lines with [-])
      
    4. COMMENT QUALITY:
      - Be specific and actionable
      - Keep messages under 200 characters
      - If NO issues found, return: {"comments": []}
      
    5. FOCUS AREAS (ONLY FLAG ACTUAL PROBLEMS):
      - Bugs and logical errors
      - Security vulnerabilities (leaked secrets, SQL injection, XSS etc.)
      - Significant performance issues (N+1 queries, blocking operations, unoptimized calculations etc.)
      - Clear violations of project rules
      - Type safety issues

    6. DO NOT COMMENT ON:
      - Code that follows all rules correctly
      - Code that has no issues
      - Removed lines (marked with [-])
      - Simple logic that is self-explanatory

    Review instructions: ${instructionsSection}
    File: ${filename}
    Diff to review (with explicit line numbers): ${numberedPatch}

    Remember: Empty comments array is PREFERRED over unnecessary comments.
  `;
}
