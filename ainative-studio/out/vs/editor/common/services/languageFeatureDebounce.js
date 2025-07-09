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
import { doHash } from '../../../base/common/hash.js';
import { LRUCache } from '../../../base/common/map.js';
import { clamp, MovingAverage, SlidingWindowAverage } from '../../../base/common/numbers.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { matchesScheme } from '../../../base/common/network.js';
export const ILanguageFeatureDebounceService = createDecorator('ILanguageFeatureDebounceService');
var IdentityHash;
(function (IdentityHash) {
    const _hashes = new WeakMap();
    let pool = 0;
    function of(obj) {
        let value = _hashes.get(obj);
        if (value === undefined) {
            value = ++pool;
            _hashes.set(obj, value);
        }
        return value;
    }
    IdentityHash.of = of;
})(IdentityHash || (IdentityHash = {}));
class NullDebounceInformation {
    constructor(_default) {
        this._default = _default;
    }
    get(_model) {
        return this._default;
    }
    update(_model, _value) {
        return this._default;
    }
    default() {
        return this._default;
    }
}
class FeatureDebounceInformation {
    constructor(_logService, _name, _registry, _default, _min, _max) {
        this._logService = _logService;
        this._name = _name;
        this._registry = _registry;
        this._default = _default;
        this._min = _min;
        this._max = _max;
        this._cache = new LRUCache(50, 0.7);
    }
    _key(model) {
        return model.id + this._registry.all(model).reduce((hashVal, obj) => doHash(IdentityHash.of(obj), hashVal), 0);
    }
    get(model) {
        const key = this._key(model);
        const avg = this._cache.get(key);
        return avg
            ? clamp(avg.value, this._min, this._max)
            : this.default();
    }
    update(model, value) {
        const key = this._key(model);
        let avg = this._cache.get(key);
        if (!avg) {
            avg = new SlidingWindowAverage(6);
            this._cache.set(key, avg);
        }
        const newValue = clamp(avg.update(value), this._min, this._max);
        if (!matchesScheme(model.uri, 'output')) {
            this._logService.trace(`[DEBOUNCE: ${this._name}] for ${model.uri.toString()} is ${newValue}ms`);
        }
        return newValue;
    }
    _overall() {
        const result = new MovingAverage();
        for (const [, avg] of this._cache) {
            result.update(avg.value);
        }
        return result.value;
    }
    default() {
        const value = (this._overall() | 0) || this._default;
        return clamp(value, this._min, this._max);
    }
}
let LanguageFeatureDebounceService = class LanguageFeatureDebounceService {
    constructor(_logService, envService) {
        this._logService = _logService;
        this._data = new Map();
        this._isDev = envService.isExtensionDevelopment || !envService.isBuilt;
    }
    for(feature, name, config) {
        const min = config?.min ?? 50;
        const max = config?.max ?? min ** 2;
        const extra = config?.key ?? undefined;
        const key = `${IdentityHash.of(feature)},${min}${extra ? ',' + extra : ''}`;
        let info = this._data.get(key);
        if (!info) {
            if (this._isDev) {
                this._logService.debug(`[DEBOUNCE: ${name}] is disabled in developed mode`);
                info = new NullDebounceInformation(min * 1.5);
            }
            else {
                info = new FeatureDebounceInformation(this._logService, name, feature, (this._overallAverage() | 0) || (min * 1.5), // default is overall default or derived from min-value
                min, max);
            }
            this._data.set(key, info);
        }
        return info;
    }
    _overallAverage() {
        // Average of all language features. Not a great value but an approximation
        const result = new MovingAverage();
        for (const info of this._data.values()) {
            result.update(info.default());
        }
        return result.value;
    }
};
LanguageFeatureDebounceService = __decorate([
    __param(0, ILogService),
    __param(1, IEnvironmentService)
], LanguageFeatureDebounceService);
export { LanguageFeatureDebounceService };
registerSingleton(ILanguageFeatureDebounceService, LanguageFeatureDebounceService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VGZWF0dXJlRGVib3VuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9sYW5ndWFnZUZlYXR1cmVEZWJvdW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR2hFLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGVBQWUsQ0FBa0MsaUNBQWlDLENBQUMsQ0FBQztBQWVuSSxJQUFVLFlBQVksQ0FXckI7QUFYRCxXQUFVLFlBQVk7SUFDckIsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUM7SUFDOUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2IsU0FBZ0IsRUFBRSxDQUFDLEdBQVc7UUFDN0IsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QixJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FB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