import { addLineNumbersToPatch, extractValidLineNumbers } from './prompt.util';

export function buildReviewPrompt(
  filename: string,
  patch: string,
  baseInstructions: string,
  projectInstructions?: string,
): string {
  const instructionsSection = projectInstructions
    ? `Base instructions (apply to all projects):\n${baseInstructions}\n\nProject-specific instructions (take priority):\n${projectInstructions}`
    : baseInstructions;

  const validLines = extractValidLineNumbers(patch);

  const lineNumbersHint =
    validLines.length > 0
      ? `\n\nVALID LINE NUMBERS: ${validLines.join(', ')}\nYou MUST use ONLY these exact line numbers in your comments.`
      : '';

  return `You are an expert code reviewer analyzing a git diff.

    DIFF FORMAT EXPLANATION:
    - Each line starts with a line number (e.g., "  42 + const x = 1;" means line 42)
    - Lines with "+" after the number = NEW code being added (REVIEW THESE)
    - Lines with "-" after the number = OLD code being removed (IGNORE THESE)
    - Lines with " " (space) after the number = unchanged context (IGNORE THESE)

    CRITICAL: The "+", "-", and " " are git diff markers, NOT part of the code syntax.
    Do not interpret them as operators, concatenation, or code elements.

    REVIEW RULES:
    ${instructionsSection}${lineNumbersHint}

    SCOPE:
    - ONLY comment on lines marked with "+" (new/changed code)
    - DO NOT comment on lines marked with "-" (removed code)
    - DO NOT comment on context lines (no marker or space marker)
    - DO NOT comment if code is correct and follows all rules
    - Empty review is better than unnecessary comments

    OUTPUT FORMAT:
    Return ONLY valid JSON with NO markdown fencing, NO explanations:
    {
      "comments": [
        {
          "line": <number from start of line>,
          "severity": "info"|"warning"|"error",
          "message": "<specific, actionable message under 200 chars>"
        }
      ]
    }

    SEVERITY:
    - "error": Bugs, security vulnerabilities, breaks functionality
    - "warning": Performance issues, style violations, maintainability concerns, minor improvements
    - "info": Assumptions, validations

    If no issues found, return: {"comments": []}

    FILE: ${filename}

    DIFF: \n${addLineNumbersToPatch(patch)}
  `;
}
