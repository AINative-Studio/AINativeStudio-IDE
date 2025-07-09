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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dEtleVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29udGV4dGtleS9icm93c2VyL2NvbnRleHRLZXlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBa0IsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekcsT0FBTyxFQUF3RyxrQkFBa0IsRUFBb0UsYUFBYSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFHcFAsTUFBTSx1QkFBdUIsR0FBRyx5QkFBeUIsQ0FBQztBQUUxRCxNQUFNLE9BQU8sT0FBTztJQU1uQixZQUFZLEVBQVUsRUFBRSxNQUFzQjtRQUM3QyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFD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