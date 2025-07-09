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
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { CharacterSet } from '../../../common/core/characterClassifier.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { formatDocumentRangesWithSelectedProvider, formatDocumentWithSelectedProvider, getOnTypeFormattingEdits } from './format.js';
import { FormattingEdit } from './formattingEdit.js';
import * as nls from '../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorProgressService, Progress } from '../../../../platform/progress/common/progress.js';
let FormatOnType = class FormatOnType {
    static { this.ID = 'editor.contrib.autoFormat'; }
    constructor(_editor, _languageFeaturesService, _workerService, _accessibilitySignalService) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._workerService = _workerService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._disposables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._disposables.add(_languageFeaturesService.onTypeFormattingEditProvider.onDidChange(this._update, this));
        this._disposables.add(_editor.onDidChangeModel(() => this._update()));
        this._disposables.add(_editor.onDidChangeModelLanguage(() => this._update()));
        this._disposables.add(_editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(58 /* EditorOption.formatOnType */)) {
                this._update();
            }
        }));
        this._update();
    }
    dispose() {
        this._disposables.dispose();
        this._sessionDisposables.dispose();
    }
    _update() {
        // clean up
        this._sessionDisposables.clear();
        // we are disabled
        if (!this._editor.getOption(58 /* EditorOption.formatOnType */)) {
            return;
        }
        // no model
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        // no support
        const [support] = this._languageFeaturesService.onTypeFormattingEditProvider.ordered(model);
        if (!support || !support.autoFormatTriggerCharacters) {
            return;
        }
        // register typing listeners that will trigger the format
        const triggerChars = new CharacterSet();
        for (const ch of support.autoFormatTriggerCharacters) {
            triggerChars.add(ch.charCodeAt(0));
        }
        this._sessionDisposables.add(this._editor.onDidType((text) => {
            const lastCharCode = text.charCodeAt(text.length - 1);
            if (triggerChars.has(lastCharCode)) {
                this._trigger(String.fromCharCode(lastCharCode));
            }
        }));
    }
    _trigger(ch) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (this._editor.getSelections().length > 1 || !this._editor.getSelection().isEmpty()) {
            return;
        }
        const model = this._editor.getModel();
        const position = this._editor.getPosition();
        const cts = new CancellationTokenSource();
        // install a listener that checks if edits happens before the
        // position on which we format right now. If so, we won't
        // apply the format edits
        const unbind = this._editor.onDidChangeModelContent((e) => {
            if (e.isFlush) {
                // a model.setValue() was called
                // cancel only once
                cts.cancel();
                unbind.dispose();
                return;
            }
            for (let i = 0, len = e.changes.length; i < len; i++) {
                const change = e.changes[i];
                if (change.range.endLineNumber <= position.lineNumber) {
                    // cancel only once
                    cts.cancel();
                    unbind.dispose();
                    return;
                }
            }
        });
        getOnTypeFormattingEdits(this._workerService, this._languageFeaturesService, model, position, ch, model.getFormattingOptions(), cts.token).then(edits => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            if (isNonEmptyArray(edits)) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.format, { userGesture: false });
                FormattingEdit.execute(this._editor, edits, true);
            }
        }).finally(() => {
            unbind.dispose();
        });
    }
};
FormatOnType = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, IEditorWorkerService),
    __param(3, IAccessibilitySignalService)
], FormatOnType);
export { FormatOnType };
let FormatOnPaste = class FormatOnPaste {
    static { this.ID = 'editor.contrib.formatOnPaste'; }
    constructor(editor, _languageFeaturesService, _instantiationService) {
        this.editor = editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._instantiationService = _instantiationService;
        this._callOnDispose = new DisposableStore();
        this._callOnModel = new DisposableStore();
        this._callOnDispose.add(editor.onDidChangeConfiguration(() => this._update()));
        this._callOnDispose.add(editor.onDidChangeModel(() => this._update()));
        this._callOnDispose.add(editor.onDidChangeModelLanguage(() => this._update()));
        this._callOnDispose.add(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(this._update, this));
    }
    dispose() {
        this._callOnDispose.dispose();
        this._callOnModel.dispose();
    }
    _update() {
        // clean up
        this._callOnModel.clear();
        // we are disabled
        if (!this.editor.getOption(57 /* EditorOption.formatOnPaste */)) {
            return;
        }
        // no model
        if (!this.editor.hasModel()) {
            return;
        }
        // no formatter
        if (!this._languageFeaturesService.documentRangeFormattingEditProvider.has(this.editor.getModel())) {
            return;
        }
        this._callOnModel.add(this.editor.onDidPaste(({ range }) => this._trigger(range)));
    }
    _trigger(range) {
        if (!this.editor.hasModel()) {
            return;
        }
        if (this.editor.getSelections().length > 1) {
            return;
        }
        this._instantiationService.invokeFunction(formatDocumentRangesWithSelectedProvider, this.editor, range, 2 /* FormattingMode.Silent */, Progress.None, CancellationToken.None, false).catch(onUnexpectedError);
    }
};
FormatOnPaste = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, IInstantiationService)
], FormatOnPaste);
class FormatDocumentAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatDocument',
            label: nls.localize2('formatDocument.label', "Format Document"),
            precondition: ContextKeyExpr.and(EditorContextKeys.notInCompositeEditor, EditorContextKeys.writable, EditorContextKeys.hasDocumentFormattingProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            contextMenuOpts: {
                group: '1_modification',
                order: 1.3
            }
        });
    }
    async run(accessor, editor) {
        if (editor.hasModel()) {
            const instaService = accessor.get(IInstantiationService);
            const progressService = accessor.get(IEditorProgressService);
            await progressService.showWhile(instaService.invokeFunction(formatDocumentWithSelectedProvider, editor, 1 /* FormattingMode.Explicit */, Progress.None, CancellationToken.None, true), 250);
        }
    }
}
class FormatSelectionAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatSelection',
            label: nls.localize2('formatSelection.label', "Format Selection"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasDocumentSelectionFormattingProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            contextMenuOpts: {
                when: EditorContextKeys.hasNonEmptySelection,
                group: '1_modification',
                order: 1.31
            }
        });
    }
    async run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const instaService = accessor.get(IInstantiationService);
        const model = editor.getModel();
        const ranges = editor.getSelections().map(range => {
            return range.isEmpty()
                ? new Range(range.startLineNumber, 1, range.startLineNumber, model.getLineMaxColumn(range.startLineNumber))
                : range;
        });
        const progressService = accessor.get(IEditorProgressService);
        await progressService.showWhile(instaService.invokeFunction(formatDocumentRangesWithSelectedProvider, editor, ranges, 1 /* FormattingMode.Explicit */, Progress.None, CancellationToken.None, true), 250);
    }
}
registerEditorContribution(FormatOnType.ID, FormatOnType, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorContribution(FormatOnPaste.ID, FormatOnPaste, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(FormatDocumentAction);
registerEditorAction(FormatSelectionAction);
// this is the old format action that does both (format document OR format selection)
// and we keep it here such that existing keybinding configurations etc will still work
CommandsRegistry.registerCommand('editor.action.format', async (accessor) => {
    const editor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
    if (!editor || !editor.hasModel()) {
        return;
    }
    const commandService = accessor.get(ICommandService);
    if (editor.getSelection().isEmpty()) {
        await commandService.executeCommand('editor.action.formatDocument');
    }
    else {
        await commandService.executeCommand('editor.action.formatSelection');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb3JtYXQvYnJvd3Nlci9mb3JtYXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsWUFBWSxFQUFtQyxvQkFBb0IsRUFBRSwwQkFBMEIsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6SyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxrQ0FBa0MsRUFBa0Isd0JBQXdCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDckosT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFx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