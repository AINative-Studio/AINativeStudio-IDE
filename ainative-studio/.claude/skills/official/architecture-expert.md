---
name: architecture-expert
version: 1.0.0
author: AINative Studio
description: Expert guidance for software architecture design including patterns, scalability, system design, and architectural decision-making
category: architecture
tags:
  - architecture
  - design-patterns
  - scalability
  - system-design
  - microservices
  - distributed-systems
source: official
dependencies: []
---

# Architecture Expert

You are an expert software architect with deep knowledge of system design, design patterns, scalability, and making sound architectural decisions.

## Core Architecture Principles

1. **SOLID Principles**: Design maintainable, flexible code
2. **Separation of Concerns**: Each component has a single, well-defined purpose
3. **DRY (Don't Repeat Yourself)**: Avoid code duplication
4. **YAGNI (You Aren't Gonna Need It)**: Don't over-engineer
5. **KISS (Keep It Simple, Stupid)**: Simplicity over complexity

## SOLID Principles

### Single Responsibility Principle
```typescript
// ❌ Class has multiple responsibilities
class User {
  saveToDatabase() { /* ... */ }
  sendEmail() { /* ... */ }
  generateReport() { /* ... */ }
  validateData() { /* ... */ }
}

// ✅ Each class has one responsibility
class User {
  constructor(public id: string, public email: string) {}
}

class UserRepository {
  async save(user: User): Promise<void> { /* ... */ }
}

class EmailService {
  async send(to: string, subject: string, body: string): Promise<void> { /* ... */ }
}

class UserReportGenerator {
  generate(user: User): Report { /* ... */ }
}

class UserValidator {
  validate(data: unknown): User | ValidationError { /* ... */ }
}
```

### Open/Closed Principle
```typescript
// ❌ Must modify class to add new shapes
class AreaCalculator {
  calculate(shapes: any[]): number {
    return shapes.reduce((total, shape) => {
      if (shape.type === 'circle') {
        return total + Math.PI * shape.radius ** 2;
      } else if (shape.type === 'rectangle') {
        return total + shape.width * shape.height;
      }
      return total;
    }, 0);
  }
}

// ✅ Open for extension, closed for modification
interface Shape {
  area(): number;
}

class Circle implements Shape {
  constructor(public radius: number) {}
  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

class Rectangle implements Shape {
  constructor(public width: number, public height: number) {}
  area(): number {
    return this.width * this.height;
  }
}

class AreaCalculator {
  calculate(shapes: Shape[]): number {
    return shapes.reduce((total, shape) => total + shape.area(), 0);
  }
}
```

### Dependency Inversion Principle
```typescript
// ❌ High-level module depends on low-level module
class UserService {
  private mysql: MySQLDatabase;

  constructor() {
    this.mysql = new MySQLDatabase();  // Tight coupling!
  }

  async getUser(id: string): Promise<User> {
    return this.mysql.query(`SELECT * FROM users WHERE id = '${id}'`);
  }
}

// ✅ Both depend on abstraction
interface IDatabase {
  query<T>(sql: string, params: any[]): Promise<T>;
}

class UserService {
  constructor(private database: IDatabase) {}

  async getUser(id: string): Promise<User> {
    return this.database.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
  }
}

// Can swap implementations
const mysqlDb = new MySQLDatabase();
const postgresDb = new PostgresDatabase();
const service = new UserService(postgresDb);  // Easy to change!
```

## Design Patterns

### Factory Pattern
```typescript
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[Console] ${message}`);
  }
}

class FileLogger implements Logger {
  constructor(private filePath: string) {}

  log(message: string): void {
    fs.appendFileSync(this.filePath, `${message}\n`);
  }
}

class LoggerFactory {
  static create(type: 'console' | 'file', options?: any): Logger {
    switch (type) {
      case 'console':
        return new ConsoleLogger();
      case 'file':
        return new FileLogger(options.filePath);
      default:
        throw new Error(`Unknown logger type: ${type}`);
    }
  }
}

// Usage
const logger = LoggerFactory.create('file', { filePath: '/var/log/app.log' });
```

### Strategy Pattern
```typescript
interface PaymentStrategy {
  pay(amount: number): Promise<PaymentResult>;
}

class CreditCardPayment implements PaymentStrategy {
  constructor(private cardNumber: string) {}

  async pay(amount: number): Promise<PaymentResult> {
    // Process credit card payment
    return { success: true, transactionId: '...' };
  }
}

class PayPalPayment implements PaymentStrategy {
  constructor(private email: string) {}

  async pay(amount: number): Promise<PaymentResult> {
    // Process PayPal payment
    return { success: true, transactionId: '...' };
  }
}

class PaymentProcessor {
  constructor(private strategy: PaymentStrategy) {}

  async processPayment(amount: number): Promise<PaymentResult> {
    return this.strategy.pay(amount);
  }

  setStrategy(strategy: PaymentStrategy): void {
    this.strategy = strategy;
  }
}

// Usage
const processor = new PaymentProcessor(
  new CreditCardPayment('1234-5678-9012-3456')
);
await processor.processPayment(100);

// Change strategy
processor.setStrategy(new PayPalPayment('user@example.com'));
await processor.processPayment(50);
```

### Observer Pattern
```typescript
interface Observer {
  update(data: any): void;
}

class Subject {
  private observers: Observer[] = [];

  attach(observer: Observer): void {
    this.observers.push(observer);
  }

  detach(observer: Observer): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notify(data: any): void {
    for (const observer of this.observers) {
      observer.update(data);
    }
  }
}

class UserSession extends Subject {
  login(user: User): void {
    // Login logic
    this.notify({ event: 'login', user });
  }

  logout(): void {
    // Logout logic
    this.notify({ event: 'logout' });
  }
}

class LoggingObserver implements Observer {
  update(data: any): void {
    console.log('Event logged:', data);
  }
}

class AnalyticsObserver implements Observer {
  update(data: any): void {
    // Send to analytics
  }
}

// Usage
const session = new UserSession();
session.attach(new LoggingObserver());
session.attach(new AnalyticsObserver());

session.login(user);  // Both observers notified
```

### Repository Pattern
```typescript
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

class UserRepository implements IRepository<User> {
  constructor(private database: IDatabase) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.database.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return row ? this.mapToUser(row) : null;
  }

  async findAll(): Promise<User[]> {
    const rows = await this.database.query('SELECT * FROM users');
    return rows.map(this.mapToUser);
  }

  async save(user: User): Promise<User> {
    const result = await this.database.query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [user.email, user.name]
    );
    return this.mapToUser(result);
  }

  async delete(id: string): Promise<void> {
    await this.database.query('DELETE FROM users WHERE id = $1', [id]);
  }

  private mapToUser(row: any): User {
    return new User(row.id, row.email, row.name);
  }
}
```

## Layered Architecture

```
┌─────────────────────────────────────┐
│     Presentation Layer              │  ← UI/Controllers/API
│  (React, Express Routes)            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│     Application Layer               │  ← Use Cases/Services
│  (UserService, OrderService)        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│     Domain Layer                    │  ← Business Logic
│  (User, Order, Product)             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│     Infrastructure Layer            │  ← Database/External APIs
│  (Repositories, HTTP Clients)       │
└─────────────────────────────────────┘
```

```typescript
// Presentation Layer
class UserController {
  constructor(private userService: UserService) {}

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.userService.createUser(req.body);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

// Application Layer
class UserService {
  constructor(
    private userRepository: IRepository<User>,
    private emailService: IEmailService
  ) {}

  async createUser(data: CreateUserDTO): Promise<User> {
    // Application logic
    const user = new User(data.email, data.name);

    // Validate
    user.validate();

    // Save
    const saved = await this.userRepository.save(user);

    // Side effects
    await this.emailService.sendWelcome(user.email);

    return saved;
  }
}

// Domain Layer
class User {
  constructor(
    public id: string,
    public email: string,
    public name: string
  ) {}

  validate(): void {
    if (!this.email || !this.email.includes('@')) {
      throw new Error('Invalid email');
    }
    if (!this.name || this.name.length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
  }
}

// Infrastructure Layer
class PostgresUserRepository implements IRepository<User> {
  constructor(private db: Pool) {}

  async save(user: User): Promise<User> {
    // PostgreSQL-specific implementation
  }
}
```

## Microservices Architecture

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  User Service  │     │ Order Service  │     │Product Service │
│                │     │                │     │                │
│  - Users       │     │  - Orders      │     │  - Products    │
│  - Auth        │     │  - Payments    │     │  - Inventory   │
└────────┬───────┘     └────────┬───────┘     └────────┬───────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                       ┌────────▼────────┐
                       │   API Gateway   │
                       └────────┬────────┘
                                │
                        ┌───────▼────────┐
                        │     Client     │
                        └────────────────┘
```

```typescript
// Service-to-service communication
class OrderService {
  constructor(
    private userServiceClient: UserServiceClient,
    private productServiceClient: ProductServiceClient
  ) {}

  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    // Call User Service
    const user = await this.userServiceClient.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Call Product Service
    const products = await this.productServiceClient.getProducts(
      items.map(item => item.productId)
    );

    // Validate inventory
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.productId}`);
      }
    }

    // Create order
    const order = new Order(userId, items);
    return this.orderRepository.save(order);
  }
}
```

## Event-Driven Architecture

```typescript
// Event bus
interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
}

// Domain events
class UserCreatedEvent {
  constructor(
    public userId: string,
    public email: string,
    public timestamp: Date
  ) {}
}

class OrderPlacedEvent {
  constructor(
    public orderId: string,
    public userId: string,
    public total: number,
    public timestamp: Date
  ) {}
}

// Event handlers
class SendWelcomeEmailHandler {
  async handle(event: UserCreatedEvent): Promise<void> {
    await emailService.sendWelcome(event.email);
  }
}

class UpdateInventoryHandler {
  async handle(event: OrderPlacedEvent): Promise<void> {
    await inventoryService.decrementStock(event.orderId);
  }
}

// Setup
const eventBus = new EventBus();
eventBus.subscribe('UserCreated', new SendWelcomeEmailHandler());
eventBus.subscribe('OrderPlaced', new UpdateInventoryHandler());

// Publish events
await eventBus.publish(
  new UserCreatedEvent(user.id, user.email, new Date())
);
```

## Scalability Patterns

### Caching Strategy
```typescript
class CachedUserService {
  constructor(
    private userService: UserService,
    private cache: ICache
  ) {}

  async getUser(id: string): Promise<User> {
    // Try cache first
    const cacheKey = `user:${id}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - fetch from database
    const user = await this.userService.getUser(id);

    // Store in cache
    await this.cache.set(cacheKey, JSON.stringify(user), {
      ttl: 300  // 5 minutes
    });

    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = await this.userService.updateUser(id, data);

    // Invalidate cache
    await this.cache.delete(`user:${id}`);

    return user;
  }
}
```

### Rate Limiting
```typescript
class RateLimiter {
  constructor(
    private cache: ICache,
    private maxRequests: number,
    private windowMs: number
  ) {}

  async checkLimit(key: string): Promise<boolean> {
    const current = await this.cache.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= this.maxRequests) {
      return false;  // Rate limit exceeded
    }

    // Increment counter
    if (count === 0) {
      await this.cache.set(key, '1', { ttl: this.windowMs / 1000 });
    } else {
      await this.cache.increment(key);
    }

    return true;
  }
}

// Middleware
async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const limiter = new RateLimiter(redis, 100, 60000);  // 100 req/min
  const key = `rate_limit:${req.ip}`;

  const allowed = await limiter.checkLimit(key);

  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
}
```

## Architecture Decision Records (ADRs)

```markdown
# ADR 001: Use Microservices Architecture

## Status
Accepted

## Context
Our monolithic application is becoming difficult to scale and deploy. Different teams are blocked by each other's changes, and we need independent scaling of different features.

## Decision
We will migrate to a microservices architecture with the following services:
- User Service
- Order Service
- Product Service
- Payment Service

## Consequences

### Positive
- Teams can deploy independently
- Services can scale independently
- Technology diversity (different services can use different tech)
- Better fault isolation

### Negative
- Increased operational complexity
- Distributed system challenges (network latency, partial failures)
- Data consistency harder to maintain
- More complex testing

## Alternatives Considered

### Modular Monolith
- Pros: Simpler deployment, easier testing
- Cons: Doesn't solve scaling or team independence issues

### Serverless Functions
- Pros: Auto-scaling, no server management
- Cons: Cold start latency, vendor lock-in
```

## When to Use This Skill

- Designing new systems
- Refactoring existing architecture
- Making architectural decisions
- Choosing design patterns
- Planning for scalability
- Evaluating trade-offs
- Reviewing system design
- Creating architecture documentation
