/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as errors from './errors.js';
import * as platform from './platform.js';
import { equalsIgnoreCase, startsWithIgnoreCase } from './strings.js';
import { URI } from './uri.js';
import * as paths from './path.js';
export var Schemas;
(function (Schemas) {
    /**
     * A schema that is used for models that exist in memory
     * only and that have no correspondence on a server or such.
     */
    Schemas.inMemory = 'inmemory';
    /**
     * A schema that is used for setting files
     */
    Schemas.vscode = 'vscode';
    /**
     * A schema that is used for internal private files
     */
    Schemas.internal = 'private';
    /**
     * A walk-through document.
     */
    Schemas.walkThrough = 'walkThrough';
    /**
     * An embedded code snippet.
     */
    Schemas.walkThroughSnippet = 'walkThroughSnippet';
    Schemas.http = 'http';
    Schemas.https = 'https';
    Schemas.file = 'file';
    Schemas.mailto = 'mailto';
    Schemas.untitled = 'untitled';
    Schemas.data = 'data';
    Schemas.command = 'command';
    Schemas.vscodeRemote = 'vscode-remote';
    Schemas.vscodeRemoteResource = 'vscode-remote-resource';
    Schemas.vscodeManagedRemoteResource = 'vscode-managed-remote-resource';
    Schemas.vscodeUserData = 'vscode-userdata';
    Schemas.vscodeCustomEditor = 'vscode-custom-editor';
    Schemas.vscodeNotebookCell = 'vscode-notebook-cell';
    Schemas.vscodeNotebookCellMetadata = 'vscode-notebook-cell-metadata';
    Schemas.vscodeNotebookCellMetadataDiff = 'vscode-notebook-cell-metadata-diff';
    Schemas.vscodeNotebookCellOutput = 'vscode-notebook-cell-output';
    Schemas.vscodeNotebookCellOutputDiff = 'vscode-notebook-cell-output-diff';
    Schemas.vscodeNotebookMetadata = 'vscode-notebook-metadata';
    Schemas.vscodeInteractiveInput = 'vscode-interactive-input';
    Schemas.vscodeSettings = 'vscode-settings';
    Schemas.vscodeWorkspaceTrust = 'vscode-workspace-trust';
    Schemas.vscodeTerminal = 'vscode-terminal';
    /** Scheme used for code blocks in chat. */
    Schemas.vscodeChatCodeBlock = 'vscode-chat-code-block';
    /** Scheme used for LHS of code compare (aka diff) blocks in chat. */
    Schemas.vscodeChatCodeCompareBlock = 'vscode-chat-code-compare-block';
    /** Scheme used for the chat input editor. */
    Schemas.vscodeChatSesssion = 'vscode-chat-editor';
    /**
     * Scheme used internally for webviews that aren't linked to a resource (i.e. not custom editors)
     */
    Schemas.webviewPanel = 'webview-panel';
    /**
     * Scheme used for loading the wrapper html and script in webviews.
     */
    Schemas.vscodeWebview = 'vscode-webview';
    /**
     * Scheme used for extension pages
     */
    Schemas.extension = 'extension';
    /**
     * Scheme used as a replacement of `file` scheme to load
     * files with our custom protocol handler (desktop only).
     */
    Schemas.vscodeFileResource = 'vscode-file';
    /**
     * Scheme used for temporary resources
     */
    Schemas.tmp = 'tmp';
    /**
     * Scheme used vs live share
     */
    Schemas.vsls = 'vsls';
    /**
     * Scheme used for the Source Control commit input's text document
     */
    Schemas.vscodeSourceControl = 'vscode-scm';
    /**
     * Scheme used for input box for creating comments.
     */
    Schemas.commentsInput = 'comment';
    /**
     * Scheme used for special rendering of settings in the release notes
     */
    Schemas.codeSetting = 'code-setting';
    /**
     * Scheme used for output panel resources
     */
    Schemas.outputChannel = 'output';
    /**
     * Scheme used for the accessible view
     */
    Schemas.accessibleView = 'accessible-view';
})(Schemas || (Schemas = {}));
export function matchesScheme(target, scheme) {
    if (URI.isUri(target)) {
        return equalsIgnoreCase(target.scheme, scheme);
    }
    else {
        return startsWithIgnoreCase(target, scheme + ':');
    }
}
export function matchesSomeScheme(target, ...schemes) {
    return schemes.some(scheme => matchesScheme(target, scheme));
}
export const connectionTokenCookieName = 'vscode-tkn';
export const connectionTokenQueryName = 'tkn';
class RemoteAuthoritiesImpl {
    constructor() {
        this._hosts = Object.create(null);
        this._ports = Object.create(null);
        this._connectionTokens = Object.create(null);
        this._preferredWebSchema = 'http';
        this._delegate = null;
        this._serverRootPath = '/';
    }
    setPreferredWebSchema(schema) {
        this._preferredWebSchema = schema;
    }
    setDelegate(delegate) {
        this._delegate = delegate;
    }
    setServerRootPath(product, serverBasePath) {
        this._serverRootPath = paths.posix.join(serverBasePath ?? '/', getServerProductSegment(product));
    }
    getServerRootPath() {
        return this._serverRootPath;
    }
    get _remoteResourcesPath() {
        return paths.posix.join(this._serverRootPath, Schemas.vscodeRemoteResource);
    }
    set(authority, host, port) {
        this._hosts[authority] = host;
        this._ports[authority] = port;
    }
    setConnectionToken(authority, connectionToken) {
        this._connectionTokens[authority] = connectionToken;
    }
    getPreferredWebSchema() {
        return this._preferredWebSchema;
    }
    rewrite(uri) {
        if (this._delegate) {
            try {
                return this._delegate(uri);
            }
            catch (err) {
                errors.onUnexpectedError(err);
                return uri;
            }
        }
        const authority = uri.authority;
        let host = this._hosts[authority];
        if (host && host.indexOf(':') !== -1 && host.indexOf('[') === -1) {
            host = `[${host}]`;
        }
        const port = this._ports[authority];
        const connectionToken = this._connectionTokens[authority];
        let query = `path=${encodeURIComponent(uri.path)}`;
        if (typeof connectionToken === 'string') {
            query += `&${connectionTokenQueryName}=${encodeURIComponent(connectionToken)}`;
        }
        return URI.from({
            scheme: platform.isWeb ? this._preferredWebSchema : Schemas.vscodeRemoteResource,
            authority: `${host}:${port}`,
            path: this._remoteResourcesPath,
            query
        });
    }
}
export const RemoteAuthorities = new RemoteAuthoritiesImpl();
export function getServerProductSegment(product) {
    return `${product.quality ?? 'oss'}-${product.commit ?? 'dev'}`;
}
export const builtinExtensionsPath = 'vs/../../extensions';
export const nodeModulesPath = 'vs/../../node_modules';
export const nodeModulesAsarPath = 'vs/../../node_modules.asar';
export const nodeModulesAsarUnpackedPath = 'vs/../../node_modules.asar.unpacked';
export const VSCODE_AUTHORITY = 'vscode-app';
class FileAccessImpl {
    static { this.FALLBACK_AUTHORITY = VSCODE_AUTHORITY; }
    /**
     * Returns a URI to use in contexts where the browser is responsible
     * for loading (e.g. fetch()) or when used within the DOM.
     *
     * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
     */
    asBrowserUri(resourcePath) {
        const uri = this.toUri(resourcePath);
        return this.uriToBrowserUri(uri);
    }
    /**
     * Returns a URI to use in contexts where the browser is responsible
     * for loading (e.g. fetch()) or when used within the DOM.
     *
     * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
     */
    uriToBrowserUri(uri) {
        // Handle remote URIs via `RemoteAuthorities`
        if (uri.scheme === Schemas.vscodeRemote) {
            return RemoteAuthorities.rewrite(uri);
        }
        // Convert to `vscode-file` resource..
        if (
        // ...only ever for `file` resources
        uri.scheme === Schemas.file &&
            (
            // ...and we run in native environments
            platform.isNative ||
                // ...or web worker extensions on desktop
                (platform.webWorkerOrigin === `${Schemas.vscodeFileResource}://${FileAccessImpl.FALLBACK_AUTHORITY}`))) {
            return uri.with({
                scheme: Schemas.vscodeFileResource,
                // We need to provide an authority here so that it can serve
                // as origin for network and loading matters in chromium.
                // If the URI is not coming with an authority already, we
                // add our own
                authority: uri.authority || FileAccessImpl.FALLBACK_AUTHORITY,
                query: null,
                fragment: null
            });
        }
        return uri;
    }
    /**
     * Returns the `file` URI to use in contexts where node.js
     * is responsible for loading.
     */
    asFileUri(resourcePath) {
        const uri = this.toUri(resourcePath);
        return this.uriToFileUri(uri);
    }
    /**
     * Returns the `file` URI to use in contexts where node.js
     * is responsible for loading.
     */
    uriToFileUri(uri) {
        // Only convert the URI if it is `vscode-file:` scheme
        if (uri.scheme === Schemas.vscodeFileResource) {
            return uri.with({
                scheme: Schemas.file,
                // Only preserve the `authority` if it is different from
                // our fallback authority. This ensures we properly preserve
                // Windows UNC paths that come with their own authority.
                authority: uri.authority !== FileAccessImpl.FALLBACK_AUTHORITY ? uri.authority : null,
                query: null,
                fragment: null
            });
        }
        return uri;
    }
    toUri(uriOrModule) {
        if (URI.isUri(uriOrModule)) {
            return uriOrModule;
        }
        if (globalThis._VSCODE_FILE_ROOT) {
            const rootUriOrPath = globalThis._VSCODE_FILE_ROOT;
            // File URL (with scheme)
            if (/^\w[\w\d+.-]*:\/\//.test(rootUriOrPath)) {
                return URI.joinPath(URI.parse(rootUriOrPath, true), uriOrModule);
            }
            // File Path (no scheme)
            const modulePath = paths.join(rootUriOrPath, uriOrModule);
            return URI.file(modulePath);
        }
        throw new Error('Cannot determine URI for module id!');
    }
}
export const FileAccess = new FileAccessImpl();
export const CacheControlheaders = Object.freeze({
    'Cache-Control': 'no-cache, no-store'
});
export const DocumentPolicyheaders = Object.freeze({
    'Document-Policy': 'include-js-call-stacks-in-crash-reports'
});
export var COI;
(function (COI) {
    const coiHeaders = new Map([
        ['1', { 'Cross-Origin-Opener-Policy': 'same-origin' }],
        ['2', { 'Cross-Origin-Embedder-Policy': 'require-corp' }],
        ['3', { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' }],
    ]);
    COI.CoopAndCoep = Object.freeze(coiHeaders.get('3'));
    const coiSearchParamName = 'vscode-coi';
    /**
     * Extract desired headers from `vscode-coi` invocation
     */
    function getHeadersFromQuery(url) {
        let params;
        if (typeof url === 'string') {
            params = new URL(url).searchParams;
        }
        else if (url instanceof URL) {
            params = url.searchParams;
        }
        else if (URI.isUri(url)) {
            params = new URL(url.toString(true)).searchParams;
        }
        const value = params?.get(coiSearchParamName);
        if (!value) {
            return undefined;
        }
        return coiHeaders.get(value);
    }
    COI.getHeadersFromQuery = getHeadersFromQuery;
    /**
     * Add the `vscode-coi` query attribute based on wanting `COOP` and `COEP`. Will be a noop when `crossOriginIsolated`
     * isn't enabled the current context
     */
    function addSearchParam(urlOrSearch, coop, coep) {
        if (!globalThis.crossOriginIsolated) {
            // depends on the current context being COI
            return;
        }
        const value = coop && coep ? '3' : coep ? '2' : '1';
        if (urlOrSearch instanceof URLSearchParams) {
            urlOrSearch.set(coiSearchParamName, value);
        }
        else {
            urlOrSearch[coiSearchParamName] = value;
        }
    }
    COI.addSearchParam = addSearchParam;
})(COI || (COI = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbmV0d29yay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGFBQWEsQ0FBQztBQUN0QyxPQUFPLEtBQUssUUFBUSxNQUFNLGVBQWUsQ0FBQztBQUMxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDdEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUMvQixPQUFPLEtBQUssS0FBSyxNQUFNLFdBQVcsQ0FBQztBQUVuQyxNQUFNLEtBQVcsT0FBTyxDQWtJdkI7QUFsSUQsV0FBaUIsT0FBTztJQUV2Qjs7O09BR0c7SUFDVSxnQkFBUSxHQUFHLFVBQVUsQ0FBQztJQUVuQzs7T0FFRztJQUNVLGNBQU0sR0FBRyxRQUFRLENBQUM7SUFFL0I7O09BRUc7SUFDVSxnQkFBUSxHQUFHLFNBQVMsQ0FBQztJQUVsQzs7T0FFRztJQUNVLG1CQUFXLEdBQUcsYUFBYSxDQUFDO0lBRXpDOztPQUVHO0lBQ1UsMEJBQWtCLEdBQUcsb0JBQW9CLENBQUM7SUFFMUMsWUFBSSxHQUFHLE1BQU0sQ0FBQztJQUVkLGFBQUssR0FBRyxPQUFPLENBQUM7SUFFaEIsWUFBSSxHQUFHLE1BQU0sQ0FBQztJQUVkLGNBQU0sR0FBRyxRQUFRLENBQUM7SUFFbEIsZ0JBQVEsR0FBRyxVQUFVLENBQUM7SUFFdEIsWUFBSSxHQUFHLE1BQU0sQ0FBQztJQUVkLGVBQU8sR0FBRyxTQUFTLENBQUM7SUFFcEIsb0JBQVksR0FBRyxlQUFlLENBQUM7SUFFL0IsNEJBQW9CLEdBQUcsd0JBQXdCLENBQUM7SUFFaEQsbUNBQTJCLEdBQUcsZ0NBQWdDLENB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