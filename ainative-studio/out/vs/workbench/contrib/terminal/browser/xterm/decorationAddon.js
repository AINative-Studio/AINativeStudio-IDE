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
import * as dom from '../../../../../base/browser/dom.js';
import { Separator } from '../../../../../base/common/actions.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, dispose, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { terminalDecorationError, terminalDecorationIncomplete, terminalDecorationMark, terminalDecorationSuccess } from '../terminalIcons.js';
import { getTerminalDecorationHoverContent, updateLayout } from './decorationStyles.js';
import { TERMINAL_COMMAND_DECORATION_DEFAULT_BACKGROUND_COLOR, TERMINAL_COMMAND_DECORATION_ERROR_BACKGROUND_COLOR, TERMINAL_COMMAND_DECORATION_SUCCESS_BACKGROUND_COLOR } from '../../common/terminalColorRegistry.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
let DecorationAddon = class DecorationAddon extends Disposable {
    constructor(_capabilities, _clipboardService, _contextMenuService, _configurationService, _themeService, _openerService, _quickInputService, lifecycleService, _commandService, _accessibilitySignalService, _notificationService, _hoverService) {
        super();
        this._capabilities = _capabilities;
        this._clipboardService = _clipboardService;
        this._contextMenuService = _contextMenuService;
        this._configurationService = _configurationService;
        this._themeService = _themeService;
        this._openerService = _openerService;
        this._quickInputService = _quickInputService;
        this._commandService = _commandService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._notificationService = _notificationService;
        this._hoverService = _hoverService;
        this._capabilityDisposables = this._register(new DisposableMap());
        this._decorations = new Map();
        this._registeredMenuItems = new Map();
        this._onDidRequestRunCommand = this._register(new Emitter());
        this.onDidRequestRunCommand = this._onDidRequestRunCommand.event;
        this._onDidRequestCopyAsHtml = this._register(new Emitter());
        this.onDidRequestCopyAsHtml = this._onDidRequestCopyAsHtml.event;
        this._register(toDisposable(() => this._dispose()));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */) || e.affectsConfiguration("terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */)) {
                this.refreshLayouts();
            }
            else if (e.affectsConfiguration('workbench.colorCustomizations')) {
                this._refreshStyles(true);
            }
            else if (e.affectsConfiguration("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */)) {
                this._removeCapabilityDisposables(2 /* TerminalCapability.CommandDetection */);
                this._updateDecorationVisibility();
            }
        }));
        this._register(this._themeService.onDidColorThemeChange(() => this._refreshStyles(true)));
        this._updateDecorationVisibility();
        this._register(this._capabilities.onDidAddCapabilityType(c => this._createCapabilityDisposables(c)));
        this._register(this._capabilities.onDidRemoveCapabilityType(c => this._removeCapabilityDisposables(c)));
        this._register(lifecycleService.onWillShutdown(() => this._disposeAllDecorations()));
    }
    _createCapabilityDisposables(c) {
        const store = new DisposableStore();
        const capability = this._capabilities.get(c);
        if (!capability || this._capabilityDisposables.has(c)) {
            return;
        }
        switch (capability.type) {
            case 4 /* TerminalCapability.BufferMarkDetection */:
                store.add(capability.onMarkAdded(mark => this.registerMarkDecoration(mark)));
                break;
            case 2 /* TerminalCapability.CommandDetection */: {
                const disposables = this._getCommandDetectionListeners(capability);
                for (const d of disposables) {
                    store.add(d);
                }
                break;
            }
        }
        this._capabilityDisposables.set(c, store);
    }
    _removeCapabilityDisposables(c) {
        this._capabilityDisposables.deleteAndDispose(c);
    }
    registerMarkDecoration(mark) {
        if (!this._terminal || (!this._showGutterDecorations && !this._showOverviewRulerDecorations)) {
            return undefined;
        }
        if (mark.hidden) {
            return undefined;
        }
        return this.registerCommandDecoration(undefined, undefined, mark);
    }
    _updateDecorationVisibility() {
        const showDecorations = this._configurationService.getValue("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */);
        this._showGutterDecorations = (showDecorations === 'both' || showDecorations === 'gutter');
        this._showOverviewRulerDecorations = (showDecorations === 'both' || showDecorations === 'overviewRuler');
        this._disposeAllDecorations();
        if (this._showGutterDecorations || this._showOverviewRulerDecorations) {
            this._attachToCommandCapability();
            this._updateGutterDecorationVisibility();
        }
        const currentCommand = this._capabilities.get(2 /* TerminalCapability.CommandDetection */)?.executingCommandObject;
        if (currentCommand) {
            this.registerCommandDecoration(currentCommand, true);
        }
    }
    _disposeAllDecorations() {
        this._placeholderDecoration?.dispose();
        for (const value of this._decorations.values()) {
            value.decoration.dispose();
            dispose(value.disposables);
        }
    }
    _updateGutterDecorationVisibility() {
        const commandDecorationElements = this._terminal?.element?.querySelectorAll("terminal-command-decoration" /* DecorationSelector.CommandDecoration */);
        if (commandDecorationElements) {
            for (const commandDecorationElement of commandDecorationElements) {
                this._updateCommandDecorationVisibility(commandDecorationElement);
            }
        }
    }
    _updateCommandDecorationVisibility(commandDecorationElement) {
        if (this._showGutterDecorations) {
            commandDecorationElement.classList.remove("hide" /* DecorationSelector.Hide */);
        }
        else {
            commandDecorationElement.classList.add("hide" /* DecorationSelector.Hide */);
        }
    }
    refreshLayouts() {
        updateLayout(this._configurationService, this._placeholderDecoration?.element);
        for (const decoration of this._decorations) {
            updateLayout(this._configurationService, decoration[1].decoration.element);
        }
    }
    _refreshStyles(refreshOverviewRulerColors) {
        if (refreshOverviewRulerColors) {
            for (const decoration of this._decorations.values()) {
                const color = this._getDecorationCssColor(decoration)?.toString() ?? '';
                if (decoration.decoration.options?.overviewRulerOptions) {
                    decoration.decoration.options.overviewRulerOptions.color = color;
                }
                else if (decoration.decoration.options) {
                    decoration.decoration.options.overviewRulerOptions = { color };
                }
            }
        }
        this._updateClasses(this._placeholderDecoration?.element);
        for (const decoration of this._decorations.values()) {
            this._updateClasses(decoration.decoration.element, decoration.exitCode, decoration.markProperties);
        }
    }
    _dispose() {
        for (const disposable of this._capabilityDisposables.values()) {
            dispose(disposable);
        }
        this.clearDecorations();
    }
    _clearPlaceholder() {
        this._placeholderDecoration?.dispose();
        this._placeholderDecoration = undefined;
    }
    clearDecorations() {
        this._placeholderDecoration?.marker.dispose();
        this._clearPlaceholder();
        this._disposeAllDecorations();
        this._decorations.clear();
    }
    _attachToCommandCapability() {
        if (this._capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            const capability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
            const disposables = this._getCommandDetectionListeners(capability);
            const store = new DisposableStore();
            for (const d of disposables) {
                store.add(d);
            }
            this._capabilityDisposables.set(2 /* TerminalCapability.CommandDetection */, store);
        }
    }
    _getCommandDetectionListeners(capability) {
        this._removeCapabilityDisposables(2 /* TerminalCapability.CommandDetection */);
        const commandDetectionListeners = [];
        // Command started
        if (capability.executingCommandObject?.marker) {
            this.registerCommandDecoration(capability.executingCommandObject, true);
        }
        commandDetectionListeners.push(capability.onCommandStarted(command => this.registerCommandDecoration(command, true)));
        // Command finished
        for (const command of capability.commands) {
            this.registerCommandDecoration(command);
        }
        commandDetectionListeners.push(capability.onCommandFinished(command => {
            this.registerCommandDecoration(command);
            if (command.exitCode) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalCommandFailed);
            }
            else {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalCommandSucceeded);
            }
        }));
        // Command invalidated
        commandDetectionListeners.push(capability.onCommandInvalidated(commands => {
            for (const command of commands) {
                const id = command.marker?.id;
                if (id) {
                    const match = this._decorations.get(id);
                    if (match) {
                        match.decoration.dispose();
                        dispose(match.disposables);
                    }
                }
            }
        }));
        // Current command invalidated
        commandDetectionListeners.push(capability.onCurrentCommandInvalidated((request) => {
            if (request.reason === "noProblemsReported" /* CommandInvalidationReason.NoProblemsReported */) {
                const lastDecoration = Array.from(this._decorations.entries())[this._decorations.size - 1];
                lastDecoration?.[1].decoration.dispose();
            }
            else if (request.reason === "windows" /* CommandInvalidationReason.Windows */) {
                this._clearPlaceholder();
            }
        }));
        return commandDetectionListeners;
    }
    activate(terminal) {
        this._terminal = terminal;
        this._attachToCommandCapability();
    }
    registerCommandDecoration(command, beforeCommandExecution, markProperties) {
        if (!this._terminal || (beforeCommandExecution && !command) || (!this._showGutterDecorations && !this._showOverviewRulerDecorations)) {
            return undefined;
        }
        const marker = command?.marker || markProperties?.marker;
        if (!marker) {
            throw new Error(`cannot add a decoration for a command ${JSON.stringify(command)} with no marker`);
        }
        this._clearPlaceholder();
        const color = this._getDecorationCssColor(command)?.toString() ?? '';
        const decoration = this._terminal.registerDecoration({
            marker,
            overviewRulerOptions: this._showOverviewRulerDecorations ? (beforeCommandExecution
                ? { color, position: 'left' }
                : { color, position: command?.exitCode ? 'right' : 'left' }) : undefined
        });
        if (!decoration) {
            return undefined;
        }
        if (beforeCommandExecution) {
            this._placeholderDecoration = decoration;
        }
        decoration.onRender(element => {
            if (element.classList.contains(".xterm-decoration-overview-ruler" /* DecorationSelector.OverviewRuler */)) {
                return;
            }
            if (!this._decorations.get(decoration.marker.id)) {
                decoration.onDispose(() => this._decorations.delete(decoration.marker.id));
                this._decorations.set(decoration.marker.id, {
                    decoration,
                    disposables: this._createDisposables(element, command, markProperties),
                    exitCode: command?.exitCode,
                    markProperties: command?.markProperties
                });
            }
            if (!element.classList.contains("codicon" /* DecorationSelector.Codicon */) || command?.marker?.line === 0) {
                // first render or buffer was cleared
                updateLayout(this._configurationService, element);
                this._updateClasses(element, command?.exitCode, command?.markProperties || markProperties);
            }
        });
        return decoration;
    }
    registerMenuItems(command, items) {
        const existingItems = this._registeredMenuItems.get(command);
        if (existingItems) {
            existingItems.push(...items);
        }
        else {
            this._registeredMenuItems.set(command, [...items]);
        }
        return toDisposable(() => {
            const commandItems = this._registeredMenuItems.get(command);
            if (commandItems) {
                for (const item of items.values()) {
                    const index = commandItems.indexOf(item);
                    if (index !== -1) {
                        commandItems.splice(index, 1);
                    }
                }
            }
        });
    }
    _createDisposables(element, command, markProperties) {
        if (command?.exitCode === undefined && !command?.markProperties) {
            return [];
        }
        else if (command?.markProperties || markProperties) {
            return [this._createHover(element, command || markProperties, markProperties?.hoverMessage)];
        }
        return [...this._createContextMenu(element, command), this._createHover(element, command)];
    }
    _createHover(element, command, hoverMessage) {
        return this._hoverService.setupDelayedHover(element, () => ({
            content: new MarkdownString(getTerminalDecorationHoverContent(command, hoverMessage))
        }));
    }
    _updateClasses(element, exitCode, markProperties) {
        if (!element) {
            return;
        }
        for (const classes of element.classList) {
            element.classList.remove(classes);
        }
        element.classList.add("terminal-command-decoration" /* DecorationSelector.CommandDecoration */, "codicon" /* DecorationSelector.Codicon */, "xterm-decoration" /* DecorationSelector.XtermDecoration */);
        if (markProperties) {
            element.classList.add("default-color" /* DecorationSelector.DefaultColor */, ...ThemeIcon.asClassNameArray(terminalDecorationMark));
            if (!markProperties.hoverMessage) {
                //disable the mouse pointer
                element.classList.add("default" /* DecorationSelector.Default */);
            }
        }
        else {
            // command decoration
            this._updateCommandDecorationVisibility(element);
            if (exitCode === undefined) {
                element.classList.add("default-color" /* DecorationSelector.DefaultColor */, "default" /* DecorationSelector.Default */);
                element.classList.add(...ThemeIcon.asClassNameArray(terminalDecorationIncomplete));
            }
            else if (exitCode) {
                element.classList.add("error" /* DecorationSelector.ErrorColor */);
                element.classList.add(...ThemeIcon.asClassNameArray(terminalDecorationError));
            }
            else {
                element.classList.add(...ThemeIcon.asClassNameArray(terminalDecorationSuccess));
            }
        }
    }
    _createContextMenu(element, command) {
        // When the xterm Decoration gets disposed of, its element gets removed from the dom
        // along with its listeners
        return [
            dom.addDisposableListener(element, dom.EventType.MOUSE_DOWN, async (e) => {
                e.stopImmediatePropagation();
            }),
            dom.addDisposableListener(element, dom.EventType.CLICK, async (e) => {
                e.stopImmediatePropagation();
                const actions = await this._getCommandActions(command);
                this._contextMenuService.showContextMenu({ getAnchor: () => element, getActions: () => actions });
            }),
            dom.addDisposableListener(element, dom.EventType.CONTEXT_MENU, async (e) => {
                e.stopImmediatePropagation();
                const actions = this._getContextMenuActions();
                this._contextMenuService.showContextMenu({ getAnchor: () => element, getActions: () => actions });
            }),
        ];
    }
    _getContextMenuActions() {
        const label = localize('workbench.action.terminal.toggleVisibility', "Toggle Visibility");
        return [
            {
                class: undefined, tooltip: label, id: 'terminal.toggleVisibility', label, enabled: true,
                run: async () => {
                    this._showToggleVisibilityQuickPick();
                }
            }
        ];
    }
    async _getCommandActions(command) {
        const actions = [];
        const registeredMenuItems = this._registeredMenuItems.get(command);
        if (registeredMenuItems?.length) {
            actions.push(...registeredMenuItems, new Separator());
        }
        if (command.command !== '') {
            const labelRun = localize("terminal.rerunCommand", 'Rerun Command');
            actions.push({
                class: undefined, tooltip: labelRun, id: 'terminal.rerunCommand', label: labelRun, enabled: true,
                run: async () => {
                    if (command.command === '') {
                        return;
                    }
                    if (!command.isTrusted) {
                        const shouldRun = await new Promise(r => {
                            this._notificationService.prompt(Severity.Info, localize('rerun', 'Do you want to run the command: {0}', command.command), [{
                                    label: localize('yes', 'Yes'),
                                    run: () => r(true)
                                }, {
                                    label: localize('no', 'No'),
                                    run: () => r(false)
                                }]);
                        });
                        if (!shouldRun) {
                            return;
                        }
                    }
                    this._onDidRequestRunCommand.fire({ command });
                }
            });
            // The second section is the clipboard section
            actions.push(new Separator());
            const labelCopy = localize("terminal.copyCommand", 'Copy Command');
            actions.push({
                class: undefined, tooltip: labelCopy, id: 'terminal.copyCommand', label: labelCopy, enabled: true,
                run: () => this._clipboardService.writeText(command.command)
            });
        }
        if (command.hasOutput()) {
            const labelCopyCommandAndOutput = localize("terminal.copyCommandAndOutput", 'Copy Command and Output');
            actions.push({
                class: undefined, tooltip: labelCopyCommandAndOutput, id: 'terminal.copyCommandAndOutput', label: labelCopyCommandAndOutput, enabled: true,
                run: () => {
                    const output = command.getOutput();
                    if (typeof output === 'string') {
                        this._clipboardService.writeText(`${command.command !== '' ? command.command + '\n' : ''}${output}`);
                    }
                }
            });
            const labelText = localize("terminal.copyOutput", 'Copy Output');
            actions.push({
                class: undefined, tooltip: labelText, id: 'terminal.copyOutput', label: labelText, enabled: true,
                run: () => {
                    const text = command.getOutput();
                    if (typeof text === 'string') {
                        this._clipboardService.writeText(text);
                    }
                }
            });
            const labelHtml = localize("terminal.copyOutputAsHtml", 'Copy Output as HTML');
            actions.push({
                class: undefined, tooltip: labelHtml, id: 'terminal.copyOutputAsHtml', label: labelHtml, enabled: true,
                run: () => this._onDidRequestCopyAsHtml.fire({ command })
            });
        }
        if (actions.length > 0) {
            actions.push(new Separator());
        }
        const labelRunRecent = localize('workbench.action.terminal.runRecentCommand', "Run Recent Command");
        actions.push({
            class: undefined, tooltip: labelRunRecent, id: 'workbench.action.terminal.runRecentCommand', label: labelRunRecent, enabled: true,
            run: () => this._commandService.executeCommand('workbench.action.terminal.runRecentCommand')
        });
        const labelGoToRecent = localize('workbench.action.terminal.goToRecentDirectory', "Go To Recent Directory");
        actions.push({
            class: undefined, tooltip: labelRunRecent, id: 'workbench.action.terminal.goToRecentDirectory', label: labelGoToRecent, enabled: true,
            run: () => this._commandService.executeCommand('workbench.action.terminal.goToRecentDirectory')
        });
        actions.push(new Separator());
        const labelAbout = localize("terminal.learnShellIntegration", 'Learn About Shell Integration');
        actions.push({
            class: undefined, tooltip: labelAbout, id: 'terminal.learnShellIntegration', label: labelAbout, enabled: true,
            run: () => this._openerService.open('https://code.visualstudio.com/docs/terminal/shell-integration')
        });
        return actions;
    }
    _showToggleVisibilityQuickPick() {
        const quickPick = this._register(this._quickInputService.createQuickPick());
        quickPick.hideInput = true;
        quickPick.hideCheckAll = true;
        quickPick.canSelectMany = true;
        quickPick.title = localize('toggleVisibility', 'Toggle visibility');
        const configValue = this._configurationService.getValue("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */);
        const gutterIcon = {
            label: localize('gutter', 'Gutter command decorations'),
            picked: configValue !== 'never' && configValue !== 'overviewRuler'
        };
        const overviewRulerIcon = {
            label: localize('overviewRuler', 'Overview ruler command decorations'),
            picked: configValue !== 'never' && configValue !== 'gutter'
        };
        quickPick.items = [gutterIcon, overviewRulerIcon];
        const selectedItems = [];
        if (configValue !== 'never') {
            if (configValue !== 'gutter') {
                selectedItems.push(gutterIcon);
            }
            if (configValue !== 'overviewRuler') {
                selectedItems.push(overviewRulerIcon);
            }
        }
        quickPick.selectedItems = selectedItems;
        this._register(quickPick.onDidChangeSelection(async (e) => {
            let newValue = 'never';
            if (e.includes(gutterIcon)) {
                if (e.includes(overviewRulerIcon)) {
                    newValue = 'both';
                }
                else {
                    newValue = 'gutter';
                }
            }
            else if (e.includes(overviewRulerIcon)) {
                newValue = 'overviewRuler';
            }
            await this._configurationService.updateValue("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */, newValue);
        }));
        quickPick.ok = false;
        quickPick.show();
    }
    _getDecorationCssColor(decorationOrCommand) {
        let colorId;
        if (decorationOrCommand?.exitCode === undefined) {
            colorId = TERMINAL_COMMAND_DECORATION_DEFAULT_BACKGROUND_COLOR;
        }
        else {
            colorId = decorationOrCommand.exitCode ? TERMINAL_COMMAND_DECORATION_ERROR_BACKGROUND_COLOR : TERMINAL_COMMAND_DECORATION_SUCCESS_BACKGROUND_COLOR;
        }
        return this._themeService.getColorTheme().getColor(colorId)?.toString();
    }
};
DecorationAddon = __decorate([
    __param(1, IClipboardService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IThemeService),
    __param(5, IOpenerService),
    __param(6, IQuickInputService),
    __param(7, ILifecycleService),
    __param(8, ICommandService),
    __param(9, IAccessibilitySignalService),
    __param(10, INotificationService),
    __param(11, IHoverService)
], DecorationAddon);
export { DecorationAddon };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIveHRlcm0vZGVjb3JhdGlvbkFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUZBQW1GLENBQUM7QUFDckosT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFrQixN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