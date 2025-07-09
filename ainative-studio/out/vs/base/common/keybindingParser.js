/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyCodeUtils, ScanCodeUtils } from './keyCodes.js';
import { KeyCodeChord, ScanCodeChord, Keybinding } from './keybindings.js';
export class KeybindingParser {
    static _readModifiers(input) {
        input = input.toLowerCase().trim();
        let ctrl = false;
        let shift = false;
        let alt = false;
        let meta = false;
        let matchedModifier;
        do {
            matchedModifier = false;
            if (/^ctrl(\+|\-)/.test(input)) {
                ctrl = true;
                input = input.substr('ctrl-'.length);
                matchedModifier = true;
            }
            if (/^shift(\+|\-)/.test(input)) {
                shift = true;
                input = input.substr('shift-'.length);
                matchedModifier = true;
            }
            if (/^alt(\+|\-)/.test(input)) {
                alt = true;
                input = input.substr('alt-'.length);
                matchedModifier = true;
            }
            if (/^meta(\+|\-)/.test(input)) {
                meta = true;
                input = input.substr('meta-'.length);
                matchedModifier = true;
            }
            if (/^win(\+|\-)/.test(input)) {
                meta = true;
                input = input.substr('win-'.length);
                matchedModifier = true;
            }
            if (/^cmd(\+|\-)/.test(input)) {
                meta = true;
                input = input.substr('cmd-'.length);
                matchedModifier = true;
            }
        } while (matchedModifier);
        let key;
        const firstSpaceIdx = input.indexOf(' ');
        if (firstSpaceIdx > 0) {
            key = input.substring(0, firstSpaceIdx);
            input = input.substring(firstSpaceIdx);
        }
        else {
            key = input;
            input = '';
        }
        return {
            remains: input,
            ctrl,
            shift,
            alt,
            meta,
            key
        };
    }
    static parseChord(input) {
        const mods = this._readModifiers(input);
        const scanCodeMatch = mods.key.match(/^\[([^\]]+)\]$/);
        if (scanCodeMatch) {
            const strScanCode = scanCodeMatch[1];
            const scanCode = ScanCodeUtils.lowerCaseToEnum(strScanCode);
            return [new ScanCodeChord(mods.ctrl, mods.shift, mods.alt, mods.meta, scanCode), mods.remains];
        }
        const keyCode = KeyCodeUtils.fromUserSettings(mods.key);
        return [new KeyCodeChord(mods.ctrl, mods.shift, mods.alt, mods.meta, keyCode), mods.remains];
    }
    static parseKeybinding(input) {
        if (!input) {
            return null;
        }
        const chords = [];
        let chord;
        while (input.length > 0) {
            [chord, input] = this.parseChord(input);
            chords.push(chord);
        }
        return (chords.length > 0 ? new Keybinding(chords) : null);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1BhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9rZXliaW5kaW5nUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBUyxNQUFNLGtCQUFrQixDQUFDO0FBRWxGLE1BQU0sT0FBTyxnQkFBZ0I7SUFFcEIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFhO1FBQzFDLEtBQUssR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFbkMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ2pCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNsQixJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUM7UUFDaEIsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBRWpCLElBQUksZUFBd0IsQ0FBQztRQUU3QixHQUFHLENBQUM7WUFDSCxlQUFlLEdBQUcsS0FBSyxDQUFDO1lBQ3hCLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLEdBQUcsSUFBSSxDQUFDO2dCQUNaLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDckMsZUFBZSxHQUFHLElBQUksQ0FBQztZQUN4QixDQUFDO1lBQ0QsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLEtBQUssR0FBRyxJQUFJLENBQUM7Z0JBQ2IsS0FBSyxHQUFHLEtBQUssQ0FBQyxN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