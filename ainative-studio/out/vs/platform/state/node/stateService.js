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
import { VSBuffer } from '../../../base/common/buffer.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isUndefined, isUndefinedOrNull } from '../../../base/common/types.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
export var SaveStrategy;
(function (SaveStrategy) {
    SaveStrategy[SaveStrategy["IMMEDIATE"] = 0] = "IMMEDIATE";
    SaveStrategy[SaveStrategy["DELAYED"] = 1] = "DELAYED";
})(SaveStrategy || (SaveStrategy = {}));
export class FileStorage extends Disposable {
    constructor(storagePath, saveStrategy, logService, fileService) {
        super();
        this.storagePath = storagePath;
        this.logService = logService;
        this.fileService = fileService;
        this.storage = Object.create(null);
        this.lastSavedStorageContents = '';
        this.initializing = undefined;
        this.closing = undefined;
        this.flushDelayer = this._register(new ThrottledDelayer(saveStrategy === 0 /* SaveStrategy.IMMEDIATE */ ? 0 : 100 /* buffer saves over a short time */));
    }
    init() {
        if (!this.initializing) {
            this.initializing = this.doInit();
        }
        return this.initializing;
    }
    async doInit() {
        try {
            this.lastSavedStorageContents = (await this.fileService.readFile(this.storagePath)).value.toString();
            this.storage = JSON.parse(this.lastSavedStorageContents);
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
    }
    getItem(key, defaultValue) {
        const res = this.storage[key];
        if (isUndefinedOrNull(res)) {
            return defaultValue;
        }
        return res;
    }
    setItem(key, data) {
        this.setItems([{ key, data }]);
    }
    setItems(items) {
        let save = false;
        for (const { key, data } of items) {
            // Shortcut for data that did not change
            if (this.storage[key] === data) {
                continue;
            }
            // Remove items when they are undefined or null
            if (isUndefinedOrNull(data)) {
                if (!isUndefined(this.storage[key])) {
                    this.storage[key] = undefined;
                    save = true;
                }
            }
            // Otherwise add an item
            else {
                this.storage[key] = data;
                save = true;
            }
        }
        if (save) {
            this.save();
        }
    }
    removeItem(key) {
        // Only update if the key is actually present (not undefined)
        if (!isUndefined(this.storage[key])) {
            this.storage[key] = undefined;
            this.save();
        }
    }
    async save() {
        if (this.closing) {
            return; // already about to close
        }
        return this.flushDelayer.trigger(() => this.doSave());
    }
    async doSave() {
        if (!this.initializing) {
            return; // if we never initialized, we should not save our state
        }
        // Make sure to wait for init to finish first
        await this.initializing;
        // Return early if the database has not changed
        const serializedDatabase = JSON.stringify(this.storage, null, 4);
        if (serializedDatabase === this.lastSavedStorageContents) {
            return;
        }
        // Write to disk
        try {
            await this.fileService.writeFile(this.storagePath, VSBuffer.fromString(serializedDatabase), { atomic: { postfix: '.vsctmp' } });
            this.lastSavedStorageContents = serializedDatabase;
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    async close() {
        if (!this.closing) {
            this.closing = this.flushDelayer.trigger(() => this.doSave(), 0 /* as soon as possible */);
        }
        return this.closing;
    }
}
let StateReadonlyService = class StateReadonlyService extends Disposable {
    constructor(saveStrategy, environmentService, logService, fileService) {
        super();
        this.fileStorage = this._register(new FileStorage(environmentService.stateResource, saveStrategy, logService, fileService));
    }
    async init() {
        await this.fileStorage.init();
    }
    getItem(key, defaultValue) {
        return this.fileStorage.getItem(key, defaultValue);
    }
};
StateReadonlyService = __decorate([
    __param(1, IEnvironmentService),
    __param(2, ILogService),
    __param(3, IFileService)
], StateReadonlyService);
export { StateReadonlyService };
export class StateService extends StateReadonlyService {
    setItem(key, data) {
        this.fileStorage.setItem(key, data);
    }
    setItems(items) {
        this.fileStorage.setItems(items);
    }
    removeItem(key) {
        this.fileStorage.removeItem(key);
    }
    close() {
        return this.fileStorage.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0YXRlL25vZGUvc3RhdGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRS9FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBMkMsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDcEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBS3RELE1BQU0sQ0FBTixJQUFrQixZQUdqQjtBQUhELFdBQWtCLFlBQVk7SUFDN0IseURBQVMsQ0FBQTtJQUNULHFEQUFPLENBQUE7QUFDUixDQUFDLEVBSGlCLFlBQVksS0FBWixZQUFZLFFBRzdCO0FBRUQsTUFBTSxPQUFPLFdBQVksU0FBUSxVQUFVO0lBVTFDLFlBQ2tCLFdBQWdCLEVBQ2pDLFlBQTBCLEVBQ1QsVUFBdUIsRUFDdkIsV0FBeUI7UUFFMUMsS0FBSyxFQUFFLENBQUM7UUFMUyxnQkFBVyxHQUFYLFdBQVcsQ0FBSztRQUVoQixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3ZCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBWm5DLFlBQU8sR0FBb0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQyw2QkFBd0IsR0FB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