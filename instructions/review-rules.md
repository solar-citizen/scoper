# Code Review Rules

These rules apply to ALL projects unless overridden by project-specific rules.

## CRITICAL: When to Comment

**ONLY comment when you find ACTUAL PROBLEMS.** Do not comment to validate correct code or point out that something follows the rules. Empty review is better than unnecessary noise.

Examples of what NOT to comment on:

- Code that is already correct
- Simple, self-explanatory conditional logic
- Proper string handling in JSX
- Code that follows all style rules

Examples of what TO comment on:

- Using `any` type
- Leaked sensitive data in logs
- N+1 database queries
- Blocking the event loop
- Wrong function declaration style

## TypeScript/JavaScript - General Guidelines

### General Code Quality

- Meaningful variable and function names
- Comments ONLY for genuinely complex logic (algorithms, non-obvious business rules, tricky edge cases)
- Do NOT require comments for simple conditionals or standard patterns

### TypeScript

- Do not use `any` type
- Use types for object shapes

### Security

- Never log sensitive data (passwords, tokens, API keys)

### Performance

- Avoid blocking the event loop
- Use async/await properly
- Cache expensive operations when appropriate
- Avoid N+1 operations

### Code Style

- Consistent indentation

### Other (but not less prioritized)

- Prefer `type` over `interface` for types

- Import ordering is dictated by Eslint. Do not report errors unless certain they're inconsistent with Eslint's rules

- Avoid using optionality/nullability unless necessary

- Avoid using empty strings

- Prefer `const` over `let` unless reassignment is necessary with no way around it

- Never use single-line if or if/else statements, for example:

Wrong:

```typescript
if (!foo) return;
```

Must be:

```typescript
if (!foo) {
  return;
}
```

- Prefer destructuring when extracting values from objects or arrays

Examples:

Correct - Destructure when extracting:

```typescript
// Good
const { name, age } = object;
const [first, second] = array;
```

Wrong - Don't create unnecessary intermediate variables:

```typescript
// Bad - data is only used once
const data = await fetchData();
return { data };

// Good - direct return when value is used only once
return { data: await fetchData() };
```

Correct - Intermediate variable when used multiple times:

```typescript
// Good - data is used for validation and return
const data = await fetchData();

if (!isValid(data)) {
  throw new Error('Invalid data');
}

return { data };
```

This rule applies to:

- Function parameters: `function foo({ bar, baz }) {...}`
- Variable assignment: `const { x, y } = point;`
- Array operations: `const [first, ...rest] = items;`

This rule does NOT mean:

- Creating intermediate variables just to destructure them in returns
- Destructuring for single property access (use dot notation)

- Avoid creating unnecessary aliases. If an entity is defined as password, do not rename it to pwd or pw. ONLY flag this on NEW code, not removed code.

- Always use camelCase over CAPITAL_CASE for constants

- Avoid using any form of type assertions

- Do not use `any` type

- Avoid using one-letter variable names, except for indexes in loops (i, j, k)

- Use early returns, for example:

Wrong:

```typescript
if (foo === 'bar' && !bar) {
  foobar();
}
```

Correct:

```typescript
if (foo !== 'bar' || bar) {
  return;
}

foobar();
```

## Function Declaration Guidelines

When to Use Each Function Style

### React Components

Recommended style: Function Declaration
Syntax Example: `function Button({onClick, children}) {...}`
Rationale: Clearer stack traces, consistent with React docs, easier to understand

### React Custom Hooks

Recommended style: Function Declaration
Syntax Example: `function useCustomHook() {...}`
Rationale: Better debugging, follows React convention, clear signaling of "this is a hook"

### Event Handlers

Recommended style: Arrow Functions
Syntax Example: `const handleClick = () => {...}`
Rationale: Preserves lexical this, concise for component methods

### Callbacks (inline)

Recommended style: Arrow Functions
Syntax Example: `array.map(item => transformItem(item))`
Rationale: Concise, clear intent, preserves context

### Utility Functions

Recommended style: Function Declaration
Syntax Example: `function getPaginationRange(...) {...}`
Rationale: Better debugging, clearer stack traces, no this binding issues

### Recursive Functions

Recommended style: Named Function Expression
Syntax Example: `const traverse = function traverse(node) {...}`
Rationale: Self-reference by name regardless of variable reassignment

### Class Methods

Recommended style: Method Shorthand
Syntax Example: `class X { method() {...} }`
Rationale: Standard syntax for class methods

### One-liners

Recommended style: Arrow Functions
Syntax Example: `const double = n => n * 2;`
Rationale: Concise, implicit return

### Higher-order Functions

Recommended style: Function Declaration
Syntax Example: `function createFormatter(format) {...}`
Rationale: Clearer stack traces, better debugging

### Page Components

Recommended style: Function Declaration
Syntax Example: `function HomePage() {...}`
Rationale: Clearer stack traces, consistent with React docs, easier to understand

### Layout Components

Recommended style: Function Declaration
Syntax Example: `function DashboardLayout() {...}`
Rationale: Clearer stack traces, consistent with React docs, easier to understand

### IIFE (Immediately Invoked Function Expression)

Recommended style: Arrow or Anonymous
Syntax Example: `(() => {...})()`
Rationale: Concise for one-time execution blocks

### Quick Reference

Use Function Declarations for: Components, Hooks, Utilities, Higher-order Functions
Use Arrow Functions for: Event Handlers, Callbacks, One-liners
Use Named Function Expressions for: Recursive Functions
Use Method Shorthand for: Class Methods
