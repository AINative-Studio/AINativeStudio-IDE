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
import { join } from '../../../../base/common/path.js';
import { Promises } from '../../../../base/node/pfs.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
let LanguagePackCachedDataCleaner = class LanguagePackCachedDataCleaner extends Disposable {
    constructor(environmentService, logService, productService) {
        super();
        this.environmentService = environmentService;
        this.logService = logService;
        this.dataMaxAge = productService.quality !== 'stable'
            ? 1000 * 60 * 60 * 24 * 7 // roughly 1 week (insiders)
            : 1000 * 60 * 60 * 24 * 30 * 3; // roughly 3 months (stable)
        // We have no Language pack support for dev version (run from source)
        // So only cleanup when we have a build version.
        if (this.environmentService.isBuilt) {
            const scheduler = this._register(new RunOnceScheduler(() => {
                this.cleanUpLanguagePackCache();
            }, 40 * 1000 /* after 40s */));
            scheduler.schedule();
        }
    }
    async cleanUpLanguagePackCache() {
        this.logService.trace('[language pack cache cleanup]: Starting to clean up unused language packs.');
        try {
            const installed = Object.create(null);
            const metaData = JSON.parse(await promises.readFile(join(this.environmentService.userDataPath, 'languagepacks.json'), 'utf8'));
            for (const locale of Object.keys(metaData)) {
                const entry = metaData[locale];
                installed[`${entry.hash}.${locale}`] = true;
            }
            // Cleanup entries for language packs that aren't installed anymore
            const cacheDir = join(this.environmentService.userDataPath, 'clp');
            const cacheDirExists = await Promises.exists(cacheDir);
            if (!cacheDirExists) {
                return;
            }
            const entries = await Promises.readdir(cacheDir);
            for (const entry of entries) {
                if (installed[entry]) {
                    this.logService.trace(`[language pack cache cleanup]: Skipping folder ${entry}. Language pack still in use.`);
                    continue;
                }
                this.logService.trace(`[language pack cache cleanup]: Removing unused language pack: ${entry}`);
                await Promises.rm(join(cacheDir, entry));
            }
            const now = Date.now();
            for (const packEntry of Object.keys(installed)) {
                const folder = join(cacheDir, packEntry);
                const entries = await Promises.readdir(folder);
                for (const entry of entries) {
                    if (entry === 'tcf.json') {
                        continue;
                    }
                    const candidate = join(folder, entry);
                    const stat = await promises.stat(candidate);
                    if (stat.isDirectory() && (now - stat.mtime.getTime()) > this.dataMaxAge) {
                        this.logService.trace(`[language pack cache cleanup]: Removing language pack cache folder: ${join(packEntry, entry)}`);
                        await Promises.rm(candidate);
                    }
                }
            }
        }
        catch (error) {
            onUnexpectedError(error);
        }
    }
};
LanguagePackCachedDataCleaner = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ILogService),
    __param(2, IProductService)
], LanguagePackCachedDataCleaner);
export { LanguagePackCachedDataCleaner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrQ2FjaGVkRGF0YUNsZWFuZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi11dGlsaXR5L3NoYXJlZFByb2Nlc3MvY29udHJpYi9sYW5ndWFnZVBhY2tDYWNoZWREYXRhQ2xlYW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzlCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFtQmpGLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsVUFBVTtJQUk1RCxZQUM2QyxrQkFBNkMsRUFDM0QsVUFBdUIsRUFDcEMsY0FBK0I7UUFFaEQsS0FBSyxFQUFFLENBQUM7UUFKb0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQUMzRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBS3JELElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLE9BQU8sS0FBSyxRQUFRO1lBQ3BELENBQUMsQ0FB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