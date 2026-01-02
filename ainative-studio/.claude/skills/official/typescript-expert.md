---
name: typescript-expert
version: 1.0.0
author: AINative Studio
description: Expert guidance for TypeScript development including advanced types, generics, patterns, and VS Code integration
category: language
tags:
  - typescript
  - types
  - generics
  - patterns
  - vscode
  - strict-mode
source: official
dependencies: []
---

# TypeScript Expert

You are an expert TypeScript developer with deep knowledge of advanced type system features, patterns, and best practices for large-scale applications.

## Core Principles

1. **Strict Mode**: Always use `strict: true` in tsconfig.json
2. **Type Safety**: Leverage the type system fully - avoid `any`
3. **Inference**: Let TypeScript infer types when possible
4. **Utility Types**: Use built-in utility types extensively
5. **Generics**: Create reusable, type-safe components

## TSConfig Best Practices

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Advanced Type Patterns

### Conditional Types
```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<string>;  // true
type B = IsString<number>;  // false

// Extracting return types
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Conditional with constraints
type Flatten<T> = T extends Array<infer U> ? U : T;
type Str = Flatten<string[]>;  // string
type Num = Flatten<number>;     // number
```

### Mapped Types
```typescript
// Make all properties optional
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Make all properties required
type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Pick specific properties
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Custom mapped type with transformation
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number; }
```

### Template Literal Types
```typescript
type EventName = "click" | "focus" | "blur";
type ElementEvent = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"

// Route builder
type Route = "/users" | "/posts" | "/comments";
type RouteParams = `${Route}/:id`;
// "/users/:id" | "/posts/:id" | "/comments/:id"

// CSS properties
type CSSProperty = "color" | "background" | "border";
type CSSValue<T extends CSSProperty> =
  T extends "color" ? string :
  T extends "background" ? string :
  T extends "border" ? string :
  never;
```

### Discriminated Unions
```typescript
type Success<T> = {
  status: "success";
  data: T;
};

type Error = {
  status: "error";
  error: string;
};

type Result<T> = Success<T> | Error;

function handleResult<T>(result: Result<T>): void {
  if (result.status === "success") {
    console.log(result.data);  // TypeScript knows this is T
  } else {
    console.error(result.error);  // TypeScript knows this is string
  }
}

// Complex discriminated union
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rectangle"; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.size ** 2;
    case "rectangle":
      return shape.width * shape.height;
  }
}
```

## Generic Patterns

### Constrained Generics
```typescript
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// Multiple constraints
interface Nameable {
  name: string;
}

function sortByName<T extends Nameable & HasId>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
```

### Generic Classes
```typescript
class DataStore<T> {
  private data: Map<string, T> = new Map();

  set(key: string, value: T): void {
    this.data.set(key, value);
  }

  get(key: string): T | undefined {
    return this.data.get(key);
  }

  getOrDefault(key: string, defaultValue: T): T {
    return this.data.get(key) ?? defaultValue;
  }
}

const userStore = new DataStore<User>();
const configStore = new DataStore<Config>();
```

### Generic Utility Functions
```typescript
function groupBy<T, K extends keyof T>(
  items: T[],
  key: K
): Map<T[K], T[]> {
  const groups = new Map<T[K], T[]>();
  for (const item of items) {
    const groupKey = item[key];
    const group = groups.get(groupKey) ?? [];
    group.push(item);
    groups.set(groupKey, group);
  }
  return groups;
}

// Usage
interface User {
  id: string;
  role: "admin" | "user";
  name: string;
}

const usersByRole = groupBy(users, "role");
```

## Dependency Injection Pattern

```typescript
// Service interface
interface IUserService {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserData): Promise<User>;
}

// Service brand for type safety
const IUserService = Symbol("IUserService");

// Service implementation
class UserService implements IUserService {
  constructor(
    @inject(IDatabase) private db: IDatabase,
    @inject(ILogger) private logger: ILogger
  ) {}

  async getUser(id: string): Promise<User> {
    this.logger.info(`Getting user ${id}`);
    return this.db.query("SELECT * FROM users WHERE id = ?", [id]);
  }

  async createUser(data: CreateUserData): Promise<User> {
    this.logger.info("Creating user");
    return this.db.insert("users", data);
  }
}

// Registration
container.registerSingleton(IUserService, UserService);

// Usage
class UserController {
  constructor(
    @inject(IUserService) private userService: IUserService
  ) {}

  async handleGetUser(req: Request): Promise<Response> {
    const user = await this.userService.getUser(req.params.id);
    return Response.json(user);
  }
}
```

## Decorator Patterns

```typescript
// Method decorator
function log(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): void {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args: any[]) {
    console.log(`Calling ${propertyKey} with`, args);
    const result = await originalMethod.apply(this, args);
    console.log(`Result:`, result);
    return result;
  };
}

// Class decorator
function sealed(constructor: Function): void {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

// Property decorator
function validate(validationFn: (value: any) => boolean) {
  return function(target: any, propertyKey: string): void {
    let value: any;

    const getter = () => value;
    const setter = (newValue: any) => {
      if (!validationFn(newValue)) {
        throw new Error(`Invalid value for ${propertyKey}`);
      }
      value = newValue;
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    });
  };
}

// Usage
@sealed
class User {
  @validate((v) => typeof v === "string" && v.length > 0)
  name!: string;

  @log
  async save(): Promise<void> {
    // Save logic
  }
}
```

## Type Guards

```typescript
// Basic type guard
function isString(value: unknown): value is string {
  return typeof value === "string";
}

// Generic type guard
function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

// Object type guard
interface User {
  id: string;
  name: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as any).id === "string" &&
    "name" in value &&
    typeof (value as any).name === "string"
  );
}

// Discriminated union type guard
type Animal = Dog | Cat;

function isDog(animal: Animal): animal is Dog {
  return animal.type === "dog";
}

// Usage
function handleAnimal(animal: Animal): void {
  if (isDog(animal)) {
    animal.bark();  // TypeScript knows this is Dog
  } else {
    animal.meow();  // TypeScript knows this is Cat
  }
}
```

## Async Patterns

```typescript
// Promise with timeout
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    ),
  ]);
}

// Retry logic
async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts: number; delayMs: number }
): Promise<T> {
  let lastError: Error;
  for (let i = 0; i < options.maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < options.maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, options.delayMs));
      }
    }
  }
  throw lastError!;
}

// Parallel execution with limit
async function parallel<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}
```

## Testing with Jest/Vitest

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UserService', () => {
  let userService: UserService;
  let mockDb: jest.Mocked<IDatabase>;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      insert: vi.fn(),
    } as any;

    userService = new UserService(mockDb);
  });

  it('should get user by id', async () => {
    const mockUser = { id: '1', name: 'John' };
    mockDb.query.mockResolvedValue(mockUser);

    const result = await userService.getUser('1');

    expect(result).toEqual(mockUser);
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = ?',
      ['1']
    );
  });

  it('should throw error when user not found', async () => {
    mockDb.query.mockResolvedValue(null);

    await expect(userService.getUser('999')).rejects.toThrow('User not found');
  });
});
```

## Common Anti-Patterns to Avoid

### ❌ DON'T Use `any`
```typescript
// BAD
function process(data: any): any {
  return data.value;
}

// GOOD
function process<T extends { value: unknown }>(data: T): T['value'] {
  return data.value;
}
```

### ❌ DON'T Ignore Null/Undefined
```typescript
// BAD
function getName(user: User): string {
  return user.name;  // What if user is null?
}

// GOOD
function getName(user: User | null): string | null {
  return user?.name ?? null;
}
```

### ❌ DON'T Use Type Assertions Unnecessarily
```typescript
// BAD
const value = getData() as string;

// GOOD
const value = getData();
if (typeof value === 'string') {
  // Use value here
}
```

## When to Use This Skill

- Writing new TypeScript code
- Refactoring JavaScript to TypeScript
- Implementing complex type systems
- Working with VS Code extensions
- Setting up TypeScript projects
- Debugging type errors
- Optimizing type performance
- Creating type-safe APIs
