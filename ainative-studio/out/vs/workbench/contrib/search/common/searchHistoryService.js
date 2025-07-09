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
var SearchHistoryService_1;
import { Emitter } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const ISearchHistoryService = createDecorator('searchHistoryService');
let SearchHistoryService = class SearchHistoryService {
    static { SearchHistoryService_1 = this; }
    static { this.SEARCH_HISTORY_KEY = 'workbench.search.history'; }
    constructor(storageService) {
        this.storageService = storageService;
        this._onDidClearHistory = new Emitter();
        this.onDidClearHistory = this._onDidClearHistory.event;
    }
    clearHistory() {
        this.storageService.remove(SearchHistoryService_1.SEARCH_HISTORY_KEY, 1 /* StorageScope.WORKSPACE */);
        this._onDidClearHistory.fire();
    }
    load() {
        let result;
        const raw = this.storageService.get(SearchHistoryService_1.SEARCH_HISTORY_KEY, 1 /* StorageScope.WORKSPACE */);
        if (raw) {
            try {
                result = JSON.parse(raw);
            }
            catch (e) {
                // Invalid data
            }
        }
        return result || {};
    }
    save(history) {
        if (isEmptyObject(history)) {
            this.storageService.remove(SearchHistoryService_1.SEARCH_HISTORY_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        else {
            this.storageService.store(SearchHistoryService_1.SEARCH_HISTORY_KEY, JSON.stringify(history), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        }
    }
};
SearchHistoryService = SearchHistoryService_1 = __decorate([
    __param(0, IStorageService)
], SearchHistoryService);
export { SearchHistoryService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoSGlzdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2NvbW1vbi9zZWFyY2hIaXN0b3J5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQVU3RixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUM7QUFTN0YsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBb0I7O2FBR1QsdUJBQWtCLEdBQUcsMEJBQTBCLEFBQTdCLENBQThCO0lBS3ZFLFlBQ2tCLGNBQWdEO1FBQS9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUpqRCx1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQ2pELHNCQUFpQixHQUFnQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO0lBSXBFLENBQUM7SUFFTCxZQUFZO1FBQ1gsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsc0JBQW9CLENBQUMsa0JBQWtCLGlDQUF5QixDQUFDO1FBQzVGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksTUFBd0MsQ0FBQztRQUM3QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQkFBb0IsQ0FBQyxrQkFBa0IsaUNBQXlCLENBQUM7UUFFckcsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULElBQUksQ0FBQztnQkFDSixNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixlQUFlO1lBQ2hCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLElBQUksRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBNkI7UUFDakMsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxzQkFBb0IsQ0FBQyxrQkFBa0IsaUNBQXlCLENBQUM7UUFDN0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxzQkFBb0IsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyw2REFBNkMsQ0FBQztRQUN6SSxDQUFDO0lBQ0YsQ0FBQzs7QUF0Q1csb0JBQW9CO0lBUzlCLFdBQUEsZUFBZSxDQUFBO0dBVEwsb0JBQW9CLENBdUNoQyJ9