/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
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
import { PickerQuickAccessProvider, TriggerAction } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { localize } from '../../../../nls.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IDebugService } from '../common/debug.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { ADD_CONFIGURATION_ID, DEBUG_QUICK_ACCESS_PREFIX } from './debugCommands.js';
import { debugConfigure, debugRemoveConfig } from './debugIcons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
let StartDebugQuickAccessProvider = class StartDebugQuickAccessProvider extends PickerQuickAccessProvider {
    constructor(debugService, contextService, commandService, notificationService) {
        super(DEBUG_QUICK_ACCESS_PREFIX, {
            noResultsPick: {
                label: localize('noDebugResults', "No matching launch configurations")
            }
        });
        this.debugService = debugService;
        this.contextService = contextService;
        this.commandService = commandService;
        this.notificationService = notificationService;
    }
    async _getPicks(filter) {
        const picks = [];
        if (!this.debugService.getAdapterManager().hasEnabledDebuggers()) {
            return [];
        }
        picks.push({ type: 'separator', label: 'launch.json' });
        const configManager = this.debugService.getConfigurationManager();
        const selectedConfiguration = configManager.selectedConfiguration;
        // Entries: configs
        let lastGroup;
        for (const config of configManager.getAllConfigurations()) {
            const highlights = matchesFuzzy(filter, config.name, true);
            if (highlights) {
                const pick = {
                    label: config.name,
                    description: this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ ? config.launch.name : '',
                    highlights: { label: highlights },
                    buttons: [{
                            iconClass: ThemeIcon.asClassName(debugConfigure),
                            tooltip: localize('customizeLaunchConfig', "Configure Launch Configuration")
                        }],
                    trigger: () => {
                        config.launch.openConfigFile({ preserveFocus: false });
                        return TriggerAction.CLOSE_PICKER;
                    },
                    accept: async () => {
                        await configManager.selectConfiguration(config.launch, config.name);
                        try {
                            await this.debugService.startDebugging(config.launch, undefined, { startedByUser: true });
                        }
                        catch (error) {
                            this.notificationService.error(error);
                        }
                    }
                };
                // Most recently used configuration
                if (selectedConfiguration.name === config.name && selectedConfiguration.launch === config.launch) {
                    const separator = { type: 'separator', label: localize('mostRecent', 'Most Recent') };
                    picks.unshift(separator, pick);
                    continue;
                }
                // Separator
                if (lastGroup !== config.presentation?.group) {
                    picks.push({ type: 'separator' });
                    lastGroup = config.presentation?.group;
                }
                // Launch entry
                picks.push(pick);
            }
        }
        // Entries detected configurations
        const dynamicProviders = await configManager.getDynamicProviders();
        if (dynamicProviders.length > 0) {
            picks.push({
                type: 'separator', label: localize({
                    key: 'contributed',
                    comment: ['contributed is lower case because it looks better like that in UI. Nothing preceeds it. It is a name of the grouping of debug configurations.']
                }, "contributed")
            });
        }
        configManager.getRecentDynamicConfigurations().forEach(({ name, type }) => {
            const highlights = matchesFuzzy(filter, name, true);
            if (highlights) {
                picks.push({
                    label: name,
                    highlights: { label: highlights },
                    buttons: [{
                            iconClass: ThemeIcon.asClassName(debugRemoveConfig),
                            tooltip: localize('removeLaunchConfig', "Remove Launch Configuration")
                        }],
                    trigger: () => {
                        configManager.removeRecentDynamicConfigurations(name, type);
                        return TriggerAction.CLOSE_PICKER;
                    },
                    accept: async () => {
                        await configManager.selectConfiguration(undefined, name, undefined, { type });
                        try {
                            const { launch, getConfig } = configManager.selectedConfiguration;
                            const config = await getConfig();
                            await this.debugService.startDebugging(launch, config, { startedByUser: true });
                        }
                        catch (error) {
                            this.notificationService.error(error);
                        }
                    }
                });
            }
        });
        dynamicProviders.forEach(provider => {
            picks.push({
                label: `$(folder) ${provider.label}...`,
                ariaLabel: localize({ key: 'providerAriaLabel', comment: ['Placeholder stands for the provider label. For example "NodeJS".'] }, "{0} contributed configurations", provider.label),
                accept: async () => {
                    const pick = await provider.pick();
                    if (pick) {
                        // Use the type of the provider, not of the config since config sometimes have subtypes (for example "node-terminal")
                        await configManager.selectConfiguration(pick.launch, pick.config.name, pick.config, { type: provider.type });
                        this.debugService.startDebugging(pick.launch, pick.config, { startedByUser: true });
                    }
                }
            });
        });
        // Entries: launches
        const visibleLaunches = configManager.getLaunches().filter(launch => !launch.hidden);
        // Separator
        if (visibleLaunches.length > 0) {
            picks.push({ type: 'separator', label: localize('configure', "configure") });
        }
        for (const launch of visibleLaunches) {
            const label = this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ ?
                localize("addConfigTo", "Add Config ({0})...", launch.name) :
                localize('addConfiguration', "Add Configuration...");
            // Add Config entry
            picks.push({
                label,
                description: this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ ? launch.name : '',
                highlights: { label: matchesFuzzy(filter, label, true) ?? undefined },
                accept: () => this.commandService.executeCommand(ADD_CONFIGURATION_ID, launch.uri.toString())
            });
        }
        return picks;
    }
};
StartDebugQuickAccessProvider = __decorate([
    __param(0, IDebugService),
    __param(1, IWorkspaceContextService),
    __param(2, ICommandService),
    __param(3, INotificationService)
], StartDebugQuickAccessProvider);
export { StartDebugQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLHlCQUF5QixFQUEwQixhQUFhLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNoSixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSx3QkFBd0IsRUFBa0IsTUFBTSxvREFBb0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFMUQsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSx5QkFBaUQ7SUFFbkcsWUFDaUMsWUFBMkIsRUFDaEIsY0FBd0MsRUFDakQsY0FBK0IsRUFDMUIsbUJBQXlDO1FBRWhGLEtBQUssQ0FBQyx5QkFBeUIsRUFBRTtZQUNoQyxhQUFhLEVBQUU7Z0JBQ2QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxtQ0FB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