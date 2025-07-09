/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Promises, RunOnceScheduler, runWhenGlobalIdle } from '../../../base/common/async.js';
import { Emitter, Event, PauseableEmitter } from '../../../base/common/event.js';
import { Disposable, dispose, MutableDisposable } from '../../../base/common/lifecycle.js';
import { mark } from '../../../base/common/performance.js';
import { isUndefinedOrNull } from '../../../base/common/types.js';
import { InMemoryStorageDatabase, Storage, StorageHint } from '../../../base/parts/storage/common/storage.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { isUserDataProfile } from '../../userDataProfile/common/userDataProfile.js';
export const IS_NEW_KEY = '__$__isNewStorageMarker';
export const TARGET_KEY = '__$__targetStorageMarker';
export const IStorageService = createDecorator('storageService');
export var WillSaveStateReason;
(function (WillSaveStateReason) {
    /**
     * No specific reason to save state.
     */
    WillSaveStateReason[WillSaveStateReason["NONE"] = 0] = "NONE";
    /**
     * A hint that the workbench is about to shutdown.
     */
    WillSaveStateReason[WillSaveStateReason["SHUTDOWN"] = 1] = "SHUTDOWN";
})(WillSaveStateReason || (WillSaveStateReason = {}));
export var StorageScope;
(function (StorageScope) {
    /**
     * The stored data will be scoped to all workspaces across all profiles.
     */
    StorageScope[StorageScope["APPLICATION"] = -1] = "APPLICATION";
    /**
     * The stored data will be scoped to all workspaces of the same profile.
     */
    StorageScope[StorageScope["PROFILE"] = 0] = "PROFILE";
    /**
     * The stored data will be scoped to the current workspace.
     */
    StorageScope[StorageScope["WORKSPACE"] = 1] = "WORKSPACE";
})(StorageScope || (StorageScope = {}));
export var StorageTarget;
(function (StorageTarget) {
    /**
     * The stored data is user specific and applies across machines.
     */
    StorageTarget[StorageTarget["USER"] = 0] = "USER";
    /**
     * The stored data is machine specific.
     */
    StorageTarget[StorageTarget["MACHINE"] = 1] = "MACHINE";
})(StorageTarget || (StorageTarget = {}));
export function loadKeyTargets(storage) {
    const keysRaw = storage.get(TARGET_KEY);
    if (keysRaw) {
        try {
            return JSON.parse(keysRaw);
        }
        catch (error) {
            // Fail gracefully
        }
    }
    return Object.create(null);
}
export class AbstractStorageService extends Disposable {
    static { this.DEFAULT_FLUSH_INTERVAL = 60 * 1000; } // every minute
    constructor(options = { flushInterval: AbstractStorageService.DEFAULT_FLUSH_INTERVAL }) {
        super();
        this._onDidChangeValue = this._register(new PauseableEmitter());
        this._onDidChangeTarget = this._register(new PauseableEmitter());
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this._onWillSaveState = this._register(new Emitter());
        this.onWillSaveState = this._onWillSaveState.event;
        this.runFlushWhenIdle = this._register(new MutableDisposable());
        this._workspaceKeyTargets = undefined;
        this._profileKeyTargets = undefined;
        this._applicationKeyTargets = undefined;
        this.flushWhenIdleScheduler = this._register(new RunOnceScheduler(() => this.doFlushWhenIdle(), options.flushInterval));
    }
    onDidChangeValue(scope, key, disposable) {
        return Event.filter(this._onDidChangeValue.event, e => e.scope === scope && (key === undefined || e.key === key), disposable);
    }
    doFlushWhenIdle() {
        this.runFlushWhenIdle.value = runWhenGlobalIdle(() => {
            if (this.shouldFlushWhenIdle()) {
                this.flush();
            }
            // repeat
            this.flushWhenIdleScheduler.schedule();
        });
    }
    shouldFlushWhenIdle() {
        return true;
    }
    stopFlushWhenIdle() {
        dispose([this.runFlushWhenIdle, this.flushWhenIdleScheduler]);
    }
    initialize() {
        if (!this.initializationPromise) {
            this.initializationPromise = (async () => {
                // Init all storage locations
                mark('code/willInitStorage');
                try {
                    await this.doInitialize(); // Ask subclasses to initialize storage
                }
                finally {
                    mark('code/didInitStorage');
                }
                // On some OS we do not get enough time to persist state on shutdown (e.g. when
                // Windows restarts after applying updates). In other cases, VSCode might crash,
                // so we periodically save state to reduce the chance of loosing any state.
                // In the browser we do not have support for long running unload sequences. As such,
                // we cannot ask for saving state in that moment, because that would result in a
                // long running operation.
                // Instead, periodically ask customers to save save. The library will be clever enough
                // to only save state that has actually changed.
                this.flushWhenIdleScheduler.schedule();
            })();
        }
        return this.initializationPromise;
    }
    emitDidChangeValue(scope, event) {
        const { key, external } = event;
        // Specially handle `TARGET_KEY`
        if (key === TARGET_KEY) {
            // Clear our cached version which is now out of date
            switch (scope) {
                case -1 /* StorageScope.APPLICATION */:
                    this._applicationKeyTargets = undefined;
                    break;
                case 0 /* StorageScope.PROFILE */:
                    this._profileKeyTargets = undefined;
                    break;
                case 1 /* StorageScope.WORKSPACE */:
                    this._workspaceKeyTargets = undefined;
                    break;
            }
            // Emit as `didChangeTarget` event
            this._onDidChangeTarget.fire({ scope });
        }
        // Emit any other key to outside
        else {
            this._onDidChangeValue.fire({ scope, key, target: this.getKeyTargets(scope)[key], external });
        }
    }
    emitWillSaveState(reason) {
        this._onWillSaveState.fire({ reason });
    }
    get(key, scope, fallbackValue) {
        return this.getStorage(scope)?.get(key, fallbackValue);
    }
    getBoolean(key, scope, fallbackValue) {
        return this.getStorage(scope)?.getBoolean(key, fallbackValue);
    }
    getNumber(key, scope, fallbackValue) {
        return this.getStorage(scope)?.getNumber(key, fallbackValue);
    }
    getObject(key, scope, fallbackValue) {
        return this.getStorage(scope)?.getObject(key, fallbackValue);
    }
    storeAll(entries, external) {
        this.withPausedEmitters(() => {
            for (const entry of entries) {
                this.store(entry.key, entry.value, entry.scope, entry.target, external);
            }
        });
    }
    store(key, value, scope, target, external = false) {
        // We remove the key for undefined/null values
        if (isUndefinedOrNull(value)) {
            this.remove(key, scope, external);
            return;
        }
        // Update our datastructures but send events only after
        this.withPausedEmitters(() => {
            // Update key-target map
            this.updateKeyTarget(key, scope, target);
            // Store actual value
            this.getStorage(scope)?.set(key, value, external);
        });
    }
    remove(key, scope, external = false) {
        // Update our datastructures but send events only after
        this.withPausedEmitters(() => {
            // Update key-target map
            this.updateKeyTarget(key, scope, undefined);
            // Remove actual key
            this.getStorage(scope)?.delete(key, external);
        });
    }
    withPausedEmitters(fn) {
        // Pause emitters
        this._onDidChangeValue.pause();
        this._onDidChangeTarget.pause();
        try {
            fn();
        }
        finally {
            // Resume emitters
            this._onDidChangeValue.resume();
            this._onDidChangeTarget.resume();
        }
    }
    keys(scope, target) {
        const keys = [];
        const keyTargets = this.getKeyTargets(scope);
        for (const key of Object.keys(keyTargets)) {
            const keyTarget = keyTargets[key];
            if (keyTarget === target) {
                keys.push(key);
            }
        }
        return keys;
    }
    updateKeyTarget(key, scope, target, external = false) {
        // Add
        const keyTargets = this.getKeyTargets(scope);
        if (typeof target === 'number') {
            if (keyTargets[key] !== target) {
                keyTargets[key] = target;
                this.getStorage(scope)?.set(TARGET_KEY, JSON.stringify(keyTargets), external);
            }
        }
        // Remove
        else {
            if (typeof keyTargets[key] === 'number') {
                delete keyTargets[key];
                this.getStorage(scope)?.set(TARGET_KEY, JSON.stringify(keyTargets), external);
            }
        }
    }
    get workspaceKeyTargets() {
        if (!this._workspaceKeyTargets) {
            this._workspaceKeyTargets = this.loadKeyTargets(1 /* StorageScope.WORKSPACE */);
        }
        return this._workspaceKeyTargets;
    }
    get profileKeyTargets() {
        if (!this._profileKeyTargets) {
            this._profileKeyTargets = this.loadKeyTargets(0 /* StorageScope.PROFILE */);
        }
        return this._profileKeyTargets;
    }
    get applicationKeyTargets() {
        if (!this._applicationKeyTargets) {
            this._applicationKeyTargets = this.loadKeyTargets(-1 /* StorageScope.APPLICATION */);
        }
        return this._applicationKeyTargets;
    }
    getKeyTargets(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationKeyTargets;
            case 0 /* StorageScope.PROFILE */:
                return this.profileKeyTargets;
            default:
                return this.workspaceKeyTargets;
        }
    }
    loadKeyTargets(scope) {
        const storage = this.getStorage(scope);
        return storage ? loadKeyTargets(storage) : Object.create(null);
    }
    isNew(scope) {
        return this.getBoolean(IS_NEW_KEY, scope) === true;
    }
    async flush(reason = WillSaveStateReason.NONE) {
        // Signal event to collect changes
        this._onWillSaveState.fire({ reason });
        const applicationStorage = this.getStorage(-1 /* StorageScope.APPLICATION */);
        const profileStorage = this.getStorage(0 /* StorageScope.PROFILE */);
        const workspaceStorage = this.getStorage(1 /* StorageScope.WORKSPACE */);
        switch (reason) {
            // Unspecific reason: just wait when data is flushed
            case WillSaveStateReason.NONE:
                await Promises.settled([
                    applicationStorage?.whenFlushed() ?? Promise.resolve(),
                    profileStorage?.whenFlushed() ?? Promise.resolve(),
                    workspaceStorage?.whenFlushed() ?? Promise.resolve()
                ]);
                break;
            // Shutdown: we want to flush as soon as possible
            // and not hit any delays that might be there
            case WillSaveStateReason.SHUTDOWN:
                await Promises.settled([
                    applicationStorage?.flush(0) ?? Promise.resolve(),
                    profileStorage?.flush(0) ?? Promise.resolve(),
                    workspaceStorage?.flush(0) ?? Promise.resolve()
                ]);
                break;
        }
    }
    async log() {
        const applicationItems = this.getStorage(-1 /* StorageScope.APPLICATION */)?.items ?? new Map();
        const profileItems = this.getStorage(0 /* StorageScope.PROFILE */)?.items ?? new Map();
        const workspaceItems = this.getStorage(1 /* StorageScope.WORKSPACE */)?.items ?? new Map();
        return logStorage(applicationItems, profileItems, workspaceItems, this.getLogDetails(-1 /* StorageScope.APPLICATION */) ?? '', this.getLogDetails(0 /* StorageScope.PROFILE */) ?? '', this.getLogDetails(1 /* StorageScope.WORKSPACE */) ?? '');
    }
    async optimize(scope) {
        // Await pending data to be flushed to the DB
        // before attempting to optimize the DB
        await this.flush();
        return this.getStorage(scope)?.optimize();
    }
    async switch(to, preserveData) {
        // Signal as event so that clients can store data before we switch
        this.emitWillSaveState(WillSaveStateReason.NONE);
        if (isUserDataProfile(to)) {
            return this.switchToProfile(to, preserveData);
        }
        return this.switchToWorkspace(to, preserveData);
    }
    canSwitchProfile(from, to) {
        if (from.id === to.id) {
            return false; // both profiles are same
        }
        if (isProfileUsingDefaultStorage(to) && isProfileUsingDefaultStorage(from)) {
            return false; // both profiles are using default
        }
        return true;
    }
    switchData(oldStorage, newStorage, scope) {
        this.withPausedEmitters(() => {
            // Signal storage keys that have changed
            const handledkeys = new Set();
            for (const [key, oldValue] of oldStorage) {
                handledkeys.add(key);
                const newValue = newStorage.get(key);
                if (newValue !== oldValue) {
                    this.emitDidChangeValue(scope, { key, external: true });
                }
            }
            for (const [key] of newStorage.items) {
                if (!handledkeys.has(key)) {
                    this.emitDidChangeValue(scope, { key, external: true });
                }
            }
        });
    }
}
export function isProfileUsingDefaultStorage(profile) {
    return profile.isDefault || !!profile.useDefaultFlags?.globalState;
}
export class InMemoryStorageService extends AbstractStorageService {
    constructor() {
        super();
        this.applicationStorage = this._register(new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY }));
        this.profileStorage = this._register(new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY }));
        this.workspaceStorage = this._register(new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY }));
        this._register(this.workspaceStorage.onDidChangeStorage(e => this.emitDidChangeValue(1 /* StorageScope.WORKSPACE */, e)));
        this._register(this.profileStorage.onDidChangeStorage(e => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
        this._register(this.applicationStorage.onDidChangeStorage(e => this.emitDidChangeValue(-1 /* StorageScope.APPLICATION */, e)));
    }
    getStorage(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorage;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorage;
            default:
                return this.workspaceStorage;
        }
    }
    getLogDetails(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return 'inMemory (application)';
            case 0 /* StorageScope.PROFILE */:
                return 'inMemory (profile)';
            default:
                return 'inMemory (workspace)';
        }
    }
    async doInitialize() { }
    async switchToProfile() {
        // no-op when in-memory
    }
    async switchToWorkspace() {
        // no-op when in-memory
    }
    shouldFlushWhenIdle() {
        return false;
    }
    hasScope(scope) {
        return false;
    }
}
export async function logStorage(application, profile, workspace, applicationPath, profilePath, workspacePath) {
    const safeParse = (value) => {
        try {
            return JSON.parse(value);
        }
        catch (error) {
            return value;
        }
    };
    const applicationItems = new Map();
    const applicationItemsParsed = new Map();
    application.forEach((value, key) => {
        applicationItems.set(key, value);
        applicationItemsParsed.set(key, safeParse(value));
    });
    const profileItems = new Map();
    const profileItemsParsed = new Map();
    profile.forEach((value, key) => {
        profileItems.set(key, value);
        profileItemsParsed.set(key, safeParse(value));
    });
    const workspaceItems = new Map();
    const workspaceItemsParsed = new Map();
    workspace.forEach((value, key) => {
        workspaceItems.set(key, value);
        workspaceItemsParsed.set(key, safeParse(value));
    });
    if (applicationPath !== profilePath) {
        console.group(`Storage: Application (path: ${applicationPath})`);
    }
    else {
        console.group(`Storage: Application & Profile (path: ${applicationPath}, default profile)`);
    }
    const applicationValues = [];
    applicationItems.forEach((value, key) => {
        applicationValues.push({ key, value });
    });
    console.table(applicationValues);
    console.groupEnd();
    console.log(applicationItemsParsed);
    if (applicationPath !== profilePath) {
        console.group(`Storage: Profile (path: ${profilePath}, profile specific)`);
        const profileValues = [];
        profileItems.forEach((value, key) => {
            profileValues.push({ key, value });
        });
        console.table(profileValues);
        console.groupEnd();
        console.log(profileItemsParsed);
    }
    console.group(`Storage: Workspace (path: ${workspacePath})`);
    const workspaceValues = [];
    workspaceItems.forEach((value, key) => {
        workspaceValues.push({ key, value });
    });
    console.table(workspaceValues);
    console.groupEnd();
    console.log(workspaceItemsParsed);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zdG9yYWdlL2NvbW1vbi9zdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQW1CLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNsRSxPQUFPLEVBQUUsdUJBQXVCLEVBQWlDLE9BQU8sRUFBRSxXQUFXLEVBQWdCLE1BQU0sK0NBQStDLENBQUM7QUFDM0osT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBb0IsTUFBTSxpREFBaUQsQ0FBQztBQUd0RyxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcseUJBQXlCLENBQUM7QUFDcEQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLDBCQUEwQixDQUFDO0FBRXJELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGdCQUFnQixDQUFDLENBQUM7QUFFbEYsTUFBTSxDQUFOLElBQVksbUJBV1g7QUFYRCxXQUFZLG1CQUFtQjtJQUU5Qjs7T0FFRztJQUNILDZEQUFJLENBQUE7SUFFSjs7T0FFRztJQUNILHFFQUFRLENBQUE7QUFDVCxDQUFDLEVB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