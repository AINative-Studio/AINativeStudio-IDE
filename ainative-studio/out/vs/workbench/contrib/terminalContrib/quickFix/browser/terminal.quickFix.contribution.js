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
var TerminalQuickFixContribution_1;
import { DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { registerActiveInstanceAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import './media/terminalQuickFix.css';
import { ITerminalQuickFixService } from './quickFix.js';
import { TerminalQuickFixAddon } from './quickFixAddon.js';
import { freePort, gitCreatePr, gitFastForwardPull, gitPushSetUpstream, gitSimilar, gitTwoDashes, pwshGeneralError, pwshUnixCommandNotFoundError } from './terminalQuickFixBuiltinActions.js';
import { TerminalQuickFixService } from './terminalQuickFixService.js';
// #region Services
registerSingleton(ITerminalQuickFixService, TerminalQuickFixService, 1 /* InstantiationType.Delayed */);
// #endregion
// #region Contributions
let TerminalQuickFixContribution = class TerminalQuickFixContribution extends DisposableStore {
    static { TerminalQuickFixContribution_1 = this; }
    static { this.ID = 'quickFix'; }
    static get(instance) {
        return instance.getContribution(TerminalQuickFixContribution_1.ID);
    }
    get addon() { return this._addon; }
    constructor(_ctx, _instantiationService) {
        super();
        this._ctx = _ctx;
        this._instantiationService = _instantiationService;
        this._quickFixMenuItems = this.add(new MutableDisposable());
    }
    xtermReady(xterm) {
        // Create addon
        this._addon = this._instantiationService.createInstance(TerminalQuickFixAddon, undefined, this._ctx.instance.capabilities);
        xterm.raw.loadAddon(this._addon);
        // Hook up listeners
        this.add(this._addon.onDidRequestRerunCommand((e) => this._ctx.instance.runCommand(e.command, e.shouldExecute || false)));
        this.add(this._addon.onDidUpdateQuickFixes(e => {
            // Only track the latest command's quick fixes
            this._quickFixMenuItems.value = e.actions ? xterm.decorationAddon.registerMenuItems(e.command, e.actions) : undefined;
        }));
        // Register quick fixes
        for (const actionOption of [
            gitTwoDashes(),
            gitFastForwardPull(),
            freePort((port, command) => this._ctx.instance.freePortKillProcess(port, command)),
            gitSimilar(),
            gitPushSetUpstream(),
            gitCreatePr(),
            pwshUnixCommandNotFoundError(),
            pwshGeneralError()
        ]) {
            this._addon.registerCommandFinishedListener(actionOption);
        }
    }
};
TerminalQuickFixContribution = TerminalQuickFixContribution_1 = __decorate([
    __param(1, IInstantiationService)
], TerminalQuickFixContribution);
registerTerminalContribution(TerminalQuickFixContribution.ID, TerminalQuickFixContribution);
// #endregion
// #region Actions
var TerminalQuickFixCommandId;
(function (TerminalQuickFixCommandId) {
    TerminalQuickFixCommandId["ShowQuickFixes"] = "workbench.action.terminal.showQuickFixes";
})(TerminalQuickFixCommandId || (TerminalQuickFixCommandId = {}));
registerActiveInstanceAction({
    id: "workbench.action.terminal.showQuickFixes" /* TerminalQuickFixCommandId.ShowQuickFixes */,
    title: localize2('workbench.action.terminal.showQuickFixes', 'Show Terminal Quick Fixes'),
    precondition: TerminalContextKeys.focus,
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    run: (activeInstance) => TerminalQuickFixContribution.get(activeInstance)?.addon?.showMenu()
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwucXVpY2tGaXguY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9xdWlja0ZpeC9icm93c2VyL3Rlcm1pbmFsLnF1aWNrRml4LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFHdEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDNUYsT0FBTyxFQUFFLDRCQUE0QixFQUFxQyxNQUFNLGlEQUFpRCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3JGLE9BQU8sOEJBQThCLENBQUM7QUFDdEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5TCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV2RSxtQkFBbUI7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