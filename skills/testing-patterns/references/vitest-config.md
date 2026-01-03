# Vitest Configuration for React Testing

Complete guide to configuring Vitest for React applications with TypeScript.

## vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Global test setup
    globals: true,
    setupFiles: ['./tests/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    // Test matching patterns
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],

    // Test isolation and performance
    isolate: true,
    testTimeout: 10000,
    hookTimeout: 10000,

    // Reporters
    reporters: ['verbose'],

    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
})
```

## tests/setup.ts

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}
```

## Component Testing Patterns

### Basic Component Test

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@components/Button'

describe('Button', () => {
  it('renders with correct text', () => {
    // ARRANGE & ACT
    render(<Button>Click Me</Button>)

    // ASSERT
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('applies variant styles correctly', () => {
    // ARRANGE & ACT
    render(<Button variant="primary">Primary Button</Button>)

    // ASSERT
    const button = screen.getByRole('button')
    expect(button).toHaveClass('btn-primary')
  })

  it('is disabled when disabled prop is true', () => {
    // ARRANGE & ACT
    render(<Button disabled>Disabled Button</Button>)

    // ASSERT
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Testing User Interactions

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@components/LoginForm'

describe('LoginForm', () => {
  it('calls onSubmit with form data when submitted', async () => {
    // ARRANGE
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    render(<LoginForm onSubmit={handleSubmit} />)

    // ACT
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))

    // ASSERT
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('displays validation error for invalid email', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<LoginForm onSubmit={vi.fn()} />)

    // ACT
    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /login/i }))

    // ASSERT
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })
})
```

### Testing Async Components

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { UserProfile } from '@components/UserProfile'
import * as api from '@services/api'

vi.mock('@services/api')

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays loading state initially', () => {
    // ARRANGE
    vi.mocked(api.fetchUser).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    // ACT
    render(<UserProfile userId="123" />)

    // ASSERT
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays user data when loaded', async () => {
    // ARRANGE
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
    }
    vi.mocked(api.fetchUser).mockResolvedValue(mockUser)

    // ACT
    render(<UserProfile userId="123" />)

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })
  })

  it('displays error message on fetch failure', async () => {
    // ARRANGE
    vi.mocked(api.fetchUser).mockRejectedValue(
      new Error('Failed to fetch user')
    )

    // ACT
    render(<UserProfile userId="123" />)

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

## Hook Testing

### Custom Hook Tests

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCounter } from '@hooks/useCounter'

describe('useCounter', () => {
  it('initializes with default value', () => {
    // ARRANGE & ACT
    const { result } = renderHook(() => useCounter())

    // ASSERT
    expect(result.current.count).toBe(0)
  })

  it('initializes with custom value', () => {
    // ARRANGE & ACT
    const { result } = renderHook(() => useCounter(10))

    // ASSERT
    expect(result.current.count).toBe(10)
  })

  it('increments count', () => {
    // ARRANGE
    const { result } = renderHook(() => useCounter(0))

    // ACT
    act(() => {
      result.current.increment()
    })

    // ASSERT
    expect(result.current.count).toBe(1)
  })

  it('decrements count', () => {
    // ARRANGE
    const { result } = renderHook(() => useCounter(5))

    // ACT
    act(() => {
      result.current.decrement()
    })

    // ASSERT
    expect(result.current.count).toBe(4)
  })

  it('resets count to initial value', () => {
    // ARRANGE
    const { result } = renderHook(() => useCounter(10))

    // ACT
    act(() => {
      result.current.increment()
      result.current.increment()
      result.current.reset()
    })

    // ASSERT
    expect(result.current.count).toBe(10)
  })
})
```

### Async Hook Tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFetchData } from '@hooks/useFetchData'
import * as api from '@services/api'

vi.mock('@services/api')

describe('useFetchData', () => {
  it('fetches data successfully', async () => {
    // ARRANGE
    const mockData = { id: 1, name: 'Test' }
    vi.mocked(api.fetchData).mockResolvedValue(mockData)

    // ACT
    const { result } = renderHook(() => useFetchData('/api/test'))

    // ASSERT
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toEqual(mockData)
      expect(result.current.error).toBeNull()
    })
  })

  it('handles fetch errors', async () => {
    // ARRANGE
    const mockError = new Error('Fetch failed')
    vi.mocked(api.fetchData).mockRejectedValue(mockError)

    // ACT
    const { result } = renderHook(() => useFetchData('/api/test'))

    // ASSERT
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toBeNull()
      expect(result.current.error).toBe(mockError.message)
    })
  })
})
```

## Mocking Strategies

### Mocking API Calls

```typescript
import { vi } from 'vitest'

// Mock entire module
vi.mock('@services/api', () => ({
  fetchUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}))

// Mock specific function
import * as api from '@services/api'
vi.spyOn(api, 'fetchUser').mockResolvedValue({ id: '1', name: 'Test' })
```

### Mocking React Router

```typescript
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Wrap component with router
const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      {component}
    </MemoryRouter>
  )
}

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})
```

### Mocking Context

```typescript
import { vi } from 'vitest'
import { render } from '@testing-library/react'
import { AuthContext } from '@context/AuthContext'

const renderWithAuth = (component: React.ReactElement, authValue = {}) => {
  const defaultValue = {
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    ...authValue,
  }

  return render(
    <AuthContext.Provider value={defaultValue}>
      {component}
    </AuthContext.Provider>
  )
}
```

## Running Tests

### package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

### Commands

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm run test -- UserProfile.test.tsx

# Run tests matching pattern
npm run test -- --grep="login"
```

## Best Practices

### Test Organization

```typescript
// ✅ GOOD - Descriptive describe blocks
describe('LoginForm', () => {
  describe('Rendering', () => {
    it('renders email input', () => {})
    it('renders password input', () => {})
  })

  describe('Validation', () => {
    it('shows error for invalid email', () => {})
    it('shows error for short password', () => {})
  })

  describe('Submission', () => {
    it('calls onSubmit with valid data', () => {})
    it('prevents submission with invalid data', () => {})
  })
})
```

### Accessibility Testing

```typescript
import { axe } from 'vitest-axe'

it('has no accessibility violations', async () => {
  const { container } = render(<LoginForm onSubmit={vi.fn()} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Snapshot Testing

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from '@components/Button'

describe('Button Snapshots', () => {
  it('matches snapshot for primary variant', () => {
    const { container } = render(<Button variant="primary">Click Me</Button>)
    expect(container.firstChild).toMatchSnapshot()
  })
})
```

---

This configuration provides comprehensive testing capabilities for React applications using Vitest.
