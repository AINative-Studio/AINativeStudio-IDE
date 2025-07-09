/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ScanCodeUtils } from '../../../base/common/keyCodes.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IKeyboardLayoutService = createDecorator('keyboardLayoutService');
export function areKeyboardLayoutsEqual(a, b) {
    if (!a || !b) {
        return false;
    }
    if (a.name && b.name && a.name === b.name) {
        return true;
    }
    if (a.id && b.id && a.id === b.id) {
        return true;
    }
    if (a.model &&
        b.model &&
        a.model === b.model &&
        a.layout === b.layout) {
        return true;
    }
    return false;
}
export function parseKeyboardLayoutDescription(layout) {
    if (!layout) {
        return { label: '', description: '' };
    }
    if (layout.name) {
        // windows
        const windowsLayout = layout;
        return {
            label: windowsLayout.text,
            description: ''
        };
    }
    if (layout.id) {
        const macLayout = layout;
        if (macLayout.localizedName) {
            return {
                label: macLayout.localizedName,
                description: ''
            };
        }
        if (/^com\.apple\.keylayout\./.test(macLayout.id)) {
            return {
                label: macLayout.id.replace(/^com\.apple\.keylayout\./, '').replace(/-/, ' '),
                description: ''
            };
        }
        if (/^.*inputmethod\./.test(macLayout.id)) {
            return {
                label: macLayout.id.replace(/^.*inputmethod\./, '').replace(/[-\.]/, ' '),
                description: `Input Method (${macLayout.lang})`
            };
        }
        return {
            label: macLayout.lang,
            description: ''
        };
    }
    const linuxLayout = layout;
    return {
        label: linuxLayout.layout,
        description: ''
    };
}
export function getKeyboardLayoutId(layout) {
    if (layout.name) {
        return layout.name;
    }
    if (layout.id) {
        return layout.id;
    }
    return layout.layout;
}
function windowsKeyMappingEquals(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return (a.vkey === b.vkey
        && a.value === b.value
        && a.withShift === b.withShift
        && a.withAltGr === b.withAltGr
        && a.withShiftAltGr === b.withShiftAltGr);
}
export function windowsKeyboardMappingEquals(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    for (let scanCode = 0; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
        const strScanCode = ScanCodeUtils.toString(scanCode);
        const aEntry = a[strScanCode];
        const bEntry = b[strScanCode];
        if (!windowsKeyMappingEquals(aEntry, bEntry)) {
            return false;
        }
    }
    return true;
}
function macLinuxKeyMappingEquals(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return (a.value === b.value
        && a.withShift === b.withShift
        && a.withAltGr === b.withAltGr
        && a.withShiftAltGr === b.withShiftAltGr);
}
export function macLinuxKeyboardMappingEquals(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    for (let scanCode = 0; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
        const strScanCode = ScanCodeUtils.toString(scanCode);
        const aEntry = a[strScanCode];
        const bEntry = b[strScanCode];
        if (!macLinuxKeyMappingEquals(aEntry, bEntry)) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5Ym9hcmRMYXlvdXQvY29tbW9uL2tleWJvYXJkTGF5b3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBWSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFJOUUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFDO0FBMEV2RyxNQUFNLFVBQVUsdUJBQXVCLENBQUMsQ0FBNkIsRUFBRSxDQUE2QjtJQUNuRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDZCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFpQyxDQUFFLENBQUMsSUFBSSxJQUFpQyxDQUFFLENBQUMsSUFBSSxJQUFpQyxDQUFFLENBQUMsSUFBSSxLQUFrQyxDQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkssT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBNkIsQ0FBRSxDQUFDLEVBQUUsSUFBNkIsQ0FBRSxDQUFDLEVBQUUsSUFBNkIsQ0FBRSxDQUFDLEVBQUUsS0FBOEIsQ0FBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzNJLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQStCLENBQUUsQ0FBQyxLQUFLO1FBQ1gsQ0FBRSxDQUFDLEtBQUs7UUFDUixDQUFFLENBQUMsS0FBSyxLQUFnQyxDQUFFLENBQUMsS0FBSztRQUNoRCxDQUFFLENBQUMsTUFBTSxLQUFnQyxDQUFFLENBQUMsTUFBTSxFQUM1RSxDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQsTUFBTSxVQUFVLDhCQUE4QixDQUFDLE1BQWtDO0lBQ2hGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRUQsSUFBaUMsTUFBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQy9DLFVBQVU7UUFDVixNQUFNLGFBQWEsR0FBK0IsTUFBTSxDQUFDO1FBQ3pELE9BQU87WUFDTixLQUFLLEVBQUUsYUFBYSxDQUFDLElBQUk7WUFDekIsV0FBVyxFQUFFLEVBQUU7U0FDZixDQUFDO0lBQ0gsQ0FBQztJQUVELElBQTZCLE1BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN6QyxNQUFNLFNBQVMsR0FBMkIsTUFBTSxDQUFDO1FBQ2pELElBQUksU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzdCLE9BQU87Z0JBQ04sS0FBSyxFQUFFLFNBQVMsQ0FBQyxhQUFhO2dCQUM5QixXQUFXLEVBQUUsRUFBRTthQUNmLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDbkQsT0FBTztnQkFDTixLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQzdFLFdBQVcsRUFBRSxFQUFFO2FBQ2YsQ0FBQztRQUNILENBQUM7UUFDRCxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMzQyxPQUFPO2dCQUNOLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQztnQkFDekUsV0FBVyxFQUFFLGlCQUFpQixTQUFTLENBQUMsSUFBSSxHQUFHO2FBQy9DLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTztZQUNOLEtBQUssRUFBRSxTQUFTLENBQUMsSUFBSTtZQUNyQixXQUFXLEVBQUUsRUFBRTtTQUNmLENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxXQUFXLEdBQTZCLE1BQU0sQ0FBQztJQUVyRCxPQUFPO1FBQ04sS0FBSyxFQUFFLFdBQVcsQ0FBQyxNQUFNO1FBQ3pCLFdBQVcsRUFBRSxFQUFFO0tBQ2YsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsTUFBMkI7SUFDOUQsSUFBaUMsTUFBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQy9DLE9BQW9DLE1BQU8sQ0FBQyxJQUFJLENBQUM7SUFDbEQsQ0FBQztJQUVELElBQTZCLE1BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN6QyxPQUFnQyxNQUFPLENBQUMsRUFBRSxDQUFDO0lBQzVDLENBQUM7SUFFRCxPQUFrQyxNQUFPLENBQUMsTUFBTSxDQUFDO0FBQ2xELENBQUM7QUFFRCxTQUFTLHVCQUF1QixDQUFDLENBQXFCLEVBQUUsQ0FBcUI7SUFDNUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsT0FBTyxDQUNOLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUk7V0FDZCxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxLQUFLO1dBQ25CLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVM7V0FDM0IsQ0FBQyxDQUFDLFNBQVMsS0FBSyxDQUFDLENBQUMsU0FBUztXQUMzQixDQUFDLENBQUMsY0FBYyxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQ3hDLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLENBQWlDLEVBQUUsQ0FBaUM7SUFDaEgsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsS0FBSyxJQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUUsUUFBUSwrQkFBcUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQ2xFLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDOUMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsQ0FBc0IsRUFBRSxDQUFzQjtJQUMvRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDZCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDZCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLENBQ04sQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsS0FBSztXQUNoQixDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxTQUFTO1dBQzNCLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVM7V0FDM0IsQ0FBQyxDQUFDLGNBQWMsS0FBSyxDQUFDLENBQUMsY0FBYyxDQUN4QyxDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxDQUFrQyxFQUFFLENBQWtDO0lBQ25ILElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELEtBQUssSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLFFBQVEsK0JBQXFCLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUNsRSxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5QixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQy9DLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMifQ==