# Usage Tracking & Credits

Learn how credits work, track your usage, understand costs, and manage quota warnings in AINative Studio's Managed API.

## Table of Contents

1. [How Credits Work](#how-credits-work)
2. [Viewing the Usage Dashboard](#viewing-the-usage-dashboard)
3. [Understanding Credit Costs](#understanding-credit-costs)
4. [Managing Quota Warnings](#managing-quota-warnings)
5. [Exporting Usage Data](#exporting-usage-data)
6. [Best Practices](#best-practices)
7. [FAQ](#faq)

---

## How Credits Work

### Credits System Overview

AINative uses a **credits-based billing system** for all managed API usage:

- **1 Credit** ≈ $0.001 USD (approximately)
- Credits are **consumed** when you use managed models or tools
- Credits **reset monthly** based on your subscription plan
- Unused credits **expire** at the end of each billing cycle

### What Consumes Credits?

| Activity | Credit Cost | Notes |
|----------|-------------|-------|
| **Chat Messages** | Variable | Based on model + tokens |
| **Code Intelligence** | ~10-500 | Based on code size |
| **Web Fetch** | ~50-500 | Based on page size |
| **Streaming Responses** | Variable | Same as non-streaming |
| **Tool Use** | Additional | Added to base message cost |

### How Credits are Calculated

For each API request:

```
Total Credits = (Input Tokens / 1000) × Input Rate + (Output Tokens / 1000) × Output Rate + Tool Cost
```

**Example**:
```
Model: Claude 3.5 Sonnet
Input: 500 tokens
Output: 1,000 tokens
Tool: code_intelligence (100 credits)

Calculation:
- Input credits: (500 / 1000) × 3.0 = 1.5
- Output credits: (1000 / 1000) × 15.0 = 15.0
- Tool credits: 100
- Total: 116.5 credits
```

---

## Viewing the Usage Dashboard

### Opening the Dashboard

**Method 1: Model Browser**

1. Click the **AI Model Browser** icon in the sidebar
2. Click **"View Usage Dashboard"** at the top
3. The usage dashboard opens in a new panel

**Method 2: Command Palette**

1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type "AINative: View Usage Dashboard"
3. Press Enter

**Method 3: Credits Widget**

1. In any chat with a managed model selected
2. Click the **credits display** in the top-right corner
3. Select **"View Detailed Usage"**

### Dashboard Overview

The Usage Dashboard shows:

#### 1. Credits Summary Card

```
┌─────────────────────────────────────────────┐
│         Monthly Credits Summary              │
├─────────────────────────────────────────────┤
│  Plan: Pro                                   │
│  Credits Used: 12,450 / 50,000 (24.9%)      │
│  Credits Remaining: 37,550                   │
│  Reset Date: Feb 1, 2026                     │
│                                              │
│  [████████░░░░░░░░░░░░░] 25%                │
└─────────────────────────────────────────────┘
```

#### 2. Usage by Time Period

Filter usage by:
- **Daily**: Last 24 hours
- **Weekly**: Last 7 days
- **Monthly**: Current billing cycle

**Daily View Example**:
```
Credits Used Today: 1,247
Requests Made: 42
Average Cost per Request: 29.7 credits

Hourly Breakdown:
12 AM - 1 AM:  ▓▓▓░░░░░░░ 87 credits
1 AM - 2 AM:   ░░░░░░░░░░ 0 credits
...
11 PM - 12 AM: ▓▓▓▓▓░░░░░ 156 credits
```

#### 3. Usage by Model

```
┌─────────────────────────────────────────────────┐
│  Model               │ Requests │  Credits      │
├──────────────────────┼──────────┼───────────────┤
│ Claude 3.5 Sonnet    │    342   │  8,934 (72%)  │
│ Llama 3.3 70B        │    156   │  2,156 (17%)  │
│ Claude 3 Haiku       │     89   │    892 (7%)   │
│ GPT-4o               │     23   │    468 (4%)   │
└─────────────────────────────────────────────────┘
```

#### 4. Usage by Feature

```
Feature          │ Credits Used │ Percentage
─────────────────┼──────────────┼───────────
Chat             │    9,245     │   74%
Code Intelligence│    2,134     │   17%
Web Fetch        │    1,071     │    9%
```

#### 5. Daily Usage Chart

Visual chart showing credits used per day for the last 30 days:

```
Credits
  1500 │     ▄█▄
       │    ▄█ █
  1000 │   ▄█  █▄
       │  ▄█   ██
   500 │ ▄█    ██▄
       │ █     ███
     0 └─────────────────────────────────
       1  5  10  15  20  25  30 (Days)
```

---

## Understanding Credit Costs

### Credit Costs by Model

Current rates (subject to change):

#### Premium Models (Highest Quality)

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|----------------------|
| **GPT-4o** | 2.5 credits | 10.0 credits |
| **Claude 3.5 Sonnet** | 3.0 credits | 15.0 credits |
| **Claude 3 Opus** | 15.0 credits | 75.0 credits |

#### Mid-Tier Models (Balanced)

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|----------------------|
| **GPT-4o Mini** | 0.15 credits | 0.6 credits |
| **Claude 3.5 Haiku** | 0.8 credits | 4.0 credits |
| **Gemini 1.5 Pro** | 1.25 credits | 5.0 credits |

#### Budget Models (Fast & Cheap)

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|----------------------|
| **Claude 3 Haiku** | 0.25 credits | 1.25 credits |
| **Llama 3.3 70B** | 0.5 credits | 0.5 credits |
| **Gemini 1.5 Flash** | 0.1 credits | 0.3 credits |

### Tool Costs

| Tool | Base Cost | Variable Cost |
|------|-----------|---------------|
| **code_intelligence** | 50 credits | +0.5 per 100 lines |
| **web_fetch** | 25 credits | +0.1 per KB fetched |

**Example Code Intelligence Costs**:
- Small snippet (50 lines): 50 + (50/100 × 0.5) = 50.25 credits
- Medium file (300 lines): 50 + (300/100 × 0.5) = 51.5 credits
- Large file (1000 lines): 50 + (1000/100 × 0.5) = 55.0 credits

### Real-World Usage Examples

#### Example 1: Simple Chat

```
User: Explain what async/await is in Python

Model: Claude 3 Haiku
Input tokens: 23
Output tokens: 450

Cost:
- Input: (23 / 1000) × 0.25 = 0.006 credits
- Output: (450 / 1000) × 1.25 = 0.563 credits
Total: 0.569 credits
```

#### Example 2: Code Review with Intelligence

```
User: Review this code for complexity issues:
[200 lines of Python code]

Model: Claude 3.5 Sonnet
Input tokens: 1,200
Output tokens: 800
Tools: code_intelligence (200 lines)

Cost:
- Input: (1200 / 1000) × 3.0 = 3.6 credits
- Output: (800 / 1000) × 15.0 = 12.0 credits
- Tool: 50 + (200/100 × 0.5) = 51.0 credits
Total: 66.6 credits
```

#### Example 3: Documentation-Assisted Answer

```
User: How do I use FastAPI's dependency injection?

Model: Claude 3.5 Sonnet
Input tokens: 30
Output tokens: 1,500
Tools: web_fetch (FastAPI docs, 15 KB)

Cost:
- Input: (30 / 1000) × 3.0 = 0.09 credits
- Output: (1500 / 1000) × 15.0 = 22.5 credits
- Tool: 25 + (15 × 0.1) = 26.5 credits
Total: 49.09 credits
```

---

## Managing Quota Warnings

### Warning Levels

AINative provides three warning levels:

#### 1. Info Warning (50% Usage)

```
┌────────────────────────────────────────────┐
│  ℹ️  Credit Usage: 50%                      │
│  You've used 25,000 of 50,000 credits      │
│  this month.                               │
│  [Dismiss]                                 │
└────────────────────────────────────────────┘
```

**What to do**: Continue normal usage, monitor your dashboard.

#### 2. Warning (80% Usage)

```
┌────────────────────────────────────────────┐
│  ⚠️  Credit Usage: 80%                      │
│  You've used 40,000 of 50,000 credits      │
│  this month. Consider upgrading your plan. │
│  [View Plans] [Dismiss]                    │
└────────────────────────────────────────────┘
```

**What to do**:
- Review your usage in the dashboard
- Consider upgrading if this is normal usage
- Optimize usage by using cheaper models for simple tasks

#### 3. Critical (95% Usage)

```
┌────────────────────────────────────────────┐
│  🚨 Critical: Credit Usage: 95%            │
│  You've used 47,500 of 50,000 credits      │
│  this month. Service may be interrupted.   │
│  [Upgrade Now] [Buy Credits]               │
└────────────────────────────────────────────┘
```

**What to do**:
- **Immediate action required**
- Upgrade plan or purchase additional credits
- Service will pause at 100% usage

### Configuring Warnings

You can customize warning thresholds:

1. Open **Settings** (Cmd/Ctrl + ,)
2. Search for "AINative Managed API"
3. Find **"Credit Warning Threshold"**
4. Set your preferred percentage (default: 80%)

**Example**:
```json
{
  "ainative.managedAPI.creditWarningThreshold": 75
}
```

This will trigger warnings at 75% instead of 80%.

### Disabling Warnings

To disable quota warnings (not recommended):

```json
{
  "ainative.managedAPI.showQuotaWarnings": false
}
```

---

## Exporting Usage Data

### Export Formats

You can export your usage data in multiple formats:

1. **CSV**: For spreadsheet analysis
2. **JSON**: For programmatic processing
3. **PDF**: For reports and documentation

### How to Export

**From Usage Dashboard**:

1. Open the Usage Dashboard
2. Click **"Export Usage Data"** button
3. Select date range:
   - Last 7 days
   - Last 30 days
   - Current month
   - Custom range
4. Choose export format (CSV, JSON, or PDF)
5. Click **"Export"**
6. File is saved to your Downloads folder

### CSV Export Example

```csv
Date,Time,Model,Input Tokens,Output Tokens,Credits Used,Feature,Tool Used
2026-01-08,09:23:45,Claude 3.5 Sonnet,450,1200,21.5,Chat,None
2026-01-08,09:45:12,Claude 3 Haiku,1200,800,2.25,Chat,code_intelligence
2026-01-08,10:15:33,Llama 3.3 70B,300,500,0.4,Chat,None
...
```

### JSON Export Example

```json
{
  "export_date": "2026-01-08T10:30:00Z",
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-08T10:30:00Z"
  },
  "summary": {
    "total_credits": 12450,
    "total_requests": 342,
    "average_credits_per_request": 36.4
  },
  "usage": [
    {
      "timestamp": "2026-01-08T09:23:45Z",
      "model": "claude-3.5-sonnet",
      "input_tokens": 450,
      "output_tokens": 1200,
      "credits": 21.5,
      "feature": "chat",
      "tool": null
    },
    ...
  ]
}
```

### PDF Report Example

The PDF export includes:
- Cover page with summary statistics
- Charts showing usage trends
- Tables with detailed breakdowns
- Cost analysis by model and feature

---

## Best Practices

### 1. Choose the Right Model for the Task

Don't always use the most expensive model:

| Task Type | Recommended Model | Reason |
|-----------|------------------|---------|
| Simple Q&A | Claude 3 Haiku | Fast and cheap |
| Code generation | Llama 3.3 70B | Good balance |
| Complex reasoning | Claude 3.5 Sonnet | Best quality |
| Quick edits | Gemini 1.5 Flash | Fastest, cheapest |

### 2. Monitor Daily Usage

- Check the dashboard **weekly**
- Set a mental budget (e.g., 2,000 credits/day for a 50,000 credit plan)
- Adjust usage if you're ahead of budget

### 3. Optimize Tool Usage

- **Code Intelligence**: Only analyze when needed, not for every snippet
- **Web Fetch**: Cache is your friend - ask follow-up questions instead of re-fetching

### 4. Use Streaming Wisely

Streaming doesn't cost more, but:
- You can't cancel mid-stream (full cost is charged)
- For long outputs, consider non-streaming to preview length first

### 5. Plan Upgrades

If you consistently hit 80%+ usage:
- **Don't wait** until you run out
- **Upgrade proactively** to avoid service interruption
- Consider **annual plans** for discounts

---

## FAQ

**Q: What happens if I run out of credits?**

A: Your access to managed models pauses until:
- Your credits reset (monthly)
- You upgrade your plan
- You purchase additional credits

**Q: Do credits roll over to the next month?**

A: No. Unused credits expire at the end of each billing cycle.

**Q: Can I purchase additional credits mid-month?**

A: Yes! You can buy credit packs:
- 5,000 credits: $5
- 10,000 credits: $9 (10% discount)
- 25,000 credits: $20 (20% discount)

**Q: How accurate is the usage dashboard?**

A: Very accurate. Data syncs every 5 minutes and is stored locally with cloud backup.

**Q: Can I set spending limits?**

A: Not currently, but you can set warning thresholds to alert you before you run out.

**Q: What if there's a billing error?**

A: Contact support@ainative.studio with:
- Your account email
- Date/time of the issue
- Screenshot of the dashboard
- Description of the error

**Q: Do free tier users get usage tracking?**

A: Yes! All users have access to the usage dashboard regardless of plan.

**Q: Can I export historical data from past months?**

A: Yes. Use the custom date range option when exporting.

**Q: Are there any hidden fees?**

A: No. The only costs are:
- Your subscription plan
- Any additional credit purchases
- No setup fees, no transaction fees

**Q: How do I downgrade my plan?**

A: Visit [app.ainative.studio/billing](https://app.ainative.studio/billing) and select a lower tier. Downgrades take effect at the next billing cycle.

---

## Related Guides

- [Getting Started](./getting-started.md) - Set up your account and understand credits
- [Settings](./settings.md) - Configure credit warnings and preferences
- [Troubleshooting](./troubleshooting.md) - Fix credit-related issues
- [Code Intelligence](./code-intelligence.md) - Understand tool costs

---

**Need help configuring your settings?** Check out the [Settings & Configuration Guide](./settings.md)!
