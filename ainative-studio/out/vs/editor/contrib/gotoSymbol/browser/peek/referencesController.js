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
var ReferencesController_1;
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { KeyChord } from '../../../../../base/common/keyCodes.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../browser/services/codeEditorService.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { PeekContext } from '../../../peekView/browser/peekView.js';
import { getOuterEditor } from '../../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import * as nls from '../../../../../nls.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IListService, WorkbenchListFocusContextKey, WorkbenchTreeElementCanCollapse, WorkbenchTreeElementCanExpand } from '../../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { OneReference } from '../referencesModel.js';
import { LayoutData, ReferenceWidget } from './referencesWidget.js';
import { EditorContextKeys } from '../../../../common/editorContextKeys.js';
import { InputFocusedContext } from '../../../../../platform/contextkey/common/contextkeys.js';
export const ctxReferenceSearchVisible = new RawContextKey('referenceSearchVisible', false, nls.localize('referenceSearchVisible', "Whether reference peek is visible, like 'Peek References' or 'Peek Definition'"));
let ReferencesController = class ReferencesController {
    static { ReferencesController_1 = this; }
    static { this.ID = 'editor.contrib.referencesController'; }
    static get(editor) {
        return editor.getContribution(ReferencesController_1.ID);
    }
    constructor(_defaultTreeKeyboardSupport, _editor, contextKeyService, _editorService, _notificationService, _instantiationService, _storageService, _configurationService) {
        this._defaultTreeKeyboardSupport = _defaultTreeKeyboardSupport;
        this._editor = _editor;
        this._editorService = _editorService;
        this._notificationService = _notificationService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this._requestIdPool = 0;
        this._ignoreModelChangeEvent = false;
        this._referenceSearchVisible = ctxReferenceSearchVisible.bindTo(contextKeyService);
    }
    dispose() {
        this._referenceSearchVisible.reset();
        this._disposables.dispose();
        this._widget?.dispose();
        this._model?.dispose();
        this._widget = undefined;
        this._model = undefined;
    }
    toggleWidget(range, modelPromise, peekMode) {
        // close current widget and return early is position didn't change
        let widgetPosition;
        if (this._widget) {
            widgetPosition = this._widget.position;
        }
        this.closeWidget();
        if (!!widgetPosition && range.containsPosition(widgetPosition)) {
            return;
        }
        this._peekMode = peekMode;
        this._referenceSearchVisible.set(true);
        // close the widget on model/mode changes
        this._disposables.add(this._editor.onDidChangeModelLanguage(() => { this.closeWidget(); }));
        this._disposables.add(this._editor.onDidChangeModel(() => {
            if (!this._ignoreModelChangeEvent) {
                this.closeWidget();
            }
        }));
        const storageKey = 'peekViewLayout';
        const data = LayoutData.fromJSON(this._storageService.get(storageKey, 0 /* StorageScope.PROFILE */, '{}'));
        this._widget = this._instantiationService.createInstance(ReferenceWidget, this._editor, this._defaultTreeKeyboardSupport, data);
        this._widget.setTitle(nls.localize('labelLoading', "Loading..."));
        this._widget.show(range);
        this._disposables.add(this._widget.onDidClose(() => {
            modelPromise.cancel();
            if (this._widget) {
                this._storageService.store(storageKey, JSON.stringify(this._widget.layoutData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                if (!this._widget.isClosing) {
                    // to prevent calling this too many times, check whether it was already closing.
                    this.closeWidget();
                }
                this._widget = undefined;
            }
            else {
                this.closeWidget();
            }
        }));
        this._disposables.add(this._widget.onDidSelectReference(event => {
            const { element, kind } = event;
            if (!element) {
                return;
            }
            switch (kind) {
                case 'open':
                    if (event.source !== 'editor' || !this._configurationService.getValue('editor.stablePeek')) {
                        // when stable peek is configured we don't close
                        // the peek window on selecting the editor
                        this.openReference(element, false, false);
                    }
                    break;
                case 'side':
                    this.openReference(element, true, false);
                    break;
                case 'goto':
                    if (peekMode) {
                        this._gotoReference(element, true);
                    }
                    else {
                        this.openReference(element, false, true);
                    }
                    break;
            }
        }));
        const requestId = ++this._requestIdPool;
        modelPromise.then(model => {
            // still current request? widget still open?
            if (requestId !== this._requestIdPool || !this._widget) {
                model.dispose();
                return undefined;
            }
            this._model?.dispose();
            this._model = model;
            // show widget
            return this._widget.setModel(this._model).then(() => {
                if (this._widget && this._model && this._editor.hasModel()) { // might have been closed
                    // set title
                    if (!this._model.isEmpty) {
                        this._widget.setMetaTitle(nls.localize('metaTitle.N', "{0} ({1})", this._model.title, this._model.references.length));
                    }
                    else {
                        this._widget.setMetaTitle('');
                    }
                    // set 'best' selection
                    const uri = this._editor.getModel().uri;
                    const pos = new Position(range.startLineNumber, range.startColumn);
                    const selection = this._model.nearestReference(uri, pos);
                    if (selection) {
                        return this._widget.setSelection(selection).then(() => {
                            if (this._widget && this._editor.getOption(91 /* EditorOption.peekWidgetDefaultFocus */) === 'editor') {
                                this._widget.focusOnPreviewEditor();
                            }
                        });
                    }
                }
                return undefined;
            });
        }, error => {
            this._notificationService.error(error);
        });
    }
    changeFocusBetweenPreviewAndReferences() {
        if (!this._widget) {
            // can be called while still resolving...
            return;
        }
        if (this._widget.isPreviewEditorFocused()) {
            this._widget.focusOnReferenceTree();
        }
        else {
            this._widget.focusOnPreviewEditor();
        }
    }
    async goToNextOrPreviousReference(fwd) {
        if (!this._editor.hasModel() || !this._model || !this._widget) {
            // can be called while still resolving...
            return;
        }
        const currentPosition = this._widget.position;
        if (!currentPosition) {
            return;
        }
        const source = this._model.nearestReference(this._editor.getModel().uri, currentPosition);
        if (!source) {
            return;
        }
        const target = this._model.nextOrPreviousReference(source, fwd);
        const editorFocus = this._editor.hasTextFocus();
        const previewEditorFocus = this._widget.isPreviewEditorFocused();
        await this._widget.setSelection(target);
        await this._gotoReference(target, false);
        if (editorFocus) {
            this._editor.focus();
        }
        else if (this._widget && previewEditorFocus) {
            this._widget.focusOnPreviewEditor();
        }
    }
    async revealReference(reference) {
        if (!this._editor.hasModel() || !this._model || !this._widget) {
            // can be called while still resolving...
            return;
        }
        await this._widget.revealReference(reference);
    }
    closeWidget(focusEditor = true) {
        this._widget?.dispose();
        this._model?.dispose();
        this._referenceSearchVisible.reset();
        this._disposables.clear();
        this._widget = undefined;
        this._model = undefined;
        if (focusEditor) {
            this._editor.focus();
        }
        this._requestIdPool += 1; // Cancel pending requests
    }
    _gotoReference(ref, pinned) {
        this._widget?.hide();
        this._ignoreModelChangeEvent = true;
        const range = Range.lift(ref.range).collapseToStart();
        return this._editorService.openCodeEditor({
            resource: ref.uri,
            options: { selection: range, selectionSource: "code.jump" /* TextEditorSelectionSource.JUMP */, pinned }
        }, this._editor).then(openedEditor => {
            this._ignoreModelChangeEvent = false;
            if (!openedEditor || !this._widget) {
                // something went wrong...
                this.closeWidget();
                return;
            }
            if (this._editor === openedEditor) {
                //
                this._widget.show(range);
                this._widget.focusOnReferenceTree();
            }
            else {
                // we opened a different editor instance which means a different controller instance.
                // therefore we stop with this controller and continue with the other
                const other = ReferencesController_1.get(openedEditor);
                const model = this._model.clone();
                this.closeWidget();
                openedEditor.focus();
                other?.toggleWidget(range, createCancelablePromise(_ => Promise.resolve(model)), this._peekMode ?? false);
            }
        }, (err) => {
            this._ignoreModelChangeEvent = false;
            onUnexpectedError(err);
        });
    }
    openReference(ref, sideBySide, pinned) {
        // clear stage
        if (!sideBySide) {
            this.closeWidget();
        }
        const { uri, range } = ref;
        this._editorService.openCodeEditor({
            resource: uri,
            options: { selection: range, selectionSource: "code.jump" /* TextEditorSelectionSource.JUMP */, pinned }
        }, this._editor, sideBySide);
    }
};
ReferencesController = ReferencesController_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, ICodeEditorService),
    __param(4, INotificationService),
    __param(5, IInstantiationService),
    __param(6, IStorageService),
    __param(7, IConfigurationService)
], ReferencesController);
export { ReferencesController };
function withController(accessor, fn) {
    const outerEditor = getOuterEditor(accessor);
    if (!outerEditor) {
        return;
    }
    const controller = ReferencesController.get(outerEditor);
    if (controller) {
        fn(controller);
    }
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'togglePeekWidgetFocus',
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 60 /* KeyCode.F2 */),
    when: ContextKeyExpr.or(ctxReferenceSearchVisible, PeekContext.inPeekEditor),
    handler(accessor) {
        withController(accessor, controller => {
            controller.changeFocusBetweenPreviewAndReferences();
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'goToNextReference',
    weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
    primary: 62 /* KeyCode.F4 */,
    secondary: [70 /* KeyCode.F12 */],
    when: ContextKeyExpr.or(ctxReferenceSearchVisible, PeekContext.inPeekEditor),
    handler(accessor) {
        withController(accessor, controller => {
            controller.goToNextOrPreviousReference(true);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'goToPreviousReference',
    weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
    primary: 1024 /* KeyMod.Shift */ | 62 /* KeyCode.F4 */,
    secondary: [1024 /* KeyMod.Shift */ | 70 /* KeyCode.F12 */],
    when: ContextKeyExpr.or(ctxReferenceSearchVisible, PeekContext.inPeekEditor),
    handler(accessor) {
        withController(accessor, controller => {
            controller.goToNextOrPreviousReference(false);
        });
    }
});
// commands that aren't needed anymore because there is now ContextKeyExpr.OR
CommandsRegistry.registerCommandAlias('goToNextReferenceFromEmbeddedEditor', 'goToNextReference');
CommandsRegistry.registerCommandAlias('goToPreviousReferenceFromEmbeddedEditor', 'goToPreviousReference');
// close
CommandsRegistry.registerCommandAlias('closeReferenceSearchEditor', 'closeReferenceSearch');
CommandsRegistry.registerCommand('closeReferenceSearch', accessor => withController(accessor, controller => controller.closeWidget()));
KeybindingsRegistry.registerKeybindingRule({
    id: 'closeReferenceSearch',
    weight: 100 /* KeybindingWeight.EditorContrib */ - 101,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(PeekContext.inPeekEditor, ContextKeyExpr.not('config.editor.stablePeek'))
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'closeReferenceSearch',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(ctxReferenceSearchVisible, ContextKeyExpr.not('config.editor.stablePeek'), ContextKeyExpr.or(EditorContextKeys.editorTextFocus, InputFocusedContext.negate()))
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'revealReference',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */]
    },
    when: ContextKeyExpr.and(ctxReferenceSearchVisible, WorkbenchListFocusContextKey, WorkbenchTreeElementCanCollapse.negate(), WorkbenchTreeElementCanExpand.negate()),
    handler(accessor) {
        const listService = accessor.get(IListService);
        const focus = listService.lastFocusedList?.getFocus();
        if (Array.isArray(focus) && focus[0] instanceof OneReference) {
            withController(accessor, controller => controller.revealReference(focus[0]));
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'openReferenceToSide',
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    mac: {
        primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */
    },
    when: ContextKeyExpr.and(ctxReferenceSearchVisible, WorkbenchListFocusContextKey, WorkbenchTreeElementCanCollapse.negate(), WorkbenchTreeElementCanExpand.negate()),
    handler(accessor) {
        const listService = accessor.get(IListService);
        const focus = listService.lastFocusedList?.getFocus();
        if (Array.isArray(focus) && focus[0] instanceof OneReference) {
            withController(accessor, controller => controller.openReference(focus[0], true, true));
        }
    }
});
CommandsRegistry.registerCommand('openReference', (accessor) => {
    const listService = accessor.get(IListService);
    const focus = listService.lastFocusedList?.getFocus();
    if (Array.isArray(focus) && focus[0] instanceof OneReference) {
        withController(accessor, controller => controller.openReference(focus[0], false, true));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc0NvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZ290b1N5bWJvbC9icm93c2VyL3BlZWsvcmVmZXJlbmNlc0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHdDQUF3QyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUV2RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR3pELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDbkcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXpJLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVB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