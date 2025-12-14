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

  return `
    You are an expert Senior Software Engineer level code-review system analyzing a git diff.
    Your goal is to catch bugs, security vulnerabilities, and bad practices.

    ${instructionsSection}

    ## INSTRUCTIONS FOR THE REVIEWER (YOU):

    1. **Format & Syntax**: 
      The code below is a Git Diff with explicit line numbers on the left.
      - Format: \`LineNum | ChangeType Code\`
      - Lines starting with \`+\` are NEW code.
      - Lines starting with \`-\` are REMOVED code.
      - **CRITICAL**: Do NOT interpret the leading \`+\` as an arithmetic operator or string concatenation. It is purely a Diff marker.
      - **CRITICAL**: Do NOT interpret the \`|\` separator as a bitwise OR. It is a visual separator.

    2. **Scope**:
      - Review strictly the lines marked with \`+\` (additions).
      - Use the \`-\` lines and context only to understand the changes.
      - ${lineNumberHint}

    ## CRITICAL REVIEW RULES:

    **NEW code is the RESULT of the change.** If old code had issues and new code fixes them, DO NOT comment.
    ONLY comment if NEW code introduces *actual* problems.

    ### EXAMPLES (How to read the Diff):

    **Example 1 - NO COMMENT NEEDED (Modernization/Fix):**
    \`\`\`diff
        | - export const foo = () => {...}
    42   | + export function foo() {...}
    \`\`\`
    *Analysis*: Changed from arrow to function declaration. This is an improvement/refactor. No comment.

    **Example 2 - NO COMMENT NEEDED (Improvement):**
    \`\`\`diff
        | - <body className={inter.className}>
    42   | + <body className={cn(inter.variable, 'antialiased')}>
    \`\`\`
    *Analysis*: Improved class handling. This is better code. No comment.

    **Example 3 - COMMENT NEEDED (Type Violation):**
    \`\`\`diff
        | - const data: UserData = {...}
    42   | + const data: any = {...}
    \`\`\`
    *Analysis*: NEW code regresses type safety by using 'any'. Comment required.

    **Example 4 - COMMENT NEEDED (New Bug):**
    \`\`\`diff
    42   | + if (user.role = 'admin') {
    \`\`\`
    *Analysis*: Assignment operator \`=\` used inside \`if\` condition instead of comparison \`===\`. Bug in NEW code.

    ## OUTPUT FORMAT:
    Return strictly valid JSON. No Markdown fencing.
    {
      "comments": [
        {
          "line": <number>,
          "severity": "warning"|"error", 
          "message": "<string under 200 chars>"
        }
      ]
    }

    ## SEVERITY GUIDELINES:
    - "error": Bugs, security issues, breaks functionality.
    - "warning": Performance issues, style violations, maintainability concerns.
    - **DO NOT USE "info"**.

    ## WHEN TO COMMENT:
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
    - Removed lines (starting with \`-\`)
    - Context lines (no \`+\` or \`-\`)
    - Formatting or style issues if the code is syntactically valid (assume Prettier handles it)

    ## CODE TO REVIEW (${filename}):

    ${numberedPatch}
  `;
}
