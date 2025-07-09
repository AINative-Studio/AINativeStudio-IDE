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
import * as errors from '../../../base/common/errors.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ExtensionDescriptionRegistry } from '../../services/extensions/common/extensionDescriptionRegistry.js';
import { ExtensionIdentifierMap } from '../../../platform/extensions/common/extensions.js';
import { MissingExtensionDependency } from '../../services/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { Barrier } from '../../../base/common/async.js';
export class ExtensionActivationTimes {
    static { this.NONE = new ExtensionActivationTimes(false, -1, -1, -1); }
    constructor(startup, codeLoadingTime, activateCallTime, activateResolvedTime) {
        this.startup = startup;
        this.codeLoadingTime = codeLoadingTime;
        this.activateCallTime = activateCallTime;
        this.activateResolvedTime = activateResolvedTime;
    }
}
export class ExtensionActivationTimesBuilder {
    constructor(startup) {
        this._startup = startup;
        this._codeLoadingStart = -1;
        this._codeLoadingStop = -1;
        this._activateCallStart = -1;
        this._activateCallStop = -1;
        this._activateResolveStart = -1;
        this._activateResolveStop = -1;
    }
    _delta(start, stop) {
        if (start === -1 || stop === -1) {
            return -1;
        }
        return stop - start;
    }
    build() {
        return new ExtensionActivationTimes(this._startup, this._delta(this._codeLoadingStart, this._codeLoadingStop), this._delta(this._activateCallStart, this._activateCallStop), this._delta(this._activateResolveStart, this._activateResolveStop));
    }
    codeLoadingStart() {
        this._codeLoadingStart = Date.now();
    }
    codeLoadingStop() {
        this._codeLoadingStop = Date.now();
    }
    activateCallStart() {
        this._activateCallStart = Date.now();
    }
    activateCallStop() {
        this._activateCallStop = Date.now();
    }
    activateResolveStart() {
        this._activateResolveStart = Date.now();
    }
    activateResolveStop() {
        this._activateResolveStop = Date.now();
    }
}
export class ActivatedExtension {
    constructor(activationFailed, activationFailedError, activationTimes, module, exports, disposable) {
        this.activationFailed = activationFailed;
        this.activationFailedError = activationFailedError;
        this.activationTimes = activationTimes;
        this.module = module;
        this.exports = exports;
        this.disposable = disposable;
    }
}
export class EmptyExtension extends ActivatedExtension {
    constructor(activationTimes) {
        super(false, null, activationTimes, { activate: undefined, deactivate: undefined }, undefined, Disposable.None);
    }
}
export class HostExtension extends ActivatedExtension {
    constructor() {
        super(false, null, ExtensionActivationTimes.NONE, { activate: undefined, deactivate: undefined }, undefined, Disposable.None);
    }
}
class FailedExtension extends ActivatedExtension {
    constructor(activationError) {
        super(true, activationError, ExtensionActivationTimes.NONE, { activate: undefined, deactivate: undefined }, undefined, Disposable.None);
    }
}
let ExtensionsActivator = class ExtensionsActivator {
    constructor(registry, globalRegistry, host, _logService) {
        this._logService = _logService;
        this._registry = registry;
        this._globalRegistry = globalRegistry;
        this._host = host;
        this._operations = new ExtensionIdentifierMap();
        this._alreadyActivatedEvents = Object.create(null);
    }
    dispose() {
        for (const [_, op] of this._operations) {
            op.dispose();
        }
    }
    async waitForActivatingExtensions() {
        const res = [];
        for (const [_, op] of this._operations) {
            res.push(op.wait());
        }
        await Promise.all(res);
    }
    isActivated(extensionId) {
        const op = this._operations.get(extensionId);
        return Boolean(op && op.value);
    }
    getActivatedExtension(extensionId) {
        const op = this._operations.get(extensionId);
        if (!op || !op.value) {
            throw new Error(`Extension '${extensionId.value}' is not known or not activated`);
        }
        return op.value;
    }
    async activateByEvent(activationEvent, startup) {
        if (this._alreadyActivatedEvents[activationEvent]) {
            return;
        }
        const activateExtensions = this._registry.getExtensionDescriptionsForActivationEvent(activationEvent);
        await this._activateExtensions(activateExtensions.map(e => ({
            id: e.identifier,
            reason: { startup, extensionId: e.identifier, activationEvent }
        })));
        this._alreadyActivatedEvents[activationEvent] = true;
    }
    activateById(extensionId, reason) {
        const desc = this._registry.getExtensionDescription(extensionId);
        if (!desc) {
            throw new Error(`Extension '${extensionId.value}' is not known`);
        }
        return this._activateExtensions([{ id: desc.identifier, reason }]);
    }
    async _activateExtensions(extensions) {
        const operations = extensions
            .filter((p) => !this.isActivated(p.id))
            .map(ext => this._handleActivationRequest(ext));
        await Promise.all(operations.map(op => op.wait()));
    }
    /**
     * Handle semantics related to dependencies for `currentExtension`.
     * We don't need to worry about dependency loops because they are handled by the registry.
     */
    _handleActivationRequest(currentActivation) {
        if (this._operations.has(currentActivation.id)) {
            return this._operations.get(currentActivation.id);
        }
        if (this._isHostExtension(currentActivation.id)) {
            return this._createAndSaveOperation(currentActivation, null, [], null);
        }
        const currentExtension = this._registry.getExtensionDescription(currentActivation.id);
        if (!currentExtension) {
            // Error condition 0: unknown extension
            const error = new Error(`Cannot activate unknown extension '${currentActivation.id.value}'`);
            const result = this._createAndSaveOperation(currentActivation, null, [], new FailedExtension(error));
            this._host.onExtensionActivationError(currentActivation.id, error, new MissingExtensionDependency(currentActivation.id.value));
            return result;
        }
        const deps = [];
        const depIds = (typeof currentExtension.extensionDependencies === 'undefined' ? [] : currentExtension.extensionDependencies);
        for (const depId of depIds) {
            if (this._isResolvedExtension(depId)) {
                // This dependency is already resolved
                continue;
            }
            const dep = this._operations.get(depId);
            if (dep) {
                deps.push(dep);
                continue;
            }
            if (this._isHostExtension(depId)) {
                // must first wait for the dependency to activate
                deps.push(this._handleActivationRequest({
                    id: this._globalRegistry.getExtensionDescription(depId).identifier,
                    reason: currentActivation.reason
                }));
                continue;
            }
            const depDesc = this._registry.getExtensionDescription(depId);
            if (depDesc) {
                if (!depDesc.main && !depDesc.browser) {
                    // this dependency does not need to activate because it is descriptive only
                    continue;
                }
                // must first wait for the dependency to activate
                deps.push(this._handleActivationRequest({
                    id: depDesc.identifier,
                    reason: currentActivation.reason
                }));
                continue;
            }
            // Error condition 1: unknown dependency
            const currentExtensionFriendlyName = currentExtension.displayName || currentExtension.identifier.value;
            const error = new Error(`Cannot activate the '${currentExtensionFriendlyName}' extension because it depends on unknown extension '${depId}'`);
            const result = this._createAndSaveOperation(currentActivation, currentExtension.displayName, [], new FailedExtension(error));
            this._host.onExtensionActivationError(currentExtension.identifier, error, new MissingExtensionDependency(depId));
            return result;
        }
        return this._createAndSaveOperation(currentActivation, currentExtension.displayName, deps, null);
    }
    _createAndSaveOperation(activation, displayName, deps, value) {
        const operation = new ActivationOperation(activation.id, displayName, activation.reason, deps, value, this._host, this._logService);
        this._operations.set(activation.id, operation);
        return operation;
    }
    _isHostExtension(extensionId) {
        return ExtensionDescriptionRegistry.isHostExtension(extensionId, this._registry, this._globalRegistry);
    }
    _isResolvedExtension(extensionId) {
        const extensionDescription = this._globalRegistry.getExtensionDescription(extensionId);
        if (!extensionDescription) {
            // unknown extension
            return false;
        }
        return (!extensionDescription.main && !extensionDescription.browser);
    }
};
ExtensionsActivator = __decorate([
    __param(3, ILogService)
], ExtensionsActivator);
export { ExtensionsActivator };
let ActivationOperation = class ActivationOperation {
    get value() {
        return this._value;
    }
    get friendlyName() {
        return this._displayName || this._id.value;
    }
    constructor(_id, _displayName, _reason, _deps, _value, _host, _logService) {
        this._id = _id;
        this._displayName = _displayName;
        this._reason = _reason;
        this._deps = _deps;
        this._value = _value;
        this._host = _host;
        this._logService = _logService;
        this._barrier = new Barrier();
        this._isDisposed = false;
        this._initialize();
    }
    dispose() {
        this._isDisposed = true;
    }
    wait() {
        return this._barrier.wait();
    }
    async _initialize() {
        await this._waitForDepsThenActivate();
        this._barrier.open();
    }
    async _waitForDepsThenActivate() {
        if (this._value) {
            // this operation is already finished
            return;
        }
        while (this._deps.length > 0) {
            // remove completed deps
            for (let i = 0; i < this._deps.length; i++) {
                const dep = this._deps[i];
                if (dep.value && !dep.value.activationFailed) {
                    // the dependency is already activated OK
                    this._deps.splice(i, 1);
                    i--;
                    continue;
                }
                if (dep.value && dep.value.activationFailed) {
                    // Error condition 2: a dependency has already failed activation
                    const error = new Error(`Cannot activate the '${this.friendlyName}' extension because its dependency '${dep.friendlyName}' failed to activate`);
                    error.detail = dep.value.activationFailedError;
                    this._value = new FailedExtension(error);
                    this._host.onExtensionActivationError(this._id, error, null);
                    return;
                }
            }
            if (this._deps.length > 0) {
                // wait for one dependency
                await Promise.race(this._deps.map(dep => dep.wait()));
            }
        }
        await this._activate();
    }
    async _activate() {
        try {
            this._value = await this._host.actualActivateExtension(this._id, this._reason);
        }
        catch (err) {
            const error = new Error();
            if (err && err.name) {
                error.name = err.name;
            }
            if (err && err.message) {
                error.message = `Activating extension '${this._id.value}' failed: ${err.message}.`;
            }
            else {
                error.message = `Activating extension '${this._id.value}' failed: ${err}.`;
            }
            if (err && err.stack) {
                error.stack = err.stack;
            }
            // Treat the extension as being empty
            this._value = new FailedExtension(error);
            if (this._isDisposed && errors.isCancellationError(err)) {
                // It is expected for ongoing activations to fail if the extension host is going down
                // So simply ignore and don't log canceled errors in this case
                return;
            }
            this._host.onExtensionActivationError(this._id, error, null);
            this._logService.error(`Activating extension ${this._id.value} failed due to an error:`);
            this._logService.error(err);
        }
    }
};
ActivationOperation = __decorate([
    __param(6, ILogService)
], ActivationOperation);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvbkFjdGl2YXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RXh0ZW5zaW9uQWN0aXZhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ2hILE9BQU8sRUFBdUIsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNoSCxPQUFPLEVBQTZCLDBCQUEwQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQXdCeEQsTUFBTSxPQUFPLHdCQUF3QjthQUViLFNBQUksR0FBRyxJQUFJLHdCQUF3QixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBTzlFLFlBQVksT0FBZ0IsRUFBRSxlQUF1QixFQUFFLGdCQUF3QixFQUFFLG9CQUE0QjtRQUM1RyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7UUFDekMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDO0lBQ2xELENBQUM7O0FBR0YsTUFBTSxPQUFPLCtCQUEr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