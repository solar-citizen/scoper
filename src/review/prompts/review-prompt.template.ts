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

  const lineNumbersHint =
    validLines.length > 0
      ? `\n\nVALID LINE NUMBERS FOR REVIEW: ${validLines.join(', ')}\n(You MUST comment ONLY on these line numbers. Any other line numbers are FORBIDDEN.)`
      : '';

  return `You are a code-review system analyzing a git diff.

    CRITICAL RULES:

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

    2. LINE NUMBERS:
      - Code is pre-processed with line numbers: "LINE_NUMBER:(+) CODE"
      - Example: "15:(+) const x = 1;" means line 15 is a NEW line
      - ONLY comment on lines with "(+)" prefix (new/changed lines)
      - NEVER comment on lines with "[-]" prefix (removed lines)
      - NEVER comment on context lines (no prefix)
      - Use EXACT line numbers from the start of each line

      ${lineNumbersHint}

    3. WHEN TO COMMENT:
      - ONLY comment if you find ACTUAL PROBLEMS (bugs, security, performance issues, clear violations)
      - DO NOT comment on code that is already correct
      - DO NOT provide validation comments like "This is correct" or "Good practice"
      - DO NOT comment on simple, self-explanatory logic
      - DO NOT comment on removed/old code (lines with [-])
      
    4. COMMENT QUALITY:
      - Be specific and actionable
      - Keep messages under 200 characters
      - If NO issues found, return: {"comments": []}
      
    5. ONLY FLAG ACTUAL PROBLEMS:
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
      - Code refactoring that removes intermediate variables (this is often an improvement)
      - Inline operations that are more concise than multi-step equivalents
      - Framework patterns being used correctly (interceptors, guards, middleware, decorators etc. are NOT "overhead" when doing their job)
      - Necessary functionality labeled as "overhead" (e.g., auth interceptors setting cookies, guards checking permissions, middleware parsing data)

    7. UNDERSTAND THE CODE BEFORE COMMENTING:
      - DO NOT generate generic advice based on seeing keywords (interceptor, schema, JWT, etc.)
      - ANALYZE THE ACTUAL LOGIC and behavior of the code
      - VERIFY your suggestion isn't already implemented in the code
      - DO NOT suggest something the code is already doing correctly
      - Examples of WRONG comments to avoid:
        * "Use interceptors for cookies" when interceptors ARE being used
        * "Prioritize cookies over headers" when cookies ARE already prioritized (check array order!)
        * "Don't validate passwords in schema" when schema only validates INPUT FORMAT (length/type), not authentication
        * "This adds overhead" when the functionality is essential and lightweight
      - If you don't understand how the code works, return empty comments array
      - Better to miss an issue than generate nonsense advice

    8. SEVERITY LEVELS:
      - "error": Bugs, security vulnerabilities, breaks functionality
      - "warning": Performance issues, style violations, maintainability concerns, improvements
      - "info": Assumptions, validations, unnecessary improvements

    Review instructions: 
    ${instructionsSection}

    File: 
    ${filename} 
    
    Diff to review (with explicit line numbers): 
    ${addLineNumbersToPatch(patch)}

    Do not confuse severity levels.

    Do not be overly pedantic and review only necessary parts of code.

    Empty comments array is PREFERRED over unnecessary comments.

    READ AND UNDERSTAND THE CODE LOGIC before suggesting anything. Do not generate keyword-based generic advice.
  `;
}
