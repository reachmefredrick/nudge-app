# Nudge App - Development Workflow & Coding Standards

## Project Structure

```
nudge-app/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── login/              # Authentication pages
│   │   ├── dashboard/          # Main dashboard
│   │   └── reminders/          # Reminders management
│   ├── components/             # Reusable UI components
│   │   ├── ProtectedLayout.tsx # Auth wrapper
│   │   └── TeamsNotificationManager.tsx
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.tsx     # Authentication state
│   │   ├── TeamsContext.tsx    # Teams integration
│   │   └── NotificationContext.tsx # Notifications
│   ├── services/               # Business logic & API calls
│   │   ├── microsoftGraphService.ts
│   │   ├── teamsIntegrationService.ts
│   │   ├── userStorageService.ts
│   │   └── hybridFileStorageService.ts
│   ├── types/                  # TypeScript type definitions
│   │   └── shared.ts
│   ├── data/                   # Static data & storage
│   │   └── reminders.json
│   └── middleware.ts           # Next.js middleware
├── docs/                       # Documentation
│   ├── USE_CASE_SPECIFICATION.md
│   ├── TECHNICAL_IMPLEMENTATION.md
│   └── DEVELOPMENT_WORKFLOW.md
├── public/                     # Static assets
├── package.json               # Dependencies & scripts
├── next.config.js             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Project overview
```

---

## Development Environment Setup

### Prerequisites

```bash
# Required software
node >= 18.0.0
npm >= 9.0.0
git >= 2.30.0

# Recommended VS Code extensions
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Prettier - Code formatter
- Auto Rename Tag
- Bracket Pair Colorizer
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/reachmefredrick/nudge-app.git
cd nudge-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Azure app registration details

# Start development server
npm run dev
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_AZURE_CLIENT_ID=your_azure_client_id
NEXT_PUBLIC_AZURE_TENANT_ID=your_azure_tenant_id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Coding Standards

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### Code Style Guidelines

#### 1. File Naming Conventions

```
- Components: PascalCase (e.g., TeamsContext.tsx)
- Services: camelCase (e.g., microsoftGraphService.ts)
- Types: camelCase with .types.ts suffix (e.g., shared.types.ts)
- Pages: lowercase with hyphens (e.g., reminders/page.tsx)
- Constants: UPPER_SNAKE_CASE
```

#### 2. Component Structure

```typescript
// Standard component template
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Typography, Box, Button } from "@mui/material";

// Types
interface ComponentProps {
  title: string;
  onAction?: () => void;
}

// Component
export const ComponentName: React.FC<ComponentProps> = ({
  title,
  onAction,
}) => {
  // State
  const [isLoading, setIsLoading] = useState(false);

  // Effects
  useEffect(() => {
    // Initialize component
  }, []);

  // Handlers
  const handleClick = useCallback(() => {
    setIsLoading(true);
    onAction?.();
    setIsLoading(false);
  }, [onAction]);

  // Render
  return (
    <Box>
      <Typography variant="h6">{title}</Typography>
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? "Loading..." : "Action"}
      </Button>
    </Box>
  );
};

export default ComponentName;
```

#### 3. Service Class Structure

```typescript
// Service class template
export class ServiceName {
  private apiUrl: string;
  private config: ServiceConfig;

  constructor(config?: ServiceConfig) {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    this.config = { ...defaultConfig, ...config };
  }

  // Public methods
  async publicMethod(param: string): Promise<ReturnType> {
    try {
      const result = await this.privateMethod(param);
      return this.formatResult(result);
    } catch (error) {
      console.error("Error in publicMethod:", error);
      throw new ServiceError("Operation failed", error);
    }
  }

  // Private methods
  private async privateMethod(param: string): Promise<RawType> {
    // Implementation
  }

  private formatResult(data: RawType): ReturnType {
    // Data transformation
  }
}

// Export singleton instance
export const serviceName = new ServiceName();
```

#### 4. Context Provider Pattern

```typescript
// Context template
interface ContextType {
  state: StateType;
  actions: {
    updateState: (data: StateType) => void;
    resetState: () => void;
  };
}

const Context = createContext<ContextType | undefined>(undefined);

export const useContext = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useContext must be used within a Provider");
  }
  return context;
};

export const Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StateType>(initialState);

  const updateState = useCallback((data: StateType) => {
    setState(data);
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  const value: ContextType = {
    state,
    actions: { updateState, resetState },
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
};
```

### 5. Error Handling Patterns

#### Service Layer Error Handling

```typescript
export class ServiceError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public context?: string
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

// Usage in services
try {
  const result = await externalAPI.call();
  return result;
} catch (error) {
  console.error("API call failed:", error);
  throw new ServiceError(
    "Failed to fetch data",
    error,
    "DataService.fetchData"
  );
}
```

#### Component Error Boundaries

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p={3} textAlign="center">
          <Typography variant="h6" color="error">
            Something went wrong
          </Typography>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

---

## Git Workflow

### Branch Strategy

```
main                    # Production-ready code
├── develop            # Integration branch
├── feature/UC-001     # Feature branches
├── hotfix/fix-auth    # Emergency fixes
└── release/v1.1.0     # Release preparation
```

### Commit Message Convention

```
feat: add Teams persistent configuration
fix: resolve authentication token refresh issue
docs: update API documentation
style: format code with prettier
refactor: extract notification logic to service
test: add unit tests for reminder scheduling
perf: optimize reminder loading performance
chore: update dependencies
```

### Commit Message Template

```
<type>(<scope>): <subject>

<body>

<footer>
```

Example:

```
feat(teams): implement persistent Teams settings

- Add localStorage for team/channel selection
- Auto-restore configuration on app load
- Clear settings on sign-out
- Add visual indicators for saved state

Closes #15
```

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console.log statements (except intentional logging)
```

---

## Testing Strategy

### Unit Testing Setup

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
```

```javascript
// jest.config.js
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testEnvironment: "jest-environment-jsdom",
};

module.exports = createJestConfig(customJestConfig);
```

### Test Examples

#### Component Testing

```typescript
// __tests__/components/ReminderCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import ReminderCard from "@/components/ReminderCard";

const mockReminder = {
  id: 1,
  title: "Test Reminder",
  description: "Test Description",
  datetime: new Date(),
  priority: "medium",
  isRecurring: false,
  active: true,
};

describe("ReminderCard", () => {
  it("renders reminder information correctly", () => {
    render(<ReminderCard reminder={mockReminder} />);

    expect(screen.getByText("Test Reminder")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const mockOnEdit = jest.fn();
    render(<ReminderCard reminder={mockReminder} onEdit={mockOnEdit} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledWith(mockReminder);
  });
});
```

#### Service Testing

```typescript
// __tests__/services/userStorageService.test.ts
import { userStorageService } from "@/services/userStorageService";

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe("UserStorageService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves reminders to localStorage", () => {
    const reminders = [{ id: 1, title: "Test" }];
    userStorageService.saveUserReminders(1, reminders);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "nudge-reminders-1",
      JSON.stringify(reminders)
    );
  });

  it("loads reminders from localStorage", () => {
    const reminders = [{ id: 1, title: "Test" }];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(reminders));

    const result = userStorageService.getUserReminders(1);
    expect(result).toEqual(reminders);
  });
});
```

---

## Performance Guidelines

### Code Optimization Patterns

#### 1. Memoization

```typescript
// Expensive calculations
const expensiveValue = useMemo(() => {
  return reminders
    .filter((r) => r.active)
    .sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
}, [reminders]);

// Callback memoization
const handleReminderUpdate = useCallback((id: number, data: ReminderData) => {
  setReminders((prev) =>
    prev.map((r) => (r.id === id ? { ...r, ...data } : r))
  );
}, []);
```

#### 2. Lazy Loading

```typescript
// Dynamic imports for heavy components
const TeamsNotificationManager = lazy(
  () => import("@/components/TeamsNotificationManager")
);

// Service lazy loading
const loadHeavyService = async () => {
  const { heavyService } = await import("@/services/heavyService");
  return heavyService;
};
```

#### 3. Debouncing

```typescript
// Input debouncing
const debouncedSearch = useMemo(
  () =>
    debounce((query: string) => {
      performSearch(query);
    }, 300),
  []
);

// Auto-save debouncing
const debouncedSave = useMemo(
  () =>
    debounce((data: any) => {
      saveToStorage(data);
    }, 1000),
  []
);
```

#### 4. Virtual Scrolling (for large lists)

```typescript
// For large reminder lists
const VirtualizedReminderList = ({
  reminders,
}: {
  reminders: ReminderData[];
}) => {
  const [visibleItems, setVisibleItems] = useState<ReminderData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      // Update visible items based on viewport
    });

    // Setup intersection observer logic
  }, [reminders]);

  return (
    <div ref={containerRef}>
      {visibleItems.map((reminder) => (
        <ReminderCard key={reminder.id} reminder={reminder} />
      ))}
    </div>
  );
};
```

---

## Debugging and Monitoring

### Development Debugging

```typescript
// Debug helpers
const DEBUG = process.env.NODE_ENV === "development";

const debugLog = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`🐛 [DEBUG] ${message}`, data);
  }
};

// Performance monitoring
const withTiming = <T extends any[], R>(
  fn: (...args: T) => R,
  label: string
) => {
  return (...args: T): R => {
    const start = performance.now();
    const result = fn(...args);
    const duration = performance.now() - start;
    debugLog(`⏱️ ${label} took ${duration.toFixed(2)}ms`);
    return result;
  };
};
```

### Error Tracking

```typescript
// Error reporting service
class ErrorReporter {
  static report(error: Error, context?: string) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    if (process.env.NODE_ENV === "production") {
      // Send to error tracking service
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorInfo),
      });
    } else {
      console.error("🚨 Error Report:", errorInfo);
    }
  }
}

// Usage in components
try {
  await performRiskyOperation();
} catch (error) {
  ErrorReporter.report(error as Error, "ReminderCreation");
  throw error;
}
```

---

## Deployment Pipeline

### Build Process

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run type-check && npm run test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

### CI/CD Configuration

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: echo "Deploy to production"
```

---

## Code Review Checklist

### Functionality

- [ ] Feature works as specified in requirements
- [ ] Edge cases are handled appropriately
- [ ] Error scenarios are covered
- [ ] Performance is acceptable

### Code Quality

- [ ] Code follows project conventions
- [ ] Functions are single-purpose and focused
- [ ] Variable names are descriptive
- [ ] Comments explain "why" not "what"
- [ ] No console.log statements (except intentional logging)

### TypeScript

- [ ] Proper type annotations
- [ ] No use of `any` type (unless justified)
- [ ] Interface definitions are complete
- [ ] Generics used appropriately

### Testing

- [ ] Unit tests cover new functionality
- [ ] Integration tests pass
- [ ] Test cases cover edge scenarios
- [ ] Mocks are used appropriately

### Security

- [ ] Input validation implemented
- [ ] No sensitive data in code
- [ ] HTTPS used for external requests
- [ ] Authentication properly handled

### Performance

- [ ] No unnecessary re-renders
- [ ] Expensive operations are memoized
- [ ] Large lists use virtualization
- [ ] Images are optimized

---

This development workflow document provides comprehensive guidelines for maintaining code quality, consistency, and best practices throughout the development lifecycle of the Nudge App.
