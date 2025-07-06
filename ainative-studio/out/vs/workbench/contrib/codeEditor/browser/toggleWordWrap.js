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
import { addDisposableListener, onDidRegisterWindow } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerDiffEditorContribution, registerEditorAction, registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { findDiffEditorContainingCodeEditor } from '../../../../editor/browser/widget/diffEditor/commands.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const transientWordWrapState = 'transientWordWrapState';
const isWordWrapMinifiedKey = 'isWordWrapMinified';
const isDominatedByLongLinesKey = 'isDominatedByLongLines';
const CAN_TOGGLE_WORD_WRAP = new RawContextKey('canToggleWordWrap', false, true);
const EDITOR_WORD_WRAP = new RawContextKey('editorWordWrap', false, nls.localize('editorWordWrap', 'Whether the editor is currently using word wrapping.'));
/**
 * Store (in memory) the word wrap state for a particular model.
 */
export function writeTransientState(model, state, codeEditorService) {
    codeEditorService.setTransientModelProperty(model, transientWordWrapState, state);
}
/**
 * Read (in memory) the word wrap state for a particular model.
 */
export function readTransientState(model, codeEditorService) {
    return codeEditorService.getTransientModelProperty(model, transientWordWrapState);
}
const TOGGLE_WORD_WRAP_ID = 'editor.action.toggleWordWrap';
class ToggleWordWrapAction extends EditorAction {
    constructor() {
        super({
            id: TOGGLE_WORD_WRAP_ID,
            label: nls.localize2('toggle.wordwrap', "View: Toggle Word Wrap"),
            precondition: undefined,
            kbOpts: {
                kbExpr: null,
                primary: 512 /* KeyMod.Alt */ | 56 /* KeyCode.KeyZ */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const instaService = accessor.get(IInstantiationService);
        if (!canToggleWordWrap(codeEditorService, editor)) {
            return;
        }
        const model = editor.getModel();
        // Read the current state
        const transientState = readTransientState(model, codeEditorService);
        // Compute the new state
        let newState;
        if (transientState) {
            newState = null;
        }
        else {
            const actualWrappingInfo = editor.getOption(152 /* EditorOption.wrappingInfo */);
            const wordWrapOverride = (actualWrappingInfo.wrappingColumn === -1 ? 'on' : 'off');
            newState = { wordWrapOverride };
        }
        // Write the new state
        // (this will cause an event and the controller will apply the state)
        writeTransientState(model, newState, codeEditorService);
        // if we are in a diff editor, update the other editor (if possible)
        const diffEditor = instaService.invokeFunction(findDiffEditorContainingCodeEditor, editor);
        if (diffEditor) {
            const originalEditor = diffEditor.getOriginalEditor();
            const modifiedEditor = diffEditor.getModifiedEditor();
            const otherEditor = (originalEditor === editor ? modifiedEditor : originalEditor);
            if (canToggleWordWrap(codeEditorService, otherEditor)) {
                writeTransientState(otherEditor.getModel(), newState, codeEditorService);
                diffEditor.updateOptions({});
            }
        }
    }
}
let ToggleWordWrapController = class ToggleWordWrapController extends Disposable {
    static { this.ID = 'editor.contrib.toggleWordWrapController'; }
    constructor(_editor, _contextKeyService, _codeEditorService) {
        super();
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._codeEditorService = _codeEditorService;
        const options = this._editor.getOptions();
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const isWordWrapMinified = this._contextKeyService.createKey(isWordWrapMinifiedKey, wrappingInfo.isWordWrapMinified);
        const isDominatedByLongLines = this._contextKeyService.createKey(isDominatedByLongLinesKey, wrappingInfo.isDominatedByLongLines);
        let currentlyApplyingEditorConfig = false;
        this._register(_editor.onDidChangeConfiguration((e) => {
            if (!e.hasChanged(152 /* EditorOption.wrappingInfo */)) {
                return;
            }
            const options = this._editor.getOptions();
            const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
            isWordWrapMinified.set(wrappingInfo.isWordWrapMinified);
            isDominatedByLongLines.set(wrappingInfo.isDominatedByLongLines);
            if (!currentlyApplyingEditorConfig) {
                // I am not the cause of the word wrap getting changed
                ensureWordWrapSettings();
            }
        }));
        this._register(_editor.onDidChangeModel((e) => {
            ensureWordWrapSettings();
        }));
        this._register(_codeEditorService.onDidChangeTransientModelProperty(() => {
            ensureWordWrapSettings();
        }));
        const ensureWordWrapSettings = () => {
            if (!canToggleWordWrap(this._codeEditorService, this._editor)) {
                return;
            }
            const transientState = readTransientState(this._editor.getModel(), this._codeEditorService);
            // Apply the state
            try {
                currentlyApplyingEditorConfig = true;
                this._applyWordWrapState(transientState);
            }
            finally {
                currentlyApplyingEditorConfig = false;
            }
        };
    }
    _applyWordWrapState(state) {
        const wordWrapOverride2 = state ? state.wordWrapOverride : 'inherit';
        this._editor.updateOptions({
            wordWrapOverride2: wordWrapOverride2
        });
    }
};
ToggleWordWrapController = __decorate([
    __param(1, IContextKeyService),
    __param(2, ICodeEditorService)
], ToggleWordWrapController);
let DiffToggleWordWrapController = class DiffToggleWordWrapController extends Disposable {
    static { this.ID = 'diffeditor.contrib.toggleWordWrapController'; }
    constructor(_diffEditor, _codeEditorService) {
        super();
        this._diffEditor = _diffEditor;
        this._codeEditorService = _codeEditorService;
        this._register(this._diffEditor.onDidChangeModel(() => {
            this._ensureSyncedWordWrapToggle();
        }));
    }
    _ensureSyncedWordWrapToggle() {
        const originalEditor = this._diffEditor.getOriginalEditor();
        const modifiedEditor = this._diffEditor.getModifiedEditor();
        if (!originalEditor.hasModel() || !modifiedEditor.hasModel()) {
            return;
        }
        const originalTransientState = readTransientState(originalEditor.getModel(), this._codeEditorService);
        const modifiedTransientState = readTransientState(modifiedEditor.getModel(), this._codeEditorService);
        if (originalTransientState && !modifiedTransientState && canToggleWordWrap(this._codeEditorService, originalEditor)) {
            writeTransientState(modifiedEditor.getModel(), originalTransientState, this._codeEditorService);
            this._diffEditor.updateOptions({});
        }
        if (!originalTransientState && modifiedTransientState && canToggleWordWrap(this._codeEditorService, modifiedEditor)) {
            writeTransientState(originalEditor.getModel(), modifiedTransientState, this._codeEditorService);
            this._diffEditor.updateOptions({});
        }
    }
};
DiffToggleWordWrapController = __decorate([
    __param(1, ICodeEditorService)
], DiffToggleWordWrapController);
function canToggleWordWrap(codeEditorService, editor) {
    if (!editor) {
        return false;
    }
    if (editor.isSimpleWidget) {
        // in a simple widget...
        return false;
    }
    // Ensure correct word wrap settings
    const model = editor.getModel();
    if (!model) {
        return false;
    }
    if (editor.getOption(63 /* EditorOption.inDiffEditor */)) {
        // this editor belongs to a diff editor
        for (const diffEditor of codeEditorService.listDiffEditors()) {
            if (diffEditor.getOriginalEditor() === editor && !diffEditor.renderSideBySide) {
                // this editor is the left side of an inline diff editor
                return false;
            }
        }
    }
    return true;
}
let EditorWordWrapContextKeyTracker = class EditorWordWrapContextKeyTracker extends Disposable {
    static { this.ID = 'workbench.contrib.editorWordWrapContextKeyTracker'; }
    constructor(_editorService, _codeEditorService, _contextService) {
        super();
        this._editorService = _editorService;
        this._codeEditorService = _codeEditorService;
        this._contextService = _contextService;
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(addDisposableListener(window, 'focus', () => this._update(), true));
            disposables.add(addDisposableListener(window, 'blur', () => this._update(), true));
        }, { window: mainWindow, disposables: this._store }));
        this._register(this._editorService.onDidActiveEditorChange(() => this._update()));
        this._canToggleWordWrap = CAN_TOGGLE_WORD_WRAP.bindTo(this._contextService);
        this._editorWordWrap = EDITOR_WORD_WRAP.bindTo(this._contextService);
        this._activeEditor = null;
        this._activeEditorListener = new DisposableStore();
        this._update();
    }
    _update() {
        const activeEditor = this._codeEditorService.getFocusedCodeEditor() || this._codeEditorService.getActiveCodeEditor();
        if (this._activeEditor === activeEditor) {
            // no change
            return;
        }
        this._activeEditorListener.clear();
        this._activeEditor = activeEditor;
        if (activeEditor) {
            this._activeEditorListener.add(activeEditor.onDidChangeModel(() => this._updateFromCodeEditor()));
            this._activeEditorListener.add(activeEditor.onDidChangeConfiguration((e) => {
                if (e.hasChanged(152 /* EditorOption.wrappingInfo */)) {
                    this._updateFromCodeEditor();
                }
            }));
            this._updateFromCodeEditor();
        }
    }
    _updateFromCodeEditor() {
        if (!canToggleWordWrap(this._codeEditorService, this._activeEditor)) {
            return this._setValues(false, false);
        }
        else {
            const wrappingInfo = this._activeEditor.getOption(152 /* EditorOption.wrappingInfo */);
            this._setValues(true, wrappingInfo.wrappingColumn !== -1);
        }
    }
    _setValues(canToggleWordWrap, isWordWrap) {
        this._canToggleWordWrap.set(canToggleWordWrap);
        this._editorWordWrap.set(isWordWrap);
    }
};
EditorWordWrapContextKeyTracker = __decorate([
    __param(0, IEditorService),
    __param(1, ICodeEditorService),
    __param(2, IContextKeyService)
], EditorWordWrapContextKeyTracker);
registerWorkbenchContribution2(EditorWordWrapContextKeyTracker.ID, EditorWordWrapContextKeyTracker, 3 /* WorkbenchPhase.AfterRestored */);
registerEditorContribution(ToggleWordWrapController.ID, ToggleWordWrapController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to change the editor word wrap configuration
registerDiffEditorContribution(DiffToggleWordWrapController.ID, DiffToggleWordWrapController);
registerEditorAction(ToggleWordWrapAction);
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: TOGGLE_WORD_WRAP_ID,
        title: nls.localize('unwrapMinified', "Disable wrapping for this file"),
        icon: Codicon.wordWrap
    },
    group: 'navigation',
    order: 1,
    when: ContextKeyExpr.and(ContextKeyExpr.has(isDominatedByLongLinesKey), ContextKeyExpr.has(isWordWrapMinifiedKey))
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: TOGGLE_WORD_WRAP_ID,
        title: nls.localize('wrapMinified', "Enable wrapping for this file"),
        icon: Codicon.wordWrap
    },
    group: 'navigation',
    order: 1,
    when: ContextKeyExpr.and(EditorContextKeys.inDiffEditor.negate(), ContextKeyExpr.has(isDominatedByLongLinesKey), ContextKeyExpr.not(isWordWrapMinifiedKey))
});
// View menu
MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
    command: {
        id: TOGGLE_WORD_WRAP_ID,
        title: nls.localize({ key: 'miToggleWordWrap', comment: ['&& denotes a mnemonic'] }, "&&Word Wrap"),
        toggled: EDITOR_WORD_WRAP,
        precondition: CAN_TOGGLE_WORD_WRAP
    },
    order: 1,
    group: '6_editor'
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlV29yZFdyYXAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvdG9nZ2xlV29yZFdyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVuRixPQUFPLEVBQUUsWUFBWSxFQUFxRCw4QkFBOEIsRUFBRSxvQkFBb0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25OLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRzlHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRW5GLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9B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