/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalArgument } from './errors.js';
/**
 * Binary encoding strategy:
 * ```
 *    1111 11
 *    5432 1098 7654 3210
 *    ---- CSAW KKKK KKKK
 *  C = bit 11 = ctrlCmd flag
 *  S = bit 10 = shift flag
 *  A = bit 9 = alt flag
 *  W = bit 8 = winCtrl flag
 *  K = bits 0-7 = key code
 * ```
 */
var BinaryKeybindingsMask;
(function (BinaryKeybindingsMask) {
    BinaryKeybindingsMask[BinaryKeybindingsMask["CtrlCmd"] = 2048] = "CtrlCmd";
    BinaryKeybindingsMask[BinaryKeybindingsMask["Shift"] = 1024] = "Shift";
    BinaryKeybindingsMask[BinaryKeybindingsMask["Alt"] = 512] = "Alt";
    BinaryKeybindingsMask[BinaryKeybindingsMask["WinCtrl"] = 256] = "WinCtrl";
    BinaryKeybindingsMask[BinaryKeybindingsMask["KeyCode"] = 255] = "KeyCode";
})(BinaryKeybindingsMask || (BinaryKeybindingsMask = {}));
export function decodeKeybinding(keybinding, OS) {
    if (typeof keybinding === 'number') {
        if (keybinding === 0) {
            return null;
        }
        const firstChord = (keybinding & 0x0000FFFF) >>> 0;
        const secondChord = (keybinding & 0xFFFF0000) >>> 16;
        if (secondChord !== 0) {
            return new Keybinding([
                createSimpleKeybinding(firstChord, OS),
                createSimpleKeybinding(secondChord, OS)
            ]);
        }
        return new Keybinding([createSimpleKeybinding(firstChord, OS)]);
    }
    else {
        const chords = [];
        for (let i = 0; i < keybinding.length; i++) {
            chords.push(createSimpleKeybinding(keybinding[i], OS));
        }
        return new Keybinding(chords);
    }
}
export function createSimpleKeybinding(keybinding, OS) {
    const ctrlCmd = (keybinding & 2048 /* BinaryKeybindingsMask.CtrlCmd */ ? true : false);
    const winCtrl = (keybinding & 256 /* BinaryKeybindingsMask.WinCtrl */ ? true : false);
    const ctrlKey = (OS === 2 /* OperatingSystem.Macintosh */ ? winCtrl : ctrlCmd);
    const shiftKey = (keybinding & 1024 /* BinaryKeybindingsMask.Shift */ ? true : false);
    const altKey = (keybinding & 512 /* BinaryKeybindingsMask.Alt */ ? true : false);
    const metaKey = (OS === 2 /* OperatingSystem.Macintosh */ ? ctrlCmd : winCtrl);
    const keyCode = (keybinding & 255 /* BinaryKeybindingsMask.KeyCode */);
    return new KeyCodeChord(ctrlKey, shiftKey, altKey, metaKey, keyCode);
}
/**
 * Represents a chord which uses the `keyCode` field of keyboard events.
 * A chord is a combination of keys pressed simultaneously.
 */
export class KeyCodeChord {
    constructor(ctrlKey, shiftKey, altKey, metaKey, keyCode) {
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.altKey = altKey;
        this.metaKey = metaKey;
        this.keyCode = keyCode;
    }
    equals(other) {
        return (other instanceof KeyCodeChord
            && this.ctrlKey === other.ctrlKey
            && this.shiftKey === other.shiftKey
            && this.altKey === other.altKey
            && this.metaKey === other.metaKey
            && this.keyCode === other.keyCode);
    }
    getHashCode() {
        const ctrl = this.ctrlKey ? '1' : '0';
        const shift = this.shiftKey ? '1' : '0';
        const alt = this.altKey ? '1' : '0';
        const meta = this.metaKey ? '1' : '0';
        return `K${ctrl}${shift}${alt}${meta}${this.keyCode}`;
    }
    isModifierKey() {
        return (this.keyCode === 0 /* KeyCode.Unknown */
            || this.keyCode === 5 /* KeyCode.Ctrl */
            || this.keyCode === 57 /* KeyCode.Meta */
            || this.keyCode === 6 /* KeyCode.Alt */
            || this.keyCode === 4 /* KeyCode.Shift */);
    }
    toKeybinding() {
        return new Keybinding([this]);
    }
    /**
     * Does this keybinding refer to the key code of a modifier and it also has the modifier flag?
     */
    isDuplicateModifierCase() {
        return ((this.ctrlKey && this.keyCode === 5 /* KeyCode.Ctrl */)
            || (this.shiftKey && this.keyCode === 4 /* KeyCode.Shift */)
            || (this.altKey && this.keyCode === 6 /* KeyCode.Alt */)
            || (this.metaKey && this.keyCode === 57 /* KeyCode.Meta */));
    }
}
/**
 * Represents a chord which uses the `code` field of keyboard events.
 * A chord is a combination of keys pressed simultaneously.
 */
export class ScanCodeChord {
    constructor(ctrlKey, shiftKey, altKey, metaKey, scanCode) {
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.altKey = altKey;
        this.metaKey = metaKey;
        this.scanCode = scanCode;
    }
    equals(other) {
        return (other instanceof ScanCodeChord
            && this.ctrlKey === other.ctrlKey
            && this.shiftKey === other.shiftKey
            && this.altKey === other.altKey
            && this.metaKey === other.metaKey
            && this.scanCode === other.scanCode);
    }
    getHashCode() {
        const ctrl = this.ctrlKey ? '1' : '0';
        const shift = this.shiftKey ? '1' : '0';
        const alt = this.altKey ? '1' : '0';
        const meta = this.metaKey ? '1' : '0';
        return `S${ctrl}${shift}${alt}${meta}${this.scanCode}`;
    }
    /**
     * Does this keybinding refer to the key code of a modifier and it also has the modifier flag?
     */
    isDuplicateModifierCase() {
        return ((this.ctrlKey && (this.scanCode === 157 /* ScanCode.ControlLeft */ || this.scanCode === 161 /* ScanCode.ControlRight */))
            || (this.shiftKey && (this.scanCode === 158 /* ScanCode.ShiftLeft */ || this.scanCode === 162 /* ScanCode.ShiftRight */))
            || (this.altKey && (this.scanCode === 159 /* ScanCode.AltLeft */ || this.scanCode === 163 /* ScanCode.AltRight */))
            || (this.metaKey && (this.scanCode === 160 /* ScanCode.MetaLeft */ || this.scanCode === 164 /* ScanCode.MetaRight */)));
    }
}
/**
 * A keybinding is a sequence of chords.
 */
export class Keybinding {
    constructor(chords) {
        if (chords.length === 0) {
            throw illegalArgument(`chords`);
        }
        this.chords = chords;
    }
    getHashCode() {
        let result = '';
        for (let i = 0, len = this.chords.length; i < len; i++) {
            if (i !== 0) {
                result += ';';
            }
            result += this.chords[i].getHashCode();
        }
        return result;
    }
    equals(other) {
        if (other === null) {
            return false;
        }
        if (this.chords.length !== other.chords.length) {
            return false;
        }
        for (let i = 0; i < this.chords.length; i++) {
            if (!this.chords[i].equals(other.chords[i])) {
                return false;
            }
        }
        return true;
    }
}
export class ResolvedChord {
    constructor(ctrlKey, shiftKey, altKey, metaKey, keyLabel, keyAriaLabel) {
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.altKey = altKey;
        this.metaKey = metaKey;
        this.keyLabel = keyLabel;
        this.keyAriaLabel = keyAriaLabel;
    }
}
/**
 * A resolved keybinding. Consists of one or multiple chords.
 */
export class ResolvedKeybinding {
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24va2V5YmluZGluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUk5Qzs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxJQUFXLHFCQU1WO0FBTkQsV0FBVyxxQkFBcUI7SUFDL0IsMEVBQXlCLENBQUE7SUFDekIsc0VBQXVCLENBQUE7SUFDdkIsaUVBQW9CLENBQUE7SUFDcEIseUVBQXdCLENBQUE7SUFDeEIseUVBQW9CLENBQUE7QUFDckIsQ0FBQyxFQU5VLHFCQUFxQixLQUFyQixxQkFBcUIsUUFNL0I7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsVUFBNkIsRUFBRSxFQUFtQjtJQUNsRixJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3BDLElBQUksVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE1BQU0sVUFBVSxHQUFHLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckQsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkIsT0FBTyxJQUFJLFVBQVUsQ0FBQztnQkFDckIsc0JBQXNCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsc0JBQXNCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQzthQUN2QyxDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsT0FBTyxJQUFJLFVBQVUsQ0FBQyxDQUFDLHNCQUFz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