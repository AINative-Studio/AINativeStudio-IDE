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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRFdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIva2V5Ym9hcmRFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGNBQWMsQ0FBQztBQUN4QyxPQUFPLEVBQUUsa0JBQWtCLEVBQVcsWUFBWSxFQUFVLE1BQU0sdUJBQXVCLENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sS0FBSyxRQUFRLE1BQU0sdUJBQXVCLENBQUM7QUFJbEQsU0FBUyxjQUFjLENBQUMsQ0FBZ0I7SUFDdkMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDaEIsMkJBQTJCO1FBQzNCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNELE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUUxQixpQkFBaUI7SUFDakIsSUFBSSxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDbkIsa0NBQTBCO0lBQzNCLENBQUM7U0FBTSxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM5QixRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUssRUFBRSxDQUFDLENBQUMsa0NBQXlCO1lBQ2xDLEtBQUssRUFBRTtnQkFDTixJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFBQyxzQ0FBNkI7Z0JBQUMsQ0FBQztnQkFDdkQsTUFBTTtZQUNQLEtBQUssRUFBRSxD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