/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
export var ExtensionHostKind;
(function (ExtensionHostKind) {
    ExtensionHostKind[ExtensionHostKind["LocalProcess"] = 1] = "LocalProcess";
    ExtensionHostKind[ExtensionHostKind["LocalWebWorker"] = 2] = "LocalWebWorker";
    ExtensionHostKind[ExtensionHostKind["Remote"] = 3] = "Remote";
})(ExtensionHostKind || (ExtensionHostKind = {}));
export function extensionHostKindToString(kind) {
    if (kind === null) {
        return 'None';
    }
    switch (kind) {
        case 1 /* ExtensionHostKind.LocalProcess */: return 'LocalProcess';
        case 2 /* ExtensionHostKind.LocalWebWorker */: return 'LocalWebWorker';
        case 3 /* ExtensionHostKind.Remote */: return 'Remote';
    }
}
export var ExtensionRunningPreference;
(function (ExtensionRunningPreference) {
    ExtensionRunningPreference[ExtensionRunningPreference["None"] = 0] = "None";
    ExtensionRunningPreference[ExtensionRunningPreference["Local"] = 1] = "Local";
    ExtensionRunningPreference[ExtensionRunningPreference["Remote"] = 2] = "Remote";
})(ExtensionRunningPreference || (ExtensionRunningPreference = {}));
export function extensionRunningPreferenceToString(preference) {
    switch (preference) {
        case 0 /* ExtensionRunningPreference.None */:
            return 'None';
        case 1 /* ExtensionRunningPreference.Local */:
            return 'Local';
        case 2 /* ExtensionRunningPreference.Remote */:
            return 'Remote';
    }
}
export function determineExtensionHostKinds(_localExtensions, _remoteExtensions, getExtensionKind, pickExtensionHostKind) {
    const localExtensions = toExtensionWithKind(_localExtensions, getExtensionKind);
    const remoteExtensions = toExtensionWithKind(_remoteExtensions, getExtensionKind);
    const allExtensions = new Map();
    const collectExtension = (ext) => {
        if (allExtensions.has(ext.key)) {
            return;
        }
        const local = localExtensions.get(ext.key) || null;
        const remote = remoteExtensions.get(ext.key) || null;
        const info = new ExtensionInfo(local, remote);
        allExtensions.set(info.key, info);
    };
    localExtensions.forEach((ext) => collectExtension(ext));
    remoteExtensions.forEach((ext) => collectExtension(ext));
    const extensionHostKinds = new Map();
    allExtensions.forEach((ext) => {
        const isInstalledLocally = Boolean(ext.local);
        const isInstalledRemotely = Boolean(ext.remote);
        const isLocallyUnderDevelopment = Boolean(ext.local && ext.local.isUnderDevelopment);
        const isRemotelyUnderDevelopment = Boolean(ext.remote && ext.remote.isUnderDevelopment);
        let preference = 0 /* ExtensionRunningPreference.None */;
        if (isLocallyUnderDevelopment && !isRemotelyUnderDevelopment) {
            preference = 1 /* ExtensionRunningPreference.Local */;
        }
        else if (isRemotelyUnderDevelopment && !isLocallyUnderDevelopment) {
            preference = 2 /* ExtensionRunningPreference.Remote */;
        }
        extensionHostKinds.set(ext.key, pickExtensionHostKind(ext.identifier, ext.kind, isInstalledLocally, isInstalledRemotely, preference));
    });
    return extensionHostKinds;
}
function toExtensionWithKind(extensions, getExtensionKind) {
    const result = new Map();
    extensions.forEach((desc) => {
        const ext = new ExtensionWithKind(desc, getExtensionKind(desc));
        result.set(ext.key, ext);
    });
    return result;
}
class ExtensionWithKind {
    constructor(desc, kind) {
        this.desc = desc;
        this.kind = kind;
    }
    get key() {
        return ExtensionIdentifier.toKey(this.desc.identifier);
    }
    get isUnderDevelopment() {
        return this.desc.isUnderDevelopment;
    }
}
class ExtensionInfo {
    constructor(local, remote) {
        this.local = local;
        this.remote = remote;
    }
    get key() {
        if (this.local) {
            return this.local.key;
        }
        return this.remote.key;
    }
    get identifier() {
        if (this.local) {
            return this.local.desc.identifier;
        }
        return this.remote.desc.identifier;
    }
    get kind() {
        // in case of disagreements between extension kinds, it is always
        // better to pick the local extension because it has a much higher
        // chance of being up-to-date
        if (this.local) {
            return this.local.kind;
        }
        return this.remote.kind;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdEtpbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbkhvc3RLaW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSxzREFBc0QsQ0FBQztBQUVsSCxNQUFNLENBQU4sSUFBa0IsaUJBSWpCO0FBSkQsV0FBa0IsaUJBQWlCO0lBQ2xDLHlFQUFnQixDQUFBO0lBQ2hCLDZFQUFrQixDQUFBO0lBQ2xCLDZEQUFVLENBQUE7QUFDWCxDQUFDLEVBSmlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFJbEM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQUMsSUFBOEI7SUFDdkUsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDbkIsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBQ0QsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNkLDJDQUFtQyxDQUFDLENBQUMsT0FBTyxjQUFjLENBQUM7UUFDM0QsNkNBQXFDLENBQUMsQ0FBQyxPQUFPLGdCQUFnQixDQUFDO1FBQy9ELHFDQUE2QixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUM7SUFDaEQsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLENBQU4sSUFBa0IsMEJBSWpCO0FBSkQsV0FBa0IsMEJBQTBCO0lBQzNDLDJFQUFJLENBQUE7SUFDSiw2RUFBSyxDQUFBO0lBQ0wsK0VBQU0sQ0FBQTtBQUNQLENBQUMsRUFKaUIsMEJBQTBCLEtBQTFCLDBCQUEwQixRQUkzQztBQUVELE1BQU0sVUFBVSxrQ0FBa0MsQ0FBQyxVQUFzQztJQUN4RixRQUFRLFVBQVUsRUFBRSxDQUFDO1FBQ3BCO1lBQ0MsT0FBTyxNQUFN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