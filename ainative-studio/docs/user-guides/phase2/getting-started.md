# Getting Started with AINative Managed API

Welcome to AINative Studio's Managed API! This guide will help you get started with using cloud-powered AI features that are managed and maintained by AINative.

## Table of Contents

1. [What is the Managed API?](#what-is-the-managed-api)
2. [Setting Up Your Account](#setting-up-your-account)
3. [Authentication](#authentication)
4. [Basic Chat Usage](#basic-chat-usage)
5. [Credits System Overview](#credits-system-overview)
6. [Next Steps](#next-steps)

---

## What is the Managed API?

The AINative Managed API is a cloud-based AI service that provides:

- **Pre-configured AI Models**: Access to powerful AI models without needing API keys
- **Automatic Tool Integration**: Built-in code intelligence and documentation fetching
- **Usage Tracking**: Monitor your AI usage and costs in real-time
- **Credits-based Billing**: Simple, predictable pricing model

### Key Benefits

- **No API Key Management**: We handle all the provider API keys
- **Optimized Routing**: Automatically use the best model for your task
- **Enhanced Tools**: Access to specialized tools like code analysis and web documentation
- **Unified Billing**: One credits system instead of multiple provider accounts

---

## Setting Up Your Account

### 1. Create an AINative Cloud Account

1. Open AINative Studio IDE
2. Navigate to **View > Command Palette** (Cmd/Ctrl + Shift + P)
3. Type "AINative: Sign Up" and press Enter
4. Fill in your registration details:
   - **Email**: Your email address (required for verification)
   - **Username**: Unique username for your account
   - **Name**: Your full name
   - **Password**: Minimum 8 characters

5. Click **Sign Up**
6. Check your email for a verification link (if required)

### 2. Verify Your Email

After registration, you may need to verify your email:

1. Check your inbox for an email from AINative Studio
2. Click the verification link in the email
3. Return to AINative Studio IDE

Your account is now ready to use!

---

## Authentication

### Logging In

**Method 1: Command Palette**

1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type "AINative: Login"
3. Enter your email and password
4. Click **Login**

**Method 2: Model Browser**

1. Open the AI Model Browser sidebar
2. Click **Login to AINative Cloud**
3. Enter your credentials
4. Click **Login**

### Session Management

Once logged in:

- Your session is **automatically saved** and persists across restarts
- Tokens are **encrypted** for security
- Sessions **auto-refresh** when expired
- You remain logged in until you explicitly logout

### Logging Out

1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type "AINative: Logout"
3. Confirm logout

**Note**: Logging out will clear all cached usage data and require re-authentication.

---

## Basic Chat Usage

### Starting a Chat

1. **Open the Chat Panel**:
   - Click the AI icon in the sidebar, or
   - Press Cmd/Ctrl + L (default shortcut)

2. **Select a Managed Model**:
   - In the model dropdown, look for models marked with **"(Managed)"**
   - Example: `Claude 3.5 Sonnet (Managed)`

3. **Type Your Message**:
   - Enter your question or request
   - Press Enter or click Send

### Example Chat Interactions

#### Simple Code Question

```
User: How do I sort a list in Python?

AI: You can sort a list in Python using the built-in sorted() function or
    the list.sort() method:

    # Using sorted() - returns a new sorted list
    numbers = [3, 1, 4, 1, 5]
    sorted_numbers = sorted(numbers)

    # Using sort() - sorts in place
    numbers.sort()
```

#### Code Analysis Request

```
User: Analyze the complexity of this function:
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

AI: This function has exponential time complexity O(2^n) due to
    redundant recursive calls. Each call branches into two more calls,
    creating a binary tree of computations.

    Complexity metrics:
    - Cyclomatic complexity: 2 (one decision point)
    - Performance: Poor for large n
    - Recommendation: Use memoization or dynamic programming
```

### Credits Usage

Each chat message consumes credits based on:

- **Model selected**: More powerful models cost more credits
- **Message length**: Longer inputs/outputs use more tokens
- **Tool usage**: Using code intelligence or web fetch adds credits

You can view your credit usage:
- In the **Credits Display** (top-right of chat panel)
- In the **Usage Dashboard** (see [Usage Tracking & Credits](./usage-and-credits.md))

---

## Credits System Overview

### How Credits Work

AINative uses a credits-based system for all managed API usage:

1. **Credits are purchased** through subscription plans or pay-as-you-go
2. **Credits are consumed** when you use managed models or tools
3. **Credits reset** monthly based on your plan tier

### Plan Tiers

| Tier | Monthly Credits | Cost | Best For |
|------|----------------|------|----------|
| **Free** | 1,000 | $0/month | Trial and light usage |
| **Starter** | 10,000 | $10/month | Individual developers |
| **Pro** | 50,000 | $40/month | Professional developers |
| **Team** | 200,000 | $150/month | Small teams |
| **Enterprise** | Custom | Custom | Large organizations |

### Credit Costs by Model

Approximate credit costs per 1,000 tokens:

| Model | Input Credits | Output Credits |
|-------|---------------|----------------|
| GPT-4o | 2.5 | 10.0 |
| Claude 3.5 Sonnet | 3.0 | 15.0 |
| Claude 3 Haiku | 0.25 | 1.25 |
| Llama 3.3 70B | 0.5 | 0.5 |
| Gemini 1.5 Flash | 0.1 | 0.3 |

**Note**: Costs are subject to change. Check the [Usage Dashboard](./usage-and-credits.md) for current rates.

### Monitoring Your Credits

You can check your remaining credits:

1. **Credits Display Widget**: Top-right corner of chat panel
   - Shows remaining credits
   - Shows percentage used
   - Warns when running low (< 20%)

2. **Usage Dashboard**: Detailed view of all usage
   - Click **View Usage** in the model browser
   - See daily/weekly/monthly breakdowns
   - Track costs by model

### What Happens When You Run Out?

When credits are depleted:

1. **Warning notifications** appear when you reach 80% usage
2. **Critical warnings** at 95% usage
3. **Service pauses** at 100% usage
4. You can **upgrade your plan** or **purchase additional credits**

---

## Next Steps

Now that you're set up, explore these advanced features:

### Code Intelligence
Learn how to analyze code, find references, and get function signatures automatically.

[Read the Code Intelligence Guide](./code-intelligence.md)

### Documentation Fetching
Fetch documentation from trusted sources directly in your chat.

[Read the Web Fetch Guide](./web-fetch.md)

### Settings & Configuration
Customize your managed API experience with advanced settings.

[Read the Settings Guide](./settings.md)

### Troubleshooting
Having issues? Check our troubleshooting guide.

[Read the Troubleshooting Guide](./troubleshooting.md)

---

## Quick Reference

### Common Commands

| Action | Command Palette | Shortcut |
|--------|----------------|----------|
| Open Chat | `AINative: Open Chat` | Cmd/Ctrl + L |
| Login | `AINative: Login` | - |
| Logout | `AINative: Logout` | - |
| View Usage | `AINative: View Usage Dashboard` | - |
| Browse Models | `AINative: Browse Models` | - |

### Support

- **Documentation**: [docs.ainative.studio](https://docs.ainative.studio)
- **Community**: [community.ainative.studio](https://community.ainative.studio)
- **Support Email**: support@ainative.studio
- **GitHub Issues**: [github.com/ainative-studio/issues](https://github.com/ainative-studio/issues)

---

## FAQ

**Q: Do I need my own API keys?**

A: No! The Managed API handles all provider API keys. You only need your AINative account.

**Q: Can I use both managed models and my own API keys?**

A: Yes! You can configure your own provider API keys for non-managed usage alongside the managed API.

**Q: Are my conversations private?**

A: Yes. All communications are encrypted, and we do not train models on your data. See our [Privacy Policy](https://ainative.studio/privacy) for details.

**Q: What happens to my credits at the end of the month?**

A: Unused credits expire at the end of each billing cycle. Credits do not roll over.

**Q: Can I get a refund for unused credits?**

A: Credits are non-refundable, but you can cancel your subscription at any time.

**Q: How do I upgrade my plan?**

A: Visit [app.ainative.studio/billing](https://app.ainative.studio/billing) or contact sales@ainative.studio for enterprise plans.

---

**Ready to dive deeper?** Check out our [Code Intelligence Guide](./code-intelligence.md) to unlock powerful code analysis features!