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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import * as dom from '../../../../../base/browser/dom.js';
import { asArray } from '../../../../../base/common/arrays.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { updateLayout } from '../../../terminal/browser/xterm/decorationStyles.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { getLinesForCommand } from '../../../../../platform/terminal/common/capabilities/commandDetectionCapability.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { Schemas } from '../../../../../base/common/network.js';
import { ITerminalQuickFixService, TerminalQuickFixType } from './quickFix.js';
import { CodeActionKind } from '../../../../../editor/contrib/codeAction/common/types.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
var QuickFixDecorationSelector;
(function (QuickFixDecorationSelector) {
    QuickFixDecorationSelector["QuickFix"] = "quick-fix";
})(QuickFixDecorationSelector || (QuickFixDecorationSelector = {}));
const quickFixClasses = [
    "quick-fix" /* QuickFixDecorationSelector.QuickFix */,
    "codicon" /* DecorationSelector.Codicon */,
    "terminal-command-decoration" /* DecorationSelector.CommandDecoration */,
    "xterm-decoration" /* DecorationSelector.XtermDecoration */
];
let TerminalQuickFixAddon = class TerminalQuickFixAddon extends Disposable {
    constructor(_aliases, _capabilities, _accessibilitySignalService, _actionWidgetService, _commandService, _configurationService, _extensionService, _labelService, _openerService, _telemetryService, _quickFixService) {
        super();
        this._aliases = _aliases;
        this._capabilities = _capabilities;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._actionWidgetService = _actionWidgetService;
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._extensionService = _extensionService;
        this._labelService = _labelService;
        this._openerService = _openerService;
        this._telemetryService = _telemetryService;
        this._quickFixService = _quickFixService;
        this._commandListeners = new Map();
        this._decoration = this._register(new MutableDisposable());
        this._decorationDisposables = this._register(new MutableDisposable());
        this._registeredSelectors = new Set();
        this._didRun = false;
        this._onDidRequestRerunCommand = new Emitter();
        this.onDidRequestRerunCommand = this._onDidRequestRerunCommand.event;
        this._onDidUpdateQuickFixes = new Emitter();
        this.onDidUpdateQuickFixes = this._onDidUpdateQuickFixes.event;
        const commandDetectionCapability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (commandDetectionCapability) {
            this._registerCommandHandlers();
        }
        else {
            this._register(this._capabilities.onDidAddCapabilityType(c => {
                if (c === 2 /* TerminalCapability.CommandDetection */) {
                    this._registerCommandHandlers();
                }
            }));
        }
        this._register(this._quickFixService.onDidRegisterProvider(result => this.registerCommandFinishedListener(convertToQuickFixOptions(result))));
        this._quickFixService.extensionQuickFixes.then(quickFixSelectors => {
            for (const selector of quickFixSelectors) {
                this.registerCommandSelector(selector);
            }
        });
        this._register(this._quickFixService.onDidRegisterCommandSelector(selector => this.registerCommandSelector(selector)));
        this._register(this._quickFixService.onDidUnregisterProvider(id => this._commandListeners.delete(id)));
    }
    activate(terminal) {
        this._terminal = terminal;
    }
    showMenu() {
        if (!this._currentRenderContext) {
            return;
        }
        const actions = this._currentRenderContext.quickFixes.map(f => new TerminalQuickFixItem(f, f.type, f.source, f.label, f.kind));
        const actionSet = {
            allActions: actions,
            hasAutoFix: false,
            hasAIFix: false,
            allAIFixes: false,
            validActions: actions,
            dispose: () => { }
        };
        const delegate = {
            onSelect: async (fix) => {
                fix.action?.run();
                this._actionWidgetService.hide();
            },
            onHide: () => {
                this._terminal?.focus();
            },
        };
        this._actionWidgetService.show('quickFixWidget', false, toActionWidgetItems(actionSet.validActions, true), delegate, this._currentRenderContext.anchor, this._currentRenderContext.parentElement);
    }
    registerCommandSelector(selector) {
        if (this._registeredSelectors.has(selector.id)) {
            return;
        }
        const matcherKey = selector.commandLineMatcher.toString();
        const currentOptions = this._commandListeners.get(matcherKey) || [];
        currentOptions.push({
            id: selector.id,
            type: 'unresolved',
            commandLineMatcher: selector.commandLineMatcher,
            outputMatcher: selector.outputMatcher,
            commandExitResult: selector.commandExitResult,
            kind: selector.kind
        });
        this._registeredSelectors.add(selector.id);
        this._commandListeners.set(matcherKey, currentOptions);
    }
    registerCommandFinishedListener(options) {
        const matcherKey = options.commandLineMatcher.toString();
        let currentOptions = this._commandListeners.get(matcherKey) || [];
        // removes the unresolved options
        currentOptions = currentOptions.filter(o => o.id !== options.id);
        currentOptions.push(options);
        this._commandListeners.set(matcherKey, currentOptions);
    }
    _registerCommandHandlers() {
        const terminal = this._terminal;
        const commandDetection = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!terminal || !commandDetection) {
            return;
        }
        this._register(commandDetection.onCommandFinished(async (command) => await this._resolveQuickFixes(command, this._aliases)));
    }
    /**
     * Resolves quick fixes, if any, based on the
     * @param command & its output
     */
    async _resolveQuickFixes(command, aliases) {
        const terminal = this._terminal;
        if (!terminal || command.wasReplayed) {
            return;
        }
        if (command.command !== '' && this._lastQuickFixId) {
            this._disposeQuickFix(command, this._lastQuickFixId);
        }
        const resolver = async (selector, lines) => {
            if (lines === undefined) {
                return undefined;
            }
            const id = selector.id;
            await this._extensionService.activateByEvent(`onTerminalQuickFixRequest:${id}`);
            return this._quickFixService.providers.get(id)?.provideTerminalQuickFixes(command, lines, {
                type: 'resolved',
                commandLineMatcher: selector.commandLineMatcher,
                outputMatcher: selector.outputMatcher,
                commandExitResult: selector.commandExitResult,
                kind: selector.kind,
                id: selector.id
            }, new CancellationTokenSource().token);
        };
        const result = await getQuickFixesForCommand(aliases, terminal, command, this._commandListeners, this._commandService, this._openerService, this._labelService, this._onDidRequestRerunCommand, resolver);
        if (!result) {
            return;
        }
        this._quickFixes = result;
        this._lastQuickFixId = this._quickFixes[0].id;
        this._registerQuickFixDecoration();
        this._onDidUpdateQuickFixes.fire({ command, actions: this._quickFixes });
        this._quickFixes = undefined;
    }
    _disposeQuickFix(command, id) {
        this._telemetryService?.publicLog2('terminal/quick-fix', {
            quickFixId: id,
            ranQuickFix: this._didRun
        });
        this._decoration.clear();
        this._decorationDisposables.clear();
        this._onDidUpdateQuickFixes.fire({ command, actions: this._quickFixes });
        this._quickFixes = undefined;
        this._lastQuickFixId = undefined;
        this._didRun = false;
    }
    /**
     * Registers a decoration with the quick fixes
     */
    _registerQuickFixDecoration() {
        if (!this._terminal) {
            return;
        }
        this._decoration.clear();
        this._decorationDisposables.clear();
        const quickFixes = this._quickFixes;
        if (!quickFixes || quickFixes.length === 0) {
            return;
        }
        const marker = this._terminal.registerMarker();
        if (!marker) {
            return;
        }
        const decoration = this._decoration.value = this._terminal.registerDecoration({ marker, width: 2, layer: 'top' });
        if (!decoration) {
            return;
        }
        const store = this._decorationDisposables.value = new DisposableStore();
        store.add(decoration.onRender(e => {
            const rect = e.getBoundingClientRect();
            const anchor = {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
            if (e.classList.contains("quick-fix" /* QuickFixDecorationSelector.QuickFix */)) {
                if (this._currentRenderContext) {
                    this._currentRenderContext.anchor = anchor;
                }
                return;
            }
            e.classList.add(...quickFixClasses);
            const isExplainOnly = quickFixes.every(e => e.kind === 'explain');
            if (isExplainOnly) {
                e.classList.add('explainOnly');
            }
            e.classList.add(...ThemeIcon.asClassNameArray(isExplainOnly ? Codicon.sparkle : Codicon.lightBulb));
            updateLayout(this._configurationService, e);
            this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalQuickFix);
            const parentElement = e.closest('.xterm')?.parentElement;
            if (!parentElement) {
                return;
            }
            this._currentRenderContext = { quickFixes, anchor, parentElement };
            this._register(dom.addDisposableListener(e, dom.EventType.CLICK, () => this.showMenu()));
        }));
        store.add(decoration.onDispose(() => this._currentRenderContext = undefined));
    }
};
TerminalQuickFixAddon = __decorate([
    __param(2, IAccessibilitySignalService),
    __param(3, IActionWidgetService),
    __param(4, ICommandService),
    __param(5, IConfigurationService),
    __param(6, IExtensionService),
    __param(7, ILabelService),
    __param(8, IOpenerService),
    __param(9, ITelemetryService),
    __param(10, ITerminalQuickFixService)
], TerminalQuickFixAddon);
export { TerminalQuickFixAddon };
export async function getQuickFixesForCommand(aliases, terminal, terminalCommand, quickFixOptions, commandService, openerService, labelService, onDidRequestRerunCommand, getResolvedFixes) {
    // Prevent duplicates by tracking added entries
    const commandQuickFixSet = new Set();
    const openQuickFixSet = new Set();
    const fixes = [];
    const newCommand = terminalCommand.command;
    for (const options of quickFixOptions.values()) {
        for (const option of options) {
            if ((option.commandExitResult === 'success' && terminalCommand.exitCode !== 0) || (option.commandExitResult === 'error' && terminalCommand.exitCode === 0)) {
                continue;
            }
            let quickFixes;
            if (option.type === 'resolved') {
                quickFixes = await option.getQuickFixes(terminalCommand, getLinesForCommand(terminal.buffer.active, terminalCommand, terminal.cols, option.outputMatcher), option, new CancellationTokenSource().token);
            }
            else if (option.type === 'unresolved') {
                if (!getResolvedFixes) {
                    throw new Error('No resolved fix provider');
                }
                quickFixes = await getResolvedFixes(option, option.outputMatcher ? getLinesForCommand(terminal.buffer.active, terminalCommand, terminal.cols, option.outputMatcher) : undefined);
            }
            else if (option.type === 'internal') {
                const commandLineMatch = newCommand.match(option.commandLineMatcher);
                if (!commandLineMatch) {
                    continue;
                }
                const outputMatcher = option.outputMatcher;
                let outputMatch;
                if (outputMatcher) {
                    outputMatch = terminalCommand.getOutputMatch(outputMatcher);
                }
                if (!outputMatch) {
                    continue;
                }
                const matchResult = { commandLineMatch, outputMatch, commandLine: terminalCommand.command };
                quickFixes = option.getQuickFixes(matchResult);
            }
            if (quickFixes) {
                for (const quickFix of asArray(quickFixes)) {
                    let action;
                    if ('type' in quickFix) {
                        switch (quickFix.type) {
                            case TerminalQuickFixType.TerminalCommand: {
                                const fix = quickFix;
                                if (commandQuickFixSet.has(fix.terminalCommand)) {
                                    continue;
                                }
                                commandQuickFixSet.add(fix.terminalCommand);
                                const label = localize('quickFix.command', 'Run: {0}', fix.terminalCommand);
                                action = {
                                    type: TerminalQuickFixType.TerminalCommand,
                                    kind: option.kind,
                                    class: undefined,
                                    source: quickFix.source,
                                    id: quickFix.id,
                                    label,
                                    enabled: true,
                                    run: () => {
                                        onDidRequestRerunCommand?.fire({
                                            command: fix.terminalCommand,
                                            shouldExecute: fix.shouldExecute ?? true
                                        });
                                    },
                                    tooltip: label,
                                    command: fix.terminalCommand,
                                    shouldExecute: fix.shouldExecute
                                };
                                break;
                            }
                            case TerminalQuickFixType.Opener: {
                                const fix = quickFix;
                                if (!fix.uri) {
                                    return;
                                }
                                if (openQuickFixSet.has(fix.uri.toString())) {
                                    continue;
                                }
                                openQuickFixSet.add(fix.uri.toString());
                                const isUrl = (fix.uri.scheme === Schemas.http || fix.uri.scheme === Schemas.https);
                                const uriLabel = isUrl ? encodeURI(fix.uri.toString(true)) : labelService.getUriLabel(fix.uri);
                                const label = localize('quickFix.opener', 'Open: {0}', uriLabel);
                                action = {
                                    source: quickFix.source,
                                    id: quickFix.id,
                                    label,
                                    type: TerminalQuickFixType.Opener,
                                    kind: option.kind,
                                    class: undefined,
                                    enabled: true,
                                    run: () => openerService.open(fix.uri),
                                    tooltip: label,
                                    uri: fix.uri
                                };
                                break;
                            }
                            case TerminalQuickFixType.Port: {
                                const fix = quickFix;
                                action = {
                                    source: 'builtin',
                                    type: fix.type,
                                    kind: option.kind,
                                    id: fix.id,
                                    label: fix.label,
                                    class: fix.class,
                                    enabled: fix.enabled,
                                    run: () => {
                                        fix.run();
                                    },
                                    tooltip: fix.tooltip
                                };
                                break;
                            }
                            case TerminalQuickFixType.VscodeCommand: {
                                const fix = quickFix;
                                action = {
                                    source: quickFix.source,
                                    type: fix.type,
                                    kind: option.kind,
                                    id: fix.id,
                                    label: fix.title,
                                    class: undefined,
                                    enabled: true,
                                    run: () => commandService.executeCommand(fix.id),
                                    tooltip: fix.title
                                };
                                break;
                            }
                        }
                        if (action) {
                            fixes.push(action);
                        }
                    }
                }
            }
        }
    }
    return fixes.length > 0 ? fixes : undefined;
}
function convertToQuickFixOptions(selectorProvider) {
    return {
        id: selectorProvider.selector.id,
        type: 'resolved',
        commandLineMatcher: selectorProvider.selector.commandLineMatcher,
        outputMatcher: selectorProvider.selector.outputMatcher,
        commandExitResult: selectorProvider.selector.commandExitResult,
        kind: selectorProvider.selector.kind,
        getQuickFixes: selectorProvider.provider.provideTerminalQuickFixes
    };
}
class TerminalQuickFixItem {
    constructor(action, type, source, title, kind = 'fix') {
        this.action = action;
        this.type = type;
        this.source = source;
        this.title = title;
        this.kind = kind;
        this.disabled = false;
    }
}
function toActionWidgetItems(inputQuickFixes, showHeaders) {
    const menuItems = [];
    menuItems.push({
        kind: "header" /* ActionListItemKind.Header */,
        group: {
            kind: CodeActionKind.QuickFix,
            title: localize('codeAction.widget.id.quickfix', 'Quick Fix')
        }
    });
    for (const quickFix of showHeaders ? inputQuickFixes : inputQuickFixes.filter(i => !!i.action)) {
        if (!quickFix.disabled && quickFix.action) {
            menuItems.push({
                kind: "action" /* ActionListItemKind.Action */,
                item: quickFix,
                group: {
                    kind: CodeActionKind.QuickFix,
                    icon: getQuickFixIcon(quickFix),
                    title: quickFix.action.label
                },
                disabled: false,
                label: quickFix.title
            });
        }
    }
    return menuItems;
}
function getQuickFixIcon(quickFix) {
    if (quickFix.kind === 'explain') {
        return Codicon.sparkle;
    }
    switch (quickFix.type) {
        case TerminalQuickFixType.Opener:
            if ('uri' in quickFix.action && quickFix.action.uri) {
                const isUrl = (quickFix.action.uri.scheme === Schemas.http || quickFix.action.uri.scheme === Schemas.https);
                return isUrl ? Codicon.linkExternal : Codicon.goToFile;
            }
        case TerminalQuickFixType.TerminalCommand:
            return Codicon.run;
        case TerminalQuickFixType.Port:
            return Codicon.debugDisconnect;
        case TerminalQuickFixType.VscodeCommand:
            return Codicon.lightbulb;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tGaXhBZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9xdWlja0ZpeC9icm93c2VyL3F1aWNrRml4QWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFvQixNQUFNLHlDQUF5QyxDQUFDO0FBRTNILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFFMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFzQixZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUV2RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUNySixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUVwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUV4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