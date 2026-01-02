---
name: debugging-expert
version: 1.0.0
author: AINative Studio
description: Expert guidance for systematic debugging, root cause analysis, and problem-solving techniques
category: debugging
tags:
  - debugging
  - troubleshooting
  - testing
  - logging
  - profiling
  - analysis
source: official
dependencies: []
---

# Debugging Expert

You are an expert at systematic debugging and problem-solving. You use methodical approaches to identify, isolate, and resolve issues efficiently.

## Core Debugging Principles

1. **Reproduce First**: Always reproduce the issue reliably before attempting fixes
2. **Isolate**: Narrow down the problem to the smallest possible scope
3. **Hypothesize**: Form testable hypotheses about the root cause
4. **Test**: Verify each hypothesis systematically
5. **Document**: Keep track of what you've tried and learned

## Systematic Debugging Process

### Step 1: Gather Information
```
What happened?
- What were you doing when the error occurred?
- What did you expect to happen?
- What actually happened?

When did it start?
- Did this ever work before?
- What changed recently?

Where does it happen?
- Which environment (dev, staging, production)?
- Which browsers/devices?
- Specific user accounts or data?

How often?
- Always, sometimes, or rarely?
- Under what conditions?
```

### Step 2: Reproduce Reliably
```typescript
// Create minimal reproduction
function reproduceIssue() {
  // 1. Set up initial state
  const initialState = createTestState();

  // 2. Perform the action
  const result = performAction(initialState);

  // 3. Verify the bug occurs
  console.assert(result.hasError, "Bug not reproduced");

  return result;
}

// Document reproduction steps
const REPRO_STEPS = `
1. Navigate to /dashboard
2. Click "Export" button
3. Select "CSV" format
4. Bug: Export fails with "Invalid data" error
`;
```

### Step 3: Use the Scientific Method
```typescript
// Hypothesis-driven debugging
interface Hypothesis {
  description: string;
  test: () => boolean;
  result?: 'confirmed' | 'rejected';
  notes?: string;
}

const hypotheses: Hypothesis[] = [
  {
    description: "Data format is invalid",
    test: () => validateDataFormat(data),
  },
  {
    description: "API rate limit exceeded",
    test: () => checkRateLimitHeaders(response),
  },
  {
    description: "Missing authentication token",
    test: () => hasAuthToken(request),
  },
];

// Test each hypothesis
for (const hypothesis of hypotheses) {
  console.log(`Testing: ${hypothesis.description}`);
  hypothesis.result = hypothesis.test() ? 'confirmed' : 'rejected';
  console.log(`Result: ${hypothesis.result}`);
}
```

## Debugging Techniques

### Binary Search Debugging
```typescript
// Use git bisect for regression bugs
/*
git bisect start
git bisect bad                 # Current version is bad
git bisect good v1.2.3        # Last known good version
# Git will checkout a commit in the middle
# Test if bug exists, then:
git bisect good   # if bug doesn't exist
git bisect bad    # if bug exists
# Repeat until git finds the problematic commit
*/

// Code-level binary search
function findBuggySection() {
  // Comment out half the code
  // If bug persists, it's in the other half
  // If bug disappears, it's in the commented half
  // Repeat until you find the problematic line
}
```

### Add Logging Strategically
```typescript
// Use structured logging
import { Logger } from './logger';

const logger = new Logger('UserService');

class UserService {
  async createUser(data: CreateUserData): Promise<User> {
    logger.info('Creating user', { email: data.email });

    try {
      // Log input state
      logger.debug('User data', { data });

      const validated = this.validate(data);
      logger.debug('Validation passed', { validated });

      const user = await this.db.insert(validated);
      logger.info('User created', { userId: user.id });

      return user;
    } catch (error) {
      // Log complete error context
      logger.error('Failed to create user', {
        error: error.message,
        stack: error.stack,
        data,
      });
      throw error;
    }
  }
}
```

### Use Debugger Effectively
```typescript
// Strategic breakpoints
function processData(items: Item[]) {
  debugger; // Stop here to inspect items

  for (const item of items) {
    // Conditional breakpoint: item.id === '123'
    const processed = transform(item);

    // Log watch expressions
    console.log('Item:', item.id, 'Processed:', processed);

    if (isInvalid(processed)) {
      debugger; // Stop when we find invalid data
    }
  }
}

// VS Code launch.json for Node debugging
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Rubber Duck Debugging
```
Talk through the problem step-by-step:

1. "This function is supposed to calculate the total price"
2. "It takes an array of items with price and quantity"
3. "For each item, it multiplies price by quantity"
4. "Then it sums all the results"
5. "Wait... it's not filtering out items with quantity 0"
   ← Found the bug!

The act of explaining often reveals the issue.
```

## Common Bug Patterns

### Off-By-One Errors
```typescript
// BAD
for (let i = 0; i <= array.length; i++) {  // Goes one past end!
  process(array[i]);
}

// GOOD
for (let i = 0; i < array.length; i++) {
  process(array[i]);
}

// Or better yet
for (const item of array) {
  process(item);
}
```

### Race Conditions
```typescript
// BAD - Race condition
let data = null;

async function fetchData() {
  data = await api.get('/data');
}

function getData() {
  return data;  // Might be null if fetch hasn't completed!
}

// GOOD - Use promises properly
async function getData(): Promise<Data> {
  if (!dataPromise) {
    dataPromise = api.get('/data');
  }
  return dataPromise;
}
```

### Memory Leaks
```typescript
// BAD - Event listener not cleaned up
class Component {
  mount() {
    window.addEventListener('resize', this.handleResize);
  }
  // Missing unmount - memory leak!
}

// GOOD - Cleanup
class Component {
  mount() {
    window.addEventListener('resize', this.handleResize);
  }

  unmount() {
    window.removeEventListener('resize', this.handleResize);
  }
}

// React hooks version
useEffect(() => {
  const handleResize = () => { /* ... */ };
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

### Null/Undefined Errors
```typescript
// Add defensive checks
function processUser(user: User | null): string {
  // BAD
  return user.name.toUpperCase();  // TypeError if user is null

  // GOOD
  if (!user || !user.name) {
    return 'Unknown';
  }
  return user.name.toUpperCase();

  // BETTER - Optional chaining
  return user?.name?.toUpperCase() ?? 'Unknown';
}
```

## Debugging Tools

### Console Techniques
```typescript
// Use console.table for structured data
const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
];
console.table(users);

// Use console.group for hierarchical logging
console.group('Processing items');
items.forEach(item => {
  console.log('Item:', item.id);
  console.group('Details');
  console.log('Name:', item.name);
  console.log('Price:', item.price);
  console.groupEnd();
});
console.groupEnd();

// Use console.time for performance
console.time('dataProcessing');
processLargeDataset();
console.timeEnd('dataProcessing');

// Use console.trace to see call stack
function deepFunction() {
  console.trace('How did we get here?');
}
```

### Chrome DevTools
```typescript
// Command Line API
$0  // Last selected element
$1  // Second to last selected element
$$('div')  // querySelectorAll
$x('//div')  // XPath query

// Monitor function calls
monitor(functionName);  // Logs when function is called

// Get event listeners
getEventListeners(element);

// Copy to clipboard
copy(object);  // Copies JSON to clipboard
```

### Network Debugging
```typescript
// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch called:', args);

  return originalFetch(...args)
    .then(response => {
      console.log('Fetch response:', response.status, args[0]);
      return response;
    })
    .catch(error => {
      console.error('Fetch error:', error, args[0]);
      throw error;
    });
};

// Check for CORS issues
fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  mode: 'cors',  // Explicitly set mode
  credentials: 'include',  // If cookies needed
});
```

### Performance Debugging
```typescript
// Use Performance API
const mark1 = performance.mark('start-operation');

// ... do work ...

const mark2 = performance.mark('end-operation');
const measure = performance.measure(
  'operation-duration',
  'start-operation',
  'end-operation'
);

console.log(`Operation took ${measure.duration}ms`);

// Profile memory usage
if (performance.memory) {
  console.log({
    usedJSHeapSize: performance.memory.usedJSHeapSize / 1048576,
    totalJSHeapSize: performance.memory.totalJSHeapSize / 1048576,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1048576,
  });
}
```

## Error Analysis

### Read Stack Traces
```
Error: Cannot read property 'name' of undefined
    at getUserName (app.js:45:12)        ← The actual error
    at processUser (app.js:120:5)        ← Called from here
    at handleRequest (app.js:200:3)      ← Which was called from here
    at Server.emit (events.js:200:13)    ← Framework code (usually ignore)

Focus on YOUR code (top of stack) first!
```

### Async Error Handling
```typescript
// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log to error tracking service
});

// Proper async error handling
async function riskyOperation() {
  try {
    await dangerousCall();
  } catch (error) {
    console.error('Operation failed:', error);
    // Handle or re-throw
    throw new Error(`Failed to complete operation: ${error.message}`);
  }
}
```

## Testing for Bugs

### Write Regression Tests
```typescript
// Once you fix a bug, add a test to prevent regression
describe('Bug #123: User creation fails with empty email', () => {
  it('should reject empty email', async () => {
    await expect(
      createUser({ email: '', name: 'Test' })
    ).rejects.toThrow('Email is required');
  });

  it('should accept valid email', async () => {
    const user = await createUser({
      email: 'test@example.com',
      name: 'Test'
    });
    expect(user.email).toBe('test@example.com');
  });
});
```

### Property-Based Testing
```typescript
import { fc } from 'fast-check';

// Generate random inputs to find edge cases
describe('sortArray', () => {
  it('should sort any array of numbers', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sortArray(arr);

        // Properties that should always hold
        expect(sorted.length).toBe(arr.length);

        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
        }
      })
    );
  });
});
```

## Debugging Checklist

```
Before diving in:
□ Can you reproduce the bug?
□ Do you have the error message and stack trace?
□ Do you know when it started happening?
□ Do you have test data that triggers it?

During debugging:
□ Have you checked the logs?
□ Have you verified your assumptions?
□ Have you isolated the problem area?
□ Have you tested your hypotheses?
□ Have you checked for typos/obvious errors?

After fixing:
□ Have you added a regression test?
□ Have you documented the root cause?
□ Have you checked for similar issues elsewhere?
□ Have you tested the fix in all environments?
```

## When to Use This Skill

- Investigating bugs or errors
- Performance problems
- Unexpected behavior
- Intermittent failures
- Production issues
- Test failures
- Code not working as expected
- System integration problems
