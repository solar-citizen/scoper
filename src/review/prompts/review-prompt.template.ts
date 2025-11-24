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

  return `You are a code-review system.
    You MUST output ONLY valid JSON with no markdown, no explanations, no preamble.

    JSON shape:
    {
        "comments": [
            {
                "line": <number>,
                "severity": "info"|"warning"|"error",
                "message": "<string>"
            }
        ]
    }

    Rules:
    - Only comment on changed lines (lines starting with + in the diff).
    - Do not comment on untouched lines or context lines.
    - Do not invent line numbers - use actual line numbers from the diff.
    - Provide actionable and minimal messages.
    - If no issues found, return empty comments array: {"comments": []}
    - Focus on: bugs, code style violations, security issues, performance problems.

    Review instructions: ${instructionsSection}

    <FILE_START>
    File: ${filename}
    ${patch}
    <FILE_END>

    Return ONLY the JSON object, nothing else.`;
}
