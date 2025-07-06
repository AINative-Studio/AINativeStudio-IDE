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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL25ldHdvcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxhQUFhLENBQUM7QUFDdEMsT0FBTyxLQUFLLFFBQVEsTUFBTSxlQUFlLENBQUM7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDL0IsT0FBTyxLQUFLLEtBQUssTUFBTSxXQUFXLENBQUM7QUFFbkMsTUFBTSxLQUFXLE9BQU8sQ0FrSXZCO0FBbElELFdBQWlCLE9BQU87SUFFdkI7OztPQUdHO0lBQ1UsZ0JBQVEsR0FBRyxVQUFVLENBQUM7SUFFbkM7O09BRUc7SUFDVSxjQUFNLEdBQUcsUUFBUSxDQUFDO0lBRS9COztPQUVHO0lBQ1UsZ0JBQVEsR0FBRyxTQUFTLENBQUM7SUFFbEM7O09BRUc7SUFDVSxtQkFBVyxHQUFHLGFBQWEsQ0FBQztJQUV6Qzs7T0FFRztJQUNVLDBCQUFrQixHQUFHLG9CQUFvQixDQUFDO0lBRTFDLFlBQUksR0FBRyxNQUFNLENBQUM7SUFFZCxhQUFLLEdBQUcsT0FBTyxDQUFDO0lBRWhCLFlBQUksR0FBRyxNQUFNLENBQUM7SUFFZCxjQUFNLEdBQUcsUUFBUSxDQUFDO0lBRWxCLGdCQUFRLEdBQUcsVUFBVSxDQUFDO0lBRXRCLFlBQUksR0FBRyxNQUFNLENBQUM7SUFFZCxlQUFPLEdBQUcsU0FBUyxDQUFDO0lBRXBCLG9CQUFZLEdBQUcsZUFBZSxDQUFDO0lBRS9CLDRCQUFvQixHQUFHLHdCQUF3QixDQUFDO0lBRWhELG1DQUEyQixHQUFHLGdDQUFnQyxDQUFDO0lB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