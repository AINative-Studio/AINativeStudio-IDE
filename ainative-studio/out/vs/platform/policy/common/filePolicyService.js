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
import { ThrottledDelayer } from '../../../base/common/async.js';
import { Event } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { isObject } from '../../../base/common/types.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { AbstractPolicyService } from './policy.js';
function keysDiff(a, b) {
    const result = [];
    for (const key of new Set(Iterable.concat(a.keys(), b.keys()))) {
        if (a.get(key) !== b.get(key)) {
            result.push(key);
        }
    }
    return result;
}
let FilePolicyService = class FilePolicyService extends AbstractPolicyService {
    constructor(file, fileService, logService) {
        super();
        this.file = file;
        this.fileService = fileService;
        this.logService = logService;
        this.throttledDelayer = this._register(new ThrottledDelayer(500));
        const onDidChangePolicyFile = Event.filter(fileService.onDidFilesChange, e => e.affects(file));
        this._register(fileService.watch(file));
        this._register(onDidChangePolicyFile(() => this.throttledDelayer.trigger(() => this.refresh())));
    }
    async _updatePolicyDefinitions() {
        await this.refresh();
    }
    async read() {
        const policies = new Map();
        try {
            const content = await this.fileService.readFile(this.file);
            const raw = JSON.parse(content.value.toString());
            if (!isObject(raw)) {
                throw new Error('Policy file isn\'t a JSON object');
            }
            for (const key of Object.keys(raw)) {
                if (this.policyDefinitions[key]) {
                    policies.set(key, raw[key]);
                }
            }
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(`[FilePolicyService] Failed to read policies`, error);
            }
        }
        return policies;
    }
    async refresh() {
        const policies = await this.read();
        const diff = keysDiff(this.policies, policies);
        this.policies = policies;
        if (diff.length > 0) {
            this._onDidChange.fire(diff);
        }
    }
};
FilePolicyService = __decorate([
    __param(1, IFileService),
    __param(2, ILogService)
], FilePolicyService);
export { FilePolicyService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVBvbGljeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcG9saWN5L2NvbW1vbi9maWxlUG9saWN5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6RCxPQUFPLEVBQTJDLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3BHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQStCLE1BQU0sYUFBYSxDQUFDO0FBRWpGLFNBQVMsUUFBUSxDQUFJLENBQWlCLEVBQUUsQ0FBaUI7SUFDeEQsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO0lBRTVCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDO0FB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