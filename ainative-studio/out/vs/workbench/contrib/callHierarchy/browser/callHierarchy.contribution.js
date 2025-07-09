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
var CallHierarchyController_1;
import { localize, localize2 } from '../../../../nls.js';
import { CallHierarchyProviderRegistry, CallHierarchyModel } from '../common/callHierarchy.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { CallHierarchyTreePeekWidget } from './callHierarchyPeek.js';
import { Event } from '../../../../base/common/event.js';
import { registerEditorContribution, EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { IContextKeyService, RawContextKey, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { PeekContext } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { isCancellationError } from '../../../../base/common/errors.js';
const _ctxHasCallHierarchyProvider = new RawContextKey('editorHasCallHierarchyProvider', false, localize('editorHasCallHierarchyProvider', 'Whether a call hierarchy provider is available'));
const _ctxCallHierarchyVisible = new RawContextKey('callHierarchyVisible', false, localize('callHierarchyVisible', 'Whether call hierarchy peek is currently showing'));
const _ctxCallHierarchyDirection = new RawContextKey('callHierarchyDirection', undefined, { type: 'string', description: localize('callHierarchyDirection', 'Whether call hierarchy shows incoming or outgoing calls') });
function sanitizedDirection(candidate) {
    return candidate === "outgoingCalls" /* CallHierarchyDirection.CallsFrom */ || candidate === "incomingCalls" /* CallHierarchyDirection.CallsTo */
        ? candidate
        : "incomingCalls" /* CallHierarchyDirection.CallsTo */;
}
let CallHierarchyController = class CallHierarchyController {
    static { CallHierarchyController_1 = this; }
    static { this.Id = 'callHierarchy'; }
    static get(editor) {
        return editor.getContribution(CallHierarchyController_1.Id);
    }
    static { this._StorageDirection = 'callHierarchy/defaultDirection'; }
    constructor(_editor, _contextKeyService, _storageService, _editorService, _instantiationService) {
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._storageService = _storageService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._dispoables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._ctxIsVisible = _ctxCallHierarchyVisible.bindTo(this._contextKeyService);
        this._ctxHasProvider = _ctxHasCallHierarchyProvider.bindTo(this._contextKeyService);
        this._ctxDirection = _ctxCallHierarchyDirection.bindTo(this._contextKeyService);
        this._dispoables.add(Event.any(_editor.onDidChangeModel, _editor.onDidChangeModelLanguage, CallHierarchyProviderRegistry.onDidChange)(() => {
            this._ctxHasProvider.set(_editor.hasModel() && CallHierarchyProviderRegistry.has(_editor.getModel()));
        }));
        this._dispoables.add(this._sessionDisposables);
    }
    dispose() {
        this._ctxHasProvider.reset();
        this._ctxIsVisible.reset();
        this._dispoables.dispose();
    }
    async startCallHierarchyFromEditor() {
        this._sessionDisposables.clear();
        if (!this._editor.hasModel()) {
            return;
        }
        const document = this._editor.getModel();
        const position = this._editor.getPosition();
        if (!CallHierarchyProviderRegistry.has(document)) {
            return;
        }
        const cts = new CancellationTokenSource();
        const model = CallHierarchyModel.create(document, position, cts.token);
        const direction = sanitizedDirection(this._storageService.get(CallHierarchyController_1._StorageDirection, 0 /* StorageScope.PROFILE */, "incomingCalls" /* CallHierarchyDirection.CallsTo */));
        this._showCallHierarchyWidget(position, direction, model, cts);
    }
    async startCallHierarchyFromCallHierarchy() {
        if (!this._widget) {
            return;
        }
        const model = this._widget.getModel();
        const call = this._widget.getFocused();
        if (!call || !model) {
            return;
        }
        const newEditor = await this._editorService.openCodeEditor({ resource: call.item.uri }, this._editor);
        if (!newEditor) {
            return;
        }
        const newModel = model.fork(call.item);
        this._sessionDisposables.clear();
        CallHierarchyController_1.get(newEditor)?._showCallHierarchyWidget(Range.lift(newModel.root.selectionRange).getStartPosition(), this._widget.direction, Promise.resolve(newModel), new CancellationTokenSource());
    }
    _showCallHierarchyWidget(position, direction, model, cts) {
        this._ctxIsVisible.set(true);
        this._ctxDirection.set(direction);
        Event.any(this._editor.onDidChangeModel, this._editor.onDidChangeModelLanguage)(this.endCallHierarchy, this, this._sessionDisposables);
        this._widget = this._instantiationService.createInstance(CallHierarchyTreePeekWidget, this._editor, position, direction);
        this._widget.showLoading();
        this._sessionDisposables.add(this._widget.onDidClose(() => {
            this.endCallHierarchy();
            this._storageService.store(CallHierarchyController_1._StorageDirection, this._widget.direction, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
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
                this.endCallHierarchy();
                return;
            }
            this._widget.showMessage(localize('error', "Failed to show call hierarchy"));
        });
    }
    showOutgoingCalls() {
        this._widget?.updateDirection("outgoingCalls" /* CallHierarchyDirection.CallsFrom */);
        this._ctxDirection.set("outgoingCalls" /* CallHierarchyDirection.CallsFrom */);
    }
    showIncomingCalls() {
        this._widget?.updateDirection("incomingCalls" /* CallHierarchyDirection.CallsTo */);
        this._ctxDirection.set("incomingCalls" /* CallHierarchyDirection.CallsTo */);
    }
    endCallHierarchy() {
        this._sessionDisposables.clear();
        this._ctxIsVisible.set(false);
        this._editor.focus();
    }
};
CallHierarchyController = CallHierarchyController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, ICodeEditorService),
    __param(4, IInstantiationService)
], CallHierarchyController);
registerEditorContribution(CallHierarchyController.Id, CallHierarchyController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to define a context key
registerAction2(class PeekCallHierarchyAction extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showCallHierarchy',
            title: localize2('title', 'Peek Call Hierarchy'),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'navigation',
                order: 1000,
                when: ContextKeyExpr.and(_ctxHasCallHierarchyProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            },
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */
            },
            precondition: ContextKeyExpr.and(_ctxHasCallHierarchyProvider, PeekContext.notInPeekEditor),
            f1: true
        });
    }
    async runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.startCallHierarchyFromEditor();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showIncomingCalls',
            title: localize2('title.incoming', 'Show Incoming Calls'),
            icon: registerIcon('callhierarchy-incoming', Codicon.callIncoming, localize('showIncomingCallsIcons', 'Icon for incoming calls in the call hierarchy view.')),
            precondition: ContextKeyExpr.and(_ctxCallHierarchyVisible, _ctxCallHierarchyDirection.isEqualTo("outgoingCalls" /* CallHierarchyDirection.CallsFrom */)),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */,
            },
            menu: {
                id: CallHierarchyTreePeekWidget.TitleMenu,
                when: _ctxCallHierarchyDirection.isEqualTo("outgoingCalls" /* CallHierarchyDirection.CallsFrom */),
                order: 1,
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.showIncomingCalls();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.showOutgoingCalls',
            title: localize2('title.outgoing', 'Show Outgoing Calls'),
            icon: registerIcon('callhierarchy-outgoing', Codicon.callOutgoing, localize('showOutgoingCallsIcon', 'Icon for outgoing calls in the call hierarchy view.')),
            precondition: ContextKeyExpr.and(_ctxCallHierarchyVisible, _ctxCallHierarchyDirection.isEqualTo("incomingCalls" /* CallHierarchyDirection.CallsTo */)),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 512 /* KeyMod.Alt */ + 38 /* KeyCode.KeyH */,
            },
            menu: {
                id: CallHierarchyTreePeekWidget.TitleMenu,
                when: _ctxCallHierarchyDirection.isEqualTo("incomingCalls" /* CallHierarchyDirection.CallsTo */),
                order: 1
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.showOutgoingCalls();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.refocusCallHierarchy',
            title: localize2('title.refocus', 'Refocus Call Hierarchy'),
            precondition: _ctxCallHierarchyVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ + 3 /* KeyCode.Enter */
            }
        });
    }
    async runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.startCallHierarchyFromCallHierarchy();
    }
});
registerAction2(class extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.closeCallHierarchy',
            title: localize('close', 'Close'),
            icon: Codicon.close,
            precondition: _ctxCallHierarchyVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                primary: 9 /* KeyCode.Escape */,
                when: ContextKeyExpr.not('config.editor.stablePeek')
            },
            menu: {
                id: CallHierarchyTreePeekWidget.TitleMenu,
                order: 1000
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        return CallHierarchyController.get(editor)?.endCallHierarchy();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbEhpZXJhcmNoeS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2FsbEhpZXJhcmNoeS9icm93c2VyL2NhbGxIaWVyYXJjaHkuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSw2QkFBNkIsRUFBMEIsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN2SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxhQUFhLEVBQW1DLE1BQU0sZ0RBQWdELENBQUM7QUFHNUksT0FBTyxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBZSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0SSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFD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