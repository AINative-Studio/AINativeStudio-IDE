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
var TerminalQuickAccessProvider_1;
import { localize } from '../../../../../nls.js';
import { PickerQuickAccessProvider, TriggerAction } from '../../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { matchesFuzzy } from '../../../../../base/common/filters.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalService } from '../../../terminal/browser/terminal.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { killTerminalIcon, renameTerminalIcon } from '../../../terminal/browser/terminalIcons.js';
import { getColorClass, getIconId, getUriClasses } from '../../../terminal/browser/terminalIcon.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
let terminalPicks = [];
let TerminalQuickAccessProvider = class TerminalQuickAccessProvider extends PickerQuickAccessProvider {
    static { TerminalQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'term '; }
    constructor(_commandService, _editorService, _instantiationService, _terminalEditorService, _terminalGroupService, _terminalService, _themeService) {
        super(TerminalQuickAccessProvider_1.PREFIX, { canAcceptInBackground: true });
        this._commandService = _commandService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalGroupService = _terminalGroupService;
        this._terminalService = _terminalService;
        this._themeService = _themeService;
    }
    _getPicks(filter) {
        terminalPicks = [];
        terminalPicks.push({ type: 'separator', label: 'panel' });
        const terminalGroups = this._terminalGroupService.groups;
        for (let groupIndex = 0; groupIndex < terminalGroups.length; groupIndex++) {
            const terminalGroup = terminalGroups[groupIndex];
            for (let terminalIndex = 0; terminalIndex < terminalGroup.terminalInstances.length; terminalIndex++) {
                const terminal = terminalGroup.terminalInstances[terminalIndex];
                const pick = this._createPick(terminal, terminalIndex, filter, { groupIndex, groupSize: terminalGroup.terminalInstances.length });
                if (pick) {
                    terminalPicks.push(pick);
                }
            }
        }
        if (terminalPicks.length > 0) {
            terminalPicks.push({ type: 'separator', label: 'editor' });
        }
        const terminalEditors = this._terminalEditorService.instances;
        for (let editorIndex = 0; editorIndex < terminalEditors.length; editorIndex++) {
            const term = terminalEditors[editorIndex];
            term.target = TerminalLocation.Editor;
            const pick = this._createPick(term, editorIndex, filter);
            if (pick) {
                terminalPicks.push(pick);
            }
        }
        if (terminalPicks.length > 0) {
            terminalPicks.push({ type: 'separator' });
        }
        const createTerminalLabel = localize("workbench.action.terminal.newplus", "Create New Terminal");
        terminalPicks.push({
            label: `$(plus) ${createTerminalLabel}`,
            ariaLabel: createTerminalLabel,
            accept: () => this._commandService.executeCommand("workbench.action.terminal.new" /* TerminalCommandId.New */)
        });
        const createWithProfileLabel = localize("workbench.action.terminal.newWithProfilePlus", "Create New Terminal With Profile...");
        terminalPicks.push({
            label: `$(plus) ${createWithProfileLabel}`,
            ariaLabel: createWithProfileLabel,
            accept: () => this._commandService.executeCommand("workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */)
        });
        return terminalPicks;
    }
    _createPick(terminal, terminalIndex, filter, groupInfo) {
        const iconId = this._instantiationService.invokeFunction(getIconId, terminal);
        const index = groupInfo
            ? (groupInfo.groupSize > 1
                ? `${groupInfo.groupIndex + 1}.${terminalIndex + 1}`
                : `${groupInfo.groupIndex + 1}`)
            : `${terminalIndex + 1}`;
        const label = `$(${iconId}) ${index}: ${terminal.title}`;
        const iconClasses = [];
        const colorClass = getColorClass(terminal);
        if (colorClass) {
            iconClasses.push(colorClass);
        }
        const uriClasses = getUriClasses(terminal, this._themeService.getColorTheme().type);
        if (uriClasses) {
            iconClasses.push(...uriClasses);
        }
        const highlights = matchesFuzzy(filter, label, true);
        if (highlights) {
            return {
                label,
                description: terminal.description,
                highlights: { label: highlights },
                buttons: [
                    {
                        iconClass: ThemeIcon.asClassName(renameTerminalIcon),
                        tooltip: localize('renameTerminal', "Rename Terminal")
                    },
                    {
                        iconClass: ThemeIcon.asClassName(killTerminalIcon),
                        tooltip: terminalStrings.kill.value
                    }
                ],
                iconClasses,
                trigger: buttonIndex => {
                    switch (buttonIndex) {
                        case 0:
                            this._commandService.executeCommand("workbench.action.terminal.rename" /* TerminalCommandId.Rename */, terminal);
                            return TriggerAction.NO_ACTION;
                        case 1:
                            this._terminalService.safeDisposeTerminal(terminal);
                            return TriggerAction.REMOVE_ITEM;
                    }
                    return TriggerAction.NO_ACTION;
                },
                accept: (keyMod, event) => {
                    if (terminal.target === TerminalLocation.Editor) {
                        const existingEditors = this._editorService.findEditors(terminal.resource);
                        this._terminalEditorService.openEditor(terminal, { viewColumn: existingEditors?.[0].groupId });
                        this._terminalEditorService.setActiveInstance(terminal);
                    }
                    else {
                        this._terminalGroupService.showPanel(!event.inBackground);
                        this._terminalGroupService.setActiveInstance(terminal);
                    }
                }
            };
        }
        return undefined;
    }
};
TerminalQuickAccessProvider = TerminalQuickAccessProvider_1 = __decorate([
    __param(0, ICommandService),
    __param(1, IEditorService),
    __param(2, IInstantiationService),
    __param(3, ITerminalEditorService),
    __param(4, ITerminalGroupService),
    __param(5, ITerminalService),
    __param(6, IThemeService)
], TerminalQuickAccessProvider);
export { TerminalQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvcXVpY2tBY2Nlc3MvYnJvd3Nlci90ZXJtaW5hbFF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsT0FBTyxFQUEwQix5QkFBeUIsRUFBRSxhQUFhLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNuSixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDckUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHFCQUFxQixFQUFxQixnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUV0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENB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