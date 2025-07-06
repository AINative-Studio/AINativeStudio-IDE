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
var TextAreaSyncContribution_1, TerminalAccessibleViewContribution_1;
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { localize2 } from '../../../../../nls.js';
import { IAccessibleViewService } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { AccessibilityHelpAction, AccessibleViewAction } from '../../../accessibility/browser/accessibleViewActions.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { BufferContentTracker } from './bufferContentTracker.js';
import { TerminalAccessibilityHelpProvider } from './terminalAccessibilityHelp.js';
import { TerminalAccessibleBufferProvider } from './terminalAccessibleBufferProvider.js';
import { TextAreaSyncAddon } from './textAreaSyncAddon.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
// #region Terminal Contributions
let TextAreaSyncContribution = class TextAreaSyncContribution extends DisposableStore {
    static { TextAreaSyncContribution_1 = this; }
    static { this.ID = 'terminal.textAreaSync'; }
    static get(instance) {
        return instance.getContribution(TextAreaSyncContribution_1.ID);
    }
    constructor(_ctx, _instantiationService) {
        super();
        this._ctx = _ctx;
        this._instantiationService = _instantiationService;
    }
    layout(xterm) {
        if (this._addon) {
            return;
        }
        this._addon = this.add(this._instantiationService.createInstance(TextAreaSyncAddon, this._ctx.instance.capabilities));
        xterm.raw.loadAddon(this._addon);
        this._addon.activate(xterm.raw);
    }
};
TextAreaSyncContribution = TextAreaSyncContribution_1 = __decorate([
    __param(1, IInstantiationService)
], TextAreaSyncContribution);
registerTerminalContribution(TextAreaSyncContribution.ID, TextAreaSyncContribution);
let TerminalAccessibleViewContribution = class TerminalAccessibleViewContribution extends Disposable {
    static { TerminalAccessibleViewContribution_1 = this; }
    static { this.ID = 'terminal.accessibleBufferProvider'; }
    static get(instance) {
        return instance.getContribution(TerminalAccessibleViewContribution_1.ID);
    }
    constructor(_ctx, _accessibilitySignalService, _accessibleViewService, _configurationService, _contextKeyService, _instantiationService, _terminalService) {
        super();
        this._ctx = _ctx;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._accessibleViewService = _accessibleViewService;
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._terminalService = _terminalService;
        this._onDidRunCommand = this._register(new MutableDisposable());
        this._register(AccessibleViewAction.addImplementation(90, 'terminal', () => {
            if (this._terminalService.activeInstance !== this._ctx.instance) {
                return false;
            }
            this.show();
            return true;
        }, TerminalContextKeys.focus));
        this._register(this._ctx.instance.onDidExecuteText(() => {
            const focusAfterRun = _configurationService.getValue("terminal.integrated.focusAfterRun" /* TerminalSettingId.FocusAfterRun */);
            if (focusAfterRun === 'terminal') {
                this._ctx.instance.focus(true);
            }
            else if (focusAfterRun === 'accessible-buffer') {
                this.show();
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */)) {
                this._updateCommandExecutedListener();
            }
        }));
        this._register(this._ctx.instance.capabilities.onDidAddCapability(e => {
            if (e.capability.type === 2 /* TerminalCapability.CommandDetection */) {
                this._updateCommandExecutedListener();
            }
        }));
    }
    xtermReady(xterm) {
        const addon = this._instantiationService.createInstance(TextAreaSyncAddon, this._ctx.instance.capabilities);
        xterm.raw.loadAddon(addon);
        addon.activate(xterm.raw);
        this._xterm = xterm;
        this._register(this._xterm.raw.onWriteParsed(async () => {
            if (this._terminalService.activeInstance !== this._ctx.instance) {
                return;
            }
            if (this._isTerminalAccessibleViewOpen() && this._xterm.raw.buffer.active.baseY === 0) {
                this.show();
            }
        }));
        const onRequestUpdateEditor = Event.latch(this._xterm.raw.onScroll);
        this._register(onRequestUpdateEditor(() => {
            if (this._terminalService.activeInstance !== this._ctx.instance) {
                return;
            }
            if (this._isTerminalAccessibleViewOpen()) {
                this.show();
            }
        }));
    }
    _updateCommandExecutedListener() {
        if (!this._ctx.instance.capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            return;
        }
        if (!this._configurationService.getValue("terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */)) {
            this._onDidRunCommand.clear();
            return;
        }
        else if (this._onDidRunCommand.value) {
            return;
        }
        const capability = this._ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        this._onDidRunCommand.value = capability.onCommandExecuted(() => {
            if (this._ctx.instance.hasFocus) {
                this.show();
            }
        });
    }
    _isTerminalAccessibleViewOpen() {
        return accessibleViewCurrentProviderId.getValue(this._contextKeyService) === "terminal" /* AccessibleViewProviderId.Terminal */;
    }
    show() {
        if (!this._xterm) {
            return;
        }
        if (!this._bufferTracker) {
            this._bufferTracker = this._register(this._instantiationService.createInstance(BufferContentTracker, this._xterm));
        }
        if (!this._bufferProvider) {
            this._bufferProvider = this._register(this._instantiationService.createInstance(TerminalAccessibleBufferProvider, this._ctx.instance, this._bufferTracker, () => {
                return this._register(this._instantiationService.createInstance(TerminalAccessibilityHelpProvider, this._ctx.instance, this._xterm)).provideContent();
            }));
        }
        const position = this._configurationService.getValue("terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */) ? this._accessibleViewService.getPosition("terminal" /* AccessibleViewProviderId.Terminal */) : undefined;
        this._accessibleViewService.show(this._bufferProvider, position);
    }
    navigateToCommand(type) {
        const currentLine = this._accessibleViewService.getPosition("terminal" /* AccessibleViewProviderId.Terminal */)?.lineNumber;
        const commands = this._getCommandsWithEditorLine();
        if (!commands?.length || !currentLine) {
            return;
        }
        const filteredCommands = type === "previous" /* NavigationType.Previous */ ? commands.filter(c => c.lineNumber < currentLine).sort((a, b) => b.lineNumber - a.lineNumber) : commands.filter(c => c.lineNumber > currentLine).sort((a, b) => a.lineNumber - b.lineNumber);
        if (!filteredCommands.length) {
            return;
        }
        const command = filteredCommands[0];
        const commandLine = command.command.command;
        if (!isWindows && commandLine) {
            this._accessibleViewService.setPosition(new Position(command.lineNumber, 1), true);
            alert(commandLine);
        }
        else {
            this._accessibleViewService.setPosition(new Position(command.lineNumber, 1), true, true);
        }
        if (command.exitCode) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalCommandFailed);
        }
        else {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalCommandSucceeded);
        }
    }
    _getCommandsWithEditorLine() {
        const capability = this._ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const commands = capability?.commands;
        const currentCommand = capability?.currentCommand;
        if (!commands?.length) {
            return;
        }
        const result = [];
        for (const command of commands) {
            const lineNumber = this._getEditorLineForCommand(command);
            if (!lineNumber) {
                continue;
            }
            result.push({ command, lineNumber, exitCode: command.exitCode });
        }
        if (currentCommand) {
            const lineNumber = this._getEditorLineForCommand(currentCommand);
            if (!!lineNumber) {
                result.push({ command: currentCommand, lineNumber });
            }
        }
        return result;
    }
    _getEditorLineForCommand(command) {
        if (!this._bufferTracker) {
            return;
        }
        let line;
        if ('marker' in command) {
            line = command.marker?.line;
        }
        else if ('commandStartMarker' in command) {
            line = command.commandStartMarker?.line;
        }
        if (line === undefined || line < 0) {
            return;
        }
        line = this._bufferTracker.bufferToEditorLineMapping.get(line);
        if (line === undefined) {
            return;
        }
        return line + 1;
    }
};
TerminalAccessibleViewContribution = TerminalAccessibleViewContribution_1 = __decorate([
    __param(1, IAccessibilitySignalService),
    __param(2, IAccessibleViewService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IInstantiationService),
    __param(6, ITerminalService)
], TerminalAccessibleViewContribution);
export { TerminalAccessibleViewContribution };
registerTerminalContribution(TerminalAccessibleViewContribution.ID, TerminalAccessibleViewContribution);
export class TerminalAccessibilityHelpContribution extends Disposable {
    constructor() {
        super();
        this._register(AccessibilityHelpAction.addImplementation(105, 'terminal', async (accessor) => {
            const instantiationService = accessor.get(IInstantiationService);
            const terminalService = accessor.get(ITerminalService);
            const accessibleViewService = accessor.get(IAccessibleViewService);
            const instance = await terminalService.getActiveOrCreateInstance();
            await terminalService.revealActiveTerminal();
            const terminal = instance?.xterm;
            if (!terminal) {
                return;
            }
            accessibleViewService.show(instantiationService.createInstance(TerminalAccessibilityHelpProvider, instance, terminal));
        }, ContextKeyExpr.or(TerminalContextKeys.focus, ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */)))));
    }
}
registerTerminalContribution(TerminalAccessibilityHelpContribution.ID, TerminalAccessibilityHelpContribution);
// #endregion
// #region Actions
class FocusAccessibleBufferAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.terminal.focusAccessibleBuffer" /* TerminalAccessibilityCommandId.FocusAccessibleBuffer */,
            title: localize2('workbench.action.terminal.focusAccessibleBuffer', "Focus Accessible Terminal View"),
            precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
            keybinding: [
                {
                    primary: 512 /* KeyMod.Alt */ | 60 /* KeyCode.F2 */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
                    linux: {
                        primary: 512 /* KeyMod.Alt */ | 60 /* KeyCode.F2 */ | 1024 /* KeyMod.Shift */,
                        secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */]
                    },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, TerminalContextKeys.focus)
                }
            ]
        });
    }
    async run(accessor, ...args) {
        const terminalService = accessor.get(ITerminalService);
        const terminal = await terminalService.getActiveOrCreateInstance();
        if (!terminal?.xterm) {
            return;
        }
        TerminalAccessibleViewContribution.get(terminal)?.show();
    }
}
registerAction2(FocusAccessibleBufferAction);
registerTerminalAction({
    id: "workbench.action.terminal.accessibleBufferGoToNextCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToNextCommand */,
    title: localize2('workbench.action.terminal.accessibleBufferGoToNextCommand', "Accessible Buffer Go to Next Command"),
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated, ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
    keybinding: [
        {
            primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
            when: ContextKeyExpr.and(ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2
        }
    ],
    run: async (c) => {
        const instance = c.service.activeInstance;
        if (!instance) {
            return;
        }
        TerminalAccessibleViewContribution.get(instance)?.navigateToCommand("next" /* NavigationType.Next */);
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.accessibleBufferGoToPreviousCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToPreviousCommand */,
    title: localize2('workbench.action.terminal.accessibleBufferGoToPreviousCommand', "Accessible Buffer Go to Previous Command"),
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
    keybinding: [
        {
            primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
            when: ContextKeyExpr.and(ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2
        }
    ],
    run: async (c) => {
        const instance = c.service.activeInstance;
        if (!instance) {
            return;
        }
        TerminalAccessibleViewContribution.get(instance)?.navigateToCommand("previous" /* NavigationType.Previous */);
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.scrollToBottomAccessibleView" /* TerminalAccessibilityCommandId.ScrollToBottomAccessibleView */,
    title: localize2('workbench.action.terminal.scrollToBottomAccessibleView', 'Scroll to Accessible View Bottom'),
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
        linux: { primary: 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */ },
        when: accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    run: (c, accessor) => {
        const accessibleViewService = accessor.get(IAccessibleViewService);
        const lastPosition = accessibleViewService.getLastPosition();
        if (!lastPosition) {
            return;
        }
        accessibleViewService.setPosition(lastPosition, true);
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.scrollToTopAccessibleView" /* TerminalAccessibilityCommandId.ScrollToTopAccessibleView */,
    title: localize2('workbench.action.terminal.scrollToTopAccessibleView', 'Scroll to Accessible View Top'),
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
        linux: { primary: 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */ },
        when: accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    run: (c, accessor) => accessor.get(IAccessibleViewService)?.setPosition(new Position(1, 1), true)
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYWNjZXNzaWJpbGl0eS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL3Rlcm1pbmFsLmFjY2Vzc2liaWxpdHkuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQTRCLHNCQUFzQixFQUFrQixNQUFNLGlFQUFpRSxDQUFDO0FBQ25KLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1GQUFtRixDQUFDO0FBQ3JKLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUt4SCxPQUFPLEVBQUUsK0JBQStCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN0SSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN4SCxPQUFPLEVBQTRDLGdCQUFnQixFQUFrQixNQUFNLHVDQUF1QyxDQUFDO0FBQ25JLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSw0QkFBNEIsRUFBcUMsTUFBTSxpREFBaUQsQ0FBQztBQUNsSSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUdyRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRixPQUFPLEVBQTBCLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXBFLGlDQUFpQztBQUVqQyxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLGVBQWU7O2FBQ3JDLE9BQUUsR0FBRyx1QkFBdUIsQUFBMUIsQ0FBMkI7SUFDN0MsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUEyQjtRQUNyQyxPQUFPLFFBQVEsQ0FBQyxlQUFlLENBQTJCLDBCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFFRCxZQUNrQixJQUFrQyxFQUNYLHFCQUE0QztRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUhTLFNBQUksR0FBSixJQUFJLENBQThCO1FBQ1gsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtJQUdyRixDQUFDO0lBQ0QsTUFBTSxDQUFDLEtBQXlDO1FBQy9DLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUN0SCxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7O0FBbkJJLHdCQUF3QjtJQVEzQixXQUFBLHFCQUFxQixDQUFBO0dBUmxCLHdCQUF3QixDQW9CN0I7QUFDRCw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztBQUU3RSxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFtQyxTQUFRLFVBQVU7O2FBQ2pELE9BQUUsR0FBRyxtQ0FBbUMsQUFBdEMsQ0FBdUM7SUFDekQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUEyQjtRQUNyQyxPQUFPLFFBQVEsQ0FBQyxlQUFlLENBQXFDLG9DQUFrQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVHLENBQUM7SUFNRCxZQUNrQixJQUFrQyxFQUN0QiwyQkFBeUUsRUFDOUUsc0JBQStELEVBQ2hFLHFCQUE2RCxFQUNoRSxrQkFBdUQsRUFDcEQscUJBQTZELEVBQ2xFLGdCQUFtRDtRQUVyRSxLQUFLLEVBQUUsQ0FBQztRQVJTLFNBQUksR0FBSixJQUFJLENBQThCO1FBQ0wsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQUM3RCwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQy9DLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDL0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNuQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ2pELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFUckQscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQVkzRSxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFO1lBQzFFLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNqRSxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFDRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWixPQUFPLElBQUksQ0FBQztRQUNiLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ3ZELE1BQU0sYUFBYSxHQUFHLHFCQUFxQixDQUFDLFFBQVEsMkVBQWlDLENBQUM7WUFDdEYsSUFBSSxhQUFhLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxDQUFDO2lCQUFNLElBQUksYUFBYSxLQUFLLG1CQUFtQixFQUFFLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEUsSUFBSSxDQUFDLENBQUMsb0JBQW9CLHdJQUFzRSxFQUFFLENBQUM7Z0JBQ2xHLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1lBQ3ZDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckUsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksZ0RBQXdDLEVBQUUsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7WUFDdkMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQXlDO1FBQ25ELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDNUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0IsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDdkQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pFLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDeEYsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7WUFDekMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pFLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyw4QkFBOEI7UUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLENBQUM7WUFDL0UsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsd0lBQXNFLEVBQUUsQ0FBQztZQUNoSCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFzQyxDQUFDO1FBQzdGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRTtZQUMvRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sNkJBQTZCO1FBQ3BDLE9BQU8sK0JBQStCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyx1REFBc0MsQ0FBQztJQUNoSCxDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3BILENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGdDQUFnQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO2dCQUMvSixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxpQ0FBaUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN4SixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLHNJQUFxRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxvREFBbUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ25OLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBQ0QsaUJBQWlCLENBQUMsSUFBb0I7UUFDckMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsb0RBQW1DLEVBQUUsVUFBVSxDQUFDO1FBQzNHLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBQ25ELElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksNkNBQTRCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4UCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUM1QyxJQUFJLENBQUMsU0FBUyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNuRixLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDcEIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFGLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDeEYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDM0YsQ0FBQztJQUNGLENBQUM7SUFFTywwQkFBMEI7UUFDakMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLENBQUM7UUFDNUYsTUFBTSxRQUFRLEdBQUcsVUFBVSxFQUFFLFFBQVEsQ0FBQztRQUN0QyxNQUFNLGNBQWMsR0FBRyxVQUFVLEVBQUUsY0FBYyxDQUFDO1FBQ2xELElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDdkIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBNkIsRUFBRSxDQUFDO1FBQzVDLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDakIsU0FBUztZQUNWLENBQUM7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBQ3RELENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU8sd0JBQXdCLENBQUMsT0FBa0Q7UUFDbEYsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksSUFBd0IsQ0FBQztRQUM3QixJQUFJLFFBQVEsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUN6QixJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUM7UUFDN0IsQ0FBQzthQUFNLElBQUksb0JBQW9CLElBQUksT0FBTyxFQUFFLENBQUM7WUFDNUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUM7UUFDekMsQ0FBQztRQUNELElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEMsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0QsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEIsT0FBTztRQUNSLENBQUM7UUFDRCxPQUFPLElBQUksR0FBRyxDQUFDLENBQUM7SUFDakIsQ0FBQzs7QUFuTFcsa0NBQWtDO0lBWTVDLFdBQUEsMkJBQTJCLENBQUE7SUFDM0IsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGdCQUFnQixDQUFBO0dBakJOLGtDQUFrQyxDQXFMOUM7O0FBQ0QsNEJBQTRCLENBQUMsa0NBQWtDLENBQUMsRUFBRSxFQUFFLGtDQUFrQyxDQUFDLENBQUM7QUFFeEcsTUFBTSxPQUFPLHFDQUFzQyxTQUFRLFVBQVU7SUFFcEU7UUFDQyxLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUMsUUFBUSxFQUFDLEVBQUU7WUFDMUYsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDakUsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBZSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDbkUsTUFBTSxlQUFlLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUM3QyxNQUFNLFFBQVEsR0FBRyxRQUFRLEVBQUUsS0FBSyxDQUFDO1lBQ2pDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixPQUFPO1lBQ1IsQ0FBQztZQUNELHFCQUFxQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUNBQWlDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDeEgsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLHFEQUFvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0wsQ0FBQztDQUNEO0FBQ0QsNEJBQTRCLENBQUMscUNBQXFDLENBQUMsRUFBRSxFQUFFLHFDQUFxQyxDQUFDLENBQUM7QUFFOUcsYUFBYTtBQUViLGtCQUFrQjtBQUVsQixNQUFNLDJCQUE0QixTQUFRLE9BQU87SUFDaEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLDhHQUFzRDtZQUN4RCxLQUFLLEVBQUUsU0FBUyxDQUFDLGlEQUFpRCxFQUFFLGdDQUFnQyxDQUFDO1lBQ3JHLFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDLHNCQUFzQixDQUFDO1lBQ2pILFVBQVUsRUFBRTtnQkFDWDtvQkFDQyxPQUFPLEVBQUUsMENBQXVCO29CQUNoQyxTQUFTLEVBQUUsQ0FBQyxvREFBZ0MsQ0FBQztvQkFDN0MsS0FBSyxFQUFFO3dCQUNOLE9BQU8sRUFBRSwwQ0FBdUIsMEJBQWU7d0JBQy9DLFNBQVMsRUFBRSxDQUFDLG9EQUFnQyxDQUFDO3FCQUM3QztvQkFDRCxNQUFNLDZDQUFtQztvQkFDekMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsa0NBQWtDLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDO2lCQUN2RjthQUNEO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDNUQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBZSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDbkUsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUNELGtDQUFrQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUMxRCxDQUFDO0NBQ0Q7QUFDRCxlQUFlLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUU3QyxzQkFBc0IsQ0FBQztJQUN0QixFQUFFLGtJQUFnRTtJQUNsRSxLQUFLLEVBQUUsU0FBUyxDQUFDLDJEQUEyRCxFQUFFLHNDQUFzQyxDQUFDO0lBQ3JILFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDLHNCQUFzQixFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLHFEQUFvQyxDQUFDLENBQUM7SUFDM1AsVUFBVSxFQUFFO1FBQ1g7WUFDQyxPQUFPLEVBQUUsaURBQThCO1lBQ3ZDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLHFEQUFvQyxDQUFDLENBQUM7WUFDbEssTUFBTSxFQUFFLDhDQUFvQyxDQUFDO1NBQzdDO0tBQ0Q7SUFDRCxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2hCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQzFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU87UUFDUixDQUFDO1FBQ0Qsa0NBQWtDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLGlCQUFpQixrQ0FBcUIsQ0FBQztJQUMxRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsc0JBQXNCLENBQUM7SUFDdEIsRUFBRSwwSUFBb0U7SUFDdEUsS0FBSyxFQUFFLFNBQVMsQ0FBQywrREFBK0QsRUFBRSwwQ0FBMEMsQ0FBQztJQUM3SCxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDLHNCQUFzQixDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLCtCQUErQixDQUFDLEdBQUcscURBQW9DLENBQUMsQ0FBQztJQUMvUSxVQUFVLEVBQUU7UUFDWDtZQUNDLE9BQU8sRUFBRSwrQ0FBNEI7WUFDckMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLCtCQUErQixDQUFDLEdBQUcscURBQW9DLENBQUMsQ0FBQztZQUNsSyxNQUFNLEVBQUUsOENBQW9DLENBQUM7U0FDN0M7S0FDRDtJQUNELEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDaEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDMUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTztRQUNSLENBQUM7UUFDRCxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsaUJBQWlCLDBDQUF5QixDQUFDO0lBQzlGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxzQkFBc0IsQ0FBQztJQUN0QixFQUFFLDRIQUE2RDtJQUMvRCxLQUFLLEVBQUUsU0FBUyxDQUFDLHdEQUF3RCxFQUFFLGtDQUFrQyxDQUFDO0lBQzlHLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUMsc0JBQXNCLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsK0JBQStCLENBQUMsR0FBRyxxREFBb0MsQ0FBQyxDQUFDO0lBQy9RLFVBQVUsRUFBRTtRQUNYLE9BQU8sRUFBRSxnREFBNEI7UUFDckMsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLDhDQUEwQixFQUFFO1FBQzlDLElBQUksRUFBRSwrQkFBK0IsQ0FBQyxTQUFTLG9EQUFtQztRQUNsRixNQUFNLDZDQUFtQztLQUN6QztJQUNELEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUNwQixNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNuRSxNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUM3RCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFDRCxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3ZELENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxzQkFBc0IsQ0FBQztJQUN0QixFQUFFLHNIQUEwRDtJQUM1RCxLQUFLLEVBQUUsU0FBUyxDQUFDLHFEQUFxRCxFQUFFLCtCQUErQixDQUFDO0lBQ3hHLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUMsc0JBQXNCLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsK0JBQStCLENBQUMsR0FBRyxxREFBb0MsQ0FBQyxDQUFDO0lBQy9RLFVBQVUsRUFBRTtRQUNYLE9BQU8sRUFBRSxpREFBNkI7UUFDdEMsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLCtDQUEyQixFQUFFO1FBQy9DLElBQUksRUFBRSwrQkFBK0IsQ0FBQyxTQUFTLG9EQUFtQztRQUNsRixNQUFNLDZDQUFtQztLQUN6QztJQUNELEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsRUFBRSxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztDQUNqRyxDQUFDLENBQUM7QUFFSCxhQUFhIn0=