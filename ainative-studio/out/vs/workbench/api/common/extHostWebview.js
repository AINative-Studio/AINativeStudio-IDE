/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import * as objects from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { normalizeVersion, parseVersion } from '../../../platform/extensions/common/extensionValidator.js';
import { deserializeWebviewMessage, serializeWebviewMessage } from './extHostWebviewMessaging.js';
import { asWebviewUri, webviewGenericCspSource } from '../../contrib/webview/common/webview.js';
import * as extHostProtocol from './extHost.protocol.js';
export class ExtHostWebview {
    #handle;
    #proxy;
    #deprecationService;
    #remoteInfo;
    #workspace;
    #extension;
    #html;
    #options;
    #isDisposed;
    #hasCalledAsWebviewUri;
    #serializeBuffersForPostMessage;
    #shouldRewriteOldResourceUris;
    constructor(handle, proxy, options, remoteInfo, workspace, extension, deprecationService) {
        this.#html = '';
        this.#isDisposed = false;
        this.#hasCalledAsWebviewUri = false;
        /* internal */ this._onMessageEmitter = new Emitter();
        this.onDidReceiveMessage = this._onMessageEmitter.event;
        this.#onDidDisposeEmitter = new Emitter();
        /* internal */ this._onDidDispose = this.#onDidDisposeEmitter.event;
        this.#handle = handle;
        this.#proxy = proxy;
        this.#options = options;
        this.#remoteInfo = remoteInfo;
        this.#workspace = workspace;
        this.#extension = extension;
        this.#serializeBuffersForPostMessage = shouldSerializeBuffersForPostMessage(extension);
        this.#shouldRewriteOldResourceUris = shouldTryRewritingOldResourceUris(extension);
        this.#deprecationService = deprecationService;
    }
    #onDidDisposeEmitter;
    dispose() {
        this.#isDisposed = true;
        this.#onDidDisposeEmitter.fire();
        this.#onDidDisposeEmitter.dispose();
        this._onMessageEmitter.dispose();
    }
    asWebviewUri(resource) {
        this.#hasCalledAsWebviewUri = true;
        return asWebviewUri(resource, this.#remoteInfo);
    }
    get cspSource() {
        const extensionLocation = this.#extension.extensionLocation;
        if (extensionLocation.scheme === Schemas.https || extensionLocation.scheme === Schemas.http) {
            // The extension is being served up from a CDN.
            // Also include the CDN in the default csp.
            let extensionCspRule = extensionLocation.toString();
            if (!extensionCspRule.endsWith('/')) {
                // Always treat the location as a directory so that we allow all content under it
                extensionCspRule += '/';
            }
            return extensionCspRule + ' ' + webviewGenericCspSource;
        }
        return webviewGenericCspSource;
    }
    get html() {
        this.assertNotDisposed();
        return this.#html;
    }
    set html(value) {
        this.assertNotDisposed();
        if (this.#html !== value) {
            this.#html = value;
            if (this.#shouldRewriteOldResourceUris && !this.#hasCalledAsWebviewUri && /(["'])vscode-resource:([^\s'"]+?)(["'])/i.test(value)) {
                this.#hasCalledAsWebviewUri = true;
                this.#deprecationService.report('Webview vscode-resource: uris', this.#extension, `Please migrate to use the 'webview.asWebviewUri' api instead: https://aka.ms/vscode-webview-use-aswebviewuri`);
            }
            this.#proxy.$setHtml(this.#handle, this.rewriteOldResourceUrlsIfNeeded(value));
        }
    }
    get options() {
        this.assertNotDisposed();
        return this.#options;
    }
    set options(newOptions) {
        this.assertNotDisposed();
        if (!objects.equals(this.#options, newOptions)) {
            this.#proxy.$setOptions(this.#handle, serializeWebviewOptions(this.#extension, this.#workspace, newOptions));
        }
        this.#options = newOptions;
    }
    async postMessage(message) {
        if (this.#isDisposed) {
            return false;
        }
        const serialized = serializeWebviewMessage(message, { serializeBuffersForPostMessage: this.#serializeBuffersForPostMessage });
        return this.#proxy.$postMessage(this.#handle, serialized.message, ...serialized.buffers);
    }
    assertNotDisposed() {
        if (this.#isDisposed) {
            throw new Error('Webview is disposed');
        }
    }
    rewriteOldResourceUrlsIfNeeded(value) {
        if (!this.#shouldRewriteOldResourceUris) {
            return value;
        }
        const isRemote = this.#extension.extensionLocation?.scheme === Schemas.vscodeRemote;
        const remoteAuthority = this.#extension.extensionLocation.scheme === Schemas.vscodeRemote ? this.#extension.extensionLocation.authority : undefined;
        return value
            .replace(/(["'])(?:vscode-resource):(\/\/([^\s\/'"]+?)(?=\/))?([^\s'"]+?)(["'])/gi, (_match, startQuote, _1, scheme, path, endQuote) => {
            const uri = URI.from({
                scheme: scheme || 'file',
                path: decodeURIComponent(path),
            });
            const webviewUri = asWebviewUri(uri, { isRemote, authority: remoteAuthority }).toString();
            return `${startQuote}${webviewUri}${endQuote}`;
        })
            .replace(/(["'])(?:vscode-webview-resource):(\/\/[^\s\/'"]+\/([^\s\/'"]+?)(?=\/))?([^\s'"]+?)(["'])/gi, (_match, startQuote, _1, scheme, path, endQuote) => {
            const uri = URI.from({
                scheme: scheme || 'file',
                path: decodeURIComponent(path),
            });
            const webviewUri = asWebviewUri(uri, { isRemote, authority: remoteAuthority }).toString();
            return `${startQuote}${webviewUri}${endQuote}`;
        });
    }
}
export function shouldSerializeBuffersForPostMessage(extension) {
    try {
        const version = normalizeVersion(parseVersion(extension.engines.vscode));
        return !!version && version.majorBase >= 1 && version.minorBase >= 57;
    }
    catch {
        return false;
    }
}
function shouldTryRewritingOldResourceUris(extension) {
    try {
        const version = normalizeVersion(parseVersion(extension.engines.vscode));
        if (!version) {
            return false;
        }
        return version.majorBase < 1 || (version.majorBase === 1 && version.minorBase < 60);
    }
    catch {
        return false;
    }
}
export class ExtHostWebviews extends Disposable {
    constructor(mainContext, remoteInfo, workspace, _logService, _deprecationService) {
        super();
        this.remoteInfo = remoteInfo;
        this.workspace = workspace;
        this._logService = _logService;
        this._deprecationService = _deprecationService;
        this._webviews = new Map();
        this._webviewProxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWebviews);
    }
    dispose() {
        super.dispose();
        for (const webview of this._webviews.values()) {
            webview.dispose();
        }
        this._webviews.clear();
    }
    $onMessage(handle, jsonMessage, buffers) {
        const webview = this.getWebview(handle);
        if (webview) {
            const { message } = deserializeWebviewMessage(jsonMessage, buffers.value);
            webview._onMessageEmitter.fire(message);
        }
    }
    $onMissingCsp(_handle, extensionId) {
        this._logService.warn(`${extensionId} created a webview without a content security policy: https://aka.ms/vscode-webview-missing-csp`);
    }
    createNewWebview(handle, options, extension) {
        const webview = new ExtHostWebview(handle, this._webviewProxy, reviveOptions(options), this.remoteInfo, this.workspace, extension, this._deprecationService);
        this._webviews.set(handle, webview);
        const sub = webview._onDidDispose(() => {
            sub.dispose();
            this.deleteWebview(handle);
        });
        return webview;
    }
    deleteWebview(handle) {
        this._webviews.delete(handle);
    }
    getWebview(handle) {
        return this._webviews.get(handle);
    }
}
export function toExtensionData(extension) {
    return { id: extension.identifier, location: extension.extensionLocation };
}
export function serializeWebviewOptions(extension, workspace, options) {
    return {
        enableCommandUris: options.enableCommandUris,
        enableScripts: options.enableScripts,
        enableForms: options.enableForms,
        portMapping: options.portMapping,
        localResourceRoots: options.localResourceRoots || getDefaultLocalResourceRoots(extension, workspace)
    };
}
function reviveOptions(options) {
    return {
        enableCommandUris: options.enableCommandUris,
        enableScripts: options.enableScripts,
        enableForms: options.enableForms,
        portMapping: options.portMapping,
        localResourceRoots: options.localResourceRoots?.map(components => URI.from(components)),
    };
}
function getDefaultLocalResourceRoots(extension, workspace) {
    return [
        ...(workspace?.getWorkspaceFolders() || []).map(x => x.uri),
        extension.extensionLocation,
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFdlYnZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBSTNHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWxHLE9BQU8sRUFBcUIsWUFBWSxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHbkgsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUV6RCxNQUFNLE9BQU8sY0FBYztJQUVqQixPQUFPLENBQWdDO0lBQ3ZDLE1BQU0sQ0FBMEM7SUFDaEQsbUJBQW1CLENBQWdDO0lBRW5ELFdBQVcsQ0FBb0I7SUFDL0IsVUFBVSxDQUFnQztJQUMxQyxVQUFVLENBQXdCO0lBRTNDLEtBQUssQ0FBYztJQUNuQixRQUFRLENBQXdCO0lBQ2hDLFdBQVcsQ0FBa0I7SUFDN0Isc0JBQXNCLENBQVM7SUFFL0IsK0JBQStCLENBQVU7SUFDekMsNkJBQTZCLENBQVU7SUFFdkMsWUFDQyxNQUFxQyxFQUNyQyxLQUE4QyxFQUM5QyxPQUE4QixF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