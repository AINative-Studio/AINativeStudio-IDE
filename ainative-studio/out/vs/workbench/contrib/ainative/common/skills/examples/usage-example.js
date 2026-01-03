/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ISkillConfigService } from '../skillConfigServiceTypes.js';
/**
 * Example demonstrating how to use the SkillConfigService
 */
let SkillConfigUsageExample = class SkillConfigUsageExample {
    constructor(skillConfigService) {
        this.skillConfigService = skillConfigService;
    }
    /**
     * Example 1: Initialize skills configuration for a new project
     */
    async initializeNewProject() {
        console.log('=== Initializing New Project ===');
        // Check if .mcp.json already exists
        const hasConfig = await this.skillConfigService.hasMCPConfig();
        console.log('Has existing config:', hasConfig);
        if (!hasConfig) {
            // Initialize with auto-detected skills
            await this.skillConfigService.initializeMCPConfig(true);
            console.log('Created .mcp.json with auto-detected skills');
        }
        // Get enabled skills
        const enabled = await this.skillConfigService.getEnabledSkills();
        console.log('Enabled skills:', enabled);
    }
    /**
     * Example 2: Detect project type and get recommendations
     */
    async detectAndRecommend() {
        console.log('\n=== Project Detection ===');
        // Detect project type
        const detection = await this.skillConfigService.detectProjectType();
        console.log('Project Type:', detection.metadata.projectType);
        console.log('Framework:', detection.metadata.framework);
        console.log('Languages:', detection.metadata.languages);
        console.log('Technologies:', detection.metadata.technologies);
        console.log('Confidence:', (detection.confidence * 100).toFixed(0) + '%');
        console.log('Detected Files:', detection.detectedFiles);
        // Get skill recommendations
        const recommendations = await this.skillConfigService.recommendSkills(detection.metadata);
        console.log('\n=== Skill Recommendations ===');
        recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec.skillId}`);
            console.log(`   Reason: ${rec.reason}`);
            console.log(`   Priority: ${rec.priority}`);
        });
    }
    /**
     * Example 3: Read and update skills configuration
     */
    async updateConfiguration() {
        console.log('\n=== Updating Configuration ===');
        // Read current config
        const currentConfig = await this.skillConfigService.readSkillsConfig();
        console.log('Current enabled skills:', currentConfig?.enabled);
        // Add a new skill
        const updatedConfig = {
            enabled: [
                ...(currentConfig?.enabled || []),
                'code-quality' // Add new skill
            ],
            autoLoad: true
        };
        // Validate before writing
        const errors = this.skillConfigService.validateConfig(updatedConfig);
        if (errors.length > 0) {
            console.error('Validation errors:', errors);
            return;
        }
        // Write merged config
        await this.skillConfigService.writeSkillsConfig(updatedConfig, true);
        console.log('Updated configuration successfully');
        // Verify update
        const newConfig = await this.skillConfigService.readSkillsConfig();
        console.log('New enabled skills:', newConfig?.enabled);
    }
    /**
     * Example 4: Handle FastAPI Python backend project
     */
    async handleFastAPIProject() {
        console.log('\n=== FastAPI Project Configuration ===');
        const config = {
            enabled: [
                '@ainative/python-expert',
                '@ainative/fastapi-expert',
                'git-workflow',
                'mandatory-tdd',
                'ci-cd-compliance',
                'database-schema-sync'
            ],
            projectSpecific: [
                './local-skills/backend-patterns',
                './local-skills/api-design'
            ],
            autoLoad: true,
            metadata: {
                projectType: 'backend',
                framework: 'fastapi',
                languages: ['python'],
                technologies: ['fastapi', 'postgresql', 'redis']
            }
        };
        await this.skillConfigService.writeSkillsConfig(config, false);
        console.log('FastAPI project configuration saved');
    }
    /**
     * Example 5: Handle React frontend project
     */
    async handleReactProject() {
        console.log('\n=== React Project Configuration ===');
        const config = {
            enabled: [
                '@ainative/react-expert',
                'git-workflow',
                'mandatory-tdd',
                'code-quality'
            ],
            autoLoad: true,
            metadata: {
                projectType: 'frontend',
                framework: 'react',
                languages: ['javascript', 'typescript'],
                technologies: ['react', 'typescript']
            }
        };
        await this.skillConfigService.writeSkillsConfig(config, false);
        console.log('React project configuration saved');
    }
    /**
     * Example 6: Validate configuration before saving
     */
    async validateBeforeSaving() {
        console.log('\n=== Configuration Validation ===');
        // Valid configuration
        const validConfig = {
            enabled: ['git-workflow', 'mandatory-tdd'],
            autoLoad: true
        };
        const validErrors = this.skillConfigService.validateConfig(validConfig);
        console.log('Valid config errors:', validErrors.length === 0 ? 'None' : validErrors);
        // Invalid configuration - empty enabled array
        const invalidConfig1 = {
            enabled: []
        };
        const errors1 = this.skillConfigService.validateConfig(invalidConfig1);
        console.log('Invalid config 1 errors:', errors1);
        // Invalid configuration - wrong project type
        const invalidConfig2 = {
            enabled: ['git-workflow'],
            metadata: {
                projectType: 'invalid-type'
            }
        };
        const errors2 = this.skillConfigService.validateConfig(invalidConfig2);
        console.log('Invalid config 2 errors:', errors2);
    }
    /**
     * Run all examples
     */
    async runAllExamples() {
        try {
            await this.initializeNewProject();
            await this.detectAndRecommend();
            await this.updateConfiguration();
            await this.validateBeforeSaving();
            // Uncomment to test specific frameworks:
            // await this.handleFastAPIProject();
            // await this.handleReactProject();
        }
        catch (error) {
            console.error('Error running examples:', error);
        }
    }
};
SkillConfigUsageExample = __decorate([
    __param(0, ISkillConfigService)
], SkillConfigUsageExample);
export { SkillConfigUsageExample };
/**
 * Example output for a FastAPI backend project:
 *
 * === Project Detection ===
 * Project Type: backend
 * Framework: fastapi
 * Languages: [ 'python' ]
 * Technologies: [ 'fastapi' ]
 * Confidence: 70%
 * Detected Files: [ 'requirements.txt', 'pyproject.toml' ]
 *
 * === Skill Recommendations ===
 * 1. @ainative/python-expert
 *    Reason: Python backend detected
 *    Priority: 1
 * 2. @ainative/fastapi-expert
 *    Reason: FastAPI framework detected
 *    Priority: 1
 * 3. git-workflow
 *    Reason: Essential for version control
 *    Priority: 2
 * 4. mandatory-tdd
 *    Reason: Testing best practices
 *    Priority: 3
 * 5. ci-cd-compliance
 *    Reason: Backend deployment standards
 *    Priority: 4
 */
/**
 * Example output for a React frontend project:
 *
 * === Project Detection ===
 * Project Type: frontend
 * Framework: react
 * Languages: [ 'javascript', 'typescript' ]
 * Technologies: [ 'react', 'typescript' ]
 * Confidence: 80%
 * Detected Files: [ 'package.json' ]
 *
 * === Skill Recommendations ===
 * 1. @ainative/react-expert
 *    Reason: React framework detected
 *    Priority: 1
 * 2. git-workflow
 *    Reason: Essential for version control
 *    Priority: 2
 * 3. mandatory-tdd
 *    Reason: Testing best practices
 *    Priority: 3
 * 4. code-quality
 *    Reason: Code quality standards
 *    Priority: 4
 */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2UtZXhhbXBsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NraWxscy9leGFtcGxlcy91c2FnZS1leGFtcGxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3BFOztHQUVHO0FBQ0ksSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFFbkMsWUFDdUMsa0JBQXVDO1FBQXZDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7SUFDMUUsQ0FBQztJQUVMOztPQUVHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQjtRQUN6QixPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7UUFFaEQsb0NBQW9DO1FBQ3BDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxDQUFDO1FBQy9ELE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFL0MsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLHVDQUF1QztZQUN2QyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4RCxPQUFPLENBQUMsR0FBRyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2pFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFD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