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
import { ArrayQueue, CompareResult } from '../../../../base/common/arrays.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorunOpts } from '../../../../base/common/observable.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export function setStyle(element, style) {
    Object.entries(style).forEach(([key, value]) => {
        element.style.setProperty(key, toSize(value));
    });
}
function toSize(value) {
    return typeof value === 'number' ? `${value}px` : value;
}
export function applyObservableDecorations(editor, decorations) {
    const d = new DisposableStore();
    let decorationIds = [];
    d.add(autorunOpts({ debugName: () => `Apply decorations from ${decorations.debugName}` }, reader => {
        const d = decorations.read(reader);
        editor.changeDecorations(a => {
            decorationIds = a.deltaDecorations(decorationIds, d);
        });
    }));
    d.add({
        dispose: () => {
            editor.changeDecorations(a => {
                decorationIds = a.deltaDecorations(decorationIds, []);
            });
        }
    });
    return d;
}
export function* leftJoin(left, right, compare) {
    const rightQueue = new ArrayQueue(right);
    for (const leftElement of left) {
        rightQueue.takeWhile(rightElement => CompareResult.isGreaterThan(compare(leftElement, rightElement)));
        const equals = rightQueue.takeWhile(rightElement => CompareResult.isNeitherLessOrGreaterThan(compare(leftElement, rightElement)));
        yield { left: leftElement, rights: equals || [] };
    }
}
export function* join(left, right, compare) {
    const rightQueue = new ArrayQueue(right);
    for (const leftElement of left) {
        const skipped = rightQueue.takeWhile(rightElement => CompareResult.isGreaterThan(compare(leftElement, rightElement)));
        if (skipped) {
            yield { rights: skipped };
        }
        const equals = rightQueue.takeWhile(rightElement => CompareResult.isNeitherLessOrGreaterThan(compare(leftElement, rightElement)));
        yield { left: leftElement, rights: equals || [] };
    }
}
export function concatArrays(...arrays) {
    return [].concat(...arrays);
}
export function elementAtOrUndefined(arr, index) {
    return arr[index];
}
export function setFields(obj, fields) {
    return Object.assign(obj, fields);
}
export function deepMerge(source1, source2) {
    const result = {};
    for (const key in source1) {
        result[key] = source1[key];
    }
    for (const key in source2) {
        const source2Value = source2[key];
        if (typeof result[key] === 'object' && source2Value && typeof source2Value === 'object') {
            result[key] = deepMerge(result[key], source2Value);
        }
        else {
            result[key] = source2Value;
        }
    }
    return result;
}
let PersistentStore = class PersistentStore {
    constructor(key, storageService) {
        this.key = key;
        this.storageService = storageService;
        this.hasValue = false;
        this.value = undefined;
    }
    get() {
        if (!this.hasValue) {
            const value = this.storageService.get(this.key, 0 /* StorageScope.PROFILE */);
            if (value !== undefined) {
                try {
                    this.value = JSON.parse(value);
                }
                catch (e) {
                    onUnexpectedError(e);
                }
            }
            this.hasValue = true;
        }
        return this.value;
    }
    set(newValue) {
        this.value = newValue;
        this.storageService.store(this.key, JSON.stringify(this.value), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
PersistentStore = __decorate([
    __param(1, IStorageService)
], PersistentStore);
export { PersistentStore };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQWUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHakYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RyxNQUFNLFVBQVUsUUFBUSxDQUN2QixPQUFvQixFQUNwQixLQUtDO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFO1FBQzlDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxLQUFzQjtJQUNyQyxPQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3pELENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsTUFBd0IsRUFBRSxXQUFpRDtJQUNySCxNQUFNLENBQUMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lB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