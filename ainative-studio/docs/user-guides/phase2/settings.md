# Settings & Configuration

Customize your AINative Studio Managed API experience with these comprehensive settings and configuration options.

## Table of Contents

1. [Managed API Settings Overview](#managed-api-settings-overview)
2. [Choosing Preferred Models](#choosing-preferred-models)
3. [Configuring Tool Behavior](#configuring-tool-behavior)
4. [Max Iterations Setting](#max-iterations-setting)
5. [UI Preferences](#ui-preferences)
6. [Advanced Configuration](#advanced-configuration)
7. [FAQ](#faq)

---

## Managed API Settings Overview

### Accessing Settings

**Method 1: Settings UI**

1. Open Settings (Cmd/Ctrl + ,)
2. Search for "AINative Managed API"
3. Browse and modify settings

**Method 2: JSON Settings**

1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type "Preferences: Open User Settings (JSON)"
3. Add settings under `ainative.managedAPI.*`

### Settings Categories

| Category | Settings Count | Description |
|----------|---------------|-------------|
| **Model Selection** | 5 | Preferred models for different features |
| **Tool Configuration** | 4 | Enable/disable tools and set limits |
| **Usage & Billing** | 3 | Credit warnings and tracking |
| **UI & Display** | 6 | Chat interface customization |
| **Advanced** | 4 | Performance and debugging |

---

## Choosing Preferred Models

### Setting Preferred Models

You can set different models for different features:

#### Chat Model

Default model for general chat interactions.

**Settings UI**:
```
AINative > Managed API > Chat Model
```

**JSON Settings**:
```json
{
  "ainative.managedAPI.preferredModels.chat": "claude-3.5-sonnet"
}
```

**Available Options**:
- `claude-3.5-sonnet` (Recommended)
- `claude-3-opus`
- `claude-3-haiku`
- `gpt-4o`
- `gpt-4o-mini`
- `llama-3.3-70b-instruct`
- `gemini-1.5-pro`
- `gemini-1.5-flash`

#### Code Intelligence Model

Model used for code analysis tasks.

**JSON Settings**:
```json
{
  "ainative.managedAPI.preferredModels.codeIntelligence": "llama-3.3-70b-instruct"
}
```

**Recommendation**: Use `llama-3.3-70b-instruct` for best value (accurate + cheap)

#### Web Fetch Model

Model used for processing fetched documentation.

**JSON Settings**:
```json
{
  "ainative.managedAPI.preferredModels.webFetch": "claude-3-haiku"
}
```

**Recommendation**: Use `claude-3-haiku` for fast documentation summarization

### Model Selection Strategy

Choose models based on your priorities:

#### 1. Quality-First Strategy

For the best responses, use premium models across the board:

```json
{
  "ainative.managedAPI.preferredModels.chat": "claude-3.5-sonnet",
  "ainative.managedAPI.preferredModels.codeIntelligence": "claude-3.5-sonnet",
  "ainative.managedAPI.preferredModels.webFetch": "claude-3.5-sonnet"
}
```

**Pros**: Highest quality responses
**Cons**: Highest credit usage (~3-5x more expensive)

#### 2. Cost-Optimized Strategy

For minimal credit usage:

```json
{
  "ainative.managedAPI.preferredModels.chat": "claude-3-haiku",
  "ainative.managedAPI.preferredModels.codeIntelligence": "llama-3.3-70b-instruct",
  "ainative.managedAPI.preferredModels.webFetch": "gemini-1.5-flash"
}
```

**Pros**: Low credit consumption
**Cons**: May miss nuances in complex questions

#### 3. Balanced Strategy (Recommended)

Use premium for chat, budget for tools:

```json
{
  "ainative.managedAPI.preferredModels.chat": "claude-3.5-sonnet",
  "ainative.managedAPI.preferredModels.codeIntelligence": "llama-3.3-70b-instruct",
  "ainative.managedAPI.preferredModels.webFetch": "claude-3-haiku"
}
```

**Pros**: Great chat quality with controlled tool costs
**Cons**: None significant

---

## Configuring Tool Behavior

### Enable/Disable Tools

Control which tools are available to the AI:

#### Code Intelligence Tool

**Settings UI**:
```
AINative > Managed API > Enable Code Intelligence
```

**JSON Settings**:
```json
{
  "ainative.managedAPI.tools.codeIntelligence.enabled": true
}
```

**Default**: `true`

**When to disable**: If you never analyze code or want to save credits

#### Web Fetch Tool

**JSON Settings**:
```json
{
  "ainative.managedAPI.tools.webFetch.enabled": true
}
```

**Default**: `true`

**When to disable**: If you only work offline or want to prevent external fetches

### Tool Limits

#### Max Code Intelligence Requests per Hour

Prevent excessive credit usage from repeated code analysis:

**JSON Settings**:
```json
{
  "ainative.managedAPI.tools.codeIntelligence.maxRequestsPerHour": 50
}
```

**Default**: `50`
**Range**: `1-1000`

**What happens when exceeded**:
```
Warning: Code intelligence rate limit exceeded
You've used 50 code intelligence requests this hour.
Wait 23 minutes or adjust settings.
```

#### Max Web Fetch Requests per Hour

Limit documentation fetches:

**JSON Settings**:
```json
{
  "ainative.managedAPI.tools.webFetch.maxRequestsPerHour": 30
}
```

**Default**: `30`
**Range**: `1-500`

### Tool Auto-Execution

Control whether tools are executed automatically:

**JSON Settings**:
```json
{
  "ainative.managedAPI.tools.autoExecute": true
}
```

**Default**: `true`

**Options**:
- `true`: AI can use tools without asking
- `false`: AI asks permission before using each tool

**Example with auto-execute disabled**:
```
AI: I'd like to analyze this code's complexity using the code_intelligence
    tool. This will cost approximately 52 credits. Proceed?

[Allow] [Deny]
```

---

## Max Iterations Setting

### What are Iterations?

When using tools, the AI may need multiple rounds:

1. **Iteration 1**: AI requests code_intelligence tool
2. **Iteration 2**: AI receives results, asks follow-up with web_fetch
3. **Iteration 3**: AI combines both results to answer

### Configuring Max Iterations

**JSON Settings**:
```json
{
  "ainative.managedAPI.maxIterations": 5
}
```

**Default**: `5`
**Range**: `1-20`

### Choosing the Right Value

| Value | Best For | Credit Impact |
|-------|----------|---------------|
| **1-2** | Simple queries | Lowest credits |
| **3-5** | General use (Recommended) | Moderate credits |
| **6-10** | Complex multi-tool tasks | Higher credits |
| **11-20** | Research/deep analysis | Highest credits |

### Iteration Warnings

You'll be notified if max iterations is reached:

```
⚠️ Max iterations reached (5/5)
The AI stopped after 5 tool calls. Consider increasing maxIterations
for more complex tasks.

Current answer may be incomplete.

[Increase Limit] [Retry] [Dismiss]
```

---

## UI Preferences

### Show Credits Display

Display credits usage in real-time:

**Settings UI**:
```
AINative > Managed API > Show Credits Display
```

**JSON Settings**:
```json
{
  "ainative.managedAPI.ui.showCreditsDisplay": true
}
```

**Default**: `true`

**What it shows**:
```
┌──────────────────────────────┐
│  Credits: 37,450 / 50,000    │
│  Usage: 25% [████░░░░░░░░]   │
└──────────────────────────────┘
```

### Show Tool Indicators

Show when tools are being used:

**JSON Settings**:
```json
{
  "ainative.managedAPI.ui.showToolIndicators": true
}
```

**Default**: `true`

**What it shows**:
```
AI: Let me analyze this code...

[🔧 Using code_intelligence tool...]

AI: This function has a cyclomatic complexity of 4...
```

### Tool Indicator Style

Customize tool indicator appearance:

**JSON Settings**:
```json
{
  "ainative.managedAPI.ui.toolIndicatorStyle": "detailed"
}
```

**Options**:
- `minimal`: Just an icon (🔧)
- `normal`: Icon + tool name
- `detailed`: Icon + tool name + estimated credits

**Detailed Example**:
```
[🔧 code_intelligence - ~52 credits]
```

### Show Per-Message Cost

Display credit cost for each message:

**JSON Settings**:
```json
{
  "ainative.managedAPI.ui.showPerMessageCost": true
}
```

**Default**: `false`

**What it shows**:
```
User: How do I use async/await?

AI: [Response...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cost: 21.5 credits (450 in, 1200 out)
```

### Credits Warning Style

Choose how credit warnings are displayed:

**JSON Settings**:
```json
{
  "ainative.managedAPI.ui.creditsWarningStyle": "banner"
}
```

**Options**:
- `banner`: Top-of-screen banner (less intrusive)
- `modal`: Pop-up dialog (more noticeable)
- `silent`: No visual warning (only logged)

### Collapse Tool Results

Automatically collapse detailed tool results:

**JSON Settings**:
```json
{
  "ainative.managedAPI.ui.collapseToolResults": true
}
```

**Default**: `true`

**Collapsed view**:
```
[🔧 code_intelligence result] [Expand ▼]
```

**Expanded view**:
```
[🔧 code_intelligence result] [Collapse ▲]

Raw tool output:
{
  "operation": "analyze_complexity",
  "functions": [
    {
      "name": "calculate",
      "complexity": 4,
      ...
    }
  ]
}
```

---

## Advanced Configuration

### Debug Mode

Enable detailed logging for troubleshooting:

**JSON Settings**:
```json
{
  "ainative.managedAPI.debug": true
}
```

**Default**: `false`

**What it logs**:
- API requests and responses
- Token counts
- Credit calculations
- Tool execution details

**Output location**: Developer Console (Help > Toggle Developer Tools > Console)

### Request Timeout

Set timeout for API requests:

**JSON Settings**:
```json
{
  "ainative.managedAPI.requestTimeout": 60000
}
```

**Default**: `60000` (60 seconds)
**Range**: `10000-300000` (10 seconds to 5 minutes)

**When to increase**:
- Large code intelligence requests
- Slow network connection
- Complex multi-tool tasks

### Retry Configuration

Configure automatic retries on failure:

**JSON Settings**:
```json
{
  "ainative.managedAPI.retries.enabled": true,
  "ainative.managedAPI.retries.maxAttempts": 3,
  "ainative.managedAPI.retries.backoffMs": 1000
}
```

**Defaults**:
- `enabled`: `true`
- `maxAttempts`: `3`
- `backoffMs`: `1000` (exponential backoff starting at 1 second)

### Cache Settings

Configure response caching:

**JSON Settings**:
```json
{
  "ainative.managedAPI.cache.enabled": true,
  "ainative.managedAPI.cache.ttl": 3600000
}
```

**Defaults**:
- `enabled`: `true`
- `ttl`: `3600000` (1 hour in milliseconds)

---

## Configuration Examples

### Example 1: Student/Learner Profile

Optimize for learning with low costs:

```json
{
  "ainative.managedAPI.preferredModels.chat": "claude-3-haiku",
  "ainative.managedAPI.preferredModels.codeIntelligence": "llama-3.3-70b-instruct",
  "ainative.managedAPI.preferredModels.webFetch": "gemini-1.5-flash",
  "ainative.managedAPI.maxIterations": 3,
  "ainative.managedAPI.ui.showPerMessageCost": true,
  "ainative.managedAPI.ui.creditsWarningStyle": "banner"
}
```

### Example 2: Professional Developer Profile

Balance quality and cost:

```json
{
  "ainative.managedAPI.preferredModels.chat": "claude-3.5-sonnet",
  "ainative.managedAPI.preferredModels.codeIntelligence": "llama-3.3-70b-instruct",
  "ainative.managedAPI.preferredModels.webFetch": "claude-3-haiku",
  "ainative.managedAPI.maxIterations": 5,
  "ainative.managedAPI.tools.autoExecute": true,
  "ainative.managedAPI.ui.showCreditsDisplay": true,
  "ainative.managedAPI.ui.toolIndicatorStyle": "normal"
}
```

### Example 3: Team Lead/Reviewer Profile

Maximum quality for code review:

```json
{
  "ainative.managedAPI.preferredModels.chat": "claude-3.5-sonnet",
  "ainative.managedAPI.preferredModels.codeIntelligence": "claude-3.5-sonnet",
  "ainative.managedAPI.preferredModels.webFetch": "claude-3.5-sonnet",
  "ainative.managedAPI.maxIterations": 10,
  "ainative.managedAPI.tools.autoExecute": false,
  "ainative.managedAPI.ui.showPerMessageCost": true,
  "ainative.managedAPI.ui.toolIndicatorStyle": "detailed",
  "ainative.managedAPI.debug": true
}
```

### Example 4: Minimal Credits Profile

Absolute minimum usage:

```json
{
  "ainative.managedAPI.preferredModels.chat": "gemini-1.5-flash",
  "ainative.managedAPI.tools.codeIntelligence.enabled": false,
  "ainative.managedAPI.tools.webFetch.enabled": false,
  "ainative.managedAPI.maxIterations": 1,
  "ainative.managedAPI.ui.showCreditsDisplay": true,
  "ainative.managedAPI.ui.creditsWarningStyle": "modal"
}
```

---

## FAQ

**Q: Where are settings stored?**

A: In your VS Code settings:
- **User settings**: `~/.config/Code/User/settings.json` (Linux/macOS)
- **Workspace settings**: `.vscode/settings.json` (project-specific)

**Q: Can I have different settings per project?**

A: Yes! Use workspace settings (`.vscode/settings.json`) to override user settings for specific projects.

**Q: What happens if I set an invalid value?**

A: The setting reverts to default, and you'll see a warning:
```
Invalid value for ainative.managedAPI.maxIterations
Expected: 1-20, Got: 50
Using default: 5
```

**Q: Can I export my settings?**

A: Yes! Copy your `settings.json` file or use the Settings Sync feature (Settings > Turn on Settings Sync).

**Q: How do I reset to defaults?**

A: In settings UI, click the gear icon next to any setting and select "Reset Setting".

**Q: Can I configure settings via command line?**

A: No, but you can edit `settings.json` directly with any text editor.

**Q: Do settings sync across devices?**

A: Yes, if you enable Settings Sync (Settings > Turn on Settings Sync).

**Q: What if my preferred model is deprecated?**

A: You'll receive a notification, and the system will fall back to a similar model until you update your settings.

---

## Related Guides

- [Getting Started](./getting-started.md) - Learn the basics
- [Usage & Credits](./usage-and-credits.md) - Understand how settings affect credit usage
- [Troubleshooting](./troubleshooting.md) - Fix configuration issues
- [Code Intelligence](./code-intelligence.md) - Configure code analysis tools

---

**Having trouble?** Check the [Troubleshooting Guide](./troubleshooting.md) for help with common configuration issues!
