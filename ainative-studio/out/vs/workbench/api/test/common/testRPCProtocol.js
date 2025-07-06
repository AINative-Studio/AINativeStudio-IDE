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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJQQ1Byb3RvY29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2NvbW1vbi90ZXN0UlBDUHJvdG9jb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBSzlELE9BQU8sRUFBNEIsNkJBQTZCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNqSSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVoSSxNQUFNLFVBQVUsc0JBQXNCLENBQUMsS0FBVTtJQUNoRCxPQUFPO1FBQ04sYUFBYSxFQUFFLFNBQVM7UUFDeEIsZUFBZSxFQUFFLElBQUs7UUFDdEIsUUFBUTtZQUNQLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELEdBQUcsQ0FBaUIsVUFBOEIsRUFBRSxLQUFRO1lBQzNELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE9BQU8sRUFBRSxTQUFVO1FBQ25CLGdCQUFnQixFQUFFLFNBQVU7UUFDNUIsS0FBSyxFQUFFLFNBQVU7UUFDakIsaUJBQWlCLHdDQUFnQztLQUNqRCxDQUFDO0FBQ0gsQ0FBQztBQUVELG9GQUFvRjtBQUNwRixNQUFNLFVBQVUsa0JBQWtCLENBQUksUUFBbUM7SUFDeEUsT0FBTyxzQkFBc0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUU7UUFDM0MsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFZO1lBQ3hCLElBQUksUUFBUSxJQUFJLElBQUksSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDbEMsT0FBUSxRQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hDLENBQUM7WUFDRCxPQUFPLEdBQUcsRUFBRSxD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