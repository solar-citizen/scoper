/**
 * Scoper Bot Test Cases
 *
 * This file contains test cases to verify that Scoper correctly identifies
 * issues and avoids false positives. Each test case is marked with expected
 * behavior.
 *
 * HOW TO USE:
 * 1. Make changes to this file according to each test case
 * 2. Commit the changes
 * 3. Check Scoper's comments
 * 4. Verify Scoper behaves as expected (✅ should comment, ❌ should NOT comment)
 */

// =============================================================================
// TEST CASE 1: Simple Conditional Logic (Should NOT comment)
// =============================================================================
// ❌ Expected: NO COMMENT - This is self-explanatory middleware logic

export function testSimpleConditional(token: string | undefined, pathname: string) {
  if (pathname === '/') {
    return token ? '/dashboard' : '/login';
  }

  const isPublicPath = ['/login', '/register'].some((path) => pathname.startsWith(path));

  if (token && isPublicPath) {
    return '/dashboard';
  }

  // Change this line to test:
  // BEFORE: if (!token && !isPublicPath) { return '/login'; }
  // AFTER: (uncomment next line)
  if (!token && !isPublicPath) {
    return '/login';
  }

  return '/';
}

// =============================================================================
// TEST CASE 3: Removing Unnecessary Intermediate Variables
// =============================================================================
// ❌ Expected: NO COMMENT - This is an improvement, not a violation

export async function testRemovingIntermediateVariable(userId: string) {
  // BEFORE (old code - has unnecessary intermediate variable):
  // const conversations = await fetchConversations(userId);
  // return { conversations };

  // AFTER (new code - more concise):
  return { conversations: await fetchConversations(userId) };
}

// =============================================================================
// TEST CASE 4: Intermediate Variable Used Multiple Times (Correct Usage)
// =============================================================================
// ❌ Expected: NO COMMENT - Intermediate variable is used for validation

export async function testIntermediateVariableWithValidation(userId: string) {
  const data = await fetchUserData(userId);

  if (!data.isValid) {
    throw new Error('Invalid data');
  }

  return { data };
}

// =============================================================================
// TEST CASE 5: Using 'any' Type (Should Comment)
// =============================================================================
// ✅ Expected: COMMENT - 'any' type is not allowed
//

export function testAnyType(data: any) {
  return data.foo;
}

// =============================================================================
// TEST CASE 6: Single-line If Statement (Should Comment)
// =============================================================================
// ✅ Expected: COMMENT - Single-line if statements are not allowed

export function testSingleLineIf(value: string) {
  // Change this to test:
  // BEFORE: if (!value) { return; }
  // AFTER: (uncomment next line)
  // if (!value) return;

  if (!value) {
    return;
  }

  console.log(value);
}

// =============================================================================
// TEST CASE 7: Unnecessary Alias (Should Comment)
// =============================================================================
// ✅ Expected: COMMENT - Creating unnecessary alias 'pwd' from 'password'

export function testUnnecessaryAlias(password: string) {
  // Change this to test:
  // BEFORE: const hashedPassword = hashPassword(password);
  // AFTER: (uncomment next line)
  // const pwd = password;
  // return hashPassword(pwd);

  return hashPassword(password);
}

// =============================================================================
// TEST CASE 9: Correct Destructuring Usage
// =============================================================================
// ❌ Expected: NO COMMENT - This is correct destructuring usage

export function testCorrectDestructuring(user: { name: string; age: number; email: string }) {
  const { name, age } = user;

  console.log(`${name} is ${age} years old`);

  return { name, age };
}

// =============================================================================
// TEST CASE 10: Removed Code Should NOT Be Commented
// =============================================================================
// ❌ Expected: NO COMMENT on removed lines

export function testRemovedCodeNoComment() {
  // When you refactor this function, Scoper should NOT comment on removed lines
  // BEFORE:
  // const earliest = getEarliestDate();
  // const latest = getLatestDate();
  // return { from: earliest, to: latest };

  // AFTER (refactored):
  const dates = [new Date('2024-01-01'), new Date('2024-12-31')];
  return {
    from: new Date(Math.min(...dates.map((d) => d.getTime()))),
    to: new Date(Math.max(...dates.map((d) => d.getTime()))),
  };
}

// =============================================================================
// TEST CASE 11: Code Comments Should Not Be Reviewed
// =============================================================================
// ❌ Expected: NO COMMENT - Regular code comments should be ignored

export function testCodeComments() {
  // This is a helper function for user authentication
  // It validates the token and returns user data

  /*
   * Multi-line comment explaining the logic
   * This should also be ignored by Scoper
   */

  return { success: true };
}

// =============================================================================
// TEST CASE 12: Comment Annotations Should Not Be Reviewed
// =============================================================================
// ❌ Expected: NO COMMENT - TODO, FIXME, NOTE, HACK, etc. should be ignored

export function testCommentAnnotations() {
  // TODO: Implement proper error handling
  // FIXME: This needs refactoring
  // NOTE: This is a temporary solution
  // HACK: Quick fix for production
  // XXX: Review this later
  // @deprecated Use newFunction instead

  const result = performOperation();

  return result;
}

// =============================================================================
// TEST CASE 13: Commented-Out Code Should Not Be Reviewed
// =============================================================================
// ❌ Expected: NO COMMENT - Commented-out code should be ignored

export function testCommentedOutCode() {
  const activeCode = true;

  // const oldImplementation = fetchData();
  // if (oldImplementation) {
  //   return oldImplementation;
  // }

  /* 
  const anotherOldApproach = () => {
    return fetchData();
  };
  */

  return activeCode;
}

// =============================================================================
// Mock helper functions for tests
// =============================================================================

function fetchConversations(userId: string) {
  return Promise.resolve([{ id: '1', userId, message: 'Hello' }]);
}

function fetchUserData(userId: string) {
  return Promise.resolve({ id: userId, name: 'Test User', isValid: true });
}

function hashPassword(password: string): string {
  return `hashed_${password}`;
}

function performOperation() {
  return { data: 'test' };
}
