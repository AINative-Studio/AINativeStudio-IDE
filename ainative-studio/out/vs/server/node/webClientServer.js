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
import { createReadStream, promises } from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as cookie from 'cookie';
import * as crypto from 'crypto';
import { isEqualOrParent } from '../../base/common/extpath.js';
import { getMediaMime } from '../../base/common/mime.js';
import { isLinux } from '../../base/common/platform.js';
import { ILogService, LogLevel } from '../../platform/log/common/log.js';
import { IServerEnvironmentService } from './serverEnvironmentService.js';
import { extname, dirname, join, normalize, posix } from '../../base/common/path.js';
import { FileAccess, connectionTokenCookieName, connectionTokenQueryName, Schemas, builtinExtensionsPath } from '../../base/common/network.js';
import { generateUuid } from '../../base/common/uuid.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { asTextOrError, IRequestService } from '../../platform/request/common/request.js';
import { CancellationToken } from '../../base/common/cancellation.js';
import { URI } from '../../base/common/uri.js';
import { streamToBuffer } from '../../base/common/buffer.js';
import { isString } from '../../base/common/types.js';
import { ICSSDevelopmentService } from '../../platform/cssDev/node/cssDevService.js';
const textMimeType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
};
/**
 * Return an error to the client.
 */
export async function serveError(req, res, errorCode, errorMessage) {
    res.writeHead(errorCode, { 'Content-Type': 'text/plain' });
    res.end(errorMessage);
}
export var CacheControl;
(function (CacheControl) {
    CacheControl[CacheControl["NO_CACHING"] = 0] = "NO_CACHING";
    CacheControl[CacheControl["ETAG"] = 1] = "ETAG";
    CacheControl[CacheControl["NO_EXPIRY"] = 2] = "NO_EXPIRY";
})(CacheControl || (CacheControl = {}));
/**
 * Serve a file at a given path or 404 if the file is missing.
 */
export async function serveFile(filePath, cacheControl, logService, req, res, responseHeaders) {
    try {
        const stat = await promises.stat(filePath); // throws an error if file doesn't exist
        if (cacheControl === 1 /* CacheControl.ETAG */) {
            // Check if file modified since
            const etag = `W/"${[stat.ino, stat.size, stat.mtime.getTime()].join('-')}"`; // weak validator (https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                return void res.end();
            }
            responseHeaders['Etag'] = etag;
        }
        else if (cacheControl === 2 /* CacheControl.NO_EXPIRY */) {
            responseHeaders['Cache-Control'] = 'public, max-age=31536000';
        }
        else if (cacheControl === 0 /* CacheControl.NO_CACHING */) {
            responseHeaders['Cache-Control'] = 'no-store';
        }
        responseHeaders['Content-Type'] = textMimeType[extname(filePath)] || getMediaMime(filePath) || 'text/plain';
        res.writeHead(200, responseHeaders);
        // Data
        createReadStream(filePath).pipe(res);
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            logService.error(error);
            console.error(error.toString());
        }
        else {
            console.error(`File not found: ${filePath}`);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return void res.end('Not found');
    }
}
const APP_ROOT = dirname(FileAccess.asFileUri('').fsPath);
const STATIC_PATH = `/static`;
const CALLBACK_PATH = `/callback`;
const WEB_EXTENSION_PATH = `/web-extension-resource`;
let WebClientServer = class WebClientServer {
    constructor(_connectionToken, _basePath, _productPath, _environmentService, _logService, _requestService, _productService, _cssDevService) {
        this._connectionToken = _connectionToken;
        this._basePath = _basePath;
        this._productPath = _productPath;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._requestService = _requestService;
        this._productService = _productService;
        this._cssDevService = _cssDevService;
        this._webExtensionResourceUrlTemplate = this._productService.extensionsGallery?.resourceUrlTemplate ? URI.parse(this._productService.extensionsGallery.resourceUrlTemplate) : undefined;
    }
    /**
     * Handle web resources (i.e. only needed by the web client).
     * **NOTE**: This method is only invoked when the server has web bits.
     * **NOTE**: This method is only invoked after the connection token has been validated.
     * @param parsedUrl The URL to handle, including base and product path
     * @param pathname The pathname of the URL, without base and product path
     */
    async handle(req, res, parsedUrl, pathname) {
        try {
            if (pathname.startsWith(STATIC_PATH) && pathname.charCodeAt(STATIC_PATH.length) === 47 /* CharCode.Slash */) {
                return this._handleStatic(req, res, pathname.substring(STATIC_PATH.length));
            }
            if (pathname === '/') {
                return this._handleRoot(req, res, parsedUrl);
            }
            if (pathname === CALLBACK_PATH) {
                // callback support
                return this._handleCallback(res);
            }
            if (pathname.startsWith(WEB_EXTENSION_PATH) && pathname.charCodeAt(WEB_EXTENSION_PATH.length) === 47 /* CharCode.Slash */) {
                // extension resource support
                return this._handleWebExtensionResource(req, res, pathname.substring(WEB_EXTENSION_PATH.length));
            }
            return serveError(req, res, 404, 'Not found.');
        }
        catch (error) {
            this._logService.error(error);
            console.error(error.toString());
            return serveError(req, res, 500, 'Internal Server Error.');
        }
    }
    /**
     * Handle HTTP requests for /static/*
     * @param resourcePath The path after /static/
     */
    async _handleStatic(req, res, resourcePath) {
        const headers = Object.create(null);
        // Strip the this._staticRoute from the path
        const normalizedPathname = decodeURIComponent(resourcePath); // support paths that are uri-encoded (e.g. spaces => %20)
        const filePath = join(APP_ROOT, normalizedPathname); // join also normalizes the path
        if (!isEqualOrParent(filePath, APP_ROOT, !isLinux)) {
            return serveError(req, res, 400, `Bad request.`);
        }
        return serveFile(filePath, this._environmentService.isBuilt ? 2 /* CacheControl.NO_EXPIRY */ : 1 /* CacheControl.ETAG */, this._logService, req, res, headers);
    }
    _getResourceURLTemplateAuthority(uri) {
        const index = uri.authority.indexOf('.');
        return index !== -1 ? uri.authority.substring(index + 1) : undefined;
    }
    /**
     * Handle extension resources
     * @param resourcePath The path after /web-extension-resource/
     */
    async _handleWebExtensionResource(req, res, resourcePath) {
        if (!this._webExtensionResourceUrlTemplate) {
            return serveError(req, res, 500, 'No extension gallery service configured.');
        }
        const normalizedPathname = decodeURIComponent(resourcePath); // support paths that are uri-encoded (e.g. spaces => %20)
        const path = normalize(normalizedPathname);
        const uri = URI.parse(path).with({
            scheme: this._webExtensionResourceUrlTemplate.scheme,
            authority: path.substring(0, path.indexOf('/')),
            path: path.substring(path.indexOf('/') + 1)
        });
        if (this._getResourceURLTemplateAuthority(this._webExtensionResourceUrlTemplate) !== this._getResourceURLTemplateAuthority(uri)) {
            return serveError(req, res, 403, 'Request Forbidden');
        }
        const headers = {};
        const setRequestHeader = (header) => {
            const value = req.headers[header];
            if (value && (isString(value) || value[0])) {
                headers[header] = isString(value) ? value : value[0];
            }
            else if (header !== header.toLowerCase()) {
                setRequestHeader(header.toLowerCase());
            }
        };
        setRequestHeader('X-Client-Name');
        setRequestHeader('X-Client-Version');
        setRequestHeader('X-Machine-Id');
        setRequestHeader('X-Client-Commit');
        const context = await this._requestService.request({
            type: 'GET',
            url: uri.toString(true),
            headers
        }, CancellationToken.None);
        const status = context.res.statusCode || 500;
        if (status !== 200) {
            let text = null;
            try {
                text = await asTextOrError(context);
            }
            catch (error) { /* Ignore */ }
            return serveError(req, res, status, text || `Request failed with status ${status}`);
        }
        const responseHeaders = Object.create(null);
        const setResponseHeader = (header) => {
            const value = context.res.headers[header];
            if (value) {
                responseHeaders[header] = value;
            }
            else if (header !== header.toLowerCase()) {
                setResponseHeader(header.toLowerCase());
            }
        };
        setResponseHeader('Cache-Control');
        setResponseHeader('Content-Type');
        res.writeHead(200, responseHeaders);
        const buffer = await streamToBuffer(context.stream);
        return void res.end(buffer.buffer);
    }
    /**
     * Handle HTTP requests for /
     */
    async _handleRoot(req, res, parsedUrl) {
        const getFirstHeader = (headerName) => {
            const val = req.headers[headerName];
            return Array.isArray(val) ? val[0] : val;
        };
        // Prefix routes with basePath for clients
        const basePath = getFirstHeader('x-forwarded-prefix') || this._basePath;
        const queryConnectionToken = parsedUrl.query[connectionTokenQueryName];
        if (typeof queryConnectionToken === 'string') {
            // We got a connection token as a query parameter.
            // We want to have a clean URL, so we strip it
            const responseHeaders = Object.create(null);
            responseHeaders['Set-Cookie'] = cookie.serialize(connectionTokenCookieName, queryConnectionToken, {
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 /* 1 week */
            });
            const newQuery = Object.create(null);
            for (const key in parsedUrl.query) {
                if (key !== connectionTokenQueryName) {
                    newQuery[key] = parsedUrl.query[key];
                }
            }
            const newLocation = url.format({ pathname: basePath, query: newQuery });
            responseHeaders['Location'] = newLocation;
            res.writeHead(302, responseHeaders);
            return void res.end();
        }
        const replacePort = (host, port) => {
            const index = host?.indexOf(':');
            if (index !== -1) {
                host = host?.substring(0, index);
            }
            host += `:${port}`;
            return host;
        };
        const useTestResolver = (!this._environmentService.isBuilt && this._environmentService.args['use-test-resolver']);
        let remoteAuthority = (useTestResolver
            ? 'test+test'
            : (getFirstHeader('x-original-host') || getFirstHeader('x-forwarded-host') || req.headers.host));
        if (!remoteAuthority) {
            return serveError(req, res, 400, `Bad request.`);
        }
        const forwardedPort = getFirstHeader('x-forwarded-port');
        if (forwardedPort) {
            remoteAuthority = replacePort(remoteAuthority, forwardedPort);
        }
        function asJSON(value) {
            return JSON.stringify(value).replace(/"/g, '&quot;');
        }
        let _wrapWebWorkerExtHostInIframe = undefined;
        if (this._environmentService.args['enable-smoke-test-driver']) {
            // integration tests run at a time when the built output is not yet published to the CDN
            // so we must disable the iframe wrapping because the iframe URL will give a 404
            _wrapWebWorkerExtHostInIframe = false;
        }
        if (this._logService.getLevel() === LogLevel.Trace) {
            ['x-original-host', 'x-forwarded-host', 'x-forwarded-port', 'host'].forEach(header => {
                const value = getFirstHeader(header);
                if (value) {
                    this._logService.trace(`[WebClientServer] ${header}: ${value}`);
                }
            });
            this._logService.trace(`[WebClientServer] Request URL: ${req.url}, basePath: ${basePath}, remoteAuthority: ${remoteAuthority}`);
        }
        const staticRoute = posix.join(basePath, this._productPath, STATIC_PATH);
        const callbackRoute = posix.join(basePath, this._productPath, CALLBACK_PATH);
        const webExtensionRoute = posix.join(basePath, this._productPath, WEB_EXTENSION_PATH);
        const resolveWorkspaceURI = (defaultLocation) => defaultLocation && URI.file(path.resolve(defaultLocation)).with({ scheme: Schemas.vscodeRemote, authority: remoteAuthority });
        const filePath = FileAccess.asFileUri(`vs/code/browser/workbench/workbench${this._environmentService.isBuilt ? '' : '-dev'}.html`).fsPath;
        const authSessionInfo = !this._environmentService.isBuilt && this._environmentService.args['github-auth'] ? {
            id: generateUuid(),
            providerId: 'github',
            accessToken: this._environmentService.args['github-auth'],
            scopes: [['user:email'], ['repo']]
        } : undefined;
        const productConfiguration = {
            embedderIdentifier: 'server-distro',
            extensionsGallery: this._webExtensionResourceUrlTemplate && this._productService.extensionsGallery ? {
                ...this._productService.extensionsGallery,
                resourceUrlTemplate: this._webExtensionResourceUrlTemplate.with({
                    scheme: 'http',
                    authority: remoteAuthority,
                    path: `${webExtensionRoute}/${this._webExtensionResourceUrlTemplate.authority}${this._webExtensionResourceUrlTemplate.path}`
                }).toString(true)
            } : undefined
        };
        if (!this._environmentService.isBuilt) {
            try {
                const productOverrides = JSON.parse((await promises.readFile(join(APP_ROOT, 'product.overrides.json'))).toString());
                Object.assign(productConfiguration, productOverrides);
            }
            catch (err) { /* Ignore Error */ }
        }
        const workbenchWebConfiguration = {
            remoteAuthority,
            serverBasePath: basePath,
            _wrapWebWorkerExtHostInIframe,
            developmentOptions: { enableSmokeTestDriver: this._environmentService.args['enable-smoke-test-driver'] ? true : undefined, logLevel: this._logService.getLevel() },
            settingsSyncOptions: !this._environmentService.isBuilt && this._environmentService.args['enable-sync'] ? { enabled: true } : undefined,
            enableWorkspaceTrust: !this._environmentService.args['disable-workspace-trust'],
            folderUri: resolveWorkspaceURI(this._environmentService.args['default-folder']),
            workspaceUri: resolveWorkspaceURI(this._environmentService.args['default-workspace']),
            productConfiguration,
            callbackRoute: callbackRoute
        };
        const cookies = cookie.parse(req.headers.cookie || '');
        const locale = cookies['vscode.nls.locale'] || req.headers['accept-language']?.split(',')[0]?.toLowerCase() || 'en';
        let WORKBENCH_NLS_BASE_URL;
        let WORKBENCH_NLS_URL;
        if (!locale.startsWith('en') && this._productService.nlsCoreBaseUrl) {
            WORKBENCH_NLS_BASE_URL = this._productService.nlsCoreBaseUrl;
            WORKBENCH_NLS_URL = `${WORKBENCH_NLS_BASE_URL}${this._productService.commit}/${this._productService.version}/${locale}/nls.messages.js`;
        }
        else {
            WORKBENCH_NLS_URL = ''; // fallback will apply
        }
        const values = {
            WORKBENCH_WEB_CONFIGURATION: asJSON(workbenchWebConfiguration),
            WORKBENCH_AUTH_SESSION: authSessionInfo ? asJSON(authSessionInfo) : '',
            WORKBENCH_WEB_BASE_URL: staticRoute,
            WORKBENCH_NLS_URL,
            WORKBENCH_NLS_FALLBACK_URL: `${staticRoute}/out/nls.messages.js`
        };
        // DEV ---------------------------------------------------------------------------------------
        // DEV: This is for development and enables loading CSS via import-statements via import-maps.
        // DEV: The server needs to send along all CSS modules so that the client can construct the
        // DEV: import-map.
        // DEV ---------------------------------------------------------------------------------------
        if (this._cssDevService.isEnabled) {
            const cssModules = await this._cssDevService.getCssModules();
            values['WORKBENCH_DEV_CSS_MODULES'] = JSON.stringify(cssModules);
        }
        if (useTestResolver) {
            const bundledExtensions = [];
            for (const extensionPath of ['vscode-test-resolver', 'github-authentication']) {
                const packageJSON = JSON.parse((await promises.readFile(FileAccess.asFileUri(`${builtinExtensionsPath}/${extensionPath}/package.json`).fsPath)).toString());
                bundledExtensions.push({ extensionPath, packageJSON });
            }
            values['WORKBENCH_BUILTIN_EXTENSIONS'] = asJSON(bundledExtensions);
        }
        let data;
        try {
            const workbenchTemplate = (await promises.readFile(filePath)).toString();
            data = workbenchTemplate.replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key] ?? 'undefined');
        }
        catch (e) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return void res.end('Not found');
        }
        const webWorkerExtensionHostIframeScriptSHA = 'sha256-2Q+j4hfT09+1+imS46J2YlkCtHWQt0/BE79PXjJ0ZJ8=';
        const cspDirectives = [
            'default-src \'self\';',
            'img-src \'self\' https: data: blob:;',
            'media-src \'self\';',
            `script-src 'self' 'unsafe-eval' ${WORKBENCH_NLS_BASE_URL ?? ''} blob: 'nonce-1nline-m4p' ${this._getScriptCspHashes(data).join(' ')} '${webWorkerExtensionHostIframeScriptSHA}' 'sha256-/r7rqQ+yrxt57sxLuQ6AMYcy/lUpvAIzHjIJt/OeLWU=' ${useTestResolver ? '' : `http://${remoteAuthority}`};`, // the sha is the same as in src/vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html
            'child-src \'self\';',
            `frame-src 'self' https://*.vscode-cdn.net data:;`,
            'worker-src \'self\' data: blob:;',
            'style-src \'self\' \'unsafe-inline\';',
            'connect-src \'self\' ws: wss: https:;',
            'font-src \'self\' blob:;',
            'manifest-src \'self\';'
        ].join(' ');
        const headers = {
            'Content-Type': 'text/html',
            'Content-Security-Policy': cspDirectives
        };
        if (this._connectionToken.type !== 0 /* ServerConnectionTokenType.None */) {
            // At this point we know the client has a valid cookie
            // and we want to set it prolong it to ensure that this
            // client is valid for another 1 week at least
            headers['Set-Cookie'] = cookie.serialize(connectionTokenCookieName, this._connectionToken.value, {
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 /* 1 week */
            });
        }
        res.writeHead(200, headers);
        return void res.end(data);
    }
    _getScriptCspHashes(content) {
        // Compute the CSP hashes for line scripts. Uses regex
        // which means it isn't 100% good.
        const regex = /<script>([\s\S]+?)<\/script>/img;
        const result = [];
        let match;
        while (match = regex.exec(content)) {
            const hasher = crypto.createHash('sha256');
            // This only works on Windows if we strip `\r` from `\r\n`.
            const script = match[1].replace(/\r\n/g, '\n');
            const hash = hasher
                .update(Buffer.from(script))
                .digest().toString('base64');
            result.push(`'sha256-${hash}'`);
        }
        return result;
    }
    /**
     * Handle HTTP requests for /callback
     */
    async _handleCallback(res) {
        const filePath = FileAccess.asFileUri('vs/code/browser/workbench/callback.html').fsPath;
        const data = (await promises.readFile(filePath)).toString();
        const cspDirectives = [
            'default-src \'self\';',
            'img-src \'self\' https: data: blob:;',
            'media-src \'none\';',
            `script-src 'self' ${this._getScriptCspHashes(data).join(' ')};`,
            'style-src \'self\' \'unsafe-inline\';',
            'font-src \'self\' blob:;'
        ].join(' ');
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Security-Policy': cspDirectives
        });
        return void res.end(data);
    }
};
WebClientServer = __decorate([
    __param(3, IServerEnvironmentService),
    __param(4, ILogService),
    __param(5, IRequestService),
    __param(6, IProductService),
    __param(7, ICSSDevelopmentService)
], WebClientServer);
export { WebClientServer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ2xpZW50U2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3dlYkNsaWVudFNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ2hELE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBRTdCLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDO0FBQzNCLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRixPQUFPLEVBQUUsVUFBVSxFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9JLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFF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