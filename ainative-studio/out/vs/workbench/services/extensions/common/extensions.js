/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { getExtensionId, getGalleryExtensionId } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { ImplicitActivationEvents } from '../../../../platform/extensionManagement/common/implicitActivationEvents.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, ExtensionIdentifierSet } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const nullExtensionDescription = Object.freeze({
    identifier: new ExtensionIdentifier('nullExtensionDescription'),
    name: 'Null Extension Description',
    version: '0.0.0',
    publisher: 'vscode',
    engines: { vscode: '' },
    extensionLocation: URI.parse('void:location'),
    isBuiltin: false,
    targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
    isUserBuiltin: false,
    isUnderDevelopment: false,
    preRelease: false,
});
export const webWorkerExtHostConfig = 'extensions.webWorker';
export const IExtensionService = createDecorator('extensionService');
export class MissingExtensionDependency {
    constructor(dependency) {
        this.dependency = dependency;
    }
}
export var ExtensionHostStartup;
(function (ExtensionHostStartup) {
    /**
     * The extension host should be launched immediately and doesn't require a `$startExtensionHost` call.
     */
    ExtensionHostStartup[ExtensionHostStartup["EagerAutoStart"] = 1] = "EagerAutoStart";
    /**
     * The extension host should be launched immediately and needs a `$startExtensionHost` call.
     */
    ExtensionHostStartup[ExtensionHostStartup["EagerManualStart"] = 2] = "EagerManualStart";
    /**
     * The extension host should be launched lazily and only when it has extensions it needs to host. It needs a `$startExtensionHost` call.
     */
    ExtensionHostStartup[ExtensionHostStartup["Lazy"] = 3] = "Lazy";
})(ExtensionHostStartup || (ExtensionHostStartup = {}));
export class ExtensionHostExtensions {
    get versionId() {
        return this._versionId;
    }
    get allExtensions() {
        return this._allExtensions;
    }
    get myExtensions() {
        return this._myExtensions;
    }
    constructor(versionId, allExtensions, myExtensions) {
        this._versionId = versionId;
        this._allExtensions = allExtensions.slice(0);
        this._myExtensions = myExtensions.slice(0);
        this._myActivationEvents = null;
    }
    toSnapshot() {
        return {
            versionId: this._versionId,
            allExtensions: this._allExtensions,
            myExtensions: this._myExtensions,
            activationEvents: ImplicitActivationEvents.createActivationEventsMap(this._allExtensions)
        };
    }
    set(versionId, allExtensions, myExtensions) {
        if (this._versionId > versionId) {
            throw new Error(`ExtensionHostExtensions: invalid versionId ${versionId} (current: ${this._versionId})`);
        }
        const toRemove = [];
        const toAdd = [];
        const myToRemove = [];
        const myToAdd = [];
        const oldExtensionsMap = extensionDescriptionArrayToMap(this._allExtensions);
        const newExtensionsMap = extensionDescriptionArrayToMap(allExtensions);
        const extensionsAreTheSame = (a, b) => {
            return ((a.extensionLocation.toString() === b.extensionLocation.toString())
                || (a.isBuiltin === b.isBuiltin)
                || (a.isUserBuiltin === b.isUserBuiltin)
                || (a.isUnderDevelopment === b.isUnderDevelopment));
        };
        for (const oldExtension of this._allExtensions) {
            const newExtension = newExtensionsMap.get(oldExtension.identifier);
            if (!newExtension) {
                toRemove.push(oldExtension.identifier);
                oldExtensionsMap.delete(oldExtension.identifier);
                continue;
            }
            if (!extensionsAreTheSame(oldExtension, newExtension)) {
                // The new extension is different than the old one
                // (e.g. maybe it executes in a different location)
                toRemove.push(oldExtension.identifier);
                oldExtensionsMap.delete(oldExtension.identifier);
                continue;
            }
        }
        for (const newExtension of allExtensions) {
            const oldExtension = oldExtensionsMap.get(newExtension.identifier);
            if (!oldExtension) {
                toAdd.push(newExtension);
                continue;
            }
            if (!extensionsAreTheSame(oldExtension, newExtension)) {
                // The new extension is different than the old one
                // (e.g. maybe it executes in a different location)
                toRemove.push(oldExtension.identifier);
                oldExtensionsMap.delete(oldExtension.identifier);
                continue;
            }
        }
        const myOldExtensionsSet = new ExtensionIdentifierSet(this._myExtensions);
        const myNewExtensionsSet = new ExtensionIdentifierSet(myExtensions);
        for (const oldExtensionId of this._myExtensions) {
            if (!myNewExtensionsSet.has(oldExtensionId)) {
                myToRemove.push(oldExtensionId);
            }
        }
        for (const newExtensionId of myExtensions) {
            if (!myOldExtensionsSet.has(newExtensionId)) {
                myToAdd.push(newExtensionId);
            }
        }
        const addActivationEvents = ImplicitActivationEvents.createActivationEventsMap(toAdd);
        const delta = { versionId, toRemove, toAdd, addActivationEvents, myToRemove, myToAdd };
        this.delta(delta);
        return delta;
    }
    delta(extensionsDelta) {
        if (this._versionId >= extensionsDelta.versionId) {
            // ignore older deltas
            return null;
        }
        const { toRemove, toAdd, myToRemove, myToAdd } = extensionsDelta;
        // First handle removals
        const toRemoveSet = new ExtensionIdentifierSet(toRemove);
        const myToRemoveSet = new ExtensionIdentifierSet(myToRemove);
        for (let i = 0; i < this._allExtensions.length; i++) {
            if (toRemoveSet.has(this._allExtensions[i].identifier)) {
                this._allExtensions.splice(i, 1);
                i--;
            }
        }
        for (let i = 0; i < this._myExtensions.length; i++) {
            if (myToRemoveSet.has(this._myExtensions[i])) {
                this._myExtensions.splice(i, 1);
                i--;
            }
        }
        // Then handle additions
        for (const extension of toAdd) {
            this._allExtensions.push(extension);
        }
        for (const extensionId of myToAdd) {
            this._myExtensions.push(extensionId);
        }
        // clear cached activation events
        this._myActivationEvents = null;
        return extensionsDelta;
    }
    containsExtension(extensionId) {
        for (const myExtensionId of this._myExtensions) {
            if (ExtensionIdentifier.equals(myExtensionId, extensionId)) {
                return true;
            }
        }
        return false;
    }
    containsActivationEvent(activationEvent) {
        if (!this._myActivationEvents) {
            this._myActivationEvents = this._readMyActivationEvents();
        }
        return this._myActivationEvents.has(activationEvent);
    }
    _readMyActivationEvents() {
        const result = new Set();
        for (const extensionDescription of this._allExtensions) {
            if (!this.containsExtension(extensionDescription.identifier)) {
                continue;
            }
            const activationEvents = ImplicitActivationEvents.readActivationEvents(extensionDescription);
            for (const activationEvent of activationEvents) {
                result.add(activationEvent);
            }
        }
        return result;
    }
}
function extensionDescriptionArrayToMap(extensions) {
    const result = new ExtensionIdentifierMap();
    for (const extension of extensions) {
        result.set(extension.identifier, extension);
    }
    return result;
}
export function isProposedApiEnabled(extension, proposal) {
    if (!extension.enabledApiProposals) {
        return false;
    }
    return extension.enabledApiProposals.includes(proposal);
}
export function checkProposedApiEnabled(extension, proposal) {
    if (!isProposedApiEnabled(extension, proposal)) {
        throw new Error(`Extension '${extension.identifier.value}' CANNOT use API proposal: ${proposal}.\nIts package.json#enabledApiProposals-property declares: ${extension.enabledApiProposals?.join(', ') ?? '[]'} but NOT ${proposal}.\n The missing proposal MUST be added and you must start in extension development mode or use the following command line switch: --enable-proposed-api ${extension.identifier.value}`);
    }
}
export class ActivationTimes {
    constructor(codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) {
        this.codeLoadingTime = codeLoadingTime;
        this.activateCallTime = activateCallTime;
        this.activateResolvedTime = activateResolvedTime;
        this.activationReason = activationReason;
    }
}
export class ExtensionPointContribution {
    constructor(description, value) {
        this.description = description;
        this.value = value;
    }
}
export var ActivationKind;
(function (ActivationKind) {
    ActivationKind[ActivationKind["Normal"] = 0] = "Normal";
    ActivationKind[ActivationKind["Immediate"] = 1] = "Immediate";
})(ActivationKind || (ActivationKind = {}));
export function toExtension(extensionDescription) {
    return {
        type: extensionDescription.isBuiltin ? 0 /* ExtensionType.System */ : 1 /* ExtensionType.User */,
        isBuiltin: extensionDescription.isBuiltin || extensionDescription.isUserBuiltin,
        identifier: { id: getGalleryExtensionId(extensionDescription.publisher, extensionDescription.name), uuid: extensionDescription.uuid },
        manifest: extensionDescription,
        location: extensionDescription.extensionLocation,
        targetPlatform: extensionDescription.targetPlatform,
        validations: [],
        isValid: true,
        preRelease: extensionDescription.preRelease,
        publisherDisplayName: extensionDescription.publisherDisplayName,
    };
}
export function toExtensionDescription(extension, isUnderDevelopment) {
    const id = getExtensionId(extension.manifest.publisher, extension.manifest.name);
    return {
        id,
        identifier: new ExtensionIdentifier(id),
        isBuiltin: extension.type === 0 /* ExtensionType.System */,
        isUserBuiltin: extension.type === 1 /* ExtensionType.User */ && extension.isBuiltin,
        isUnderDevelopment: !!isUnderDevelopment,
        extensionLocation: extension.location,
        uuid: extension.identifier.uuid,
        targetPlatform: extension.targetPlatform,
        publisherDisplayName: extension.publisherDisplayName,
        preRelease: extension.preRelease,
        ...extension.manifest
    };
}
export class NullExtensionService {
    constructor() {
        this.onDidRegisterExtensions = Event.None;
        this.onDidChangeExtensionsStatus = Event.None;
        this.onDidChangeExtensions = Event.None;
        this.onWillActivateByEvent = Event.None;
        this.onDidChangeResponsiveChange = Event.None;
        this.onWillStop = Event.None;
        this.extensions = [];
    }
    activateByEvent(_activationEvent) { return Promise.resolve(undefined); }
    activateById(extensionId, reason) { return Promise.resolve(undefined); }
    activationEventIsDone(_activationEvent) { return false; }
    whenInstalledExtensionsRegistered() { return Promise.resolve(true); }
    getExtension() { return Promise.resolve(undefined); }
    readExtensionPointContributions(_extPoint) { return Promise.resolve(Object.create(null)); }
    getExtensionsStatus() { return Object.create(null); }
    getInspectPorts(_extensionHostKind, _tryEnableInspector) { return Promise.resolve([]); }
    async stopExtensionHosts() { return true; }
    async startExtensionHosts() { }
    async setRemoteEnvironment(_env) { }
    canAddExtension() { return false; }
    canRemoveExtension() { return false; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxjQUFjLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUNuSSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUN2SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsc0JBQXNCLEVBQTZGLE1BQU0sc0RBQXNELENBQUM7QUFFdE8sT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTzdGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQXdCO0lBQzVFLFVBQVUsRUFBRSxJQUFJLG1CQUFtQixDQUFDLDBCQUEwQixDQUFDO0lBQy9ELElBQUksRUFBRSw0QkFBNEI7SUFDbEMsT0FBTyxFQUFFLE9BQU87SUFDaEIsU0FBUyxFQUFFLFFBQVE7SUFDbkIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtJQUN2QixpQkFBaUIsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQztJQUM3QyxTQUFTLEVBQUUsS0FBSztJQUNoQixjQUFjLDRDQUEwQjtJQUN4QyxhQUFhLEVBQUUsS0FBSztJQUNwQixrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLFVBQVUsRUFBRSxLQUFLO0NBQ2pCLENBQUMsQ0FBQztBQUdILE1B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