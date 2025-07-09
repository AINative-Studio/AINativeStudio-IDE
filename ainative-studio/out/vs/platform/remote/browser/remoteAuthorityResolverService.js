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
import { mainWindow } from '../../../base/browser/window.js';
import { DeferredPromise } from '../../../base/common/async.js';
import * as errors from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { RemoteAuthorities } from '../../../base/common/network.js';
import * as performance from '../../../base/common/performance.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { WebSocketRemoteConnection, getRemoteAuthorityPrefix } from '../common/remoteAuthorityResolver.js';
import { parseAuthorityWithOptionalPort } from '../common/remoteHosts.js';
let RemoteAuthorityResolverService = class RemoteAuthorityResolverService extends Disposable {
    constructor(isWorkbenchOptionsBasedResolution, connectionToken, resourceUriProvider, serverBasePath, productService, _logService) {
        super();
        this._logService = _logService;
        this._onDidChangeConnectionData = this._register(new Emitter());
        this.onDidChangeConnectionData = this._onDidChangeConnectionData.event;
        this._resolveAuthorityRequests = new Map();
        this._cache = new Map();
        this._connectionToken = connectionToken;
        this._connectionTokens = new Map();
        this._isWorkbenchOptionsBasedResolution = isWorkbenchOptionsBasedResolution;
        if (resourceUriProvider) {
            RemoteAuthorities.setDelegate(resourceUriProvider);
        }
        RemoteAuthorities.setServerRootPath(productService, serverBasePath);
    }
    async resolveAuthority(authority) {
        let result = this._resolveAuthorityRequests.get(authority);
        if (!result) {
            result = new DeferredPromise();
            this._resolveAuthorityRequests.set(authority, result);
            if (this._isWorkbenchOptionsBasedResolution) {
                this._doResolveAuthority(authority).then(v => result.complete(v), (err) => result.error(err));
            }
        }
        return result.p;
    }
    async getCanonicalURI(uri) {
        // todo@connor4312 make this work for web
        return uri;
    }
    getConnectionData(authority) {
        if (!this._cache.has(authority)) {
            return null;
        }
        const resolverResult = this._cache.get(authority);
        const connectionToken = this._connectionTokens.get(authority) || resolverResult.authority.connectionToken;
        return {
            connectTo: resolverResult.authority.connectTo,
            connectionToken: connectionToken
        };
    }
    async _doResolveAuthority(authority) {
        const authorityPrefix = getRemoteAuthorityPrefix(authority);
        const sw = StopWatch.create(false);
        this._logService.info(`Resolving connection token (${authorityPrefix})...`);
        performance.mark(`code/willResolveConnectionToken/${authorityPrefix}`);
        const connectionToken = await Promise.resolve(this._connectionTokens.get(authority) || this._connectionToken);
        performance.mark(`code/didResolveConnectionToken/${authorityPrefix}`);
        this._logService.info(`Resolved connection token (${authorityPrefix}) after ${sw.elapsed()} ms`);
        const defaultPort = (/^https:/.test(mainWindow.location.href) ? 443 : 80);
        const { host, port } = parseAuthorityWithOptionalPort(authority, defaultPort);
        const result = { authority: { authority, connectTo: new WebSocketRemoteConnection(host, port), connectionToken } };
        RemoteAuthorities.set(authority, host, port);
        this._cache.set(authority, result);
        this._onDidChangeConnectionData.fire();
        return result;
    }
    _clearResolvedAuthority(authority) {
        if (this._resolveAuthorityRequests.has(authority)) {
            this._resolveAuthorityRequests.get(authority).cancel();
            this._resolveAuthorityRequests.delete(authority);
        }
    }
    _setResolvedAuthority(resolvedAuthority, options) {
        if (this._resolveAuthorityRequests.has(resolvedAuthority.authority)) {
            const request = this._resolveAuthorityRequests.get(resolvedAuthority.authority);
            // For non-websocket types, it's expected the embedder passes a `remoteResourceProvider`
            // which is wrapped to a `IResourceUriProvider` and is not handled here.
            if (resolvedAuthority.connectTo.type === 0 /* RemoteConnectionType.WebSocket */) {
                RemoteAuthorities.set(resolvedAuthority.authority, resolvedAuthority.connectTo.host, resolvedAuthority.connectTo.port);
            }
            if (resolvedAuthority.connectionToken) {
                RemoteAuthorities.setConnectionToken(resolvedAuthority.authority, resolvedAuthority.connectionToken);
            }
            request.complete({ authority: resolvedAuthority, options });
            this._onDidChangeConnectionData.fire();
        }
    }
    _setResolvedAuthorityError(authority, err) {
        if (this._resolveAuthorityRequests.has(authority)) {
            const request = this._resolveAuthorityRequests.get(authority);
            // Avoid that this error makes it to telemetry
            request.error(errors.ErrorNoTelemetry.fromError(err));
        }
    }
    _setAuthorityConnectionToken(authority, connectionToken) {
        this._connectionTokens.set(authority, connectionToken);
        RemoteAuthorities.setConnectionToken(authority, connectionToken);
        this._onDidChangeConnectionData.fire();
    }
    _setCanonicalURIProvider(provider) {
    }
};
RemoteAuthorityResolverService = __decorate([
    __param(4, IProductService),
    __param(5, ILogService)
], RemoteAuthorityResolverService);
export { RemoteAuthorityResolverService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS9icm93c2VyL3JlbW90ZUF1dGhvcml0eVJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRSxPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBb0kseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3TyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVuRSxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7SUFhN0QsWUFDQyxpQ0FBMEMsRUFDMUMsZUFBcUQsRUFDckQsbUJBQW9ELEVBQ3BELGNBQWtDLEVBQ2pCLGNBQStCLEVBQ25D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