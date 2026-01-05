# Skills Configuration Service

This module provides configuration management for AI skills through the `.mcp.json` file.

## Overview

The Skills Configuration Service enables:
- Reading and writing skills configuration from `.mcp.json`
- Auto-detecting project type and framework
- Recommending appropriate skills based on project metadata
- Validating skills configuration
- Managing enabled skills

## File Structure

```
skills/
├── skillConfigTypes.ts          # Type definitions for skills configuration
├── skillConfigServiceTypes.ts   # Service interface definition
├── skillConfigService.ts        # Service implementation
├── skillsModule.ts             # Service registration
├── README.md                   # This file
└── examples/
    └── example.mcp.json        # Example configuration file
```

## Configuration Schema

### Basic Structure

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  },
  "skills": {
    "enabled": ["git-workflow", "mandatory-tdd"],
    "projectSpecific": ["./local-skills/backend-patterns"],
    "autoLoad": true,
    "metadata": {
      "projectType": "backend",
      "framework": "fastapi",
      "languages": ["python"]
    }
  }
}
```

### Skills Configuration Fields

- **enabled** (required): Array of skill identifiers to enable
- **projectSpecific** (optional): Array of local skill paths relative to workspace root
- **autoLoad** (optional): Boolean to enable auto-loading based on project type
- **metadata** (optional): Project metadata for skill recommendations

### Project Metadata Fields

- **projectType**: One of `frontend`, `backend`, `fullstack`, `mobile`, `data`, `unknown`
- **framework**: Detected framework (e.g., `react`, `fastapi`, `django`)
- **languages**: Array of programming languages (e.g., `["python"]`, `["javascript", "typescript"]`)
- **technologies**: Array of detected technologies

## Usage

### Service Injection

```typescript
import { ISkillConfigService } from './skillConfigServiceTypes';

constructor(
  @ISkillConfigService private readonly skillConfigService: ISkillConfigService
) {}
```

### Reading Configuration

```typescript
const config = await this.skillConfigService.readSkillsConfig();
if (config) {
  console.log('Enabled skills:', config.enabled);
}
```

### Writing Configuration

```typescript
const newConfig: SkillsConfig = {
  enabled: ['git-workflow', 'mandatory-tdd'],
  autoLoad: true
};

// Merge with existing config
await this.skillConfigService.writeSkillsConfig(newConfig, true);

// Replace skills section
await this.skillConfigService.writeSkillsConfig(newConfig, false);
```

### Project Detection

```typescript
const detection = await this.skillConfigService.detectProjectType();
console.log('Project type:', detection.metadata.projectType);
console.log('Framework:', detection.metadata.framework);
console.log('Confidence:', detection.confidence);
console.log('Detected files:', detection.detectedFiles);
```

Example output:
```
Project type: backend
Framework: fastapi
Confidence: 0.7
Detected files: ['requirements.txt', 'pyproject.toml']
```

### Skill Recommendations

```typescript
const metadata: ProjectMetadata = {
  projectType: 'backend',
  framework: 'fastapi',
  languages: ['python']
};

const recommendations = await this.skillConfigService.recommendSkills(metadata);
recommendations.forEach(rec => {
  console.log(`${rec.skillId}: ${rec.reason} (Priority: ${rec.priority})`);
});
```

Example output:
```
@ainative/python-expert: Python backend detected (Priority: 1)
@ainative/fastapi-expert: FastAPI framework detected (Priority: 1)
git-workflow: Essential for version control (Priority: 2)
mandatory-tdd: Testing best practices (Priority: 3)
ci-cd-compliance: Backend deployment standards (Priority: 4)
```

### Initializing Configuration

```typescript
// Check if .mcp.json exists
const hasConfig = await this.skillConfigService.hasMCPConfig();

if (!hasConfig) {
  // Initialize with auto-detected skills
  await this.skillConfigService.initializeMCPConfig(true);
}
```

### Getting Enabled Skills

```typescript
const enabledSkills = await this.skillConfigService.getEnabledSkills();
console.log('Currently enabled:', enabledSkills);
```

### Validating Configuration

```typescript
const config: SkillsConfig = {
  enabled: ['git-workflow'],
  autoLoad: true
};

const errors = this.skillConfigService.validateConfig(config);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

## Project Detection Logic

### Supported Frameworks

**Frontend:**
- React (detects `react` in package.json dependencies)
- Next.js (detects `next` in package.json)
- Vue.js (detects `vue` in package.json)
- Angular (detects `@angular/core` in package.json)

**Backend:**
- FastAPI (detects `fastapi` in requirements.txt)
- Django (detects `django` in requirements.txt)
- Flask (detects `flask` in requirements.txt)
- Express (detects `express` in package.json)
- NestJS (detects `@nestjs/core` in package.json)

**Languages:**
- JavaScript/TypeScript (package.json)
- Python (requirements.txt, pyproject.toml)
- Rust (Cargo.toml)
- Java (pom.xml)
- Go (go.mod)

### Detection Files

The service looks for these files to determine project type:
- `package.json` - Node.js projects
- `requirements.txt` - Python projects
- `pyproject.toml` - Python projects (modern)
- `Cargo.toml` - Rust projects
- `pom.xml` - Java projects
- `go.mod` - Go projects

### Confidence Scoring

Confidence is calculated based on:
- Base file detection: +0.3 (e.g., package.json found)
- Framework detection: +0.4 (e.g., React in dependencies)
- Additional files: +0.1-0.2 per file
- Maximum confidence: 1.0

## Skill Recommendation Mappings

### React Projects
- `@ainative/react-expert` - React framework expertise
- `git-workflow` - Version control best practices
- `mandatory-tdd` - Testing requirements
- `code-quality` - Code quality standards

### FastAPI Projects
- `@ainative/python-expert` - Python expertise
- `@ainative/fastapi-expert` - FastAPI expertise
- `git-workflow` - Version control best practices
- `mandatory-tdd` - Testing requirements
- `ci-cd-compliance` - Deployment standards

### Backend Projects (General)
- `git-workflow` - Version control
- `mandatory-tdd` - Testing
- `ci-cd-compliance` - CI/CD standards
- `database-schema-sync` - Database management

### Frontend Projects (General)
- `git-workflow` - Version control
- `mandatory-tdd` - Testing
- `code-quality` - Code standards

## Error Handling

The service handles errors gracefully:
- Returns `null` if .mcp.json doesn't exist
- Returns empty arrays for missing data
- Throws errors for invalid configuration
- Logs errors to console for debugging

## Integration Example

```typescript
import { ISkillConfigService } from './skillConfigServiceTypes';
import { ProjectMetadata } from './skillConfigTypes';

export class MyFeature {
  constructor(
    @ISkillConfigService private readonly skillConfigService: ISkillConfigService
  ) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Check if configuration exists
    const hasConfig = await this.skillConfigService.hasMCPConfig();

    if (!hasConfig) {
      // Initialize with auto-detected skills
      await this.skillConfigService.initializeMCPConfig(true);
    }

    // Get enabled skills
    const enabledSkills = await this.skillConfigService.getEnabledSkills();
    console.log('Enabled skills:', enabledSkills);

    // Detect project type
    const detection = await this.skillConfigService.detectProjectType();
    console.log('Project:', detection.metadata.framework);

    // Get recommendations
    const recommendations = await this.skillConfigService.recommendSkills(
      detection.metadata
    );
    console.log('Recommended skills:', recommendations.map(r => r.skillId));
  }
}
```

## Testing

Tests are located in:
```
src/vs/workbench/contrib/ainative/test/common/skillConfigService.test.ts
```

Run tests with:
```bash
npm run test-node
```

## See Also

- [MCP (Model Context Protocol) Documentation](https://modelcontextprotocol.io)
- Component 1: Skill Discovery Service
- Component 2: Skill Loading Service
- Component 3: Skill Execution Service
