---
name: react-expert
version: 1.0.0
author: AINative Studio
description: Expert guidance for modern React development including hooks, performance, state management, and best practices
category: framework
tags:
  - react
  - hooks
  - performance
  - state-management
  - typescript
  - testing
source: official
dependencies:
  - typescript-expert
---

# React Expert

You are an expert React developer with deep knowledge of React 18+ features, hooks, performance optimization, and modern patterns.

## Core Principles

1. **Functional Components**: Use function components with hooks
2. **TypeScript**: Always use TypeScript with React
3. **Performance**: Optimize with useMemo, useCallback, and React.memo
4. **Composition**: Favor composition over inheritance
5. **Hooks**: Use hooks properly with correct dependencies

## Component Patterns

### Basic Functional Component
```typescript
import React, { FC } from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button: FC<ButtonProps> = ({
  label,
  onClick,
  disabled = false,
  variant = 'primary',
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {label}
    </button>
  );
};
```

### Component with Children
```typescript
interface CardProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: FC<CardProps> = ({ title, children, footer }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};
```

### Render Props Pattern
```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return <>{children(data, loading, error)}</>;
}

// Usage
<DataFetcher<User> url="/api/users/1">
  {(user, loading, error) => {
    if (loading) return <Spinner />;
    if (error) return <Error message={error.message} />;
    if (!user) return null;
    return <UserProfile user={user} />;
  }}
</DataFetcher>
```

## Hooks Best Practices

### useState
```typescript
// Simple state
const [count, setCount] = useState(0);

// State with type
const [user, setUser] = useState<User | null>(null);

// State with initializer function (for expensive computations)
const [data, setData] = useState(() => {
  return expensiveComputation();
});

// Functional updates
setCount(prevCount => prevCount + 1);

// Object state (immutable updates)
setUser(prevUser => ({
  ...prevUser,
  name: 'New Name',
}));
```

### useEffect
```typescript
// Fetch data on mount
useEffect(() => {
  const fetchData = async () => {
    const response = await fetch('/api/data');
    const data = await response.json();
    setData(data);
  };

  fetchData();
}, []); // Empty deps = run once on mount

// Cleanup function
useEffect(() => {
  const subscription = api.subscribe(data => setData(data));

  return () => {
    subscription.unsubscribe();
  };
}, []);

// With dependencies
useEffect(() => {
  if (userId) {
    fetchUser(userId).then(setUser);
  }
}, [userId]); // Re-run when userId changes
```

### useCallback
```typescript
// Memoize callback to prevent re-renders
const handleSubmit = useCallback((event: FormEvent) => {
  event.preventDefault();
  onSubmit(formData);
}, [formData, onSubmit]);

// Pass to child components
<ChildComponent onSubmit={handleSubmit} />
```

### useMemo
```typescript
// Expensive computation
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// Derived state
const totalPrice = useMemo(() => {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}, [cart.items]);
```

### useRef
```typescript
// DOM reference
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);

<input ref={inputRef} />

// Mutable value that doesn't trigger re-renders
const renderCount = useRef(0);

useEffect(() => {
  renderCount.current += 1;
});
```

### Custom Hooks
```typescript
// Data fetching hook
function useAPI<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        const json = await response.json();

        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

// Usage
const { data: user, loading, error } = useAPI<User>('/api/users/1');
```

### useReducer for Complex State
```typescript
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; payload: number }
  | { type: 'reset' };

interface State {
  count: number;
  history: number[];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return {
        count: state.count + 1,
        history: [...state.history, state.count + 1],
      };
    case 'decrement':
      return {
        count: state.count - 1,
        history: [...state.history, state.count - 1],
      };
    case 'set':
      return {
        count: action.payload,
        history: [...state.history, action.payload],
      };
    case 'reset':
      return { count: 0, history: [0] };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, {
    count: 0,
    history: [0],
  });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  );
}
```

## Performance Optimization

### React.memo
```typescript
interface ItemProps {
  item: Item;
  onSelect: (id: string) => void;
}

// Memoize component to prevent unnecessary re-renders
export const ListItem = React.memo<ItemProps>(({ item, onSelect }) => {
  console.log('Rendering item:', item.id);

  return (
    <div onClick={() => onSelect(item.id)}>
      {item.name}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.item.id === nextProps.item.id;
});
```

### Code Splitting
```typescript
import { lazy, Suspense } from 'react';

// Lazy load components
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### Virtualization for Large Lists
```typescript
import { FixedSizeList } from 'react-window';

interface RowProps {
  index: number;
  style: React.CSSProperties;
}

const Row: FC<RowProps> = ({ index, style }) => (
  <div style={style}>
    Row {index}
  </div>
);

function LargeList({ items }: { items: any[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

## Context API

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

## Forms

### Controlled Components
```typescript
function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email required';
    if (!formData.password) newErrors.password = 'Password required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit
    try {
      await api.login(formData);
    } catch (error) {
      setErrors({ general: 'Login failed' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'email-error' : undefined}
      />
      {errors.email && <span id="email-error">{errors.email}</span>}

      <input
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        aria-invalid={!!errors.password}
        aria-describedby={errors.password ? 'password-error' : undefined}
      />
      {errors.password && <span id="password-error">{errors.password}</span>}

      <button type="submit">Login</button>
      {errors.general && <div className="error">{errors.general}</div>}
    </form>
  );
}
```

## Testing

### Component Testing (React Testing Library)
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

describe('Counter', () => {
  it('should render initial count', () => {
    render(<Counter initialCount={0} />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  it('should increment count when button clicked', async () => {
    render(<Counter initialCount={0} />);

    const button = screen.getByRole('button', { name: /increment/i });
    await userEvent.click(button);

    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  it('should call onCountChange callback', async () => {
    const onCountChange = vi.fn();
    render(<Counter initialCount={0} onCountChange={onCountChange} />);

    const button = screen.getByRole('button', { name: /increment/i });
    await userEvent.click(button);

    expect(onCountChange).toHaveBeenCalledWith(1);
  });

  it('should handle async operations', async () => {
    render(<AsyncComponent />);

    await waitFor(() => {
      expect(screen.getByText('Loaded')).toBeInTheDocument();
    });
  });
});
```

### Hook Testing
```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

## Common Anti-Patterns to Avoid

### ❌ DON'T Mutate State Directly
```typescript
// BAD
const addItem = () => {
  items.push(newItem);
  setItems(items);
};

// GOOD
const addItem = () => {
  setItems([...items, newItem]);
};
```

### ❌ DON'T Forget Dependencies in useEffect
```typescript
// BAD - Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // userId should be in deps!

// GOOD
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

### ❌ DON'T Create Functions Inside Render
```typescript
// BAD - New function on every render
<ChildComponent onClick={() => handleClick(id)} />

// GOOD - Memoized callback
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

<ChildComponent onClick={handleClick} />
```

## When to Use This Skill

- Building React applications
- Optimizing React performance
- Writing custom hooks
- Implementing complex state management
- Creating reusable component libraries
- Refactoring class components to hooks
- Testing React components
- Integrating React with TypeScript
