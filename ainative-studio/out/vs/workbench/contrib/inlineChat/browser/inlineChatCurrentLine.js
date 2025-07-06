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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEN1cnJlbnRMaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXRDdXJyZW50TGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0SSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLHlCQUF5QixFQUFFLHVCQUF1QixFQUF3QixNQUFNLHlCQUF5QixDQUFDO0FBQ2pJLE9BQU8sRUFBRSxhQUFhLEVBQW9CLE1BQU0sZ0RBQWdELENBQUM7QUFDakcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFbkYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUvRCxPQUFPLEVB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