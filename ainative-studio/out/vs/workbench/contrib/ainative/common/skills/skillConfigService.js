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
var SkillConfigService_1;
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
/**
 * Service implementation for managing skills configuration in .mcp.json
 */
let SkillConfigService = class SkillConfigService {
    static { SkillConfigService_1 = this; }
    static { this.MCP_CONFIG_FILE = '.mcp.json'; }
    // Skill recommendation mappings
    static { this.SKILL_RECOMMENDATIONS = {
        'react': [
            { skillId: '@ainative/react-expert', reason: 'React framework detected', priority: 1 },
            { skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 },
            { skillId: 'code-quality', reason: 'Code quality standards', priority: 4 }
        ],
        'next': [
            { skillId: '@ainative/nextjs-expert', reason: 'Next.js framework detected', priority: 1 },
            { skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
        ],
        'vue': [
            { skillId: '@ainative/vue-expert', reason: 'Vue.js framework detected', priority: 1 },
            { skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
        ],
        'angular': [
            { skillId: '@ainative/angular-expert', reason: 'Angular framework detected', priority: 1 },
            { skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
        ],
        'fastapi': [
            { skillId: '@ainative/python-expert', reason: 'Python backend detected', priority: 1 },
            { skillId: '@ainative/fastapi-expert', reason: 'FastAPI framework detected', priority: 1 },
            { skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 },
            { skillId: 'ci-cd-compliance', reason: 'Backend deployment standards', priority: 4 }
        ],
        'django': [
            { skillId: '@ainative/python-expert', reason: 'Python backend detected', priority: 1 },
            { skillId: '@ainative/django-expert', reason: 'Django framework detected', priority: 1 },
            { skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
        ],
        'flask': [
            { skillId: '@ainative/python-expert', reason: 'Python backend detected', priority: 1 },
            { skillId: '@ainative/flask-expert', reason: 'Flask framework detected', priority: 1 },
            { skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
        ],
        'express': [
            { skillId: '@ainative/nodejs-expert', reason: 'Node.js backend detected', priority: 1 },
            { skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
        ],
        'nestjs': [
            { skillId: '@ainative/nestjs-expert', reason: 'NestJS framework detected', priority: 1 },
            { skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
        ]
    }; }
    constructor(fileService, workspaceService) {
        this.fileService = fileService;
        this.workspaceService = workspaceService;
    }
    async readSkillsConfig() {
        try {
            const mcpConfig = await this.readMCPConfig();
            return mcpConfig?.skills || null;
        }
        catch (error) {
            console.error('Error reading skills config:', error);
            return null;
        }
    }
    async writeSkillsConfig(config, merge = true) {
        try {
            // Validate configuration first
            const errors = this.validateConfig(config);
            if (errors.length > 0) {
                throw new Error(`Invalid skills configuration: ${errors.join(', ')}`);
            }
            let mcpConfig;
            if (merge) {
                // Merge with existing config
                const existing = await this.readMCPConfig();
                mcpConfig = existing || {};
                mcpConfig.skills = {
                    ...mcpConfig.skills,
                    ...config
                };
            }
            else {
                // Replace skills section
                const existing = await this.readMCPConfig();
                mcpConfig = existing || {};
                mcpConfig.skills = config;
            }
            await this.writeMCPConfig(mcpConfig);
        }
        catch (error) {
            console.error('Error writing skills config:', error);
            throw error;
        }
    }
    async detectProjectType() {
        const workspaceFolder = this.workspaceService.getWorkspace().folders[0];
        if (!workspaceFolder) {
            return {
                metadata: { projectType: 'unknown', languages: [], technologies: [] },
                confidence: 0,
                detectedFiles: []
            };
        }
        const detectedFiles = [];
        const languages = [];
        const technologies = [];
        let framework;
        let projectType = 'unknown';
        let confidence = 0;
        // Check for Node.js project
        const packageJsonUri = URI.joinPath(workspaceFolder.uri, 'package.json');
        if (await this.fileExists(packageJsonUri)) {
            detectedFiles.push('package.json');
            languages.push('javascript', 'typescript');
            confidence += 0.3;
            try {
                const content = await this.fileService.readFile(packageJsonUri);
                const packageJson = JSON.parse(content.value.toString());
                const allDeps = {
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies
                };
                // Detect framework
                if (allDeps['react']) {
                    framework = 'react';
                    projectType = 'frontend';
                    technologies.push('react');
                    confidence += 0.4;
                }
                else if (allDeps['next']) {
                    framework = 'next';
                    projectType = 'fullstack';
                    technologies.push('nextjs');
                    confidence += 0.4;
                }
                else if (allDeps['vue']) {
                    framework = 'vue';
                    projectType = 'frontend';
                    technologies.push('vue');
                    confidence += 0.4;
                }
                else if (allDeps['@angular/core']) {
                    framework = 'angular';
                    projectType = 'frontend';
                    technologies.push('angular');
                    confidence += 0.4;
                }
                else if (allDeps['express']) {
                    framework = 'express';
                    projectType = 'backend';
                    technologies.push('express');
                    confidence += 0.4;
                }
                else if (allDeps['@nestjs/core']) {
                    framework = 'nestjs';
                    projectType = 'backend';
                    technologies.push('nestjs');
                    confidence += 0.4;
                }
                // Check for TypeScript
                if (allDeps['typescript']) {
                    technologies.push('typescript');
                    confidence += 0.1;
                }
            }
            catch (error) {
                console.error('Error parsing package.json:', error);
            }
        }
        // Check for Python project
        const requirementsUri = URI.joinPath(workspaceFolder.uri, 'requirements.txt');
        if (await this.fileExists(requirementsUri)) {
            detectedFiles.push('requirements.txt');
            languages.push('python');
            confidence += 0.3;
            try {
                const content = await this.fileService.readFile(requirementsUri);
                const requirements = content.value.toString();
                if (requirements.includes('fastapi')) {
                    framework = 'fastapi';
                    projectType = 'backend';
                    technologies.push('fastapi');
                    confidence += 0.4;
                }
                else if (requirements.includes('django')) {
                    framework = 'django';
                    projectType = 'backend';
                    technologies.push('django');
                    confidence += 0.4;
                }
                else if (requirements.includes('flask')) {
                    framework = 'flask';
                    projectType = 'backend';
                    technologies.push('flask');
                    confidence += 0.4;
                }
            }
            catch (error) {
                console.error('Error reading requirements.txt:', error);
            }
        }
        // Check for Python pyproject.toml
        const pyprojectUri = URI.joinPath(workspaceFolder.uri, 'pyproject.toml');
        if (await this.fileExists(pyprojectUri)) {
            detectedFiles.push('pyproject.toml');
            if (!languages.includes('python')) {
                languages.push('python');
            }
            confidence += 0.2;
        }
        // Check for Rust project
        const cargoUri = URI.joinPath(workspaceFolder.uri, 'Cargo.toml');
        if (await this.fileExists(cargoUri)) {
            detectedFiles.push('Cargo.toml');
            languages.push('rust');
            projectType = 'backend';
            confidence += 0.3;
        }
        // Check for Java project
        const pomUri = URI.joinPath(workspaceFolder.uri, 'pom.xml');
        if (await this.fileExists(pomUri)) {
            detectedFiles.push('pom.xml');
            languages.push('java');
            projectType = 'backend';
            confidence += 0.3;
        }
        // Check for Go project
        const goModUri = URI.joinPath(workspaceFolder.uri, 'go.mod');
        if (await this.fileExists(goModUri)) {
            detectedFiles.push('go.mod');
            languages.push('go');
            projectType = 'backend';
            confidence += 0.3;
        }
        // Ensure confidence is capped at 1.0
        confidence = Math.min(confidence, 1.0);
        return {
            metadata: {
                projectType,
                framework,
                languages,
                technologies
            },
            confidence,
            detectedFiles
        };
    }
    async recommendSkills(projectMetadata) {
        const recommendations = [];
        const addedSkills = new Set();
        // Add framework-specific recommendations
        if (projectMetadata.framework && SkillConfigService_1.SKILL_RECOMMENDATIONS[projectMetadata.framework]) {
            const frameworkRecs = SkillConfigService_1.SKILL_RECOMMENDATIONS[projectMetadata.framework];
            frameworkRecs.forEach(rec => {
                if (!addedSkills.has(rec.skillId)) {
                    recommendations.push(rec);
                    addedSkills.add(rec.skillId);
                }
            });
        }
        // Add project-type-specific recommendations
        if (projectMetadata.projectType && projectMetadata.projectType !== 'unknown') {
            const typeRecs = [];
            switch (projectMetadata.projectType) {
                case 'backend':
                    typeRecs.push({ skillId: 'ci-cd-compliance', reason: 'Backend deployment best practices', priority: 3 }, { skillId: 'database-schema-sync', reason: 'Database management', priority: 4 });
                    break;
                case 'frontend':
                    typeRecs.push({ skillId: 'code-quality', reason: 'UI/UX code standards', priority: 3 });
                    break;
                case 'fullstack':
                    typeRecs.push({ skillId: 'ci-cd-compliance', reason: 'Full-stack deployment', priority: 3 }, { skillId: 'code-quality', reason: 'Code quality standards', priority: 4 });
                    break;
            }
            typeRecs.forEach(rec => {
                if (!addedSkills.has(rec.skillId)) {
                    recommendations.push(rec);
                    addedSkills.add(rec.skillId);
                }
            });
        }
        // Add universal recommendations if not already added
        const universalRecs = [
            { skillId: 'git-workflow', reason: 'Essential version control practices', priority: 2 },
            { skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
        ];
        universalRecs.forEach(rec => {
            if (!addedSkills.has(rec.skillId)) {
                recommendations.push(rec);
                addedSkills.add(rec.skillId);
            }
        });
        // Sort by priority
        return recommendations.sort((a, b) => a.priority - b.priority);
    }
    async getEnabledSkills() {
        const config = await this.readSkillsConfig();
        return config?.enabled || [];
    }
    async hasMCPConfig() {
        const workspaceFolder = this.workspaceService.getWorkspace().folders[0];
        if (!workspaceFolder) {
            return false;
        }
        const mcpConfigUri = URI.joinPath(workspaceFolder.uri, SkillConfigService_1.MCP_CONFIG_FILE);
        return this.fileExists(mcpConfigUri);
    }
    async initializeMCPConfig(includeSkills = true) {
        const mcpConfig = {
            mcpServers: {
                memory: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-memory']
                }
            }
        };
        if (includeSkills) {
            const detectionResult = await this.detectProjectType();
            const recommendations = await this.recommendSkills(detectionResult.metadata);
            mcpConfig.skills = {
                enabled: recommendations.slice(0, 5).map(r => r.skillId), // Enable top 5 recommendations
                autoLoad: true,
                metadata: detectionResult.metadata
            };
        }
        await this.writeMCPConfig(mcpConfig);
    }
    validateConfig(config) {
        const errors = [];
        if (!config.enabled || !Array.isArray(config.enabled)) {
            errors.push('enabled field must be an array');
        }
        else if (config.enabled.length === 0) {
            errors.push('enabled field cannot be empty');
        }
        else {
            // Validate skill identifiers
            config.enabled.forEach(skillId => {
                if (typeof skillId !== 'string' || skillId.trim().length === 0) {
                    errors.push(`Invalid skill identifier: ${skillId}`);
                }
            });
        }
        if (config.projectSpecific !== undefined) {
            if (!Array.isArray(config.projectSpecific)) {
                errors.push('projectSpecific field must be an array');
            }
            else {
                config.projectSpecific.forEach(path => {
                    if (typeof path !== 'string' || path.trim().length === 0) {
                        errors.push(`Invalid project-specific skill path: ${path}`);
                    }
                });
            }
        }
        if (config.autoLoad !== undefined && typeof config.autoLoad !== 'boolean') {
            errors.push('autoLoad field must be a boolean');
        }
        if (config.metadata !== undefined) {
            if (config.metadata.projectType !== undefined) {
                const validTypes = ['frontend', 'backend', 'fullstack', 'mobile', 'data', 'unknown'];
                if (!validTypes.includes(config.metadata.projectType)) {
                    errors.push(`Invalid projectType: ${config.metadata.projectType}`);
                }
            }
            if (config.metadata.languages !== undefined && !Array.isArray(config.metadata.languages)) {
                errors.push('metadata.languages must be an array');
            }
            if (config.metadata.technologies !== undefined && !Array.isArray(config.metadata.technologies)) {
                errors.push('metadata.technologies must be an array');
            }
        }
        return errors;
    }
    // Private helper methods
    async readMCPConfig() {
        const workspaceFolder = this.workspaceService.getWorkspace().folders[0];
        if (!workspaceFolder) {
            return null;
        }
        const mcpConfigUri = URI.joinPath(workspaceFolder.uri, SkillConfigService_1.MCP_CONFIG_FILE);
        if (!await this.fileExists(mcpConfigUri)) {
            return null;
        }
        try {
            const content = await this.fileService.readFile(mcpConfigUri);
            return JSON.parse(content.value.toString());
        }
        catch (error) {
            console.error('Error reading .mcp.json:', error);
            return null;
        }
    }
    async writeMCPConfig(config) {
        const workspaceFolder = this.workspaceService.getWorkspace().folders[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        const mcpConfigUri = URI.joinPath(workspaceFolder.uri, SkillConfigService_1.MCP_CONFIG_FILE);
        const content = JSON.stringify(config, null, 2);
        await this.fileService.writeFile(mcpConfigUri, VSBuffer.fromString(content));
    }
    async fileExists(uri) {
        try {
            await this.fileService.stat(uri);
            return true;
        }
        catch {
            return false;
        }
    }
};
SkillConfigService = SkillConfigService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IWorkspaceContextService)
], SkillConfigService);
export { SkillConfigService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxDb25maWdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxzL3NraWxsQ29uZmlnU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUd4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEU7O0dBRUc7QUFDSSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFrQjs7YUFHTixvQkFBZSxHQUFHLFdBQVcsQUFBZCxDQUFlO0lBRXRELGdDQUFnQzthQUNSLDBCQUFxQixHQUEwQztRQUN0RixPQUFPLEVBQUU7WUFDUixFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLEVBQUUsMEJBQTBCLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRTtZQUN0RixFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLCtCQUErQixFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUU7WUFDakYsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFO1lBQzNFLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRTtTQUMxRTtRQUNELE1BQU0sRUFBRTtZQUNQLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1B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