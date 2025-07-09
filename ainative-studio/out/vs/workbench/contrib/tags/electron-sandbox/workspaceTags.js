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
var WorkspaceTags_1;
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
import { IWorkspaceTagsService, getHashedRemotesFromConfig as baseGetHashedRemotesFromConfig } from '../common/workspaceTags.js';
import { IDiagnosticsService } from '../../../../platform/diagnostics/common/diagnostics.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { isWindows } from '../../../../base/common/platform.js';
import { AllowedSecondLevelDomains, getDomainsOfRemotes } from '../../../../platform/extensionManagement/common/configRemotes.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { hashAsync } from '../../../../base/common/hash.js';
export async function getHashedRemotesFromConfig(text, stripEndingDotGit = false) {
    return baseGetHashedRemotesFromConfig(text, stripEndingDotGit, hashAsync);
}
let WorkspaceTags = WorkspaceTags_1 = class WorkspaceTags {
    constructor(fileService, contextService, telemetryService, requestService, textFileService, workspaceTagsService, diagnosticsService, productService, nativeHostService) {
        this.fileService = fileService;
        this.contextService = contextService;
        this.telemetryService = telemetryService;
        this.requestService = requestService;
        this.textFileService = textFileService;
        this.workspaceTagsService = workspaceTagsService;
        this.diagnosticsService = diagnosticsService;
        this.productService = productService;
        this.nativeHostService = nativeHostService;
        if (this.telemetryService.telemetryLevel === 3 /* TelemetryLevel.USAGE */) {
            this.report();
        }
    }
    async report() {
        // Windows-only Edition Event
        this.reportWindowsEdition();
        // Workspace Tags
        this.workspaceTagsService.getTags()
            .then(tags => this.reportWorkspaceTags(tags), error => onUnexpectedError(error));
        // Cloud Stats
        this.reportCloudStats();
        this.reportProxyStats();
        this.getWorkspaceInformation().then(stats => this.diagnosticsService.reportWorkspaceStats(stats));
    }
    async reportWindowsEdition() {
        if (!isWindows) {
            return;
        }
        let value = await this.nativeHostService.windowsGetStringRegKey('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'EditionID');
        if (value === undefined) {
            value = 'Unknown';
        }
        this.telemetryService.publicLog2('windowsEdition', { edition: value });
    }
    async getWorkspaceInformation() {
        const workspace = this.contextService.getWorkspace();
        const state = this.contextService.getWorkbenchState();
        const telemetryId = await this.workspaceTagsService.getTelemetryWorkspaceId(workspace, state);
        return {
            id: workspace.id,
            telemetryId,
            rendererSessionId: this.telemetryService.sessionId,
            folders: workspace.folders,
            transient: workspace.transient,
            configuration: workspace.configuration
        };
    }
    reportWorkspaceTags(tags) {
        /* __GDPR__
            "workspce.tags" : {
                "owner": "lramos15",
                "${include}": [
                    "${WorkspaceTags}"
                ]
            }
        */
        this.telemetryService.publicLog('workspce.tags', tags);
    }
    reportRemoteDomains(workspaceUris) {
        Promise.all(workspaceUris.map(workspaceUri => {
            const path = workspaceUri.path;
            const uri = workspaceUri.with({ path: `${path !== '/' ? path : ''}/.git/config` });
            return this.fileService.exists(uri).then(exists => {
                if (!exists) {
                    return [];
                }
                return this.textFileService.read(uri, { acceptTextOnly: true }).then(content => getDomainsOfRemotes(content.value, AllowedSecondLevelDomains), err => [] // ignore missing or binary file
                );
            });
        })).then(domains => {
            const set = domains.reduce((set, list) => list.reduce((set, item) => set.add(item), set), new Set());
            const list = [];
            set.forEach(item => list.push(item));
            /* __GDPR__
                "workspace.remotes" : {
                    "owner": "lramos15",
                    "domains" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                }
            */
            this.telemetryService.publicLog('workspace.remotes', { domains: list.sort() });
        }, onUnexpectedError);
    }
    reportRemotes(workspaceUris) {
        Promise.all(workspaceUris.map(workspaceUri => {
            return this.workspaceTagsService.getHashedRemotesFromUri(workspaceUri, true);
        })).then(() => { }, onUnexpectedError);
    }
    /* __GDPR__FRAGMENT__
        "AzureTags" : {
            "node" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        }
    */
    reportAzureNode(workspaceUris, tags) {
        // TODO: should also work for `node_modules` folders several levels down
        const uris = workspaceUris.map(workspaceUri => {
            const path = workspaceUri.path;
            return workspaceUri.with({ path: `${path !== '/' ? path : ''}/node_modules` });
        });
        return this.fileService.resolveAll(uris.map(resource => ({ resource }))).then(results => {
            const names = [].concat(...results.map(result => result.success ? (result.stat.children || []) : [])).map(c => c.name);
            const referencesAzure = WorkspaceTags_1.searchArray(names, /azure/i);
            if (referencesAzure) {
                tags['node'] = true;
            }
            return tags;
        }, err => {
            return tags;
        });
    }
    static searchArray(arr, regEx) {
        return arr.some(v => v.search(regEx) > -1) || undefined;
    }
    /* __GDPR__FRAGMENT__
        "AzureTags" : {
            "java" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        }
    */
    reportAzureJava(workspaceUris, tags) {
        return Promise.all(workspaceUris.map(workspaceUri => {
            const path = workspaceUri.path;
            const uri = workspaceUri.with({ path: `${path !== '/' ? path : ''}/pom.xml` });
            return this.fileService.exists(uri).then(exists => {
                if (!exists) {
                    return false;
                }
                return this.textFileService.read(uri, { acceptTextOnly: true }).then(content => !!content.value.match(/azure/i), err => false);
            });
        })).then(javas => {
            if (javas.indexOf(true) !== -1) {
                tags['java'] = true;
            }
            return tags;
        });
    }
    reportAzure(uris) {
        const tags = Object.create(null);
        this.reportAzureNode(uris, tags).then((tags) => {
            return this.reportAzureJava(uris, tags);
        }).then((tags) => {
            if (Object.keys(tags).length) {
                /* __GDPR__
                    "workspace.azure" : {
                        "owner": "lramos15",
                        "${include}": [
                            "${AzureTags}"
                        ]
                    }
                */
                this.telemetryService.publicLog('workspace.azure', tags);
            }
        }).then(undefined, onUnexpectedError);
    }
    reportCloudStats() {
        const uris = this.contextService.getWorkspace().folders.map(folder => folder.uri);
        if (uris.length && this.fileService) {
            this.reportRemoteDomains(uris);
            this.reportRemotes(uris);
            this.reportAzure(uris);
        }
    }
    reportProxyStats() {
        const downloadUrl = this.productService.downloadUrl;
        if (!downloadUrl) {
            return;
        }
        this.requestService.resolveProxy(downloadUrl)
            .then(proxy => {
            let type = proxy ? String(proxy).trim().split(/\s+/, 1)[0] : 'EMPTY';
            if (['DIRECT', 'PROXY', 'HTTPS', 'SOCKS', 'EMPTY'].indexOf(type) === -1) {
                type = 'UNKNOWN';
            }
        }).then(undefined, onUnexpectedError);
    }
};
WorkspaceTags = WorkspaceTags_1 = __decorate([
    __param(0, IFileService),
    __param(1, IWorkspaceContextService),
    __param(2, ITelemetryService),
    __param(3, IRequestService),
    __param(4, ITextFileService),
    __param(5, IWorkspaceTagsService),
    __param(6, IDiagnosticsService),
    __param(7, IProductService),
    __param(8, INativeHostService)
], WorkspaceTags);
export { WorkspaceTags };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YWdzL2VsZWN0cm9uLXNhbmRib3gvd29ya3NwYWNlVGFncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFdEUsT0FBTyxFQUFFLFlBQVksRUFBYSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxvREFBb0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUU5RixPQUFPLEVBQUUsZ0JBQWdCLEdBQUcsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQVEsMEJBQTBCLElBQUksOEJBQThCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN2SSxPQUFPLEVBQUUsbUJBQW1CLEVBQXlCLE1BQU0sd0RBQXdELENBQUM7QUFDcEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNsSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsMEJBQTBCLENBQUMsSUFBWSxFQUFF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