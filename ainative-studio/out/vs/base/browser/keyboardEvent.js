/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from './browser.js';
import { EVENT_KEY_CODE_MAP, KeyCodeUtils } from '../common/keyCodes.js';
import { KeyCodeChord } from '../common/keybindings.js';
import * as platform from '../common/platform.js';
function extractKeyCode(e) {
    if (e.charCode) {
        // "keypress" events mostly
        const char = String.fromCharCode(e.charCode).toUpperCase();
        return KeyCodeUtils.fromString(char);
    }
    const keyCode = e.keyCode;
    // browser quirks
    if (keyCode === 3) {
        return 7 /* KeyCode.PauseBreak */;
    }
    else if (browser.isFirefox) {
        switch (keyCode) {
            case 59: return 85 /* KeyCode.Semicolon */;
            case 60:
                if (platform.isLinux) {
                    return 97 /* KeyCode.IntlBackslash */;
                }
                break;
            case 61: return 86 /* KeyCode.Equal */;
            // based on: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode#numpad_keys
            case 107: return 109 /* KeyCode.NumpadAdd */;
            case 109: return 111 /* KeyCode.NumpadSubtract */;
            case 173: return 88 /* KeyCode.Minus */;
            case 224:
                if (platform.isMacintosh) {
                    return 57 /* KeyCode.Meta */;
                }
                break;
        }
    }
    else if (browser.isWebKit) {
        if (platform.isMacintosh && keyCode === 93) {
            // the two meta keys in the Mac have different key codes (91 and 93)
            return 57 /* KeyCode.Meta */;
        }
        else if (!platform.isMacintosh && keyCode === 92) {
            return 57 /* KeyCode.Meta */;
        }
    }
    // cross browser keycodes:
    return EVENT_KEY_CODE_MAP[keyCode] || 0 /* KeyCode.Unknown */;
}
const ctrlKeyMod = (platform.isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */);
const altKeyMod = 512 /* KeyMod.Alt */;
const shiftKeyMod = 1024 /* KeyMod.Shift */;
const metaKeyMod = (platform.isMacintosh ? 2048 /* KeyMod.CtrlCmd */ : 256 /* KeyMod.WinCtrl */);
export function printKeyboardEvent(e) {
    const modifiers = [];
    if (e.ctrlKey) {
        modifiers.push(`ctrl`);
    }
    if (e.shiftKey) {
        modifiers.push(`shift`);
    }
    if (e.altKey) {
        modifiers.push(`alt`);
    }
    if (e.metaKey) {
        modifiers.push(`meta`);
    }
    return `modifiers: [${modifiers.join(',')}], code: ${e.code}, keyCode: ${e.keyCode}, key: ${e.key}`;
}
export function printStandardKeyboardEvent(e) {
    const modifiers = [];
    if (e.ctrlKey) {
        modifiers.push(`ctrl`);
    }
    if (e.shiftKey) {
        modifiers.push(`shift`);
    }
    if (e.altKey) {
        modifiers.push(`alt`);
    }
    if (e.metaKey) {
        modifiers.push(`meta`);
    }
    return `modifiers: [${modifiers.join(',')}], code: ${e.code}, keyCode: ${e.keyCode} ('${KeyCodeUtils.toString(e.keyCode)}')`;
}
export class StandardKeyboardEvent {
    constructor(source) {
        this._standardKeyboardEventBrand = true;
        const e = source;
        this.browserEvent = e;
        this.target = e.target;
        this.ctrlKey = e.ctrlKey;
        this.shiftKey = e.shiftKey;
        this.altKey = e.altKey;
        this.metaKey = e.metaKey;
        this.altGraphKey = e.getModifierState?.('AltGraph');
        this.keyCode = extractKeyCode(e);
        this.code = e.code;
        // console.info(e.type + ": keyCode: " + e.keyCode + ", which: " + e.which + ", charCode: " + e.charCode + ", detail: " + e.detail + " ====> " + this.keyCode + ' -- ' + KeyCode[this.keyCode]);
        this.ctrlKey = this.ctrlKey || this.keyCode === 5 /* KeyCode.Ctrl */;
        this.altKey = this.altKey || this.keyCode === 6 /* KeyCode.Alt */;
        this.shiftKey = this.shiftKey || this.keyCode === 4 /* KeyCode.Shift */;
        this.metaKey = this.metaKey || this.keyCode === 57 /* KeyCode.Meta */;
        this._asKeybinding = this._computeKeybinding();
        this._asKeyCodeChord = this._computeKeyCodeChord();
        // console.log(`code: ${e.code}, keyCode: ${e.keyCode}, key: ${e.key}`);
    }
    preventDefault() {
        if (this.browserEvent && this.browserEvent.preventDefault) {
            this.browserEvent.preventDefault();
        }
    }
    stopPropagation() {
        if (this.browserEvent && this.browserEvent.stopPropagation) {
            this.browserEvent.stopPropagation();
        }
    }
    toKeyCodeChord() {
        return this._asKeyCodeChord;
    }
    equals(other) {
        return this._asKeybinding === other;
    }
    _computeKeybinding() {
        let key = 0 /* KeyCode.Unknown */;
        if (this.keyCode !== 5 /* KeyCode.Ctrl */ && this.keyCode !== 4 /* KeyCode.Shift */ && this.keyCode !== 6 /* KeyCode.Alt */ && this.keyCode !== 57 /* KeyCode.Meta */) {
            key = this.keyCode;
        }
        let result = 0;
        if (this.ctrlKey) {
            result |= ctrlKeyMod;
        }
        if (this.altKey) {
            result |= altKeyMod;
        }
        if (this.shiftKey) {
            result |= shiftKeyMod;
        }
        if (this.metaKey) {
            result |= metaKeyMod;
        }
        result |= key;
        return result;
    }
    _computeKeyCodeChord() {
        let key = 0 /* KeyCode.Unknown */;
        if (this.keyCode !== 5 /* KeyCode.Ctrl */ && this.keyCode !== 4 /* KeyCode.Shift */ && this.keyCode !== 6 /* KeyCode.Alt */ && this.keyCode !== 57 /* KeyCode.Meta */) {
            key = this.keyCode;
        }
        return new KeyCodeChord(this.ctrlKey, this.shiftKey, this.altKey, this.metaKey, key);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRFdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9rZXlib2FyZEV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxrQkFBa0IsRUFBVyxZQUFZLEVBQVUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDeEQsT0FBTyxLQUFLLFFBQVEsTUFBTSx1QkFBdUIsQ0FBQztBQUlsRCxTQUFTLGNBQWMsQ0FBQyxDQUFnQjtJQUN2QyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoQiwyQkFBMkI7UUFDM0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0QsT0FBTyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBRTFCLGlCQUFpQjtJQUNqQixJQUFJLE9BQU8sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNuQixrQ0FBMEI7SUFDM0IsQ0FBQztTQUFNLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzlCLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxFQUFFLENBQUMsQ0FBQyxrQ0FBeUI7WUFDbEMsS0FBSyxFQUFFO2dCQUNOLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUFDLHNDQUE2QjtnQkFBQyxDQUFDO2dCQUN2RCxNQUFNO1lBQ1AsS0FBSyxFQUFFLENB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