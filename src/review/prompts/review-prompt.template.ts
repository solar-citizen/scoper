import { addLineNumbersToPatch, extractValidLineNumbers } from './prompt.util';

export function buildReviewPrompt(
  filename: string,
  patch: string,
  baseInstructions: string,
  projectInstructions?: string,
): string {
  const instructionsSection = projectInstructions
    ? `Base instructions: ${baseInstructions}\nProject-specific instructions: ${projectInstructions}`
    : baseInstructions;

  const validLines = extractValidLineNumbers(patch);
  const numberedPatch = addLineNumbersToPatch(patch);

  const lineNumberHint =
    validLines.length > 0
      ? `\nVALID LINE NUMBERS: ${validLines.join(', ')}\nComment ONLY on these lines.`
      : '';

  return `You are reviewing a git diff showing code changes.

    UNDERSTAND THE DIFF FORMAT:
    - Lines with "[-]" = OLD code being REMOVED
    - Lines with "(+)" = NEW code ADDED/CHANGED
    - Lines marked "[REPLACEMENT]" = NEW code that replaced OLD code directly above it
    - Lines without prefix = unchanged context

    CRITICAL RULE:
    NEW code is the RESULT of the change, not the problem to fix.
    If old code had issues and new code fixes them, DO NOT comment.
    ONLY comment if NEW code introduces actual problems.

    EXAMPLES:

    Example 1 - NO COMMENT NEEDED (fix):
    [-] export const foo = () => {...}
    42:(+) export function foo() {...} [REPLACEMENT]
    Analysis: Changed from arrow to function declaration. This is an improvement. No comment.

    Example 2 - NO COMMENT NEEDED (improvement):
    [-] <body className={inter.className}>
    42:(+) <body className={cn(inter.variable, 'antialiased')}> [REPLACEMENT]
    Analysis: Improved class handling. This is better code. No comment.

    Example 3 - COMMENT NEEDED (introduces problem):
    [-] const data: UserData = {...}
    42:(+) const data: any = {...} [REPLACEMENT]
    Analysis: NEW code uses 'any' type. This is a problem. Comment required.

    Example 4 - COMMENT NEEDED (new bug):
    42:(+) if (user.role = 'admin') {
    Analysis: Assignment operator instead of comparison. Bug in NEW code. Comment required.

    OUTPUT FORMAT (JSON only, no markdown):
    {
      "comments": [
        {
          "line": <number>,
          "severity": "warning"|"error",
          "message": "<string under 200 chars>"
        }
      ]
    }

    SEVERITY GUIDELINES:
    - "error" = Bugs, security issues, breaks functionality
    - "warning" = Performance issues, style violations, maintainability concerns
    - DO NOT USE "info" severity - only warnings and errors

    WHEN TO COMMENT:
    DO comment on:
    - Bugs or logical errors in NEW code
    - Security vulnerabilities in NEW code
    - Performance issues in NEW code
    - Type safety violations in NEW code (using 'any', missing types)
    - Clear rule violations in NEW code

    DO NOT comment on:
    - Code that is already correct
    - Improvements over old code
    - Validation statements ("this is good", "correct approach")
    - Removed lines ([-])
    - Context lines (no prefix)
    - Code marked [REPLACEMENT] that fixes issues from removed code
    ${lineNumberHint}

    Review rules:
    ${instructionsSection}

    File: ${filename}

    Diff:
    ${numberedPatch}

    Return only valid JSON. Empty array {"comments": []} is preferred over unnecessary comments.
  `;
}
