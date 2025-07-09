/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isStandalone } from '../../../base/browser/browser.js';
import { mainWindow } from '../../../base/browser/window.js';
import { VSBuffer, decodeBase64, encodeBase64 } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { parse } from '../../../base/common/marshalling.js';
import { Schemas } from '../../../base/common/network.js';
import { posix } from '../../../base/common/path.js';
import { isEqual } from '../../../base/common/resources.js';
import { ltrim } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import product from '../../../platform/product/common/product.js';
import { isFolderToOpen, isWorkspaceToOpen } from '../../../platform/window/common/window.js';
import { create } from '../../../workbench/workbench.web.main.internal.js';
class TransparentCrypto {
    async seal(data) {
        return data;
    }
    async unseal(data) {
        return data;
    }
}
var AESConstants;
(function (AESConstants) {
    AESConstants["ALGORITHM"] = "AES-GCM";
    AESConstants[AESConstants["KEY_LENGTH"] = 256] = "KEY_LENGTH";
    AESConstants[AESConstants["IV_LENGTH"] = 12] = "IV_LENGTH";
})(AESConstants || (AESConstants = {}));
class NetworkError extends Error {
    constructor(inner) {
        super(inner.message);
        this.name = inner.name;
        this.stack = inner.stack;
    }
}
class ServerKeyedAESCrypto {
    /**
     * Gets whether the algorithm is supported; requires a secure context
     */
    static supported() {
        return !!crypto.subtle;
    }
    constructor(authEndpoint) {
        this.authEndpoint = authEndpoint;
    }
    async seal(data) {
        // Get a new key and IV on every change, to avoid the risk of reusing the same key and IV pair with AES-GCM
        // (see also: https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams#properties)
        const iv = mainWindow.crypto.getRandomValues(new Uint8Array(12 /* AESConstants.IV_LENGTH */));
        // crypto.getRandomValues isn't a good-enough PRNG to generate crypto keys, so we need to use crypto.subtle.generateKey and export the key instead
        const clientKeyObj = await mainWindow.crypto.subtle.generateKey({ name: "AES-GCM" /* AESConstants.ALGORITHM */, length: 256 /* AESConstants.KEY_LENGTH */ }, true, ['encrypt', 'decrypt']);
        const clientKey = new Uint8Array(await mainWindow.crypto.subtle.exportKey('raw', clientKeyObj));
        const key = await this.getKey(clientKey);
        const dataUint8Array = new TextEncoder().encode(data);
        const cipherText = await mainWindow.crypto.subtle.encrypt({ name: "AES-GCM" /* AESConstants.ALGORITHM */, iv }, key, dataUint8Array);
        // Base64 encode the result and store the ciphertext, the key, and the IV in localStorage
        // Note that the clientKey and IV don't need to be secret
        const result = new Uint8Array([...clientKey, ...iv, ...new Uint8Array(cipherText)]);
        return encodeBase64(VSBuffer.wrap(result));
    }
    async unseal(data) {
        // encrypted should contain, in order: the key (32-byte), the IV for AES-GCM (12-byte) and the ciphertext (which has the GCM auth tag at the end)
        // Minimum length must be 44 (key+IV length) + 16 bytes (1 block encrypted with AES - regardless of key size)
        const dataUint8Array = decodeBase64(data);
        if (dataUint8Array.byteLength < 60) {
            throw Error('Invalid length for the value for credentials.crypto');
        }
        const keyLength = 256 /* AESConstants.KEY_LENGTH */ / 8;
        const clientKey = dataUint8Array.slice(0, keyLength);
        const iv = dataUint8Array.slice(keyLength, keyLength + 12 /* AESConstants.IV_LENGTH */);
        const cipherText = dataUint8Array.slice(keyLength + 12 /* AESConstants.IV_LENGTH */);
        // Do the decryption and parse the result as JSON
        const key = await this.getKey(clientKey.buffer);
        const decrypted = await mainWindow.crypto.subtle.decrypt({ name: "AES-GCM" /* AESConstants.ALGORITHM */, iv: iv.buffer }, key, cipherText.buffer);
        return new TextDecoder().decode(new Uint8Array(decrypted));
    }
    /**
     * Given a clientKey, returns the CryptoKey object that is used to encrypt/decrypt the data.
     * The actual key is (clientKey XOR serverKey)
     */
    async getKey(clientKey) {
        if (!clientKey || clientKey.byteLength !== 256 /* AESConstants.KEY_LENGTH */ / 8) {
            throw Error('Invalid length for clientKey');
        }
        const serverKey = await this.getServerKeyPart();
        const keyData = new Uint8Array(256 /* AESConstants.KEY_LENGTH */ / 8);
        for (let i = 0; i < keyData.byteLength; i++) {
            keyData[i] = clientKey[i] ^ serverKey[i];
        }
        return mainWindow.crypto.subtle.importKey('raw', keyData, {
            name: "AES-GCM" /* AESConstants.ALGORITHM */,
            length: 256 /* AESConstants.KEY_LENGTH */,
        }, true, ['encrypt', 'decrypt']);
    }
    async getServerKeyPart() {
        if (this.serverKey) {
            return this.serverKey;
        }
        let attempt = 0;
        let lastError;
        while (attempt <= 3) {
            try {
                const res = await fetch(this.authEndpoint, { credentials: 'include', method: 'POST' });
                if (!res.ok) {
                    throw new Error(res.statusText);
                }
                const serverKey = new Uint8Array(await res.arrayBuffer());
                if (serverKey.byteLength !== 256 /* AESConstants.KEY_LENGTH */ / 8) {
                    throw Error(`The key retrieved by the server is not ${256 /* AESConstants.KEY_LENGTH */} bit long.`);
                }
                this.serverKey = serverKey;
                return this.serverKey;
            }
            catch (e) {
                lastError = e instanceof Error ? e : new Error(String(e));
                attempt++;
                // exponential backoff
                await new Promise(resolve => setTimeout(resolve, attempt * attempt * 100));
            }
        }
        if (lastError) {
            throw new NetworkError(lastError);
        }
        throw new Error('Unknown error');
    }
}
export class LocalStorageSecretStorageProvider {
    constructor(crypto) {
        this.crypto = crypto;
        this.storageKey = 'secrets.provider';
        this.type = 'persisted';
        this.secretsPromise = this.load();
    }
    async load() {
        const record = this.loadAuthSessionFromElement();
        const encrypted = localStorage.getItem(this.storageKey);
        if (encrypted) {
            try {
                const decrypted = JSON.parse(await this.crypto.unseal(encrypted));
                return { ...record, ...decrypted };
            }
            catch (err) {
                // TODO: send telemetry
                console.error('Failed to decrypt secrets from localStorage', err);
                if (!(err instanceof NetworkError)) {
                    localStorage.removeItem(this.storageKey);
                }
            }
        }
        return record;
    }
    loadAuthSessionFromElement() {
        let authSessionInfo;
        const authSessionElement = mainWindow.document.getElementById('vscode-workbench-auth-session');
        const authSessionElementAttribute = authSessionElement ? authSessionElement.getAttribute('data-settings') : undefined;
        if (authSessionElementAttribute) {
            try {
                authSessionInfo = JSON.parse(authSessionElementAttribute);
            }
            catch (error) { /* Invalid session is passed. Ignore. */ }
        }
        if (!authSessionInfo) {
            return {};
        }
        const record = {};
        // Settings Sync Entry
        record[`${product.urlProtocol}.loginAccount`] = JSON.stringify(authSessionInfo);
        // Auth extension Entry
        if (authSessionInfo.providerId !== 'github') {
            console.error(`Unexpected auth provider: ${authSessionInfo.providerId}. Expected 'github'.`);
            return record;
        }
        const authAccount = JSON.stringify({ extensionId: 'vscode.github-authentication', key: 'github.auth' });
        record[authAccount] = JSON.stringify(authSessionInfo.scopes.map(scopes => ({
            id: authSessionInfo.id,
            scopes,
            accessToken: authSessionInfo.accessToken
        })));
        return record;
    }
    async get(key) {
        const secrets = await this.secretsPromise;
        return secrets[key];
    }
    async set(key, value) {
        const secrets = await this.secretsPromise;
        secrets[key] = value;
        this.secretsPromise = Promise.resolve(secrets);
        this.save();
    }
    async delete(key) {
        const secrets = await this.secretsPromise;
        delete secrets[key];
        this.secretsPromise = Promise.resolve(secrets);
        this.save();
    }
    async save() {
        try {
            const encrypted = await this.crypto.seal(JSON.stringify(await this.secretsPromise));
            localStorage.setItem(this.storageKey, encrypted);
        }
        catch (err) {
            console.error(err);
        }
    }
}
class LocalStorageURLCallbackProvider extends Disposable {
    static { this.REQUEST_ID = 0; }
    static { this.QUERY_KEYS = [
        'scheme',
        'authority',
        'path',
        'query',
        'fragment'
    ]; }
    constructor(_callbackRoute) {
        super();
        this._callbackRoute = _callbackRoute;
        this._onCallback = this._register(new Emitter());
        this.onCallback = this._onCallback.event;
        this.pendingCallbacks = new Set();
        this.lastTimeChecked = Date.now();
        this.checkCallbacksTimeout = undefined;
    }
    create(options = {}) {
        const id = ++LocalStorageURLCallbackProvider.REQUEST_ID;
        const queryParams = [`vscode-reqid=${id}`];
        for (const key of LocalStorageURLCallbackProvider.QUERY_KEYS) {
            const value = options[key];
            if (value) {
                queryParams.push(`vscode-${key}=${encodeURIComponent(value)}`);
            }
        }
        // TODO@joao remove eventually
        // https://github.com/microsoft/vscode-dev/issues/62
        // https://github.com/microsoft/vscode/blob/159479eb5ae451a66b5dac3c12d564f32f454796/extensions/github-authentication/src/githubServer.ts#L50-L50
        if (!(options.authority === 'vscode.github-authentication' && options.path === '/dummy')) {
            const key = `vscode-web.url-callbacks[${id}]`;
            localStorage.removeItem(key);
            this.pendingCallbacks.add(id);
            this.startListening();
        }
        return URI.parse(mainWindow.location.href).with({ path: this._callbackRoute, query: queryParams.join('&') });
    }
    startListening() {
        if (this.onDidChangeLocalStorageDisposable) {
            return;
        }
        const fn = () => this.onDidChangeLocalStorage();
        mainWindow.addEventListener('storage', fn);
        this.onDidChangeLocalStorageDisposable = { dispose: () => mainWindow.removeEventListener('storage', fn) };
    }
    stopListening() {
        this.onDidChangeLocalStorageDisposable?.dispose();
        this.onDidChangeLocalStorageDisposable = undefined;
    }
    // this fires every time local storage changes, but we
    // don't want to check more often than once a second
    async onDidChangeLocalStorage() {
        const ellapsed = Date.now() - this.lastTimeChecked;
        if (ellapsed > 1000) {
            this.checkCallbacks();
        }
        else if (this.checkCallbacksTimeout === undefined) {
            this.checkCallbacksTimeout = setTimeout(() => {
                this.checkCallbacksTimeout = undefined;
                this.checkCallbacks();
            }, 1000 - ellapsed);
        }
    }
    checkCallbacks() {
        let pendingCallbacks;
        for (const id of this.pendingCallbacks) {
            const key = `vscode-web.url-callbacks[${id}]`;
            const result = localStorage.getItem(key);
            if (result !== null) {
                try {
                    this._onCallback.fire(URI.revive(JSON.parse(result)));
                }
                catch (error) {
                    console.error(error);
                }
                pendingCallbacks = pendingCallbacks ?? new Set(this.pendingCallbacks);
                pendingCallbacks.delete(id);
                localStorage.removeItem(key);
            }
        }
        if (pendingCallbacks) {
            this.pendingCallbacks = pendingCallbacks;
            if (this.pendingCallbacks.size === 0) {
                this.stopListening();
            }
        }
        this.lastTimeChecked = Date.now();
    }
}
class WorkspaceProvider {
    static { this.QUERY_PARAM_EMPTY_WINDOW = 'ew'; }
    static { this.QUERY_PARAM_FOLDER = 'folder'; }
    static { this.QUERY_PARAM_WORKSPACE = 'workspace'; }
    static { this.QUERY_PARAM_PAYLOAD = 'payload'; }
    static create(config) {
        let foundWorkspace = false;
        let workspace;
        let payload = Object.create(null);
        const query = new URL(document.location.href).searchParams;
        query.forEach((value, key) => {
            switch (key) {
                // Folder
                case WorkspaceProvider.QUERY_PARAM_FOLDER:
                    if (config.remoteAuthority && value.startsWith(posix.sep)) {
                        // when connected to a remote and having a value
                        // that is a path (begins with a `/`), assume this
                        // is a vscode-remote resource as simplified URL.
                        workspace = { folderUri: URI.from({ scheme: Schemas.vscodeRemote, path: value, authority: config.remoteAuthority }) };
                    }
                    else {
                        workspace = { folderUri: URI.parse(value) };
                    }
                    foundWorkspace = true;
                    break;
                // Workspace
                case WorkspaceProvider.QUERY_PARAM_WORKSPACE:
                    if (config.remoteAuthority && value.startsWith(posix.sep)) {
                        // when connected to a remote and having a value
                        // that is a path (begins with a `/`), assume this
                        // is a vscode-remote resource as simplified URL.
                        workspace = { workspaceUri: URI.from({ scheme: Schemas.vscodeRemote, path: value, authority: config.remoteAuthority }) };
                    }
                    else {
                        workspace = { workspaceUri: URI.parse(value) };
                    }
                    foundWorkspace = true;
                    break;
                // Empty
                case WorkspaceProvider.QUERY_PARAM_EMPTY_WINDOW:
                    workspace = undefined;
                    foundWorkspace = true;
                    break;
                // Payload
                case WorkspaceProvider.QUERY_PARAM_PAYLOAD:
                    try {
                        payload = parse(value); // use marshalling#parse() to revive potential URIs
                    }
                    catch (error) {
                        console.error(error); // possible invalid JSON
                    }
                    break;
            }
        });
        // If no workspace is provided through the URL, check for config
        // attribute from server
        if (!foundWorkspace) {
            if (config.folderUri) {
                workspace = { folderUri: URI.revive(config.folderUri) };
            }
            else if (config.workspaceUri) {
                workspace = { workspaceUri: URI.revive(config.workspaceUri) };
            }
        }
        return new WorkspaceProvider(workspace, payload, config);
    }
    constructor(workspace, payload, config) {
        this.workspace = workspace;
        this.payload = payload;
        this.config = config;
        this.trusted = true;
    }
    async open(workspace, options) {
        if (options?.reuse && !options.payload && this.isSame(this.workspace, workspace)) {
            return true; // return early if workspace and environment is not changing and we are reusing window
        }
        const targetHref = this.createTargetUrl(workspace, options);
        if (targetHref) {
            if (options?.reuse) {
                mainWindow.location.href = targetHref;
                return true;
            }
            else {
                let result;
                if (isStandalone()) {
                    result = mainWindow.open(targetHref, '_blank', 'toolbar=no'); // ensures to open another 'standalone' window!
                }
                else {
                    result = mainWindow.open(targetHref);
                }
                return !!result;
            }
        }
        return false;
    }
    createTargetUrl(workspace, options) {
        // Empty
        let targetHref = undefined;
        if (!workspace) {
            targetHref = `${document.location.origin}${document.location.pathname}?${WorkspaceProvider.QUERY_PARAM_EMPTY_WINDOW}=true`;
        }
        // Folder
        else if (isFolderToOpen(workspace)) {
            const queryParamFolder = this.encodeWorkspacePath(workspace.folderUri);
            targetHref = `${document.location.origin}${document.location.pathname}?${WorkspaceProvider.QUERY_PARAM_FOLDER}=${queryParamFolder}`;
        }
        // Workspace
        else if (isWorkspaceToOpen(workspace)) {
            const queryParamWorkspace = this.encodeWorkspacePath(workspace.workspaceUri);
            targetHref = `${document.location.origin}${document.location.pathname}?${WorkspaceProvider.QUERY_PARAM_WORKSPACE}=${queryParamWorkspace}`;
        }
        // Append payload if any
        if (options?.payload) {
            targetHref += `&${WorkspaceProvider.QUERY_PARAM_PAYLOAD}=${encodeURIComponent(JSON.stringify(options.payload))}`;
        }
        return targetHref;
    }
    encodeWorkspacePath(uri) {
        if (this.config.remoteAuthority && uri.scheme === Schemas.vscodeRemote) {
            // when connected to a remote and having a folder
            // or workspace for that remote, only use the path
            // as query value to form shorter, nicer URLs.
            // however, we still need to `encodeURIComponent`
            // to ensure to preserve special characters, such
            // as `+` in the path.
            return encodeURIComponent(`${posix.sep}${ltrim(uri.path, posix.sep)}`).replaceAll('%2F', '/');
        }
        return encodeURIComponent(uri.toString(true));
    }
    isSame(workspaceA, workspaceB) {
        if (!workspaceA || !workspaceB) {
            return workspaceA === workspaceB; // both empty
        }
        if (isFolderToOpen(workspaceA) && isFolderToOpen(workspaceB)) {
            return isEqual(workspaceA.folderUri, workspaceB.folderUri); // same workspace
        }
        if (isWorkspaceToOpen(workspaceA) && isWorkspaceToOpen(workspaceB)) {
            return isEqual(workspaceA.workspaceUri, workspaceB.workspaceUri); // same workspace
        }
        return false;
    }
    hasRemote() {
        if (this.workspace) {
            if (isFolderToOpen(this.workspace)) {
                return this.workspace.folderUri.scheme === Schemas.vscodeRemote;
            }
            if (isWorkspaceToOpen(this.workspace)) {
                return this.workspace.workspaceUri.scheme === Schemas.vscodeRemote;
            }
        }
        return true;
    }
}
function readCookie(name) {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        if (cookie.startsWith(name + '=')) {
            return cookie.substring(name.length + 1);
        }
    }
    return undefined;
}
(function () {
    // Find config by checking for DOM
    const configElement = mainWindow.document.getElementById('vscode-workbench-web-configuration');
    const configElementAttribute = configElement ? configElement.getAttribute('data-settings') : undefined;
    if (!configElement || !configElementAttribute) {
        throw new Error('Missing web configuration element');
    }
    const config = JSON.parse(configElementAttribute);
    const secretStorageKeyPath = readCookie('vscode-secret-key-path');
    const secretStorageCrypto = secretStorageKeyPath && ServerKeyedAESCrypto.supported()
        ? new ServerKeyedAESCrypto(secretStorageKeyPath) : new TransparentCrypto();
    // Create workbench
    create(mainWindow.document.body, {
        ...config,
        windowIndicator: config.windowIndicator ?? { label: '$(remote)', tooltip: `${product.nameShort} Web` },
        settingsSyncOptions: config.settingsSyncOptions ? { enabled: config.settingsSyncOptions.enabled, } : undefined,
        workspaceProvider: WorkspaceProvider.create(config),
        urlCallbackProvider: new LocalStorageURLCallbackProvider(config.callbackRoute),
        secretStorageProvider: config.remoteAuthority && !secretStorageKeyPath
            ? undefined /* with a remote without embedder-preferred storage, store on the remote */
            : new LocalStorageSecretStorageProvider(secretStorageCrypto),
    });
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvYnJvd3Nlci93b3JrYmVuY2gvd29ya2JlbmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxPQUFPLE1BQU0sNkNBQTZDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBSTlGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQU8zRSxNQUFNLGlCQUFpQjtJQUV0QixLQUFLLENBQUMsSUFBSSxDQUFDLElBQVk7UUFDdEIsT0FBTyxJQUFJLENBQUM7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