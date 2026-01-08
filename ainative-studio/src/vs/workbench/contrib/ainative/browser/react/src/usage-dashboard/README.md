# Usage Dashboard

Comprehensive usage tracking and visualization for AINative Cloud credits and model usage.

## Components

### UsageDashboard (Main Component)
The primary container component that orchestrates all sub-components and data fetching.

**Features:**
- Real-time credits status display
- Historical usage charts
- Model distribution breakdown
- Cost projections
- Data export (CSV/JSON)
- Auto-refresh capability
- Period filtering (7/30/90 days)

**Usage:**
```tsx
import { UsageDashboard } from './usage-dashboard';

<UsageDashboard />
```

### CreditsDisplay
Shows current credits status with visual indicators and warnings.

**Features:**
- Total/Used/Remaining credits display
- Progress bar with color-coded status
- Plan tier badge
- Low credits warning
- Reset date display
- Trend indicators

### UsageChart
Line chart showing credits usage over time.

**Features:**
- SVG-based line chart with area fill
- Interactive tooltips on data points
- Grid lines and axis labels
- Average daily usage calculation
- Trend percentage indicator
- Responsive design

### ModelBreakdown
Pie chart showing distribution of usage across models.

**Features:**
- Donut-style pie chart
- Color-coded model segments
- Interactive tooltips
- Legend with detailed stats
- Summary statistics
- Credits/tokens/requests per model

### CostProjection
Estimates future credit usage and provides recommendations.

**Features:**
- Monthly credit estimate
- Monthly cost projection
- Projected exhaustion date
- Confidence level indicator
- Smart recommendations
- Warning alerts for low credits

## Data Flow

1. **Data Sources:**
   - `IUsageTrackingService.getCreditsStatus()` - Current credits
   - `IUsageTrackingService.getCreditsHistory(days)` - Historical data
   - `IUsageTrackingService.getUsage(period)` - Model breakdown

2. **State Management:**
   - React hooks for local state
   - Service layer for data persistence
   - Real-time updates via event listeners

3. **Export Functionality:**
   - CSV format for spreadsheet analysis
   - JSON format for programmatic access
   - Includes all dashboard data

## Integration

### With VS Code Webview
```typescript
// In a webview provider
import { UsageDashboard } from './usage-dashboard';

const html = `
  <div id="root"></div>
  <script>
    ReactDOM.render(<UsageDashboard />, document.getElementById('root'));
  </script>
`;
```

### With Existing Services
The dashboard automatically integrates with:
- `IUsageTrackingService` - Usage data
- `IAINativeCloudAuthService` - Authentication
- `IAIModelRegistryService` - Model information

## Styling

Uses AINative Studio theme variables:
- `ainative-bg-1` - Primary background
- `ainative-bg-2` - Secondary background
- `ainative-fg-1` - Primary text
- `ainative-fg-3` - Secondary text
- `ainative-border-2` - Borders
- `#0e70c0` - AINative blue accent

## Responsive Design

- Mobile-first approach
- Grid layouts adapt to screen size
- Charts scale to container width
- Touch-friendly interactions

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly
- Tooltips for context

## Performance

- Lazy loading of chart data
- Memoized calculations
- Debounced refresh
- Efficient re-renders
- Optimized SVG rendering

## Error Handling

- Graceful degradation on API failures
- User-friendly error messages
- Retry mechanisms
- Loading states
- Empty state displays

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] More chart types (bar, stacked area)
- [ ] Custom date range selection
- [ ] Budget alerts and notifications
- [ ] Comparison with previous periods
- [ ] PDF export functionality
- [ ] Team usage analytics
- [ ] API endpoint usage breakdown
