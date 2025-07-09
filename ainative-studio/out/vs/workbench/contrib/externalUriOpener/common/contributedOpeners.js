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
var ContributedExternalUriOpenersStore_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
import { updateContributedOpeners } from './configuration.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
let ContributedExternalUriOpenersStore = class ContributedExternalUriOpenersStore extends Disposable {
    static { ContributedExternalUriOpenersStore_1 = this; }
    static { this.STORAGE_ID = 'externalUriOpeners'; }
    constructor(storageService, _extensionService) {
        super();
        this._extensionService = _extensionService;
        this._openers = new Map();
        this._memento = new Memento(ContributedExternalUriOpenersStore_1.STORAGE_ID, storageService);
        this._mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        for (const [id, value] of Object.entries(this._mementoObject || {})) {
            this.add(id, value.extensionId, { isCurrentlyRegistered: false });
        }
        this.invalidateOpenersOnExtensionsChanged();
        this._register(this._extensionService.onDidChangeExtensions(() => this.invalidateOpenersOnExtensionsChanged()));
        this._register(this._extensionService.onDidChangeExtensionsStatus(() => this.invalidateOpenersOnExtensionsChanged()));
    }
    didRegisterOpener(id, extensionId) {
        this.add(id, extensionId, {
            isCurrentlyRegistered: true
        });
    }
    add(id, extensionId, options) {
        const existing = this._openers.get(id);
        if (existing) {
            existing.isCurrentlyRegistered = existing.isCurrentlyRegistered || options.isCurrentlyRegistered;
            return;
        }
        const entry = {
            extensionId,
            isCurrentlyRegistered: options.isCurrentlyRegistered
        };
        this._openers.set(id, entry);
        this._mementoObject[id] = entry;
        this._memento.saveMemento();
        this.updateSchema();
    }
    delete(id) {
        this._openers.delete(id);
        delete this._mementoObject[id];
        this._memento.saveMemento();
        this.updateSchema();
    }
    async invalidateOpenersOnExtensionsChanged() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const registeredExtensions = this._extensionService.extensions;
        for (const [id, entry] of this._openers) {
            const extension = registeredExtensions.find(r => r.identifier.value === entry.extensionId);
            if (extension) {
                if (!this._extensionService.canRemoveExtension(extension)) {
                    // The extension is running. We should have registered openers at this point
                    if (!entry.isCurrentlyRegistered) {
                        this.delete(id);
                    }
                }
            }
            else {
                // The opener came from an extension that is no longer enabled/installed
                this.delete(id);
            }
        }
    }
    updateSchema() {
        const ids = [];
        const descriptions = [];
        for (const [id, entry] of this._openers) {
            ids.push(id);
            descriptions.push(entry.extensionId);
        }
        updateContributedOpeners(ids, descriptions);
    }
};
ContributedExternalUriOpenersStore = ContributedExternalUriOpenersStore_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IExtensionService)
], ContributedExternalUriOpenersStore);
export { ContributedExternalUriOpenersStore };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0ZWRPcGVuZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVybmFsVXJpT3BlbmVyL2NvbW1vbi9jb250cmlidXRlZE9wZW5lcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQVkvRSxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFtQyxTQUFRLFVBQVU7O2FBRXpDLGVBQVUsR0FBRyxvQkFBb0IsQUFBdkIsQ0FBd0I7SUFNMUQsWUFDa0IsY0FBK0IsRUFDN0IsaUJBQXFEO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBRjRCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFOeEQsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBVXZFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsb0NBQWtDLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzNGLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLDZEQUE2QyxDQUFDO1FBQzVGLEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNyRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBRUQsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUM7UUFFNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLDJCQUEyQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2SCxDQUFDO0lBRU0saUJBQWlCLENBQUMsRUFBVSxFQUFFLFdBQW1CO1FBQ3ZELElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFdBQVcsRUFBRTtZQUN6QixxQkFBcUIsRUFBRSxJQUFJO1NBQzNCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxHQUFHLENBQUMsRUFBVSxFQUFFLFdBQW1CLEVBQUUsT0FBMkM7UUFDdkYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLFFBQVEsQ0FBQyxxQkFBcUIsR0FBRyxRQUFRLENBQUMscUJBQXFCLElBQUksT0FBTyxDQUFDLHFCQUFxQixDQUFDO1lBQ2pHLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUc7WUFDYixXQUFXO1lBQ1gscUJBQXFCLEVBQUUsT0FBTyxDQUFDLHFCQUFxQjtTQUNwRCxDQUFDO1FBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTdCLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFNUIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFTSxNQUFNLENBQUMsRUFBVTtRQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV6QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUU1QixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQ0FBb0M7UUFDakQsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztRQUNqRSxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUM7UUFFL0QsS0FBSyxNQUFNLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0YsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQzNELDRFQUE0RTtvQkFDNUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO3dCQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNqQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1Asd0VBQXdFO2dCQUN4RSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVk7UUFDbkIsTUFBTSxHQUFHLEdBQWEsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQztRQUVsQyxLQUFLLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDYixZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBRUQsd0JBQXdCLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzdDLENBQUM7O0FBMUZXLGtDQUFrQztJQVM1QyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsaUJBQWlCLENBQUE7R0FWUCxrQ0FBa0MsQ0EyRjlDIn0=