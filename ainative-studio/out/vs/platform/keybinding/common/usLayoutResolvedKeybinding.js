/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyCodeUtils, IMMUTABLE_CODE_TO_KEY_CODE } from '../../../base/common/keyCodes.js';
import { KeyCodeChord } from '../../../base/common/keybindings.js';
import { BaseResolvedKeybinding } from './baseResolvedKeybinding.js';
import { toEmptyArrayIfContainsNull } from './resolvedKeybindingItem.js';
/**
 * Do not instantiate. Use KeybindingService to get a ResolvedKeybinding seeded with information about the current kb layout.
 */
export class USLayoutResolvedKeybinding extends BaseResolvedKeybinding {
    constructor(chords, os) {
        super(os, chords);
    }
    _keyCodeToUILabel(keyCode) {
        if (this._os === 2 /* OperatingSystem.Macintosh */) {
            switch (keyCode) {
                case 15 /* KeyCode.LeftArrow */:
                    return '←';
                case 16 /* KeyCode.UpArrow */:
                    return '↑';
                case 17 /* KeyCode.RightArrow */:
                    return '→';
                case 18 /* KeyCode.DownArrow */:
                    return '↓';
            }
        }
        return KeyCodeUtils.toString(keyCode);
    }
    _getLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return this._keyCodeToUILabel(chord.keyCode);
    }
    _getAriaLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return KeyCodeUtils.toString(chord.keyCode);
    }
    _getElectronAccelerator(chord) {
        return KeyCodeUtils.toElectronAccelerator(chord.keyCode);
    }
    _getUserSettingsLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        const result = KeyCodeUtils.toUserSettingsUS(chord.keyCode);
        return (result ? result.toLowerCase() : result);
    }
    _isWYSIWYG() {
        return true;
    }
    _getChordDispatch(chord) {
        return USLayoutResolvedKeybinding.getDispatchStr(chord);
    }
    static getDispatchStr(chord) {
        if (chord.isModifierKey()) {
            return null;
        }
        let result = '';
        if (chord.ctrlKey) {
            result += 'ctrl+';
        }
        if (chord.shiftKey) {
            result += 'shift+';
        }
        if (chord.altKey) {
            result += 'alt+';
        }
        if (chord.metaKey) {
            result += 'meta+';
        }
        result += KeyCodeUtils.toString(chord.keyCode);
        return result;
    }
    _getSingleModifierChordDispatch(keybinding) {
        if (keybinding.keyCode === 5 /* KeyCode.Ctrl */ && !keybinding.shiftKey && !keybinding.altKey && !keybinding.metaKey) {
            return 'ctrl';
        }
        if (keybinding.keyCode === 4 /* KeyCode.Shift */ && !keybinding.ctrlKey && !keybinding.altKey && !keybinding.metaKey) {
            return 'shift';
        }
        if (keybinding.keyCode === 6 /* KeyCode.Alt */ && !keybinding.ctrlKey && !keybinding.shiftKey && !keybinding.metaKey) {
            return 'alt';
        }
        if (keybinding.keyCode === 57 /* KeyCode.Meta */ && !keybinding.ctrlKey && !keybinding.shiftKey && !keybinding.altKey) {
            return 'meta';
        }
        return null;
    }
    /**
     * *NOTE*: Check return value for `KeyCode.Unknown`.
     */
    static _scanCodeToKeyCode(scanCode) {
        const immutableKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[scanCode];
        if (immutableKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
            return immutableKeyCode;
        }
        switch (scanCode) {
            case 10 /* ScanCode.KeyA */: return 31 /* KeyCode.KeyA */;
            case 11 /* ScanCode.KeyB */: return 32 /* KeyCode.KeyB */;
            case 12 /* ScanCode.KeyC */: return 33 /* KeyCode.KeyC */;
            case 13 /* ScanCode.KeyD */: return 34 /* KeyCode.KeyD */;
            case 14 /* ScanCode.KeyE */: return 35 /* KeyCode.KeyE */;
            case 15 /* ScanCode.KeyF */: return 36 /* KeyCode.KeyF */;
            case 16 /* ScanCode.KeyG */: return 37 /* KeyCode.KeyG */;
            case 17 /* ScanCode.KeyH */: return 38 /* KeyCode.KeyH */;
            case 18 /* ScanCode.KeyI */: return 39 /* KeyCode.KeyI */;
            case 19 /* ScanCode.KeyJ */: return 40 /* KeyCode.KeyJ */;
            case 20 /* ScanCode.KeyK */: return 41 /* KeyCode.KeyK */;
            case 21 /* ScanCode.KeyL */: return 42 /* KeyCode.KeyL */;
            case 22 /* ScanCode.KeyM */: return 43 /* KeyCode.KeyM */;
            case 23 /* ScanCode.KeyN */: return 44 /* KeyCode.KeyN */;
            case 24 /* ScanCode.KeyO */: return 45 /* KeyCode.KeyO */;
            case 25 /* ScanCode.KeyP */: return 46 /* KeyCode.KeyP */;
            case 26 /* ScanCode.KeyQ */: return 47 /* KeyCode.KeyQ */;
            case 27 /* ScanCode.KeyR */: return 48 /* KeyCode.KeyR */;
            case 28 /* ScanCode.KeyS */: return 49 /* KeyCode.KeyS */;
            case 29 /* ScanCode.KeyT */: return 50 /* KeyCode.KeyT */;
            case 30 /* ScanCode.KeyU */: return 51 /* KeyCode.KeyU */;
            case 31 /* ScanCode.KeyV */: return 52 /* KeyCode.KeyV */;
            case 32 /* ScanCode.KeyW */: return 53 /* KeyCode.KeyW */;
            case 33 /* ScanCode.KeyX */: return 54 /* KeyCode.KeyX */;
            case 34 /* ScanCode.KeyY */: return 55 /* KeyCode.KeyY */;
            case 35 /* ScanCode.KeyZ */: return 56 /* KeyCode.KeyZ */;
            case 36 /* ScanCode.Digit1 */: return 22 /* KeyCode.Digit1 */;
            case 37 /* ScanCode.Digit2 */: return 23 /* KeyCode.Digit2 */;
            case 38 /* ScanCode.Digit3 */: return 24 /* KeyCode.Digit3 */;
            case 39 /* ScanCode.Digit4 */: return 25 /* KeyCode.Digit4 */;
            case 40 /* ScanCode.Digit5 */: return 26 /* KeyCode.Digit5 */;
            case 41 /* ScanCode.Digit6 */: return 27 /* KeyCode.Digit6 */;
            case 42 /* ScanCode.Digit7 */: return 28 /* KeyCode.Digit7 */;
            case 43 /* ScanCode.Digit8 */: return 29 /* KeyCode.Digit8 */;
            case 44 /* ScanCode.Digit9 */: return 30 /* KeyCode.Digit9 */;
            case 45 /* ScanCode.Digit0 */: return 21 /* KeyCode.Digit0 */;
            case 51 /* ScanCode.Minus */: return 88 /* KeyCode.Minus */;
            case 52 /* ScanCode.Equal */: return 86 /* KeyCode.Equal */;
            case 53 /* ScanCode.BracketLeft */: return 92 /* KeyCode.BracketLeft */;
            case 54 /* ScanCode.BracketRight */: return 94 /* KeyCode.BracketRight */;
            case 55 /* ScanCode.Backslash */: return 93 /* KeyCode.Backslash */;
            case 56 /* ScanCode.IntlHash */: return 0 /* KeyCode.Unknown */; // missing
            case 57 /* ScanCode.Semicolon */: return 85 /* KeyCode.Semicolon */;
            case 58 /* ScanCode.Quote */: return 95 /* KeyCode.Quote */;
            case 59 /* ScanCode.Backquote */: return 91 /* KeyCode.Backquote */;
            case 60 /* ScanCode.Comma */: return 87 /* KeyCode.Comma */;
            case 61 /* ScanCode.Period */: return 89 /* KeyCode.Period */;
            case 62 /* ScanCode.Slash */: return 90 /* KeyCode.Slash */;
            case 106 /* ScanCode.IntlBackslash */: return 97 /* KeyCode.IntlBackslash */;
        }
        return 0 /* KeyCode.Unknown */;
    }
    static _toKeyCodeChord(chord) {
        if (!chord) {
            return null;
        }
        if (chord instanceof KeyCodeChord) {
            return chord;
        }
        const keyCode = this._scanCodeToKeyCode(chord.scanCode);
        if (keyCode === 0 /* KeyCode.Unknown */) {
            return null;
        }
        return new KeyCodeChord(chord.ctrlKey, chord.shiftKey, chord.altKey, chord.metaKey, keyCode);
    }
    static resolveKeybinding(keybinding, os) {
        const chords = toEmptyArrayIfContainsNull(keybinding.chords.map(chord => this._toKeyCodeChord(chord)));
        if (chords.length > 0) {
            return [new USLayoutResolvedKeybinding(chords, os)];
        }
        return [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNMYXlvdXRSZXNvbHZlZEtleWJpbmRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvY29tbW9uL3VzTGF5b3V0UmVzb2x2ZWRLZXliaW5kaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBVyxZQUFZLEVBQUUsMEJBQTBCLEVBQVksTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRyxPQUFPLEVBQThCLFlBQVksRUFBYyxNQUFNLHFDQUFxQyxDQUFDO0FBRTNHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXpFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDBCQUEyQixTQUFRLHNCQUFvQztJQUVuRixZQUFZLE1BQXNCLEVBQUUsRUFBbUI7UUFDdEQsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNuQixDQUFDO0lBRU8saUJBQWlCLENBQUMsT0FBZ0I7UUFDekMsSUFBSSxJQUFJLENBQUMsR0FBRyxzQ0FBOEIsRUFBRSxDQUFDO1lBQzVDLFFBQVEsT0FBTyxFQUFFLENBQUM7Z0JBQ2pCO29CQUNDLE9BQU8sR0FBRyxDQUFDO2dCQUNaO29CQUNDLE9BQU8sR0FBRyxDQUFDO2dCQUNaO29CQUNDLE9BQU8sR0FBRyxDQUFDO2dCQUNaO29CQUNDLE9BQU8sR0FBRyxDQUFDO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVTLFNBQVMsQ0FBQyxLQUFtQjtRQUN0QyxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLENB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