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
import { createCancelablePromise, DeferredPromise } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { memoize } from '../../../../base/common/decorators.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { combinedDisposable, Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import { CONTEXT_ACTIVE_WEBVIEW_PANEL_ID } from './webviewEditor.js';
import { WebviewIconManager } from './webviewIconManager.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { WebviewInput } from './webviewEditorInput.js';
export const IWebviewWorkbenchService = createDecorator('webviewEditorService');
function canRevive(reviver, webview) {
    return reviver.canResolve(webview);
}
let LazilyResolvedWebviewEditorInput = class LazilyResolvedWebviewEditorInput extends WebviewInput {
    constructor(init, webview, _webviewWorkbenchService) {
        super(init, webview, _webviewWorkbenchService.iconManager);
        this._webviewWorkbenchService = _webviewWorkbenchService;
        this._resolved = false;
    }
    dispose() {
        super.dispose();
        this._resolvePromise?.cancel();
        this._resolvePromise = undefined;
    }
    async resolve() {
        if (!this._resolved) {
            this._resolved = true;
            this._resolvePromise = createCancelablePromise(token => this._webviewWorkbenchService.resolveWebview(this, token));
            try {
                await this._resolvePromise;
            }
            catch (e) {
                if (!isCancellationError(e)) {
                    throw e;
                }
            }
        }
        return super.resolve();
    }
    transfer(other) {
        if (!super.transfer(other)) {
            return;
        }
        other._resolved = this._resolved;
        return other;
    }
};
__decorate([
    memoize
], LazilyResolvedWebviewEditorInput.prototype, "resolve", null);
LazilyResolvedWebviewEditorInput = __decorate([
    __param(2, IWebviewWorkbenchService)
], LazilyResolvedWebviewEditorInput);
export { LazilyResolvedWebviewEditorInput };
class RevivalPool {
    constructor() {
        this._awaitingRevival = [];
    }
    enqueueForRestoration(input, token) {
        const promise = new DeferredPromise();
        const remove = () => {
            const index = this._awaitingRevival.findIndex(entry => input === entry.input);
            if (index >= 0) {
                this._awaitingRevival.splice(index, 1);
            }
        };
        const disposable = combinedDisposable(input.webview.onDidDispose(remove), token.onCancellationRequested(() => {
            remove();
            promise.cancel();
        }));
        this._awaitingRevival.push({ input, promise, disposable });
        return promise.p;
    }
    reviveFor(reviver, token) {
        const toRevive = this._awaitingRevival.filter(({ input }) => canRevive(reviver, input));
        this._awaitingRevival = this._awaitingRevival.filter(({ input }) => !canRevive(reviver, input));
        for (const { input, promise: resolve, disposable } of toRevive) {
            reviver.resolveWebview(input, token).then(x => resolve.complete(x), err => resolve.error(err)).finally(() => {
                disposable.dispose();
            });
        }
    }
}
let WebviewEditorService = class WebviewEditorService extends Disposable {
    constructor(editorGroupsService, _editorService, _instantiationService, _webviewService) {
        super();
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._webviewService = _webviewService;
        this._revivers = new Set();
        this._revivalPool = new RevivalPool();
        this._onDidChangeActiveWebviewEditor = this._register(new Emitter());
        this.onDidChangeActiveWebviewEditor = this._onDidChangeActiveWebviewEditor.event;
        this._iconManager = this._register(this._instantiationService.createInstance(WebviewIconManager));
        this._register(editorGroupsService.registerContextKeyProvider({
            contextKey: CONTEXT_ACTIVE_WEBVIEW_PANEL_ID,
            getGroupContextKeyValue: (group) => this.getWebviewId(group.activeEditor),
        }));
        this._register(_editorService.onDidActiveEditorChange(() => {
            this.updateActiveWebview();
        }));
        // The user may have switched focus between two sides of a diff editor
        this._register(_webviewService.onDidChangeActiveWebview(() => {
            this.updateActiveWebview();
        }));
        this.updateActiveWebview();
    }
    get iconManager() {
        return this._iconManager;
    }
    getWebviewId(input) {
        let webviewInput;
        if (input instanceof WebviewInput) {
            webviewInput = input;
        }
        else if (input instanceof DiffEditorInput) {
            if (input.primary instanceof WebviewInput) {
                webviewInput = input.primary;
            }
            else if (input.secondary instanceof WebviewInput) {
                webviewInput = input.secondary;
            }
        }
        return webviewInput?.webview.providedViewType ?? '';
    }
    updateActiveWebview() {
        const activeInput = this._editorService.activeEditor;
        let newActiveWebview;
        if (activeInput instanceof WebviewInput) {
            newActiveWebview = activeInput;
        }
        else if (activeInput instanceof DiffEditorInput) {
            if (activeInput.primary instanceof WebviewInput && activeInput.primary.webview === this._webviewService.activeWebview) {
                newActiveWebview = activeInput.primary;
            }
            else if (activeInput.secondary instanceof WebviewInput && activeInput.secondary.webview === this._webviewService.activeWebview) {
                newActiveWebview = activeInput.secondary;
            }
        }
        if (newActiveWebview !== this._activeWebview) {
            this._activeWebview = newActiveWebview;
            this._onDidChangeActiveWebviewEditor.fire(newActiveWebview);
        }
    }
    openWebview(webviewInitInfo, viewType, title, showOptions) {
        const webview = this._webviewService.createWebviewOverlay(webviewInitInfo);
        const webviewInput = this._instantiationService.createInstance(WebviewInput, { viewType, name: title, providedId: webviewInitInfo.providedViewType }, webview, this.iconManager);
        this._editorService.openEditor(webviewInput, {
            pinned: true,
            preserveFocus: showOptions.preserveFocus,
            // preserve pre 1.38 behaviour to not make group active when preserveFocus: true
            // but make sure to restore the editor to fix https://github.com/microsoft/vscode/issues/79633
            activation: showOptions.preserveFocus ? EditorActivation.RESTORE : undefined
        }, showOptions.group);
        return webviewInput;
    }
    revealWebview(webview, group, preserveFocus) {
        const topLevelEditor = this.findTopLevelEditorForWebview(webview);
        this._editorService.openEditor(topLevelEditor, {
            preserveFocus,
            // preserve pre 1.38 behaviour to not make group active when preserveFocus: true
            // but make sure to restore the editor to fix https://github.com/microsoft/vscode/issues/79633
            activation: preserveFocus ? EditorActivation.RESTORE : undefined
        }, group);
    }
    findTopLevelEditorForWebview(webview) {
        for (const editor of this._editorService.editors) {
            if (editor === webview) {
                return editor;
            }
            if (editor instanceof DiffEditorInput) {
                if (webview === editor.primary || webview === editor.secondary) {
                    return editor;
                }
            }
        }
        return webview;
    }
    openRevivedWebview(options) {
        const webview = this._webviewService.createWebviewOverlay(options.webviewInitInfo);
        webview.state = options.state;
        const webviewInput = this._instantiationService.createInstance(LazilyResolvedWebviewEditorInput, { viewType: options.viewType, providedId: options.webviewInitInfo.providedViewType, name: options.title }, webview);
        webviewInput.iconPath = options.iconPath;
        if (typeof options.group === 'number') {
            webviewInput.updateGroup(options.group);
        }
        return webviewInput;
    }
    registerResolver(reviver) {
        this._revivers.add(reviver);
        const cts = new CancellationTokenSource();
        this._revivalPool.reviveFor(reviver, cts.token);
        return toDisposable(() => {
            this._revivers.delete(reviver);
            cts.dispose(true);
        });
    }
    shouldPersist(webview) {
        // Revived webviews may not have an actively registered reviver but we still want to persist them
        // since a reviver should exist when it is actually needed.
        if (webview instanceof LazilyResolvedWebviewEditorInput) {
            return true;
        }
        return Iterable.some(this._revivers.values(), reviver => canRevive(reviver, webview));
    }
    async tryRevive(webview, token) {
        for (const reviver of this._revivers.values()) {
            if (canRevive(reviver, webview)) {
                await reviver.resolveWebview(webview, token);
                return true;
            }
        }
        return false;
    }
    async resolveWebview(webview, token) {
        const didRevive = await this.tryRevive(webview, token);
        if (!didRevive && !token.isCancellationRequested) {
            // A reviver may not be registered yet. Put into pool and resolve promise when we can revive
            return this._revivalPool.enqueueForRestoration(webview, token);
        }
    }
    setIcons(id, iconPath) {
        this._iconManager.setIcons(id, iconPath);
    }
};
WebviewEditorService = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IEditorService),
    __param(2, IInstantiationService),
    __param(3, IWebviewService)
], WebviewEditorService);
export { WebviewEditorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1dvcmtiZW5jaFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlld1BhbmVsL2Jyb3dzZXIvd2Vidmlld1dvcmtiZW5jaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFcEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTVFLE9BQU8sRUFBbUIsZUFBZSxFQUFtQixNQUFNLGtDQUFrQyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBZ0IsTUFBTSx5QkFBeUIsQ0FBQztBQUMzRSxPQUFPLEVBQWdCLG9CQUFv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