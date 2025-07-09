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
var ExtensionMcpDiscovery_1;
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { isFalsyOrWhitespace } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
import { mcpActivationEvent, mcpContributionPoint } from '../mcpConfiguration.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { extensionPrefixedIdentifier, McpServerDefinition } from '../mcpTypes.js';
const cacheKey = 'mcp.extCachedServers';
const _mcpExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint(mcpContributionPoint);
let ExtensionMcpDiscovery = ExtensionMcpDiscovery_1 = class ExtensionMcpDiscovery extends Disposable {
    constructor(_mcpRegistry, storageService, _extensionService) {
        super();
        this._mcpRegistry = _mcpRegistry;
        this._extensionService = _extensionService;
        this._extensionCollectionIdsToPersist = new Set();
        this.cachedServers = storageService.getObject(cacheKey, 1 /* StorageScope.WORKSPACE */, {});
        this._register(storageService.onWillSaveState(() => {
            let updated = false;
            for (const collectionId of this._extensionCollectionIdsToPersist) {
                const collection = this._mcpRegistry.collections.get().find(c => c.id === collectionId);
                if (!collection || collection.lazy) {
                    continue;
                }
                const defs = collection.serverDefinitions.get();
                if (defs) {
                    updated = true;
                    this.cachedServers[collectionId] = { servers: defs.map(McpServerDefinition.toSerialized) };
                }
            }
            if (updated) {
                storageService.store(cacheKey, this.cachedServers, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }));
    }
    start() {
        const extensionCollections = this._register(new DisposableMap());
        this._register(_mcpExtensionPoint.setHandler((_extensions, delta) => {
            const { added, removed } = delta;
            for (const collections of removed) {
                for (const coll of collections.value) {
                    extensionCollections.deleteAndDispose(extensionPrefixedIdentifier(collections.description.identifier, coll.id));
                }
            }
            for (const collections of added) {
                if (!ExtensionMcpDiscovery_1._validate(collections)) {
                    continue;
                }
                for (const coll of collections.value) {
                    const id = extensionPrefixedIdentifier(collections.description.identifier, coll.id);
                    this._extensionCollectionIdsToPersist.add(id);
                    const serverDefs = this.cachedServers.hasOwnProperty(id) ? this.cachedServers[id].servers : undefined;
                    const dispo = this._mcpRegistry.registerCollection({
                        id,
                        label: coll.label,
                        remoteAuthority: null,
                        isTrustedByDefault: true,
                        scope: 1 /* StorageScope.WORKSPACE */,
                        serverDefinitions: observableValue(this, serverDefs?.map(McpServerDefinition.fromSerialized) || []),
                        lazy: {
                            isCached: !!serverDefs,
                            load: () => this._activateExtensionServers(coll.id),
                            removed: () => extensionCollections.deleteAndDispose(id),
                        }
                    });
                    extensionCollections.set(id, dispo);
                }
            }
        }));
    }
    async _activateExtensionServers(collectionId) {
        await this._extensionService.activateByEvent(mcpActivationEvent(collectionId));
        await Promise.all(this._mcpRegistry.delegates
            .map(r => r.waitForInitialProviderPromises()));
    }
    static _validate(user) {
        if (!Array.isArray(user.value)) {
            user.collector.error(localize('invalidData', "Expected an array of MCP collections"));
            return false;
        }
        for (const contribution of user.value) {
            if (typeof contribution.id !== 'string' || isFalsyOrWhitespace(contribution.id)) {
                user.collector.error(localize('invalidId', "Expected 'id' to be a non-empty string."));
                return false;
            }
            if (typeof contribution.label !== 'string' || isFalsyOrWhitespace(contribution.label)) {
                user.collector.error(localize('invalidLabel', "Expected 'label' to be a non-empty string."));
                return false;
            }
        }
        return true;
    }
};
ExtensionMcpDiscovery = ExtensionMcpDiscovery_1 = __decorate([
    __param(0, IMcpRegistry),
    __param(1, IStorageService),
    __param(2, IExtensionService)
], ExtensionMcpDiscovery);
export { ExtensionMcpDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWNwRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vZGlzY292ZXJ5L2V4dGVuc2lvbk1jcERpc2NvdmVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWpELE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sbURBQW1ELENBQUM7QUFDakgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekYsT0FBTyxLQUFLLGtCQUFrQixNQUFNLDhEQUE4RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUdsRixNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQztBQU14QyxNQUFNLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFFdkcsSUFBTSxxQkFBcUIsNkJBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQUlwRCxZQUNlLFlBQTJDLEVB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