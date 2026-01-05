/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
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
                        constraint: (value) => typeof value === 'string' && value.length > 0,
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
    async run(accessor, source, options) {
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
            notificationService.info(localize('skillInstall.success', "Successfully installed skill '{0}' (version {1}) from {2}", result.skillName, result.version, result.sourceType));
        }
        catch (error) {
            // Show error notification
            const errorMessage = error instanceof Error ? error.message : String(error);
            notificationService.error(localize('skillInstall.error', "Failed to install skill: {0}", errorMessage));
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
                        constraint: (value) => typeof value === 'string' && value.length > 0,
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
    async run(accessor, skillName, options) {
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
                notificationService.info(localize('skillUninstall.success', "Successfully uninstalled skill '{0}'", result.skillName));
            }
        }
        catch (error) {
            // Show error notification (unless user cancelled)
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('cancelled')) {
                notificationService.error(localize('skillUninstall.error', "Failed to uninstall skill: {0}", errorMessage));
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
    async run(accessor) {
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
            const skillList = skills.map((skill) => {
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
        }
        catch (error) {
            // Show error notification
            const errorMessage = error instanceof Error ? error.message : String(error);
            notificationService.error(localize('skillList.error', "Failed to list skills: {0}", errorMessage));
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
                        constraint: (value) => typeof value === 'string' && value.length > 0,
                        schema: {
                            type: 'string',
                            pattern: '^[a-z0-9-]+$'
                        }
                    }
                ]
            }
        });
    }
    async run(accessor, skillName) {
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
            notificationService.error(localize('skillCreate.invalidName', "Invalid skill name: {0}", validation.error));
            return;
        }
        try {
            // Create the skill
            const result = await executeCreateCommand(skillName.trim(), fileService, envService);
            if (result.success) {
                // Show success notification
                notificationService.info(localize('skillCreate.success', "Successfully created skill '{0}' at {1}", result.skillName, result.skillPath));
                // Show detailed instructions
                const lines = result.output.split('\n');
                const instructions = lines.slice(5, 10).join('\n'); // Show key next steps
                notificationService.info(instructions);
            }
            else {
                // Show error notification
                notificationService.error(result.output);
            }
        }
        catch (error) {
            // Show error notification
            const errorMessage = error instanceof Error ? error.message : String(error);
            notificationService.error(localize('skillCreate.error', "Failed to create skill: {0}", errorMessage));
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
    async run(accessor, searchTerm, options) {
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
            notificationService.info(localize('skillMarketplaceBrowse.pending', 'Marketplace browse functionality requires marketplace services. Use the marketplace slash commands in chat for now.'));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            notificationService.error(localize('skillMarketplaceBrowse.error', 'Failed to browse marketplace: {0}', errorMessage));
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
    async run(accessor) {
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
                notificationService.info(localize('skillSync.success', 'Skills synced successfully! {0} updated, {1} new, {2} removed', result.refreshResult?.updated.length || 0, result.refreshResult?.new.length || 0, result.refreshResult?.removed.length || 0));
                // Show detailed output in info message
                if (result.output) {
                    console.log(result.output);
                }
            }
            else {
                // Show error notification
                notificationService.error(localize('skillSync.failed', 'Skills sync failed: {0}', result.errorMessage || 'Unknown error'));
                // Log detailed output
                if (result.output) {
                    console.error(result.output);
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            notificationService.error(localize('skillSync.error', 'Failed to sync skills: {0}', errorMessage));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxDb21tYW5kcy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvY2xpL3NraWxsQ29tbWFuZHMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUN0RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM5RCxPQUFPLFFBQVEsTUFBTSwyQ0FBMkMsQ0FBQztBQUVqRTs7R0FFRztBQUNILE1BQU0sbUJBQW9CLFNBQVEsT0FBTztJQUN4QztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3QkFBd0I7WUFDNUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO1lBQ2pELFFBQVEsRUFBRSxTQUFTLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQztZQUM5QyxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHFFQUFxRSxDQUFDO2dCQUN4SCxJQUFJLEVBQUU7b0JB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