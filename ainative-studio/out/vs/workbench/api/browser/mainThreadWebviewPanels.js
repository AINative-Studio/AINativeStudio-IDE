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
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Event } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { DiffEditorInput } from '../../common/editor/diffEditorInput.js';
import { ExtensionKeyedWebviewOriginStore } from '../../contrib/webview/browser/webview.js';
import { WebviewInput } from '../../contrib/webviewPanel/browser/webviewEditorInput.js';
import { IWebviewWorkbenchService } from '../../contrib/webviewPanel/browser/webviewWorkbenchService.js';
import { editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection } from '../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../services/editor/common/editorService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { reviveWebviewContentOptions, reviveWebviewExtension } from './mainThreadWebviews.js';
/**
 * Bi-directional map between webview handles and inputs.
 */
class WebviewInputStore {
    constructor() {
        this._handlesToInputs = new Map();
        this._inputsToHandles = new Map();
    }
    add(handle, input) {
        this._handlesToInputs.set(handle, input);
        this._inputsToHandles.set(input, handle);
    }
    getHandleForInput(input) {
        return this._inputsToHandles.get(input);
    }
    getInputForHandle(handle) {
        return this._handlesToInputs.get(handle);
    }
    delete(handle) {
        const input = this.getInputForHandle(handle);
        this._handlesToInputs.delete(handle);
        if (input) {
            this._inputsToHandles.delete(input);
        }
    }
    get size() {
        return this._handlesToInputs.size;
    }
    [Symbol.iterator]() {
        return this._handlesToInputs.values();
    }
}
class WebviewViewTypeTransformer {
    constructor(prefix) {
        this.prefix = prefix;
    }
    fromExternal(viewType) {
        return this.prefix + viewType;
    }
    toExternal(viewType) {
        return viewType.startsWith(this.prefix)
            ? viewType.substr(this.prefix.length)
            : undefined;
    }
}
let MainThreadWebviewPanels = class MainThreadWebviewPanels extends Disposable {
    constructor(context, _mainThreadWebviews, _configurationService, _editorGroupService, _editorService, extensionService, storageService, _webviewWorkbenchService) {
        super();
        this._mainThreadWebviews = _mainThreadWebviews;
        this._configurationService = _configurationService;
        this._editorGroupService = _editorGroupService;
        this._editorService = _editorService;
        this._webviewWorkbenchService = _webviewWorkbenchService;
        this.webviewPanelViewType = new WebviewViewTypeTransformer('mainThreadWebview-');
        this._webviewInputs = new WebviewInputStore();
        this._revivers = this._register(new DisposableMap());
        this.webviewOriginStore = new ExtensionKeyedWebviewOriginStore('mainThreadWebviewPanel.origins', storageService);
        this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWebviewPanels);
        this._register(Event.any(_editorService.onDidActiveEditorChange, _editorService.onDidVisibleEditorsChange, _editorGroupService.onDidAddGroup, _editorGroupService.onDidRemoveGroup, _editorGroupService.onDidMoveGroup)(() => {
            this.updateWebviewViewStates(this._editorService.activeEditor);
        }));
        this._register(_webviewWorkbenchService.onDidChangeActiveWebviewEditor(input => {
            this.updateWebviewViewStates(input);
        }));
        // This reviver's only job is to activate extensions.
        // This should trigger the real reviver to be registered from the extension host side.
        this._register(_webviewWorkbenchService.registerResolver({
            canResolve: (webview) => {
                const viewType = this.webviewPanelViewType.toExternal(webview.viewType);
                if (typeof viewType === 'string') {
                    extensionService.activateByEvent(`onWebviewPanel:${viewType}`);
                }
                return false;
            },
            resolveWebview: () => { throw new Error('not implemented'); }
        }));
    }
    get webviewInputs() { return this._webviewInputs; }
    addWebviewInput(handle, input, options) {
        this._webviewInputs.add(handle, input);
        this._mainThreadWebviews.addWebview(handle, input.webview, options);
        const disposeSub = input.webview.onDidDispose(() => {
            disposeSub.dispose();
            this._proxy.$onDidDisposeWebviewPanel(handle).finally(() => {
                this._webviewInputs.delete(handle);
            });
        });
    }
    $createWebviewPanel(extensionData, handle, viewType, initData, showOptions) {
        const targetGroup = this.getTargetGroupFromShowOptions(showOptions);
        const mainThreadShowOptions = showOptions ? {
            preserveFocus: !!showOptions.preserveFocus,
            group: targetGroup
        } : {};
        const extension = reviveWebviewExtension(extensionData);
        const origin = this.webviewOriginStore.getOrigin(viewType, extension.id);
        const webview = this._webviewWorkbenchService.openWebview({
            origin,
            providedViewType: viewType,
            title: initData.title,
            options: reviveWebviewOptions(initData.panelOptions),
            contentOptions: reviveWebviewContentOptions(initData.webviewOptions),
            extension
        }, this.webviewPanelViewType.fromExternal(viewType), initData.title, mainThreadShowOptions);
        this.addWebviewInput(handle, webview, { serializeBuffersForPostMessage: initData.serializeBuffersForPostMessage });
    }
    $disposeWebview(handle) {
        const webview = this.tryGetWebviewInput(handle);
        if (!webview) {
            return;
        }
        webview.dispose();
    }
    $setTitle(handle, value) {
        this.tryGetWebviewInput(handle)?.setName(value);
    }
    $setIconPath(handle, value) {
        const webview = this.tryGetWebviewInput(handle);
        if (webview) {
            webview.iconPath = reviveWebviewIcon(value);
        }
    }
    $reveal(handle, showOptions) {
        const webview = this.tryGetWebviewInput(handle);
        if (!webview || webview.isDisposed()) {
            return;
        }
        const targetGroup = this.getTargetGroupFromShowOptions(showOptions);
        this._webviewWorkbenchService.revealWebview(webview, targetGroup, !!showOptions.preserveFocus);
    }
    getTargetGroupFromShowOptions(showOptions) {
        if (typeof showOptions.viewColumn === 'undefined'
            || showOptions.viewColumn === ACTIVE_GROUP
            || (this._editorGroupService.count === 1 && this._editorGroupService.activeGroup.isEmpty)) {
            return ACTIVE_GROUP;
        }
        if (showOptions.viewColumn === SIDE_GROUP) {
            return SIDE_GROUP;
        }
        if (showOptions.viewColumn >= 0) {
            // First check to see if an existing group exists
            const groupInColumn = this._editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[showOptions.viewColumn];
            if (groupInColumn) {
                return groupInColumn.id;
            }
            // We are dealing with an unknown group and therefore need a new group.
            // Note that the new group's id may not match the one requested. We only allow
            // creating a single new group, so if someone passes in `showOptions.viewColumn = 99`
            // and there are two editor groups open, we simply create a third editor group instead
            // of creating all the groups up to 99.
            const newGroup = this._editorGroupService.findGroup({ location: 1 /* GroupLocation.LAST */ });
            if (newGroup) {
                const direction = preferredSideBySideGroupDirection(this._configurationService);
                return this._editorGroupService.addGroup(newGroup, direction);
            }
        }
        return ACTIVE_GROUP;
    }
    $registerSerializer(viewType, options) {
        if (this._revivers.has(viewType)) {
            throw new Error(`Reviver for ${viewType} already registered`);
        }
        this._revivers.set(viewType, this._webviewWorkbenchService.registerResolver({
            canResolve: (webviewInput) => {
                return webviewInput.viewType === this.webviewPanelViewType.fromExternal(viewType);
            },
            resolveWebview: async (webviewInput) => {
                const viewType = this.webviewPanelViewType.toExternal(webviewInput.viewType);
                if (!viewType) {
                    webviewInput.webview.setHtml(this._mainThreadWebviews.getWebviewResolvedFailedContent(webviewInput.viewType));
                    return;
                }
                const handle = generateUuid();
                this.addWebviewInput(handle, webviewInput, options);
                let state = undefined;
                if (webviewInput.webview.state) {
                    try {
                        state = JSON.parse(webviewInput.webview.state);
                    }
                    catch (e) {
                        console.error('Could not load webview state', e, webviewInput.webview.state);
                    }
                }
                try {
                    await this._proxy.$deserializeWebviewPanel(handle, viewType, {
                        title: webviewInput.getTitle(),
                        state,
                        panelOptions: webviewInput.webview.options,
                        webviewOptions: webviewInput.webview.contentOptions,
                        active: webviewInput === this._editorService.activeEditor,
                    }, editorGroupToColumn(this._editorGroupService, webviewInput.group || 0));
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewInput.webview.setHtml(this._mainThreadWebviews.getWebviewResolvedFailedContent(viewType));
                }
            }
        }));
    }
    $unregisterSerializer(viewType) {
        if (!this._revivers.has(viewType)) {
            throw new Error(`No reviver for ${viewType} registered`);
        }
        this._revivers.deleteAndDispose(viewType);
    }
    updateWebviewViewStates(activeEditorInput) {
        if (!this._webviewInputs.size) {
            return;
        }
        const viewStates = {};
        const updateViewStatesForInput = (group, topLevelInput, editorInput) => {
            if (!(editorInput instanceof WebviewInput)) {
                return;
            }
            editorInput.updateGroup(group.id);
            const handle = this._webviewInputs.getHandleForInput(editorInput);
            if (handle) {
                viewStates[handle] = {
                    visible: topLevelInput === group.activeEditor,
                    active: editorInput === activeEditorInput,
                    position: editorGroupToColumn(this._editorGroupService, group.id),
                };
            }
        };
        for (const group of this._editorGroupService.groups) {
            for (const input of group.editors) {
                if (input instanceof DiffEditorInput) {
                    updateViewStatesForInput(group, input, input.primary);
                    updateViewStatesForInput(group, input, input.secondary);
                }
                else {
                    updateViewStatesForInput(group, input, input);
                }
            }
        }
        if (Object.keys(viewStates).length) {
            this._proxy.$onDidChangeWebviewPanelViewStates(viewStates);
        }
    }
    tryGetWebviewInput(handle) {
        return this._webviewInputs.getInputForHandle(handle);
    }
};
MainThreadWebviewPanels = __decorate([
    __param(2, IConfigurationService),
    __param(3, IEditorGroupsService),
    __param(4, IEditorService),
    __param(5, IExtensionService),
    __param(6, IStorageService),
    __param(7, IWebviewWorkbenchService)
], MainThreadWebviewPanels);
export { MainThreadWebviewPanels };
function reviveWebviewIcon(value) {
    if (!value) {
        return undefined;
    }
    return {
        light: URI.revive(value.light),
        dark: URI.revive(value.dark),
    };
}
function reviveWebviewOptions(panelOptions) {
    return {
        enableFindWidget: panelOptions.enableFindWidget,
        retainContextWhenHidden: panelOptions.retainContextWhenHidden,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdQYW5lbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRXZWJ2aWV3UGFuZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQWtCLE1BQU0sMENBQTBDLENBQUM7QUFDNUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRXhGLE9BQU8sRUFBdUIsd0JBQXdCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM5SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4RixPQUFPLEVBQTRDLG9CQUFvQixFQUFFLGlDQUFpQyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDeEssT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQWtCLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFD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