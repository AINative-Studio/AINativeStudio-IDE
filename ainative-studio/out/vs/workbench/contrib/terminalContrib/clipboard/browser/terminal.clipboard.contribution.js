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
var TerminalClipboardContribution_1;
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITerminalConfigurationService } from '../../../terminal/browser/terminal.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { shouldPasteTerminalText } from './terminalClipboard.js';
import { Emitter } from '../../../../../base/common/event.js';
import { BrowserFeatures } from '../../../../../base/browser/canIUse.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { isLinux, isMacintosh } from '../../../../../base/common/platform.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { registerActiveInstanceAction, registerActiveXtermAction } from '../../../terminal/browser/terminalActions.js';
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { isString } from '../../../../../base/common/types.js';
// #region Terminal Contributions
let TerminalClipboardContribution = class TerminalClipboardContribution extends Disposable {
    static { TerminalClipboardContribution_1 = this; }
    static { this.ID = 'terminal.clipboard'; }
    static get(instance) {
        return instance.getContribution(TerminalClipboardContribution_1.ID);
    }
    constructor(_ctx, _clipboardService, _configurationService, _instantiationService, _notificationService, _terminalConfigurationService) {
        super();
        this._ctx = _ctx;
        this._clipboardService = _clipboardService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._notificationService = _notificationService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._overrideCopySelection = undefined;
        this._onWillPaste = this._register(new Emitter());
        this.onWillPaste = this._onWillPaste.event;
        this._onDidPaste = this._register(new Emitter());
        this.onDidPaste = this._onDidPaste.event;
    }
    xtermReady(xterm) {
        this._xterm = xterm;
        // TODO: This should be a different event on xterm, copying html should not share the requesting run command event
        this._register(xterm.onDidRequestCopyAsHtml(e => this.copySelection(true, e.command)));
        this._register(xterm.raw.onSelectionChange(async () => {
            if (this._configurationService.getValue("terminal.integrated.copyOnSelection" /* TerminalSettingId.CopyOnSelection */)) {
                if (this._overrideCopySelection === false) {
                    return;
                }
                if (this._ctx.instance.hasSelection()) {
                    await this.copySelection();
                }
            }
        }));
    }
    async copySelection(asHtml, command) {
        // TODO: Confirm this is fine that it's no longer awaiting xterm promise
        this._xterm?.copySelection(asHtml, command);
    }
    /**
     * Focuses and pastes the contents of the clipboard into the terminal instance.
     */
    async paste() {
        await this._paste(await this._clipboardService.readText());
    }
    /**
     * Focuses and pastes the contents of the selection clipboard into the terminal instance.
     */
    async pasteSelection() {
        await this._paste(await this._clipboardService.readText('selection'));
    }
    async _paste(value) {
        if (!this._xterm) {
            return;
        }
        let currentText = value;
        const shouldPasteText = await this._instantiationService.invokeFunction(shouldPasteTerminalText, currentText, this._xterm?.raw.modes.bracketedPasteMode);
        if (!shouldPasteText) {
            return;
        }
        if (typeof shouldPasteText === 'object') {
            currentText = shouldPasteText.modifiedText;
        }
        this._ctx.instance.focus();
        this._onWillPaste.fire(currentText);
        this._xterm.raw.paste(currentText);
        this._onDidPaste.fire(currentText);
    }
    async handleMouseEvent(event) {
        switch (event.button) {
            case 1: { // Middle click
                if (this._terminalConfigurationService.config.middleClickBehavior === 'paste') {
                    this.paste();
                    return { handled: true };
                }
                break;
            }
            case 2: { // Right click
                // Ignore shift click as it forces the context menu
                if (event.shiftKey) {
                    return;
                }
                const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
                if (rightClickBehavior !== 'copyPaste' && rightClickBehavior !== 'paste') {
                    return;
                }
                if (rightClickBehavior === 'copyPaste' && this._ctx.instance.hasSelection()) {
                    await this.copySelection();
                    this._ctx.instance.clearSelection();
                }
                else {
                    if (BrowserFeatures.clipboard.readText) {
                        this.paste();
                    }
                    else {
                        this._notificationService.info(`This browser doesn't support the clipboard.readText API needed to trigger a paste, try ${isMacintosh ? '⌘' : 'Ctrl'}+V instead.`);
                    }
                }
                // Clear selection after all click event bubbling is finished on Mac to prevent
                // right-click selecting a word which is seemed cannot be disabled. There is a
                // flicker when pasting but this appears to give the best experience if the
                // setting is enabled.
                if (isMacintosh) {
                    setTimeout(() => this._ctx.instance.clearSelection(), 0);
                }
                return { handled: true };
            }
        }
    }
    /**
     * Override the copy on selection feature with a custom value.
     * @param value Whether to enable copySelection.
     */
    overrideCopyOnSelection(value) {
        if (this._overrideCopySelection !== undefined) {
            throw new Error('Cannot set a copy on selection override multiple times');
        }
        this._overrideCopySelection = value;
        return toDisposable(() => this._overrideCopySelection = undefined);
    }
};
TerminalClipboardContribution = TerminalClipboardContribution_1 = __decorate([
    __param(1, IClipboardService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, INotificationService),
    __param(5, ITerminalConfigurationService)
], TerminalClipboardContribution);
export { TerminalClipboardContribution };
registerTerminalContribution(TerminalClipboardContribution.ID, TerminalClipboardContribution, false);
// #endregion
// #region Actions
const terminalAvailableWhenClause = ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated);
// TODO: Move these commands into this terminalContrib/
registerActiveInstanceAction({
    id: "workbench.action.terminal.copyLastCommand" /* TerminalCommandId.CopyLastCommand */,
    title: localize2('workbench.action.terminal.copyLastCommand', "Copy Last Command"),
    precondition: terminalAvailableWhenClause,
    run: async (instance, c, accessor) => {
        const clipboardService = accessor.get(IClipboardService);
        const commands = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands;
        if (!commands || commands.length === 0) {
            return;
        }
        const command = commands[commands.length - 1];
        if (!command.command) {
            return;
        }
        await clipboardService.writeText(command.command);
    }
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.copyLastCommandOutput" /* TerminalCommandId.CopyLastCommandOutput */,
    title: localize2('workbench.action.terminal.copyLastCommandOutput', "Copy Last Command Output"),
    precondition: terminalAvailableWhenClause,
    run: async (instance, c, accessor) => {
        const clipboardService = accessor.get(IClipboardService);
        const commands = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands;
        if (!commands || commands.length === 0) {
            return;
        }
        const command = commands[commands.length - 1];
        if (!command?.hasOutput()) {
            return;
        }
        const output = command.getOutput();
        if (isString(output)) {
            await clipboardService.writeText(output);
        }
    }
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.copyLastCommandAndLastCommandOutput" /* TerminalCommandId.CopyLastCommandAndLastCommandOutput */,
    title: localize2('workbench.action.terminal.copyLastCommandAndOutput', "Copy Last Command and Output"),
    precondition: terminalAvailableWhenClause,
    run: async (instance, c, accessor) => {
        const clipboardService = accessor.get(IClipboardService);
        const commands = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands;
        if (!commands || commands.length === 0) {
            return;
        }
        const command = commands[commands.length - 1];
        if (!command?.hasOutput()) {
            return;
        }
        const output = command.getOutput();
        if (isString(output)) {
            await clipboardService.writeText(`${command.command !== '' ? command.command + '\n' : ''}${output}`);
        }
    }
});
// Some commands depend on platform features
if (BrowserFeatures.clipboard.writeText) {
    registerActiveXtermAction({
        id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
        title: localize2('workbench.action.terminal.copySelection', 'Copy Selection'),
        // TODO: Why is copy still showing up when text isn't selected?
        precondition: ContextKeyExpr.or(TerminalContextKeys.textSelectedInFocused, ContextKeyExpr.and(terminalAvailableWhenClause, TerminalContextKeys.textSelected)),
        keybinding: [{
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.or(ContextKeyExpr.and(TerminalContextKeys.textSelected, TerminalContextKeys.focus), TerminalContextKeys.textSelectedInFocused)
            }],
        run: (activeInstance) => activeInstance.copySelection()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.copyAndClearSelection" /* TerminalCommandId.CopyAndClearSelection */,
        title: localize2('workbench.action.terminal.copyAndClearSelection', 'Copy and Clear Selection'),
        precondition: ContextKeyExpr.or(TerminalContextKeys.textSelectedInFocused, ContextKeyExpr.and(terminalAvailableWhenClause, TerminalContextKeys.textSelected)),
        keybinding: [{
                win: { primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.or(ContextKeyExpr.and(TerminalContextKeys.textSelected, TerminalContextKeys.focus), TerminalContextKeys.textSelectedInFocused)
            }],
        run: async (xterm) => {
            await xterm.copySelection();
            xterm.clearSelection();
        }
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
        title: localize2('workbench.action.terminal.copySelectionAsHtml', 'Copy Selection as HTML'),
        f1: true,
        category: terminalStrings.actionCategory,
        precondition: ContextKeyExpr.or(TerminalContextKeys.textSelectedInFocused, ContextKeyExpr.and(terminalAvailableWhenClause, TerminalContextKeys.textSelected)),
        run: (xterm) => xterm.copySelection(true)
    });
}
if (BrowserFeatures.clipboard.readText) {
    registerActiveInstanceAction({
        id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
        title: localize2('workbench.action.terminal.paste', 'Paste into Active Terminal'),
        precondition: terminalAvailableWhenClause,
        keybinding: [{
                primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                win: { primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */, secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 52 /* KeyCode.KeyV */] },
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 52 /* KeyCode.KeyV */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: TerminalContextKeys.focus
            }],
        run: (activeInstance) => TerminalClipboardContribution.get(activeInstance)?.paste()
    });
}
if (BrowserFeatures.clipboard.readText && isLinux) {
    registerActiveInstanceAction({
        id: "workbench.action.terminal.pasteSelection" /* TerminalCommandId.PasteSelection */,
        title: localize2('workbench.action.terminal.pasteSelection', 'Paste Selection into Active Terminal'),
        precondition: terminalAvailableWhenClause,
        keybinding: [{
                linux: { primary: 1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: TerminalContextKeys.focus
            }],
        run: (activeInstance) => TerminalClipboardContribution.get(activeInstance)?.pasteSelection()
    });
}
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY2xpcGJvYXJkLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jbGlwYm9hcmQvYnJvd3Nlci90ZXJtaW5hbC5jbGlwYm9hcmQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBb0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQTZCLDZCQUE2QixFQUFpRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hMLE9BQU8sRUFBRSw0QkFBNEIsRUFBMEYsTUFBTSxpREFBaUQsQ0FBQztBQUN2TCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFdkgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FB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