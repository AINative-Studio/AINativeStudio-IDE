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
import { Event } from '../../../../base/common/event.js';
import { LRUCache } from '../../../../base/common/map.js';
import { Range } from '../../../common/core/range.js';
import { CodeLensModel } from './codelens.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { runWhenWindowIdle } from '../../../../base/browser/dom.js';
export const ICodeLensCache = createDecorator('ICodeLensCache');
class CacheItem {
    constructor(lineCount, data) {
        this.lineCount = lineCount;
        this.data = data;
    }
}
let CodeLensCache = class CodeLensCache {
    constructor(storageService) {
        this._fakeProvider = new class {
            provideCodeLenses() {
                throw new Error('not supported');
            }
        };
        this._cache = new LRUCache(20, 0.75);
        // remove old data
        const oldkey = 'codelens/cache';
        runWhenWindowIdle(mainWindow, () => storageService.remove(oldkey, 1 /* StorageScope.WORKSPACE */));
        // restore lens data on start
        const key = 'codelens/cache2';
        const raw = storageService.get(key, 1 /* StorageScope.WORKSPACE */, '{}');
        this._deserialize(raw);
        // store lens data on shutdown
        const onWillSaveStateBecauseOfShutdown = Event.filter(storageService.onWillSaveState, e => e.reason === WillSaveStateReason.SHUTDOWN);
        Event.once(onWillSaveStateBecauseOfShutdown)(e => {
            storageService.store(key, this._serialize(), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        });
    }
    put(model, data) {
        // create a copy of the model that is without command-ids
        // but with comand-labels
        const copyItems = data.lenses.map((item) => {
            return {
                range: item.symbol.range,
                command: item.symbol.command && { id: '', title: item.symbol.command?.title },
            };
        });
        const copyModel = new CodeLensModel();
        copyModel.add({ lenses: copyItems }, this._fakeProvider);
        const item = new CacheItem(model.getLineCount(), copyModel);
        this._cache.set(model.uri.toString(), item);
    }
    get(model) {
        const item = this._cache.get(model.uri.toString());
        return item && item.lineCount === model.getLineCount() ? item.data : undefined;
    }
    delete(model) {
        this._cache.delete(model.uri.toString());
    }
    // --- persistence
    _serialize() {
        const data = Object.create(null);
        for (const [key, value] of this._cache) {
            const lines = new Set();
            for (const d of value.data.lenses) {
                lines.add(d.symbol.range.startLineNumber);
            }
            data[key] = {
                lineCount: value.lineCount,
                lines: [...lines.values()]
            };
        }
        return JSON.stringify(data);
    }
    _deserialize(raw) {
        try {
            const data = JSON.parse(raw);
            for (const key in data) {
                const element = data[key];
                const lenses = [];
                for (const line of element.lines) {
                    lenses.push({ range: new Range(line, 1, line, 11) });
                }
                const model = new CodeLensModel();
                model.add({ lenses }, this._fakeProvider);
                this._cache.set(key, new CacheItem(element.lineCount, model));
            }
        }
        catch {
            // ignore...
        }
    }
};
CodeLensCache = __decorate([
    __param(0, IStorageService)
], CodeLensCache);
export { CodeLensCache };
registerSingleton(ICodeLensCache, CodeLensCache, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUxlbnNDYWNoZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlbGVucy9icm93c2VyL2NvZGVMZW5zQ2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHdEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM5QyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQStCLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkksT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXBFLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQWlCLGdCQUFnQixDQUFDLENBQUM7QUFjaEYsTUFBTSxTQUFTO0lBRWQsWUFDVSxTQUFpQixFQUNqQixJQUFtQjtRQURuQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLFNBQUksR0FBSixJQUFJLENBQWU7SUFDekIsQ0FBQztDQUNMO0FBRU0sSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYTtJQVl6QixZQUE2QixjQUErQjtRQVIzQyxrQkFBYSxHQUFHLElBQUk7WUFDcEMsaUJBQWlCO2dCQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2xDLENBQUM7U0FDRCxDQUFDO1FBRWUsV0FBTSxHQUFHLElBQUksUUFBUSxDQUFvQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFJbkUsa0JBQWtCO1FBQ2xCLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDO1FBQ2hDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0saUNBQXlCLENBQUMsQ0FBQztRQUUzRiw2QkFBNkI7UUFDN0IsTUFBTSxHQUFHLEdBQUcsaUJBQWlCLENBQUM7UUFDOUIsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGtDQUEwQixJQUFJLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXZCLDhCQUE4QjtRQUM5QixNQUFNLGdDQUFnQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEksS0FBSyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2hELGNBQWMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsZ0VBQWdELENBQUM7UUFDN0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsR0FBRyxDQUFDLEtBQWlCLEVBQUUsSUFBbUI7UUFDekMseURBQXlEO1FBQ3pELHlCQUF5QjtRQUN6QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBWSxFQUFFO1lBQ3BELE9BQU87Z0JBQ04sS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDeEIsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFO2FBQzdFLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sU0FBUyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7UUFDdEMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFekQsTUFBTSxJQUFJLEdBQUcsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxLQUFpQjtRQUNwQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDbkQsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUNoRixDQUFDO0lBRUQsTUFBTSxDQUFDLEtBQWlCO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsa0JBQWtCO0lBRVYsVUFBVTtRQUNqQixNQUFNLElBQUksR0FBeUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2RSxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFDaEMsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNuQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUc7Z0JBQ1gsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO2dCQUMxQixLQUFLLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUMxQixDQUFDO1FBQ0gsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRU8sWUFBWSxDQUFDLEdBQVc7UUFDL0IsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLEdBQXlDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkUsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDeEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxQixNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUM7Z0JBQzlCLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDdEQsQ0FBQztnQkFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNsQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQy9ELENBQUM7UUFDRixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsWUFBWTtRQUNiLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFGWSxhQUFhO0lBWVosV0FBQSxlQUFlLENBQUE7R0FaaEIsYUFBYSxDQTBGekI7O0FBRUQsaUJBQWlCLENBQUMsY0FBYyxFQUFFLGFBQWEsb0NBQTRCLENBQUMifQ==