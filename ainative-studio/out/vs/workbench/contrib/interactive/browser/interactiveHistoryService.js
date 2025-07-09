/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { HistoryNavigator2 } from '../../../../base/common/history.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IInteractiveHistoryService = createDecorator('IInteractiveHistoryService');
export class InteractiveHistoryService extends Disposable {
    constructor() {
        super();
        this._history = new ResourceMap();
    }
    matchesCurrent(uri, value) {
        const history = this._history.get(uri);
        if (!history) {
            return false;
        }
        return history.current() === value;
    }
    addToHistory(uri, value) {
        const history = this._history.get(uri);
        if (!history) {
            this._history.set(uri, new HistoryNavigator2([value], 50));
            return;
        }
        history.resetCursor();
        history.add(value);
    }
    getPreviousValue(uri) {
        const history = this._history.get(uri);
        return history?.previous() ?? null;
    }
    getNextValue(uri) {
        const history = this._history.get(uri);
        return history?.next() ?? null;
    }
    replaceLast(uri, value) {
        const history = this._history.get(uri);
        if (!history) {
            this._history.set(uri, new HistoryNavigator2([value], 50));
            return;
        }
        else {
            history.replaceLast(value);
            history.resetCursor();
        }
    }
    clearHistory(uri) {
        this._history.delete(uri);
    }
    has(uri) {
        return this._history.has(uri) ? true : false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVIaXN0b3J5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbnRlcmFjdGl2ZS9icm93c2VyL2ludGVyYWN0aXZlSGlzdG9yeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0YsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUE2Qiw0QkFBNEIsQ0FBQyxDQUFDO0FBY3BILE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxVQUFVO0lBSXhEO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFFUixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksV0FBVyxFQUE2QixDQUFDO0lBQzlELENBQUM7SUFFRCxjQUFjLENBQUMsR0FBUSxFQUFFLEtBQWE7UUFDckMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxZQUFZLENBQUMsR0FBUSxFQUFFLEtBQWE7UUFDbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksaUJBQWlCLENBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ25FLE9BQU87UUFDUixDQUFDO1FBRUQsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUVELGdCQUFnQixDQUFDLEdBQVE7UUFDeEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsT0FBTyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDO0lBQ3BDLENBQUM7SUFFRCxZQUFZLENBQUMsR0FBUTtRQUNwQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUV2QyxPQUFPLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUM7SUFDaEMsQ0FBQztJQUVELFdBQVcsQ0FBQyxHQUFRLEVBQUUsS0FBYTtRQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxpQkFBaUIsQ0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkUsT0FBTztRQUNSLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMzQixPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDdkIsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZLENBQUMsR0FBUTtRQUNwQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUM5QyxDQUFDO0NBRUQifQ==