/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../base/common/event.js';
import { Disposable, toDisposable } from '../../base/common/lifecycle.js';
export class TokenizationRegistry {
    constructor() {
        this._tokenizationSupports = new Map();
        this._factories = new Map();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._colorMap = null;
    }
    handleChange(languageIds) {
        this._onDidChange.fire({
            changedLanguages: languageIds,
            changedColorMap: false
        });
    }
    register(languageId, support) {
        this._tokenizationSupports.set(languageId, support);
        this.handleChange([languageId]);
        return toDisposable(() => {
            if (this._tokenizationSupports.get(languageId) !== support) {
                return;
            }
            this._tokenizationSupports.delete(languageId);
            this.handleChange([languageId]);
        });
    }
    get(languageId) {
        return this._tokenizationSupports.get(languageId) || null;
    }
    registerFactory(languageId, factory) {
        this._factories.get(languageId)?.dispose();
        const myData = new TokenizationSupportFactoryData(this, languageId, factory);
        this._factories.set(languageId, myData);
        return toDisposable(() => {
            const v = this._factories.get(languageId);
            if (!v || v !== myData) {
                return;
            }
            this._factories.delete(languageId);
            v.dispose();
        });
    }
    async getOrCreate(languageId) {
        // check first if the support is already set
        const tokenizationSupport = this.get(languageId);
        if (tokenizationSupport) {
            return tokenizationSupport;
        }
        const factory = this._factories.get(languageId);
        if (!factory || factory.isResolved) {
            // no factory or factory.resolve already finished
            return null;
        }
        await factory.resolve();
        return this.get(languageId);
    }
    isResolved(languageId) {
        const tokenizationSupport = this.get(languageId);
        if (tokenizationSupport) {
            return true;
        }
        const factory = this._factories.get(languageId);
        if (!factory || factory.isResolved) {
            return true;
        }
        return false;
    }
    setColorMap(colorMap) {
        this._colorMap = colorMap;
        this._onDidChange.fire({
            changedLanguages: Array.from(this._tokenizationSupports.keys()),
            changedColorMap: true
        });
    }
    getColorMap() {
        return this._colorMap;
    }
    getDefaultBackground() {
        if (this._colorMap && this._colorMap.length > 2 /* ColorId.DefaultBackground */) {
            return this._colorMap[2 /* ColorId.DefaultBackground */];
        }
        return null;
    }
}
class TokenizationSupportFactoryData extends Disposable {
    get isResolved() {
        return this._isResolved;
    }
    constructor(_registry, _languageId, _factory) {
        super();
        this._registry = _registry;
        this._languageId = _languageId;
        this._factory = _factory;
        this._isDisposed = false;
        this._resolvePromise = null;
        this._isResolved = false;
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
    async resolve() {
        if (!this._resolvePromise) {
            this._resolvePromise = this._create();
        }
        return this._resolvePromise;
    }
    async _create() {
        const value = await this._factory.tokenizationSupport;
        this._isResolved = true;
        if (value && !this._isDisposed) {
            this._register(this._registry.register(this._languageId, value));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi90b2tlbml6YXRpb25SZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUl2RixNQUFNLE9BQU8sb0JBQW9CO0lBVWhDO1FBUmlCLDBCQUFxQixHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQ3BELGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBb0QsQ0FBQztRQUV6RSxpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFvQyxDQUFDO1FBQ2hFLGdCQUFXLEdBQTRDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBSzlGLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFFTSxZQUFZLENBQUMsV0FBcUI7UUFDeEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDdEIsZ0JBQWdCLEVBQUUsV0FBVztZQUM3QixlQUFlLEVBQUUsS0FBSztTQUN0QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sUUFBUSxDQUFDLFVBQWtCLEVBQUUsT0FBaUI7UUFDcEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDaEMsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDNUQsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLEdBQUcsQ0FBQyxVQUFrQjtRQUM1QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFDO0lBQzNELENBQUM7SUFFTSxlQUFlLENBQUMsVUFBa0IsRUFBRSxPQUEyQztRQUNyRixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFJLDhCQUE4QixDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0UsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDeEIsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNuQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTSxLQUFLLENBQUMsV0FBVyxDQUFDLFVBQWtCO1FBQzFDLDRDQUE0QztRQUM1QyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakQsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sbUJBQW1CLENBQUM7UUFDNUIsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLGlEQUFpRDtZQUNqRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxNQUFNLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUV4QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVNLFVBQVUsQ0FBQyxVQUFrQjtRQUNuQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakQsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVNLFdBQVcsQ0FBQyxRQUFpQjtRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUMxQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztZQUN0QixnQkFBZ0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUMvRCxlQUFlLEVBQUUsSUFBSTtTQUNyQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sV0FBVztRQUNqQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdkIsQ0FBQztJQUVNLG9CQUFvQjtRQUMxQixJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLG9DQUE0QixFQUFFLENBQUM7WUFDekUsT0FBTyxJQUFJLENBQUMsU0FBUyxtQ0FBMkIsQ0FBQztRQUNsRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0Q7QUFFRCxNQUFNLDhCQUF5QyxTQUFRLFVBQVU7SUFNaEUsSUFBVyxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0lBRUQsWUFDa0IsU0FBeUMsRUFDekMsV0FBbUIsRUFDbkIsUUFBNEM7UUFFN0QsS0FBSyxFQUFFLENBQUM7UUFKUyxjQUFTLEdBQVQsU0FBUyxDQUFnQztRQUN6QyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixhQUFRLEdBQVIsUUFBUSxDQUFvQztRQVh0RCxnQkFBVyxHQUFZLEtBQUssQ0FBQztRQUM3QixvQkFBZSxHQUF5QixJQUFJLENBQUM7UUFDN0MsZ0JBQVcsR0FBWSxLQUFLLENBQUM7SUFZckMsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFTSxLQUFLLENBQUMsT0FBTztRQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDN0IsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPO1FBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQztRQUN0RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=