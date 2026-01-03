"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeData = void 0;
const DEFAULT_CLIENT_ID = 'aebc6443-996d-45c2-90f0-388ff96faa56';
const DEFAULT_TENANT = 'organizations';
const OIDC_SCOPES = ['openid', 'email', 'profile', 'offline_access'];
const GRAPH_TACK_ON_SCOPE = 'User.Read';
class ScopeData {
    constructor(originalScopes = []) {
        this.originalScopes = originalScopes;
        const modifiedScopes = [...originalScopes];
        modifiedScopes.sort();
        this.allScopes = modifiedScopes;
        this.scopeStr = modifiedScopes.join(' ');
        this.scopesToSend = this.getScopesToSend(modifiedScopes);
        this.clientId = this.getClientId(this.allScopes);
        this.tenant = this.getTenant(this.allScopes);
        this.tenantId = this.getTenantId(this.tenant);
    }
    getClientId(scopes) {
        return scopes.reduce((prev, current) => {
            if (current.startsWith('VSCODE_CLIENT_ID:')) {
                return current.split('VSCODE_CLIENT_ID:')[1];
            }
            return prev;
        }, undefined) ?? DEFAULT_CLIENT_ID;
    }
    getTenant(scopes) {
        return scopes.reduce((prev, current) => {
            if (current.startsWith('VSCODE_TENANT:')) {
                return current.split('VSCODE_TENANT:')[1];
            }
            return prev;
        }, undefined) ?? DEFAULT_TENANT;
    }
    getTenantId(tenant) {
        switch (tenant) {
            case 'organizations':
            case 'common':
            case 'consumers':
                // These are not valid tenant IDs, so we return undefined
                return undefined;
            default:
                return this.tenant;
        }
    }
    getScopesToSend(scopes) {
        const scopesToSend = scopes.filter(s => !s.startsWith('VSCODE_'));
        const set = new Set(scopesToSend);
        for (const scope of OIDC_SCOPES) {
            set.delete(scope);
        }
        // If we only had OIDC scopes, we need to add a tack-on scope to make the request valid
        // by forcing Identity into treating this as a Graph token request.
        if (!set.size) {
            scopesToSend.push(GRAPH_TACK_ON_SCOPE);
        }
        return scopesToSend;
    }
}
exports.ScopeData = ScopeData;
//# sourceMappingURL=scopeData.js.map