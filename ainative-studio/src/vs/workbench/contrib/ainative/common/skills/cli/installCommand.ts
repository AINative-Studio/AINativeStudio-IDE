/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../../../base/common/uri.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { INativeEnvironmentService } from '../../../../../../platform/environment/common/environment.js';
import { IRequestService } from '../../../../../../platform/request/common/request.js';
import { IProgressService, ProgressLocation, IProgress, IProgressStep } from '../../../../../../platform/progress/common/progress.js';
import { ISkillsRegistry } from '../skillRegistryTypes.js';
import { ISkillParser } from '../skillParserTypes.js';
import { ISkillInstallService, InstallOptions, InstallResult, InstallSource } from './cliTypes.js';
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
export class SkillInstallService extends Disposable implements ISkillInstallService {
	declare readonly _serviceBrand: undefined;

	private readonly skillsDir: URI;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@ISkillsRegistry private readonly registry: ISkillsRegistry,
		@ISkillParser private readonly parser: ISkillParser,
		@IRequestService private readonly requestService: IRequestService,
		@IProgressService private readonly progressService: IProgressService,
		@INativeEnvironmentService private readonly envService: INativeEnvironmentService
	) {
		super();

		// Set up paths: ~/.ainative/skills/
		const ainativeDir = joinPath(this.envService.userHome, '.ainative');
		this.skillsDir = joinPath(ainativeDir, 'skills');
	}

	/**
	 * Install a skill from a source
	 */
	async install(options: InstallOptions): Promise<InstallResult> {
		const sourceType = this.detectSourceType(options.source);

		return this.progressService.withProgress(
			{
				location: ProgressLocation.Notification,
				title: `Installing skill from ${sourceType}`,
				cancellable: true
			},
			async (progress: IProgress<IProgressStep>) => {
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
				} finally {
					// Clean up temp directory
					try {
						await this.fileService.del(URI.file(tempDir), { recursive: true });
					} catch (error) {
						// Ignore cleanup errors
					}
				}
			}
		);
	}

	/**
	 * Uninstall a skill by name
	 */
	async uninstall(options: { skillName: string; skipConfirmation?: boolean }): Promise<{ skillName: string; success: boolean }> {
		// This will be implemented in uninstallCommand.ts
		// For now, delegate to registry
		await this.registry.uninstall(options.skillName);
		return { skillName: options.skillName, success: true };
	}

	/**
	 * Detect source type from source string
	 */
	detectSourceType(source: string): InstallSource {
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
	private async downloadToTemp(source: string, sourceType: InstallSource, token: CancellationToken): Promise<string> {
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
	private async copyLocalToTemp(localPath: string, tempDir: string): Promise<string> {
		const sourceUri = URI.file(localPath);
		const tempUri = URI.file(tempDir);

		// Check if source exists
		try {
			const stat = await this.fileService.resolve(sourceUri);
			if (!stat) {
				throw new Error(`Path does not exist: ${localPath}`);
			}
		} catch (error) {
			throw new Error(`Failed to access path: ${localPath}`);
		}

		// Copy to temp directory
		await this.fileService.copy(sourceUri, tempUri, true);

		return tempDir;
	}

	/**
	 * Download NPM package to temp directory
	 */
	private async downloadNpmToTemp(packageName: string, tempDir: string, token: CancellationToken): Promise<string> {
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
		} catch (error) {
			throw new Error(`Failed to download NPM package '${packageName}': ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Download GitHub repository to temp directory
	 */
	private async downloadGithubToTemp(repo: string, tempDir: string, token: CancellationToken): Promise<string> {
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
		} catch (error) {
			// Try 'master' branch if 'main' fails
			const masterUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/master.zip`;
			try {
				return this.downloadAndExtractZip(masterUrl, tempDir, token);
			} catch (masterError) {
				throw new Error(`Failed to download GitHub repository '${repo}': Neither main nor master branch found`);
			}
		}
	}

	/**
	 * Download from URL to temp directory
	 */
	private async downloadUrlToTemp(url: string, tempDir: string, token: CancellationToken): Promise<string> {
		// Determine if it's a zip or tarball based on URL
		if (url.endsWith('.zip')) {
			return this.downloadAndExtractZip(url, tempDir, token);
		} else if (url.endsWith('.tar.gz') || url.endsWith('.tgz')) {
			return this.downloadAndExtractTarball(url, tempDir, token);
		} else {
			throw new Error('Unsupported URL format. Only .zip, .tar.gz, and .tgz files are supported.');
		}
	}

	/**
	 * Download and extract a tarball
	 */
	private async downloadAndExtractTarball(url: string, targetDir: string, token: CancellationToken): Promise<string> {
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
		await new Promise<void>((resolve, reject) => {
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
			} catch { /* ignore */ }

			return targetDir;
		} catch (error) {
			// Clean up on failure
			try {
				fs.unlinkSync(tmpFile);
			} catch { /* ignore */ }
			throw new Error(`Failed to extract tarball: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Download and extract a ZIP file
	 */
	private async downloadAndExtractZip(url: string, targetDir: string, token: CancellationToken): Promise<string> {
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
		await new Promise<void>((resolve, reject) => {
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
					} else {
						// File entry
						fs.mkdirSync(path.dirname(targetPath), { recursive: true });
						zipfile.openReadStream(entry, (err, readStream) => {
							if (err || !readStream) {
								reject(new Error(`Failed to read ZIP entry: ${err?.message}`));
								return;
							}

							const writeStream = fs.createWriteStream(targetPath);
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
					} catch { /* ignore */ }
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
	private async validateSkill(skillDir: string): Promise<void> {
		const skillFileUri = joinPath(URI.file(skillDir), 'SKILL.md');

		// Check if SKILL.md exists
		try {
			const stat = await this.fileService.resolve(skillFileUri);
			if (!stat) {
				throw new Error('SKILL.md file not found in skill directory');
			}
		} catch (error) {
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
	private async checkNotAlreadyInstalled(source: string, sourceType: InstallSource): Promise<void> {
		// For local paths, we can't easily determine the skill name without parsing
		// So we skip this check for local paths
		if (sourceType === 'local') {
			return;
		}

		// For npm/github, we could potentially check, but for now skip
		// The actual check happens after we download and parse the skill
	}

	/**
	 * Ensure a directory exists
	 */
	private async ensureDirectoryExists(uri: URI): Promise<void> {
		try {
			const stat = await this.fileService.resolve(uri);
			if (!stat) {
				await this.fileService.createFolder(uri);
			}
		} catch (error) {
			// Directory doesn't exist, create it
			await this.fileService.createFolder(uri);
		}
	}

	/**
	 * Map InstallSource to RegistrySource
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private mapSourceTypeToRegistrySource(sourceType: InstallSource): 'local' | 'npm' | 'git' {
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
}

// Register the service
registerSingleton(ISkillInstallService, SkillInstallService, InstantiationType.Delayed);
