# Code Review Rules

These rules apply to ALL projects unless overridden by project-specific rules.

## TypeScript/JavaScript - General Guidelines:

### General Code Quality

- Meaningful variable and function names
- Comments for complex logic

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

- Import ordering is dictated by Eslint. Do not report errors, unless you're certain they're inconsistent with Eslint's rules

- Avoid using optionality/nullability unless necessary

- Avoid using empty strings

- Prefer `const` over `let` unless reassignment is necessary with no way around it

- Never use single-line if or if/else statements, for example:

wrong:

if (!foo) return

must be

if (!foo) {
return
}

- Always prefer destructuring

- Avoid creating unnecessary aliases. If an entity is defined as password, do not rename it to pwd or pw

- Always use camelCase over CAPITAL_CASE for constants

- Avoid using any form of type assertions

- Do not use `any` type

- Avoid using one-letter variable names, except for indexes in loops (i, j, k)

- Use early returns, for example:

wrong:

if (foo === 'bar' && !bar) {
foobar()
}

use

if (foo !== 'bar' || bar) {
return
}

foobar()

## Function Declaration Guidelines

When to Use Each Function Style

### React Components

Recommended style: Function Declaration
Syntax Example: function Button({onClick, children}) {...}
Rationale: Clearer stack traces, consistent with React docs, easier to understand

### React Custom Hooks

Recommended style: Function Declaration
Syntax Example: function useCustomHook() {...}
Rationale: Better debugging, follows React convention, clear signaling of "this is a hook"

### Event Handlers

Recommended style: Arrow Functions
Syntax Example: const handleClick = () => {...}
Rationale: Preserves lexical this, concise for component methods

### Callbacks (inline)

Recommended style: Arrow Functions
Syntax Example: array.map(item => transformItem(item))
Rationale: Concise, clear intent, preserves context

### Utility Functions

Recommended style: Function Declaration
Syntax Example: function getPaginationRange(...) {...}
Rationale: Better debugging, clearer stack traces, no this binding issues

### Recursive Functions

Recommended style: Named Function Expression
Syntax Example: const traverse = function traverse(node) {...}
Rationale: Self-reference by name regardless of variable reassignment

### Class Methods

Recommended style: Method Shorthand
Syntax Example: class X { method() {...} }
Rationale: Standard syntax for class methods

### One-liners

Recommended style: Arrow Functions
Syntax Example: const double = n => n \* 2;
Rationale: Concise, implicit return

### Higher-order Functions

Recommended style: Function Declaration
Syntax Example: function createFormatter(format) {...}
Rationale: Clearer stack traces, better debugging

### Page Components

Recommended style: Function Declaration
Syntax Example: function HomePage() {...}
Rationale: Clearer stack traces, consistent with React docs, easier to understand

### Layout Components

Recommended style: Function Declaration
Syntax Example: function DashboardLayout() {...}
Rationale: Clearer stack traces, consistent with React docs, easier to understand

### IIFE (Immediately Invoked Function Expression)

Recommended style: Arrow or Anonymous
Syntax Example: (() => {...})()
Rationale: Concise for one-time execution blocks

### Quick Reference

Use Function Declarations for: Components, Hooks, Utilities, Higher-order Functions
Use Arrow Functions for: Event Handlers, Callbacks, One-liners
Use Named Function Expressions for: Recursive Functions
Use Method Shorthand for: Class Methods
