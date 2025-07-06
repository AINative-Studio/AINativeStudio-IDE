/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { GlobalIdleValue } from '../../../base/common/async.js';
import { illegalState } from '../../../base/common/errors.js';
import { dispose, isDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { SyncDescriptor } from './descriptors.js';
import { Graph } from './graph.js';
import { IInstantiationService, _util } from './instantiation.js';
import { ServiceCollection } from './serviceCollection.js';
import { LinkedList } from '../../../base/common/linkedList.js';
// TRACING
const _enableAllTracing = false;
class CyclicDependencyError extends Error {
    constructor(graph) {
        super('cyclic dependency between services');
        this.message = graph.findCycleSlow() ?? `UNABLE to detect cycle, dumping graph: \n${graph.toString()}`;
    }
}
export class InstantiationService {
    constructor(_services = new ServiceCollection(), _strict = false, _parent, _enableTracing = _enableAllTracing) {
        this._services = _services;
        this._strict = _strict;
        this._parent = _parent;
        this._enableTracing = _enableTracing;
        this._isDisposed = false;
        this._servicesToMaybeDispose = new Set();
        this._children = new Set();
        this._activeInstantiations = new Set();
        this._services.set(IInstantiationService, this);
        this._globalGraph = _enableTracing ? _parent?._globalGraph ?? new Graph(e => e) : undefined;
    }
    dispose() {
        if (!this._isDisposed) {
            this._isDisposed = true;
            // dispose all child services
            dispose(this._children);
            this._children.clear();
            // dispose all services created by this service
            for (const candidate of this._servicesToMaybeDispose) {
                if (isDisposable(candidate)) {
                    candidate.dispose();
                }
            }
            this._servicesToMaybeDispose.clear();
        }
    }
    _throwIfDisposed() {
        if (this._isDisposed) {
            throw new Error('InstantiationService has been disposed');
        }
    }
    createChild(services, store) {
        this._throwIfDisposed();
        const that = this;
        const result = new class extends InstantiationService {
            dispose() {
                that._children.delete(result);
                super.dispose();
            }
        }(services, this._strict, this, this._enableTracing);
        this._children.add(result);
        store?.add(result);
        return result;
    }
    invokeFunction(fn, ...args) {
        this._throwIfDisposed();
        const _trace = Trace.traceInvocation(this._enableTracing, fn);
        let _done = false;
        try {
            const accessor = {
                get: (id) => {
                    if (_done) {
                        throw illegalState('service accessor is only valid during the invocation of its target method');
                    }
                    const result = this._getOrCreateServiceInstance(id, _trace);
                    if (!result) {
                        throw new Error(`[invokeFunction] unknown service '${id}'`);
                    }
                    return result;
                }
            };
            return fn(accessor, ...args);
        }
        finally {
            _done = true;
            _trace.stop();
        }
    }
    createInstance(ctorOrDescriptor, ...rest) {
        this._throwIfDisposed();
        let _trace;
        let result;
        if (ctorOrDescriptor instanceof SyncDescriptor) {
            _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor.ctor);
            result = this._createInstance(ctorOrDescriptor.ctor, ctorOrDescriptor.staticArguments.concat(rest), _trace);
        }
        else {
            _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor);
            result = this._createInstance(ctorOrDescriptor, rest, _trace);
        }
        _trace.stop();
        return result;
    }
    _createInstance(ctor, args = [], _trace) {
        // arguments defined by service decorators
        const serviceDependencies = _util.getServiceDependencies(ctor).sort((a, b) => a.index - b.index);
        const serviceArgs = [];
        for (const dependency of serviceDependencies) {
            const service = this._getOrCreateServiceInstance(dependency.id, _trace);
            if (!service) {
                this._throwIfStrict(`[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`, false);
            }
            serviceArgs.push(service);
        }
        const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;
        // check for argument mismatches, adjust static args if needed
        if (args.length !== firstServiceArgPos) {
            console.trace(`[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`);
            const delta = firstServiceArgPos - args.length;
            if (delta > 0) {
                args = args.concat(new Array(delta));
            }
            else {
                args = args.slice(0, firstServiceArgPos);
            }
        }
        // now create the instance
        return Reflect.construct(ctor, args.concat(serviceArgs));
    }
    _setCreatedServiceInstance(id, instance) {
        if (this._services.get(id) instanceof SyncDescriptor) {
            this._services.set(id, instance);
        }
        else if (this._parent) {
            this._parent._setCreatedServiceInstance(id, instance);
        }
        else {
            throw new Error('illegalState - setting UNKNOWN service instance');
        }
    }
    _getServiceInstanceOrDescriptor(id) {
        const instanceOrDesc = this._services.get(id);
        if (!instanceOrDesc && this._parent) {
            return this._parent._getServiceInstanceOrDescriptor(id);
        }
        else {
            return instanceOrDesc;
        }
    }
    _getOrCreateServiceInstance(id, _trace) {
        if (this._globalGraph && this._globalGraphImplicitDependency) {
            this._globalGraph.insertEdge(this._globalGraphImplicitDependency, String(id));
        }
        const thing = this._getServiceInstanceOrDescriptor(id);
        if (thing instanceof SyncDescriptor) {
            return this._safeCreateAndCacheServiceInstance(id, thing, _trace.branch(id, true));
        }
        else {
            _trace.branch(id, false);
            return thing;
        }
    }
    _safeCreateAndCacheServiceInstance(id, desc, _trace) {
        if (this._activeInstantiations.has(id)) {
            throw new Error(`illegal state - RECURSIVELY instantiating service '${id}'`);
        }
        this._activeInstantiations.add(id);
        try {
            return this._createAndCacheServiceInstance(id, desc, _trace);
        }
        finally {
            this._activeInstantiations.delete(id);
        }
    }
    _createAndCacheServiceInstance(id, desc, _trace) {
        const graph = new Graph(data => data.id.toString());
        let cycleCount = 0;
        const stack = [{ id, desc, _trace }];
        const seen = new Set();
        while (stack.length) {
            const item = stack.pop();
            if (seen.has(String(item.id))) {
                continue;
            }
            seen.add(String(item.id));
            graph.lookupOrInsertNode(item);
            // a weak but working heuristic for cycle checks
            if (cycleCount++ > 1000) {
                throw new CyclicDependencyError(graph);
            }
            // check all dependencies for existence and if they need to be created first
            for (const dependency of _util.getServiceDependencies(item.desc.ctor)) {
                const instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id);
                if (!instanceOrDesc) {
                    this._throwIfStrict(`[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`, true);
                }
                // take note of all service dependencies
                this._globalGraph?.insertEdge(String(item.id), String(dependency.id));
                if (instanceOrDesc instanceof SyncDescriptor) {
                    const d = { id: dependency.id, desc: instanceOrDesc, _trace: item._trace.branch(dependency.id, true) };
                    graph.insertEdge(item, d);
                    stack.push(d);
                }
            }
        }
        while (true) {
            const roots = graph.roots();
            // if there is no more roots but still
            // nodes in the graph we have a cycle
            if (roots.length === 0) {
                if (!graph.isEmpty()) {
                    throw new CyclicDependencyError(graph);
                }
                break;
            }
            for (const { data } of roots) {
                // Repeat the check for this still being a service sync descriptor. That's because
                // instantiating a dependency might have side-effect and recursively trigger instantiation
                // so that some dependencies are now fullfilled already.
                const instanceOrDesc = this._getServiceInstanceOrDescriptor(data.id);
                if (instanceOrDesc instanceof SyncDescriptor) {
                    // create instance and overwrite the service collections
                    const instance = this._createServiceInstanceWithOwner(data.id, data.desc.ctor, data.desc.staticArguments, data.desc.supportsDelayedInstantiation, data._trace);
                    this._setCreatedServiceInstance(data.id, instance);
                }
                graph.removeNode(data);
            }
        }
        return this._getServiceInstanceOrDescriptor(id);
    }
    _createServiceInstanceWithOwner(id, ctor, args = [], supportsDelayedInstantiation, _trace) {
        if (this._services.get(id) instanceof SyncDescriptor) {
            return this._createServiceInstance(id, ctor, args, supportsDelayedInstantiation, _trace, this._servicesToMaybeDispose);
        }
        else if (this._parent) {
            return this._parent._createServiceInstanceWithOwner(id, ctor, args, supportsDelayedInstantiation, _trace);
        }
        else {
            throw new Error(`illegalState - creating UNKNOWN service instance ${ctor.name}`);
        }
    }
    _createServiceInstance(id, ctor, args = [], supportsDelayedInstantiation, _trace, disposeBucket) {
        if (!supportsDelayedInstantiation) {
            // eager instantiation
            const result = this._createInstance(ctor, args, _trace);
            disposeBucket.add(result);
            return result;
        }
        else {
            const child = new InstantiationService(undefined, this._strict, this, this._enableTracing);
            child._globalGraphImplicitDependency = String(id);
            // Return a proxy object that's backed by an idle value. That
            // strategy is to instantiate services in our idle time or when actually
            // needed but not when injected into a consumer
            // return "empty events" when the service isn't instantiated yet
            const earlyListeners = new Map();
            const idle = new GlobalIdleValue(() => {
                const result = child._createInstance(ctor, args, _trace);
                // early listeners that we kept are now being subscribed to
                // the real service
                for (const [key, values] of earlyListeners) {
                    const candidate = result[key];
                    if (typeof candidate === 'function') {
                        for (const value of values) {
                            value.disposable = candidate.apply(result, value.listener);
                        }
                    }
                }
                earlyListeners.clear();
                disposeBucket.add(result);
                return result;
            });
            return new Proxy(Object.create(null), {
                get(target, key) {
                    if (!idle.isInitialized) {
                        // looks like an event
                        if (typeof key === 'string' && (key.startsWith('onDid') || key.startsWith('onWill'))) {
                            let list = earlyListeners.get(key);
                            if (!list) {
                                list = new LinkedList();
                                earlyListeners.set(key, list);
                            }
                            const event = (callback, thisArg, disposables) => {
                                if (idle.isInitialized) {
                                    return idle.value[key](callback, thisArg, disposables);
                                }
                                else {
                                    const entry = { listener: [callback, thisArg, disposables], disposable: undefined };
                                    const rm = list.push(entry);
                                    const result = toDisposable(() => {
                                        rm();
                                        entry.disposable?.dispose();
                                    });
                                    return result;
                                }
                            };
                            return event;
                        }
                    }
                    // value already exists
                    if (key in target) {
                        return target[key];
                    }
                    // create value
                    const obj = idle.value;
                    let prop = obj[key];
                    if (typeof prop !== 'function') {
                        return prop;
                    }
                    prop = prop.bind(obj);
                    target[key] = prop;
                    return prop;
                },
                set(_target, p, value) {
                    idle.value[p] = value;
                    return true;
                },
                getPrototypeOf(_target) {
                    return ctor.prototype;
                }
            });
        }
    }
    _throwIfStrict(msg, printWarning) {
        if (printWarning) {
            console.warn(msg);
        }
        if (this._strict) {
            throw new Error(msg);
        }
    }
}
//#region -- tracing ---
var TraceType;
(function (TraceType) {
    TraceType[TraceType["None"] = 0] = "None";
    TraceType[TraceType["Creation"] = 1] = "Creation";
    TraceType[TraceType["Invocation"] = 2] = "Invocation";
    TraceType[TraceType["Branch"] = 3] = "Branch";
})(TraceType || (TraceType = {}));
export class Trace {
    static { this.all = new Set(); }
    static { this._None = new class extends Trace {
        constructor() { super(0 /* TraceType.None */, null); }
        stop() { }
        branch() { return this; }
    }; }
    static traceInvocation(_enableTracing, ctor) {
        return !_enableTracing ? Trace._None : new Trace(2 /* TraceType.Invocation */, ctor.name || new Error().stack.split('\n').slice(3, 4).join('\n'));
    }
    static traceCreation(_enableTracing, ctor) {
        return !_enableTracing ? Trace._None : new Trace(1 /* TraceType.Creation */, ctor.name);
    }
    static { this._totals = 0; }
    constructor(type, name) {
        this.type = type;
        this.name = name;
        this._start = Date.now();
        this._dep = [];
    }
    branch(id, first) {
        const child = new Trace(3 /* TraceType.Branch */, id.toString());
        this._dep.push([id, first, child]);
        return child;
    }
    stop() {
        const dur = Date.now() - this._start;
        Trace._totals += dur;
        let causedCreation = false;
        function printChild(n, trace) {
            const res = [];
            const prefix = new Array(n + 1).join('\t');
            for (const [id, first, child] of trace._dep) {
                if (first && child) {
                    causedCreation = true;
                    res.push(`${prefix}CREATES -> ${id}`);
                    const nested = printChild(n + 1, child);
                    if (nested) {
                        res.push(nested);
                    }
                }
                else {
                    res.push(`${prefix}uses -> ${id}`);
                }
            }
            return res.join('\n');
        }
        const lines = [
            `${this.type === 1 /* TraceType.Creation */ ? 'CREATE' : 'CALL'} ${this.name}`,
            `${printChild(1, this)}`,
            `DONE, took ${dur.toFixed(2)}ms (grand total ${Trace._totals.toFixed(2)}ms)`
        ];
        if (dur > 2 || causedCreation) {
            Trace.all.add(lines.join('\n'));
        }
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9pbnN0YW50aWF0aW9uL2NvbW1vbi9pbnN0YW50aWF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFBbUIsT0FBTyxFQUFlLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0SCxPQUFPLEVBQUUsY0FBYyxFQUFtQixNQUFNLGtCQUFrQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUE0QixxQkFBcUIsRUFBdUMsS0FBSyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDakksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWhFLFVBQVU7QUFDVixNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FFN0I7QUFFRixNQUFNLHFCQUFzQixTQUFRLEtBQUs7SUFDeEMsWUFBWSxLQUFpQjtRQUM1QixLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSw0Q0FBNEMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7SUFDeEcsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG9CQUFvQjtJQVdoQyxZQUNrQixZQUErQixJQUFJLGlCQUFpQixFQUFFLEVBQ3RE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