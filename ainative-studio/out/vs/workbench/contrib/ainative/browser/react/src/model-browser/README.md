# AINative Model Browser Components

React UI components for browsing, selecting, and managing AI models from the AINative Cloud registry.

## Components

### ModelBrowser

Main container component that provides the complete model browsing experience with filtering, search, and usage tracking.

**Props:**
- `initialView?: 'browse' | 'usage'` - Initial view to display (default: 'browse')
- `onModelSelected?: (model: AIModel) => void` - Callback when a model is selected
- `projectId?: string` - Project ID for model selection context (default: 'default')

**Features:**
- Model browsing with grid layout
- Real-time search and filtering
- Usage and quota dashboard
- Model selection workflow
- Responsive design

**Example:**
```tsx
import { ModelBrowser } from './model-browser';

function MyComponent() {
  return (
    <ModelBrowser
      initialView="browse"
      onModelSelected={(model) => {
        console.log('Selected model:', model.name);
      }}
      projectId="my-project-123"
    />
  );
}
```

---

### ModelCard

Displays individual model information in a card format.

**Props:**
- `model: AIModel` - Model data to display
- `onClick: () => void` - Click handler
- `isSelected?: boolean` - Whether the model is currently selected

**Features:**
- Model name, provider, and version
- Capabilities badges
- Context length information
- Pricing display
- Availability status

**Example:**
```tsx
import { ModelCard } from './model-browser';

function MyComponent({ model }) {
  return (
    <ModelCard
      model={model}
      onClick={() => handleModelClick(model)}
      isSelected={selectedModelId === model.id}
    />
  );
}
```

---

### ModelFilters

Provides filtering controls for the model list.

**Props:**
- `filters: ModelFilters` - Current filter state
- `onChange: (filters: ModelFilters) => void` - Filter change callback
- `onRefresh: () => void` - Refresh models callback

**Features:**
- Search by name/description
- Filter by capabilities
- Filter by pricing tier
- Advanced filters (price, context length)
- Available models only toggle

**Example:**
```tsx
import { ModelFilters } from './model-browser';

function MyComponent() {
  const [filters, setFilters] = useState<ModelFilters>({ availableOnly: true });

  return (
    <ModelFilters
      filters={filters}
      onChange={setFilters}
      onRefresh={handleRefresh}
    />
  );
}
```

---

### ModelSelector

Modal dialog for selecting a model with parameter configuration.

**Props:**
- `model: AIModel` - Model to configure
- `projectId: string` - Project ID
- `onSelect: (model: AIModel, parameters?: Record<string, any>) => void` - Selection callback
- `onClose: () => void` - Close callback

**Features:**
- Model details display
- Parameter configuration
- Validation
- Confirmation state
- Loading state

**Example:**
```tsx
import { ModelSelector } from './model-browser';

function MyComponent() {
  const [showSelector, setShowSelector] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  return (
    <>
      {showSelector && selectedModel && (
        <ModelSelector
          model={selectedModel}
          projectId="my-project"
          onSelect={(model, params) => {
            console.log('Selected:', model.name, params);
            setShowSelector(false);
          }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  );
}
```

---

### UsageDashboard

Displays usage statistics and quota information.

**Features:**
- Total calls, tokens, and cost
- Usage breakdown by model
- Quota status with progress bar
- Period filtering (day, week, month, all)
- Auto-refresh from cloud
- Warning states for approaching/exceeded quota

**Example:**
```tsx
import { UsageDashboard } from './model-browser';

function MyComponent() {
  return <UsageDashboard />;
}
```

## Services Integration

These components integrate with the following services:

### IAIModelRegistryService

Provides model listing, selection, and invocation:
- `listModels(filters?: ModelFilters): Promise<AIModel[]>`
- `getModel(modelId: string): Promise<AIModel>`
- `selectModel(modelId: string, projectId: string, parameters?: Record<string, any>): Promise<void>`
- `getUsageStats(): Promise<UsageStats>`
- `getQuota(): Promise<QuotaInfo>`
- `refreshModels(): Promise<void>`

### IUsageTrackingService

Tracks local token usage and syncs with cloud:
- `trackUsage(modelId: string, inputTokens: number, outputTokens: number): Promise<void>`
- `getUsage(period?: 'day' | 'week' | 'month' | 'all'): Promise<AggregatedUsage>`
- `getQuotaStatus(): Promise<QuotaStatus>`
- `syncWithCloud(): Promise<void>`

### IAINativeAuthService

Authentication state management:
- `isAuthenticated(): boolean`
- `getUser(): AINativeUser | null`
- `logout(): Promise<void>`

## Message Protocol

For window.postMessage integration (when embedding in VS Code webviews):

```typescript
// List models
window.sendToVSCodeAsync({
  type: 'model-list',
  data: {
    filters: {
      provider: 'anthropic',
      capabilities: ['chat', 'code_generation'],
      availableOnly: true
    }
  }
});

// Get specific model
window.sendToVSCodeAsync({
  type: 'model-get',
  data: { modelId: 'claude-3-opus-20240229' }
});

// Select model
window.sendToVSCodeAsync({
  type: 'model-select',
  data: {
    modelId: 'claude-3-opus-20240229',
    projectId: 'my-project',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    }
  }
});

// Get usage stats
window.sendToVSCodeAsync({
  type: 'model-get-usage',
  data: { period: 'month' }
});

// Get quota
window.sendToVSCodeAsync({
  type: 'model-get-quota'
});
```

## Styling

All components use VS Code theme variables from the existing AINative style system:

- `--ainative-bg-1`, `--ainative-bg-2`, `--ainative-bg-3` - Background colors
- `--ainative-fg-1`, `--ainative-fg-2`, `--ainative-fg-3` - Foreground colors
- `--ainative-border-1`, `--ainative-border-2`, `--ainative-border-3` - Border colors
- `--ainative-ring-color` - Focus ring color

Import the CSS file for additional styles:
```tsx
import './model-browser/ModelBrowser.css';
```

## Accessibility

All components follow WCAG 2.1 AA standards:
- Keyboard navigation support
- ARIA attributes
- Focus management
- Screen reader compatibility
- Color contrast compliance

## Responsive Design

Components are mobile-first and responsive:
- Single column on mobile (< 768px)
- 2 columns on tablet (768px - 1024px)
- 3 columns on desktop (> 1024px)

## Error Handling

All components include error boundaries and graceful error states:
- Network errors
- Authentication errors
- Validation errors
- Quota exceeded errors
- Rate limiting

## Performance

Optimizations included:
- Debounced search input
- Memoized filter application
- Lazy loading for large model lists
- Cached model data (5 min TTL)
- Efficient re-rendering with proper React hooks

## TypeScript

Full TypeScript support with exported types:
```typescript
import type {
  AIModel,
  ModelFilters,
  ModelCapability,
  PricingTier,
  UsageStats,
  QuotaInfo
} from './model-browser';
```

## License

Copyright 2025 Glass Devtools, Inc. All rights reserved.
Licensed under the Apache License, Version 2.0.
