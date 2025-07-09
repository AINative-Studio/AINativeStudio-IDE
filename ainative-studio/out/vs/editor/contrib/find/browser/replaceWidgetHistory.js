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
var ReplaceWidgetHistory_1;
import { Emitter } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let ReplaceWidgetHistory = class ReplaceWidgetHistory {
    static { ReplaceWidgetHistory_1 = this; }
    static { this.FIND_HISTORY_KEY = 'workbench.replace.history'; }
    static { this._instance = null; }
    static getOrCreate(storageService) {
        if (!ReplaceWidgetHistory_1._instance) {
            ReplaceWidgetHistory_1._instance = new ReplaceWidgetHistory_1(storageService);
        }
        return ReplaceWidgetHistory_1._instance;
    }
    constructor(storageService) {
        this.storageService = storageService;
        this.inMemoryValues = new Set();
        this._onDidChangeEmitter = new Emitter();
        this.onDidChange = this._onDidChangeEmitter.event;
        this.load();
    }
    delete(t) {
        const result = this.inMemoryValues.delete(t);
        this.save();
        return result;
    }
    add(t) {
        this.inMemoryValues.add(t);
        this.save();
        return this;
    }
    has(t) {
        return this.inMemoryValues.has(t);
    }
    clear() {
        this.inMemoryValues.clear();
        this.save();
    }
    forEach(callbackfn, thisArg) {
        // fetch latest from storage
        this.load();
        return this.inMemoryValues.forEach(callbackfn);
    }
    replace(t) {
        this.inMemoryValues = new Set(t);
        this.save();
    }
    load() {
        let result;
        const raw = this.storageService.get(ReplaceWidgetHistory_1.FIND_HISTORY_KEY, 1 /* StorageScope.WORKSPACE */);
        if (raw) {
            try {
                result = JSON.parse(raw);
            }
            catch (e) {
                // Invalid data
            }
        }
        this.inMemoryValues = new Set(result || []);
    }
    // Run saves async
    save() {
        const elements = [];
        this.inMemoryValues.forEach(e => elements.push(e));
        return new Promise(resolve => {
            this.storageService.store(ReplaceWidgetHistory_1.FIND_HISTORY_KEY, JSON.stringify(elements), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
            this._onDidChangeEmitter.fire(elements);
            resolve();
        });
    }
};
ReplaceWidgetHistory = ReplaceWidgetHistory_1 = __decorate([
    __param(0, IStorageService)
], ReplaceWidgetHistory);
export { ReplaceWidgetHistory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVdpZGdldEhpc3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZmluZC9icm93c2VyL3JlcGxhY2VXaWRnZXRIaXN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUV2RyxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFvQjs7YUFDVCxxQkFBZ0IsR0FBRywyQkFBMkIsQUFBOUIsQ0FBK0I7YUFLdkQsY0FBUyxHQUFnQyxJQUFJLEFBQXBDLENBQXFDO0lBRTdELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGNBQStCO1FBRS9CLElBQUksQ0FBQyxzQkFBb0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNyQyxzQkFBb0IsQ0FBQyxTQUFTLEdBQUcsSUFBSSxzQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBQ0QsT0FBTyxzQkFBb0IsQ0FBQyxTQUFTLENBQUM7SUFDdkMsQ0FBQztJQUVELFlBQ2tCLGNBQWdEO1FBQS9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQWhCMUQsbUJBQWMsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQWtCL0MsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksT0FBTyxFQUFZLENBQUM7UUFDbkQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBQ2xELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNiLENBQUM7SUFFRCxNQUFNLENBQUMsQ0FBUztRQUNmLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNaLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFTO1FBQ1osSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1osT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsR0FBRyxDQUFDLENBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDYixDQUFDO0lBRUQsT0FBTyxDQUFDLFVBQXFFLEVBQUUsT0FBYTtRQUMzRiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1osT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBQ0QsT0FBTyxDQUFFLENBQVc7UUFDbkIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksTUFBc0IsQ0FBQztRQUMzQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDbEMsc0JBQW9CLENBQUMsZ0JBQWdCLGlDQUVyQyxDQUFDO1FBRUYsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULElBQUksQ0FBQztnQkFDSixNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixlQUFlO1lBQ2hCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELGtCQUFrQjtJQUNsQixJQUFJO1FBQ0gsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUU7WUFDbEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLHNCQUFvQixDQUFDLGdCQUFnQixFQUNyQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyw2REFHeEIsQ0FBQztZQUNGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDeEMsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7O0FBeEZXLG9CQUFvQjtJQWtCOUIsV0FBQSxlQUFlLENBQUE7R0FsQkwsb0JBQW9CLENBeUZoQyJ9