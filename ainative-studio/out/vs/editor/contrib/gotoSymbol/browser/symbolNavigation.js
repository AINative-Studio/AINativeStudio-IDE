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
import { Emitter } from '../../../../base/common/event.js';
import { combinedDisposable, DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { EditorCommand, registerEditorCommand } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Range } from '../../../common/core/range.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
export const ctxHasSymbols = new RawContextKey('hasSymbols', false, localize('hasSymbols', "Whether there are symbol locations that can be navigated via keyboard-only."));
export const ISymbolNavigationService = createDecorator('ISymbolNavigationService');
let SymbolNavigationService = class SymbolNavigationService {
    constructor(contextKeyService, _editorService, _notificationService, _keybindingService) {
        this._editorService = _editorService;
        this._notificationService = _notificationService;
        this._keybindingService = _keybindingService;
        this._currentModel = undefined;
        this._currentIdx = -1;
        this._ignoreEditorChange = false;
        this._ctxHasSymbols = ctxHasSymbols.bindTo(contextKeyService);
    }
    reset() {
        this._ctxHasSymbols.reset();
        this._currentState?.dispose();
        this._currentMessage?.dispose();
        this._currentModel = undefined;
        this._currentIdx = -1;
    }
    put(anchor) {
        const refModel = anchor.parent.parent;
        if (refModel.references.length <= 1) {
            this.reset();
            return;
        }
        this._currentModel = refModel;
        this._currentIdx = refModel.references.indexOf(anchor);
        this._ctxHasSymbols.set(true);
        this._showMessage();
        const editorState = new EditorState(this._editorService);
        const listener = editorState.onDidChange(_ => {
            if (this._ignoreEditorChange) {
                return;
            }
            const editor = this._editorService.getActiveCodeEditor();
            if (!editor) {
                return;
            }
            const model = editor.getModel();
            const position = editor.getPosition();
            if (!model || !position) {
                return;
            }
            let seenUri = false;
            let seenPosition = false;
            for (const reference of refModel.references) {
                if (isEqual(reference.uri, model.uri)) {
                    seenUri = true;
                    seenPosition = seenPosition || Range.containsPosition(reference.range, position);
                }
                else if (seenUri) {
                    break;
                }
            }
            if (!seenUri || !seenPosition) {
                this.reset();
            }
        });
        this._currentState = combinedDisposable(editorState, listener);
    }
    revealNext(source) {
        if (!this._currentModel) {
            return Promise.resolve();
        }
        // get next result and advance
        this._currentIdx += 1;
        this._currentIdx %= this._currentModel.references.length;
        const reference = this._currentModel.references[this._currentIdx];
        // status
        this._showMessage();
        // open editor, ignore events while that happens
        this._ignoreEditorChange = true;
        return this._editorService.openCodeEditor({
            resource: reference.uri,
            options: {
                selection: Range.collapseToStart(reference.range),
                selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */
            }
        }, source).finally(() => {
            this._ignoreEditorChange = false;
        });
    }
    _showMessage() {
        this._currentMessage?.dispose();
        const kb = this._keybindingService.lookupKeybinding('editor.gotoNextSymbolFromResult');
        const message = kb
            ? localize('location.kb', "Symbol {0} of {1}, {2} for next", this._currentIdx + 1, this._currentModel.references.length, kb.getLabel())
            : localize('location', "Symbol {0} of {1}", this._currentIdx + 1, this._currentModel.references.length);
        this._currentMessage = this._notificationService.status(message);
    }
};
SymbolNavigationService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ICodeEditorService),
    __param(2, INotificationService),
    __param(3, IKeybindingService)
], SymbolNavigationService);
registerSingleton(ISymbolNavigationService, SymbolNavigationService, 1 /* InstantiationType.Delayed */);
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.gotoNextSymbolFromResult',
            precondition: ctxHasSymbols,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 70 /* KeyCode.F12 */
            }
        });
    }
    runEditorCommand(accessor, editor) {
        return accessor.get(ISymbolNavigationService).revealNext(editor);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'editor.gotoNextSymbolFromResult.cancel',
    weight: 100 /* KeybindingWeight.EditorContrib */,
    when: ctxHasSymbols,
    primary: 9 /* KeyCode.Escape */,
    handler(accessor) {
        accessor.get(ISymbolNavigationService).reset();
    }
});
//
let EditorState = class EditorState {
    constructor(editorService) {
        this._listener = new Map();
        this._disposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._disposables.add(editorService.onCodeEditorRemove(this._onDidRemoveEditor, this));
        this._disposables.add(editorService.onCodeEditorAdd(this._onDidAddEditor, this));
        editorService.listCodeEditors().forEach(this._onDidAddEditor, this);
    }
    dispose() {
        this._disposables.dispose();
        this._onDidChange.dispose();
        dispose(this._listener.values());
    }
    _onDidAddEditor(editor) {
        this._listener.set(editor, combinedDisposable(editor.onDidChangeCursorPosition(_ => this._onDidChange.fire({ editor })), editor.onDidChangeModelContent(_ => this._onDidChange.fire({ editor }))));
    }
    _onDidRemoveEditor(editor) {
        this._listener.get(editor)?.dispose();
        this._listener.delete(editor);
    }
};
EditorState = __decorate([
    __param(0, ICodeEditorService)
], EditorState);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9sTmF2aWdhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9zeW1ib2xOYXZpZ2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdEgsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDL0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRWhHLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FB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