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
var TypeHierarchyController_1;
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction2, registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { PeekContext } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { TypeHierarchyTreePeekWidget } from './typeHierarchyPeek.js';
import { TypeHierarchyModel, TypeHierarchyProviderRegistry } from '../common/typeHierarchy.js';
const _ctxHasTypeHierarchyProvider = new RawContextKey('editorHasTypeHierarchyProvider', false, localize('editorHasTypeHierarchyProvider', 'Whether a type hierarchy provider is available'));
const _ctxTypeHierarchyVisible = new RawContextKey('typeHierarchyVisible', false, localize('typeHierarchyVisible', 'Whether type hierarchy peek is currently showing'));
const _ctxTypeHierarchyDirection = new RawContextKey('typeHierarchyDirection', undefined, { type: 'string', description: localize('typeHierarchyDirection', 'whether type hierarchy shows super types or subtypes') });
function sanitizedDirection(candidate) {
    return candidate === "subtypes" /* TypeHierarchyDirection.Subtypes */ || candidate === "supertypes" /* TypeHierarchyDirection.Supertypes */
        ? candidate
        : "subtypes" /* TypeHierarchyDirection.Subtypes */;
}
let TypeHierarchyController = class TypeHierarchyController {
    static { TypeHierarchyController_1 = this; }
    static { this.Id = 'typeHierarchy'; }
    static get(editor) {
        return editor.getContribution(TypeHierarchyController_1.Id);
    }
    static { this._storageDirectionKey = 'typeHierarchy/defaultDirection'; }
    constructor(_editor, _contextKeyService, _storageService, _editorService, _instantiationService) {
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._storageService = _storageService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._ctxHasProvider = _ctxHasTypeHierarchyProvider.bindTo(this._contextKeyService);
        this._ctxIsVisible = _ctxTypeHierarchyVisible.bindTo(this._contextKeyService);
        this._ctxDirection = _ctxTypeHierarchyDirection.bindTo(this._contextKeyService);
        this._disposables.add(Event.any(_editor.onDidChangeModel, _editor.onDidChangeModelLanguage, TypeHierarchyProviderRegistry.onDidChange)(() => {
            this._ctxHasProvider.set(_editor.hasModel() && TypeHierarchyProviderRegistry.has(_editor.getModel()));
        }));
        this._disposables.add(this._sessionDisposables);
    }
    dispose() {
        this._disposables.dispose();
    }
    // Peek
    async startTypeHierarchyFromEditor() {
        this._sessionDisposables.clear();
        if (!this._editor.hasModel()) {
            return;
        }
        const document = this._editor.getModel();
        const position = this._editor.getPosition();
        if (!TypeHierarchyProviderRegistry.has(document)) {
            return;
        }
        const cts = new CancellationTokenSource();
        const model = TypeHierarchyModel.create(document, position, cts.token);
        const direction = sanitizedDirection(this._storageService.get(TypeHierarchyController_1._storageDirectionKey, 0 /* StorageScope.PROFILE */, "subtypes" /* TypeHierarchyDirection.Subtypes */));
        this._showTypeHierarchyWidget(position, direction, model, cts);
    }
    _showTypeHierarchyWidget(position, direction, model, cts) {
        this._ctxIsVisible.set(true);
        this._ctxDirection.set(direction);
        Event.any(this._editor.onDidChangeModel, this._editor.onDidChangeModelLanguage)(this.endTypeHierarchy, this, this._sessionDisposables);
        this._widget = this._instantiationService.createInstance(TypeHierarchyTreePeekWidget, this._editor, position, direction);
        this._widget.showLoading();
        this._sessionDisposables.add(this._widget.onDidClose(() => {
            this.endTypeHierarchy();
            this._storageService.store(TypeHierarchyController_1._storageDirectionKey, this._widget.direction, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }));
        this._sessionDisposables.add({ dispose() { cts.dispose(true); } });
        this._sessionDisposables.add(this._widget);
        model.then(model => {
            if (cts.token.isCancellationRequested) {
                return; // nothing
            }
            if (model) {
                this._sessionDisposables.add(model);
                this._widget.showModel(model);
            }
            else {
                this._widget.showMessage(localize('no.item', "No results"));
            }
        }).catch(err => {
            if (isCancellationError(err)) {
                this.endTypeHierarchy();
                return;
            }
            this._widget.showMessage(localize('error', "Failed to show type hierarchy"));
        });
    }
    async startTypeHierarchyFromTypeHierarchy() {
        if (!this._widget) {
            return;
        }
        const model = this._widget.getModel();
        const typeItem = this._widget.getFocused();
        if (!typeItem || !model) {
            return;
        }
        const newEditor = await this._editorService.openCodeEditor({ resource: typeItem.item.uri }, this._editor);
        if (!newEditor) {
            return;
        }
        const newModel = model.fork(typeItem.item);
        this._sessionDisposables.clear();
        TypeHierarchyController_1.get(newEditor)?._showTypeHierarchyWidget(Range.lift(newModel.root.selectionRange).getStartPosition(), this._widget.direction, Promise.resolve(newModel), new CancellationTokenSource());
    }
    showSupertypes() {
        this._widget?.updateDirection("supertypes" /* TypeHierarchyDirection.Supertypes */);
        this._ctxDirection.set("supertypes" /* TypeHierarchyDirection.Supertypes */);
    }
    showSubtypes() {
        this._widget?.updateDirection("subtypes" /* TypeHierarchyDirection.Subtypes */);
        this._ctxDirection.set("subtypes" /* TypeHierarchyDirection.Subtypes */);
    }
    endTypeHierarchy() {
        this._sessionDisposables.clear();
        this._ctxIsVisible.set(false);
        this._editor.focus();
    }
};
TypeHierarchyController = TypeHierarchyController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, ICodeEditorService),
    __param(4, IInstantiationService)
], TypeHierarchyController);
registerEditorContribution(TypeHierarchyController.Id, TypeHierarchyController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to define a context key
// Peek
registerAction2(class PeekTypeHierarchyAction extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showTypeHierarchy',
            title: localize2('title', 'Peek Type Hierarchy'),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'navigation',
                order: 1000,
                when: ContextKeyExpr.and(_ctxHasTypeHierarchyProvider, PeekContext.notInPeekEditor),
            },
            precondition: ContextKeyExpr.and(_ctxHasTypeHierarchyProvider, PeekContext.notInPeekEditor),
            f1: true
        });
    }
    async runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.startTypeHierarchyFromEditor();
    }
});
// actions for peek widget
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showSupertypes',
            title: localize2('title.supertypes', 'Show Supertypes'),
            icon: Codicon.typeHierarchySuper,
            precondition: ContextKeyExpr.and(_ctxTypeHierarchyVisible, _ctxTypeHierarchyDirection.isEqualTo("subtypes" /* TypeHierarchyDirection.Subtypes */)),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */,
            },
            menu: {
                id: TypeHierarchyTreePeekWidget.TitleMenu,
                when: _ctxTypeHierarchyDirection.isEqualTo("subtypes" /* TypeHierarchyDirection.Subtypes */),
                order: 1,
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.showSupertypes();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showSubtypes',
            title: localize2('title.subtypes', 'Show Subtypes'),
            icon: Codicon.typeHierarchySub,
            precondition: ContextKeyExpr.and(_ctxTypeHierarchyVisible, _ctxTypeHierarchyDirection.isEqualTo("supertypes" /* TypeHierarchyDirection.Supertypes */)),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */,
            },
            menu: {
                id: TypeHierarchyTreePeekWidget.TitleMenu,
                when: _ctxTypeHierarchyDirection.isEqualTo("supertypes" /* TypeHierarchyDirection.Supertypes */),
                order: 1,
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.showSubtypes();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.refocusTypeHierarchy',
            title: localize2('title.refocusTypeHierarchy', 'Refocus Type Hierarchy'),
            precondition: _ctxTypeHierarchyVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 3 /* KeyCode.Enter */
            }
        });
    }
    async runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.startTypeHierarchyFromTypeHierarchy();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.closeTypeHierarchy',
            title: localize('close', 'Close'),
            icon: Codicon.close,
            precondition: _ctxTypeHierarchyVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                primary: 9 /* KeyCode.Escape */,
                when: ContextKeyExpr.not('config.editor.stablePeek')
            },
            menu: {
                id: TypeHierarchyTreePeekWidget.TitleMenu,
                order: 1000
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        return TypeHierarchyController.get(editor)?.endTypeHierarchy();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUhpZXJhcmNoeS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdHlwZUhpZXJhcmNoeS9icm93c2VyL3R5cGVIaWVyYXJjaHkuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsYUFBYSxFQUFtQywwQkFBMEIsRUFBb0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5SixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUU5RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8s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