---
name: test-special-chars
description: "Skill with special characters: @#$%^&*()_+-={}[]|\\:;<>?,./"
version: 1.0.0
author: AINative Studio QA Team
tags: [testing, special-characters, edge-case]
dependencies: []
---

# Special Characters Test

This skill contains various special characters to validate parsing:

## Markdown Special Characters

- Asterisks: *italic* **bold** ***bold-italic***
- Underscores: _italic_ __bold__ ___bold-italic___
- Backticks: `code` ```code block```
- Brackets: [link](url) ![image](url)
- Angle brackets: <html> </html>
- Pipes: | table | cell |

## Code Examples

```javascript
const special = "@#$%^&*()_+-={}[]|\\:;<>?,./";
const regex = /[.*+?^${}()|[\]\\]/g;
```

## Edge Cases

- Backslashes: \\ \n \t \r
- Quotes: "double" 'single' \`backtick\`
- Math symbols: ± × ÷ ≈ ≠ ≤ ≥
- Currency: $ € £ ¥ ₹
