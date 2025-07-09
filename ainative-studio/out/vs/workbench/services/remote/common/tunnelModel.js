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
import * as nls from '../../../../nls.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITunnelService, TunnelProtocol, TunnelPrivacyId, LOCALHOST_ADDRESSES, isLocalhost, isAllInterfaces, ProvidedOnAutoForward, ALL_INTERFACES_ADDRESSES } from '../../../../platform/tunnel/common/tunnel.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isNumber, isObject, isString } from '../../../../base/common/types.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
const MISMATCH_LOCAL_PORT_COOLDOWN = 10 * 1000; // 10 seconds
const TUNNELS_TO_RESTORE = 'remote.tunnels.toRestore';
const TUNNELS_TO_RESTORE_EXPIRATION = 'remote.tunnels.toRestoreExpiration';
const RESTORE_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 14; // 2 weeks
export const ACTIVATION_EVENT = 'onTunnel';
export const forwardedPortsFeaturesEnabled = new RawContextKey('forwardedPortsViewEnabled', false, nls.localize('tunnel.forwardedPortsViewEnabled', "Whether the Ports view is enabled."));
export const forwardedPortsViewEnabled = new RawContextKey('forwardedPortsViewOnlyEnabled', false, nls.localize('tunnel.forwardedPortsViewEnabled', "Whether the Ports view is enabled."));
export function parseAddress(address) {
    const matches = address.match(/^([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*:)?([0-9]+)$/);
    if (!matches) {
        return undefined;
    }
    return { host: matches[1]?.substring(0, matches[1].length - 1) || 'localhost', port: Number(matches[2]) };
}
export var TunnelCloseReason;
(function (TunnelCloseReason) {
    TunnelCloseReason["Other"] = "Other";
    TunnelCloseReason["User"] = "User";
    TunnelCloseReason["AutoForwardEnd"] = "AutoForwardEnd";
})(TunnelCloseReason || (TunnelCloseReason = {}));
export var TunnelSource;
(function (TunnelSource) {
    TunnelSource[TunnelSource["User"] = 0] = "User";
    TunnelSource[TunnelSource["Auto"] = 1] = "Auto";
    TunnelSource[TunnelSource["Extension"] = 2] = "Extension";
})(TunnelSource || (TunnelSource = {}));
export const UserTunnelSource = {
    source: TunnelSource.User,
    description: nls.localize('tunnel.source.user', "User Forwarded")
};
export const AutoTunnelSource = {
    source: TunnelSource.Auto,
    description: nls.localize('tunnel.source.auto', "Auto Forwarded")
};
export function mapHasAddress(map, host, port) {
    const initialAddress = map.get(makeAddress(host, port));
    if (initialAddress) {
        return initialAddress;
    }
    if (isLocalhost(host)) {
        // Do localhost checks
        for (const testHost of LOCALHOST_ADDRESSES) {
            const testAddress = makeAddress(testHost, port);
            if (map.has(testAddress)) {
                return map.get(testAddress);
            }
        }
    }
    else if (isAllInterfaces(host)) {
        // Do all interfaces checks
        for (const testHost of ALL_INTERFACES_ADDRESSES) {
            const testAddress = makeAddress(testHost, port);
            if (map.has(testAddress)) {
                return map.get(testAddress);
            }
        }
    }
    return undefined;
}
export function mapHasAddressLocalhostOrAllInterfaces(map, host, port) {
    const originalAddress = mapHasAddress(map, host, port);
    if (originalAddress) {
        return originalAddress;
    }
    const otherHost = isAllInterfaces(host) ? 'localhost' : (isLocalhost(host) ? '0.0.0.0' : undefined);
    if (otherHost) {
        return mapHasAddress(map, otherHost, port);
    }
    return undefined;
}
export function makeAddress(host, port) {
    return host + ':' + port;
}
export var OnPortForward;
(function (OnPortForward) {
    OnPortForward["Notify"] = "notify";
    OnPortForward["OpenBrowser"] = "openBrowser";
    OnPortForward["OpenBrowserOnce"] = "openBrowserOnce";
    OnPortForward["OpenPreview"] = "openPreview";
    OnPortForward["Silent"] = "silent";
    OnPortForward["Ignore"] = "ignore";
})(OnPortForward || (OnPortForward = {}));
export function isCandidatePort(candidate) {
    return candidate && 'host' in candidate && typeof candidate.host === 'string'
        && 'port' in candidate && typeof candidate.port === 'number'
        && (!('detail' in candidate) || typeof candidate.detail === 'string')
        && (!('pid' in candidate) || typeof candidate.pid === 'string');
}
export class PortsAttributes extends Disposable {
    static { this.SETTING = 'remote.portsAttributes'; }
    static { this.DEFAULTS = 'remote.otherPortsAttributes'; }
    static { this.RANGE = /^(\d+)\-(\d+)$/; }
    static { this.HOST_AND_PORT = /^([a-z0-9\-]+):(\d{1,5})$/; }
    constructor(configurationService) {
        super();
        this.configurationService = configurationService;
        this.portsAttributes = [];
        this._onDidChangeAttributes = new Emitter();
        this.onDidChangeAttributes = this._onDidChangeAttributes.event;
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(PortsAttributes.SETTING) || e.affectsConfiguration(PortsAttributes.DEFAULTS)) {
                this.updateAttributes();
            }
        }));
        this.updateAttributes();
    }
    updateAttributes() {
        this.portsAttributes = this.readSetting();
        this._onDidChangeAttributes.fire();
    }
    getAttributes(port, host, commandLine) {
        let index = this.findNextIndex(port, host, commandLine, this.portsAttributes, 0);
        const attributes = {
            label: undefined,
            onAutoForward: undefined,
            elevateIfNeeded: undefined,
            requireLocalPort: undefined,
            protocol: undefined
        };
        while (index >= 0) {
            const found = this.portsAttributes[index];
            if (found.key === port) {
                attributes.onAutoForward = found.onAutoForward ?? attributes.onAutoForward;
                attributes.elevateIfNeeded = (found.elevateIfNeeded !== undefined) ? found.elevateIfNeeded : attributes.elevateIfNeeded;
                attributes.label = found.label ?? attributes.label;
                attributes.requireLocalPort = found.requireLocalPort;
                attributes.protocol = found.protocol;
            }
            else {
                // It's a range or regex, which means that if the attribute is already set, we keep it
                attributes.onAutoForward = attributes.onAutoForward ?? found.onAutoForward;
                attributes.elevateIfNeeded = (attributes.elevateIfNeeded !== undefined) ? attributes.elevateIfNeeded : found.elevateIfNeeded;
                attributes.label = attributes.label ?? found.label;
                attributes.requireLocalPort = (attributes.requireLocalPort !== undefined) ? attributes.requireLocalPort : undefined;
                attributes.protocol = attributes.protocol ?? found.protocol;
            }
            index = this.findNextIndex(port, host, commandLine, this.portsAttributes, index + 1);
        }
        if (attributes.onAutoForward !== undefined || attributes.elevateIfNeeded !== undefined
            || attributes.label !== undefined || attributes.requireLocalPort !== undefined
            || attributes.protocol !== undefined) {
            return attributes;
        }
        // If we find no matches, then use the other port attributes.
        return this.getOtherAttributes();
    }
    hasStartEnd(value) {
        return (value.start !== undefined) && (value.end !== undefined);
    }
    hasHostAndPort(value) {
        return (value.host !== undefined) && (value.port !== undefined)
            && isString(value.host) && isNumber(value.port);
    }
    findNextIndex(port, host, commandLine, attributes, fromIndex) {
        if (fromIndex >= attributes.length) {
            return -1;
        }
        const shouldUseHost = !isLocalhost(host) && !isAllInterfaces(host);
        const sliced = attributes.slice(fromIndex);
        const foundIndex = sliced.findIndex((value) => {
            if (isNumber(value.key)) {
                return shouldUseHost ? false : value.key === port;
            }
            else if (this.hasStartEnd(value.key)) {
                return shouldUseHost ? false : (port >= value.key.start && port <= value.key.end);
            }
            else if (this.hasHostAndPort(value.key)) {
                return (port === value.key.port) && (host === value.key.host);
            }
            else {
                return commandLine ? value.key.test(commandLine) : false;
            }
        });
        return foundIndex >= 0 ? foundIndex + fromIndex : -1;
    }
    readSetting() {
        const settingValue = this.configurationService.getValue(PortsAttributes.SETTING);
        if (!settingValue || !isObject(settingValue)) {
            return [];
        }
        const attributes = [];
        for (const attributesKey in settingValue) {
            if (attributesKey === undefined) {
                continue;
            }
            const setting = settingValue[attributesKey];
            let key = undefined;
            if (Number(attributesKey)) {
                key = Number(attributesKey);
            }
            else if (isString(attributesKey)) {
                if (PortsAttributes.RANGE.test(attributesKey)) {
                    const match = attributesKey.match(PortsAttributes.RANGE);
                    key = { start: Number(match[1]), end: Number(match[2]) };
                }
                else if (PortsAttributes.HOST_AND_PORT.test(attributesKey)) {
                    const match = attributesKey.match(PortsAttributes.HOST_AND_PORT);
                    key = { host: match[1], port: Number(match[2]) };
                }
                else {
                    let regTest = undefined;
                    try {
                        regTest = RegExp(attributesKey);
                    }
                    catch (e) {
                        // The user entered an invalid regular expression.
                    }
                    if (regTest) {
                        key = regTest;
                    }
                }
            }
            if (!key) {
                continue;
            }
            attributes.push({
                key: key,
                elevateIfNeeded: setting.elevateIfNeeded,
                onAutoForward: setting.onAutoForward,
                label: setting.label,
                requireLocalPort: setting.requireLocalPort,
                protocol: setting.protocol
            });
        }
        const defaults = this.configurationService.getValue(PortsAttributes.DEFAULTS);
        if (defaults) {
            this.defaultPortAttributes = {
                elevateIfNeeded: defaults.elevateIfNeeded,
                label: defaults.label,
                onAutoForward: defaults.onAutoForward,
                requireLocalPort: defaults.requireLocalPort,
                protocol: defaults.protocol
            };
        }
        return this.sortAttributes(attributes);
    }
    sortAttributes(attributes) {
        function getVal(item, thisRef) {
            if (isNumber(item.key)) {
                return item.key;
            }
            else if (thisRef.hasStartEnd(item.key)) {
                return item.key.start;
            }
            else if (thisRef.hasHostAndPort(item.key)) {
                return item.key.port;
            }
            else {
                return Number.MAX_VALUE;
            }
        }
        return attributes.sort((a, b) => {
            return getVal(a, this) - getVal(b, this);
        });
    }
    getOtherAttributes() {
        return this.defaultPortAttributes;
    }
    static providedActionToAction(providedAction) {
        switch (providedAction) {
            case ProvidedOnAutoForward.Notify: return OnPortForward.Notify;
            case ProvidedOnAutoForward.OpenBrowser: return OnPortForward.OpenBrowser;
            case ProvidedOnAutoForward.OpenBrowserOnce: return OnPortForward.OpenBrowserOnce;
            case ProvidedOnAutoForward.OpenPreview: return OnPortForward.OpenPreview;
            case ProvidedOnAutoForward.Silent: return OnPortForward.Silent;
            case ProvidedOnAutoForward.Ignore: return OnPortForward.Ignore;
            default: return undefined;
        }
    }
    async addAttributes(port, attributes, target) {
        const settingValue = this.configurationService.inspect(PortsAttributes.SETTING);
        const remoteValue = settingValue.userRemoteValue;
        let newRemoteValue;
        if (!remoteValue || !isObject(remoteValue)) {
            newRemoteValue = {};
        }
        else {
            newRemoteValue = deepClone(remoteValue);
        }
        if (!newRemoteValue[`${port}`]) {
            newRemoteValue[`${port}`] = {};
        }
        for (const attribute in attributes) {
            newRemoteValue[`${port}`][attribute] = attributes[attribute];
        }
        return this.configurationService.updateValue(PortsAttributes.SETTING, newRemoteValue, target);
    }
}
let TunnelModel = class TunnelModel extends Disposable {
    constructor(tunnelService, storageService, configurationService, environmentService, remoteAuthorityResolverService, workspaceContextService, logService, dialogService, extensionService, contextKeyService) {
        super();
        this.tunnelService = tunnelService;
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this.workspaceContextService = workspaceContextService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.extensionService = extensionService;
        this.contextKeyService = contextKeyService;
        this.inProgress = new Map();
        this._onForwardPort = new Emitter();
        this.onForwardPort = this._onForwardPort.event;
        this._onClosePort = new Emitter();
        this.onClosePort = this._onClosePort.event;
        this._onPortName = new Emitter();
        this.onPortName = this._onPortName.event;
        this._onCandidatesChanged = new Emitter();
        // onCandidateChanged returns the removed candidates
        this.onCandidatesChanged = this._onCandidatesChanged.event;
        this._onEnvironmentTunnelsSet = new Emitter();
        this.onEnvironmentTunnelsSet = this._onEnvironmentTunnelsSet.event;
        this._environmentTunnelsSet = false;
        this.restoreListener = undefined;
        this.restoreComplete = false;
        this.onRestoreComplete = new Emitter();
        this.unrestoredExtensionTunnels = new Map();
        this.sessionCachedProperties = new Map();
        this.portAttributesProviders = [];
        this.hasCheckedExtensionsOnTunnelOpened = false;
        this.mismatchCooldown = new Date();
        this.configPortsAttributes = new PortsAttributes(configurationService);
        this.tunnelRestoreValue = this.getTunnelRestoreValue();
        this._register(this.configPortsAttributes.onDidChangeAttributes(this.updateAttributes, this));
        this.forwarded = new Map();
        this.remoteTunnels = new Map();
        this.tunnelService.tunnels.then(async (tunnels) => {
            const attributes = await this.getAttributes(tunnels.map(tunnel => {
                return { port: tunnel.tunnelRemotePort, host: tunnel.tunnelRemoteHost };
            }));
            for (const tunnel of tunnels) {
                if (tunnel.localAddress) {
                    const key = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                    const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                    this.forwarded.set(key, {
                        remotePort: tunnel.tunnelRemotePort,
                        remoteHost: tunnel.tunnelRemoteHost,
                        localAddress: tunnel.localAddress,
                        protocol: attributes?.get(tunnel.tunnelRemotePort)?.protocol ?? TunnelProtocol.Http,
                        localUri: await this.makeLocalUri(tunnel.localAddress, attributes?.get(tunnel.tunnelRemotePort)),
                        localPort: tunnel.tunnelLocalPort,
                        name: attributes?.get(tunnel.tunnelRemotePort)?.label,
                        runningProcess: matchingCandidate?.detail,
                        hasRunningProcess: !!matchingCandidate,
                        pid: matchingCandidate?.pid,
                        privacy: tunnel.privacy,
                        source: UserTunnelSource,
                    });
                    this.remoteTunnels.set(key, tunnel);
                }
            }
        });
        this.detected = new Map();
        this._register(this.tunnelService.onTunnelOpened(async (tunnel) => {
            const key = makeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
            if (!mapHasAddressLocalhostOrAllInterfaces(this.forwarded, tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort)
                && !mapHasAddressLocalhostOrAllInterfaces(this.detected, tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort)
                && !mapHasAddressLocalhostOrAllInterfaces(this.inProgress, tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort)
                && tunnel.localAddress) {
                const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
                const attributes = (await this.getAttributes([{ port: tunnel.tunnelRemotePort, host: tunnel.tunnelRemoteHost }]))?.get(tunnel.tunnelRemotePort);
                this.forwarded.set(key, {
                    remoteHost: tunnel.tunnelRemoteHost,
                    remotePort: tunnel.tunnelRemotePort,
                    localAddress: tunnel.localAddress,
                    protocol: attributes?.protocol ?? TunnelProtocol.Http,
                    localUri: await this.makeLocalUri(tunnel.localAddress, attributes),
                    localPort: tunnel.tunnelLocalPort,
                    name: attributes?.label,
                    closeable: true,
                    runningProcess: matchingCandidate?.detail,
                    hasRunningProcess: !!matchingCandidate,
                    pid: matchingCandidate?.pid,
                    privacy: tunnel.privacy,
                    source: UserTunnelSource,
                });
            }
            await this.storeForwarded();
            this.checkExtensionActivationEvents(true);
            this.remoteTunnels.set(key, tunnel);
            this._onForwardPort.fire(this.forwarded.get(key));
        }));
        this._register(this.tunnelService.onTunnelClosed(address => {
            return this.onTunnelClosed(address, TunnelCloseReason.Other);
        }));
        this.checkExtensionActivationEvents(false);
    }
    extensionHasActivationEvent() {
        if (this.extensionService.extensions.find(extension => extension.activationEvents?.includes(ACTIVATION_EVENT))) {
            this.contextKeyService.createKey(forwardedPortsViewEnabled.key, true);
            return true;
        }
        return false;
    }
    checkExtensionActivationEvents(tunnelOpened) {
        if (this.hasCheckedExtensionsOnTunnelOpened) {
            return;
        }
        if (tunnelOpened) {
            this.hasCheckedExtensionsOnTunnelOpened = true;
        }
        const hasRemote = this.environmentService.remoteAuthority !== undefined;
        if (hasRemote && !tunnelOpened) {
            // We don't activate extensions on startup if there is a remote
            return;
        }
        if (this.extensionHasActivationEvent()) {
            return;
        }
        const activationDisposable = this._register(this.extensionService.onDidRegisterExtensions(() => {
            if (this.extensionHasActivationEvent()) {
                activationDisposable.dispose();
            }
        }));
    }
    async onTunnelClosed(address, reason) {
        const key = makeAddress(address.host, address.port);
        if (this.forwarded.has(key)) {
            this.forwarded.delete(key);
            await this.storeForwarded();
            this._onClosePort.fire(address);
        }
    }
    makeLocalUri(localAddress, attributes) {
        if (localAddress.startsWith('http')) {
            return URI.parse(localAddress);
        }
        const protocol = attributes?.protocol ?? 'http';
        return URI.parse(`${protocol}://${localAddress}`);
    }
    async addStorageKeyPostfix(prefix) {
        const workspace = this.workspaceContextService.getWorkspace();
        const workspaceHash = workspace.configuration ? hash(workspace.configuration.path) : (workspace.folders.length > 0 ? hash(workspace.folders[0].uri.path) : undefined);
        if (workspaceHash === undefined) {
            this.logService.debug('Could not get workspace hash for forwarded ports storage key.');
            return undefined;
        }
        return `${prefix}.${this.environmentService.remoteAuthority}.${workspaceHash}`;
    }
    async getTunnelRestoreStorageKey() {
        return this.addStorageKeyPostfix(TUNNELS_TO_RESTORE);
    }
    async getRestoreExpirationStorageKey() {
        return this.addStorageKeyPostfix(TUNNELS_TO_RESTORE_EXPIRATION);
    }
    async getTunnelRestoreValue() {
        const deprecatedValue = this.storageService.get(TUNNELS_TO_RESTORE, 1 /* StorageScope.WORKSPACE */);
        if (deprecatedValue) {
            this.storageService.remove(TUNNELS_TO_RESTORE, 1 /* StorageScope.WORKSPACE */);
            await this.storeForwarded();
            return deprecatedValue;
        }
        const storageKey = await this.getTunnelRestoreStorageKey();
        if (!storageKey) {
            return undefined;
        }
        return this.storageService.get(storageKey, 0 /* StorageScope.PROFILE */);
    }
    async restoreForwarded() {
        this.cleanupExpiredTunnelsForRestore();
        if (this.configurationService.getValue('remote.restoreForwardedPorts')) {
            const tunnelRestoreValue = await this.tunnelRestoreValue;
            if (tunnelRestoreValue && (tunnelRestoreValue !== this.knownPortsRestoreValue)) {
                const tunnels = JSON.parse(tunnelRestoreValue) ?? [];
                this.logService.trace(`ForwardedPorts: (TunnelModel) restoring ports ${tunnels.map(tunnel => tunnel.remotePort).join(', ')}`);
                for (const tunnel of tunnels) {
                    const alreadyForwarded = mapHasAddressLocalhostOrAllInterfaces(this.detected, tunnel.remoteHost, tunnel.remotePort);
                    // Extension forwarded ports should only be updated, not restored.
                    if ((tunnel.source.source !== TunnelSource.Extension && !alreadyForwarded) || (tunnel.source.source === TunnelSource.Extension && alreadyForwarded)) {
                        await this.doForward({
                            remote: { host: tunnel.remoteHost, port: tunnel.remotePort },
                            local: tunnel.localPort,
                            name: tunnel.name,
                            elevateIfNeeded: true,
                            source: tunnel.source
                        });
                    }
                    else if (tunnel.source.source === TunnelSource.Extension && !alreadyForwarded) {
                        this.unrestoredExtensionTunnels.set(makeAddress(tunnel.remoteHost, tunnel.remotePort), tunnel);
                    }
                }
            }
        }
        this.restoreComplete = true;
        this.onRestoreComplete.fire();
        if (!this.restoreListener) {
            // It's possible that at restore time the value hasn't synced.
            const key = await this.getTunnelRestoreStorageKey();
            this.restoreListener = this._register(new DisposableStore());
            this.restoreListener.add(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this.restoreListener)(async (e) => {
                if (e.key === key) {
                    this.tunnelRestoreValue = Promise.resolve(this.storageService.get(key, 0 /* StorageScope.PROFILE */));
                    await this.restoreForwarded();
                }
            }));
        }
    }
    cleanupExpiredTunnelsForRestore() {
        const keys = this.storageService.keys(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */).filter(key => key.startsWith(TUNNELS_TO_RESTORE_EXPIRATION));
        for (const key of keys) {
            const expiration = this.storageService.getNumber(key, 0 /* StorageScope.PROFILE */);
            if (expiration && expiration < Date.now()) {
                this.tunnelRestoreValue = Promise.resolve(undefined);
                const storageKey = key.replace(TUNNELS_TO_RESTORE_EXPIRATION, TUNNELS_TO_RESTORE);
                this.storageService.remove(key, 0 /* StorageScope.PROFILE */);
                this.storageService.remove(storageKey, 0 /* StorageScope.PROFILE */);
            }
        }
    }
    async storeForwarded() {
        if (this.configurationService.getValue('remote.restoreForwardedPorts')) {
            const forwarded = Array.from(this.forwarded.values());
            const restorableTunnels = forwarded.map(tunnel => {
                return {
                    remoteHost: tunnel.remoteHost,
                    remotePort: tunnel.remotePort,
                    localPort: tunnel.localPort,
                    name: tunnel.name,
                    localAddress: tunnel.localAddress,
                    localUri: tunnel.localUri,
                    protocol: tunnel.protocol,
                    source: tunnel.source,
                };
            });
            let valueToStore;
            if (forwarded.length > 0) {
                valueToStore = JSON.stringify(restorableTunnels);
            }
            const key = await this.getTunnelRestoreStorageKey();
            const expirationKey = await this.getRestoreExpirationStorageKey();
            if (!valueToStore && key && expirationKey) {
                this.storageService.remove(key, 0 /* StorageScope.PROFILE */);
                this.storageService.remove(expirationKey, 0 /* StorageScope.PROFILE */);
            }
            else if ((valueToStore !== this.knownPortsRestoreValue) && key && expirationKey) {
                this.storageService.store(key, valueToStore, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                this.storageService.store(expirationKey, Date.now() + RESTORE_EXPIRATION_TIME, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
            this.knownPortsRestoreValue = valueToStore;
        }
    }
    async showPortMismatchModalIfNeeded(tunnel, expectedLocal, attributes) {
        if (!tunnel.tunnelLocalPort || !attributes?.requireLocalPort) {
            return;
        }
        if (tunnel.tunnelLocalPort === expectedLocal) {
            return;
        }
        const newCooldown = new Date();
        if ((this.mismatchCooldown.getTime() + MISMATCH_LOCAL_PORT_COOLDOWN) > newCooldown.getTime()) {
            return;
        }
        this.mismatchCooldown = newCooldown;
        const mismatchString = nls.localize('remote.localPortMismatch.single', "Local port {0} could not be used for forwarding to remote port {1}.\n\nThis usually happens when there is already another process using local port {0}.\n\nPort number {2} has been used instead.", expectedLocal, tunnel.tunnelRemotePort, tunnel.tunnelLocalPort);
        return this.dialogService.info(mismatchString);
    }
    async forward(tunnelProperties, attributes) {
        if (!this.restoreComplete && this.environmentService.remoteAuthority) {
            await Event.toPromise(this.onRestoreComplete.event);
        }
        return this.doForward(tunnelProperties, attributes);
    }
    async doForward(tunnelProperties, attributes) {
        await this.extensionService.activateByEvent(ACTIVATION_EVENT);
        const existingTunnel = mapHasAddressLocalhostOrAllInterfaces(this.forwarded, tunnelProperties.remote.host, tunnelProperties.remote.port);
        attributes = attributes ??
            ((attributes !== null)
                ? (await this.getAttributes([tunnelProperties.remote]))?.get(tunnelProperties.remote.port)
                : undefined);
        const localPort = (tunnelProperties.local !== undefined) ? tunnelProperties.local : tunnelProperties.remote.port;
        let noTunnelValue;
        if (!existingTunnel) {
            const authority = this.environmentService.remoteAuthority;
            const addressProvider = authority ? {
                getAddress: async () => { return (await this.remoteAuthorityResolverService.resolveAuthority(authority)).authority; }
            } : undefined;
            const key = makeAddress(tunnelProperties.remote.host, tunnelProperties.remote.port);
            this.inProgress.set(key, true);
            tunnelProperties = this.mergeCachedAndUnrestoredProperties(key, tunnelProperties);
            const tunnel = await this.tunnelService.openTunnel(addressProvider, tunnelProperties.remote.host, tunnelProperties.remote.port, undefined, localPort, (!tunnelProperties.elevateIfNeeded) ? attributes?.elevateIfNeeded : tunnelProperties.elevateIfNeeded, tunnelProperties.privacy, attributes?.protocol);
            if (typeof tunnel === 'string') {
                // There was an error  while creating the tunnel.
                noTunnelValue = tunnel;
            }
            else if (tunnel && tunnel.localAddress) {
                const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), tunnelProperties.remote.host, tunnelProperties.remote.port);
                const protocol = (tunnel.protocol ?
                    ((tunnel.protocol === TunnelProtocol.Https) ? TunnelProtocol.Https : TunnelProtocol.Http)
                    : (attributes?.protocol ?? TunnelProtocol.Http));
                const newForward = {
                    remoteHost: tunnel.tunnelRemoteHost,
                    remotePort: tunnel.tunnelRemotePort,
                    localPort: tunnel.tunnelLocalPort,
                    name: attributes?.label ?? tunnelProperties.name,
                    closeable: true,
                    localAddress: tunnel.localAddress,
                    protocol,
                    localUri: await this.makeLocalUri(tunnel.localAddress, attributes),
                    runningProcess: matchingCandidate?.detail,
                    hasRunningProcess: !!matchingCandidate,
                    pid: matchingCandidate?.pid,
                    source: tunnelProperties.source ?? UserTunnelSource,
                    privacy: tunnel.privacy,
                };
                this.forwarded.set(key, newForward);
                this.remoteTunnels.set(key, tunnel);
                this.inProgress.delete(key);
                await this.storeForwarded();
                await this.showPortMismatchModalIfNeeded(tunnel, localPort, attributes);
                this._onForwardPort.fire(newForward);
                return tunnel;
            }
            this.inProgress.delete(key);
        }
        else {
            return this.mergeAttributesIntoExistingTunnel(existingTunnel, tunnelProperties, attributes);
        }
        return noTunnelValue;
    }
    mergeCachedAndUnrestoredProperties(key, tunnelProperties) {
        const map = this.unrestoredExtensionTunnels.has(key) ? this.unrestoredExtensionTunnels : (this.sessionCachedProperties.has(key) ? this.sessionCachedProperties : undefined);
        if (map) {
            const updateProps = map.get(key);
            map.delete(key);
            if (updateProps) {
                tunnelProperties.name = updateProps.name ?? tunnelProperties.name;
                tunnelProperties.local = (('local' in updateProps) ? updateProps.local : (('localPort' in updateProps) ? updateProps.localPort : undefined)) ?? tunnelProperties.local;
                tunnelProperties.privacy = tunnelProperties.privacy;
            }
        }
        return tunnelProperties;
    }
    async mergeAttributesIntoExistingTunnel(existingTunnel, tunnelProperties, attributes) {
        const newName = attributes?.label ?? tunnelProperties.name;
        let MergedAttributeAction;
        (function (MergedAttributeAction) {
            MergedAttributeAction[MergedAttributeAction["None"] = 0] = "None";
            MergedAttributeAction[MergedAttributeAction["Fire"] = 1] = "Fire";
            MergedAttributeAction[MergedAttributeAction["Reopen"] = 2] = "Reopen";
        })(MergedAttributeAction || (MergedAttributeAction = {}));
        let mergedAction = MergedAttributeAction.None;
        if (newName !== existingTunnel.name) {
            existingTunnel.name = newName;
            mergedAction = MergedAttributeAction.Fire;
        }
        // Source of existing tunnel wins so that original source is maintained
        if ((attributes?.protocol || (existingTunnel.protocol !== TunnelProtocol.Http)) && (attributes?.protocol !== existingTunnel.protocol)) {
            tunnelProperties.source = existingTunnel.source;
            mergedAction = MergedAttributeAction.Reopen;
        }
        // New privacy value wins
        if (tunnelProperties.privacy && (existingTunnel.privacy !== tunnelProperties.privacy)) {
            mergedAction = MergedAttributeAction.Reopen;
        }
        switch (mergedAction) {
            case MergedAttributeAction.Fire: {
                this._onForwardPort.fire();
                break;
            }
            case MergedAttributeAction.Reopen: {
                await this.close(existingTunnel.remoteHost, existingTunnel.remotePort, TunnelCloseReason.User);
                await this.doForward(tunnelProperties, attributes);
            }
        }
        return mapHasAddressLocalhostOrAllInterfaces(this.remoteTunnels, tunnelProperties.remote.host, tunnelProperties.remote.port);
    }
    async name(host, port, name) {
        const existingForwarded = mapHasAddressLocalhostOrAllInterfaces(this.forwarded, host, port);
        const key = makeAddress(host, port);
        if (existingForwarded) {
            existingForwarded.name = name;
            await this.storeForwarded();
            this._onPortName.fire({ host, port });
            return;
        }
        else if (this.detected.has(key)) {
            this.detected.get(key).name = name;
            this._onPortName.fire({ host, port });
        }
    }
    async close(host, port, reason) {
        const key = makeAddress(host, port);
        const oldTunnel = this.forwarded.get(key);
        if ((reason === TunnelCloseReason.AutoForwardEnd) && oldTunnel && (oldTunnel.source.source === TunnelSource.Auto)) {
            this.sessionCachedProperties.set(key, {
                local: oldTunnel.localPort,
                name: oldTunnel.name,
                privacy: oldTunnel.privacy,
            });
        }
        await this.tunnelService.closeTunnel(host, port);
        return this.onTunnelClosed({ host, port }, reason);
    }
    address(host, port) {
        const key = makeAddress(host, port);
        return (this.forwarded.get(key) || this.detected.get(key))?.localAddress;
    }
    get environmentTunnelsSet() {
        return this._environmentTunnelsSet;
    }
    addEnvironmentTunnels(tunnels) {
        if (tunnels) {
            for (const tunnel of tunnels) {
                const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), tunnel.remoteAddress.host, tunnel.remoteAddress.port);
                const localAddress = typeof tunnel.localAddress === 'string' ? tunnel.localAddress : makeAddress(tunnel.localAddress.host, tunnel.localAddress.port);
                this.detected.set(makeAddress(tunnel.remoteAddress.host, tunnel.remoteAddress.port), {
                    remoteHost: tunnel.remoteAddress.host,
                    remotePort: tunnel.remoteAddress.port,
                    localAddress: localAddress,
                    protocol: TunnelProtocol.Http,
                    localUri: this.makeLocalUri(localAddress),
                    closeable: false,
                    runningProcess: matchingCandidate?.detail,
                    hasRunningProcess: !!matchingCandidate,
                    pid: matchingCandidate?.pid,
                    privacy: TunnelPrivacyId.ConstantPrivate,
                    source: {
                        source: TunnelSource.Extension,
                        description: nls.localize('tunnel.staticallyForwarded', "Statically Forwarded")
                    }
                });
                this.tunnelService.setEnvironmentTunnel(tunnel.remoteAddress.host, tunnel.remoteAddress.port, localAddress, TunnelPrivacyId.ConstantPrivate, TunnelProtocol.Http);
            }
        }
        this._environmentTunnelsSet = true;
        this._onEnvironmentTunnelsSet.fire();
        this._onForwardPort.fire();
    }
    setCandidateFilter(filter) {
        this._candidateFilter = filter;
    }
    async setCandidates(candidates) {
        let processedCandidates = candidates;
        if (this._candidateFilter) {
            // When an extension provides a filter, we do the filtering on the extension host before the candidates are set here.
            // However, when the filter doesn't come from an extension we filter here.
            processedCandidates = await this._candidateFilter(candidates);
        }
        const removedCandidates = this.updateInResponseToCandidates(processedCandidates);
        this.logService.trace(`ForwardedPorts: (TunnelModel) removed candidates ${Array.from(removedCandidates.values()).map(candidate => candidate.port).join(', ')}`);
        this._onCandidatesChanged.fire(removedCandidates);
    }
    // Returns removed candidates
    updateInResponseToCandidates(candidates) {
        const removedCandidates = this._candidates ?? new Map();
        const candidatesMap = new Map();
        this._candidates = candidatesMap;
        candidates.forEach(value => {
            const addressKey = makeAddress(value.host, value.port);
            candidatesMap.set(addressKey, {
                host: value.host,
                port: value.port,
                detail: value.detail,
                pid: value.pid
            });
            if (removedCandidates.has(addressKey)) {
                removedCandidates.delete(addressKey);
            }
            const forwardedValue = mapHasAddressLocalhostOrAllInterfaces(this.forwarded, value.host, value.port);
            if (forwardedValue) {
                forwardedValue.runningProcess = value.detail;
                forwardedValue.hasRunningProcess = true;
                forwardedValue.pid = value.pid;
            }
        });
        removedCandidates.forEach((_value, key) => {
            const parsedAddress = parseAddress(key);
            if (!parsedAddress) {
                return;
            }
            const forwardedValue = mapHasAddressLocalhostOrAllInterfaces(this.forwarded, parsedAddress.host, parsedAddress.port);
            if (forwardedValue) {
                forwardedValue.runningProcess = undefined;
                forwardedValue.hasRunningProcess = false;
                forwardedValue.pid = undefined;
            }
            const detectedValue = mapHasAddressLocalhostOrAllInterfaces(this.detected, parsedAddress.host, parsedAddress.port);
            if (detectedValue) {
                detectedValue.runningProcess = undefined;
                detectedValue.hasRunningProcess = false;
                detectedValue.pid = undefined;
            }
        });
        return removedCandidates;
    }
    get candidates() {
        return this._candidates ? Array.from(this._candidates.values()) : [];
    }
    get candidatesOrUndefined() {
        return this._candidates ? this.candidates : undefined;
    }
    async updateAttributes() {
        // If the label changes in the attributes, we should update it.
        const tunnels = Array.from(this.forwarded.values());
        const allAttributes = await this.getAttributes(tunnels.map(tunnel => {
            return { port: tunnel.remotePort, host: tunnel.remoteHost };
        }), false);
        if (!allAttributes) {
            return;
        }
        for (const forwarded of tunnels) {
            const attributes = allAttributes.get(forwarded.remotePort);
            if ((attributes?.protocol || (forwarded.protocol !== TunnelProtocol.Http)) && (attributes?.protocol !== forwarded.protocol)) {
                await this.doForward({
                    remote: { host: forwarded.remoteHost, port: forwarded.remotePort },
                    local: forwarded.localPort,
                    name: forwarded.name,
                    source: forwarded.source
                }, attributes);
            }
            if (!attributes) {
                continue;
            }
            if (attributes.label && attributes.label !== forwarded.name) {
                await this.name(forwarded.remoteHost, forwarded.remotePort, attributes.label);
            }
        }
    }
    async getAttributes(forwardedPorts, checkProviders = true) {
        const matchingCandidates = new Map();
        const pidToPortsMapping = new Map();
        forwardedPorts.forEach(forwardedPort => {
            const matchingCandidate = mapHasAddressLocalhostOrAllInterfaces(this._candidates ?? new Map(), LOCALHOST_ADDRESSES[0], forwardedPort.port) ?? forwardedPort;
            if (matchingCandidate) {
                matchingCandidates.set(forwardedPort.port, matchingCandidate);
                const pid = isCandidatePort(matchingCandidate) ? matchingCandidate.pid : undefined;
                if (!pidToPortsMapping.has(pid)) {
                    pidToPortsMapping.set(pid, []);
                }
                pidToPortsMapping.get(pid)?.push(forwardedPort.port);
            }
        });
        const configAttributes = new Map();
        forwardedPorts.forEach(forwardedPort => {
            const attributes = this.configPortsAttributes.getAttributes(forwardedPort.port, forwardedPort.host, matchingCandidates.get(forwardedPort.port)?.detail);
            if (attributes) {
                configAttributes.set(forwardedPort.port, attributes);
            }
        });
        if ((this.portAttributesProviders.length === 0) || !checkProviders) {
            return (configAttributes.size > 0) ? configAttributes : undefined;
        }
        // Group calls to provide attributes by pid.
        const allProviderResults = await Promise.all(this.portAttributesProviders.flatMap(provider => {
            return Array.from(pidToPortsMapping.entries()).map(entry => {
                const portGroup = entry[1];
                const matchingCandidate = matchingCandidates.get(portGroup[0]);
                return provider.providePortAttributes(portGroup, matchingCandidate?.pid, matchingCandidate?.detail, CancellationToken.None);
            });
        }));
        const providedAttributes = new Map();
        allProviderResults.forEach(attributes => attributes.forEach(attribute => {
            if (attribute) {
                providedAttributes.set(attribute.port, attribute);
            }
        }));
        if (!configAttributes && !providedAttributes) {
            return undefined;
        }
        // Merge. The config wins.
        const mergedAttributes = new Map();
        forwardedPorts.forEach(forwardedPorts => {
            const config = configAttributes.get(forwardedPorts.port);
            const provider = providedAttributes.get(forwardedPorts.port);
            mergedAttributes.set(forwardedPorts.port, {
                elevateIfNeeded: config?.elevateIfNeeded,
                label: config?.label,
                onAutoForward: config?.onAutoForward ?? PortsAttributes.providedActionToAction(provider?.autoForwardAction),
                requireLocalPort: config?.requireLocalPort,
                protocol: config?.protocol
            });
        });
        return mergedAttributes;
    }
    addAttributesProvider(provider) {
        this.portAttributesProviders.push(provider);
    }
};
__decorate([
    debounce(1000)
], TunnelModel.prototype, "storeForwarded", null);
TunnelModel = __decorate([
    __param(0, ITunnelService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IRemoteAuthorityResolverService),
    __param(5, IWorkspaceContextService),
    __param(6, ILogService),
    __param(7, IDialogService),
    __param(8, IExtensionService),
    __param(9, IContextKeyService)
], TunnelModel);
export { TunnelModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlbW90ZS9jb21tb24vdHVubmVsTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckUsT0FBTyxFQUFFLCtCQUErQixFQUFxQixNQUFNLCtEQUErRCxDQUFDO0FBQ25JLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFnQixjQUFjLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBa0QsV0FBVyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2pSLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8s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