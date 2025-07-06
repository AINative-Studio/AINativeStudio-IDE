/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier, ExtensionIdentifierMap, ExtensionIdentifierSet } from '../../../../platform/extensions/common/extensions.js';
import { Emitter } from '../../../../base/common/event.js';
import * as path from '../../../../base/common/path.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
export class DeltaExtensionsResult {
    constructor(versionId, removedDueToLooping) {
        this.versionId = versionId;
        this.removedDueToLooping = removedDueToLooping;
    }
}
export class ExtensionDescriptionRegistry {
    static isHostExtension(extensionId, myRegistry, globalRegistry) {
        if (myRegistry.getExtensionDescription(extensionId)) {
            // I have this extension
            return false;
        }
        const extensionDescription = globalRegistry.getExtensionDescription(extensionId);
        if (!extensionDescription) {
            // unknown extension
            return false;
        }
        if ((extensionDescription.main || extensionDescription.browser) && extensionDescription.api === 'none') {
            return true;
        }
        return false;
    }
    constructor(_activationEventsReader, extensionDescriptions) {
        this._activationEventsReader = _activationEventsReader;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._versionId = 0;
        this._extensionDescriptions = extensionDescriptions;
        this._initialize();
    }
    _initialize() {
        // Ensure extensions are stored in the order: builtin, user, under development
        this._extensionDescriptions.sort(extensionCmp);
        this._extensionsMap = new ExtensionIdentifierMap();
        this._extensionsArr = [];
        this._activationMap = new Map();
        for (const extensionDescription of this._extensionDescriptions) {
            if (this._extensionsMap.has(extensionDescription.identifier)) {
                // No overwriting allowed!
                console.error('Extension `' + extensionDescription.identifier.value + '` is already registered');
                continue;
            }
            this._extensionsMap.set(extensionDescription.identifier, extensionDescription);
            this._extensionsArr.push(extensionDescription);
            const activationEvents = this._activationEventsReader.readActivationEvents(extensionDescription);
            for (const activationEvent of activationEvents) {
                if (!this._activationMap.has(activationEvent)) {
                    this._activationMap.set(activationEvent, []);
                }
                this._activationMap.get(activationEvent).push(extensionDescription);
            }
        }
    }
    set(extensionDescriptions) {
        this._extensionDescriptions = extensionDescriptions;
        this._initialize();
        this._versionId++;
        this._onDidChange.fire(undefined);
        return {
            versionId: this._versionId
        };
    }
    deltaExtensions(toAdd, toRemove) {
        // It is possible that an extension is removed, only to be added again at a different version
        // so we will first handle removals
        this._extensionDescriptions = removeExtensions(this._extensionDescriptions, toRemove);
        // Then, handle the extensions to add
        this._extensionDescriptions = this._extensionDescriptions.concat(toAdd);
        // Immediately remove looping extensions!
        const looping = ExtensionDescriptionRegistry._findLoopingExtensions(this._extensionDescriptions);
        this._extensionDescriptions = removeExtensions(this._extensionDescriptions, looping.map(ext => ext.identifier));
        this._initialize();
        this._versionId++;
        this._onDidChange.fire(undefined);
        return new DeltaExtensionsResult(this._versionId, looping);
    }
    static _findLoopingExtensions(extensionDescriptions) {
        const G = new class {
            constructor() {
                this._arcs = new Map();
                this._nodesSet = new Set();
                this._nodesArr = [];
            }
            addNode(id) {
                if (!this._nodesSet.has(id)) {
                    this._nodesSet.add(id);
                    this._nodesArr.push(id);
                }
            }
            addArc(from, to) {
                this.addNode(from);
                this.addNode(to);
                if (this._arcs.has(from)) {
                    this._arcs.get(from).push(to);
                }
                else {
                    this._arcs.set(from, [to]);
                }
            }
            getArcs(id) {
                if (this._arcs.has(id)) {
                    return this._arcs.get(id);
                }
                return [];
            }
            hasOnlyGoodArcs(id, good) {
                const dependencies = G.getArcs(id);
                for (let i = 0; i < dependencies.length; i++) {
                    if (!good.has(dependencies[i])) {
                        return false;
                    }
                }
                return true;
            }
            getNodes() {
                return this._nodesArr;
            }
        };
        const descs = new ExtensionIdentifierMap();
        for (const extensionDescription of extensionDescriptions) {
            descs.set(extensionDescription.identifier, extensionDescription);
            if (extensionDescription.extensionDependencies) {
                for (const depId of extensionDescription.extensionDependencies) {
                    G.addArc(ExtensionIdentifier.toKey(extensionDescription.identifier), ExtensionIdentifier.toKey(depId));
                }
            }
        }
        // initialize with all extensions with no dependencies.
        const good = new Set();
        G.getNodes().filter(id => G.getArcs(id).length === 0).forEach(id => good.add(id));
        // all other extensions will be processed below.
        const nodes = G.getNodes().filter(id => !good.has(id));
        let madeProgress;
        do {
            madeProgress = false;
            // find one extension which has only good deps
            for (let i = 0; i < nodes.length; i++) {
                const id = nodes[i];
                if (G.hasOnlyGoodArcs(id, good)) {
                    nodes.splice(i, 1);
                    i--;
                    good.add(id);
                    madeProgress = true;
                }
            }
        } while (madeProgress);
        // The remaining nodes are bad and have loops
        return nodes.map(id => descs.get(id));
    }
    containsActivationEvent(activationEvent) {
        return this._activationMap.has(activationEvent);
    }
    containsExtension(extensionId) {
        return this._extensionsMap.has(extensionId);
    }
    getExtensionDescriptionsForActivationEvent(activationEvent) {
        const extensions = this._activationMap.get(activationEvent);
        return extensions ? extensions.slice(0) : [];
    }
    getAllExtensionDescriptions() {
        return this._extensionsArr.slice(0);
    }
    getSnapshot() {
        return new ExtensionDescriptionRegistrySnapshot(this._versionId, this.getAllExtensionDescriptions());
    }
    getExtensionDescription(extensionId) {
        const extension = this._extensionsMap.get(extensionId);
        return extension ? extension : undefined;
    }
    getExtensionDescriptionByUUID(uuid) {
        for (const extensionDescription of this._extensionsArr) {
            if (extensionDescription.uuid === uuid) {
                return extensionDescription;
            }
        }
        return undefined;
    }
    getExtensionDescriptionByIdOrUUID(extensionId, uuid) {
        return (this.getExtensionDescription(extensionId)
            ?? (uuid ? this.getExtensionDescriptionByUUID(uuid) : undefined));
    }
}
export class ExtensionDescriptionRegistrySnapshot {
    constructor(versionId, extensions) {
        this.versionId = versionId;
        this.extensions = extensions;
    }
}
export class LockableExtensionDescriptionRegistry {
    constructor(activationEventsReader) {
        this._lock = new Lock();
        this._actual = new ExtensionDescriptionRegistry(activationEventsReader, []);
    }
    async acquireLock(customerName) {
        const lock = await this._lock.acquire(customerName);
        return new ExtensionDescriptionRegistryLock(this, lock);
    }
    deltaExtensions(acquiredLock, toAdd, toRemove) {
        if (!acquiredLock.isAcquiredFor(this)) {
            throw new Error('Lock is not held');
        }
        return this._actual.deltaExtensions(toAdd, toRemove);
    }
    containsActivationEvent(activationEvent) {
        return this._actual.containsActivationEvent(activationEvent);
    }
    containsExtension(extensionId) {
        return this._actual.containsExtension(extensionId);
    }
    getExtensionDescriptionsForActivationEvent(activationEvent) {
        return this._actual.getExtensionDescriptionsForActivationEvent(activationEvent);
    }
    getAllExtensionDescriptions() {
        return this._actual.getAllExtensionDescriptions();
    }
    getSnapshot() {
        return this._actual.getSnapshot();
    }
    getExtensionDescription(extensionId) {
        return this._actual.getExtensionDescription(extensionId);
    }
    getExtensionDescriptionByUUID(uuid) {
        return this._actual.getExtensionDescriptionByUUID(uuid);
    }
    getExtensionDescriptionByIdOrUUID(extensionId, uuid) {
        return this._actual.getExtensionDescriptionByIdOrUUID(extensionId, uuid);
    }
}
export class ExtensionDescriptionRegistryLock extends Disposable {
    constructor(_registry, lock) {
        super();
        this._registry = _registry;
        this._isDisposed = false;
        this._register(lock);
    }
    isAcquiredFor(registry) {
        return !this._isDisposed && this._registry === registry;
    }
}
class LockCustomer {
    constructor(name) {
        this.name = name;
        const withResolvers = promiseWithResolvers();
        this.promise = withResolvers.promise;
        this._resolve = withResolvers.resolve;
    }
    resolve(value) {
        this._resolve(value);
    }
}
class Lock {
    constructor() {
        this._pendingCustomers = [];
        this._isLocked = false;
    }
    async acquire(customerName) {
        const customer = new LockCustomer(customerName);
        this._pendingCustomers.push(customer);
        this._advance();
        return customer.promise;
    }
    _advance() {
        if (this._isLocked) {
            // cannot advance yet
            return;
        }
        if (this._pendingCustomers.length === 0) {
            // no more waiting customers
            return;
        }
        const customer = this._pendingCustomers.shift();
        this._isLocked = true;
        let customerHoldsLock = true;
        const logLongRunningCustomerTimeout = setTimeout(() => {
            if (customerHoldsLock) {
                console.warn(`The customer named ${customer.name} has been holding on to the lock for 30s. This might be a problem.`);
            }
        }, 30 * 1000 /* 30 seconds */);
        const releaseLock = () => {
            if (!customerHoldsLock) {
                return;
            }
            clearTimeout(logLongRunningCustomerTimeout);
            customerHoldsLock = false;
            this._isLocked = false;
            this._advance();
        };
        customer.resolve(toDisposable(releaseLock));
    }
}
var SortBucket;
(function (SortBucket) {
    SortBucket[SortBucket["Builtin"] = 0] = "Builtin";
    SortBucket[SortBucket["User"] = 1] = "User";
    SortBucket[SortBucket["Dev"] = 2] = "Dev";
})(SortBucket || (SortBucket = {}));
/**
 * Ensure that:
 * - first are builtin extensions
 * - second are user extensions
 * - third are extensions under development
 *
 * In each bucket, extensions must be sorted alphabetically by their folder name.
 */
function extensionCmp(a, b) {
    const aSortBucket = (a.isBuiltin ? 0 /* SortBucket.Builtin */ : a.isUnderDevelopment ? 2 /* SortBucket.Dev */ : 1 /* SortBucket.User */);
    const bSortBucket = (b.isBuiltin ? 0 /* SortBucket.Builtin */ : b.isUnderDevelopment ? 2 /* SortBucket.Dev */ : 1 /* SortBucket.User */);
    if (aSortBucket !== bSortBucket) {
        return aSortBucket - bSortBucket;
    }
    const aLastSegment = path.posix.basename(a.extensionLocation.path);
    const bLastSegment = path.posix.basename(b.extensionLocation.path);
    if (aLastSegment < bLastSegment) {
        return -1;
    }
    if (aLastSegment > bLastSegment) {
        return 1;
    }
    return 0;
}
function removeExtensions(arr, toRemove) {
    const toRemoveSet = new ExtensionIdentifierSet(toRemove);
    return arr.filter(extension => !toRemoveSet.has(extension.identifier));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRGVzY3JpcHRpb25SZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25EZXNjcmlwdGlvblJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxzQkFBc0IsRUFBeUIsTUFBTSxzREFBc0QsQ0FBQztBQUNsSyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXhFLE1BQU0sT0FBTyxxQkFBcUI7SUFDakMsWUFDaUIsU0FBaUIsRUFDakIsbUJBQTRDO1FBRDVDLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUF5QjtJQUN6RCxDQUFDO0NBQ0w7QUFZRCxNQUFNLE9BQU8sNEJBQTRCO0lBRWpDLE1BQU0sQ0FBQyxlQUFlLENBQUMsV0FBeUMsRUFBRSxVQUF3QyxFQUFFLGNBQTRDO1FBQzlKLElBQUksVUFBVSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDckQsd0JBQXdCO1lBQ3hCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE1BQU0sb0JBQW9CLEdBQUcsY0FBYyxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lB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