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
import { Emitter } from '../../../../base/common/event.js';
import { debounce, throttle } from '../../../../base/common/decorators.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { MergedEnvironmentVariableCollection } from '../../../../platform/terminal/common/environmentVariableCollection.js';
import { deserializeEnvironmentDescriptionMap, deserializeEnvironmentVariableCollection, serializeEnvironmentDescriptionMap, serializeEnvironmentVariableCollection } from '../../../../platform/terminal/common/environmentVariableShared.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Tracks and persists environment variable collections as defined by extensions.
 */
let EnvironmentVariableService = class EnvironmentVariableService extends Disposable {
    get onDidChangeCollections() { return this._onDidChangeCollections.event; }
    constructor(_extensionService, _storageService) {
        super();
        this._extensionService = _extensionService;
        this._storageService = _storageService;
        this.collections = new Map();
        this._onDidChangeCollections = this._register(new Emitter());
        this._storageService.remove("terminal.integrated.environmentVariableCollections" /* TerminalStorageKeys.DeprecatedEnvironmentVariableCollections */, 1 /* StorageScope.WORKSPACE */);
        const serializedPersistedCollections = this._storageService.get("terminal.integrated.environmentVariableCollectionsV2" /* TerminalStorageKeys.EnvironmentVariableCollections */, 1 /* StorageScope.WORKSPACE */);
        if (serializedPersistedCollections) {
            const collectionsJson = JSON.parse(serializedPersistedCollections);
            collectionsJson.forEach(c => this.collections.set(c.extensionIdentifier, {
                persistent: true,
                map: deserializeEnvironmentVariableCollection(c.collection),
                descriptionMap: deserializeEnvironmentDescriptionMap(c.description)
            }));
            // Asynchronously invalidate collections where extensions have been uninstalled, this is
            // async to avoid making all functions on the service synchronous and because extensions
            // being uninstalled is rare.
            this._invalidateExtensionCollections();
        }
        this.mergedCollection = this._resolveMergedCollection();
        // Listen for uninstalled/disabled extensions
        this._register(this._extensionService.onDidChangeExtensions(() => this._invalidateExtensionCollections()));
    }
    set(extensionIdentifier, collection) {
        this.collections.set(extensionIdentifier, collection);
        this._updateCollections();
    }
    delete(extensionIdentifier) {
        this.collections.delete(extensionIdentifier);
        this._updateCollections();
    }
    _updateCollections() {
        this._persistCollectionsEventually();
        this.mergedCollection = this._resolveMergedCollection();
        this._notifyCollectionUpdatesEventually();
    }
    _persistCollectionsEventually() {
        this._persistCollections();
    }
    _persistCollections() {
        const collectionsJson = [];
        this.collections.forEach((collection, extensionIdentifier) => {
            if (collection.persistent) {
                collectionsJson.push({
                    extensionIdentifier,
                    collection: serializeEnvironmentVariableCollection(this.collections.get(extensionIdentifier).map),
                    description: serializeEnvironmentDescriptionMap(collection.descriptionMap)
                });
            }
        });
        const stringifiedJson = JSON.stringify(collectionsJson);
        this._storageService.store("terminal.integrated.environmentVariableCollectionsV2" /* TerminalStorageKeys.EnvironmentVariableCollections */, stringifiedJson, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    _notifyCollectionUpdatesEventually() {
        this._notifyCollectionUpdates();
    }
    _notifyCollectionUpdates() {
        this._onDidChangeCollections.fire(this.mergedCollection);
    }
    _resolveMergedCollection() {
        return new MergedEnvironmentVariableCollection(this.collections);
    }
    async _invalidateExtensionCollections() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const registeredExtensions = this._extensionService.extensions;
        let changes = false;
        this.collections.forEach((_, extensionIdentifier) => {
            const isExtensionRegistered = registeredExtensions.some(r => r.identifier.value === extensionIdentifier);
            if (!isExtensionRegistered) {
                this.collections.delete(extensionIdentifier);
                changes = true;
            }
        });
        if (changes) {
            this._updateCollections();
        }
    }
};
__decorate([
    throttle(1000)
], EnvironmentVariableService.prototype, "_persistCollectionsEventually", null);
__decorate([
    debounce(1000)
], EnvironmentVariableService.prototype, "_notifyCollectionUpdatesEventually", null);
EnvironmentVariableService = __decorate([
    __param(0, IExtensionService),
    __param(1, IStorageService)
], EnvironmentVariableService);
export { EnvironmentVariableService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvY29tbW9uL2Vudmlyb25tZW50VmFyaWFibGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDNUgsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLHdDQUF3QyxFQUFFLGtDQUFrQyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFJL08sT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBUWxFOztHQUVHO0FBQ0ksSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBT3pELElBQUksc0JBQXNCLEtBQWtELE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFFeEgsWUFDb0IsaUJBQXFELEVBQ3ZELGVBQWlEO1FBRWxFLEtBQUssRUFBRSxDQUFDO1FBSDRCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDdEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBUm5FLGdCQUFXLEdBQStELElBQUksR0FBRyxFQUFFLENBQUM7UUFHbkUsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBd0MsQ0FBQyxDQUFDO1FBUzlHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSx5SkFBc0YsQ0FBQztRQUNsSCxNQUFNLDhCQUE4QixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxpSkFBNEUsQ0FBQztRQUM1SSxJQUFJLDhCQUE4QixFQUFFLENBQUM7WUFDcEMsTUFBTSxlQUFlLEdBQTBELElBQUksQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUMxSCxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFO2dCQUN4RSxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsR0FBRyxFQUFFLHdDQUF3QyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7Z0JBQzNELGNBQWMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO2FBQ25FLENBQUMsQ0FBQyxDQUFDO1lBRUosd0ZBQXdGO1lBQ3hGLHdGQUF3RjtZQUN4Riw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUV4RCw2Q0FBNkM7UUFDN0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVHLENBQUM7SUFFRCxHQUFHLENBQUMsbUJBQTJCLEVBQUUsVUFBeUQ7UUFDekYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxtQkFBMkI7UUFDakMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUN4RCxJQUFJLENBQUMsa0NBQWtDLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBR08sNkJBQTZCO1FBQ3BDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFUyxtQkFBbUI7UUFDNUIsTUFBTSxlQUFlLEdBQTBELEVBQUUsQ0FBQztRQUNsRixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxFQUFFO1lBQzVELElBQUksVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUMzQixlQUFlLENBQUMsSUFBSSxDQUFDO29CQUNwQixtQkFBbUI7b0JBQ25CLFVBQVUsRUFBRSxzQ0FBc0MsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBRSxDQUFDLEdBQUcsQ0FBQztvQkFDbEcsV0FBVyxFQUFFLGtDQUFrQyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7aUJBQzFFLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLGtIQUFxRCxlQUFlLGdFQUFnRCxDQUFDO0lBQ2hKLENBQUM7SUFHTyxrQ0FBa0M7UUFDekMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7SUFDakMsQ0FBQztJQUVTLHdCQUF3QjtRQUNqQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsT0FBTyxJQUFJLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRU8sS0FBSyxDQUFDLCtCQUErQjtRQUM1QyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO1FBQ2pFLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQztRQUMvRCxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsRUFBRTtZQUNuRCxNQUFNLHFCQUFxQixHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxLQUFLLG1CQUFtQixDQUFDLENBQUM7WUFDekcsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQzdDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzNCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQS9DUTtJQURQLFFBQVEsQ0FBQyxJQUFJLENBQUM7K0VBR2Q7QUFrQk87SUFEUCxRQUFRLENBQUMsSUFBSSxDQUFDO29GQUdkO0FBM0VXLDBCQUEwQjtJQVVwQyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZUFBZSxDQUFBO0dBWEwsMEJBQTBCLENBb0d0QyJ9