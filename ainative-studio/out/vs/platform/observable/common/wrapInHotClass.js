var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isHotReloadEnabled } from '../../../base/common/hotReload.js';
import { autorunWithStore } from '../../../base/common/observable.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
export function hotClassGetOriginalInstance(value) {
    if (value instanceof BaseClass) {
        return value._instance;
    }
    return value;
}
/**
 * Wrap a class in a reloadable wrapper.
 * When the wrapper is created, the original class is created.
 * When the original class changes, the instance is re-created.
*/
export function wrapInHotClass0(clazz) {
    return !isHotReloadEnabled() ? clazz.get() : createWrapper(clazz, BaseClass0);
}
class BaseClass {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    init(...params) { }
}
function createWrapper(clazz, B) {
    return (class ReloadableWrapper extends B {
        constructor() {
            super(...arguments);
            this._autorun = undefined;
        }
        init(...params) {
            this._autorun = autorunWithStore((reader, store) => {
                const clazz_ = clazz.read(reader);
                this._instance = store.add(this.instantiationService.createInstance(clazz_, ...params));
            });
        }
        dispose() {
            this._autorun?.dispose();
        }
    });
}
let BaseClass0 = class BaseClass0 extends BaseClass {
    constructor(i) { super(i); this.init(); }
};
BaseClass0 = __decorate([
    __param(0, IInstantiationService)
], BaseClass0);
/**
 * Wrap a class in a reloadable wrapper.
 * When the wrapper is created, the original class is created.
 * When the original class changes, the instance is re-created.
*/
export function wrapInHotClass1(clazz) {
    return !isHotReloadEnabled() ? clazz.get() : createWrapper(clazz, BaseClass1);
}
let BaseClass1 = class BaseClass1 extends BaseClass {
    constructor(param1, i) { super(i); this.init(param1); }
};
BaseClass1 = __decorate([
    __param(1, IInstantiationService)
], BaseClass1);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3JhcEluSG90Q2xhc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vYnNlcnZhYmxlL2NvbW1vbi93cmFwSW5Ib3RDbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQWUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRixPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFcEcsTUFBTSxVQUFVLDJCQUEyQixDQUFJLEtBQVE7SUFDdEQsSUFBSSxLQUFLLFlBQVksU0FBUyxFQUFFLENBQUM7UUFDaEMsT0FBTyxLQUFLLENBQUMsU0FBZ0IsQ0FBQztJQUMvQixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQ7Ozs7RUFJRTtBQUNGLE1BQU0sVUFBVSxlQUFlLENBQWlDLEtBQWlDO0lBQ2hHLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUlELE1BQU0sU0FBUztJQUdkLFlBQ2lCLG9CQUEyQztRQUEzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO0lBQ3hELENBQUM7SUFFRSxJQUFJLENBQUMsR0FBRyxNQUFhLElBQVUsQ0FBQztDQUN2QztBQUVELFNBQVMsYUFBYSxDQUFrQixLQUF1QixFQUFFLENBQWdDO0lBQ2hHLE9BQU8sQ0FBQyxNQUFNLGlCQUFrQixTQUFRLENBQUM7UUFBakM7O1lBQ0MsYUFBUSxHQUE0QixTQUFTLENBQUM7UUFZdkQsQ0FBQztRQVZTLElBQUksQ0FBQyxHQUFHLE1BQWE7WUFDN0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDbEQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFnQixDQUFDLENBQUM7WUFDeEcsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTztZQUNOLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDMUIsQ0FBQztLQUNELENBQVEsQ0FBQztBQUNYLENBQUM7QUFFRCxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEsU0FBUztJQUNqQyxZQUFtQyxDQUF3QixJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDdkYsQ0FBQTtBQUZLLFVBQVU7SUFDRixXQUFBLHFCQUFxQixDQUFBO0dBRDdCLFVBQVUsQ0FFZjtBQUVEOzs7O0VBSUU7QUFDRixNQUFNLFVBQVUsZUFBZSxDQUEyQyxLQUFpQztJQUMxRyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFFRCxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEsU0FBUztJQUNqQyxZQUFZLE1BQVcsRUFBeUIsQ0FBd0IsSUFBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMzRyxDQUFBO0FBRkssVUFBVTtJQUNXLFdBQUEscUJBQXFCLENBQUE7R0FEMUMsVUFBVSxDQUVmIn0=