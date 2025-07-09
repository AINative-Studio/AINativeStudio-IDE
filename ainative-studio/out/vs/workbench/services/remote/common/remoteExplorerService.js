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
import { Emitter } from '../../../../base/common/event.js';
import { IInstantiationService, createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITunnelService } from '../../../../platform/tunnel/common/tunnel.js';
import { TunnelModel } from './tunnelModel.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
export const IRemoteExplorerService = createDecorator('remoteExplorerService');
export const REMOTE_EXPLORER_TYPE_KEY = 'remote.explorerType';
export const TUNNEL_VIEW_ID = '~remote.forwardedPorts';
export const TUNNEL_VIEW_CONTAINER_ID = '~remote.forwardedPortsContainer';
export const PORT_AUTO_FORWARD_SETTING = 'remote.autoForwardPorts';
export const PORT_AUTO_SOURCE_SETTING = 'remote.autoForwardPortsSource';
export const PORT_AUTO_FALLBACK_SETTING = 'remote.autoForwardPortsFallback';
export const PORT_AUTO_SOURCE_SETTING_PROCESS = 'process';
export const PORT_AUTO_SOURCE_SETTING_OUTPUT = 'output';
export const PORT_AUTO_SOURCE_SETTING_HYBRID = 'hybrid';
export var TunnelType;
(function (TunnelType) {
    TunnelType["Candidate"] = "Candidate";
    TunnelType["Detected"] = "Detected";
    TunnelType["Forwarded"] = "Forwarded";
    TunnelType["Add"] = "Add";
})(TunnelType || (TunnelType = {}));
export var TunnelEditId;
(function (TunnelEditId) {
    TunnelEditId[TunnelEditId["None"] = 0] = "None";
    TunnelEditId[TunnelEditId["New"] = 1] = "New";
    TunnelEditId[TunnelEditId["Label"] = 2] = "Label";
    TunnelEditId[TunnelEditId["LocalPort"] = 3] = "LocalPort";
})(TunnelEditId || (TunnelEditId = {}));
const getStartedWalkthrough = {
    type: 'object',
    required: ['id'],
    properties: {
        id: {
            description: nls.localize('getStartedWalkthrough.id', 'The ID of a Get Started walkthrough to open.'),
            type: 'string'
        },
    }
};
const remoteHelpExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'remoteHelp',
    jsonSchema: {
        description: nls.localize('RemoteHelpInformationExtPoint', 'Contributes help information for Remote'),
        type: 'object',
        properties: {
            'getStarted': {
                description: nls.localize('RemoteHelpInformationExtPoint.getStarted', "The url, or a command that returns the url, to your project's Getting Started page, or a walkthrough ID contributed by your project's extension"),
                oneOf: [
                    { type: 'string' },
                    getStartedWalkthrough
                ]
            },
            'documentation': {
                description: nls.localize('RemoteHelpInformationExtPoint.documentation', "The url, or a command that returns the url, to your project's documentation page"),
                type: 'string'
            },
            'feedback': {
                description: nls.localize('RemoteHelpInformationExtPoint.feedback', "The url, or a command that returns the url, to your project's feedback reporter"),
                type: 'string',
                markdownDeprecationMessage: nls.localize('RemoteHelpInformationExtPoint.feedback.deprecated', "Use {0} instead", '`reportIssue`')
            },
            'reportIssue': {
                description: nls.localize('RemoteHelpInformationExtPoint.reportIssue', "The url, or a command that returns the url, to your project's issue reporter"),
                type: 'string'
            },
            'issues': {
                description: nls.localize('RemoteHelpInformationExtPoint.issues', "The url, or a command that returns the url, to your project's issues list"),
                type: 'string'
            }
        }
    }
});
export var PortsEnablement;
(function (PortsEnablement) {
    PortsEnablement[PortsEnablement["Disabled"] = 0] = "Disabled";
    PortsEnablement[PortsEnablement["ViewOnly"] = 1] = "ViewOnly";
    PortsEnablement[PortsEnablement["AdditionalFeatures"] = 2] = "AdditionalFeatures";
})(PortsEnablement || (PortsEnablement = {}));
let RemoteExplorerService = class RemoteExplorerService {
    constructor(storageService, tunnelService, instantiationService) {
        this.storageService = storageService;
        this.tunnelService = tunnelService;
        this._targetType = [];
        this._onDidChangeTargetType = new Emitter();
        this.onDidChangeTargetType = this._onDidChangeTargetType.event;
        this._onDidChangeHelpInformation = new Emitter();
        this.onDidChangeHelpInformation = this._onDidChangeHelpInformation.event;
        this._helpInformation = [];
        this._onDidChangeEditable = new Emitter();
        this.onDidChangeEditable = this._onDidChangeEditable.event;
        this._onEnabledPortsFeatures = new Emitter();
        this.onEnabledPortsFeatures = this._onEnabledPortsFeatures.event;
        this._portsFeaturesEnabled = PortsEnablement.Disabled;
        this.namedProcesses = new Map();
        this._tunnelModel = instantiationService.createInstance(TunnelModel);
        remoteHelpExtPoint.setHandler((extensions) => {
            this._helpInformation.push(...extensions);
            this._onDidChangeHelpInformation.fire(extensions);
        });
    }
    get helpInformation() {
        return this._helpInformation;
    }
    set targetType(name) {
        // Can just compare the first element of the array since there are no target overlaps
        const current = this._targetType.length > 0 ? this._targetType[0] : '';
        const newName = name.length > 0 ? name[0] : '';
        if (current !== newName) {
            this._targetType = name;
            this.storageService.store(REMOTE_EXPLORER_TYPE_KEY, this._targetType.toString(), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store(REMOTE_EXPLORER_TYPE_KEY, this._targetType.toString(), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            this._onDidChangeTargetType.fire(this._targetType);
        }
    }
    get targetType() {
        return this._targetType;
    }
    get tunnelModel() {
        return this._tunnelModel;
    }
    forward(tunnelProperties, attributes) {
        return this.tunnelModel.forward(tunnelProperties, attributes);
    }
    close(remote, reason) {
        return this.tunnelModel.close(remote.host, remote.port, reason);
    }
    setTunnelInformation(tunnelInformation) {
        if (tunnelInformation?.features) {
            this.tunnelService.setTunnelFeatures(tunnelInformation.features);
        }
        this.tunnelModel.addEnvironmentTunnels(tunnelInformation?.environmentTunnels);
    }
    setEditable(tunnelItem, editId, data) {
        if (!data) {
            this._editable = undefined;
        }
        else {
            this._editable = { tunnelItem, data, editId };
        }
        this._onDidChangeEditable.fire(tunnelItem ? { tunnel: tunnelItem, editId } : undefined);
    }
    getEditableData(tunnelItem, editId) {
        return (this._editable &&
            ((!tunnelItem && (tunnelItem === this._editable.tunnelItem)) ||
                (tunnelItem && (this._editable.tunnelItem?.remotePort === tunnelItem.remotePort) && (this._editable.tunnelItem.remoteHost === tunnelItem.remoteHost)
                    && (this._editable.editId === editId)))) ?
            this._editable.data : undefined;
    }
    setCandidateFilter(filter) {
        if (!filter) {
            return {
                dispose: () => { }
            };
        }
        this.tunnelModel.setCandidateFilter(filter);
        return {
            dispose: () => {
                this.tunnelModel.setCandidateFilter(undefined);
            }
        };
    }
    onFoundNewCandidates(candidates) {
        this.tunnelModel.setCandidates(candidates);
    }
    restore() {
        return this.tunnelModel.restoreForwarded();
    }
    enablePortsFeatures(viewOnly) {
        this._portsFeaturesEnabled = viewOnly ? PortsEnablement.ViewOnly : PortsEnablement.AdditionalFeatures;
        this._onEnabledPortsFeatures.fire();
    }
    get portsFeaturesEnabled() {
        return this._portsFeaturesEnabled;
    }
};
RemoteExplorerService = __decorate([
    __param(0, IStorageService),
    __param(1, ITunnelService),
    __param(2, IInstantiationService)
], RemoteExplorerService);
registerSingleton(IRemoteExplorerService, RemoteExplorerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXhwbG9yZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9yZW1vdGUvY29tbW9uL3JlbW90ZUV4cGxvcmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEgsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGNBQWMsRUFBZ0MsTUFBTSw4Q0FBOEMsQ0FBQztBQUs1RyxPQUFPLEVBQWdELFdBQVcsRUFBa0MsTUFBTSxrQkFBa0IsQ0FBQztBQUM3SCxPQUFPLEVBQUUsa0JBQWtCLEVBQXVCLE1BQU0sK0NBQStDLENBQUM7QUFJeEcsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFDO0FBQ3ZHLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFXLHFCQUFxQixDQUFDO0FBQ3RFLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQztBQUN2RCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxpQ0FBaUMsQ0FBQztBQUMxRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyx5QkFBeUIsQ0FBQztBQUNuRSxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRywrQkFBK0IsQ0FBQztBQUN4RSxN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