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
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
import { CHAT_PROVIDER_ID } from './chatParticipantContribTypes.js';
import { ChatAgentLocation } from './constants.js';
export const IChatWidgetHistoryService = createDecorator('IChatWidgetHistoryService');
export const ChatInputHistoryMaxEntries = 40;
let ChatWidgetHistoryService = class ChatWidgetHistoryService {
    constructor(storageService) {
        this._onDidClearHistory = new Emitter();
        this.onDidClearHistory = this._onDidClearHistory.event;
        this.memento = new Memento('interactive-session', storageService);
        const loadedState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        for (const provider in loadedState.history) {
            // Migration from old format
            loadedState.history[provider] = loadedState.history[provider].map(entry => typeof entry === 'string' ? { text: entry } : entry);
        }
        this.viewState = loadedState;
    }
    getHistory(location) {
        const key = this.getKey(location);
        return this.viewState.history?.[key] ?? [];
    }
    getKey(location) {
        // Preserve history for panel by continuing to use the same old provider id. Use the location as a key for other chat locations.
        return location === ChatAgentLocation.Panel ? CHAT_PROVIDER_ID : location;
    }
    saveHistory(location, history) {
        if (!this.viewState.history) {
            this.viewState.history = {};
        }
        const key = this.getKey(location);
        this.viewState.history[key] = history.slice(-ChatInputHistoryMaxEntries);
        this.memento.saveMemento();
    }
    clearHistory() {
        this.viewState.history = {};
        this.memento.saveMemento();
        this._onDidClearHistory.fire();
    }
};
ChatWidgetHistoryService = __decorate([
    __param(0, IStorageService)
], ChatWidgetHistoryService);
export { ChatWidgetHistoryService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdpZGdldEhpc3RvcnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRXaWRnZXRIaXN0b3J5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBR3JELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBWSxNQUFNLGdCQUFnQixDQUFDO0FBZTdELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBNEIsMkJBQTJCLENBQUMsQ0FBQztBQWVqSCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxFQUFFLENBQUM7QUFFdEMsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7SUFTcEMsWUFDa0IsY0FBK0I7UUFKaEMsdUJBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUNqRCxzQkFBaUIsR0FBZ0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUt2RSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSwrREFBK0QsQ0FBQztRQUMzRyxLQUFLLE1BQU0sUUFBUSxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1Qyw0QkFBNEI7WUFDNUIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pJLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQztJQUM5QixDQUFDO0lBRUQsVUFBVSxDQUFDLFFBQTJCO1FBQ3JDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM1QyxDQUFDO0lBRU8sTUFBTSxDQUFDLFFBQTJCO1FBQ3pDLGdJQUFnSTtRQUNoSSxPQUFPLFFBQVEsS0FBSyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7SUFDM0UsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUEyQixFQUFFLE9BQTRCO1FBQ3BFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUN6RSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxZQUFZO1FBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2hDLENBQUM7Q0FDRCxDQUFBO0FBL0NZLHdCQUF3QjtJQVVsQyxXQUFBLGVBQWUsQ0FBQTtHQVZMLHdCQUF3QixDQStDcEMifQ==