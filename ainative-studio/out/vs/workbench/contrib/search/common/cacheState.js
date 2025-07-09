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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvY29tbW9uL2NhY2hlU3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFMUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVELElBQUssWUFNSjtBQU5ELFdBQUssWUFBWTtJQUNoQixxREFBVyxDQUFBO0lBQ1gscURBQVcsQ0FBQTtJQUNYLG1EQUFVLENBQUE7SUFDVixxREFBVyxDQUFBO0lBQ1gsdURBQVksQ0FBQTtBQUNiLENBQUMsRUFOSSxZQUFZLEtBQVosWUFBWSxRQU1oQjtBQUVELE1BQU0sT0FBTyxtQkFBbUI7SUFHL0IsSUFBSSxRQUFRO1FBQ1gsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUMzRSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDdkIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQztJQUN6QyxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsTUFBTSxDQUFDO1FBRTNELE9BQU8sUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUM7SUFDM0YsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE1BQU0sVUFBVSxHQUFHLElB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