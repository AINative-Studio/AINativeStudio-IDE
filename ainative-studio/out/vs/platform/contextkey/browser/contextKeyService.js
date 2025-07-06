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
import { PauseableEmitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable, MutableDisposable } from '../../../base/common/lifecycle.js';
import { cloneAndChange, distinct } from '../../../base/common/objects.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { CommandsRegistry } from '../../commands/common/commands.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../common/contextkey.js';
const KEYBINDING_CONTEXT_ATTR = 'data-keybinding-context';
export class Context {
    constructor(id, parent) {
        this._id = id;
        this._parent = parent;
        this._value = Object.create(null);
        this._value['_contextId'] = id;
    }
    get value() {
        return { ...this._value };
    }
    setValue(key, value) {
        // console.log('SET ' + key + ' = ' + value + ' ON ' + this._id);
        if (this._value[key] !== value) {
            this._value[key] = value;
            return true;
        }
        return false;
    }
    removeValue(key) {
        // console.log('REMOVE ' + key + ' FROM ' + this._id);
        if (key in this._value) {
            delete this._value[key];
            return true;
        }
        return false;
    }
    getValue(key) {
        const ret = this._value[key];
        if (typeof ret === 'undefined' && this._parent) {
            return this._parent.getValue(key);
        }
        return ret;
    }
    updateParent(parent) {
        this._parent = parent;
    }
    collectAllValues() {
        let result = this._parent ? this._parent.collectAllValues() : Object.create(null);
        result = { ...result, ...this._value };
        delete result['_contextId'];
        return result;
    }
}
class NullContext extends Context {
    static { this.INSTANCE = new NullContext(); }
    constructor() {
        super(-1, null);
    }
    setValue(key, value) {
        return false;
    }
    removeValue(key) {
        return false;
    }
    getValue(key) {
        return undefined;
    }
    collectAllValues() {
        return Object.create(null);
    }
}
class ConfigAwareContextValuesContainer extends Context {
    static { this._keyPrefix = 'config.'; }
    constructor(id, _configurationService, emitter) {
        super(id, null);
        this._configurationService = _configurationService;
        this._values = TernarySearchTree.forConfigKeys();
        this._listener = this._configurationService.onDidChangeConfiguration(event => {
            if (event.source === 7 /* ConfigurationTarget.DEFAULT */) {
                // new setting, reset everything
                const allKeys = Array.from(this._values, ([k]) => k);
                this._values.clear();
                emitter.fire(new ArrayContextKeyChangeEvent(allKeys));
            }
            else {
                const changedKeys = [];
                for (const configKey of event.affectedKeys) {
                    const contextKey = `config.${configKey}`;
                    const cachedItems = this._values.findSuperstr(contextKey);
                    if (cachedItems !== undefined) {
                        changedKeys.push(...Iterable.map(cachedItems, ([key]) => key));
                        this._values.deleteSuperstr(contextKey);
                    }
                    if (this._values.has(contextKey)) {
                        changedKeys.push(contextKey);
                        this._values.delete(contextKey);
                    }
                }
                emitter.fire(new ArrayContextKeyChangeEvent(changedKeys));
            }
        });
    }
    dispose() {
        this._listener.dispose();
    }
    getValue(key) {
        if (key.indexOf(ConfigAwareContextValuesContainer._keyPrefix) !== 0) {
            return super.getValue(key);
        }
        if (this._values.has(key)) {
            return this._values.get(key);
        }
        const configKey = key.substr(ConfigAwareContextValuesContainer._keyPrefix.length);
        const configValue = this._configurationService.getValue(configKey);
        let value = undefined;
        switch (typeof configValue) {
            case 'number':
            case 'boolean':
            case 'string':
                value = configValue;
                break;
            default:
                if (Array.isArray(configValue)) {
                    value = JSON.stringify(configValue);
                }
                else {
                    value = configValue;
                }
        }
        this._values.set(key, value);
        return value;
    }
    setValue(key, value) {
        return super.setValue(key, value);
    }
    removeValue(key) {
        return super.removeValue(key);
    }
    collectAllValues() {
        const result = Object.create(null);
        this._values.forEach((value, index) => result[index] = value);
        return { ...result, ...super.collectAllValues() };
    }
}
class ContextKey {
    constructor(service, key, defaultValue) {
        this._service = service;
        this._key = key;
        this._defaultValue = defaultValue;
        this.reset();
    }
    set(value) {
        this._service.setContext(this._key, value);
    }
    reset() {
        if (typeof this._defaultValue === 'undefined') {
            this._service.removeContext(this._key);
        }
        else {
            this._service.setContext(this._key, this._defaultValue);
        }
    }
    get() {
        return this._service.getContextKeyValue(this._key);
    }
}
class SimpleContextKeyChangeEvent {
    constructor(key) {
        this.key = key;
    }
    affectsSome(keys) {
        return keys.has(this.key);
    }
    allKeysContainedIn(keys) {
        return this.affectsSome(keys);
    }
}
class ArrayContextKeyChangeEvent {
    constructor(keys) {
        this.keys = keys;
    }
    affectsSome(keys) {
        for (const key of this.keys) {
            if (keys.has(key)) {
                return true;
            }
        }
        return false;
    }
    allKeysContainedIn(keys) {
        return this.keys.every(key => keys.has(key));
    }
}
class CompositeContextKeyChangeEvent {
    constructor(events) {
        this.events = events;
    }
    affectsSome(keys) {
        for (const e of this.events) {
            if (e.affectsSome(keys)) {
                return true;
            }
        }
        return false;
    }
    allKeysContainedIn(keys) {
        return this.events.every(evt => evt.allKeysContainedIn(keys));
    }
}
function allEventKeysInContext(event, context) {
    return event.allKeysContainedIn(new Set(Object.keys(context)));
}
export class AbstractContextKeyService extends Disposable {
    constructor(myContextId) {
        super();
        this._onDidChangeContext = this._register(new PauseableEmitter({ merge: input => new CompositeContextKeyChangeEvent(input) }));
        this.onDidChangeContext = this._onDidChangeContext.event;
        this._isDisposed = false;
        this._myContextId = myContextId;
    }
    get contextId() {
        return this._myContextId;
    }
    createKey(key, defaultValue) {
        if (this._isDisposed) {
            throw new Error(`AbstractContextKeyService has been disposed`);
        }
        return new ContextKey(this, key, defaultValue);
    }
    bufferChangeEvents(callback) {
        this._onDidChangeContext.pause();
        try {
            callback();
        }
        finally {
            this._onDidChangeContext.resume();
        }
    }
    createScoped(domNode) {
        if (this._isDisposed) {
            throw new Error(`AbstractContextKeyService has been disposed`);
        }
        return new ScopedContextKeyService(this, domNode);
    }
    createOverlay(overlay = Iterable.empty()) {
        if (this._isDisposed) {
            throw new Error(`AbstractContextKeyService has been disposed`);
        }
        return new OverlayContextKeyService(this, overlay);
    }
    contextMatchesRules(rules) {
        if (this._isDisposed) {
            throw new Error(`AbstractContextKeyService has been disposed`);
        }
        const context = this.getContextValuesContainer(this._myContextId);
        const result = (rules ? rules.evaluate(context) : true);
        // console.group(rules.serialize() + ' -> ' + result);
        // rules.keys().forEach(key => { console.log(key, ctx[key]); });
        // console.groupEnd();
        return result;
    }
    getContextKeyValue(key) {
        if (this._isDisposed) {
            return undefined;
        }
        return this.getContextValuesContainer(this._myContextId).getValue(key);
    }
    setContext(key, value) {
        if (this._isDisposed) {
            return;
        }
        const myContext = this.getContextValuesContainer(this._myContextId);
        if (!myContext) {
            return;
        }
        if (myContext.setValue(key, value)) {
            this._onDidChangeContext.fire(new SimpleContextKeyChangeEvent(key));
        }
    }
    removeContext(key) {
        if (this._isDisposed) {
            return;
        }
        if (this.getContextValuesContainer(this._myContextId).removeValue(key)) {
            this._onDidChangeContext.fire(new SimpleContextKeyChangeEvent(key));
        }
    }
    getContext(target) {
        if (this._isDisposed) {
            return NullContext.INSTANCE;
        }
        return this.getContextValuesContainer(findContextAttr(target));
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
    }
}
let ContextKeyService = class ContextKeyService extends AbstractContextKeyService {
    constructor(configurationService) {
        super(0);
        this._contexts = new Map();
        this._lastContextId = 0;
        const myContext = this._register(new ConfigAwareContextValuesContainer(this._myContextId, configurationService, this._onDidChangeContext));
        this._contexts.set(this._myContextId, myContext);
        // Uncomment this to see the contexts continuously logged
        // let lastLoggedValue: string | null = null;
        // setInterval(() => {
        // 	let values = Object.keys(this._contexts).map((key) => this._contexts[key]);
        // 	let logValue = values.map(v => JSON.stringify(v._value, null, '\t')).join('\n');
        // 	if (lastLoggedValue !== logValue) {
        // 		lastLoggedValue = logValue;
        // 		console.log(lastLoggedValue);
        // 	}
        // }, 2000);
    }
    getContextValuesContainer(contextId) {
        if (this._isDisposed) {
            return NullContext.INSTANCE;
        }
        return this._contexts.get(contextId) || NullContext.INSTANCE;
    }
    createChildContext(parentContextId = this._myContextId) {
        if (this._isDisposed) {
            throw new Error(`ContextKeyService has been disposed`);
        }
        const id = (++this._lastContextId);
        this._contexts.set(id, new Context(id, this.getContextValuesContainer(parentContextId)));
        return id;
    }
    disposeContext(contextId) {
        if (!this._isDisposed) {
            this._contexts.delete(contextId);
        }
    }
    updateParent(_parentContextKeyService) {
        throw new Error('Cannot update parent of root ContextKeyService');
    }
};
ContextKeyService = __decorate([
    __param(0, IConfigurationService)
], ContextKeyService);
export { ContextKeyService };
class ScopedContextKeyService extends AbstractContextKeyService {
    constructor(parent, domNode) {
        super(parent.createChildContext());
        this._parentChangeListener = this._register(new MutableDisposable());
        this._parent = parent;
        this._updateParentChangeListener();
        this._domNode = domNode;
        if (this._domNode.hasAttribute(KEYBINDING_CONTEXT_ATTR)) {
            let extraInfo = '';
            if (this._domNode.classList) {
                extraInfo = Array.from(this._domNode.classList.values()).join(', ');
            }
            console.error(`Element already has context attribute${extraInfo ? ': ' + extraInfo : ''}`);
        }
        this._domNode.setAttribute(KEYBINDING_CONTEXT_ATTR, String(this._myContextId));
    }
    _updateParentChangeListener() {
        // Forward parent events to this listener. Parent will change.
        this._parentChangeListener.value = this._parent.onDidChangeContext(e => {
            const thisContainer = this._parent.getContextValuesContainer(this._myContextId);
            const thisContextValues = thisContainer.value;
            if (!allEventKeysInContext(e, thisContextValues)) {
                this._onDidChangeContext.fire(e);
            }
        });
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._parent.disposeContext(this._myContextId);
        this._domNode.removeAttribute(KEYBINDING_CONTEXT_ATTR);
        super.dispose();
    }
    getContextValuesContainer(contextId) {
        if (this._isDisposed) {
            return NullContext.INSTANCE;
        }
        return this._parent.getContextValuesContainer(contextId);
    }
    createChildContext(parentContextId = this._myContextId) {
        if (this._isDisposed) {
            throw new Error(`ScopedContextKeyService has been disposed`);
        }
        return this._parent.createChildContext(parentContextId);
    }
    disposeContext(contextId) {
        if (this._isDisposed) {
            return;
        }
        this._parent.disposeContext(contextId);
    }
    updateParent(parentContextKeyService) {
        if (this._parent === parentContextKeyService) {
            return;
        }
        const thisContainer = this._parent.getContextValuesContainer(this._myContextId);
        const oldAllValues = thisContainer.collectAllValues();
        this._parent = parentContextKeyService;
        this._updateParentChangeListener();
        const newParentContainer = this._parent.getContextValuesContainer(this._parent.contextId);
        thisContainer.updateParent(newParentContainer);
        const newAllValues = thisContainer.collectAllValues();
        const allValuesDiff = {
            ...distinct(oldAllValues, newAllValues),
            ...distinct(newAllValues, oldAllValues)
        };
        const changedKeys = Object.keys(allValuesDiff);
        this._onDidChangeContext.fire(new ArrayContextKeyChangeEvent(changedKeys));
    }
}
class OverlayContext {
    constructor(parent, overlay) {
        this.parent = parent;
        this.overlay = overlay;
    }
    getValue(key) {
        return this.overlay.has(key) ? this.overlay.get(key) : this.parent.getValue(key);
    }
}
class OverlayContextKeyService {
    get contextId() {
        return this.parent.contextId;
    }
    get onDidChangeContext() {
        return this.parent.onDidChangeContext;
    }
    constructor(parent, overlay) {
        this.parent = parent;
        this.overlay = new Map(overlay);
    }
    bufferChangeEvents(callback) {
        this.parent.bufferChangeEvents(callback);
    }
    createKey() {
        throw new Error('Not supported.');
    }
    getContext(target) {
        return new OverlayContext(this.parent.getContext(target), this.overlay);
    }
    getContextValuesContainer(contextId) {
        const parentContext = this.parent.getContextValuesContainer(contextId);
        return new OverlayContext(parentContext, this.overlay);
    }
    contextMatchesRules(rules) {
        const context = this.getContextValuesContainer(this.contextId);
        const result = (rules ? rules.evaluate(context) : true);
        return result;
    }
    getContextKeyValue(key) {
        return this.overlay.has(key) ? this.overlay.get(key) : this.parent.getContextKeyValue(key);
    }
    createScoped() {
        throw new Error('Not supported.');
    }
    createOverlay(overlay = Iterable.empty()) {
        return new OverlayContextKeyService(this, overlay);
    }
    updateParent() {
        throw new Error('Not supported.');
    }
}
function findContextAttr(domNode) {
    while (domNode) {
        if (domNode.hasAttribute(KEYBINDING_CONTEXT_ATTR)) {
            const attr = domNode.getAttribute(KEYBINDING_CONTEXT_ATTR);
            if (attr) {
                return parseInt(attr, 10);
            }
            return NaN;
        }
        domNode = domNode.parentElement;
    }
    return 0;
}
export function setContext(accessor, contextKey, contextValue) {
    const contextKeyService = accessor.get(IContextKeyService);
    contextKeyService.createKey(String(contextKey), stringifyURIs(contextValue));
}
function stringifyURIs(contextValue) {
    return cloneAndChange(contextValue, (obj) => {
        if (typeof obj === 'object' && obj.$mid === 1 /* MarshalledId.Uri */) {
            return URI.revive(obj).toString();
        }
        if (obj instanceof URI) {
            return obj.toString();
        }
        return undefined;
    });
}
CommandsRegistry.registerCommand('_setContext', setContext);
CommandsRegistry.registerCommand({
    id: 'getContextKeyInfo',
    handler() {
        return [...RawContextKey.all()].sort((a, b) => a.key.localeCompare(b.key));
    },
    metadata: {
        description: localize('getContextKeyInfo', "A command that returns information about context keys"),
        args: []
    }
});
CommandsRegistry.registerCommand('_generateContextKeyInfo', function () {
    const result = [];
    const seen = new Set();
    for (const info of RawContextKey.all()) {
        if (!seen.has(info.key)) {
            seen.add(info.key);
            result.push(info);
        }
    }
    result.sort((a, b) => a.key.localeCompare(b.key));
    console.log(JSON.stringify(result, undefined, 2));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dEtleVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb250ZXh0a2V5L2Jyb3dzZXIvY29udGV4dEtleVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFrQixnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JFLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RyxPQUFPLEVBQXdHLGtCQUFrQixFQUFvRSxhQUFhLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUdwUCxNQUFNLHVCQUF1QixHQUFHLHlCQUF5QixDQUFDO0FBRTFELE1BQU0sT0FBTyxPQUFPO0lBTW5CLFlBQVksRUFBVSxFQUFFLE1BQXNCO1FBQzdDLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2QsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMs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