/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { joinPath } from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Queue } from '../../../../base/common/async.js';
export class ConfigurationCache {
    constructor(donotCacheResourcesWithSchemes, environmentService, fileService) {
        this.donotCacheResourcesWithSchemes = donotCacheResourcesWithSchemes;
        this.fileService = fileService;
        this.cachedConfigurations = new Map();
        this.cacheHome = environmentService.cacheHome;
    }
    needsCaching(resource) {
        // Cache all non native resources
        return !this.donotCacheResourcesWithSchemes.includes(resource.scheme);
    }
    read(key) {
        return this.getCachedConfiguration(key).read();
    }
    write(key, content) {
        return this.getCachedConfiguration(key).save(content);
    }
    remove(key) {
        return this.getCachedConfiguration(key).remove();
    }
    getCachedConfiguration({ type, key }) {
        const k = `${type}:${key}`;
        let cachedConfiguration = this.cachedConfigurations.get(k);
        if (!cachedConfiguration) {
            cachedConfiguration = new CachedConfiguration({ type, key }, this.cacheHome, this.fileService);
            this.cachedConfigurations.set(k, cachedConfiguration);
        }
        return cachedConfiguration;
    }
}
class CachedConfiguration {
    constructor({ type, key }, cacheHome, fileService) {
        this.fileService = fileService;
        this.cachedConfigurationFolderResource = joinPath(cacheHome, 'CachedConfigurations', type, key);
        this.cachedConfigurationFileResource = joinPath(this.cachedConfigurationFolderResource, type === 'workspaces' ? 'workspace.json' : 'configuration.json');
        this.queue = new Queue();
    }
    async read() {
        try {
            const content = await this.fileService.readFile(this.cachedConfigurationFileResource);
            return content.value.toString();
        }
        catch (e) {
            return '';
        }
    }
    async save(content) {
        const created = await this.createCachedFolder();
        if (created) {
            await this.queue.queue(async () => {
                await this.fileService.writeFile(this.cachedConfigurationFileResource, VSBuffer.fromString(content));
            });
        }
    }
    async remove() {
        try {
            await this.queue.queue(() => this.fileService.del(this.cachedConfigurationFolderResource, { recursive: true, useTrash: false }));
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error;
            }
        }
    }
    async createCachedFolder() {
        if (await this.fileService.exists(this.cachedConfigurationFolderResource)) {
            return true;
        }
        try {
            await this.fileService.createFolder(this.cachedConfigurationFolderResource);
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkNhY2hlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL2NvbW1vbi9jb25maWd1cmF0aW9uQ2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHekQsTUFBTSxPQUFPLGtCQUFrQjtJQUs5QixZQUNrQiw4QkFBd0MsRUFDekQsa0JBQXVDLEVBQ3RCLFdBQXlCO1FBRnpCLG1DQUE4QixHQUE5Qiw4QkFBOEIsQ0FBVTtRQUV4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUwxQix5QkFBb0IsR0FBcUMsSUFBSSxHQUFHLEVBQStCLENBQUM7UUFPaEgsSUFBSSxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLENBQUM7SUFDL0MsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFhO1FBQ3pCLGlDQUFpQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELElBQUksQ0FBQyxHQUFxQjtRQUN6QixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQXFCLEVBQUUsT0FBZTtRQUMzQyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxD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