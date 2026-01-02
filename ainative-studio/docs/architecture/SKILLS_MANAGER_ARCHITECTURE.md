# Skills Manager System Architecture

**Document Version**: 1.0
**Date**: 2026-01-02
**Status**: Design Phase
**Related Issues**: #54, #55, #56, #57, #58

---

## Executive Summary

The Skills Manager is a comprehensive system that enables users to install, manage, and execute custom skills (reusable prompts/workflows) in AINative Studio IDE. This architecture defines a five-phase implementation that transforms the current static `.claude/skills/` directory into a dynamic, extensible marketplace-driven system.

### Key Decisions

1. **File Format**: Maintain existing YAML frontmatter + Markdown format for compatibility
2. **Storage**: Local-first with optional cloud sync via AINative Cloud
3. **Registry Model**: Three-tier marketplace (Official, Anthropic, Community)
4. **Integration Point**: Extend existing chat slash command system
5. **Service Architecture**: New `ISkillsManagerService` following VS Code's DI pattern

### Success Metrics

- 100% backward compatibility with existing skills
- < 500ms skill load time
- > 95% skill discovery success rate
- Zero breaking changes to current workflows

---

## 1. Requirements Analysis

### 1.1 Functional Requirements

**Core Capabilities:**
- FR1: Load and parse skills from `.claude/skills/` directory
- FR2: Execute skills via slash commands (`/skill-name`)
- FR3: List all available skills with metadata
- FR4: Install skills from remote registries
- FR5: Create new skills from templates
- FR6: Remove installed skills
- FR7: Update skills to latest versions
- FR8: Search marketplace for skills
- FR9: Validate skill format and dependencies

**User Workflows:**
- Users can discover skills via `/skill list` command
- Users can install official skills via `/skill install @ainative/skill-name`
- Users can create custom skills via `/skill create my-skill`
- Users can share skills by publishing to community registry
- Users can update all skills via `/skill update --all`

### 1.2 Non-Functional Requirements

**Performance:**
- NFR1: Skill loading must complete in < 500ms
- NFR2: Marketplace search must return results in < 2s
- NFR3: Skill execution must have < 100ms overhead

**Scalability:**
- NFR4: Support 1000+ skills in registry
- NFR5: Handle 100+ installed skills per workspace
- NFR6: Support concurrent skill executions

**Reliability:**
- NFR7: 99.9% uptime for official registry
- NFR8: Graceful degradation when offline
- NFR9: Automatic rollback on failed updates

**Security:**
- NFR10: No arbitrary code execution in skills
- NFR11: Sandboxed skill execution
- NFR12: Signed packages from official registry
- NFR13: User consent for network access

**Maintainability:**
- NFR14: Clear separation of concerns
- NFR15: Comprehensive test coverage (80%+)
- NFR16: Extensive documentation
- NFR17: Backward compatibility guarantee

### 1.3 Integration Requirements

- INT1: Integrate with existing chat slash command system
- INT2: Integrate with AINative Cloud for sync
- INT3: Integrate with GitHub for community registry
- INT4: Integrate with telemetry for usage tracking
- INT5: Integrate with settings service for configuration

### 1.4 Data Requirements

**Skill Metadata:**
- Name, description, version
- Author, license, repository
- Dependencies, tags, categories
- Usage examples, documentation links
- Installation count, ratings

**Registry Index:**
- Skill catalog with search index
- Version history and changelog
- Package checksums and signatures
- Download statistics

---

## 2. Existing Skills Analysis

### 2.1 Current Skill Structure

The existing skills follow a consistent pattern:

```
.claude/skills/
├── git-workflow/
│   ├── skill.md              # Main skill definition (YAML frontmatter + Markdown)
│   └── references/           # Supporting documentation
│       ├── ai-attribution-enforcement.md
│       ├── branch-conventions.md
│       └── pr-templates.md
├── mandatory-tdd/
│   ├── skill.md
│   └── references/
│       ├── bdd-patterns.md
│       ├── coverage-requirements.md
├── file-placement/
│   ├── skill.md
│   └── references/
│       └── directory-mapping.md
├── code-quality/
│   ├── skill.md
│   └── references/
│       ├── coding-style.md
│       ├── security-checklist.md
│       └── accessibility-standards.md
├── story-workflow/
│   ├── skill.md
│   └── references/
│       ├── estimation-guide.md
│       ├── story-templates.md
│       └── shortcut-integration.md
├── ci-cd-compliance/
│   ├── skill.md
│   └── references/
├── database-schema-sync/
│   ├── skill.md
│   └── references/
└── delivery-checklist/
    ├── skill.md
    └── references/
```

### 2.2 Skill File Format (skill.md)

```yaml
---
name: git-workflow
description: Git commit, PR, and branching standards with ZERO TOLERANCE for AI attribution. Use when (1) Creating commits, (2) Writing commit messages, (3) Creating pull requests, (4) Writing PR descriptions, (5) Branching or merging code. ABSOLUTE RULE - NEVER include "Claude", "Anthropic", "AI-generated", emojis with "Generated with", or any AI tool attribution in commits, PRs, issues, or documentation.
---

# Git & PR Workflow Standards

## Core Principles

* **Small PRs:** ≤300 LOC changed ideally
* **Commit often:** Early, meaningful commits with clear messages
...
```

**Format Specification:**
- YAML frontmatter with `name` and `description` fields
- Markdown body with skill instructions
- Optional `references/` directory for supporting docs
- Description includes "Use when..." trigger conditions

### 2.3 Current Skills Inventory

| Skill Name | Category | Purpose | References |
|------------|----------|---------|------------|
| git-workflow | Development | Git/PR standards, no AI attribution | 3 files |
| mandatory-tdd | Testing | TDD/BDD enforcement, coverage requirements | 2 files |
| file-placement | Organization | Documentation and script placement rules | 1 file |
| code-quality | Development | Coding standards, security, accessibility | 3 files |
| story-workflow | Project Management | Story estimation, backlog management | 3 files |
| ci-cd-compliance | DevOps | CI/CD pipeline requirements | varies |
| database-schema-sync | Database | Schema sync vs migrations | varies |
| delivery-checklist | Quality Assurance | Pre-delivery acceptance criteria | varies |

### 2.4 Patterns Identified

**Common Patterns:**
1. **Zero Tolerance Rules**: Absolute requirements (git-workflow, mandatory-tdd, file-placement)
2. **Workflow Enforcement**: Step-by-step process guides (story-workflow, database-schema-sync)
3. **Quality Gates**: Checklists and standards (code-quality, delivery-checklist)
4. **Integration Points**: External system integration (story-workflow with Shortcut)

**Triggering Conditions:**
- All skills specify "Use when..." conditions in description
- Conditions are numbered and specific
- Examples: "(1) Creating commits, (2) Writing commit messages, (3) Creating pull requests"

**Reference Structure:**
- Common pattern: `references/` subfolder with related guides
- Reference files are plain Markdown
- Main skill.md references these files explicitly

---

## 3. Proposed Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      AINative Studio IDE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Chat Interface (Slash Commands)              │  │
│  │  /skill list  /skill install  /skill create  /git-workflow│ │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │          ISkillsManagerService (Core Service)            │  │
│  │  ┌────────────┬────────────┬──────────────────────────┐  │  │
│  │  │  Loader    │  Registry  │  Executor   │  Validator │  │  │
│  │  └────────────┴────────────┴──────────────────────────┘  │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│  ┌────────────────────┴─────────────────────────────────────┐  │
│  │              ISkillStorageService                        │  │
│  │  Local FS (.claude/skills/)  ←→  Cloud Sync (optional)  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                       │                                         │
│  ┌────────────────────┴─────────────────────────────────────┐  │
│  │          ISkillMarketplaceService                        │  │
│  │  ┌──────────┬──────────────┬───────────────────────────┐ │  │
│  │  │ Official │  Anthropic   │  Community (GitHub)       │ │  │
│  │  │ Registry │  Registry    │  Registry                 │ │  │
│  │  └──────────┴──────────────┴───────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Architecture

#### 3.2.1 ISkillsManagerService (Core Orchestrator)

**Location**: `ainative-studio/src/vs/workbench/contrib/ainative/common/skillsManagerService.ts`

**Responsibilities:**
- Coordinate all skill operations
- Maintain skill registry (in-memory cache)
- Handle skill lifecycle (install, update, remove)
- Emit events for skill changes
- Validate skill integrity

**Interface:**
```typescript
export interface ISkill {
    // Metadata
    name: string;
    displayName: string;
    description: string;
    version: string;

    // Content
    content: string;              // Full Markdown content
    frontmatter: SkillFrontmatter; // Parsed YAML

    // Source
    source: 'local' | 'official' | 'anthropic' | 'community';
    registry?: string;            // Registry URL if remote

    // File structure
    path: string;                 // Absolute path to skill.md
    referencesPath?: string;      // Path to references/ dir if exists

    // Metadata
    author?: string;
    license?: string;
    tags?: string[];
    dependencies?: string[];      // Other skill names

    // Usage
    triggers?: string[];          // "Use when..." conditions
    examples?: string[];

    // Registry info (if installed from marketplace)
    installedAt?: Date;
    updatedAt?: Date;
    installedVersion?: string;
    latestVersion?: string;
}

export interface SkillFrontmatter {
    name: string;
    description: string;
    version?: string;
    author?: string;
    license?: string;
    tags?: string[];
    dependencies?: string[];
    category?: string;
}

export interface IMarketplaceSkill extends ISkill {
    downloadCount: number;
    rating?: number;
    ratingCount?: number;
    repository?: string;
    homepage?: string;
    changelog?: string;
}

export const IAINativeSkillsManagerService = createDecorator<IAINativeSkillsManagerService>('ainativeSkillsManagerService');

export interface IAINativeSkillsManagerService {
    readonly _serviceBrand: undefined;

    // State
    readonly skills: ReadonlyMap<string, ISkill>;
    readonly isLoaded: boolean;
    readonly waitForLoad: Promise<void>;

    // Events
    readonly onDidChangeSkills: Event<void>;
    readonly onDidInstallSkill: Event<ISkill>;
    readonly onDidRemoveSkill: Event<string>;
    readonly onDidUpdateSkill: Event<ISkill>;

    // Core operations
    loadSkills(): Promise<void>;
    reloadSkills(): Promise<void>;
    getSkill(name: string): ISkill | undefined;
    getSkills(): ISkill[];
    hasSkill(name: string): boolean;

    // Marketplace operations
    searchMarketplace(query: string, options?: SearchOptions): Promise<IMarketplaceSkill[]>;
    getMarketplaceSkill(name: string, registry?: RegistryType): Promise<IMarketplaceSkill | undefined>;

    // Installation
    installSkill(name: string, options?: InstallOptions): Promise<ISkill>;
    installSkillFromUrl(url: string): Promise<ISkill>;
    installSkillFromFile(filePath: string): Promise<ISkill>;

    // Management
    removeSkill(name: string): Promise<void>;
    updateSkill(name: string, version?: string): Promise<ISkill>;
    updateAllSkills(): Promise<ISkill[]>;

    // Creation
    createSkill(name: string, options: CreateSkillOptions): Promise<ISkill>;
    validateSkill(skill: Partial<ISkill>): ValidationResult;

    // Execution (integration with slash commands)
    executeSkill(name: string, context?: ExecutionContext): Promise<void>;
}

export interface SearchOptions {
    registry?: RegistryType | 'all';
    category?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
}

export interface InstallOptions {
    registry?: RegistryType;
    version?: string;
    force?: boolean;  // Overwrite existing
}

export interface CreateSkillOptions {
    description: string;
    template?: string;
    category?: string;
    tags?: string[];
}

export type RegistryType = 'official' | 'anthropic' | 'community';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ExecutionContext {
    workspaceUri?: URI;
    activeEditor?: IEditor;
    selection?: ISelection;
    variables?: Record<string, string>;
}
```

#### 3.2.2 ISkillStorageService (Persistence Layer)

**Location**: `ainative-studio/src/vs/workbench/contrib/ainative/common/skillStorageService.ts`

**Responsibilities:**
- Read/write skills to local filesystem
- Manage `.claude/skills/` directory structure
- Handle skill file format (YAML + Markdown)
- Sync with AINative Cloud (optional)
- Cache frequently accessed skills

**Interface:**
```typescript
export const IAINativeSkillStorageService = createDecorator<IAINativeSkillStorageService>('ainativeSkillStorageService');

export interface IAINativeSkillStorageService {
    readonly _serviceBrand: undefined;

    // Read operations
    readSkill(name: string): Promise<ISkill | undefined>;
    readAllSkills(): Promise<ISkill[]>;
    skillExists(name: string): Promise<boolean>;

    // Write operations
    writeSkill(skill: ISkill): Promise<void>;
    deleteSkill(name: string): Promise<void>;
    updateSkill(name: string, updates: Partial<ISkill>): Promise<void>;

    // Directory operations
    getSkillsDirectory(): string;
    ensureSkillsDirectory(): Promise<void>;
    getSkillPath(name: string): string;

    // Reference files
    getReferencesPath(skillName: string): string | undefined;
    readReferenceFile(skillName: string, fileName: string): Promise<string>;
    writeReferenceFile(skillName: string, fileName: string, content: string): Promise<void>;

    // Cloud sync (optional)
    enableCloudSync(): Promise<void>;
    disableCloudSync(): Promise<void>;
    syncToCloud(): Promise<void>;
    syncFromCloud(): Promise<void>;

    // File watching
    watchSkillsDirectory(): IDisposable;
}
```

#### 3.2.3 ISkillMarketplaceService (Registry Integration)

**Location**: `ainative-studio/src/vs/workbench/contrib/ainative/common/skillMarketplaceService.ts`

**Responsibilities:**
- Connect to remote skill registries
- Search and discover skills
- Download skill packages
- Verify package signatures
- Track versions and updates

**Interface:**
```typescript
export const IAINativeSkillMarketplaceService = createDecorator<IAINativeSkillMarketplaceService>('ainativeSkillMarketplaceService');

export interface IAINativeSkillMarketplaceService {
    readonly _serviceBrand: undefined;

    // Registry management
    getRegistries(): RegistryInfo[];
    addRegistry(url: string, type: RegistryType): Promise<void>;
    removeRegistry(url: string): Promise<void>;

    // Search and discovery
    search(query: string, options?: SearchOptions): Promise<IMarketplaceSkill[]>;
    getSkill(name: string, registry?: RegistryType): Promise<IMarketplaceSkill | undefined>;
    getSkillVersions(name: string): Promise<string[]>;

    // Download and install
    downloadSkill(name: string, version?: string): Promise<SkillPackage>;
    verifyPackage(pkg: SkillPackage): Promise<boolean>;

    // Updates
    checkForUpdates(): Promise<UpdateInfo[]>;
    getLatestVersion(name: string): Promise<string | undefined>;

    // Metadata
    getPopularSkills(limit?: number): Promise<IMarketplaceSkill[]>;
    getCategories(): Promise<string[]>;
    getTags(): Promise<string[]>;
}

export interface RegistryInfo {
    url: string;
    type: RegistryType;
    name: string;
    enabled: boolean;
}

export interface SkillPackage {
    skill: IMarketplaceSkill;
    content: string;
    references?: Record<string, string>;  // filename -> content
    checksum: string;
    signature?: string;
}

export interface UpdateInfo {
    skillName: string;
    currentVersion: string;
    latestVersion: string;
    changelog?: string;
}
```

#### 3.2.4 ISkillParserService (Format Handler)

**Location**: `ainative-studio/src/vs/workbench/contrib/ainative/common/skillParserService.ts`

**Responsibilities:**
- Parse YAML frontmatter
- Extract Markdown content
- Validate skill format
- Convert between formats (if needed)

**Interface:**
```typescript
export const IAINativeSkillParserService = createDecorator<IAINativeSkillParserService>('ainativeSkillParserService');

export interface IAINativeSkillParserService {
    readonly _serviceBrand: undefined;

    // Parsing
    parseSkillFile(content: string): ParsedSkill;
    parseFrontmatter(content: string): SkillFrontmatter;
    parseMarkdown(content: string): string;

    // Serialization
    serializeSkill(skill: ISkill): string;

    // Validation
    validateFormat(content: string): ValidationResult;
    validateFrontmatter(frontmatter: SkillFrontmatter): ValidationResult;
}

export interface ParsedSkill {
    frontmatter: SkillFrontmatter;
    content: string;
    rawContent: string;
}
```

#### 3.2.5 ISkillExecutorService (Runtime Integration)

**Location**: `ainative-studio/src/vs/workbench/contrib/ainative/browser/skillExecutorService.ts`

**Responsibilities:**
- Execute skills in chat context
- Inject skill content into conversation
- Handle skill variables/templates
- Track skill usage

**Interface:**
```typescript
export const IAINativeSkillExecutorService = createDecorator<IAINativeSkillExecutorService>('ainativeSkillExecutorService');

export interface IAINativeSkillExecutorService {
    readonly _serviceBrand: undefined;

    // Execution
    executeSkill(name: string, context?: ExecutionContext): Promise<ExecutionResult>;

    // Template processing
    processTemplate(skill: ISkill, variables: Record<string, string>): string;

    // Context gathering
    gatherContext(skill: ISkill, context?: ExecutionContext): Promise<Record<string, string>>;

    // Usage tracking
    trackUsage(skillName: string): void;
    getUsageStats(skillName: string): UsageStats;
}

export interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
}

export interface UsageStats {
    skillName: string;
    executeCount: number;
    lastUsed?: Date;
    avgExecutionTime?: number;
}
```

### 3.3 Data Flow

#### 3.3.1 Skill Loading Flow

```
User Opens IDE
     │
     ▼
ISkillsManagerService.loadSkills()
     │
     ├─→ ISkillStorageService.readAllSkills()
     │        │
     │        ├─→ Read .claude/skills/ directory
     │        ├─→ Parse each skill.md file
     │        ├─→ ISkillParserService.parseSkillFile()
     │        └─→ Load references/ if exists
     │
     ├─→ Validate each skill
     │        └─→ ISkillParserService.validateFormat()
     │
     ├─→ Build in-memory skill registry
     │        └─→ Map<skillName, ISkill>
     │
     └─→ Emit onDidChangeSkills event
          │
          └─→ UI updates skill list
```

#### 3.3.2 Skill Installation Flow

```
User: /skill install @ainative/python-expert
     │
     ▼
ISkillsManagerService.installSkill()
     │
     ├─→ ISkillMarketplaceService.getSkill()
     │        │
     │        ├─→ Query official registry
     │        ├─→ Find skill metadata
     │        └─→ Return IMarketplaceSkill
     │
     ├─→ Check if already installed
     │        └─→ Prompt for overwrite if exists
     │
     ├─→ ISkillMarketplaceService.downloadSkill()
     │        │
     │        ├─→ Download skill package
     │        ├─→ Verify checksum
     │        └─→ Verify signature (official registry)
     │
     ├─→ ISkillStorageService.writeSkill()
     │        │
     │        ├─→ Create .claude/skills/python-expert/
     │        ├─→ Write skill.md
     │        └─→ Write references/ files if any
     │
     ├─→ Add to in-memory registry
     │
     ├─→ Emit onDidInstallSkill event
     │
     └─→ Show success notification
```

#### 3.3.3 Skill Execution Flow

```
User: /python-expert (or clicks skill in UI)
     │
     ▼
ISkillExecutorService.executeSkill()
     │
     ├─→ ISkillsManagerService.getSkill()
     │        └─→ Retrieve from in-memory registry
     │
     ├─→ Gather execution context
     │        ├─→ Active editor content
     │        ├─→ Current selection
     │        ├─→ Workspace info
     │        └─→ User-defined variables
     │
     ├─→ Process skill template
     │        ├─→ Replace {{variables}}
     │        └─→ Expand conditionals
     │
     ├─→ Inject into chat conversation
     │        └─→ Add to message history
     │
     ├─→ Track usage
     │        └─→ Telemetry + local stats
     │
     └─→ Continue chat interaction
```

### 3.4 Integration Points

#### 3.4.1 Slash Command Integration

The Skills Manager extends the existing chat slash command system:

**Existing System**: `chatSlashCommands.ts` provides `/clear`, `/help`

**Skills Integration**:
```typescript
// In skillsManagerService.ts constructor

// Register skill management commands
chatSlashCommandService.registerSlashCommand(
    {
        command: 'skill',
        detail: 'Manage skills',
        locations: [ChatAgentLocation.Panel, ChatAgentLocation.Terminal],
    },
    async (prompt, progress, history, location, token) => {
        return this.handleSkillCommand(prompt, progress);
    }
);

// Register each installed skill as a slash command
for (const skill of this.skills.values()) {
    chatSlashCommandService.registerSlashCommand(
        {
            command: skill.name,
            detail: skill.description,
            locations: [ChatAgentLocation.Panel],
        },
        async (prompt, progress, history, location, token) => {
            return this.skillExecutorService.executeSkill(skill.name, {
                history,
                location,
            });
        }
    );
}
```

#### 3.4.2 Settings Integration

Skills configuration stored in `IAINativeSettingsService`:

```typescript
// In ainativeSettingsTypes.ts

export interface GlobalSettings {
    // ... existing settings

    // Skills settings
    skillsEnabled: boolean;
    skillsAutoUpdate: boolean;
    skillsCloudSyncEnabled: boolean;
    skillsRegistries: RegistryConfig[];
    skillsMarketplaceUrl: string;
}

export interface RegistryConfig {
    url: string;
    type: RegistryType;
    enabled: boolean;
}
```

#### 3.4.3 Storage Integration

Skills use workspace-specific storage:

```typescript
// Skills are stored in workspace .claude directory
// Symlinked from /Users/aideveloper/core/.claude/

// Structure:
.claude/
├── skills/                    # User-installed skills
│   ├── git-workflow/
│   ├── python-expert/
│   └── ...
├── skills-cache/             # Downloaded packages cache
│   └── @ainative/
│       └── python-expert@1.0.0.tgz
└── skills-state.json         # Installation state, versions
```

#### 3.4.4 Cloud Sync Integration

Skills optionally sync via `IAINativeAuthService`:

```typescript
// When user is authenticated
if (authService.isAuthenticated) {
    // Sync installed skills to cloud
    skillStorageService.syncToCloud();

    // Download skills from other devices
    skillStorageService.syncFromCloud();
}
```

---

## 4. Phase-by-Phase Implementation Plan

### Phase 1: Skills Manager Core (Issue #54)

**Objective**: Build foundation - loader, parser, registry

**Files to Create**:

1. **Service Interfaces** (Common Layer)
   - `ainative-studio/src/vs/workbench/contrib/ainative/common/skillsManagerService.ts`
   - `ainative-studio/src/vs/workbench/contrib/ainative/common/skillStorageService.ts`
   - `ainative-studio/src/vs/workbench/contrib/ainative/common/skillParserService.ts`
   - `ainative-studio/src/vs/workbench/contrib/ainative/common/skillsTypes.ts`

2. **Implementation Files**
   - `ainative-studio/src/vs/workbench/contrib/ainative/browser/skillExecutorService.ts`

3. **Test Files**
   - `ainative-studio/src/vs/workbench/contrib/ainative/test/common/skillsManagerService.test.ts`
   - `ainative-studio/src/vs/workbench/contrib/ainative/test/common/skillStorageService.test.ts`
   - `ainative-studio/src/vs/workbench/contrib/ainative/test/common/skillParserService.test.ts`

4. **Registration**
   - Update `ainative-studio/src/vs/workbench/contrib/ainative/browser/ainative.contribution.ts`

**Key Deliverables**:
- ✅ ISkillsManagerService interface and implementation
- ✅ ISkillStorageService interface and implementation
- ✅ ISkillParserService interface and implementation
- ✅ Skills loaded from `.claude/skills/` on startup
- ✅ In-memory skill registry populated
- ✅ 100% backward compatibility with existing skills
- ✅ Test coverage > 80%

**Technical Approach**:

```typescript
// skillsManagerService.ts implementation outline

@registerSingleton(IAINativeSkillsManagerService, SkillsManagerService, InstantiationType.Eager)
export class SkillsManagerService extends Disposable implements IAINativeSkillsManagerService {

    private _skills = new Map<string, ISkill>();
    private _isLoaded = false;
    private _loadPromise: Promise<void> | null = null;

    private readonly _onDidChangeSkills = new Emitter<void>();
    readonly onDidChangeSkills = this._onDidChangeSkills.event;

    constructor(
        @IAINativeSkillStorageService private storageService: IAINativeSkillStorageService,
        @IAINativeSkillParserService private parserService: IAINativeSkillParserService,
        @ILogService private logService: ILogService,
    ) {
        super();

        // Start loading skills immediately
        this._loadPromise = this.loadSkills();
    }

    async loadSkills(): Promise<void> {
        try {
            this.logService.info('[Skills] Loading skills from storage...');

            const skills = await this.storageService.readAllSkills();

            for (const skill of skills) {
                const validation = this.parserService.validateFormat(skill.content);

                if (!validation.valid) {
                    this.logService.warn(`[Skills] Invalid skill: ${skill.name}`, validation.errors);
                    continue;
                }

                this._skills.set(skill.name, skill);
            }

            this._isLoaded = true;
            this._onDidChangeSkills.fire();

            this.logService.info(`[Skills] Loaded ${this._skills.size} skills`);
        } catch (error) {
            this.logService.error('[Skills] Failed to load skills', error);
            throw error;
        }
    }

    getSkill(name: string): ISkill | undefined {
        return this._skills.get(name);
    }

    getSkills(): ISkill[] {
        return Array.from(this._skills.values());
    }

    // ... other methods
}
```

**Testing Strategy**:

```typescript
// skillsManagerService.test.ts

describe('SkillsManagerService', () => {
    let service: SkillsManagerService;
    let storageService: MockSkillStorageService;
    let parserService: MockSkillParserService;

    beforeEach(() => {
        storageService = new MockSkillStorageService();
        parserService = new MockSkillParserService();
        service = new SkillsManagerService(storageService, parserService, new NullLogService());
    });

    describe('loadSkills', () => {
        it('should load all skills from storage', async () => {
            storageService.mockSkills = [
                createMockSkill('git-workflow'),
                createMockSkill('mandatory-tdd'),
            ];

            await service.loadSkills();

            expect(service.getSkills()).toHaveLength(2);
            expect(service.getSkill('git-workflow')).toBeDefined();
        });

        it('should skip invalid skills', async () => {
            storageService.mockSkills = [
                createMockSkill('valid-skill'),
                createInvalidSkill('invalid-skill'),
            ];

            parserService.setValidationResult('invalid-skill', {
                valid: false,
                errors: ['Missing name field'],
                warnings: [],
            });

            await service.loadSkills();

            expect(service.getSkills()).toHaveLength(1);
            expect(service.getSkill('valid-skill')).toBeDefined();
            expect(service.getSkill('invalid-skill')).toBeUndefined();
        });

        it('should emit onDidChangeSkills after loading', async () => {
            const spy = jest.fn();
            service.onDidChangeSkills(spy);

            await service.loadSkills();

            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('getSkill', () => {
        it('should return skill by name', async () => {
            storageService.mockSkills = [createMockSkill('test-skill')];
            await service.loadSkills();

            const skill = service.getSkill('test-skill');

            expect(skill).toBeDefined();
            expect(skill!.name).toBe('test-skill');
        });

        it('should return undefined for non-existent skill', async () => {
            await service.loadSkills();

            const skill = service.getSkill('non-existent');

            expect(skill).toBeUndefined();
        });
    });
});
```

**Definition of Done**:
- [ ] All service interfaces defined
- [ ] Core services implemented
- [ ] Skills load on IDE startup
- [ ] All existing skills detected and parsed
- [ ] Unit tests pass with 80%+ coverage
- [ ] Integration tests pass
- [ ] Manual testing: skills appear in `/skill list`
- [ ] Documentation updated

---

### Phase 2: CLI Commands (Issue #55)

**Objective**: Add slash commands for skill management

**Files to Create**:

1. **Command Handlers**
   - `ainative-studio/src/vs/workbench/contrib/ainative/browser/skillCommands.ts`

2. **UI Components** (if needed)
   - `ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/skills/SkillsList.tsx`
   - `ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/skills/SkillDetails.tsx`

3. **Test Files**
   - `ainative-studio/src/vs/workbench/contrib/ainative/test/browser/skillCommands.test.ts`

**Commands to Implement**:

| Command | Syntax | Description |
|---------|--------|-------------|
| `/skill list` | `/skill list [--category <cat>] [--tags <tags>]` | List all available skills |
| `/skill info` | `/skill info <name>` | Show detailed skill information |
| `/skill install` | `/skill install <name> [--registry <registry>] [--version <ver>]` | Install skill from marketplace |
| `/skill remove` | `/skill remove <name>` | Remove installed skill |
| `/skill create` | `/skill create <name> [--template <template>]` | Create new skill |
| `/skill update` | `/skill update <name> [--all]` | Update skill(s) |
| `/skill search` | `/skill search <query>` | Search marketplace |

**Key Deliverables**:
- ✅ All 7 slash commands implemented
- ✅ Commands integrated with chat interface
- ✅ User-friendly error messages
- ✅ Command autocomplete/suggestions
- ✅ Test coverage > 80%

**Technical Approach**:

```typescript
// skillCommands.ts

export class SkillCommands extends Disposable {

    constructor(
        @IAINativeSkillsManagerService private skillsService: IAINativeSkillsManagerService,
        @IChatSlashCommandService private slashCommandService: IChatSlashCommandService,
        @IQuickInputService private quickInputService: IQuickInputService,
        @INotificationService private notificationService: INotificationService,
    ) {
        super();
        this.registerCommands();
    }

    private registerCommands(): void {
        // /skill list
        this._register(this.slashCommandService.registerSlashCommand(
            {
                command: 'skill',
                detail: 'Manage skills (list, install, remove, create)',
                locations: [ChatAgentLocation.Panel],
            },
            async (prompt, progress) => this.handleSkillCommand(prompt, progress)
        ));
    }

    private async handleSkillCommand(
        prompt: string,
        progress: IProgress<IChatProgress>
    ): Promise<{ followUp: IChatFollowup[] } | void> {
        const args = this.parseArgs(prompt);
        const subcommand = args[0];

        switch (subcommand) {
            case 'list':
                return this.handleList(args.slice(1), progress);
            case 'info':
                return this.handleInfo(args.slice(1), progress);
            case 'install':
                return this.handleInstall(args.slice(1), progress);
            case 'remove':
                return this.handleRemove(args.slice(1), progress);
            case 'create':
                return this.handleCreate(args.slice(1), progress);
            case 'update':
                return this.handleUpdate(args.slice(1), progress);
            case 'search':
                return this.handleSearch(args.slice(1), progress);
            default:
                progress.report({
                    content: this.getHelpMessage(),
                });
                return;
        }
    }

    private async handleList(
        args: string[],
        progress: IProgress<IChatProgress>
    ): Promise<void> {
        const skills = this.skillsService.getSkills();

        if (skills.length === 0) {
            progress.report({
                content: 'No skills installed. Use `/skill search` to find skills.',
            });
            return;
        }

        // Group by category
        const byCategory = new Map<string, ISkill[]>();
        for (const skill of skills) {
            const category = skill.frontmatter.category || 'Uncategorized';
            if (!byCategory.has(category)) {
                byCategory.set(category, []);
            }
            byCategory.get(category)!.push(skill);
        }

        let output = '# Installed Skills\n\n';

        for (const [category, categorySkills] of byCategory) {
            output += `## ${category}\n\n`;

            for (const skill of categorySkills) {
                output += `- **/${skill.name}** - ${skill.description}\n`;
                if (skill.tags && skill.tags.length > 0) {
                    output += `  *Tags: ${skill.tags.join(', ')}*\n`;
                }
            }

            output += '\n';
        }

        output += `\nTotal: ${skills.length} skills\n`;
        output += '\nUse `/skill info <name>` for details.';

        progress.report({ content: output });
    }

    private async handleInstall(
        args: string[],
        progress: IProgress<IChatProgress>
    ): Promise<void> {
        // Will be implemented in Phase 3
        progress.report({
            content: 'Marketplace integration coming in Phase 3.',
        });
    }

    private getHelpMessage(): string {
        return `
# Skill Manager Commands

\`\`\`
/skill list [--category <cat>]     List installed skills
/skill info <name>                 Show skill details
/skill install <name>              Install from marketplace (Phase 3)
/skill remove <name>               Remove skill
/skill create <name>               Create new skill
/skill update <name>               Update skill (Phase 3)
/skill search <query>              Search marketplace (Phase 3)
\`\`\`

**Example**: \`/skill list --category Development\`
        `.trim();
    }
}

// Register in ainative.contribution.ts
import './skillCommands.js';
```

**User Experience Flow**:

```
User types: /skill list

Output:
┌─────────────────────────────────────────────────┐
│ # Installed Skills                              │
│                                                 │
│ ## Development                                  │
│ - **/git-workflow** - Git commit, PR, and      │
│   branching standards                           │
│   *Tags: git, workflow, standards*              │
│                                                 │
│ - **/code-quality** - Coding style standards,  │
│   security guidelines                           │
│   *Tags: quality, security, accessibility*      │
│                                                 │
│ ## Testing                                      │
│ - **/mandatory-tdd** - Test-Driven Development │
│   enforcement                                   │
│   *Tags: testing, tdd, bdd*                     │
│                                                 │
│ Total: 8 skills                                 │
│                                                 │
│ Use `/skill info <name>` for details.          │
└─────────────────────────────────────────────────┘

Follow-up suggestions:
• /skill info git-workflow
• /skill search python
• /skill create my-skill
```

**Definition of Done**:
- [ ] All 7 commands implemented
- [ ] Commands registered with slash command service
- [ ] Help text displays correctly
- [ ] Error handling for invalid input
- [ ] Unit tests pass with 80%+ coverage
- [ ] Manual testing: all commands work in chat
- [ ] Documentation with examples

---

### Phase 3: Marketplace Integration (Issue #56)

**Objective**: Connect to remote registries for skill discovery

**Files to Create**:

1. **Marketplace Service**
   - `ainative-studio/src/vs/workbench/contrib/ainative/common/skillMarketplaceService.ts`
   - `ainative-studio/src/vs/workbench/contrib/ainative/common/skillRegistryClient.ts`

2. **Package Management**
   - `ainative-studio/src/vs/workbench/contrib/ainative/common/skillPackageManager.ts`
   - `ainative-studio/src/vs/workbench/contrib/ainative/common/skillVersionManager.ts`

3. **Test Files**
   - `ainative-studio/src/vs/workbench/contrib/ainative/test/common/skillMarketplaceService.test.ts`

**Registry Architecture**:

```
Three-Tier Marketplace:

1. Official Registry (@ainative)
   - URL: https://registry.ainative.studio/skills
   - Curated, verified skills
   - Signed packages
   - SLA: 99.9% uptime

2. Anthropic Registry (@anthropic)
   - URL: https://registry.anthropic.com/skills
   - Claude-specific skills
   - Maintained by Anthropic

3. Community Registry (GitHub)
   - URL: https://github.com/<user>/<repo>
   - User-contributed skills
   - npm-style package.json
   - No signature verification
```

**Package Format**:

```json
{
  "name": "@ainative/python-expert",
  "version": "1.2.0",
  "description": "Python development expert with best practices",
  "author": "AINative Studio <team@ainative.studio>",
  "license": "Apache-2.0",
  "category": "Development",
  "tags": ["python", "development", "best-practices"],
  "repository": "https://github.com/ainative-studio/skill-python-expert",
  "homepage": "https://ainative.studio/skills/python-expert",
  "dependencies": {
    "@ainative/code-quality": "^1.0.0"
  },
  "files": {
    "skill.md": "...",
    "references/pep8-guide.md": "...",
    "references/testing-guide.md": "..."
  },
  "checksum": "sha256:abc123...",
  "signature": "-----BEGIN PGP SIGNATURE-----..."
}
```

**Key Deliverables**:
- ✅ ISkillMarketplaceService implemented
- ✅ Connection to official registry
- ✅ Search functionality
- ✅ Package download and verification
- ✅ Version management
- ✅ Dependency resolution
- ✅ Test coverage > 80%

**Technical Approach**:

```typescript
// skillMarketplaceService.ts

@registerSingleton(IAINativeSkillMarketplaceService, SkillMarketplaceService, InstantiationType.Delayed)
export class SkillMarketplaceService extends Disposable implements IAINativeSkillMarketplaceService {

    private registries: RegistryInfo[] = [
        {
            url: 'https://registry.ainative.studio/skills',
            type: 'official',
            name: 'AINative Official',
            enabled: true,
        },
        {
            url: 'https://registry.anthropic.com/skills',
            type: 'anthropic',
            name: 'Anthropic',
            enabled: true,
        },
    ];

    constructor(
        @IRequestService private requestService: IRequestService,
        @ILogService private logService: ILogService,
        @IStorageService private storageService: IStorageService,
    ) {
        super();
        this.loadRegistries();
    }

    async search(query: string, options?: SearchOptions): Promise<IMarketplaceSkill[]> {
        const registryType = options?.registry || 'all';
        const targetRegistries = registryType === 'all'
            ? this.registries
            : this.registries.filter(r => r.type === registryType);

        const results: IMarketplaceSkill[] = [];

        // Search all registries in parallel
        await Promise.all(
            targetRegistries.map(async (registry) => {
                if (!registry.enabled) return;

                try {
                    const url = `${registry.url}/search?q=${encodeURIComponent(query)}`;
                    const response = await this.requestService.request({ url }, CancellationToken.None);

                    if (response.res.statusCode === 200) {
                        const data = await asJson(response);
                        results.push(...data.skills);
                    }
                } catch (error) {
                    this.logService.error(`[Skills] Search failed for ${registry.name}`, error);
                }
            })
        );

        // Sort by relevance, then popularity
        return results.sort((a, b) => {
            // Relevance score (simple contains check)
            const aRelevance = this.calculateRelevance(a, query);
            const bRelevance = this.calculateRelevance(b, query);

            if (aRelevance !== bRelevance) {
                return bRelevance - aRelevance;
            }

            // Fallback to download count
            return (b.downloadCount || 0) - (a.downloadCount || 0);
        });
    }

    async downloadSkill(name: string, version?: string): Promise<SkillPackage> {
        // Find which registry has this skill
        for (const registry of this.registries) {
            if (!registry.enabled) continue;

            try {
                const versionParam = version ? `?version=${version}` : '';
                const url = `${registry.url}/packages/${name}${versionParam}`;

                const response = await this.requestService.request({ url }, CancellationToken.None);

                if (response.res.statusCode === 200) {
                    const pkg = await asJson(response) as SkillPackage;

                    // Verify checksum
                    const isValid = await this.verifyPackage(pkg);
                    if (!isValid) {
                        throw new Error('Package checksum verification failed');
                    }

                    return pkg;
                }
            } catch (error) {
                this.logService.warn(`[Skills] Download failed from ${registry.name}`, error);
                // Try next registry
            }
        }

        throw new Error(`Skill not found: ${name}`);
    }

    async verifyPackage(pkg: SkillPackage): Promise<boolean> {
        // Verify checksum
        const content = JSON.stringify(pkg.files);
        const hash = await this.computeSHA256(content);

        if (hash !== pkg.checksum) {
            return false;
        }

        // Verify signature for official packages
        if (pkg.skill.source === 'official' && pkg.signature) {
            return this.verifySignature(pkg);
        }

        return true;
    }

    private async computeSHA256(content: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
```

**Update Commands**:

```typescript
// In skillCommands.ts

private async handleInstall(
    args: string[],
    progress: IProgress<IChatProgress>
): Promise<void> {
    const skillName = args[0];

    if (!skillName) {
        progress.report({
            content: 'Usage: `/skill install <name>`\nExample: `/skill install @ainative/python-expert`',
        });
        return;
    }

    try {
        progress.report({
            content: `Searching for skill: ${skillName}...`,
        });

        // Check if already installed
        if (this.skillsService.hasSkill(skillName)) {
            const overwrite = await this.confirmOverwrite(skillName);
            if (!overwrite) {
                progress.report({ content: 'Installation cancelled.' });
                return;
            }
        }

        // Install
        progress.report({
            content: `Installing ${skillName}...`,
        });

        const skill = await this.skillsService.installSkill(skillName);

        progress.report({
            content: `✓ Successfully installed **${skill.name}** (v${skill.version})\n\nUse \`/${skill.name}\` to activate this skill.`,
        });

        // Suggest related skills
        return {
            followUp: [
                {
                    kind: 'reply',
                    message: `/skill info ${skill.name}`,
                    title: 'View details',
                },
                {
                    kind: 'reply',
                    message: `/${skill.name}`,
                    title: 'Try it now',
                },
            ],
        };
    } catch (error) {
        progress.report({
            content: `✗ Installation failed: ${error.message}`,
        });
    }
}

private async handleSearch(
    args: string[],
    progress: IProgress<IChatProgress>
): Promise<void> {
    const query = args.join(' ');

    if (!query) {
        progress.report({
            content: 'Usage: `/skill search <query>`\nExample: `/skill search python`',
        });
        return;
    }

    try {
        progress.report({
            content: `Searching marketplace for: ${query}...`,
        });

        const results = await this.skillsService.searchMarketplace(query);

        if (results.length === 0) {
            progress.report({
                content: `No skills found matching "${query}".`,
            });
            return;
        }

        let output = `# Search Results for "${query}"\n\n`;
        output += `Found ${results.length} skill(s):\n\n`;

        for (const skill of results.slice(0, 10)) {
            output += `## ${skill.name}\n`;
            output += `${skill.description}\n\n`;
            output += `- **Version**: ${skill.version}\n`;
            output += `- **Downloads**: ${skill.downloadCount.toLocaleString()}\n`;
            if (skill.tags && skill.tags.length > 0) {
                output += `- **Tags**: ${skill.tags.join(', ')}\n`;
            }
            output += `\n\`/skill install ${skill.name}\`\n\n`;
        }

        progress.report({ content: output });
    } catch (error) {
        progress.report({
            content: `Search failed: ${error.message}`,
        });
    }
}
```

**Definition of Done**:
- [ ] Marketplace service implemented
- [ ] Connection to official registry works
- [ ] Search returns relevant results
- [ ] Install command downloads and installs skills
- [ ] Package verification (checksum, signature)
- [ ] Dependency resolution
- [ ] Unit tests pass with 80%+ coverage
- [ ] Integration tests with mock registry
- [ ] Manual testing: install skill from registry
- [ ] Documentation updated

---

### Phase 4: Official Skills Package (Issue #57)

**Objective**: Create and publish 5+ official skills

**Official Skills to Create**:

1. **@ainative/python-expert** - Python development best practices
2. **@ainative/typescript-expert** - TypeScript/JavaScript expert
3. **@ainative/code-reviewer** - Automated code review assistant
4. **@ainative/documentation-writer** - Technical documentation generator
5. **@ainative/test-generator** - Automated test generation
6. **@ainative/refactoring-assistant** - Code refactoring suggestions
7. **@ainative/security-auditor** - Security vulnerability scanner

**File Structure for Each Skill**:

```
skills/official/python-expert/
├── package.json           # NPM-style package metadata
├── skill.md              # Main skill definition
├── README.md             # Skill documentation
├── CHANGELOG.md          # Version history
└── references/           # Supporting docs
    ├── pep8-guide.md
    ├── testing-guide.md
    ├── async-patterns.md
    └── packaging-guide.md
```

**Example: @ainative/python-expert**

```markdown
---
name: python-expert
description: Python development expert with PEP 8 standards, testing best practices, async/await patterns, and modern Python 3.10+ features. Use when (1) Writing Python code, (2) Reviewing Python PRs, (3) Debugging Python issues, (4) Optimizing Python performance, (5) Setting up Python projects.
version: 1.0.0
author: AINative Studio
license: Apache-2.0
category: Development
tags:
  - python
  - development
  - best-practices
  - pep8
  - testing
repository: https://github.com/ainative-studio/skill-python-expert
---

# Python Development Expert

I'm your Python development expert, following industry best practices and modern Python standards.

## Core Principles

* **PEP 8 Style Guide:** Follow Python's official style guide
* **Type Hints:** Use type annotations (Python 3.10+ syntax)
* **Testing:** pytest with 80%+ coverage
* **Modern Features:** Use Python 3.10+ features (match/case, union types)
* **Async/Await:** Proper async patterns with asyncio

## When to Use This Skill

Activate me when you need help with:

1. Writing new Python code
2. Reviewing Python pull requests
3. Debugging Python issues
4. Optimizing Python performance
5. Setting up Python projects
6. Implementing async/await patterns
7. Writing tests with pytest

## Code Quality Standards

### Type Hints (Required)

```python
# ✓ Good: Modern type hints
def process_data(items: list[dict[str, Any]]) -> dict[str, int]:
    ...

# ✗ Bad: No type hints
def process_data(items):
    ...
```

### PEP 8 Formatting

* 4 spaces for indentation
* Max line length: 88 characters (Black formatter)
* snake_case for functions/variables
* PascalCase for classes
* UPPER_CASE for constants

### Error Handling

```python
# ✓ Good: Specific exceptions
try:
    result = risky_operation()
except ValueError as e:
    logger.error(f"Invalid value: {e}")
    raise
except KeyError as e:
    logger.error(f"Missing key: {e}")
    return default_value

# ✗ Bad: Bare except
try:
    result = risky_operation()
except:
    pass
```

## Testing Requirements

* Use pytest for all tests
* Minimum 80% code coverage
* Test file naming: `test_<module>.py`
* Use fixtures for setup/teardown
* Parametrize tests for multiple cases

```python
import pytest

@pytest.fixture
def sample_data():
    return {"id": 1, "name": "Test"}

@pytest.mark.parametrize("input,expected", [
    (1, 2),
    (2, 4),
    (3, 6),
])
def test_double(input, expected):
    assert double(input) == expected
```

## Modern Python Features

### Pattern Matching (Python 3.10+)

```python
match response.status:
    case 200:
        return process_success(response)
    case 404:
        raise NotFoundError()
    case _:
        raise UnexpectedError(response.status)
```

### Union Types

```python
# ✓ Modern syntax
def get_user(user_id: int) -> User | None:
    ...

# ✗ Old syntax
from typing import Optional, Union
def get_user(user_id: int) -> Optional[User]:
    ...
```

## Async/Await Patterns

```python
import asyncio
from typing import AsyncIterator

async def fetch_data(url: str) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

async def process_items(items: list[str]) -> list[dict]:
    tasks = [fetch_data(item) for item in items]
    return await asyncio.gather(*tasks)
```

## Project Structure

```
project/
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── main.py
│       └── utils.py
├── tests/
│   ├── __init__.py
│   ├── test_main.py
│   └── test_utils.py
├── pyproject.toml
├── README.md
└── .gitignore
```

## Reference Files

See `references/pep8-guide.md` for complete PEP 8 style guide.

See `references/testing-guide.md` for pytest best practices and patterns.

See `references/async-patterns.md` for asyncio patterns and common pitfalls.

See `references/packaging-guide.md` for modern Python packaging with pyproject.toml.

---

**How I'll Help:**

When you activate this skill, I will:

1. Write Python code following PEP 8 and modern best practices
2. Use type hints for all functions and classes
3. Implement proper error handling
4. Write pytest tests with fixtures and parametrization
5. Use Python 3.10+ features where appropriate
6. Follow async/await patterns correctly
7. Suggest performance optimizations
8. Ensure code is production-ready

Let's write some excellent Python code!
```

**Publishing Workflow**:

```bash
# 1. Create skill package
cd skills/official/python-expert/

# 2. Validate skill format
ainative-cli skill validate

# 3. Run tests
npm test

# 4. Build package
ainative-cli skill build

# 5. Sign package (official registry only)
ainative-cli skill sign --key /path/to/private-key.pem

# 6. Publish to registry
ainative-cli skill publish --registry official
```

**Key Deliverables**:
- ✅ 5+ official skills created
- ✅ Each skill fully documented
- ✅ Reference files for each skill
- ✅ Published to official registry
- ✅ Version 1.0.0 released
- ✅ README and CHANGELOG for each

**Definition of Done**:
- [ ] 5 official skills created
- [ ] All skills pass validation
- [ ] Reference documentation complete
- [ ] Published to official registry
- [ ] Users can install via `/skill install @ainative/skill-name`
- [ ] Documentation with usage examples
- [ ] Video demonstrations (Phase 5)

---

### Phase 5: Testing & Documentation (Issue #58)

**Objective**: Comprehensive testing, documentation, and tutorials

**Test Strategy**:

**1. Unit Tests** (Target: 80%+ coverage)
```typescript
// Test file organization
ainative-studio/src/vs/workbench/contrib/ainative/test/
├── common/
│   ├── skillsManagerService.test.ts
│   ├── skillStorageService.test.ts
│   ├── skillParserService.test.ts
│   ├── skillMarketplaceService.test.ts
│   └── skillPackageManager.test.ts
└── browser/
    ├── skillExecutorService.test.ts
    ├── skillCommands.test.ts
    └── skillUI.test.ts
```

**2. Integration Tests**
```typescript
// Test skill installation end-to-end
describe('Skill Installation Integration', () => {
    it('should install skill from marketplace', async () => {
        // Mock marketplace
        const mockRegistry = new MockSkillRegistry();
        mockRegistry.addSkill(createMockMarketplaceSkill('test-skill'));

        // Install
        const skill = await skillsService.installSkill('test-skill');

        // Verify file system
        expect(fs.existsSync('/path/to/.claude/skills/test-skill/skill.md')).toBe(true);

        // Verify in-memory registry
        expect(skillsService.getSkill('test-skill')).toBeDefined();

        // Verify slash command registered
        expect(slashCommandService.hasCommand('test-skill')).toBe(true);
    });
});
```

**3. E2E Tests**
```typescript
// Test user workflow
describe('Skills Manager E2E', () => {
    it('should complete full user workflow', async () => {
        // 1. Search for skill
        await chatWidget.sendMessage('/skill search python');
        await waitForResponse();
        expect(chatWidget.getLastResponse()).toContain('python-expert');

        // 2. Install skill
        await chatWidget.sendMessage('/skill install @ainative/python-expert');
        await waitForResponse();
        expect(chatWidget.getLastResponse()).toContain('Successfully installed');

        // 3. Execute skill
        await chatWidget.sendMessage('/python-expert');
        await waitForResponse();
        expect(chatWidget.getLastResponse()).toContain('Python development expert');

        // 4. Remove skill
        await chatWidget.sendMessage('/skill remove python-expert');
        await waitForResponse();
        expect(chatWidget.getLastResponse()).toContain('Successfully removed');
    });
});
```

**4. Performance Tests**
```typescript
describe('Skills Manager Performance', () => {
    it('should load 100 skills in under 500ms', async () => {
        const skills = createMockSkills(100);
        storageService.mockSkills = skills;

        const start = Date.now();
        await skillsService.loadSkills();
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(500);
    });

    it('should search 1000 skills in under 2s', async () => {
        const skills = createMockMarketplaceSkills(1000);
        marketplaceService.mockSkills = skills;

        const start = Date.now();
        const results = await marketplaceService.search('python');
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(2000);
        expect(results.length).toBeGreaterThan(0);
    });
});
```

**Documentation Structure**:

```
ainative-studio/docs/skills/
├── README.md                          # Overview and quick start
├── ARCHITECTURE.md                    # This document
├── USER_GUIDE.md                      # End-user documentation
├── DEVELOPER_GUIDE.md                 # Skill creation guide
├── API_REFERENCE.md                   # Service API documentation
├── MARKETPLACE.md                     # Marketplace guide
├── TROUBLESHOOTING.md                 # Common issues
└── examples/
    ├── creating-custom-skill.md
    ├── publishing-to-marketplace.md
    └── advanced-skill-patterns.md
```

**USER_GUIDE.md Outline**:

```markdown
# Skills Manager User Guide

## Table of Contents
1. Introduction
2. Getting Started
3. Installing Skills
4. Using Skills
5. Managing Skills
6. Creating Custom Skills
7. FAQ
8. Troubleshooting

## Introduction

Skills are reusable prompts and workflows that enhance AINative Studio's AI capabilities...

## Getting Started

### Listing Available Skills

...

## Installing Skills

### From Official Registry

...

## Using Skills

### Activating a Skill

...

## Managing Skills

### Updating Skills

...

## Creating Custom Skills

### Skill Format

...

## FAQ

**Q: Where are skills stored?**
A: Skills are stored in `.claude/skills/` in your workspace...

**Q: Can I share my custom skills?**
A: Yes! You can publish to the community registry...

## Troubleshooting

### Skill Won't Load

...
```

**Video Tutorial Outline**:

**Video 1: Introduction to Skills Manager** (5 min)
- What are skills?
- Why use skills?
- Demo: Installing and using a skill

**Video 2: Creating Your First Custom Skill** (10 min)
- Skill format explained
- Step-by-step creation
- Testing your skill
- Demo: Create a custom skill

**Video 3: Publishing to the Marketplace** (8 min)
- Preparing your skill for publishing
- Publishing process
- Best practices
- Demo: Publish a skill

**Video 4: Advanced Skill Patterns** (12 min)
- Using reference files
- Dependencies between skills
- Template variables
- Conditional logic
- Demo: Advanced skill features

**Key Deliverables**:
- ✅ 80%+ test coverage
- ✅ Comprehensive user documentation
- ✅ Developer guide for skill creation
- ✅ API reference documentation
- ✅ 4 video tutorials
- ✅ Example skills repository
- ✅ Troubleshooting guide

**Definition of Done**:
- [ ] All tests pass (unit, integration, E2E)
- [ ] Coverage > 80%
- [ ] All documentation written
- [ ] 4 videos recorded and published
- [ ] Example skills repository created
- [ ] Beta testing completed
- [ ] Final review and approval

---

## 5. Data Models and Schemas

### 5.1 Skill Schema

```typescript
export interface ISkill {
    // Identity
    id: string;                       // Unique identifier (name or name@version)
    name: string;                     // Kebab-case name (python-expert)
    displayName: string;              // Human-readable (Python Expert)

    // Metadata
    description: string;
    version: string;                  // Semver (1.2.3)
    author?: string;
    license?: string;
    category?: string;
    tags?: string[];

    // Content
    content: string;                  // Full Markdown body
    frontmatter: SkillFrontmatter;   // Parsed YAML

    // Files
    path: string;                     // Absolute path to skill.md
    referencesPath?: string;          // Path to references/ directory
    references?: SkillReference[];    // Loaded reference files

    // Source
    source: SkillSource;
    registry?: string;

    // Dependencies
    dependencies?: SkillDependency[];

    // Usage metadata
    triggers?: string[];              // Trigger conditions
    examples?: SkillExample[];

    // Installation info
    installedAt?: Date;
    updatedAt?: Date;
    installedVersion?: string;
    latestVersion?: string;

    // Stats (for marketplace skills)
    downloadCount?: number;
    rating?: number;
    ratingCount?: number;
}

export interface SkillFrontmatter {
    name: string;
    description: string;
    version?: string;
    author?: string;
    license?: string;
    category?: string;
    tags?: string[];
    dependencies?: string[];
}

export interface SkillReference {
    name: string;
    path: string;
    content: string;
}

export interface SkillDependency {
    name: string;
    version?: string;  // Semver range (^1.0.0)
    optional?: boolean;
}

export interface SkillExample {
    title: string;
    description?: string;
    input: string;
    expectedOutput?: string;
}

export type SkillSource = 'local' | 'official' | 'anthropic' | 'community';
```

### 5.2 Marketplace Schema

```typescript
export interface IMarketplaceSkill extends ISkill {
    // Additional marketplace metadata
    repository?: string;
    homepage?: string;
    changelog?: string;
    readme?: string;

    // Stats
    downloadCount: number;
    downloadTrend?: 'up' | 'down' | 'stable';
    rating?: number;
    ratingCount?: number;

    // Publishing info
    publishedAt: Date;
    updatedAt: Date;
    publisher: SkillPublisher;

    // Verification
    verified: boolean;
    signature?: string;
}

export interface SkillPublisher {
    name: string;
    email?: string;
    url?: string;
    verified: boolean;
}
```

### 5.3 Storage Schema

**skills-state.json** (Workspace-level metadata):

```json
{
  "version": "1.0",
  "skills": {
    "git-workflow": {
      "installedAt": "2026-01-02T10:30:00Z",
      "installedVersion": "1.0.0",
      "source": "local"
    },
    "python-expert": {
      "installedAt": "2026-01-02T11:00:00Z",
      "installedVersion": "1.2.0",
      "source": "official",
      "registry": "https://registry.ainative.studio/skills",
      "latestVersion": "1.3.0",
      "updateAvailable": true
    }
  },
  "registries": [
    {
      "url": "https://registry.ainative.studio/skills",
      "type": "official",
      "enabled": true
    },
    {
      "url": "https://registry.anthropic.com/skills",
      "type": "anthropic",
      "enabled": true
    }
  ],
  "settings": {
    "autoUpdate": false,
    "cloudSyncEnabled": true
  }
}
```

---

## 6. Security Architecture

### 6.1 Threat Model

**Threats**:
1. **Malicious Skills**: Skills that attempt to execute arbitrary code
2. **Data Exfiltration**: Skills that send sensitive data to external servers
3. **Dependency Confusion**: Malicious packages with similar names
4. **Supply Chain Attacks**: Compromised registry or packages
5. **Local File Access**: Skills accessing files outside workspace

**Mitigations**:

1. **No Code Execution**
   - Skills are Markdown only (no JavaScript, Python, etc.)
   - All skill logic is declarative
   - Variables are template-based only

2. **Package Verification**
   - Checksum verification for all downloads
   - Signature verification for official packages
   - Registry HTTPS only

3. **Sandboxing**
   - Skills execute in isolated context
   - No access to Node.js APIs
   - No network access from skill content

4. **User Consent**
   - Prompt before installing from community registry
   - Show skill permissions before installation
   - Allow/deny list for registries

5. **Content Security**
   - Sanitize Markdown to prevent XSS
   - No `<script>` tags allowed
   - No external resource loading

### 6.2 Permission Model

```typescript
export interface SkillPermissions {
    // File system
    fileRead?: string[];      // Allowed paths (glob patterns)
    fileWrite?: string[];

    // Network
    network?: boolean;        // Allow network access
    allowedDomains?: string[];

    // Execution
    executeCommands?: boolean;  // Allow command execution
    allowedCommands?: string[];
}

// Example permission check
if (skill.permissions?.network && !userApproved) {
    const approved = await confirmPermission(
        `Skill "${skill.name}" requests network access. Allow?`
    );
    if (!approved) {
        throw new Error('Permission denied');
    }
}
```

### 6.3 Signature Verification

```typescript
// For official registry packages
async function verifySignature(pkg: SkillPackage): Promise<boolean> {
    const publicKey = await loadPublicKey('ainative-official.pem');
    const content = JSON.stringify(pkg.files);
    const signature = pkg.signature;

    const isValid = await crypto.subtle.verify(
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
        },
        publicKey,
        base64Decode(signature),
        stringToBuffer(content)
    );

    return isValid;
}
```

---

## 7. Performance Optimization

### 7.1 Caching Strategy

**In-Memory Cache**:
- All loaded skills cached in `Map<string, ISkill>`
- References lazy-loaded on first access
- Cache invalidated on file changes

**Disk Cache**:
```
.claude/skills-cache/
├── packages/              # Downloaded packages
│   └── @ainative/
│       └── python-expert@1.2.0.tgz
├── index.json            # Search index
└── metadata/             # Skill metadata cache
    └── python-expert.json
```

**Cache Invalidation**:
- File watcher detects changes to `.claude/skills/`
- Reload changed skills only
- Keep other skills in cache

### 7.2 Lazy Loading

```typescript
class Skill implements ISkill {
    private _references?: SkillReference[];

    get references(): SkillReference[] {
        if (!this._references && this.referencesPath) {
            this._references = this.loadReferences();
        }
        return this._references || [];
    }

    private loadReferences(): SkillReference[] {
        // Load reference files on demand
        const files = fs.readdirSync(this.referencesPath);
        return files.map(file => ({
            name: file,
            path: path.join(this.referencesPath, file),
            content: fs.readFileSync(path.join(this.referencesPath, file), 'utf-8'),
        }));
    }
}
```

### 7.3 Search Optimization

**Search Index**:
```typescript
interface SearchIndex {
    skills: Map<string, SkillIndexEntry>;
    trigrams: Map<string, Set<string>>;  // Trigram -> skill names
    tags: Map<string, Set<string>>;      // Tag -> skill names
    categories: Map<string, Set<string>>; // Category -> skill names
}

interface SkillIndexEntry {
    name: string;
    description: string;
    tags: string[];
    category: string;
    trigrams: Set<string>;
}

// Build trigram index for fuzzy search
function buildTrigramIndex(text: string): Set<string> {
    const trigrams = new Set<string>();
    const normalized = text.toLowerCase();

    for (let i = 0; i < normalized.length - 2; i++) {
        trigrams.add(normalized.substring(i, i + 3));
    }

    return trigrams;
}

// Search using trigram similarity
function search(query: string, index: SearchIndex): ISkill[] {
    const queryTrigrams = buildTrigramIndex(query);
    const scores = new Map<string, number>();

    for (const trigram of queryTrigrams) {
        const matchingSkills = index.trigrams.get(trigram) || new Set();

        for (const skillName of matchingSkills) {
            scores.set(skillName, (scores.get(skillName) || 0) + 1);
        }
    }

    return Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => index.skills.get(name)!)
        .filter(Boolean);
}
```

---

## 8. Testing Strategy

### 8.1 Test Pyramid

```
                   ┌─────────┐
                   │   E2E   │  10% (User workflows)
                   └─────────┘
               ┌───────────────┐
               │  Integration  │  30% (Service integration)
               └───────────────┘
          ┌───────────────────────┐
          │      Unit Tests       │  60% (Individual functions)
          └───────────────────────┘
```

### 8.2 Test Coverage Requirements

| Component | Target Coverage | Critical Paths |
|-----------|----------------|----------------|
| SkillsManagerService | 90% | loadSkills, installSkill, removeSkill |
| SkillStorageService | 85% | readAllSkills, writeSkill, deleteSkill |
| SkillParserService | 95% | parseSkillFile, validateFormat |
| SkillMarketplaceService | 80% | search, downloadSkill, verifyPackage |
| SkillExecutorService | 85% | executeSkill, processTemplate |
| SkillCommands | 75% | All command handlers |

### 8.3 Mock Strategies

```typescript
// Mock file system
class MockFileSystemProvider implements IFileSystemProvider {
    private files = new Map<string, Uint8Array>();

    readFile(uri: URI): Promise<Uint8Array> {
        return Promise.resolve(this.files.get(uri.toString()) || new Uint8Array());
    }

    writeFile(uri: URI, content: Uint8Array): Promise<void> {
        this.files.set(uri.toString(), content);
        return Promise.resolve();
    }

    // ...
}

// Mock marketplace
class MockSkillMarketplace implements IAINativeSkillMarketplaceService {
    private skills = new Map<string, IMarketplaceSkill>();

    addSkill(skill: IMarketplaceSkill): void {
        this.skills.set(skill.name, skill);
    }

    async search(query: string): Promise<IMarketplaceSkill[]> {
        return Array.from(this.skills.values())
            .filter(s => s.name.includes(query) || s.description.includes(query));
    }

    // ...
}
```

### 8.4 Test Data

```typescript
// Test fixture factory
function createMockSkill(name: string, overrides?: Partial<ISkill>): ISkill {
    return {
        id: name,
        name,
        displayName: name.split('-').map(capitalize).join(' '),
        description: `Mock skill: ${name}`,
        version: '1.0.0',
        content: `---\nname: ${name}\n---\n\n# ${name}\n\nMock content`,
        frontmatter: {
            name,
            description: `Mock skill: ${name}`,
        },
        path: `/mock/skills/${name}/skill.md`,
        source: 'local',
        ...overrides,
    };
}

// Test data sets
export const TEST_SKILLS = {
    gitWorkflow: createMockSkill('git-workflow', {
        category: 'Development',
        tags: ['git', 'workflow'],
    }),
    pythonExpert: createMockSkill('python-expert', {
        category: 'Development',
        tags: ['python', 'development'],
        source: 'official',
    }),
    // ...
};
```

---

## 9. Migration Strategy

### 9.1 Backward Compatibility

**Guarantee**: 100% backward compatibility with existing skills

**Approach**:
1. Existing skills in `.claude/skills/` work without modification
2. Skills without version default to "1.0.0"
3. Skills without frontmatter supported (parse as description)
4. Reference files remain optional

### 9.2 Migration Path

**For existing skills**:
1. Auto-detect skills on first launch
2. Generate `skills-state.json` from existing skills
3. Mark all as `source: 'local'`
4. No user action required

**For future versions**:
1. Version field in frontmatter becomes required (v2.0)
2. Deprecated fields removed (v3.0)
3. New features opt-in via frontmatter flags

### 9.3 Version Support Matrix

| Skills Format Version | IDE Version | Support Status |
|----------------------|-------------|----------------|
| 1.0 (current) | 1.5.0+ | Full support |
| 2.0 (planned) | 1.6.0+ | Forward compatible |
| 3.0 (future) | 2.0.0+ | Breaking changes |

---

## 10. Monitoring and Telemetry

### 10.1 Metrics to Track

**Usage Metrics**:
- Skill execution count per skill
- Most popular skills
- Average execution time
- Error rate per skill

**Installation Metrics**:
- Install success/failure rate
- Most installed skills
- Average install time
- Update adoption rate

**Marketplace Metrics**:
- Search queries
- Click-through rate
- Download count per skill
- User ratings

### 10.2 Telemetry Events

```typescript
// Skill loaded
telemetryService.publicLog2<SkillLoadedEvent>('skills.loaded', {
    skillCount: this.skills.size,
    loadTime: duration,
});

// Skill executed
telemetryService.publicLog2<SkillExecutedEvent>('skills.executed', {
    skillName: skill.name,
    source: skill.source,
    executionTime: duration,
});

// Skill installed
telemetryService.publicLog2<SkillInstalledEvent>('skills.installed', {
    skillName: skill.name,
    source: skill.source,
    version: skill.version,
    registry: skill.registry,
});
```

### 10.3 Error Tracking

```typescript
// Skill load error
telemetryService.publicLogError2<SkillLoadErrorEvent>('skills.loadError', {
    skillName: skill.name,
    error: error.message,
    stack: error.stack,
});

// Installation error
telemetryService.publicLogError2<SkillInstallErrorEvent>('skills.installError', {
    skillName: name,
    registry: registry,
    error: error.message,
});
```

---

## 11. Deployment Strategy

### 11.1 Rollout Plan

**Phase 1: Internal Beta** (Week 1-2)
- Deploy to internal team
- Test all functionality
- Gather feedback
- Fix critical bugs

**Phase 2: External Beta** (Week 3-4)
- Deploy to beta testers (100 users)
- Monitor usage and errors
- Iterate based on feedback
- Performance tuning

**Phase 3: Gradual Rollout** (Week 5-6)
- 10% of users (Week 5)
- 50% of users (Week 6)
- 100% of users (Week 7)

**Phase 4: General Availability**
- Announce feature
- Publish blog post
- Release video tutorials
- Monitor adoption

### 11.2 Feature Flags

```typescript
// Feature flag for skills manager
const SKILLS_ENABLED = 'skills.enabled';
const SKILLS_MARKETPLACE_ENABLED = 'skills.marketplace.enabled';
const SKILLS_CLOUD_SYNC_ENABLED = 'skills.cloudSync.enabled';

// Check feature flag
if (configurationService.getValue(SKILLS_ENABLED)) {
    // Enable skills manager
}
```

### 11.3 Rollback Plan

If issues are detected:

1. **Immediate**: Disable feature flag
2. **Short-term**: Revert to previous version
3. **Long-term**: Fix bugs and re-deploy

**Rollback triggers**:
- Error rate > 5%
- Performance degradation > 20%
- Critical security issue
- Data loss reported

---

## 12. Future Enhancements

### 12.1 Roadmap (Post-Launch)

**v1.1 (Q1 2026)**:
- Skill templates with variables
- Skill composition (combine multiple skills)
- Skill versioning UI
- Skill usage analytics dashboard

**v1.2 (Q2 2026)**:
- Cloud sync for skills
- Team skill sharing
- Private skill registries
- Skill recommendations based on usage

**v1.3 (Q3 2026)**:
- Skill marketplace web UI
- User ratings and reviews
- Skill dependencies auto-install
- Skill update notifications

**v2.0 (Q4 2026)**:
- AI-generated skills
- Skill chaining/workflows
- Skill versioning with branching
- Enterprise skill management

### 12.2 Advanced Features

**Skill Templates**:
```yaml
---
name: api-endpoint-generator
variables:
  - name: resourceName
    type: string
    required: true
  - name: httpMethod
    type: select
    options: [GET, POST, PUT, DELETE]
    default: GET
---

# Generate {{httpMethod}} endpoint for {{resourceName}}

Create a RESTful API endpoint:
- Method: {{httpMethod}}
- Resource: {{resourceName}}
- Include error handling
- Add input validation
...
```

**Skill Composition**:
```yaml
---
name: full-feature-workflow
compose:
  - git-workflow
  - mandatory-tdd
  - code-quality
  - delivery-checklist
---

# Complete Feature Development Workflow

This skill combines multiple skills for a complete workflow...
```

**Conditional Logic**:
```yaml
---
name: language-specific-reviewer
conditions:
  - if: fileExtension == '.py'
    then: python-expert
  - if: fileExtension == '.ts'
    then: typescript-expert
  - else: code-quality
---
```

---

## 13. Success Criteria

### 13.1 Launch Criteria

- [ ] All 5 phases completed
- [ ] Test coverage > 80%
- [ ] No critical bugs
- [ ] Performance meets targets (< 500ms load time)
- [ ] 5+ official skills published
- [ ] Documentation complete
- [ ] Video tutorials recorded
- [ ] Beta testing successful

### 13.2 Success Metrics (3 months post-launch)

**Adoption**:
- 50%+ of active users have installed at least 1 skill
- 10,000+ total skill installations
- 100+ community-contributed skills

**Engagement**:
- Average 5 skills per user
- 20%+ weekly active usage
- 4.0+ average rating for official skills

**Quality**:
- < 1% error rate
- < 5% skill load failures
- 99.9% marketplace uptime
- < 100ms search latency

**Community**:
- 50+ community skills published
- 10+ skill contributions per week
- Active community forum/discussions

---

## 14. Risk Assessment

### 14.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Performance degradation with 100+ skills | Medium | High | Lazy loading, caching, indexing |
| Marketplace downtime | Low | Medium | Fallback to cache, offline mode |
| Skill format breaking changes | Low | High | Versioning, backward compatibility |
| Security vulnerability in skills | Medium | High | Sandboxing, no code execution |
| Dependency conflicts | Medium | Medium | Dependency resolution algorithm |

### 14.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Low adoption rate | Medium | High | Marketing, tutorials, official skills |
| Community skills low quality | High | Medium | Verification, ratings, curation |
| Marketplace maintenance cost | Low | Medium | Community moderation, automation |
| Legal issues (licensing) | Low | High | Clear license requirements, ToS |

### 14.3 Mitigation Strategies

**For low adoption**:
- Create compelling official skills
- Integrate into onboarding flow
- Highlight in release notes
- Video tutorials and demos

**For low quality community skills**:
- Verification badges for quality
- User ratings and reviews
- Featured skills curation
- Quality guidelines

---

## 15. Appendix

### 15.1 Glossary

- **Skill**: A reusable prompt or workflow in Markdown format
- **Skill Registry**: A repository of skills (official, anthropic, community)
- **Skill Package**: A bundled skill with metadata, content, and references
- **Frontmatter**: YAML metadata at the start of skill.md
- **Reference Files**: Supporting documentation in `references/` directory
- **Marketplace**: The collection of all available skills across registries
- **Slash Command**: Chat command starting with `/` (e.g., `/skill list`)

### 15.2 Related Documentation

- [CLAUDE.md](/Users/aideveloper/AINativeStudio-IDE/ainative-studio/CLAUDE.md) - Project overview
- [Chat Slash Commands](./chat-slash-commands.md) - Slash command system
- [Service Architecture](./service-architecture.md) - DI and services
- [File Placement Rules](.claude/skills/file-placement/skill.md) - Where to put files

### 15.3 References

- VS Code Extension API: https://code.visualstudio.com/api
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Electron Documentation: https://www.electronjs.org/docs
- Semver Specification: https://semver.org/
- YAML Specification: https://yaml.org/spec/

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Architecture Team | Initial architecture design |

---

**End of Architecture Document**
