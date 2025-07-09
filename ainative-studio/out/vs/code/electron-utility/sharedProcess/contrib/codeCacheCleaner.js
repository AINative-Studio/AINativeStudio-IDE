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
import { promises } from 'fs';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { basename, dirname, join } from '../../../../base/common/path.js';
import { Promises } from '../../../../base/node/pfs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
let CodeCacheCleaner = class CodeCacheCleaner extends Disposable {
    constructor(currentCodeCachePath, productService, logService) {
        super();
        this.logService = logService;
        this.dataMaxAge = productService.quality !== 'stable'
            ? 1000 * 60 * 60 * 24 * 7 // roughly 1 week (insiders)
            : 1000 * 60 * 60 * 24 * 30 * 3; // roughly 3 months (stable)
        // Cached data is stored as user data and we run a cleanup task every time
        // the editor starts. The strategy is to delete all files that are older than
        // 3 months (1 week respectively)
        if (currentCodeCachePath) {
            const scheduler = this._register(new RunOnceScheduler(() => {
                this.cleanUpCodeCaches(currentCodeCachePath);
            }, 30 * 1000 /* after 30s */));
            scheduler.schedule();
        }
    }
    async cleanUpCodeCaches(currentCodeCachePath) {
        this.logService.trace('[code cache cleanup]: Starting to clean up old code cache folders.');
        try {
            const now = Date.now();
            // The folder which contains folders of cached data.
            // Each of these folders is partioned per commit
            const codeCacheRootPath = dirname(currentCodeCachePath);
            const currentCodeCache = basename(currentCodeCachePath);
            const codeCaches = await Promises.readdir(codeCacheRootPath);
            await Promise.all(codeCaches.map(async (codeCache) => {
                if (codeCache === currentCodeCache) {
                    return; // not the current cache folder
                }
                // Delete cache folder if old enough
                const codeCacheEntryPath = join(codeCacheRootPath, codeCache);
                const codeCacheEntryStat = await promises.stat(codeCacheEntryPath);
                if (codeCacheEntryStat.isDirectory() && (now - codeCacheEntryStat.mtime.getTime()) > this.dataMaxAge) {
                    this.logService.trace(`[code cache cleanup]: Removing code cache folder ${codeCache}.`);
                    return Promises.rm(codeCacheEntryPath);
                }
            }));
        }
        catch (error) {
            onUnexpectedError(error);
        }
    }
};
CodeCacheCleaner = __decorate([
    __param(1, IProductService),
    __param(2, ILogService)
], CodeCacheCleaner);
export { CodeCacheCleaner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNhY2hlQ2xlYW5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXV0aWxpdHkvc2hhcmVkUHJvY2Vzcy9jb250cmliL2NvZGVDYWNoZUNsZWFuZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUM5QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakYsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBSS9DLFlBQ0Msb0JBQXdDLEVBQ3ZCLGNBQStCLEVBQ2xCLFVBQXVCO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBRnNCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFJckQsSUFBSSxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUMsT0FBTyxLQUFLLFFBQVE7WUFDcEQsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUcsNEJBQTRCO1lBQ3hELENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLDRCQUE0QjtRQUU3RCwwRUFBMEU7UUFDMUUsNkVBQTZFO1FBQzdFLGlDQUFpQztRQUNqQyxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDMUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtnQkFDMUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDOUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztZQUMvQixTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsb0JBQTRCO1FBQzNELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLG9FQUFvRSxDQUFDLENBQUM7UUFFNUYsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRXZCLG9EQUFvRDtZQUNwRCxnREFBZ0Q7WUFDaEQsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUN4RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBRXhELE1BQU0sVUFBVSxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzdELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxTQUFTLEVBQUMsRUFBRTtnQkFDbEQsSUFBSSxTQUFTLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztvQkFDcEMsT0FBTyxDQUFDLCtCQUErQjtnQkFDeEMsQ0FBQztnQkFFRCxvQ0FBb0M7Z0JBQ3BDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUM5RCxNQUFNLGtCQUFrQixHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNuRSxJQUFJLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDdEcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsb0RBQW9ELFNBQVMsR0FBRyxDQUFDLENBQUM7b0JBRXhGLE9BQU8sUUFBUSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUN4QyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXhEWSxnQkFBZ0I7SUFNMUIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFdBQVcsQ0FBQTtHQVBELGdCQUFnQixDQXdENUIifQ==