/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultGenerator } from '../../../../base/common/idGenerator.js';
import { equals } from '../../../../base/common/objects.js';
var LoadingPhase;
(function (LoadingPhase) {
    LoadingPhase[LoadingPhase["Created"] = 1] = "Created";
    LoadingPhase[LoadingPhase["Loading"] = 2] = "Loading";
    LoadingPhase[LoadingPhase["Loaded"] = 3] = "Loaded";
    LoadingPhase[LoadingPhase["Errored"] = 4] = "Errored";
    LoadingPhase[LoadingPhase["Disposed"] = 5] = "Disposed";
})(LoadingPhase || (LoadingPhase = {}));
export class FileQueryCacheState {
    get cacheKey() {
        if (this.loadingPhase === LoadingPhase.Loaded || !this.previousCacheState) {
            return this._cacheKey;
        }
        return this.previousCacheState.cacheKey;
    }
    get isLoaded() {
        const isLoaded = this.loadingPhase === LoadingPhase.Loaded;
        return isLoaded || !this.previousCacheState ? isLoaded : this.previousCacheState.isLoaded;
    }
    get isUpdating() {
        const isUpdating = this.loadingPhase === LoadingPhase.Loading;
        return isUpdating || !this.previousCacheState ? isUpdating : this.previousCacheState.isUpdating;
    }
    constructor(cacheQuery, loadFn, disposeFn, previousCacheState) {
        this.cacheQuery = cacheQuery;
        this.loadFn = loadFn;
        this.disposeFn = disposeFn;
        this.previousCacheState = previousCacheState;
        this._cacheKey = defaultGenerator.nextId();
        this.query = this.cacheQuery(this._cacheKey);
        this.loadingPhase = LoadingPhase.Created;
        if (this.previousCacheState) {
            const current = Object.assign({}, this.query, { cacheKey: null });
            const previous = Object.assign({}, this.previousCacheState.query, { cacheKey: null });
            if (!equals(current, previous)) {
                this.previousCacheState.dispose();
                this.previousCacheState = undefined;
            }
        }
    }
    load() {
        if (this.isUpdating) {
            return this;
        }
        this.loadingPhase = LoadingPhase.Loading;
        this.loadPromise = (async () => {
            try {
                await this.loadFn(this.query);
                this.loadingPhase = LoadingPhase.Loaded;
                if (this.previousCacheState) {
                    this.previousCacheState.dispose();
                    this.previousCacheState = undefined;
                }
            }
            catch (error) {
                this.loadingPhase = LoadingPhase.Errored;
                throw error;
            }
        })();
        return this;
    }
    dispose() {
        if (this.loadPromise) {
            (async () => {
                try {
                    await this.loadPromise;
                }
                catch (error) {
                    // ignore
                }
                this.loadingPhase = LoadingPhase.Disposed;
                this.disposeFn(this._cacheKey);
            })();
        }
        else {
            this.loadingPhase = LoadingPhase.Disposed;
        }
        if (this.previousCacheState) {
            this.previousCacheState.dispose();
            this.previousCacheState = undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2NvbW1vbi9jYWNoZVN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRTFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1RCxJQUFLLFlBTUo7QUFORCxXQUFLLFlBQVk7SUFDaEIscURBQVcsQ0FBQTtJQUNYLHFEQUFXLENBQUE7SUFDWCxtREFBVSxDQUFBO0lBQ1YscURBQVcsQ0FBQTtJQUNYLHVEQUFZLENBQUE7QUFDYixDQUFDLEVBTkksWUFBWSxLQUFaLFlBQVksUUFNaEI7QUFFRCxNQUFNLE9BQU8sbUJBQW1CO0lBRy9CLElBQUksUUFBUTtRQUNYLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDM0UsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ3ZCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUM7SUFDekMsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUUzRCxPQUFPLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDO0lBQzNGLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxPQUFPLENBQUM7UUFFOUQsT0FBTyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQztJQUNqRyxDQUFDO0lBT0QsWUFDUyxVQUE0QyxFQUM1QyxNQUEyQyxFQUMzQyxTQUE4QyxFQUM5QyxrQkFBbUQ7UUFIbkQsZUFBVSxHQUFWLFVBQVUsQ0FBa0M7UUFDNUMsV0FBTSxHQUFOLE1BQU0sQ0FBcUM7UUFDM0MsY0FBUyxHQUFULFNBQVMsQ0FBcUM7UUFDOUMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFpQztRQTlCM0MsY0FBUyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO1FBcUJ0QyxVQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFakQsaUJBQVksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDO1FBUzNDLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDN0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN0RixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUM7WUFDckMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztRQUV6QyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDOUIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRTlCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztnQkFFeEMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDN0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNsQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDO2dCQUNyQyxDQUFDO1lBQ0YsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztnQkFFekMsTUFBTSxLQUFLLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVMLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNYLElBQUksQ0FBQztvQkFDSixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQ3hCLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsU0FBUztnQkFDVixDQUFDO2dCQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDaEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNOLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO1FBQzNDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDO1FBQ3JDLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==