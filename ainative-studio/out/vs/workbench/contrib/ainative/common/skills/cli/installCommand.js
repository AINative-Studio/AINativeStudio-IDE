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
import { URI } from '../../../../../../base/common/uri.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { INativeEnvironmentService } from '../../../../../../platform/environment/common/environment.js';
import { IRequestService } from '../../../../../../platform/request/common/request.js';
import { IProgressService } from '../../../../../../platform/progress/common/progress.js';
import { ISkillsRegistry } from '../skillRegistryTypes.js';
import { ISkillParser } from '../skillParserTypes.js';
import { ISkillInstallService } from './cliTypes.js';
// import { VSBuffer } from '../../../../../../base/common/buffer.js'; // Unused import
import { joinPath } from '../../../../../../base/common/resources.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { asText } from '../../../../../../platform/request/common/request.js';
import * as path from '../../../../../../base/common/path.js';
import { tmpdir } from 'os';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { listenStream } from '../../../../../../base/common/stream.js';
/**
 * Service for installing skills from various sources
 */
let SkillInstallService = class SkillInstallService extends Disposable {
    constructor(fileService, registry, parser, requestService, progressService, envService) {
        super();
        this.fileService = fileService;
        this.registry = registry;
        this.parser = parser;
        this.requestService = requestService;
        this.progressService = progressService;
        this.envService = envService;
        // Set up paths: ~/.ainative/skills/
        const ainativeDir = joinPath(this.envService.userHome, '.ainative');
        this.skillsDir = joinPath(ainativeDir, 'skills');
    }
    /**
     * Install a skill from a source
     */
    async install(options) {
        const sourceType = this.detectSourceType(options.source);
        return this.progressService.withProgress({
            location: 15 /* ProgressLocation.Notification */,
            title: `Installing skill from ${sourceType}`,
            cancellable: true
        }, async (progress) => {
            progress.report({ message: 'Preparing installation...' });
            // Check if already installed (unless force flag is set)
            if (!options.force) {
                await this.checkNotAlreadyInstalled(options.source, sourceType);
            }
            // Download/copy to temporary location
            progress.report({ message: 'Downloading skill...' });
            const tempDir = await this.downloadToTemp(options.source, sourceType, CancellationToken.None);
            try {
                // Validate skill format
                if (!options.skipValidation) {
                    progress.report({ message: 'Validating skill format...' });
                    await this.validateSkill(tempDir);
                }
                // Parse skill metadata
                progress.report({ message: 'Reading skill metadata...' });
                const skillFileUri = joinPath(URI.file(tempDir), 'SKILL.md');
                const skill = await this.parser.parseSkillFile(skillFileUri.fsPath);
                // Check if skill with this name is already installed
                if (!options.force && await this.registry.isInstalled(skill.metadata.name)) {
                    throw new Error(`Skill '${skill.metadata.name}' is already installed. Use --force to reinstall.`);
                }
                // If force reinstall, uninstall first
                if (options.force && await this.registry.isInstalled(skill.metadata.name)) {
                    progress.report({ message: 'Removing existing installation...' });
                    await this.registry.uninstall(skill.metadata.name);
                }
                // Copy to final location
                progress.report({ message: 'Installing skill files...' });
                const targetDir = joinPath(this.skillsDir, skill.metadata.name);
                await this.ensureDirectoryExists(this.skillsDir);
                await this.fileService.copy(URI.file(tempDir), targetDir, true);
                // Register skill
                progress.report({ message: 'Registering skill...' });
                // entry is declared but not used in current implementation
                // const entry: RegistryEntry = {
                // 	name: skill.metadata.name,
                // 	version: skill.metadata.version || '1.0.0',
                // 	installedAt: Date.now(),
                // 	source: this.mapSourceTypeToRegistrySource(sourceType),
                // 	path: targetDir.fsPath
                // };
                // We need to add a way to register without re-parsing
                // For now, we'll use the install method but it will re-validate
                await this.registry.install(targetDir.fsPath);
                progress.report({ message: 'Installation complete!' });
                return {
                    skillName: skill.metadata.name,
                    version: skill.metadata.version || '1.0.0',
                    sourceType,
                    installPath: targetDir.fsPath
                };
            }
            finally {
                // Clean up temp directory
                try {
                    await this.fileService.del(URI.file(tempDir), { recursive: true });
                }
                catch (error) {
                    // Ignore cleanup errors
                }
            }
        });
    }
    /**
     * Uninstall a skill by name
     */
    async uninstall(options) {
        // This will be implemented in uninstallCommand.ts
        // For now, delegate to registry
        await this.registry.uninstall(options.skillName);
        return { skillName: options.skillName, success: true };
    }
    /**
     * Detect source type from source string
     */
    detectSourceType(source) {
        // URL: starts with http:// or https://
        if (source.startsWith('http://') || source.startsWith('https://')) {
            return 'url';
        }
        // GitHub: format owner/repo or github:owner/repo
        if (source.match(/^([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)$/) || source.startsWith('github:')) {
            return 'github';
        }
        // NPM: starts with @ (scoped package) or looks like a package name
        if (source.startsWith('@') || (source.match(/^[a-z0-9-]+$/) && !source.includes('/') && !source.includes('.'))) {
            return 'npm';
        }
        // Default to local path
        return 'local';
    }
    /**
     * Download or copy skill to temporary directory
     */
    async downloadToTemp(source, sourceType, token) {
        const tempDir = path.join(tmpdir(), 'ainative-skill-' + generateUuid());
        switch (sourceType) {
            case 'local':
                return this.copyLocalToTemp(source, tempDir);
            case 'npm':
                return this.downloadNpmToTemp(source, tempDir, token);
            case 'github':
                return this.downloadGithubToTemp(source, tempDir, token);
            case 'url':
                return this.downloadUrlToTemp(source, tempDir, token);
            default:
                throw new Error(`Unsupported source type: ${sourceType}`);
        }
    }
    /**
     * Copy local path to temp directory
     */
    async copyLocalToTemp(localPath, tempDir) {
        const sourceUri = URI.file(localPath);
        const tempUri = URI.file(tempDir);
        // Check if source exists
        try {
            const stat = await this.fileService.resolve(sourceUri);
            if (!stat) {
                throw new Error(`Path does not exist: ${localPath}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to access path: ${localPath}`);
        }
        // Copy to temp directory
        await this.fileService.copy(sourceUri, tempUri, true);
        return tempDir;
    }
    /**
     * Download NPM package to temp directory
     */
    async downloadNpmToTemp(packageName, tempDir, token) {
        // NPM registry URL
        const registryUrl = `https://registry.npmjs.org/${packageName}`;
        try {
            // Get package metadata
            const metadataResponse = await this.requestService.request({
                type: 'GET',
                url: registryUrl,
                headers: {
                    'Accept': 'application/json'
                }
            }, token);
            const metadataText = await asText(metadataResponse);
            if (!metadataText) {
                throw new Error('Failed to fetch package metadata');
            }
            const metadata = JSON.parse(metadataText);
            const latestVersion = metadata['dist-tags']?.latest;
            if (!latestVersion) {
                throw new Error('No latest version found for package');
            }
            const tarballUrl = metadata.versions[latestVersion]?.dist?.tarball;
            if (!tarballUrl) {
                throw new Error('No tarball URL found for package');
            }
            // Download tarball
            return this.downloadAndExtractTarball(tarballUrl, tempDir, token);
        }
        catch (error) {
            throw new Error(`Failed to download NPM package '${packageName}': ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Download GitHub repository to temp directory
     */
    async downloadGithubToTemp(repo, tempDir, token) {
        // Parse GitHub repo (remove 'github:' prefix if present)
        const repoPath = repo.replace(/^github:/, '');
        const [owner, repoName] = repoPath.split('/');
        if (!owner || !repoName) {
            throw new Error('Invalid GitHub repository format. Use: owner/repo');
        }
        // GitHub archive URL (main branch zip)
        const archiveUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/main.zip`;
        try {
            return this.downloadAndExtractZip(archiveUrl, tempDir, token);
        }
        catch (error) {
            // Try 'master' branch if 'main' fails
            const masterUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/master.zip`;
            try {
                return this.downloadAndExtractZip(masterUrl, tempDir, token);
            }
            catch (masterError) {
                throw new Error(`Failed to download GitHub repository '${repo}': Neither main nor master branch found`);
            }
        }
    }
    /**
     * Download from URL to temp directory
     */
    async downloadUrlToTemp(url, tempDir, token) {
        // Determine if it's a zip or tarball based on URL
        if (url.endsWith('.zip')) {
            return this.downloadAndExtractZip(url, tempDir, token);
        }
        else if (url.endsWith('.tar.gz') || url.endsWith('.tgz')) {
            return this.downloadAndExtractTarball(url, tempDir, token);
        }
        else {
            throw new Error('Unsupported URL format. Only .zip, .tar.gz, and .tgz files are supported.');
        }
    }
    /**
     * Download and extract a tarball
     */
    async downloadAndExtractTarball(url, targetDir, token) {
        // Note: Tarball extraction requires the 'tar' npm package which is not currently installed.
        // For NPM packages, the tarball from the registry contains a 'package/' directory that needs to be stripped.
        // We'll download and use a basic tar-stream implementation for now.
        const response = await this.requestService.request({
            type: 'GET',
            url
        }, token);
        if (response.res.statusCode !== 200) {
            throw new Error(`Failed to download tarball: HTTP ${response.res.statusCode}`);
        }
        // Download to temporary file first
        const fs = await import('fs');
        const tmpFile = path.join(tmpdir(), 'ainative-download-' + generateUuid() + '.tar.gz');
        // Write response to file
        const writeStream = fs.createWriteStream(tmpFile);
        await new Promise((resolve, reject) => {
            listenStream(response.stream, {
                onData: (chunk) => {
                    writeStream.write(Buffer.from(chunk.buffer));
                },
                onError: (err) => {
                    writeStream.end();
                    reject(err);
                },
                onEnd: () => {
                    writeStream.end();
                    resolve();
                }
            });
            writeStream.on('error', (err) => reject(err));
        });
        // For now, we'll extract using child_process and the system 'tar' command
        // This is a temporary solution until we can add the 'tar' npm package
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        try {
            // Create target directory
            await this.ensureDirectoryExists(URI.file(targetDir));
            // Extract tarball, stripping the first directory component (common for npm packages)
            await execAsync(`tar -xzf "${tmpFile}" --strip-components=1 -C "${targetDir}"`);
            // Clean up temp file
            try {
                fs.unlinkSync(tmpFile);
            }
            catch { /* ignore */ }
            return targetDir;
        }
        catch (error) {
            // Clean up on failure
            try {
                fs.unlinkSync(tmpFile);
            }
            catch { /* ignore */ }
            throw new Error(`Failed to extract tarball: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Download and extract a ZIP file
     */
    async downloadAndExtractZip(url, targetDir, token) {
        const response = await this.requestService.request({
            type: 'GET',
            url
        }, token);
        if (response.res.statusCode !== 200) {
            throw new Error(`Failed to download ZIP file: HTTP ${response.res.statusCode}`);
        }
        // Download to temporary file first
        const fs = await import('fs');
        const tmpFile = path.join(tmpdir(), 'ainative-download-' + generateUuid() + '.zip');
        // Write response to file
        const writeStream = fs.createWriteStream(tmpFile);
        await new Promise((resolve, reject) => {
            listenStream(response.stream, {
                onData: (chunk) => {
                    writeStream.write(Buffer.from(chunk.buffer));
                },
                onError: (err) => {
                    writeStream.end();
                    reject(err);
                },
                onEnd: () => {
                    writeStream.end();
                    resolve();
                }
            });
            writeStream.on('error', (err) => reject(err));
        });
        // Extract using yauzl
        const yauzl = await import('yauzl');
        return new Promise((resolve, reject) => {
            yauzl.open(tmpFile, { lazyEntries: true }, (err, zipfile) => {
                if (err || !zipfile) {
                    reject(new Error(`Failed to open ZIP file: ${err?.message}`));
                    return;
                }
                let firstEntry = true;
                let rootDir = '';
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    // Skip first directory level (common in GitHub archives)
                    if (firstEntry && entry.fileName.endsWith('/')) {
                        rootDir = entry.fileName;
                        firstEntry = false;
                        zipfile.readEntry();
                        return;
                    }
                    // Remove root directory prefix
                    let relativePath = entry.fileName;
                    if (rootDir && relativePath.startsWith(rootDir)) {
                        relativePath = relativePath.substring(rootDir.length);
                    }
                    if (!relativePath) {
                        zipfile.readEntry();
                        return;
                    }
                    const targetPath = path.join(targetDir, relativePath);
                    if (entry.fileName.endsWith('/')) {
                        // Directory entry
                        fs.mkdirSync(targetPath, { recursive: true });
                        zipfile.readEntry();
                    }
                    else {
                        // File entry
                        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err || !readStream) {
                                reject(new Error(`Failed to read ZIP entry: ${err?.message}`));
                                return;
                            }
                            const writeStream = fs.createWriteStream(targetPath);
                            // @ts-ignore - VSBufferReadableStream pipe compatibility
                            readStream.pipe(writeStream);
                            writeStream.on('finish', () => {
                                zipfile.readEntry();
                            });
                            writeStream.on('error', (err) => {
                                reject(new Error(`Failed to write file: ${err.message}`));
                            });
                        });
                    }
                });
                zipfile.on('end', () => {
                    // Clean up temp file
                    try {
                        fs.unlinkSync(tmpFile);
                    }
                    catch { /* ignore */ }
                    resolve(targetDir);
                });
                zipfile.on('error', (err) => {
                    reject(new Error(`ZIP extraction failed: ${err.message}`));
                });
            });
        });
    }
    /**
     * Validate skill directory has proper format
     */
    async validateSkill(skillDir) {
        const skillFileUri = joinPath(URI.file(skillDir), 'SKILL.md');
        // Check if SKILL.md exists
        try {
            const stat = await this.fileService.resolve(skillFileUri);
            if (!stat) {
                throw new Error('SKILL.md file not found in skill directory');
            }
        }
        catch (error) {
            throw new Error('Invalid skill format: SKILL.md file not found');
        }
        // Parse and validate
        const isValid = await this.parser.validateSkillFormat(skillFileUri.fsPath);
        if (!isValid) {
            throw new Error('Invalid skill format: SKILL.md does not follow the required format');
        }
    }
    /**
     * Check if skill is not already installed
     */
    async checkNotAlreadyInstalled(source, sourceType) {
        // For local paths, we can't easily determine the skill name without parsing
        // So we skip this check for local paths
        if (sourceType === 'local') {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        // For npm/github, we could potentially check, but for now skip
        // The actual check happens after we download and parse the skill
    }
    /**
     * Ensure a directory exists
     */
    async ensureDirectoryExists(uri) {
        try {
            const stat = await this.fileService.resolve(uri);
            if (!stat) {
                await this.fileService.createFolder(uri);
            }
        }
        catch (error) {
            // Directory doesn't exist, create it
            await this.fileService.createFolder(uri);
        }
    }
    /**
     * Map InstallSource to RegistrySource
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // @ts-expect-error - Unused variable
    mapSourceTypeToRegistrySource(sourceType) {
        switch (sourceType) {
            case 'local':
                return 'local';
            case 'npm':
                return 'npm';
            case 'github':
            case 'url':
                return 'git'; // Both github and url map to 'git' in registry
            default:
                return 'local';
        }
    }
};
SkillInstallService = __decorate([
    __param(0, IFileService),
    __param(1, ISkillsRegistry),
    __param(2, ISkillParser),
    __param(3, IRequestService),
    __param(4, IProgressService),
    __param(5, INativeEnvironmentService)
], SkillInstallService);
export { SkillInstallService };
// Register the service
registerSingleton(ISkillInstallService, SkillInstallService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbENvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvY2xpL2luc3RhbGxDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLCtEQUErRCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN6RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkYsT0FBTyxFQUFFLGdCQUFnQixFQUE4QyxNQUFNLHdEQUF3RCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFnRCxNQUFNLGVBQWUsQ0FBQztBQUNuRyx1RkFBdUY7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM5RSxPQUFPLEtBQUssSUFBSSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJ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