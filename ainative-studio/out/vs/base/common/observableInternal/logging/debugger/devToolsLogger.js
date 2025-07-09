/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AutorunObserver } from '../../autorun.js';
import { ObservableValue } from '../../base.js';
import { Derived } from '../../derived.js';
import { formatValue } from '../consoleObservableLogger.js';
import { registerDebugChannel } from './debuggerRpc.js';
import { deepAssign, deepAssignDeleteNulls, getFirstStackFrameOutsideOf, Throttler } from './utils.js';
import { isDefined } from '../../../types.js';
import { FromEventObservable } from '../../utils.js';
import { BugIndicatingError, onUnexpectedError } from '../../../errors.js';
export class DevToolsLogger {
    static { this._instance = undefined; }
    static getInstance() {
        if (DevToolsLogger._instance === undefined) {
            DevToolsLogger._instance = new DevToolsLogger();
        }
        return DevToolsLogger._instance;
    }
    getTransactionState() {
        const affected = [];
        const txs = [...this._activeTransactions];
        if (txs.length === 0) {
            return undefined;
        }
        const observerQueue = txs.flatMap(t => t.debugGetUpdatingObservers() ?? []).map(o => o.observer);
        const processedObservers = new Set();
        while (observerQueue.length > 0) {
            const observer = observerQueue.shift();
            if (processedObservers.has(observer)) {
                continue;
            }
            processedObservers.add(observer);
            const state = this._getInfo(observer, d => {
                if (!processedObservers.has(d)) {
                    observerQueue.push(d);
                }
            });
            if (state) {
                affected.push(state);
            }
        }
        return { names: txs.map(t => t.getDebugName() ?? 'tx'), affected };
    }
    _getObservableInfo(observable) {
        const info = this._instanceInfos.get(observable);
        if (!info) {
            onUnexpectedError(new BugIndicatingError('No info found'));
            return undefined;
        }
        return info;
    }
    _getAutorunInfo(autorun) {
        const info = this._instanceInfos.get(autorun);
        if (!info) {
            onUnexpectedError(new BugIndicatingError('No info found'));
            return undefined;
        }
        return info;
    }
    _getInfo(observer, queue) {
        if (observer instanceof Derived) {
            const observersToUpdate = [...observer.debugGetObservers()];
            for (const o of observersToUpdate) {
                queue(o);
            }
            const info = this._getObservableInfo(observer);
            if (!info) {
                return;
            }
            const observerState = observer.debugGetState();
            const base = { name: observer.debugName, instanceId: info.instanceId, updateCount: observerState.updateCount };
            const changedDependencies = [...info.changedObservables].map(o => this._instanceInfos.get(o)?.instanceId).filter(isDefined);
            if (observerState.isComputing) {
                return { ...base, type: 'observable/derived', state: 'updating', changedDependencies, initialComputation: false };
            }
            switch (observerState.state) {
                case 0 /* DerivedState.initial */:
                    return { ...base, type: 'observable/derived', state: 'noValue' };
                case 3 /* DerivedState.upToDate */:
                    return { ...base, type: 'observable/derived', state: 'upToDate' };
                case 2 /* DerivedState.stale */:
                    return { ...base, type: 'observable/derived', state: 'stale', changedDependencies };
                case 1 /* DerivedState.dependenciesMightHaveChanged */:
                    return { ...base, type: 'observable/derived', state: 'possiblyStale' };
            }
        }
        else if (observer instanceof AutorunObserver) {
            const info = this._getAutorunInfo(observer);
            if (!info) {
                return undefined;
            }
            const base = { name: observer.debugName, instanceId: info.instanceId, updateCount: info.updateCount };
            const changedDependencies = [...info.changedObservables].map(o => this._instanceInfos.get(o).instanceId);
            if (observer.debugGetState().isRunning) {
                return { ...base, type: 'autorun', state: 'updating', changedDependencies };
            }
            switch (observer.debugGetState().state) {
                case 3 /* AutorunState.upToDate */:
                    return { ...base, type: 'autorun', state: 'upToDate' };
                case 2 /* AutorunState.stale */:
                    return { ...base, type: 'autorun', state: 'stale', changedDependencies };
                case 1 /* AutorunState.dependenciesMightHaveChanged */:
                    return { ...base, type: 'autorun', state: 'possiblyStale' };
            }
        }
        return undefined;
    }
    _formatObservable(obs) {
        const info = this._getObservableInfo(obs);
        if (!info) {
            return undefined;
        }
        return { name: obs.debugName, instanceId: info.instanceId };
    }
    _formatObserver(obs) {
        if (obs instanceof Derived) {
            return { name: obs.toString(), instanceId: this._getObservableInfo(obs)?.instanceId };
        }
        const autorunInfo = this._getAutorunInfo(obs);
        if (autorunInfo) {
            return { name: obs.toString(), instanceId: autorunInfo.instanceId };
        }
        return undefined;
    }
    constructor() {
        this._declarationId = 0;
        this._instanceId = 0;
        this._declarations = new Map();
        this._instanceInfos = new WeakMap();
        this._aliveInstances = new Map();
        this._activeTransactions = new Set();
        this._channel = registerDebugChannel('observableDevTools', () => {
            return {
                notifications: {
                    setDeclarationIdFilter: declarationIds => {
                    },
                    logObservableValue: (observableId) => {
                        console.log('logObservableValue', observableId);
                    },
                    flushUpdates: () => {
                        this._flushUpdates();
                    },
                    resetUpdates: () => {
                        this._pendingChanges = null;
                        this._channel.api.notifications.handleChange(this._fullState, true);
                    },
                },
                requests: {
                    getDeclarations: () => {
                        const result = {};
                        for (const decl of this._declarations.values()) {
                            result[decl.id] = decl;
                        }
                        return { decls: result };
                    },
                    getSummarizedInstances: () => {
                        return null;
                    },
                    getObservableValueInfo: instanceId => {
                        const obs = this._aliveInstances.get(instanceId);
                        return {
                            observers: [...obs.debugGetObservers()].map(d => this._formatObserver(d)).filter(isDefined),
                        };
                    },
                    getDerivedInfo: instanceId => {
                        const d = this._aliveInstances.get(instanceId);
                        return {
                            dependencies: [...d.debugGetState().dependencies].map(d => this._formatObservable(d)).filter(isDefined),
                            observers: [...d.debugGetObservers()].map(d => this._formatObserver(d)).filter(isDefined),
                        };
                    },
                    getAutorunInfo: instanceId => {
                        const obs = this._aliveInstances.get(instanceId);
                        return {
                            dependencies: [...obs.debugGetState().dependencies].map(d => this._formatObservable(d)).filter(isDefined),
                        };
                    },
                    getTransactionState: () => {
                        return this.getTransactionState();
                    },
                    setValue: (instanceId, jsonValue) => {
                        const obs = this._aliveInstances.get(instanceId);
                        if (obs instanceof Derived) {
                            obs.debugSetValue(jsonValue);
                        }
                        else if (obs instanceof ObservableValue) {
                            obs.debugSetValue(jsonValue);
                        }
                        else if (obs instanceof FromEventObservable) {
                            obs.debugSetValue(jsonValue);
                        }
                        else {
                            throw new BugIndicatingError('Observable is not supported');
                        }
                        const observers = [...obs.debugGetObservers()];
                        for (const d of observers) {
                            d.beginUpdate(obs);
                        }
                        for (const d of observers) {
                            d.handleChange(obs, undefined);
                        }
                        for (const d of observers) {
                            d.endUpdate(obs);
                        }
                    },
                    getValue: instanceId => {
                        const obs = this._aliveInstances.get(instanceId);
                        if (obs instanceof Derived) {
                            return formatValue(obs.debugGetState().value, 200);
                        }
                        else if (obs instanceof ObservableValue) {
                            return formatValue(obs.debugGetState().value, 200);
                        }
                        return undefined;
                    }
                }
            };
        });
        this._pendingChanges = null;
        this._changeThrottler = new Throttler();
        this._fullState = {};
        this._flushUpdates = () => {
            if (this._pendingChanges !== null) {
                this._channel.api.notifications.handleChange(this._pendingChanges, false);
                this._pendingChanges = null;
            }
        };
    }
    _handleChange(update) {
        deepAssignDeleteNulls(this._fullState, update);
        if (this._pendingChanges === null) {
            this._pendingChanges = update;
        }
        else {
            deepAssign(this._pendingChanges, update);
        }
        this._changeThrottler.throttle(this._flushUpdates, 10);
    }
    _getDeclarationId(type) {
        let shallow = true;
        let loc;
        const Err = Error; // For the monaco editor checks, which don't have the nodejs types.
        while (true) {
            const l = Err.stackTraceLimit;
            Err.stackTraceLimit = shallow ? 6 : 20;
            const stack = new Error().stack;
            Err.stackTraceLimit = l;
            let result = getFirstStackFrameOutsideOf(stack, /[/\\]observableInternal[/\\]|\.observe|[/\\]util(s)?\./);
            if (!shallow && !result) {
                result = getFirstStackFrameOutsideOf(stack, /[/\\]observableInternal[/\\]|\.observe/);
            }
            if (result) {
                loc = result;
                break;
            }
            if (!shallow) {
                console.error('Could not find location for declaration', new Error().stack);
                loc = { fileName: 'unknown', line: 0, column: 0, id: 'unknown' };
                break;
            }
            shallow = false;
        }
        let decInfo = this._declarations.get(loc.id);
        if (decInfo === undefined) {
            decInfo = {
                id: this._declarationId++,
                type,
                url: loc.fileName,
                line: loc.line,
                column: loc.column,
            };
            this._declarations.set(loc.id, decInfo);
            this._handleChange({ decls: { [decInfo.id]: decInfo } });
        }
        return decInfo.id;
    }
    handleObservableCreated(observable) {
        const declarationId = this._getDeclarationId('observable/value');
        const info = {
            declarationId,
            instanceId: this._instanceId++,
            listenerCount: 0,
            lastValue: undefined,
            updateCount: 0,
            changedObservables: new Set(),
        };
        this._instanceInfos.set(observable, info);
    }
    handleOnListenerCountChanged(observable, newCount) {
        const info = this._getObservableInfo(observable);
        if (!info) {
            return;
        }
        if (info.listenerCount === 0 && newCount > 0) {
            const type = observable instanceof Derived ? 'observable/derived' : 'observable/value';
            this._aliveInstances.set(info.instanceId, observable);
            this._handleChange({
                instances: {
                    [info.instanceId]: {
                        instanceId: info.instanceId,
                        declarationId: info.declarationId,
                        formattedValue: info.lastValue,
                        type,
                        name: observable.debugName,
                    }
                }
            });
        }
        else if (info.listenerCount > 0 && newCount === 0) {
            this._handleChange({
                instances: { [info.instanceId]: null }
            });
            this._aliveInstances.delete(info.instanceId);
        }
        info.listenerCount = newCount;
    }
    handleObservableUpdated(observable, changeInfo) {
        if (observable instanceof Derived) {
            this._handleDerivedRecomputed(observable, changeInfo);
            return;
        }
        const info = this._getObservableInfo(observable);
        if (info) {
            if (changeInfo.didChange) {
                info.lastValue = formatValue(changeInfo.newValue, 30);
                if (info.listenerCount > 0) {
                    this._handleChange({
                        instances: { [info.instanceId]: { formattedValue: info.lastValue } }
                    });
                }
            }
        }
    }
    handleAutorunCreated(autorun) {
        const declarationId = this._getDeclarationId('autorun');
        const info = {
            declarationId,
            instanceId: this._instanceId++,
            updateCount: 0,
            changedObservables: new Set(),
        };
        this._instanceInfos.set(autorun, info);
        this._aliveInstances.set(info.instanceId, autorun);
        if (info) {
            this._handleChange({
                instances: {
                    [info.instanceId]: {
                        instanceId: info.instanceId,
                        declarationId: info.declarationId,
                        runCount: 0,
                        type: 'autorun',
                        name: autorun.debugName,
                    }
                }
            });
        }
    }
    handleAutorunDisposed(autorun) {
        const info = this._getAutorunInfo(autorun);
        if (!info) {
            return;
        }
        this._handleChange({
            instances: { [info.instanceId]: null }
        });
        this._instanceInfos.delete(autorun);
        this._aliveInstances.delete(info.instanceId);
    }
    handleAutorunDependencyChanged(autorun, observable, change) {
        const info = this._getAutorunInfo(autorun);
        if (!info) {
            return;
        }
        info.changedObservables.add(observable);
    }
    handleAutorunStarted(autorun) {
    }
    handleAutorunFinished(autorun) {
        const info = this._getAutorunInfo(autorun);
        if (!info) {
            return;
        }
        info.changedObservables.clear();
        info.updateCount++;
        this._handleChange({
            instances: { [info.instanceId]: { runCount: info.updateCount } }
        });
    }
    handleDerivedDependencyChanged(derived, observable, change) {
        const info = this._getObservableInfo(derived);
        if (info) {
            info.changedObservables.add(observable);
        }
    }
    _handleDerivedRecomputed(observable, changeInfo) {
        const info = this._getObservableInfo(observable);
        if (!info) {
            return;
        }
        const formattedValue = formatValue(changeInfo.newValue, 30);
        info.updateCount++;
        info.changedObservables.clear();
        info.lastValue = formattedValue;
        if (info.listenerCount > 0) {
            this._handleChange({
                instances: { [info.instanceId]: { formattedValue: formattedValue, recomputationCount: info.updateCount } }
            });
        }
    }
    handleDerivedCleared(observable) {
        const info = this._getObservableInfo(observable);
        if (!info) {
            return;
        }
        info.lastValue = undefined;
        info.changedObservables.clear();
        if (info.listenerCount > 0) {
            this._handleChange({
                instances: {
                    [info.instanceId]: {
                        formattedValue: undefined,
                    }
                }
            });
        }
    }
    handleBeginTransaction(transaction) {
        this._activeTransactions.add(transaction);
    }
    handleEndTransaction(transaction) {
        this._activeTransactions.delete(transaction);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2VG9vbHNMb2dnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2xvZ2dpbmcvZGVidWdnZXIvZGV2VG9vbHNMb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxrQkFBa0IsQ0FBQztBQUNqRSxPQUFPLEVBQTBDLGVBQWUsRUFBbUIsTUFBTSxlQUFlLENBQUM7QUFDekcsT0FBTyxFQUFFLE9BQU8sRUFBZ0IsTUFBTSxrQkFBa0IsQ0FBQztBQUV6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFNUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSwyQkFBMkIsRUFBYSxTQUFTLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbEgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBbUIzRSxNQUFNLE9BQU8sY0FBYzthQUNYLGNBQVMsR0FBK0IsU0FBUyxBQUF4QyxDQUF5QztJQUMxRCxNQUFNLENBQUMsV0FBVztRQUN4QixJQUFJLGNBQWMsQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUMsY0FBYyxDQUFDLFNBQVMsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ2pELENBQUM7UUFDRCxPQUFPLGNBQWMsQ0FBQyxTQUFTLENBQUM7SUFDakMsQ0FBQztJ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