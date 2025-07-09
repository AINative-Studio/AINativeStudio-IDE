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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { FocusedViewContext, SidebarFocusContext } from '../../../common/contextkeys.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { HISTORY_VIEW_PANE_ID, ISCMViewService, REPOSITORIES_VIEW_PANE_ID, VIEW_PANE_ID } from '../common/scm.js';
export class SCMAccessibilityHelp {
    constructor() {
        this.name = 'scm';
        this.type = "help" /* AccessibleViewType.Help */;
        this.priority = 100;
        this.when = ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals('activeViewlet', 'workbench.view.scm'), SidebarFocusContext), ContextKeyExpr.equals(FocusedViewContext.key, REPOSITORIES_VIEW_PANE_ID), ContextKeyExpr.equals(FocusedViewContext.key, VIEW_PANE_ID), ContextKeyExpr.equals(FocusedViewContext.key, HISTORY_VIEW_PANE_ID));
    }
    getProvider(accessor) {
        const commandService = accessor.get(ICommandService);
        const scmViewService = accessor.get(ISCMViewService);
        const viewsService = accessor.get(IViewsService);
        return new SCMAccessibilityHelpContentProvider(commandService, scmViewService, viewsService);
    }
}
let SCMAccessibilityHelpContentProvider = class SCMAccessibilityHelpContentProvider extends Disposable {
    constructor(_commandService, _scmViewService, _viewsService) {
        super();
        this._commandService = _commandService;
        this._scmViewService = _scmViewService;
        this._viewsService = _viewsService;
        this.id = "scm" /* AccessibleViewProviderId.SourceControl */;
        this.verbositySettingKey = "accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
        this._focusedView = this._viewsService.getFocusedViewName();
    }
    onClose() {
        switch (this._focusedView) {
            case 'Source Control':
                this._commandService.executeCommand('workbench.scm');
                break;
            case 'Source Control Repositories':
                this._commandService.executeCommand('workbench.scm.repositories');
                break;
            case 'Source Control Graph':
                this._commandService.executeCommand('workbench.scm.history');
                break;
            default:
                this._commandService.executeCommand('workbench.view.scm');
        }
    }
    provideContent() {
        const content = [];
        // Active Repository State
        if (this._scmViewService.visibleRepositories.length > 1) {
            const repositoryList = this._scmViewService.visibleRepositories.map(r => r.provider.name).join(', ');
            content.push(localize('state-msg1', "Visible repositories: {0}", repositoryList));
        }
        const focusedRepository = this._scmViewService.focusedRepository;
        if (focusedRepository) {
            content.push(localize('state-msg2', "Repository: {0}", focusedRepository.provider.name));
            // History Item Reference
            const currentHistoryItemRef = focusedRepository.provider.historyProvider.get()?.historyItemRef.get();
            if (currentHistoryItemRef) {
                content.push(localize('state-msg3', "History item reference: {0}", currentHistoryItemRef.name));
            }
            // Commit Message
            if (focusedRepository.input.visible && focusedRepository.input.enabled && focusedRepository.input.value !== '') {
                content.push(localize('state-msg4', "Commit message: {0}", focusedRepository.input.value));
            }
            // Action Button
            const actionButton = focusedRepository.provider.actionButton.get();
            if (actionButton) {
                const label = actionButton.command.tooltip ?? actionButton.command.title;
                const enablementLabel = actionButton.enabled ? localize('enabled', "enabled") : localize('disabled', "disabled");
                content.push(localize('state-msg5', "Action button: {0}, {1}", label, enablementLabel));
            }
            // Resource Groups
            const resourceGroups = [];
            for (const resourceGroup of focusedRepository.provider.groups) {
                resourceGroups.push(`${resourceGroup.label} (${resourceGroup.resources.length} resource(s))`);
            }
            focusedRepository.provider.groups.map(g => g.label).join(', ');
            content.push(localize('state-msg6', "Resource groups: {0}", resourceGroups.join(', ')));
        }
        // Source Control Repositories
        content.push(localize('scm-repositories-msg1', "Use the \"Source Control: Focus on Source Control Repositories View\" command to open the Source Control Repositories view."));
        content.push(localize('scm-repositories-msg2', "The Source Control Repositories view lists all repositories from the workspace and is only shown when the workspace contains more than one repository."));
        content.push(localize('scm-repositories-msg3', "Once the Source Control Repositories view is opened you can:"));
        content.push(localize('scm-repositories-msg4', " - Use the up/down arrow keys to navigate the list of repositories."));
        content.push(localize('scm-repositories-msg5', " - Use the Enter or Space keys to select a repository."));
        content.push(localize('scm-repositories-msg6', " - Use Shift + up/down keys to select multiple repositories."));
        // Source Control
        content.push(localize('scm-msg1', "Use the \"Source Control: Focus on Source Control View\" command to open the Source Control view."));
        content.push(localize('scm-msg2', "The Source Control view displays the resource groups and resources of the repository. If the workspace contains more than one repository it will list the resource groups and resources of the repositories selected in the Source Control Repositories view."));
        content.push(localize('scm-msg3', "Once the Source Control view is opened you can:"));
        content.push(localize('scm-msg4', " - Use the up/down arrow keys to navigate the list of repositories, resource groups and resources."));
        content.push(localize('scm-msg5', " - Use the Space key to expand or collapse a resource group."));
        // Source Control Graph
        content.push(localize('scm-graph-msg1', "Use the \"Source Control: Focus on Source Control Graph View\" command to open the Source Control Graph view."));
        content.push(localize('scm-graph-msg2', "The Source Control Graph view displays a graph history items of the repository. If the workspace contains more than one repository it will list the history items of the active repository."));
        content.push(localize('scm-graph-msg3', "Once the Source Control Graph view is opened you can:"));
        content.push(localize('scm-graph-msg4', " - Use the up/down arrow keys to navigate the list of history items."));
        content.push(localize('scm-graph-msg5', " - Use the Space key to open the history item details in the multi-file diff editor."));
        return content.join('\n');
    }
};
SCMAccessibilityHelpContentProvider = __decorate([
    __param(0, ICommandService),
    __param(1, ISCMViewService),
    __param(2, IViewsService)
], SCMAccessibilityHelpContentProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtQWNjZXNzaWJpbGl0eUhlbHAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUc5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLHlCQUF5QixFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRWxILE1BQU0sT0FBTyxvQkFBb0I7SUFBakM7UUFDVSxTQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ2IsU0FBSSx3Q0FBMkI7UUFDL0IsYUFBUSxHQUFHLEdBQUcsQ0FBQztRQUNmLFNBQUksR0FBRyxjQUFjLENBQUMsRUFBRSxDQUNoQyxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEVBQUUsbUJBQW1CLENBQUMsRUFDckcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUseUJBQXlCLENBQUMsRUFDeEUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FB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