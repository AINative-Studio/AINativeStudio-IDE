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
import './emptyTextEditorHint.css';
import * as dom from '../../../../../base/browser/dom.js';
import { DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ChangeLanguageAction } from '../../../../browser/parts/editor/editorStatus.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { Schemas } from '../../../../../base/common/network.js';
import { Event } from '../../../../../base/common/event.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { registerEditorContribution } from '../../../../../editor/browser/editorExtensions.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { renderFormattedText } from '../../../../../base/browser/formattedTextRenderer.js';
import { ApplyFileSnippetAction } from '../../../snippets/browser/commands/fileTemplateSnippets.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { KeybindingLabel } from '../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { OS } from '../../../../../base/common/platform.js';
import { status } from '../../../../../base/browser/ui/aria/aria.js';
import { LOG_MODE_ID, OUTPUT_MODE_ID } from '../../../../services/output/common/output.js';
import { SEARCH_RESULT_LANGUAGE_ID } from '../../../../services/search/common/search.js';
import { getDefaultHoverDelegate } from '../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IChatAgentService } from '../../../chat/common/chatAgents.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
const $ = dom.$;
export const emptyTextEditorHintSetting = 'workbench.editor.empty.hint';
let EmptyTextEditorHintContribution = class EmptyTextEditorHintContribution {
    static { this.ID = 'editor.contrib.emptyTextEditorHint'; }
    constructor(editor, editorGroupsService, commandService, configurationService, hoverService, keybindingService, inlineChatSessionService, chatAgentService, telemetryService, productService, contextMenuService) {
        this.editor = editor;
        this.editorGroupsService = editorGroupsService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.keybindingService = keybindingService;
        this.inlineChatSessionService = inlineChatSessionService;
        this.chatAgentService = chatAgentService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.contextMenuService = contextMenuService;
        this.toDispose = [];
        this.toDispose.push(this.editor.onDidChangeModel(() => this.update()));
        this.toDispose.push(this.editor.onDidChangeModelLanguage(() => this.update()));
        this.toDispose.push(this.editor.onDidChangeModelContent(() => this.update()));
        this.toDispose.push(this.chatAgentService.onDidChangeAgents(() => this.update()));
        this.toDispose.push(this.editor.onDidChangeModelDecorations(() => this.update()));
        this.toDispose.push(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(96 /* EditorOption.readOnly */)) {
                this.update();
            }
        }));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(emptyTextEditorHintSetting)) {
                this.update();
            }
        }));
        this.toDispose.push(inlineChatSessionService.onWillStartSession(editor => {
            if (this.editor === editor) {
                this.textHintContentWidget?.dispose();
            }
        }));
        this.toDispose.push(inlineChatSessionService.onDidEndSession(e => {
            if (this.editor === e.editor) {
                this.update();
            }
        }));
    }
    _getOptions() {
        return { clickable: true };
    }
    _shouldRenderHint() {
        const configValue = this.configurationService.getValue(emptyTextEditorHintSetting);
        if (configValue === 'hidden') {
            return false;
        }
        if (this.editor.getOption(96 /* EditorOption.readOnly */)) {
            return false;
        }
        const model = this.editor.getModel();
        const languageId = model?.getLanguageId();
        if (!model || languageId === OUTPUT_MODE_ID || languageId === LOG_MODE_ID || languageId === SEARCH_RESULT_LANGUAGE_ID) {
            return false;
        }
        if (this.inlineChatSessionService.getSession(this.editor, model.uri)) {
            return false;
        }
        if (this.editor.getModel()?.getValueLength()) {
            return false;
        }
        const hasConflictingDecorations = Boolean(this.editor.getLineDecorations(1)?.find((d) => d.options.beforeContentClassName
            || d.options.afterContentClassName
            || d.options.before?.content
            || d.options.after?.content));
        if (hasConflictingDecorations) {
            return false;
        }
        const hasEditorAgents = Boolean(this.chatAgentService.getDefaultAgent(ChatAgentLocation.Editor));
        const shouldRenderDefaultHint = model?.uri.scheme === Schemas.untitled && languageId === PLAINTEXT_LANGUAGE_ID;
        return hasEditorAgents || shouldRenderDefaultHint;
    }
    update() {
        const shouldRenderHint = this._shouldRenderHint();
        if (shouldRenderHint && !this.textHintContentWidget) {
            this.textHintContentWidget = new EmptyTextEditorHintContentWidget(this.editor, this._getOptions(), this.editorGroupsService, this.commandService, this.configurationService, this.hoverService, this.keybindingService, this.chatAgentService, this.telemetryService, this.productService, this.contextMenuService);
        }
        else if (!shouldRenderHint && this.textHintContentWidget) {
            this.textHintContentWidget.dispose();
            this.textHintContentWidget = undefined;
        }
    }
    dispose() {
        dispose(this.toDispose);
        this.textHintContentWidget?.dispose();
    }
};
EmptyTextEditorHintContribution = __decorate([
    __param(1, IEditorGroupsService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IHoverService),
    __param(5, IKeybindingService),
    __param(6, IInlineChatSessionService),
    __param(7, IChatAgentService),
    __param(8, ITelemetryService),
    __param(9, IProductService),
    __param(10, IContextMenuService)
], EmptyTextEditorHintContribution);
export { EmptyTextEditorHintContribution };
class EmptyTextEditorHintContentWidget {
    static { this.ID = 'editor.widget.emptyHint'; }
    constructor(editor, options, editorGroupsService, commandService, configurationService, hoverService, keybindingService, chatAgentService, telemetryService, productService, contextMenuService) {
        this.editor = editor;
        this.options = options;
        this.editorGroupsService = editorGroupsService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.keybindingService = keybindingService;
        this.chatAgentService = chatAgentService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.contextMenuService = contextMenuService;
        this.isVisible = false;
        this.ariaLabel = '';
        this.toDispose = new DisposableStore();
        this.toDispose.add(this.editor.onDidChangeConfiguration((e) => {
            if (this.domNode && e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this.editor.applyFontInfo(this.domNode);
            }
        }));
        const onDidFocusEditorText = Event.debounce(this.editor.onDidFocusEditorText, () => undefined, 500);
        this.toDispose.add(onDidFocusEditorText(() => {
            if (this.editor.hasTextFocus() && this.isVisible && this.ariaLabel && this.configurationService.getValue("accessibility.verbosity.emptyEditorHint" /* AccessibilityVerbositySettingId.EmptyEditorHint */)) {
                status(this.ariaLabel);
            }
        }));
        this.editor.addContentWidget(this);
    }
    getId() {
        return EmptyTextEditorHintContentWidget.ID;
    }
    _disableHint(e) {
        const disableHint = () => {
            this.configurationService.updateValue(emptyTextEditorHintSetting, 'hidden');
            this.dispose();
            this.editor.focus();
        };
        if (!e) {
            disableHint();
            return;
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => { return new StandardMouseEvent(dom.getActiveWindow(), e); },
            getActions: () => {
                return [{
                        id: 'workench.action.disableEmptyEditorHint',
                        label: localize('disableEditorEmptyHint', "Disable Empty Editor Hint"),
                        tooltip: localize('disableEditorEmptyHint', "Disable Empty Editor Hint"),
                        enabled: true,
                        class: undefined,
                        run: () => {
                            disableHint();
                        }
                    }
                ];
            }
        });
    }
    _getHintInlineChat(providers) {
        const providerName = (providers.length === 1 ? providers[0].fullName : undefined) ?? this.productService.nameShort;
        const inlineChatId = 'inlineChat.start';
        let ariaLabel = `Ask ${providerName} something or start typing to dismiss.`;
        const handleClick = () => {
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: 'inlineChat.hintAction',
                from: 'hint'
            });
            this.commandService.executeCommand(inlineChatId, { from: 'hint' });
        };
        const hintHandler = {
            disposables: this.toDispose,
            callback: (index, _event) => {
                switch (index) {
                    case '0':
                        handleClick();
                        break;
                }
            }
        };
        const hintElement = $('empty-hint-text');
        hintElement.style.display = 'block';
        const keybindingHint = this.keybindingService.lookupKeybinding(inlineChatId);
        const keybindingHintLabel = keybindingHint?.getLabel();
        if (keybindingHint && keybindingHintLabel) {
            const actionPart = localize('emptyHintText', 'Press {0} to ask {1} to do something. ', keybindingHintLabel, providerName);
            const [before, after] = actionPart.split(keybindingHintLabel).map((fragment) => {
                if (this.options.clickable) {
                    const hintPart = $('a', undefined, fragment);
                    hintPart.style.fontStyle = 'italic';
                    hintPart.style.cursor = 'pointer';
                    this.toDispose.add(dom.addDisposableListener(hintPart, dom.EventType.CONTEXT_MENU, (e) => this._disableHint(e)));
                    this.toDispose.add(dom.addDisposableListener(hintPart, dom.EventType.CLICK, handleClick));
                    return hintPart;
                }
                else {
                    const hintPart = $('span', undefined, fragment);
                    hintPart.style.fontStyle = 'italic';
                    return hintPart;
                }
            });
            hintElement.appendChild(before);
            const label = hintHandler.disposables.add(new KeybindingLabel(hintElement, OS));
            label.set(keybindingHint);
            label.element.style.width = 'min-content';
            label.element.style.display = 'inline';
            if (this.options.clickable) {
                label.element.style.cursor = 'pointer';
                this.toDispose.add(dom.addDisposableListener(label.element, dom.EventType.CONTEXT_MENU, (e) => this._disableHint(e)));
                this.toDispose.add(dom.addDisposableListener(label.element, dom.EventType.CLICK, handleClick));
            }
            hintElement.appendChild(after);
            const typeToDismiss = localize('emptyHintTextDismiss', 'Start typing to dismiss.');
            const textHint2 = $('span', undefined, typeToDismiss);
            textHint2.style.fontStyle = 'italic';
            hintElement.appendChild(textHint2);
            ariaLabel = actionPart.concat(typeToDismiss);
        }
        else {
            const hintMsg = localize({
                key: 'inlineChatHint',
                comment: [
                    'Preserve double-square brackets and their order',
                ]
            }, '[[Ask {0} to do something]] or start typing to dismiss.', providerName);
            const rendered = renderFormattedText(hintMsg, { actionHandler: hintHandler });
            hintElement.appendChild(rendered);
        }
        return { ariaLabel, hintElement };
    }
    _getHintDefault() {
        const hintHandler = {
            disposables: this.toDispose,
            callback: (index, event) => {
                switch (index) {
                    case '0':
                        languageOnClickOrTap(event.browserEvent);
                        break;
                    case '1':
                        snippetOnClickOrTap(event.browserEvent);
                        break;
                    case '2':
                        chooseEditorOnClickOrTap(event.browserEvent);
                        break;
                    case '3':
                        this._disableHint();
                        break;
                }
            }
        };
        // the actual command handlers...
        const languageOnClickOrTap = async (e) => {
            e.stopPropagation();
            // Need to focus editor before so current editor becomes active and the command is properly executed
            this.editor.focus();
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: ChangeLanguageAction.ID,
                from: 'hint'
            });
            await this.commandService.executeCommand(ChangeLanguageAction.ID);
            this.editor.focus();
        };
        const snippetOnClickOrTap = async (e) => {
            e.stopPropagation();
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: ApplyFileSnippetAction.Id,
                from: 'hint'
            });
            await this.commandService.executeCommand(ApplyFileSnippetAction.Id);
        };
        const chooseEditorOnClickOrTap = async (e) => {
            e.stopPropagation();
            const activeEditorInput = this.editorGroupsService.activeGroup.activeEditor;
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: 'welcome.showNewFileEntries',
                from: 'hint'
            });
            const newEditorSelected = await this.commandService.executeCommand('welcome.showNewFileEntries', { from: 'hint' });
            // Close the active editor as long as it is untitled (swap the editors out)
            if (newEditorSelected && activeEditorInput !== null && activeEditorInput.resource?.scheme === Schemas.untitled) {
                this.editorGroupsService.activeGroup.closeEditor(activeEditorInput, { preserveFocus: true });
            }
        };
        const hintMsg = localize({
            key: 'message',
            comment: [
                'Preserve double-square brackets and their order',
                'language refers to a programming language'
            ]
        }, '[[Select a language]], or [[fill with template]], or [[open a different editor]] to get started.\nStart typing to dismiss or [[don\'t show]] this again.');
        const hintElement = renderFormattedText(hintMsg, {
            actionHandler: hintHandler,
            renderCodeSegments: false,
        });
        hintElement.style.fontStyle = 'italic';
        // ugly way to associate keybindings...
        const keybindingsLookup = [ChangeLanguageAction.ID, ApplyFileSnippetAction.Id, 'welcome.showNewFileEntries'];
        const keybindingLabels = keybindingsLookup.map((id) => this.keybindingService.lookupKeybinding(id)?.getLabel() ?? id);
        const ariaLabel = localize('defaultHintAriaLabel', 'Execute {0} to select a language, execute {1} to fill with template, or execute {2} to open a different editor and get started. Start typing to dismiss.', ...keybindingLabels);
        for (const anchor of hintElement.querySelectorAll('a')) {
            anchor.style.cursor = 'pointer';
            const id = keybindingsLookup.shift();
            const title = id && this.keybindingService.lookupKeybinding(id)?.getLabel();
            hintHandler.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), anchor, title ?? ''));
        }
        return { hintElement, ariaLabel };
    }
    getDomNode() {
        if (!this.domNode) {
            this.domNode = $('.empty-editor-hint');
            this.domNode.style.width = 'max-content';
            this.domNode.style.paddingLeft = '4px';
            const inlineChatProviders = this.chatAgentService.getActivatedAgents().filter(candidate => candidate.locations.includes(ChatAgentLocation.Editor));
            const { hintElement, ariaLabel } = !inlineChatProviders.length ? this._getHintDefault() : this._getHintInlineChat(inlineChatProviders);
            this.domNode.append(hintElement);
            this.ariaLabel = ariaLabel.concat(localize('disableHint', ' Toggle {0} in settings to disable this hint.', "accessibility.verbosity.emptyEditorHint" /* AccessibilityVerbositySettingId.EmptyEditorHint */));
            this.toDispose.add(dom.addDisposableListener(this.domNode, 'click', () => {
                this.editor.focus();
            }));
            this.editor.applyFontInfo(this.domNode);
        }
        return this.domNode;
    }
    getPosition() {
        return {
            position: { lineNumber: 1, column: 1 },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */]
        };
    }
    dispose() {
        this.editor.removeContentWidget(this);
        dispose(this.toDispose);
    }
}
registerEditorContribution(EmptyTextEditorHintContribution.ID, EmptyTextEditorHintContribution, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to render a help message
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlUZXh0RWRpdG9ySGludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvZW1wdHlUZXh0RWRpdG9ySGludC9lbXB0eVRleHRFZGl0b3JIaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQW1DLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDaEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDakcsT0FBTyxFQUF5QixtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxN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