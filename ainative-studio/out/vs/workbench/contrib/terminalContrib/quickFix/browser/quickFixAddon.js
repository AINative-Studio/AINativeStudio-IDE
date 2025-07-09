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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tGaXhBZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvcXVpY2tGaXgvYnJvd3Nlci9xdWlja0ZpeEFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBb0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUUzSCxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBc0IsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFdkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUZBQW1GLENBQUM7QUFDckosT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFFcEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFF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