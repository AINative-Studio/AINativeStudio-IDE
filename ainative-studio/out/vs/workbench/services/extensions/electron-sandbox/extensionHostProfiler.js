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
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { IExtensionService } from '../common/extensions.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { IV8InspectProfilingService } from '../../../../platform/profiling/common/profiling.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
let ExtensionHostProfiler = class ExtensionHostProfiler {
    constructor(_host, _port, _extensionService, _profilingService) {
        this._host = _host;
        this._port = _port;
        this._extensionService = _extensionService;
        this._profilingService = _profilingService;
    }
    async start() {
        const id = await this._profilingService.startProfiling({ host: this._host, port: this._port });
        return {
            stop: createSingleCallFunction(async () => {
                const profile = await this._profilingService.stopProfiling(id);
                await this._extensionService.whenInstalledExtensionsRegistered();
                const extensions = this._extensionService.extensions;
                return this._distill(profile, extensions);
            })
        };
    }
    _distill(profile, extensions) {
        const searchTree = TernarySearchTree.forUris();
        for (const extension of extensions) {
            if (extension.extensionLocation.scheme === Schemas.file) {
                searchTree.set(URI.file(extension.extensionLocation.fsPath), extension);
            }
        }
        const nodes = profile.nodes;
        const idsToNodes = new Map();
        const idsToSegmentId = new Map();
        for (const node of nodes) {
            idsToNodes.set(node.id, node);
        }
        function visit(node, segmentId) {
            if (!segmentId) {
                switch (node.callFrame.functionName) {
                    case '(root)':
                        break;
                    case '(program)':
                        segmentId = 'program';
                        break;
                    case '(garbage collector)':
                        segmentId = 'gc';
                        break;
                    default:
                        segmentId = 'self';
                        break;
                }
            }
            else if (segmentId === 'self' && node.callFrame.url) {
                let extension;
                try {
                    extension = searchTree.findSubstr(URI.parse(node.callFrame.url));
                }
                catch {
                    // ignore
                }
                if (extension) {
                    segmentId = extension.identifier.value;
                }
            }
            idsToSegmentId.set(node.id, segmentId);
            if (node.children) {
                for (const child of node.children) {
                    const childNode = idsToNodes.get(child);
                    if (childNode) {
                        visit(childNode, segmentId);
                    }
                }
            }
        }
        visit(nodes[0], null);
        const samples = profile.samples || [];
        const timeDeltas = profile.timeDeltas || [];
        const distilledDeltas = [];
        const distilledIds = [];
        let currSegmentTime = 0;
        let currSegmentId;
        for (let i = 0; i < samples.length; i++) {
            const id = samples[i];
            const segmentId = idsToSegmentId.get(id);
            if (segmentId !== currSegmentId) {
                if (currSegmentId) {
                    distilledIds.push(currSegmentId);
                    distilledDeltas.push(currSegmentTime);
                }
                currSegmentId = segmentId ?? undefined;
                currSegmentTime = 0;
            }
            currSegmentTime += timeDeltas[i];
        }
        if (currSegmentId) {
            distilledIds.push(currSegmentId);
            distilledDeltas.push(currSegmentTime);
        }
        return {
            startTime: profile.startTime,
            endTime: profile.endTime,
            deltas: distilledDeltas,
            ids: distilledIds,
            data: profile,
            getAggregatedTimes: () => {
                const segmentsToTime = new Map();
                for (let i = 0; i < distilledIds.length; i++) {
                    const id = distilledIds[i];
                    segmentsToTime.set(id, (segmentsToTime.get(id) || 0) + distilledDeltas[i]);
                }
                return segmentsToTime;
            }
        };
    }
};
ExtensionHostProfiler = __decorate([
    __param(2, IExtensionService),
    __param(3, IV8InspectProfilingService)
], ExtensionHostProfiler);
export { ExtensionHostProfiler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFByb2ZpbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uSG9zdFByb2ZpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2pGLE9BQU8sRUFBeUIsaUJBQWlCLEVBQW9DLE1BQU0seUJBQXlCLENBQUM7QUFFckgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsMEJBQTBCLEVBQThCLE1BQU0sb0RBQW9ELENBQUM7QUFDNUgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFMUUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFFakMsWUFDa0IsS0FBYSxFQUNiLEtBQWEsRUFDTSxpQkFBb0MsRUFDM0IsaUJBQTZDO1FBSHpFLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ00sc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUMzQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQTRCO0lBRTNGLENBQUM7SUFFTSxLQUFLLENBQUMsS0FBSztRQUVqQixNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFF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