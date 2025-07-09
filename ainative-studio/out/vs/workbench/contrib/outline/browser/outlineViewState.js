/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
export class OutlineViewState {
    constructor() {
        this._followCursor = false;
        this._filterOnType = true;
        this._sortBy = 0 /* OutlineSortOrder.ByPosition */;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    dispose() {
        this._onDidChange.dispose();
    }
    set followCursor(value) {
        if (value !== this._followCursor) {
            this._followCursor = value;
            this._onDidChange.fire({ followCursor: true });
        }
    }
    get followCursor() {
        return this._followCursor;
    }
    get filterOnType() {
        return this._filterOnType;
    }
    set filterOnType(value) {
        if (value !== this._filterOnType) {
            this._filterOnType = value;
            this._onDidChange.fire({ filterOnType: true });
        }
    }
    set sortBy(value) {
        if (value !== this._sortBy) {
            this._sortBy = value;
            this._onDidChange.fire({ sortBy: true });
        }
    }
    get sortBy() {
        return this._sortBy;
    }
    persist(storageService) {
        storageService.store('outline/state', JSON.stringify({
            followCursor: this.followCursor,
            sortBy: this.sortBy,
            filterOnType: this.filterOnType,
        }), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    restore(storageService) {
        const raw = storageService.get('outline/state', 1 /* StorageScope.WORKSPACE */);
        if (!raw) {
            return;
        }
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch (e) {
            return;
        }
        this.followCursor = data.followCursor;
        this.sortBy = data.sortBy ?? 0 /* OutlineSortOrder.ByPosition */;
        if (typeof data.filterOnType === 'boolean') {
            this.filterOnType = data.filterOnType;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZVZpZXdTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRsaW5lL2Jyb3dzZXIvb3V0bGluZVZpZXdTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJM0QsTUFBTSxPQUFPLGdCQUFnQjtJQUE3QjtRQUVTLGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLGtCQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLFlBQU8sdUNBQStCO1FBRTdCLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQXdFLENBQUM7UUFDM0csZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztJQWdFaEQsQ0FBQztJQTlEQSxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSSxZQUFZLENBQUMsS0FBYztRQUM5QixJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7WUFDM0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNoRCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7SUFFRCxJQUFJLFlBQVksQ0FBQyxLQUFLO1FBQ3JCLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztZQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUMsS0FBdUI7UUFDakMsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQztJQUVELE9BQU8sQ0FBQyxjQUErQjtRQUN0QyxjQUFjLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3BELFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1NBQy9CLENBQUMsZ0VBQWdELENBQUM7SUFDcEQsQ0FBQztJQUVELE9BQU8sQ0FBQyxjQUErQjtRQUN0QyxNQUFNLEdBQUcsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLGVBQWUsaUNBQXlCLENBQUM7UUFDeEUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLElBQVMsQ0FBQztRQUNkLElBQUksQ0FBQztZQUNKLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDdEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSx1Q0FBK0IsQ0FBQztRQUN6RCxJQUFJLE9BQU8sSUFBSSxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDdkMsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9