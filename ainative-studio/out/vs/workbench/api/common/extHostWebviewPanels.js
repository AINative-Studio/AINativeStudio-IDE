/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-native-private */
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import * as typeConverters from './extHostTypeConverters.js';
import { serializeWebviewOptions, toExtensionData, shouldSerializeBuffersForPostMessage } from './extHostWebview.js';
import * as extHostProtocol from './extHost.protocol.js';
import * as extHostTypes from './extHostTypes.js';
class ExtHostWebviewPanel extends Disposable {
    #handle;
    #proxy;
    #viewType;
    #webview;
    #options;
    #title;
    #iconPath;
    #viewColumn;
    #visible;
    #active;
    #isDisposed;
    #onDidDispose;
    #onDidChangeViewState;
    constructor(handle, proxy, webview, params) {
        super();
        this.#viewColumn = undefined;
        this.#visible = true;
        this.#isDisposed = false;
        this.#onDidDispose = this._register(new Emitter());
        this.onDidDispose = this.#onDidDispose.event;
        this.#onDidChangeViewState = this._register(new Emitter());
        this.onDidChangeViewState = this.#onDidChangeViewState.event;
        this.#handle = handle;
        this.#proxy = proxy;
        this.#webview = webview;
        this.#viewType = params.viewType;
        this.#options = params.panelOptions;
        this.#viewColumn = params.viewColumn;
        this.#title = params.title;
        this.#active = params.active;
    }
    dispose() {
        if (this.#isDisposed) {
            return;
        }
        this.#isDisposed = true;
        this.#onDidDispose.fire();
        this.#proxy.$disposeWebview(this.#handle);
        this.#webview.dispose();
        super.dispose();
    }
    get webview() {
        this.assertNotDisposed();
        return this.#webview;
    }
    get viewType() {
        this.assertNotDisposed();
        return this.#viewType;
    }
    get title() {
        this.assertNotDisposed();
        return this.#title;
    }
    set title(value) {
        this.assertNotDisposed();
        if (this.#title !== value) {
            this.#title = value;
            this.#proxy.$setTitle(this.#handle, value);
        }
    }
    get iconPath() {
        this.assertNotDisposed();
        return this.#iconPath;
    }
    set iconPath(value) {
        this.assertNotDisposed();
        if (this.#iconPath !== value) {
            this.#iconPath = value;
            this.#proxy.$setIconPath(this.#handle, URI.isUri(value) ? { light: value, dark: value } : value);
        }
    }
    get options() {
        return this.#options;
    }
    get viewColumn() {
        this.assertNotDisposed();
        if (typeof this.#viewColumn === 'number' && this.#viewColumn < 0) {
            // We are using a symbolic view column
            // Return undefined instead to indicate that the real view column is currently unknown but will be resolved.
            return undefined;
        }
        return this.#viewColumn;
    }
    get active() {
        this.assertNotDisposed();
        return this.#active;
    }
    get visible() {
        this.assertNotDisposed();
        return this.#visible;
    }
    _updateViewState(newState) {
        if (this.#isDisposed) {
            return;
        }
        if (this.active !== newState.active || this.visible !== newState.visible || this.viewColumn !== newState.viewColumn) {
            this.#active = newState.active;
            this.#visible = newState.visible;
            this.#viewColumn = newState.viewColumn;
            this.#onDidChangeViewState.fire({ webviewPanel: this });
        }
    }
    reveal(viewColumn, preserveFocus) {
        this.assertNotDisposed();
        this.#proxy.$reveal(this.#handle, {
            viewColumn: typeof viewColumn === 'undefined' ? undefined : typeConverters.ViewColumn.from(viewColumn),
            preserveFocus: !!preserveFocus
        });
    }
    assertNotDisposed() {
        if (this.#isDisposed) {
            throw new Error('Webview is disposed');
        }
    }
}
export class ExtHostWebviewPanels extends Disposable {
    static newHandle() {
        return generateUuid();
    }
    constructor(mainContext, webviews, workspace) {
        super();
        this.webviews = webviews;
        this.workspace = workspace;
        this._webviewPanels = new Map();
        this._serializers = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWebviewPanels);
    }
    dispose() {
        super.dispose();
        this._webviewPanels.forEach(value => value.dispose());
        this._webviewPanels.clear();
    }
    createWebviewPanel(extension, viewType, title, showOptions, options = {}) {
        const viewColumn = typeof showOptions === 'object' ? showOptions.viewColumn : showOptions;
        const webviewShowOptions = {
            viewColumn: typeConverters.ViewColumn.from(viewColumn),
            preserveFocus: typeof showOptions === 'object' && !!showOptions.preserveFocus
        };
        const serializeBuffersForPostMessage = shouldSerializeBuffersForPostMessage(extension);
        const handle = ExtHostWebviewPanels.newHandle();
        this._proxy.$createWebviewPanel(toExtensionData(extension), handle, viewType, {
            title,
            panelOptions: serializeWebviewPanelOptions(options),
            webviewOptions: serializeWebviewOptions(extension, this.workspace, options),
            serializeBuffersForPostMessage,
        }, webviewShowOptions);
        const webview = this.webviews.createNewWebview(handle, options, extension);
        const panel = this.createNewWebviewPanel(handle, viewType, title, viewColumn, options, webview, true);
        return panel;
    }
    $onDidChangeWebviewPanelViewStates(newStates) {
        const handles = Object.keys(newStates);
        // Notify webviews of state changes in the following order:
        // - Non-visible
        // - Visible
        // - Active
        handles.sort((a, b) => {
            const stateA = newStates[a];
            const stateB = newStates[b];
            if (stateA.active) {
                return 1;
            }
            if (stateB.active) {
                return -1;
            }
            return (+stateA.visible) - (+stateB.visible);
        });
        for (const handle of handles) {
            const panel = this.getWebviewPanel(handle);
            if (!panel) {
                continue;
            }
            const newState = newStates[handle];
            panel._updateViewState({
                active: newState.active,
                visible: newState.visible,
                viewColumn: typeConverters.ViewColumn.to(newState.position),
            });
        }
    }
    async $onDidDisposeWebviewPanel(handle) {
        const panel = this.getWebviewPanel(handle);
        panel?.dispose();
        this._webviewPanels.delete(handle);
        this.webviews.deleteWebview(handle);
    }
    registerWebviewPanelSerializer(extension, viewType, serializer) {
        if (this._serializers.has(viewType)) {
            throw new Error(`Serializer for '${viewType}' already registered`);
        }
        this._serializers.set(viewType, { serializer, extension });
        this._proxy.$registerSerializer(viewType, {
            serializeBuffersForPostMessage: shouldSerializeBuffersForPostMessage(extension)
        });
        return new extHostTypes.Disposable(() => {
            this._serializers.delete(viewType);
            this._proxy.$unregisterSerializer(viewType);
        });
    }
    async $deserializeWebviewPanel(webviewHandle, viewType, initData, position) {
        const entry = this._serializers.get(viewType);
        if (!entry) {
            throw new Error(`No serializer found for '${viewType}'`);
        }
        const { serializer, extension } = entry;
        const webview = this.webviews.createNewWebview(webviewHandle, initData.webviewOptions, extension);
        const revivedPanel = this.createNewWebviewPanel(webviewHandle, viewType, initData.title, position, initData.panelOptions, webview, initData.active);
        await serializer.deserializeWebviewPanel(revivedPanel, initData.state);
    }
    createNewWebviewPanel(webviewHandle, viewType, title, position, options, webview, active) {
        const panel = new ExtHostWebviewPanel(webviewHandle, this._proxy, webview, { viewType, title, viewColumn: position, panelOptions: options, active });
        this._webviewPanels.set(webviewHandle, panel);
        return panel;
    }
    getWebviewPanel(handle) {
        return this._webviewPanels.get(handle);
    }
}
function serializeWebviewPanelOptions(options) {
    return {
        enableFindWidget: options.enableFindWidget,
        retainContextWhenHidden: options.retainContextWhenHidden,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdQYW5lbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RXZWJ2aWV3UGFuZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLGlEQUFpRDtBQUVqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFNUQsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQW1DLGVBQWUsRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBSXRKLE9BQU8sS0FBSyxlQUFlLE1BQU0sdUJBQXVCLENBQUM7QUFDekQsT0FBTyxLQUFLLFlBQVksTUFBTSxtQkFBbUIsQ0FBQztBQUtsRCxNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFFbEMsT0FBTyxDQUFnQztJQUN2QyxNQUFNLENBQStDO0lBQ3JELFNBQVMsQ0FBUztJQUVsQixRQUFRLENBQWlCO0lBQ3pCLFFBQVEsQ0FBNkI7SUFFOUMsTUFBTSxDQUFTO0lBQ2YsU0FBUyxDQUFZO0lBQ3JCLFdBQVcsQ0FBNEM7SUFDdkQsUUFBUSxDQUFpQjtJQUN6QixPQUFPLENBQVU7SUFDakIsV0FBVyxDQUFrQjtJQUVwQixhQUFhLENBQXVDO0lBR3BELHFCQUFxQixDQUErRTtJQUc3RyxZQUNDLE1BQXFDLEVBQ3JDLEtBQW1ELEVBQ25ELE9BQXVCLEVBQ3ZCLE1BTUM7UUFFRCxL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