var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//
import { DeferredPromise } from '../../../base/common/async.js';
import * as errors from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { RemoteAuthorities } from '../../../base/common/network.js';
import { IProductService } from '../../product/common/productService.js';
let RemoteAuthorityResolverService = class RemoteAuthorityResolverService extends Disposable {
    constructor(productService, remoteResourceLoader) {
        super();
        this.remoteResourceLoader = remoteResourceLoader;
        this._onDidChangeConnectionData = this._register(new Emitter());
        this.onDidChangeConnectionData = this._onDidChangeConnectionData.event;
        this._resolveAuthorityRequests = new Map();
        this._connectionTokens = new Map();
        this._canonicalURIRequests = new Map();
        this._canonicalURIProvider = null;
        RemoteAuthorities.setServerRootPath(productService, undefined); // on the desktop we don't support custom server base paths
    }
    resolveAuthority(authority) {
        if (!this._resolveAuthorityRequests.has(authority)) {
            this._resolveAuthorityRequests.set(authority, new DeferredPromise());
        }
        return this._resolveAuthorityRequests.get(authority).p;
    }
    async getCanonicalURI(uri) {
        const key = uri.toString();
        const existing = this._canonicalURIRequests.get(key);
        if (existing) {
            return existing.result.p;
        }
        const result = new DeferredPromise();
        this._canonicalURIProvider?.(uri).then((uri) => result.complete(uri), (err) => result.error(err));
        this._canonicalURIRequests.set(key, { input: uri, result });
        return result.p;
    }
    getConnectionData(authority) {
        if (!this._resolveAuthorityRequests.has(authority)) {
            return null;
        }
        const request = this._resolveAuthorityRequests.get(authority);
        if (!request.isResolved) {
            return null;
        }
        const connectionToken = this._connectionTokens.get(authority);
        return {
            connectTo: request.value.authority.connectTo,
            connectionToken: connectionToken
        };
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
            if (resolvedAuthority.connectTo.type === 0 /* RemoteConnectionType.WebSocket */) {
                RemoteAuthorities.set(resolvedAuthority.authority, resolvedAuthority.connectTo.host, resolvedAuthority.connectTo.port);
            }
            else {
                RemoteAuthorities.setDelegate(this.remoteResourceLoader.getResourceUriProvider());
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
        this._canonicalURIProvider = provider;
        this._canonicalURIRequests.forEach(({ result, input }) => {
            this._canonicalURIProvider(input).then((uri) => result.complete(uri), (err) => result.error(err));
        });
    }
};
RemoteAuthorityResolverService = __decorate([
    __param(0, IProductService)
], RemoteAuthorityResolverService);
export { RemoteAuthorityResolverService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS9lbGVjdHJvbi1zYW5kYm94L3JlbW90ZUF1dGhvcml0eVJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxFQUFFO0FBQ0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFJbEUsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO0lBWTdELFlBQTZCLGNBQStCLEVBQW1CLG9CQUFrRDtRQUNoSSxLQUFLLEVBQUUsQ0FBQztRQURzRSx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQThCO1FBUmhILCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ2xFLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7UUFTakYsSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksR0FBRyxFQUEyQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUNuRCxJQUFJLENBQUMscUJBQXFCLEdBQUcs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