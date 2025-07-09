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
var TerminalFindContribution_1;
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { findInFilesCommand } from '../../../search/browser/searchActionsFind.js';
import { ITerminalService, isDetachedTerminalInstance } from '../../../terminal/browser/terminal.js';
import { registerActiveInstanceAction, registerActiveXtermAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import './media/terminalFind.css';
import { TerminalFindWidget } from './terminalFindWidget.js';
// #region Terminal Contributions
let TerminalFindContribution = class TerminalFindContribution extends Disposable {
    static { TerminalFindContribution_1 = this; }
    static { this.ID = 'terminal.find'; }
    static get(instance) {
        return instance.getContribution(TerminalFindContribution_1.ID);
    }
    get findWidget() { return this._findWidget.value; }
    constructor(ctx, instantiationService, terminalService) {
        super();
        this._findWidget = new Lazy(() => {
            const findWidget = instantiationService.createInstance(TerminalFindWidget, ctx.instance);
            // Track focus and set state so we can force the scroll bar to be visible
            findWidget.focusTracker.onDidFocus(() => {
                TerminalFindContribution_1.activeFindWidget = this;
                ctx.instance.forceScrollbarVisibility();
                if (!isDetachedTerminalInstance(ctx.instance)) {
                    terminalService.setActiveInstance(ctx.instance);
                }
            });
            findWidget.focusTracker.onDidBlur(() => {
                TerminalFindContribution_1.activeFindWidget = undefined;
                ctx.instance.resetScrollbarVisibility();
            });
            if (!ctx.instance.domElement) {
                throw new Error('FindWidget expected terminal DOM to be initialized');
            }
            ctx.instance.domElement?.appendChild(findWidget.getDomNode());
            if (this._lastLayoutDimensions) {
                findWidget.layout(this._lastLayoutDimensions.width);
            }
            return findWidget;
        });
    }
    layout(_xterm, dimension) {
        this._lastLayoutDimensions = dimension;
        this._findWidget.rawValue?.layout(dimension.width);
    }
    xtermReady(xterm) {
        this._register(xterm.onDidChangeFindResults(() => this._findWidget.rawValue?.updateResultCount()));
    }
    dispose() {
        if (TerminalFindContribution_1.activeFindWidget === this) {
            TerminalFindContribution_1.activeFindWidget = undefined;
        }
        super.dispose();
        this._findWidget.rawValue?.dispose();
    }
};
TerminalFindContribution = TerminalFindContribution_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITerminalService)
], TerminalFindContribution);
registerTerminalContribution(TerminalFindContribution.ID, TerminalFindContribution, true);
// #endregion
// #region Actions
registerActiveXtermAction({
    id: "workbench.action.terminal.focusFind" /* TerminalFindCommandId.FindFocus */,
    title: localize2('workbench.action.terminal.focusFind', 'Focus Find'),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
        when: ContextKeyExpr.or(TerminalContextKeys.findFocus, TerminalContextKeys.focusInAny),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        contr?.findWidget.reveal();
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.hideFind" /* TerminalFindCommandId.FindHide */,
    title: localize2('workbench.action.terminal.hideFind', 'Hide Find'),
    keybinding: {
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
        when: ContextKeyExpr.and(TerminalContextKeys.focusInAny, TerminalContextKeys.findVisible),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        contr?.findWidget.hide();
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.toggleFindRegex" /* TerminalFindCommandId.ToggleFindRegex */,
    title: localize2('workbench.action.terminal.toggleFindRegex', 'Toggle Find Using Regex'),
    keybinding: {
        primary: 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */ },
        when: TerminalContextKeys.findVisible,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const state = contr?.findWidget.state;
        state?.change({ isRegex: !state.isRegex }, false);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.toggleFindWholeWord" /* TerminalFindCommandId.ToggleFindWholeWord */,
    title: localize2('workbench.action.terminal.toggleFindWholeWord', 'Toggle Find Using Whole Word'),
    keybinding: {
        primary: 512 /* KeyMod.Alt */ | 53 /* KeyCode.KeyW */,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 53 /* KeyCode.KeyW */ },
        when: TerminalContextKeys.findVisible,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const state = contr?.findWidget.state;
        state?.change({ wholeWord: !state.wholeWord }, false);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.toggleFindCaseSensitive" /* TerminalFindCommandId.ToggleFindCaseSensitive */,
    title: localize2('workbench.action.terminal.toggleFindCaseSensitive', 'Toggle Find Using Case Sensitive'),
    keybinding: {
        primary: 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */ },
        when: TerminalContextKeys.findVisible,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const state = contr?.findWidget.state;
        state?.change({ matchCase: !state.matchCase }, false);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.findNext" /* TerminalFindCommandId.FindNext */,
    title: localize2('workbench.action.terminal.findNext', 'Find Next'),
    keybinding: [
        {
            primary: 61 /* KeyCode.F3 */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, secondary: [61 /* KeyCode.F3 */] },
            when: ContextKeyExpr.or(TerminalContextKeys.focusInAny, TerminalContextKeys.findFocus),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        {
            primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
            when: TerminalContextKeys.findInputFocus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        }
    ],
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const widget = contr?.findWidget;
        if (widget) {
            widget.show();
            widget.find(false);
        }
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.findPrevious" /* TerminalFindCommandId.FindPrevious */,
    title: localize2('workbench.action.terminal.findPrevious', 'Find Previous'),
    keybinding: [
        {
            primary: 1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */, secondary: [1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */] },
            when: ContextKeyExpr.or(TerminalContextKeys.focusInAny, TerminalContextKeys.findFocus),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        {
            primary: 3 /* KeyCode.Enter */,
            when: TerminalContextKeys.findInputFocus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        }
    ],
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const widget = contr?.findWidget;
        if (widget) {
            widget.show();
            widget.find(true);
        }
    }
});
// Global workspace file search
registerActiveInstanceAction({
    id: "workbench.action.terminal.searchWorkspace" /* TerminalFindCommandId.SearchWorkspace */,
    title: localize2('workbench.action.terminal.searchWorkspace', 'Search Workspace'),
    keybinding: [
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */,
            when: ContextKeyExpr.and(TerminalContextKeys.processSupported, TerminalContextKeys.focus, TerminalContextKeys.textSelected),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50
        }
    ],
    run: (activeInstance, c, accessor) => findInFilesCommand(accessor, { query: activeInstance.selection })
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZmluZC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2ZpbmQvYnJvd3Nlci90ZXJtaW5hbC5maW5kLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFLaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBdUUsZ0JBQWdCLEVBQWtCLDBCQUEwQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUwsT0FBTyxFQUFFLDRCQUE0QixFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdkgsT0FBTyxFQUFFLDRCQUE0QixFQUEwRixNQUFNLGlEQUFpRCxDQUFDO0FBQ3ZMLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXJGLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFN0QsaUNBQWlDO0FBRWpDLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTs7YUFDaEMsT0FBRSxHQUFHLGVBQWUsQUFBbEIsQ0FB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