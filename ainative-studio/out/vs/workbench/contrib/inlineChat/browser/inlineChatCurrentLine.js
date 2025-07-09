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
var InlineChatHintsController_1;
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { InlineChatController } from './inlineChatController.js';
import { ACTION_START, CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_VISIBLE } from '../common/inlineChat.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Position } from '../../../../editor/common/core/position.js';
import { AbstractInline1ChatAction } from './inlineChatActions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { URI } from '../../../../base/common/uri.js';
import { isEqual } from '../../../../base/common/resources.js';
import { autorun, derivedWithStore, observableFromEvent, observableValue } from '../../../../base/common/observable.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import './media/inlineChat.css';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { IMarkerDecorationsService } from '../../../../editor/common/services/markerDecorations.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { toAction } from '../../../../base/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { observableCodeEditor } from '../../../../editor/browser/observableCodeEditor.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { createStyleSheet2 } from '../../../../base/browser/domStylesheets.js';
import { stringValue } from '../../../../base/browser/cssValue.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { Emitter } from '../../../../base/common/event.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
export const CTX_INLINE_CHAT_SHOWING_HINT = new RawContextKey('inlineChatShowingHint', false, localize('inlineChatShowingHint', "Whether inline chat shows a contextual hint"));
const _inlineChatActionId = 'inlineChat.startWithCurrentLine';
export class InlineChatExpandLineAction extends EditorAction2 {
    constructor() {
        super({
            id: _inlineChatActionId,
            category: AbstractInline1ChatAction.category,
            title: localize2('startWithCurrentLine', "Start in Editor with Current Line"),
            f1: true,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE.negate(), CTX_INLINE_CHAT_HAS_AGENT, EditorContextKeys.writable),
            keybinding: [{
                    when: CTX_INLINE_CHAT_SHOWING_HINT,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
                }, {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 39 /* KeyCode.KeyI */),
                }]
        });
    }
    async runEditorCommand(_accessor, editor) {
        const ctrl = InlineChatController.get(editor);
        if (!ctrl || !editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        const lineNumber = editor.getSelection().positionLineNumber;
        const lineContent = model.getLineContent(lineNumber);
        const startColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        const endColumn = model.getLineMaxColumn(lineNumber);
        // clear the line
        let undoEdits = [];
        model.pushEditOperations(null, [EditOperation.replace(new Range(lineNumber, startColumn, lineNumber, endColumn), '')], (edits) => {
            undoEdits = edits;
            return null;
        });
        // trigger chat
        const accepted = await ctrl.run({
            autoSend: true,
            message: lineContent.trim(),
            position: new Position(lineNumber, startColumn)
        });
        if (!accepted) {
            model.pushEditOperations(null, undoEdits, () => null);
        }
    }
}
export class ShowInlineChatHintAction extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.showHint',
            category: AbstractInline1ChatAction.category,
            title: localize2('showHint', "Show Inline Chat Hint"),
            f1: false,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE.negate(), CTX_INLINE_CHAT_HAS_AGENT, EditorContextKeys.writable),
        });
    }
    async runEditorCommand(_accessor, editor, ...args) {
        if (!editor.hasModel()) {
            return;
        }
        const ctrl = InlineChatHintsController.get(editor);
        if (!ctrl) {
            return;
        }
        const [uri, position] = args;
        if (!URI.isUri(uri) || !Position.isIPosition(position)) {
            ctrl.hide();
            return;
        }
        const model = editor.getModel();
        if (!isEqual(model.uri, uri)) {
            ctrl.hide();
            return;
        }
        model.tokenization.forceTokenization(position.lineNumber);
        const tokens = model.tokenization.getLineTokens(position.lineNumber);
        let totalLength = 0;
        let specialLength = 0;
        let lastTokenType;
        tokens.forEach(idx => {
            const tokenType = tokens.getStandardTokenType(idx);
            const startOffset = tokens.getStartOffset(idx);
            const endOffset = tokens.getEndOffset(idx);
            totalLength += endOffset - startOffset;
            if (tokenType !== 0 /* StandardTokenType.Other */) {
                specialLength += endOffset - startOffset;
            }
            lastTokenType = tokenType;
        });
        if (specialLength / totalLength > 0.25) {
            ctrl.hide();
            return;
        }
        if (lastTokenType === 1 /* StandardTokenType.Comment */) {
            ctrl.hide();
            return;
        }
        ctrl.show();
    }
}
let InlineChatHintsController = class InlineChatHintsController extends Disposable {
    static { InlineChatHintsController_1 = this; }
    static { this.ID = 'editor.contrib.inlineChatHints'; }
    static get(editor) {
        return editor.getContribution(InlineChatHintsController_1.ID);
    }
    constructor(editor, contextKeyService, commandService, keybindingService, chatAgentService, markerDecorationService, _contextMenuService, _configurationService) {
        super();
        this._contextMenuService = _contextMenuService;
        this._configurationService = _configurationService;
        this._visibilityObs = observableValue(this, false);
        this._editor = editor;
        this._ctxShowingHint = CTX_INLINE_CHAT_SHOWING_HINT.bindTo(contextKeyService);
        const ghostCtrl = InlineCompletionsController.get(editor);
        this._store.add(commandService.onWillExecuteCommand(e => {
            if (e.commandId === _inlineChatActionId || e.commandId === ACTION_START) {
                this.hide();
            }
        }));
        this._store.add(this._editor.onMouseDown(e => {
            if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
                return;
            }
            if (!e.target.element?.classList.contains('inline-chat-hint-text')) {
                return;
            }
            if (e.event.leftButton) {
                commandService.executeCommand(_inlineChatActionId);
                this.hide();
            }
            else if (e.event.rightButton) {
                e.event.preventDefault();
                this._showContextMenu(e.event, e.target.element?.classList.contains('whitespace')
                    ? "inlineChat.lineEmptyHint" /* InlineChatConfigKeys.LineEmptyHint */
                    : "inlineChat.lineNaturalLanguageHint" /* InlineChatConfigKeys.LineNLHint */);
            }
        }));
        const markerSuppression = this._store.add(new MutableDisposable());
        const decos = this._editor.createDecorationsCollection();
        const editorObs = observableCodeEditor(editor);
        const keyObs = observableFromEvent(keybindingService.onDidUpdateKeybindings, _ => keybindingService.lookupKeybinding(ACTION_START)?.getLabel());
        const configHintEmpty = observableConfigValue("inlineChat.lineEmptyHint" /* InlineChatConfigKeys.LineEmptyHint */, false, this._configurationService);
        const configHintNL = observableConfigValue("inlineChat.lineNaturalLanguageHint" /* InlineChatConfigKeys.LineNLHint */, false, this._configurationService);
        const showDataObs = derivedWithStore((r, store) => {
            const ghostState = ghostCtrl?.model.read(r)?.state.read(r);
            const textFocus = editorObs.isTextFocused.read(r);
            let position = editorObs.cursorPosition.read(r);
            const model = editorObs.model.read(r);
            const kb = keyObs.read(r);
            if (ghostState !== undefined || !kb || !position || !model || !textFocus) {
                return undefined;
            }
            if (model.getLanguageId() === PLAINTEXT_LANGUAGE_ID || model.getLanguageId() === 'markdown') {
                return undefined;
            }
            // DEBT - I cannot use `model.onDidChangeContent` directly here
            // https://github.com/microsoft/vscode/issues/242059
            const emitter = store.add(new Emitter());
            store.add(model.onDidChangeContent(() => emitter.fire()));
            observableFromEvent(emitter.event, () => model.getVersionId()).read(r);
            // position can be wrong
            position = model.validatePosition(position);
            const visible = this._visibilityObs.read(r);
            const isEol = model.getLineMaxColumn(position.lineNumber) === position.column;
            const isWhitespace = model.getLineLastNonWhitespaceColumn(position.lineNumber) === 0 && model.getValueLength() > 0 && position.column > 1;
            if (isWhitespace) {
                return configHintEmpty.read(r)
                    ? { isEol, isWhitespace, kb, position, model }
                    : undefined;
            }
            if (visible && isEol && configHintNL.read(r)) {
                return { isEol, isWhitespace, kb, position, model };
            }
            return undefined;
        });
        const style = createStyleSheet2();
        this._store.add(style);
        this._store.add(autorun(r => {
            const showData = showDataObs.read(r);
            if (!showData) {
                decos.clear();
                markerSuppression.clear();
                this._ctxShowingHint.reset();
                return;
            }
            const agentName = chatAgentService.getDefaultAgent(ChatAgentLocation.Editor)?.name ?? localize('defaultTitle', "Chat");
            const { position, isEol, isWhitespace, kb, model } = showData;
            const inlineClassName = ['a' /*HACK but sorts as we want*/, 'inline-chat-hint', 'inline-chat-hint-text'];
            let content;
            if (isWhitespace) {
                content = '\u00a0' + localize('title2', "{0} to edit with {1}", kb, agentName);
            }
            else if (isEol) {
                content = '\u00a0' + localize('title1', "{0} to continue with {1}", kb, agentName);
            }
            else {
                content = '\u200a' + kb + '\u200a';
                inlineClassName.push('embedded');
            }
            style.setStyle(`.inline-chat-hint-text::after { content: ${stringValue(content)} }`);
            if (isWhitespace) {
                inlineClassName.push('whitespace');
            }
            this._ctxShowingHint.set(true);
            decos.set([{
                    range: Range.fromPositions(position),
                    options: {
                        description: 'inline-chat-hint-line',
                        showIfCollapsed: true,
                        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                        afterContentClassName: inlineClassName.join(' '),
                    }
                }]);
            markerSuppression.value = markerDecorationService.addMarkerSuppression(model.uri, model.validateRange(new Range(position.lineNumber, 1, position.lineNumber, Number.MAX_SAFE_INTEGER)));
        }));
    }
    _showContextMenu(event, setting) {
        this._contextMenuService.showContextMenu({
            getAnchor: () => ({ x: event.posx, y: event.posy }),
            getActions: () => [
                toAction({
                    id: 'inlineChat.disableHint',
                    label: localize('disableHint', "Disable Inline Chat Hint"),
                    run: async () => {
                        await this._configurationService.updateValue(setting, false);
                    }
                })
            ]
        });
    }
    show() {
        this._visibilityObs.set(true, undefined);
    }
    hide() {
        this._visibilityObs.set(false, undefined);
    }
};
InlineChatHintsController = InlineChatHintsController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, ICommandService),
    __param(3, IKeybindingService),
    __param(4, IChatAgentService),
    __param(5, IMarkerDecorationsService),
    __param(6, IContextMenuService),
    __param(7, IConfigurationService)
], InlineChatHintsController);
export { InlineChatHintsController };
export class HideInlineChatHintAction extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.hideHint',
            title: localize2('hideHint', "Hide Inline Chat Hint"),
            precondition: CTX_INLINE_CHAT_SHOWING_HINT,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
                primary: 9 /* KeyCode.Escape */
            }
        });
    }
    async runEditorCommand(_accessor, editor) {
        InlineChatHintsController.get(editor)?.hide();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEN1cnJlbnRMaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0Q3VycmVudExpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdyRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBRSx1QkFBdUIsRUFBd0IsTUFBTSx5QkFBeUIsQ0FBQztBQUNqSSxPQUFPLEVBQUUsYUFBYSxFQUFvQixNQUFNLGdEQUFnRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNoRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEUsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRW5GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFL0QsT0FBTyxF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