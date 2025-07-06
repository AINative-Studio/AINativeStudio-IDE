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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ25JLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxzQkFBc0IsRUFBNkYsTUFBTSxzREFBc0QsQ0FBQztBQUV0TyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFPN0YsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBd0I7SUFDNUUsVUFBVSxFQUFFLElBQUksbUJBQW1CLENBQUMsMEJBQTBCLENBQUM7SUFDL0QsSUFBSSxFQUFFLDRCQUE0QjtJQUNsQyxPQUFPLEVBQUUsT0FBTztJQUNoQixTQUFTLEVBQUUsUUFBUTtJQUNuQixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO0lBQ3ZCLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO0lBQzdDLFNBQVMsRUFBRSxLQUFLO0lBQ2hCLGNBQWMsNENBQTBCO0lBQ3hDLGFBQWEsRUFBRSxLQUFLO0lBQ3BCLGtCQUFrQixFQUFFLEtBQUs7SUFDekIsVUFBVSxFQUFFLEtBQUs7Q0FDakIsQ0FBQyxDQUFDO0FBR0gsTUFB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