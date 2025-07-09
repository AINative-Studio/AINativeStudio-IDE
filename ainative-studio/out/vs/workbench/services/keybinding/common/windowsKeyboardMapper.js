/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyCodeUtils, IMMUTABLE_CODE_TO_KEY_CODE, ScanCodeUtils, NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE } from '../../../../base/common/keyCodes.js';
import { KeyCodeChord, ScanCodeChord } from '../../../../base/common/keybindings.js';
import { UILabelProvider } from '../../../../base/common/keybindingLabels.js';
import { BaseResolvedKeybinding } from '../../../../platform/keybinding/common/baseResolvedKeybinding.js';
import { toEmptyArrayIfContainsNull } from '../../../../platform/keybinding/common/resolvedKeybindingItem.js';
const LOG = false;
function log(str) {
    if (LOG) {
        console.info(str);
    }
}
export class WindowsNativeResolvedKeybinding extends BaseResolvedKeybinding {
    constructor(mapper, chords) {
        super(1 /* OperatingSystem.Windows */, chords);
        this._mapper = mapper;
    }
    _getLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return this._mapper.getUILabelForKeyCode(chord.keyCode);
    }
    _getUSLabelForKeybinding(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return KeyCodeUtils.toString(chord.keyCode);
    }
    getUSLabel() {
        return UILabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getUSLabelForKeybinding(keybinding));
    }
    _getAriaLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return this._mapper.getAriaLabelForKeyCode(chord.keyCode);
    }
    _getElectronAccelerator(chord) {
        return this._mapper.getElectronAcceleratorForKeyBinding(chord);
    }
    _getUserSettingsLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        const result = this._mapper.getUserSettingsLabelForKeyCode(chord.keyCode);
        return (result ? result.toLowerCase() : result);
    }
    _isWYSIWYG(chord) {
        return this.__isWYSIWYG(chord.keyCode);
    }
    __isWYSIWYG(keyCode) {
        if (keyCode === 15 /* KeyCode.LeftArrow */
            || keyCode === 16 /* KeyCode.UpArrow */
            || keyCode === 17 /* KeyCode.RightArrow */
            || keyCode === 18 /* KeyCode.DownArrow */) {
            return true;
        }
        const ariaLabel = this._mapper.getAriaLabelForKeyCode(keyCode);
        const userSettingsLabel = this._mapper.getUserSettingsLabelForKeyCode(keyCode);
        return (ariaLabel === userSettingsLabel);
    }
    _getChordDispatch(chord) {
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
    _getSingleModifierChordDispatch(chord) {
        if (chord.keyCode === 5 /* KeyCode.Ctrl */ && !chord.shiftKey && !chord.altKey && !chord.metaKey) {
            return 'ctrl';
        }
        if (chord.keyCode === 4 /* KeyCode.Shift */ && !chord.ctrlKey && !chord.altKey && !chord.metaKey) {
            return 'shift';
        }
        if (chord.keyCode === 6 /* KeyCode.Alt */ && !chord.ctrlKey && !chord.shiftKey && !chord.metaKey) {
            return 'alt';
        }
        if (chord.keyCode === 57 /* KeyCode.Meta */ && !chord.ctrlKey && !chord.shiftKey && !chord.altKey) {
            return 'meta';
        }
        return null;
    }
    static getProducedCharCode(chord, mapping) {
        if (!mapping) {
            return null;
        }
        if (chord.ctrlKey && chord.shiftKey && chord.altKey) {
            return mapping.withShiftAltGr;
        }
        if (chord.ctrlKey && chord.altKey) {
            return mapping.withAltGr;
        }
        if (chord.shiftKey) {
            return mapping.withShift;
        }
        return mapping.value;
    }
    static getProducedChar(chord, mapping) {
        const char = this.getProducedCharCode(chord, mapping);
        if (char === null || char.length === 0) {
            return ' --- ';
        }
        return '  ' + char + '  ';
    }
}
export class WindowsKeyboardMapper {
    constructor(_isUSStandard, rawMappings, _mapAltGrToCtrlAlt) {
        this._isUSStandard = _isUSStandard;
        this._mapAltGrToCtrlAlt = _mapAltGrToCtrlAlt;
        this._keyCodeToLabel = [];
        this._scanCodeToKeyCode = [];
        this._keyCodeToLabel = [];
        this._keyCodeExists = [];
        this._keyCodeToLabel[0 /* KeyCode.Unknown */] = KeyCodeUtils.toString(0 /* KeyCode.Unknown */);
        for (let scanCode = 0 /* ScanCode.None */; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
            const immutableKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[scanCode];
            if (immutableKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
                this._scanCodeToKeyCode[scanCode] = immutableKeyCode;
                this._keyCodeToLabel[immutableKeyCode] = KeyCodeUtils.toString(immutableKeyCode);
                this._keyCodeExists[immutableKeyCode] = true;
            }
        }
        const producesLetter = [];
        let producesLetters = false;
        this._codeInfo = [];
        for (const strCode in rawMappings) {
            if (rawMappings.hasOwnProperty(strCode)) {
                const scanCode = ScanCodeUtils.toEnum(strCode);
                if (scanCode === 0 /* ScanCode.None */) {
                    log(`Unknown scanCode ${strCode} in mapping.`);
                    continue;
                }
                const rawMapping = rawMappings[strCode];
                const immutableKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[scanCode];
                if (immutableKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
                    const keyCode = NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE[rawMapping.vkey] || 0 /* KeyCode.Unknown */;
                    if (keyCode === 0 /* KeyCode.Unknown */ || immutableKeyCode === keyCode) {
                        continue;
                    }
                    if (scanCode !== 134 /* ScanCode.NumpadComma */) {
                        // Looks like ScanCode.NumpadComma doesn't always map to KeyCode.NUMPAD_SEPARATOR
                        // e.g. on POR - PTB
                        continue;
                    }
                }
                const value = rawMapping.value;
                const withShift = rawMapping.withShift;
                const withAltGr = rawMapping.withAltGr;
                const withShiftAltGr = rawMapping.withShiftAltGr;
                const keyCode = NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE[rawMapping.vkey] || 0 /* KeyCode.Unknown */;
                const mapping = {
                    scanCode: scanCode,
                    keyCode: keyCode,
                    value: value,
                    withShift: withShift,
                    withAltGr: withAltGr,
                    withShiftAltGr: withShiftAltGr,
                };
                this._codeInfo[scanCode] = mapping;
                this._scanCodeToKeyCode[scanCode] = keyCode;
                if (keyCode === 0 /* KeyCode.Unknown */) {
                    continue;
                }
                this._keyCodeExists[keyCode] = true;
                if (value.length === 0) {
                    // This key does not produce strings
                    this._keyCodeToLabel[keyCode] = null;
                }
                else if (value.length > 1) {
                    // This key produces a letter representable with multiple UTF-16 code units.
                    this._keyCodeToLabel[keyCode] = value;
                }
                else {
                    const charCode = value.charCodeAt(0);
                    if (charCode >= 97 /* CharCode.a */ && charCode <= 122 /* CharCode.z */) {
                        const upperCaseValue = 65 /* CharCode.A */ + (charCode - 97 /* CharCode.a */);
                        producesLetter[upperCaseValue] = true;
                        producesLetters = true;
                        this._keyCodeToLabel[keyCode] = String.fromCharCode(65 /* CharCode.A */ + (charCode - 97 /* CharCode.a */));
                    }
                    else if (charCode >= 65 /* CharCode.A */ && charCode <= 90 /* CharCode.Z */) {
                        producesLetter[charCode] = true;
                        producesLetters = true;
                        this._keyCodeToLabel[keyCode] = value;
                    }
                    else {
                        this._keyCodeToLabel[keyCode] = value;
                    }
                }
            }
        }
        // Handle keyboard layouts where latin characters are not produced e.g. Cyrillic
        const _registerLetterIfMissing = (charCode, keyCode) => {
            if (!producesLetter[charCode]) {
                this._keyCodeToLabel[keyCode] = String.fromCharCode(charCode);
            }
        };
        _registerLetterIfMissing(65 /* CharCode.A */, 31 /* KeyCode.KeyA */);
        _registerLetterIfMissing(66 /* CharCode.B */, 32 /* KeyCode.KeyB */);
        _registerLetterIfMissing(67 /* CharCode.C */, 33 /* KeyCode.KeyC */);
        _registerLetterIfMissing(68 /* CharCode.D */, 34 /* KeyCode.KeyD */);
        _registerLetterIfMissing(69 /* CharCode.E */, 35 /* KeyCode.KeyE */);
        _registerLetterIfMissing(70 /* CharCode.F */, 36 /* KeyCode.KeyF */);
        _registerLetterIfMissing(71 /* CharCode.G */, 37 /* KeyCode.KeyG */);
        _registerLetterIfMissing(72 /* CharCode.H */, 38 /* KeyCode.KeyH */);
        _registerLetterIfMissing(73 /* CharCode.I */, 39 /* KeyCode.KeyI */);
        _registerLetterIfMissing(74 /* CharCode.J */, 40 /* KeyCode.KeyJ */);
        _registerLetterIfMissing(75 /* CharCode.K */, 41 /* KeyCode.KeyK */);
        _registerLetterIfMissing(76 /* CharCode.L */, 42 /* KeyCode.KeyL */);
        _registerLetterIfMissing(77 /* CharCode.M */, 43 /* KeyCode.KeyM */);
        _registerLetterIfMissing(78 /* CharCode.N */, 44 /* KeyCode.KeyN */);
        _registerLetterIfMissing(79 /* CharCode.O */, 45 /* KeyCode.KeyO */);
        _registerLetterIfMissing(80 /* CharCode.P */, 46 /* KeyCode.KeyP */);
        _registerLetterIfMissing(81 /* CharCode.Q */, 47 /* KeyCode.KeyQ */);
        _registerLetterIfMissing(82 /* CharCode.R */, 48 /* KeyCode.KeyR */);
        _registerLetterIfMissing(83 /* CharCode.S */, 49 /* KeyCode.KeyS */);
        _registerLetterIfMissing(84 /* CharCode.T */, 50 /* KeyCode.KeyT */);
        _registerLetterIfMissing(85 /* CharCode.U */, 51 /* KeyCode.KeyU */);
        _registerLetterIfMissing(86 /* CharCode.V */, 52 /* KeyCode.KeyV */);
        _registerLetterIfMissing(87 /* CharCode.W */, 53 /* KeyCode.KeyW */);
        _registerLetterIfMissing(88 /* CharCode.X */, 54 /* KeyCode.KeyX */);
        _registerLetterIfMissing(89 /* CharCode.Y */, 55 /* KeyCode.KeyY */);
        _registerLetterIfMissing(90 /* CharCode.Z */, 56 /* KeyCode.KeyZ */);
        if (!producesLetters) {
            // Since this keyboard layout produces no latin letters at all, most of the UI will use the
            // US kb layout equivalent for UI labels, so also try to render other keys with the US labels
            // for consistency...
            const _registerLabel = (keyCode, charCode) => {
                // const existingLabel = this._keyCodeToLabel[keyCode];
                // const existingCharCode = (existingLabel ? existingLabel.charCodeAt(0) : CharCode.Null);
                // if (existingCharCode < 32 || existingCharCode > 126) {
                this._keyCodeToLabel[keyCode] = String.fromCharCode(charCode);
                // }
            };
            _registerLabel(85 /* KeyCode.Semicolon */, 59 /* CharCode.Semicolon */);
            _registerLabel(86 /* KeyCode.Equal */, 61 /* CharCode.Equals */);
            _registerLabel(87 /* KeyCode.Comma */, 44 /* CharCode.Comma */);
            _registerLabel(88 /* KeyCode.Minus */, 45 /* CharCode.Dash */);
            _registerLabel(89 /* KeyCode.Period */, 46 /* CharCode.Period */);
            _registerLabel(90 /* KeyCode.Slash */, 47 /* CharCode.Slash */);
            _registerLabel(91 /* KeyCode.Backquote */, 96 /* CharCode.BackTick */);
            _registerLabel(92 /* KeyCode.BracketLeft */, 91 /* CharCode.OpenSquareBracket */);
            _registerLabel(93 /* KeyCode.Backslash */, 92 /* CharCode.Backslash */);
            _registerLabel(94 /* KeyCode.BracketRight */, 93 /* CharCode.CloseSquareBracket */);
            _registerLabel(95 /* KeyCode.Quote */, 39 /* CharCode.SingleQuote */);
        }
    }
    dumpDebugInfo() {
        const result = [];
        const immutableSamples = [
            88 /* ScanCode.ArrowUp */,
            104 /* ScanCode.Numpad0 */
        ];
        let cnt = 0;
        result.push(`-----------------------------------------------------------------------------------------------------------------------------------------`);
        for (let scanCode = 0 /* ScanCode.None */; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
            if (IMMUTABLE_CODE_TO_KEY_CODE[scanCode] !== -1 /* KeyCode.DependsOnKbLayout */) {
                if (immutableSamples.indexOf(scanCode) === -1) {
                    continue;
                }
            }
            if (cnt % 6 === 0) {
                result.push(`|       HW Code combination      |  Key  |    KeyCode combination    |          UI label         |        User settings       | WYSIWYG |`);
                result.push(`-----------------------------------------------------------------------------------------------------------------------------------------`);
            }
            cnt++;
            const mapping = this._codeInfo[scanCode];
            const strCode = ScanCodeUtils.toString(scanCode);
            const mods = [0b000, 0b010, 0b101, 0b111];
            for (const mod of mods) {
                const ctrlKey = (mod & 0b001) ? true : false;
                const shiftKey = (mod & 0b010) ? true : false;
                const altKey = (mod & 0b100) ? true : false;
                const scanCodeChord = new ScanCodeChord(ctrlKey, shiftKey, altKey, false, scanCode);
                const keyCodeChord = this._resolveChord(scanCodeChord);
                const strKeyCode = (keyCodeChord ? KeyCodeUtils.toString(keyCodeChord.keyCode) : null);
                const resolvedKb = (keyCodeChord ? new WindowsNativeResolvedKeybinding(this, [keyCodeChord]) : null);
                const outScanCode = `${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${altKey ? 'Alt+' : ''}${strCode}`;
                const ariaLabel = (resolvedKb ? resolvedKb.getAriaLabel() : null);
                const outUILabel = (ariaLabel ? ariaLabel.replace(/Control\+/, 'Ctrl+') : null);
                const outUserSettings = (resolvedKb ? resolvedKb.getUserSettingsLabel() : null);
                const outKey = WindowsNativeResolvedKeybinding.getProducedChar(scanCodeChord, mapping);
                const outKb = (strKeyCode ? `${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${altKey ? 'Alt+' : ''}${strKeyCode}` : null);
                const isWYSIWYG = (resolvedKb ? resolvedKb.isWYSIWYG() : false);
                const outWYSIWYG = (isWYSIWYG ? '       ' : '   NO  ');
                result.push(`| ${this._leftPad(outScanCode, 30)} | ${outKey} | ${this._leftPad(outKb, 25)} | ${this._leftPad(outUILabel, 25)} |  ${this._leftPad(outUserSettings, 25)} | ${outWYSIWYG} |`);
            }
            result.push(`-----------------------------------------------------------------------------------------------------------------------------------------`);
        }
        return result.join('\n');
    }
    _leftPad(str, cnt) {
        if (str === null) {
            str = 'null';
        }
        while (str.length < cnt) {
            str = ' ' + str;
        }
        return str;
    }
    getUILabelForKeyCode(keyCode) {
        return this._getLabelForKeyCode(keyCode);
    }
    getAriaLabelForKeyCode(keyCode) {
        return this._getLabelForKeyCode(keyCode);
    }
    getUserSettingsLabelForKeyCode(keyCode) {
        if (this._isUSStandard) {
            return KeyCodeUtils.toUserSettingsUS(keyCode);
        }
        return KeyCodeUtils.toUserSettingsGeneral(keyCode);
    }
    getElectronAcceleratorForKeyBinding(chord) {
        return KeyCodeUtils.toElectronAccelerator(chord.keyCode);
    }
    _getLabelForKeyCode(keyCode) {
        return this._keyCodeToLabel[keyCode] || KeyCodeUtils.toString(0 /* KeyCode.Unknown */);
    }
    resolveKeyboardEvent(keyboardEvent) {
        const ctrlKey = keyboardEvent.ctrlKey || (this._mapAltGrToCtrlAlt && keyboardEvent.altGraphKey);
        const altKey = keyboardEvent.altKey || (this._mapAltGrToCtrlAlt && keyboardEvent.altGraphKey);
        const chord = new KeyCodeChord(ctrlKey, keyboardEvent.shiftKey, altKey, keyboardEvent.metaKey, keyboardEvent.keyCode);
        return new WindowsNativeResolvedKeybinding(this, [chord]);
    }
    _resolveChord(chord) {
        if (!chord) {
            return null;
        }
        if (chord instanceof KeyCodeChord) {
            if (!this._keyCodeExists[chord.keyCode]) {
                return null;
            }
            return chord;
        }
        const keyCode = this._scanCodeToKeyCode[chord.scanCode] || 0 /* KeyCode.Unknown */;
        if (keyCode === 0 /* KeyCode.Unknown */ || !this._keyCodeExists[keyCode]) {
            return null;
        }
        return new KeyCodeChord(chord.ctrlKey, chord.shiftKey, chord.altKey, chord.metaKey, keyCode);
    }
    resolveKeybinding(keybinding) {
        const chords = toEmptyArrayIfContainsNull(keybinding.chords.map(chord => this._resolveChord(chord)));
        if (chords.length > 0) {
            return [new WindowsNativeResolvedKeybinding(this, chords)];
        }
        return [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0tleWJvYXJkTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2NvbW1vbi93aW5kb3dzS2V5Ym9hcmRNYXBwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFXLFlBQVksRUFBRSwwQkFBMEIsRUFBWSxhQUFhLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0SyxPQUFPLEVBQXNCLFlBQVksRUFBdUIsYUFBYSxFQUFxQixNQUFNLHdDQUF3QyxDQUFDO0FBQ2pKLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUk5RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUc5RyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUM7QUFDbEIsU0FBUyxHQUFHLENBQUMsR0FBVztJQUN2QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ1QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQixDQUFDO0FBQ0YsQ0FBQztBQVlELE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxzQkFBb0M7SUFJeEYsWUFBWSxNQUE2QixFQUFFLE1BQXNCO1FBQ2hFLEtBQUssa0NBQTBCLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFFUyxTQUFTLENBQUMsS0FBbUI7UUFDdEMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUNELE9BQU8s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