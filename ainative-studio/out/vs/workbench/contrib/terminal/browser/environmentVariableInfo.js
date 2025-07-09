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
import { ITerminalService } from './terminal.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import Severity from '../../../../base/common/severity.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
let EnvironmentVariableInfoStale = class EnvironmentVariableInfoStale {
    constructor(_diff, _terminalId, _collection, _terminalService, _extensionService) {
        this._diff = _diff;
        this._terminalId = _terminalId;
        this._collection = _collection;
        this._terminalService = _terminalService;
        this._extensionService = _extensionService;
        this.requiresAction = true;
    }
    _getInfo(scope) {
        const extSet = new Set();
        addExtensionIdentifiers(extSet, this._diff.added.values());
        addExtensionIdentifiers(extSet, this._diff.removed.values());
        addExtensionIdentifiers(extSet, this._diff.changed.values());
        let message = localize('extensionEnvironmentContributionInfoStale', "The following extensions want to relaunch the terminal to contribute to its environment:");
        message += getMergedDescription(this._collection, scope, this._extensionService, extSet);
        return message;
    }
    _getActions() {
        return [{
                label: localize('relaunchTerminalLabel', "Relaunch Terminal"),
                run: () => this._terminalService.getInstanceFromId(this._terminalId)?.relaunch(),
                commandId: "workbench.action.terminal.relaunch" /* TerminalCommandId.Relaunch */
            }];
    }
    getStatus(scope) {
        return {
            id: "relaunch-needed" /* TerminalStatus.RelaunchNeeded */,
            severity: Severity.Warning,
            icon: Codicon.warning,
            tooltip: this._getInfo(scope),
            hoverActions: this._getActions()
        };
    }
};
EnvironmentVariableInfoStale = __decorate([
    __param(3, ITerminalService),
    __param(4, IExtensionService)
], EnvironmentVariableInfoStale);
export { EnvironmentVariableInfoStale };
let EnvironmentVariableInfoChangesActive = class EnvironmentVariableInfoChangesActive {
    constructor(_collection, _commandService, _extensionService) {
        this._collection = _collection;
        this._commandService = _commandService;
        this._extensionService = _extensionService;
        this.requiresAction = false;
    }
    _getInfo(scope) {
        const extSet = new Set();
        addExtensionIdentifiers(extSet, this._collection.getVariableMap(scope).values());
        let message = localize('extensionEnvironmentContributionInfoActive', "The following extensions have contributed to this terminal's environment:");
        message += getMergedDescription(this._collection, scope, this._extensionService, extSet);
        return message;
    }
    _getActions(scope) {
        return [{
                label: localize('showEnvironmentContributions', "Show Environment Contributions"),
                run: () => this._commandService.executeCommand("workbench.action.terminal.showEnvironmentContributions" /* TerminalCommandId.ShowEnvironmentContributions */, scope),
                commandId: "workbench.action.terminal.showEnvironmentContributions" /* TerminalCommandId.ShowEnvironmentContributions */
            }];
    }
    getStatus(scope) {
        return {
            id: "env-var-info-changes-active" /* TerminalStatus.EnvironmentVariableInfoChangesActive */,
            severity: Severity.Info,
            tooltip: undefined, // The action is present when details aren't shown
            detailedTooltip: this._getInfo(scope),
            hoverActions: this._getActions(scope)
        };
    }
};
EnvironmentVariableInfoChangesActive = __decorate([
    __param(1, ICommandService),
    __param(2, IExtensionService)
], EnvironmentVariableInfoChangesActive);
export { EnvironmentVariableInfoChangesActive };
function getMergedDescription(collection, scope, extensionService, extSet) {
    const message = ['\n'];
    const globalDescriptions = collection.getDescriptionMap(undefined);
    const workspaceDescriptions = collection.getDescriptionMap(scope);
    for (const ext of extSet) {
        const globalDescription = globalDescriptions.get(ext);
        if (globalDescription) {
            message.push(`\n- \`${getExtensionName(ext, extensionService)}\``);
            message.push(`: ${globalDescription}`);
        }
        const workspaceDescription = workspaceDescriptions.get(ext);
        if (workspaceDescription) {
            // Only show '(workspace)' suffix if there is already a description for the extension.
            const workspaceSuffix = globalDescription ? ` (${localize('ScopedEnvironmentContributionInfo', 'workspace')})` : '';
            message.push(`\n- \`${getExtensionName(ext, extensionService)}${workspaceSuffix}\``);
            message.push(`: ${workspaceDescription}`);
        }
        if (!globalDescription && !workspaceDescription) {
            message.push(`\n- \`${getExtensionName(ext, extensionService)}\``);
        }
    }
    return message.join('');
}
function addExtensionIdentifiers(extSet, diff) {
    for (const mutators of diff) {
        for (const mutator of mutators) {
            extSet.add(mutator.extensionIdentifier);
        }
    }
}
function getExtensionName(id, extensionService) {
    return extensionService.extensions.find(e => e.id === id)?.displayName || id;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZUluZm8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci9lbnZpcm9ubWVudFZhcmlhYmxlSW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUc5RCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFL0UsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7SUFHeEMsWUFDa0IsS0FBK0MsRUFDL0MsV0FBbUIsRUFDbkIsV0FBaUQsRUFDaEQsZ0JBQW1ELEVBQ2xELGlCQUFxRDtRQUp2RCxVQUFLLEdBQUwsS0FBSyxDQUEwQztRQUMvQyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixnQkFBVyxHQUFYLFdBQVcsQ0FBc0M7UUFDL0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUNqQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBUGhFLG1CQUFjLEdBQUcsSUFBSSxDQUFDO0lBUy9CLENBQUM7SUFFTyxRQUFRLENBQUMsS0FBMkM7UUFDM0QsTUFBTSxNQUFNLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDdEMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDM0QsdUJBQXVCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDN0QsdUJBQXVCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFFN0QsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLDBGQUEwRixDQUFDLENBQUM7UUFDaEssT0FBTyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6RixPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRU8sV0FBVztRQUNsQixPQUFPLENBQUM7Z0JBQ1AsS0FBSyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxtQkFBbUIsQ0FBQztnQkFDN0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsUUFBUSxFQUFFO2dCQUNoRixTQUFTLHVFQUE0QjthQUNyQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsU0FBUyxDQUFDLEtBQTJDO1FBQ3BELE9BQU87WUFDTixFQUFFLHVEQUErQjtZQUNqQyxRQUFRLEVBQUUsUUFBUSxDQUFDLE9BQU87WUFDMUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPO1lBQ3JCLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUM3QixZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRTtTQUNoQyxDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUF4Q1ksNEJBQTRCO0lBT3RDLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxpQkFBaUIsQ0FBQTtHQVJQLDRCQUE0QixDQXdDeEM7O0FBRU0sSUFBTSxvQ0FBb0MsR0FBMUMsTUFBTSxvQ0FBb0M7SUFHaEQsWUFDa0IsV0FBaUQsRUFDakQsZUFBaUQsRUFDL0MsaUJBQXFEO1FBRnZELGdCQUFXLEdBQVgsV0FBVyxDQUFzQztRQUNoQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDOUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUxoRSxtQkFBYyxHQUFHLEtBQUssQ0FBQztJQU9oQyxDQUFDO0lBRU8sUUFBUSxDQUFDLEtBQTJDO1FBQzNELE1BQU0sTUFBTSxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3RDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRWpGLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSwyRUFBMkUsQ0FBQyxDQUFDO1FBQ2xKLE9BQU8sSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekYsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVPLFdBQVcsQ0FBQyxLQUEyQztRQUM5RCxPQUFPLENBQUM7Z0JBQ1AsS0FBSyxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxnQ0FBZ0MsQ0FBQztnQkFDakYsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxnSEFBaUQsS0FBSyxDQUFDO2dCQUNyRyxTQUFTLCtHQUFnRDthQUN6RCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsU0FBUyxDQUFDLEtBQTJDO1FBQ3BELE9BQU87WUFDTixFQUFFLHlGQUFxRDtZQUN2RCxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDdkIsT0FBTyxFQUFFLFNBQVMsRUFBRSxrREFBa0Q7WUFDdEUsZUFBZSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQ3JDLFlBQVksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztTQUNyQyxDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUFwQ1ksb0NBQW9DO0lBSzlDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtHQU5QLG9DQUFvQyxDQW9DaEQ7O0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxVQUFnRCxFQUFFLEtBQTJDLEVBQUUsZ0JBQW1DLEVBQUUsTUFBbUI7SUFDcEwsTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QixNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuRSxNQUFNLHFCQUFxQixHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsRSxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzFCLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25FLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDeEMsQ0FBQztRQUNELE1BQU0sb0JBQW9CLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVELElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQixzRkFBc0Y7WUFDdEYsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLG1DQUFtQyxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNwSCxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsZUFBZSxJQUFJLENBQUMsQ0FBQztZQUNyRixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFDRCxJQUFJLENBQUMsaUJBQWlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2pELE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEUsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDekIsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsTUFBbUIsRUFBRSxJQUFtRTtJQUN4SCxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksRUFBRSxDQUFDO1FBQzdCLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN6QyxDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLEVBQVUsRUFBRSxnQkFBbUM7SUFDeEUsT0FBTyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxXQUFXLElBQUksRUFBRSxDQUFDO0FBQzlFLENBQUMifQ==