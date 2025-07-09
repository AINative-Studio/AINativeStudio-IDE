/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows, isLinux } from '../../../../base/common/platform.js';
import { getKeyboardLayoutId } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
function deserializeMapping(serializedMapping) {
    const mapping = serializedMapping;
    const ret = {};
    for (const key in mapping) {
        const result = mapping[key];
        if (result.length) {
            const value = result[0];
            const withShift = result[1];
            const withAltGr = result[2];
            const withShiftAltGr = result[3];
            const mask = Number(result[4]);
            const vkey = result.length === 6 ? result[5] : undefined;
            ret[key] = {
                'value': value,
                'vkey': vkey,
                'withShift': withShift,
                'withAltGr': withAltGr,
                'withShiftAltGr': withShiftAltGr,
                'valueIsDeadKey': (mask & 1) > 0,
                'withShiftIsDeadKey': (mask & 2) > 0,
                'withAltGrIsDeadKey': (mask & 4) > 0,
                'withShiftAltGrIsDeadKey': (mask & 8) > 0
            };
        }
        else {
            ret[key] = {
                'value': '',
                'valueIsDeadKey': false,
                'withShift': '',
                'withShiftIsDeadKey': false,
                'withAltGr': '',
                'withAltGrIsDeadKey': false,
                'withShiftAltGr': '',
                'withShiftAltGrIsDeadKey': false
            };
        }
    }
    return ret;
}
export class KeymapInfo {
    constructor(layout, secondaryLayouts, keyboardMapping, isUserKeyboardLayout) {
        this.layout = layout;
        this.secondaryLayouts = secondaryLayouts;
        this.mapping = deserializeMapping(keyboardMapping);
        this.isUserKeyboardLayout = !!isUserKeyboardLayout;
        this.layout.isUserKeyboardLayout = !!isUserKeyboardLayout;
    }
    static createKeyboardLayoutFromDebugInfo(layout, value, isUserKeyboardLayout) {
        const keyboardLayoutInfo = new KeymapInfo(layout, [], {}, true);
        keyboardLayoutInfo.mapping = value;
        return keyboardLayoutInfo;
    }
    update(other) {
        this.layout = other.layout;
        this.secondaryLayouts = other.secondaryLayouts;
        this.mapping = other.mapping;
        this.isUserKeyboardLayout = other.isUserKeyboardLayout;
        this.layout.isUserKeyboardLayout = other.isUserKeyboardLayout;
    }
    getScore(other) {
        let score = 0;
        for (const key in other) {
            if (isWindows && (key === 'Backslash' || key === 'KeyQ')) {
                // keymap from Chromium is probably wrong.
                continue;
            }
            if (isLinux && (key === 'Backspace' || key === 'Escape')) {
                // native keymap doesn't align with keyboard event
                continue;
            }
            const currentMapping = this.mapping[key];
            if (currentMapping === undefined) {
                score -= 1;
            }
            const otherMapping = other[key];
            if (currentMapping && otherMapping && currentMapping.value !== otherMapping.value) {
                score -= 1;
            }
        }
        return score;
    }
    equal(other) {
        if (this.isUserKeyboardLayout !== other.isUserKeyboardLayout) {
            return false;
        }
        if (getKeyboardLayoutId(this.layout) !== getKeyboardLayoutId(other.layout)) {
            return false;
        }
        return this.fuzzyEqual(other.mapping);
    }
    fuzzyEqual(other) {
        for (const key in other) {
            if (isWindows && (key === 'Backslash' || key === 'KeyQ')) {
                // keymap from Chromium is probably wrong.
                continue;
            }
            if (this.mapping[key] === undefined) {
                return false;
            }
            const currentMapping = this.mapping[key];
            const otherMapping = other[key];
            if (currentMapping.value !== otherMapping.value) {
                return false;
            }
        }
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5bWFwSW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy9jb21tb24va2V5bWFwSW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBdUIsTUFBTSw4REFBOEQsQ0FBQztBQUV4SCxTQUFTLGtCQUFrQixDQUFDLGlCQUFxQztJQUNoRSxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQztJQUVsQyxNQUFNLEdBQUcsR0FBMkIsRUFBRSxDQUFDO0lBQ3ZDLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDM0IsTUFBTSxNQUFNLEdBQXdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVCLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUN6RCxHQUFH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