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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWNwRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9kaXNjb3ZlcnkvZXh0ZW5zaW9uTWNwRGlzY292ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEtBQUssa0JBQWtCLE1BQU0sOERBQThELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3RELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBR2xGLE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDO0FBTXhDLE1BQU0sa0JBQWtCLEdBQUcsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUV2RyxJQUFNLHFCQUFxQiw2QkFBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBSXBELFlBQ2UsWUFBMkMsRUFD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