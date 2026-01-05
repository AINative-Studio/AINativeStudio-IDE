# AINative Official Skills

Official skill packages for AINative Studio IDE, published to NPM under the `@ainative` organization.

## Overview

This directory contains 5 production-ready skills that can be installed via NPM and used with AINative Studio IDE or other AI development tools that support the agentskills.io specification.

## Available Skills

### 1. ZeroDB Workflows
**Package**: `@ainative/skill-zerodb-workflows`

Vector database best practices, semantic search patterns, RLHF workflows, and AI memory management.

```bash
npm install @ainative/skill-zerodb-workflows
```

**Use Cases**:
- Vector search and embeddings
- AI agent memory systems
- RLHF feedback collection
- Semantic similarity queries
- RAG implementations

**License**: Apache-2.0

---

### 2. MCP Development
**Package**: `@ainative/skill-mcp-development`

Model Context Protocol server development patterns extending Anthropic's mcp-builder with AINative conventions.

```bash
npm install @ainative/skill-mcp-development
```

**Use Cases**:
- Building MCP servers
- Tool-based AI systems
- ZeroDB integration patterns
- MCP server testing
- Tool naming conventions

**License**: MIT

---

### 3. API Design
**Package**: `@ainative/skill-api-design`

FastAPI best practices, Pydantic models, RESTful endpoint design, and authentication patterns.

```bash
npm install @ainative/skill-api-design
```

**Use Cases**:
- Designing REST APIs
- FastAPI application structure
- Pydantic validation
- JWT authentication
- Error handling patterns

**License**: MIT

---

### 4. Testing Patterns
**Package**: `@ainative/skill-testing-patterns`

TDD/BDD workflows for FastAPI + React stack with pytest, vitest, and integration testing.

```bash
npm install @ainative/skill-testing-patterns
```

**Use Cases**:
- Test-driven development
- Pytest configuration
- Vitest setup
- Integration testing
- Mock patterns and fixtures

**License**: MIT

---

### 5. Railway Deployment
**Package**: `@ainative/skill-railway-deployment`

Railway deployment workflows, nixpacks configuration, environment management, and production troubleshooting.

```bash
npm install @ainative/skill-railway-deployment
```

**Use Cases**:
- Deploying to Railway
- Nixpacks configuration
- Environment variable management
- Production troubleshooting
- Deployment automation

**License**: MIT

---

## Installation

Install all skills at once:

```bash
npm install \
  @ainative/skill-zerodb-workflows \
  @ainative/skill-mcp-development \
  @ainative/skill-api-design \
  @ainative/skill-testing-patterns \
  @ainative/skill-railway-deployment
```

Or install individually as needed:

```bash
npm install @ainative/skill-<name>
```

## Usage

Each skill package contains:
- `SKILL.md` - Main documentation following agentskills.io spec
- `README.md` - Package overview
- `references/` - Additional reference documentation

After installation, access the skill documentation:

```javascript
// Node.js
const skillPath = require.resolve('@ainative/skill-api-design/SKILL.md');
console.log(skillPath);

// Read the skill content
const fs = require('fs');
const skillContent = fs.readFileSync(skillPath, 'utf8');
```

## Publishing Documentation

For maintainers and contributors:

- **Quick Start**: See [QUICK_START.md](./QUICK_START.md) for common publishing tasks
- **Full Guide**: See [PUBLISHING.md](./PUBLISHING.md) for comprehensive documentation
- **Status**: See [NPM_PUBLISHING_STATUS.md](./NPM_PUBLISHING_STATUS.md) for current status

## Development

### Testing Locally

Test all skills before publishing:

```bash
cd skills/
./publish-local.sh
```

Test a specific skill:

```bash
./publish-local.sh api-design
```

### Publishing

**Recommended**: Use GitHub Actions workflow
1. Go to Actions → "Publish Official Skills to NPM"
2. Run workflow with desired options
3. Dry-run first (`dry_run: true`), then production (`dry_run: false`)

**Alternative**: Manual publishing
```bash
npm login
cd skills/<skill-name>
npm publish --access public
```

### Version Updates

1. Edit `package.json` in the skill directory
2. Update `version` field (follow semantic versioning)
3. Commit changes
4. Create tag: `git tag skills/v1.1.0`
5. Push tag: `git push origin skills/v1.1.0`

## Package Structure

Each skill follows this structure:

```
skills/<skill-name>/
├── package.json          # NPM package metadata
├── SKILL.md             # Main skill documentation (agentskills.io spec)
├── README.md            # Package README
└── references/          # Reference documentation
    ├── reference-1.md
    ├── reference-2.md
    └── ...
```

## Package Metadata

All packages follow these conventions:

- **Naming**: `@ainative/skill-<name>`
- **Version**: Semantic versioning (currently 1.0.0)
- **Access**: Public
- **License**: MIT or Apache-2.0
- **Repository**: https://github.com/AINative-Studio/ainative-skills
- **Organization**: @ainative on NPM

## Quality Standards

All skills are:
- ✅ Validated with automated testing
- ✅ Following agentskills.io specification
- ✅ Documented with examples
- ✅ Version controlled with git
- ✅ Published to NPM registry
- ✅ Open source (MIT/Apache-2.0)

## Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `./publish-local.sh`
5. Submit a pull request

For new skills or major changes, please open an issue first to discuss.

## Support

- **Issues**: https://github.com/AINative-Studio/ainative-skills/issues
- **NPM Organization**: https://www.npmjs.com/org/ainative
- **Documentation**: See [PUBLISHING.md](./PUBLISHING.md)

## Status

**Current Version**: 1.0.0 (all skills)
**Status**: ✅ Production Ready
**Last Updated**: January 4, 2026

All 5 skills are validated and ready for NPM publishing.

## Resources

### Documentation
- [QUICK_START.md](./QUICK_START.md) - Quick reference for common tasks
- [PUBLISHING.md](./PUBLISHING.md) - Comprehensive publishing guide
- [NPM_PUBLISHING_STATUS.md](./NPM_PUBLISHING_STATUS.md) - Detailed status report

### External Links
- [agentskills.io](https://agentskills.io/) - Skill specification
- [NPM @ainative](https://www.npmjs.com/org/ainative) - NPM organization
- [GitHub Repository](https://github.com/AINative-Studio/AINativeStudio-IDE) - Source code

## License

- **ZeroDB Workflows**: Apache-2.0
- **Other Skills**: MIT

See individual package directories for full license texts.

---

**AINative Studio** - AI-Powered Development Tools
