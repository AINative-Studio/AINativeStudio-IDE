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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3JhcEluSG90Q2xhc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vb2JzZXJ2YWJsZS9jb21tb24vd3JhcEluSG90Q2xhc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFlLE1BQU0sb0NBQW9DLENBQUM7QUFDbkYsT0FBTyxFQUFrQixxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXBHLE1BQU0sVUFBVSwyQkFBMkIsQ0FBSSxLQUFRO0lBQ3RELElBQUksS0FBSyxZQUFZLFNBQVMsRUFBRSxDQUFDO1FBQ2hDLE9BQU8sS0FBSyxDQUFDLFNBQWdCLENBQUM7SUFDL0IsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVEOzs7O0VBSUU7QUFDRixNQUFNLFVBQVUsZUFBZSxDQUFpQyxLQUFpQztJQUNoRyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFJRCxNQUFNLFNBQVM7SUFHZCxZQUNpQixvQkFBMkM7UUFBM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUN4RCxDQUFDO0lBRUUsSUFBSSxDQUFDLEdBQUcsTUFBYSxJQUFVLENBQUM7Q0FDdkM7QUFFRCxTQUFTLGFBQWEsQ0FBa0IsS0FBdUIsRUFBRSxDQUFnQztJQUNoRyxPQUFPLENBQUMsTUFBTSxpQkFBa0IsU0FBUSxDQUFDO1FBQWpDOztZQUNDLGFBQVEsR0FBNEIsU0FBUyxDQUFDO1FBWXZELENBQUM7UUFWUyxJQUFJLENBQUMsR0FBRyxNQUFhO1lBQzdCLElBQUksQ0FBQyxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ2xELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBZ0IsQ0FBQyxDQUFDO1lBQ3hHLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU87WUFDTixJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQzFCLENBQUM7S0FDRCxDQUFRLENBQUM7QUFDWCxDQUFDO0FBRUQsSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFRLFNBQVM7SUFDakMsWUFBbUMsQ0FBd0IsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQ3ZGLENBQUE7QUFGSyxVQUFVO0lBQ0YsV0FBQSxxQkFBcUIsQ0FBQTtHQUQ3QixVQUFVLENBRWY7QUFFRDs7OztFQUlFO0FBQ0YsTUFBTSxVQUFVLGVBQWUsQ0FBMkMsS0FBaUM7SUFDMUcsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztBQUMvRSxDQUFDO0FBRUQsSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFRLFNBQVM7SUFDakMsWUFBWSxNQUFXLEVBQXlCLENBQXdCLElBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDM0csQ0FBQTtBQUZLLFVBQVU7SUFDVyxXQUFBLHFCQUFxQixDQUFBO0dBRDFDLFVBQVUsQ0FFZiJ9