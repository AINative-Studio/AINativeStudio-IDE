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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdQYW5lbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFdlYnZpZXdQYW5lbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsaURBQWlEO0FBRWpELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU1RCxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSx1QkFBdUIsRUFBbUMsZUFBZSxFQUFFLG9DQUFvQyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFJdEosT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFDO0FBS2xELE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUVsQyxPQUFPLENBQWdDO0lBQ3ZDLE1BQU0sQ0FBK0M7SUFDckQsU0FBUyxDQUFTO0lBRWxCLFFBQVEsQ0FBaUI7SUFDekIsUUFBUSxDQUE2QjtJQUU5QyxNQUFNLENBQVM7SUFDZixTQUFTLENBQVk7SUFDckIsV0FBVyxDQUE0QztJQUN2RCxRQUFRLENBQWlCO0lBQ3pCLE9BQU8sQ0FBVTtJQUNqQixXQUFXLENBQWtCO0lBRXBCLGFBQWEsQ0FBdUM7SUFHcEQscUJBQXFCLENBQStFO0lBRzdHLFlBQ0MsTUFBcUMsRUFDckMsS0FBbUQsRUFDbkQsT0FBdUIsRUFDdkIsTUFNQztRQUVELEtBQUss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