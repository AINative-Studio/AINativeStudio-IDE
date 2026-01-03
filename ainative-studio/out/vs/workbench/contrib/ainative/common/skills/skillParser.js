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
import { URI } from '../../../../../base/common/uri.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ISkillParser } from './skillParserTypes.js';
import { SkillParseError } from './skillTypes.js';
import * as path from '../../../../../base/common/path.js';
/**
 * Service for parsing SKILL.md files following the Agent Skills specification
 */
let SkillParser = class SkillParser extends Disposable {
    constructor(fileService) {
        super();
        this.fileService = fileService;
    }
    /**
     * Parse a SKILL.md file and extract metadata, body, and resources
     */
    async parseSkillFile(filePath) {
        const uri = URI.file(filePath);
        // Read file contents
        let content;
        try {
            const fileContent = await this.fileService.readFile(uri);
            content = fileContent.value.toString();
        }
        catch (error) {
            throw new SkillParseError(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`, filePath);
        }
        // Extract frontmatter and body
        const { metadata, body } = this.extractFrontmatter(content, filePath);
        // Validate required fields
        this.validateMetadata(metadata, filePath);
        // Discover resources in the skill directory
        const skillDir = path.dirname(filePath);
        const resources = await this.discoverResources(skillDir);
        return {
            metadata,
            body,
            resources,
            fullPath: filePath
        };
    }
    /**
     * Validate that a file follows the SKILL.md format
     */
    async validateSkillFormat(filePath) {
        try {
            await this.parseSkillFile(filePath);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Extract YAML frontmatter from file content
     */
    extractFrontmatter(content, filePath) {
        // Check for frontmatter delimiters
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        if (!match) {
            throw new SkillParseError('Invalid SKILL.md format: missing YAML frontmatter delimiters (---)', filePath);
        }
        const frontmatterText = match[1];
        const body = match[2];
        // Parse YAML frontmatter manually (simple key: value format)
        const metadata = {};
        try {
            const lines = frontmatterText.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) {
                    continue; // Skip empty lines and comments
                }
                const colonIndex = trimmed.indexOf(':');
                if (colonIndex === -1) {
                    continue; // Skip invalid lines
                }
                const key = trimmed.substring(0, colonIndex).trim();
                let value = trimmed.substring(colonIndex + 1).trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                // Handle array values (tags)
                if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
                    const arrayContent = value.substring(1, value.length - 1);
                    metadata.tags = arrayContent.split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
                }
                else {
                    // Handle simple string values
                    switch (key) {
                        case 'name':
                            metadata.name = value;
                            break;
                        case 'description':
                            metadata.description = value;
                            break;
                        case 'version':
                            metadata.version = value;
                            break;
                        case 'author':
                            metadata.author = value;
                            break;
                        case 'license':
                            metadata.license = value;
                            break;
                    }
                }
            }
        }
        catch (error) {
            throw new SkillParseError(`Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`, filePath);
        }
        return {
            metadata: metadata,
            body: body.trim()
        };
    }
    /**
     * Discover bundled resources in skill directory
     */
    async discoverResources(skillDir) {
        const resources = [];
        const dirUri = URI.file(skillDir);
        try {
            const dirStat = await this.fileService.resolve(dirUri);
            if (!dirStat.children) {
                return resources;
            }
            // Check for references/, scripts/, and assets/ directories
            const resourceDirs = [
                { name: 'references', type: 'reference' },
                { name: 'scripts', type: 'script' },
                { name: 'assets', type: 'asset' }
            ];
            for (const resourceDir of resourceDirs) {
                const resourceDirChild = dirStat.children.find(child => child.name === resourceDir.name && child.isDirectory);
                if (resourceDirChild) {
                    // Resolve the resource directory to get its children
                    const resourceDirStat = await this.fileService.resolve(resourceDirChild.resource);
                    if (resourceDirStat.children) {
                        for (const file of resourceDirStat.children) {
                            if (!file.isDirectory) {
                                resources.push({
                                    type: resourceDir.type,
                                    path: file.resource.fsPath,
                                    name: file.name
                                });
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            // If directory doesn't exist or can't be read, just return empty resources
            // This is not a critical error
        }
        return resources;
    }
    /**
     * Validate required metadata fields
     */
    validateMetadata(metadata, filePath) {
        if (!metadata.name || metadata.name.trim() === '') {
            throw new SkillParseError('Missing required field: name', filePath);
        }
        if (!metadata.description || metadata.description.trim() === '') {
            throw new SkillParseError('Missing required field: description', filePath);
        }
    }
};
SkillParser = __decorate([
    __param(0, IFileService)
], SkillParser);
export { SkillParser };
// Register the service as a singleton
registerSingleton(ISkillParser, SkillParser, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvc2tpbGxQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0sNERBQTRELENBQUM7QUFDbEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNyRCxPQUFPLEVBQXVDLGVBQWUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZGLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUM7QUFFM0Q7O0dBRUc7QUFDSSxJQUFNLFdBQVcsR0FBakIsTUFBTSxXQUFZLFNBQVEsVUFBVTtJQUcxQyxZQUNnQyxXQUF5QjtRQUV4RCxLQUFLLEVBQUUsQ0FBQztRQUZ1QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztJQUd6RCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQWdCO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFL0IscUJBQXFCO1FBQ3JCLElBQUksT0FBZSxDQUFDO1FBQ3BCLElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekQsT0FBTyxHQUFH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