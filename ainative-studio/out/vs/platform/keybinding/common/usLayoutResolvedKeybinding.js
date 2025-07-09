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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNMYXlvdXRSZXNvbHZlZEtleWJpbmRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5YmluZGluZy9jb21tb24vdXNMYXlvdXRSZXNvbHZlZEtleWJpbmRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFXLFlBQVksRUFBRSwwQkFBMEIsRUFBWSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9HLE9BQU8sRUFBOEIsWUFBWSxFQUFjLE1BQU0scUNBQXFDLENBQUM7QUFFM0csT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFekU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsc0JBQW9DO0lBRW5GLFlBQVksTUFBc0IsRUFBRSxFQUFtQjtRQUN0RCxLQUFLLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxPQUFnQjtRQUN6QyxJQUFJLElBQUksQ0FBQyxHQUFHLHNDQUE4QixFQUFFLENBQUM7WUFDNUMsUUFBUSxPQUFPLEVBQUUsQ0FBQztnQkFDakI7b0JBQ0MsT0FBTyxHQUFHLENBQUM7Z0JBQ1o7b0JBQ0MsT0FBTyxHQUFHLENBQUM7Z0JBQ1o7b0JBQ0MsT0FBTyxHQUFHLENBQUM7Z0JBQ1o7b0JBQ0MsT0FBTyxHQUFHLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRVMsU0FBUyxDQUFDLEtBQW1CO1FBQ3RDLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQztZ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