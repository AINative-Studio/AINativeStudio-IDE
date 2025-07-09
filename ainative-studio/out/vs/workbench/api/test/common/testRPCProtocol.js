/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isThenable } from '../../../../base/common/async.js';
import { SerializableObjectWithBuffers } from '../../../services/extensions/common/proxyIdentifier.js';
import { parseJsonAndRestoreBufferRefs, stringifyJsonWithBufferRefs } from '../../../services/extensions/common/rpcProtocol.js';
export function SingleProxyRPCProtocol(thing) {
    return {
        _serviceBrand: undefined,
        remoteAuthority: null,
        getProxy() {
            return thing;
        },
        set(identifier, value) {
            return value;
        },
        dispose: undefined,
        assertRegistered: undefined,
        drain: undefined,
        extensionHostKind: 1 /* ExtensionHostKind.LocalProcess */
    };
}
/** Makes a fake {@link SingleProxyRPCProtocol} on which any method can be called */
export function AnyCallRPCProtocol(useCalls) {
    return SingleProxyRPCProtocol(new Proxy({}, {
        get(_target, prop) {
            if (useCalls && prop in useCalls) {
                return useCalls[prop];
            }
            return () => Promise.resolve(undefined);
        }
    }));
}
export class TestRPCProtocol {
    constructor() {
        this.remoteAuthority = null;
        this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
        this._callCountValue = 0;
        this._locals = Object.create(null);
        this._proxies = Object.create(null);
    }
    drain() {
        return Promise.resolve();
    }
    get _callCount() {
        return this._callCountValue;
    }
    set _callCount(value) {
        this._callCountValue = value;
        if (this._callCountValue === 0) {
            this._completeIdle?.();
            this._idle = undefined;
        }
    }
    sync() {
        return new Promise((c) => {
            setTimeout(c, 0);
        }).then(() => {
            if (this._callCount === 0) {
                return undefined;
            }
            if (!this._idle) {
                this._idle = new Promise((c, e) => {
                    this._completeIdle = c;
                });
            }
            return this._idle;
        });
    }
    getProxy(identifier) {
        if (!this._proxies[identifier.sid]) {
            this._proxies[identifier.sid] = this._createProxy(identifier.sid);
        }
        return this._proxies[identifier.sid];
    }
    _createProxy(proxyId) {
        const handler = {
            get: (target, name) => {
                if (typeof name === 'string' && !target[name] && name.charCodeAt(0) === 36 /* CharCode.DollarSign */) {
                    target[name] = (...myArgs) => {
                        return this._remoteCall(proxyId, name, myArgs);
                    };
                }
                return target[name];
            }
        };
        return new Proxy(Object.create(null), handler);
    }
    set(identifier, value) {
        this._locals[identifier.sid] = value;
        return value;
    }
    _remoteCall(proxyId, path, args) {
        this._callCount++;
        return new Promise((c) => {
            setTimeout(c, 0);
        }).then(() => {
            const instance = this._locals[proxyId];
            // pretend the args went over the wire... (invoke .toJSON on objects...)
            const wireArgs = simulateWireTransfer(args);
            let p;
            try {
                const result = instance[path].apply(instance, wireArgs);
                p = isThenable(result) ? result : Promise.resolve(result);
            }
            catch (err) {
                p = Promise.reject(err);
            }
            return p.then(result => {
                this._callCount--;
                // pretend the result went over the wire... (invoke .toJSON on objects...)
                const wireResult = simulateWireTransfer(result);
                return wireResult;
            }, err => {
                this._callCount--;
                return Promise.reject(err);
            });
        });
    }
    dispose() {
        throw new Error('Not implemented!');
    }
    assertRegistered(identifiers) {
        throw new Error('Not implemented!');
    }
}
function simulateWireTransfer(obj) {
    if (!obj) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(simulateWireTransfer);
    }
    if (obj instanceof SerializableObjectWithBuffers) {
        const { jsonString, referencedBuffers } = stringifyJsonWithBufferRefs(obj);
        return parseJsonAndRestoreBufferRefs(jsonString, referencedBuffers, null);
    }
    else {
        return JSON.parse(JSON.stringify(obj));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJQQ1Byb3RvY29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9jb21tb24vdGVzdFJQQ1Byb3RvY29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUs5RCxPQUFPLEVBQTRCLDZCQUE2QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDakksT0FBTyxFQUFFLDZCQUE2QixFQUFFLDJCQUEyQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFaEksTUFBTSxVQUFVLHNCQUFzQixDQUFDLEtBQVU7SUFDaEQsT0FBTztRQUNOLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLGVBQWUsRUFBRSxJQUFLO1FBQ3RCLFFBQVE7WUFDUCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxHQUFHLENBQWlCLFVBQThCLEVBQUUsS0FBUTtZQUMzRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLEVBQUUsU0FBVTtRQUNuQixnQkFBZ0IsRUFBRSxTQUFVO1FBQzVCLEtBQUssRUFBRSxTQUFVO1FBQ2pCLGlCQUFpQix3Q0FBZ0M7S0FDakQsQ0FBQztBQUNILENBQUM7QUFFRCxvRkFBb0Y7QUFDcEYsTUFBTSxVQUFVLGtCQUFrQixDQUFJLFFBQW1DO0lBQ3hFLE9BQU8sc0JBQXNCLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFO1FBQzNDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBWTtZQUN4QixJQUFJLFFBQVEsSUFBSSxJQUFJLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2xDLE9BQVEsUUFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxDQUFDO1lBQ0QsT0FBTyxHQUFHLEVBQUUs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