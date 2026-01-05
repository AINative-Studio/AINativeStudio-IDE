/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from '../../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { ISkillInstallService } from './cliTypes.js';
import { ISkillsRegistry } from '../skillRegistryTypes.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { SkillUninstallService } from './uninstallCommand.js';
import Severity from '../../../../../../base/common/severity.js';

/**
 * Skill Install Command
 */
class SkillInstallCommand extends Action2 {
	constructor() {
		super({
			id: 'ainative.skill.install',
			title: localize2('skillInstall', 'Install Skill'),
			category: localize2('skillCategory', 'Skills'),
			f1: true,
			metadata: {
				description: localize('skillInstall.description', 'Install a skill from various sources (local path, NPM, GitHub, URL)'),
				args: [
					{
						name: 'source',
						description: localize('skillInstall.source', 'Source to install from (local path, NPM package, GitHub repo, or URL)'),
						constraint: (value: any) => typeof value === 'string' && value.length > 0,
						schema: {
							type: 'string'
						}
					},
					{
						name: 'options',
						description: localize('skillInstall.options', 'Installation options'),
						isOptional: true,
						schema: {
							type: 'object',
							properties: {
								force: {
									type: 'boolean',
									description: localize('skillInstall.force', 'Force reinstall even if already installed')
								},
								skipValidation: {
									type: 'boolean',
									description: localize('skillInstall.skipValidation', 'Skip validation during install')
								}
							}
						}
					}
				]
			}
		});
	}

	async run(accessor: ServicesAccessor, source?: string, options?: { force?: boolean; skipValidation?: boolean }): Promise<void> {
		const notificationService = accessor.get(INotificationService);
		const installService = accessor.get(ISkillInstallService);

		// Validate input
		if (!source || typeof source !== 'string' || source.trim() === '') {
			notificationService.error(localize('skillInstall.noSource', 'Please provide a source to install from (local path, NPM package, GitHub repo, or URL)'));
			return;
		}

		try {
			// Install the skill
			const result = await installService.install({
				source: source.trim(),
				force: options?.force || false,
				skipValidation: options?.skipValidation || false
			});

			// Show success notification
			notificationService.info(
				localize(
					'skillInstall.success',
					"Successfully installed skill '{0}' (version {1}) from {2}",
					result.skillName,
					result.version,
					result.sourceType
				)
			);
		} catch (error) {
			// Show error notification
			const errorMessage = error instanceof Error ? error.message : String(error);
			notificationService.error(
				localize(
					'skillInstall.error',
					"Failed to install skill: {0}",
					errorMessage
				)
			);
		}
	}
}

/**
 * Skill Uninstall Command
 */
class SkillUninstallCommand extends Action2 {
	constructor() {
		super({
			id: 'ainative.skill.uninstall',
			title: localize2('skillUninstall', 'Uninstall Skill'),
			category: localize2('skillCategory', 'Skills'),
			f1: true,
			metadata: {
				description: localize('skillUninstall.description', 'Uninstall an installed skill'),
				args: [
					{
						name: 'skillName',
						description: localize('skillUninstall.skillName', 'Name of the skill to uninstall'),
						constraint: (value: any) => typeof value === 'string' && value.length > 0,
						schema: {
							type: 'string'
						}
					},
					{
						name: 'options',
						description: localize('skillUninstall.options', 'Uninstallation options'),
						isOptional: true,
						schema: {
							type: 'object',
							properties: {
								skipConfirmation: {
									type: 'boolean',
									description: localize('skillUninstall.skipConfirmation', 'Skip confirmation prompt')
								}
							}
						}
					}
				]
			}
		});
	}

	async run(accessor: ServicesAccessor, skillName?: string, options?: { skipConfirmation?: boolean }): Promise<void> {
		const notificationService = accessor.get(INotificationService);
		const registry = accessor.get(ISkillsRegistry);
		const dialogService = accessor.get(IDialogService);

		// Validate input
		if (!skillName || typeof skillName !== 'string' || skillName.trim() === '') {
			notificationService.error(localize('skillUninstall.noName', 'Please provide a skill name to uninstall'));
			return;
		}

		try {
			// Create uninstall service
			const uninstallService = new SkillUninstallService(registry, dialogService);

			// Uninstall the skill
			const result = await uninstallService.uninstall({
				skillName: skillName.trim(),
				skipConfirmation: options?.skipConfirmation || false
			});

			// Show success notification
			if (result.success) {
				notificationService.info(
					localize(
						'skillUninstall.success',
						"Successfully uninstalled skill '{0}'",
						result.skillName
					)
				);
			}
		} catch (error) {
			// Show error notification (unless user cancelled)
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (!errorMessage.includes('cancelled')) {
				notificationService.error(
					localize(
						'skillUninstall.error',
						"Failed to uninstall skill: {0}",
						errorMessage
					)
				);
			}
		}
	}
}

/**
 * Skill List Command
 */
class SkillListCommand extends Action2 {
	constructor() {
		super({
			id: 'ainative.skill.list',
			title: localize2('skillList', 'List Installed Skills'),
			category: localize2('skillCategory', 'Skills'),
			f1: true,
			metadata: {
				description: localize('skillList.description', 'List all installed skills with status and details')
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const notificationService = accessor.get(INotificationService);
		const registry = accessor.get(ISkillsRegistry);
		const dialogService = accessor.get(IDialogService);

		try {
			// Get list of installed skills
			const skills = await registry.list();

			if (skills.length === 0) {
				notificationService.info(localize('skillList.empty', 'No skills are currently installed.'));
				return;
			}

			// Format the list with better details
			const skillList = skills.map((skill: any) => {
				const installedDate = new Date(skill.installedAt).toLocaleDateString();
				return `• ${skill.name} (v${skill.version})\n  Source: ${skill.source} | Installed: ${installedDate}`;
			}).join('\n\n');

			// Show in a dialog
			await dialogService.prompt({
				type: Severity.Info,
				message: localize('skillList.title', 'Installed Skills ({0})', skills.length),
				detail: skillList,
				buttons: [
					{
						label: localize('skillList.ok', 'OK'),
						run: () => { }
					}
				]
			});
		} catch (error) {
			// Show error notification
			const errorMessage = error instanceof Error ? error.message : String(error);
			notificationService.error(
				localize(
					'skillList.error',
					"Failed to list skills: {0}",
					errorMessage
				)
			);
		}
	}
}

/**
 * Skill Create Command
 */
class SkillCreateCommand extends Action2 {
	constructor() {
		super({
			id: 'ainative.skill.create',
			title: localize2('skillCreate', 'Create New Skill'),
			category: localize2('skillCategory', 'Skills'),
			f1: true,
			metadata: {
				description: localize('skillCreate.description', 'Create a new skill template with proper directory structure'),
				args: [
					{
						name: 'skillName',
						description: localize('skillCreate.skillName', 'Name of the skill (lowercase, alphanumeric and hyphens only)'),
						constraint: (value: any) => typeof value === 'string' && value.length > 0,
						schema: {
							type: 'string',
							pattern: '^[a-z0-9-]+$'
						}
					}
				]
			}
		});
	}

	async run(accessor: ServicesAccessor, skillName?: string): Promise<void> {
		const notificationService = accessor.get(INotificationService);

		// Validate input
		if (!skillName || typeof skillName !== 'string' || skillName.trim() === '') {
			notificationService.error(localize('skillCreate.noName', 'Please provide a skill name (lowercase, alphanumeric and hyphens only)'));
			return;
		}

		// Import createCommand dynamically to avoid circular dependencies
		const { executeCreateCommand, validateSkillName } = await import('./createCommand.js');
		const { IFileService } = await import('../../../../../../platform/files/common/files.js');
		const { INativeEnvironmentService } = await import('../../../../../../platform/environment/common/environment.js');

		const fileService = accessor.get(IFileService);
		const envService = accessor.get(INativeEnvironmentService);

		// Validate skill name
		const validation = validateSkillName(skillName.trim());
		if (!validation.valid) {
			notificationService.error(
				localize(
					'skillCreate.invalidName',
					"Invalid skill name: {0}",
					validation.error
				)
			);
			return;
		}

		try {
			// Create the skill
			const result = await executeCreateCommand(skillName.trim(), fileService, envService);

			if (result.success) {
				// Show success notification
				notificationService.info(
					localize(
						'skillCreate.success',
						"Successfully created skill '{0}' at {1}",
						result.skillName,
						result.skillPath
					)
				);

				// Show detailed instructions
				const lines = result.output.split('\n');
				const instructions = lines.slice(5, 10).join('\n'); // Show key next steps
				notificationService.info(instructions);
			} else {
				// Show error notification
				notificationService.error(result.output);
			}
		} catch (error) {
			// Show error notification
			const errorMessage = error instanceof Error ? error.message : String(error);
			notificationService.error(
				localize(
					'skillCreate.error',
					"Failed to create skill: {0}",
					errorMessage
				)
			);
		}
	}
}

/**
 * Skill Marketplace Browse Command
 */
class SkillMarketplaceBrowseCommand extends Action2 {
	constructor() {
		super({
			id: 'ainative.skill.marketplace.browse',
			title: localize2('skillMarketplaceBrowse', 'Browse Skills Marketplace'),
			category: localize2('skillCategory', 'Skills'),
			f1: true,
			metadata: {
				description: localize('skillMarketplaceBrowse.description', 'Browse available skills from all marketplace sources'),
				args: [
					{
						name: 'searchTerm',
						description: localize('skillMarketplaceBrowse.searchTerm', 'Search term to filter skills'),
						isOptional: true,
						schema: {
							type: 'string'
						}
					},
					{
						name: 'options',
						description: localize('skillMarketplaceBrowse.options', 'Browse options'),
						isOptional: true,
						schema: {
							type: 'object',
							properties: {
								category: {
									type: 'string',
									description: localize('skillMarketplaceBrowse.category', 'Filter by category')
								},
								provider: {
									type: 'string',
									enum: ['official', 'anthropic', 'community'],
									description: localize('skillMarketplaceBrowse.provider', 'Filter by provider')
								},
								forceRefresh: {
									type: 'boolean',
									description: localize('skillMarketplaceBrowse.forceRefresh', 'Force refresh marketplace cache')
								}
							}
						}
					}
				]
			}
		});
	}

	async run(accessor: ServicesAccessor, searchTerm?: string, options?: {
		category?: string;
		provider?: 'official' | 'anthropic' | 'community';
		forceRefresh?: boolean;
	}): Promise<void> {
		const notificationService = accessor.get(INotificationService);
		// dialogService is declared but not used yet - keeping for future implementation
		// const dialogService = accessor.get(IDialogService);

		try {
			// Import marketplace command dynamically
			// MarketplaceCommand is imported but not used yet - keeping for future implementation
			// const { MarketplaceCommand } = await import('./marketplaceCommand.js');
			// const { ILogService } = await import('../../../../../../platform/log/common/log.js');

			// Get required services
			// logService is declared but not used yet - keeping for future implementation
			// const logService = accessor.get(ILogService);

			// This is a placeholder - in real implementation, we would inject the marketplace services
			// For now, show a message that this requires marketplace services to be initialized
			notificationService.info(
				localize(
					'skillMarketplaceBrowse.pending',
					'Marketplace browse functionality requires marketplace services. Use the marketplace slash commands in chat for now.'
				)
			);

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			notificationService.error(
				localize(
					'skillMarketplaceBrowse.error',
					'Failed to browse marketplace: {0}',
					errorMessage
				)
			);
		}
	}
}

/**
 * Skill Sync Command
 */
class SkillSyncCommand extends Action2 {
	constructor() {
		super({
			id: 'ainative.skill.sync',
			title: localize2('skillSync', 'Sync Skills from Core Repository'),
			category: localize2('skillCategory', 'Skills'),
			f1: true,
			metadata: {
				description: localize('skillSync.description', 'Sync skills from core repository when .claude is symlinked')
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const notificationService = accessor.get(INotificationService);
		const registry = accessor.get(ISkillsRegistry);

		try {
			// Import sync command dynamically
			const { SyncCommand } = await import('./syncCommand.js');
			const { INativeEnvironmentService } = await import('../../../../../../platform/environment/common/environment.js');
			const { ILogService } = await import('../../../../../../platform/log/common/log.js');

			const envService = accessor.get(INativeEnvironmentService);
			const logService = accessor.get(ILogService);

			// Create sync command instance
			const syncCommand = new SyncCommand(registry, envService, logService);

			// Execute sync
			const result = await syncCommand.execute();

			if (result.success) {
				// Show success notification
				notificationService.info(
					localize(
						'skillSync.success',
						'Skills synced successfully! {0} updated, {1} new, {2} removed',
						result.refreshResult?.updated.length || 0,
						result.refreshResult?.new.length || 0,
						result.refreshResult?.removed.length || 0
					)
				);

				// Show detailed output in info message
				if (result.output) {
					console.log(result.output);
				}
			} else {
				// Show error notification
				notificationService.error(
					localize(
						'skillSync.failed',
						'Skills sync failed: {0}',
						result.errorMessage || 'Unknown error'
					)
				);

				// Log detailed output
				if (result.output) {
					console.error(result.output);
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			notificationService.error(
				localize(
					'skillSync.error',
					'Failed to sync skills: {0}',
					errorMessage
				)
			);
		}
	}
}

// Register all commands
registerAction2(SkillInstallCommand);
registerAction2(SkillUninstallCommand);
registerAction2(SkillListCommand);
registerAction2(SkillCreateCommand);
registerAction2(SkillMarketplaceBrowseCommand);
registerAction2(SkillSyncCommand);
