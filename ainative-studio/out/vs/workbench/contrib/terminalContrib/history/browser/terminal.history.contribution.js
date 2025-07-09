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
var TerminalHistoryContribution_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { registerActiveInstanceAction, registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { clearShellFileHistory, getCommandHistory, getDirectoryHistory } from '../common/history.js';
import { showRunRecentQuickPick } from './terminalRunRecentQuickPick.js';
// #region Terminal Contributions
let TerminalHistoryContribution = class TerminalHistoryContribution extends Disposable {
    static { TerminalHistoryContribution_1 = this; }
    static { this.ID = 'terminal.history'; }
    static get(instance) {
        return instance.getContribution(TerminalHistoryContribution_1.ID);
    }
    constructor(_ctx, contextKeyService, _instantiationService) {
        super();
        this._ctx = _ctx;
        this._instantiationService = _instantiationService;
        this._terminalInRunCommandPicker = TerminalContextKeys.inTerminalRunCommandPicker.bindTo(contextKeyService);
        this._register(_ctx.instance.capabilities.onDidAddCapabilityType(e => {
            switch (e) {
                case 0 /* TerminalCapability.CwdDetection */: {
                    const cwdDetection = _ctx.instance.capabilities.get(0 /* TerminalCapability.CwdDetection */);
                    if (!cwdDetection) {
                        return;
                    }
                    this._register(cwdDetection.onDidChangeCwd(e => {
                        this._instantiationService.invokeFunction(getDirectoryHistory)?.add(e, { remoteAuthority: _ctx.instance.remoteAuthority });
                    }));
                    break;
                }
                case 2 /* TerminalCapability.CommandDetection */: {
                    const commandDetection = _ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
                    if (!commandDetection) {
                        return;
                    }
                    this._register(commandDetection.onCommandFinished(e => {
                        if (e.command.trim().length > 0) {
                            this._instantiationService.invokeFunction(getCommandHistory)?.add(e.command, { shellType: _ctx.instance.shellType });
                        }
                    }));
                    break;
                }
            }
        }));
    }
    /**
     * Triggers a quick pick that displays recent commands or cwds. Selecting one will
     * rerun it in the active terminal.
     */
    async runRecent(type, filterMode, value) {
        return this._instantiationService.invokeFunction(showRunRecentQuickPick, this._ctx.instance, this._terminalInRunCommandPicker, type, filterMode, value);
    }
};
TerminalHistoryContribution = TerminalHistoryContribution_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService)
], TerminalHistoryContribution);
registerTerminalContribution(TerminalHistoryContribution.ID, TerminalHistoryContribution);
// #endregion
// #region Actions
const precondition = ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated);
registerTerminalAction({
    id: "workbench.action.terminal.clearPreviousSessionHistory" /* TerminalHistoryCommandId.ClearPreviousSessionHistory */,
    title: localize2('workbench.action.terminal.clearPreviousSessionHistory', 'Clear Previous Session History'),
    precondition,
    run: async (c, accessor) => {
        getCommandHistory(accessor).clear();
        clearShellFileHistory();
    }
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.goToRecentDirectory" /* TerminalHistoryCommandId.GoToRecentDirectory */,
    title: localize2('workbench.action.terminal.goToRecentDirectory', 'Go to Recent Directory...'),
    metadata: {
        description: localize2('goToRecentDirectory.metadata', 'Goes to a recent folder'),
    },
    precondition,
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */,
        when: TerminalContextKeys.focus,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    run: async (activeInstance, c) => {
        const history = TerminalHistoryContribution.get(activeInstance);
        if (!history) {
            return;
        }
        await history.runRecent('cwd');
        if (activeInstance?.target === TerminalLocation.Editor) {
            await c.editorService.revealActiveEditor();
        }
        else {
            await c.groupService.showPanel(false);
        }
    }
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.runRecentCommand" /* TerminalHistoryCommandId.RunRecentCommand */,
    title: localize2('workbench.action.terminal.runRecentCommand', 'Run Recent Command...'),
    precondition,
    keybinding: [
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
            when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ContextKeyExpr.or(TerminalContextKeys.focus, ContextKeyExpr.and(accessibleViewIsShown, accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */)))),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */ },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        }
    ],
    run: async (activeInstance, c) => {
        const history = TerminalHistoryContribution.get(activeInstance);
        if (!history) {
            return;
        }
        await history.runRecent('command');
        if (activeInstance?.target === TerminalLocation.Editor) {
            await c.editorService.revealActiveEditor();
        }
        else {
            await c.groupService.showPanel(false);
        }
    }
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuaGlzdG9yeS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2hpc3RvcnkvYnJvd3Nlci90ZXJtaW5hbC5oaXN0b3J5LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVsRCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFvQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9ILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBR3RHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRXRJLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3BILE9BQU8sRUFBRSw0QkFBNEIsRUFBcUMsTUFBTSxpREFBaUQsQ0FBQztBQUNsSSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVyRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUV6RSxpQ0FBaUM7QUFFakMsSUFB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