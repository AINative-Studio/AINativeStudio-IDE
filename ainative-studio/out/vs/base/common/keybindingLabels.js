/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
export class ModifierLabelProvider {
    constructor(mac, windows, linux = windows) {
        this.modifierLabels = [null]; // index 0 will never me accessed.
        this.modifierLabels[2 /* OperatingSystem.Macintosh */] = mac;
        this.modifierLabels[1 /* OperatingSystem.Windows */] = windows;
        this.modifierLabels[3 /* OperatingSystem.Linux */] = linux;
    }
    toLabel(OS, chords, keyLabelProvider) {
        if (chords.length === 0) {
            return null;
        }
        const result = [];
        for (let i = 0, len = chords.length; i < len; i++) {
            const chord = chords[i];
            const keyLabel = keyLabelProvider(chord);
            if (keyLabel === null) {
                // this keybinding cannot be expressed...
                return null;
            }
            result[i] = _simpleAsString(chord, keyLabel, this.modifierLabels[OS]);
        }
        return result.join(' ');
    }
}
/**
 * A label provider that prints modifiers in a suitable format for displaying in the UI.
 */
export const UILabelProvider = new ModifierLabelProvider({
    ctrlKey: '\u2303',
    shiftKey: '⇧',
    altKey: '⌥',
    metaKey: '⌘',
    separator: '',
}, {
    ctrlKey: nls.localize({ key: 'ctrlKey', comment: ['This is the short form for the Control key on the keyboard'] }, "Ctrl"),
    shiftKey: nls.localize({ key: 'shiftKey', comment: ['This is the short form for the Shift key on the keyboard'] }, "Shift"),
    altKey: nls.localize({ key: 'altKey', comment: ['This is the short form for the Alt key on the keyboard'] }, "Alt"),
    metaKey: nls.localize({ key: 'windowsKey', comment: ['This is the short form for the Windows key on the keyboard'] }, "Windows"),
    separator: '+',
}, {
    ctrlKey: nls.localize({ key: 'ctrlKey', comment: ['This is the short form for the Control key on the keyboard'] }, "Ctrl"),
    shiftKey: nls.localize({ key: 'shiftKey', comment: ['This is the short form for the Shift key on the keyboard'] }, "Shift"),
    altKey: nls.localize({ key: 'altKey', comment: ['This is the short form for the Alt key on the keyboard'] }, "Alt"),
    metaKey: nls.localize({ key: 'superKey', comment: ['This is the short form for the Super key on the keyboard'] }, "Super"),
    separator: '+',
});
/**
 * A label provider that prints modifiers in a suitable format for ARIA.
 */
export const AriaLabelProvider = new ModifierLabelProvider({
    ctrlKey: nls.localize({ key: 'ctrlKey.long', comment: ['This is the long form for the Control key on the keyboard'] }, "Control"),
    shiftKey: nls.localize({ key: 'shiftKey.long', comment: ['This is the long form for the Shift key on the keyboard'] }, "Shift"),
    altKey: nls.localize({ key: 'optKey.long', comment: ['This is the long form for the Alt/Option key on the keyboard'] }, "Option"),
    metaKey: nls.localize({ key: 'cmdKey.long', comment: ['This is the long form for the Command key on the keyboard'] }, "Command"),
    separator: '+',
}, {
    ctrlKey: nls.localize({ key: 'ctrlKey.long', comment: ['This is the long form for the Control key on the keyboard'] }, "Control"),
    shiftKey: nls.localize({ key: 'shiftKey.long', comment: ['This is the long form for the Shift key on the keyboard'] }, "Shift"),
    altKey: nls.localize({ key: 'altKey.long', comment: ['This is the long form for the Alt key on the keyboard'] }, "Alt"),
    metaKey: nls.localize({ key: 'windowsKey.long', comment: ['This is the long form for the Windows key on the keyboard'] }, "Windows"),
    separator: '+',
}, {
    ctrlKey: nls.localize({ key: 'ctrlKey.long', comment: ['This is the long form for the Control key on the keyboard'] }, "Control"),
    shiftKey: nls.localize({ key: 'shiftKey.long', comment: ['This is the long form for the Shift key on the keyboard'] }, "Shift"),
    altKey: nls.localize({ key: 'altKey.long', comment: ['This is the long form for the Alt key on the keyboard'] }, "Alt"),
    metaKey: nls.localize({ key: 'superKey.long', comment: ['This is the long form for the Super key on the keyboard'] }, "Super"),
    separator: '+',
});
/**
 * A label provider that prints modifiers in a suitable format for Electron Accelerators.
 * See https://github.com/electron/electron/blob/master/docs/api/accelerator.md
 */
export const ElectronAcceleratorLabelProvider = new ModifierLabelProvider({
    ctrlKey: 'Ctrl',
    shiftKey: 'Shift',
    altKey: 'Alt',
    metaKey: 'Cmd',
    separator: '+',
}, {
    ctrlKey: 'Ctrl',
    shiftKey: 'Shift',
    altKey: 'Alt',
    metaKey: 'Super',
    separator: '+',
});
/**
 * A label provider that prints modifiers in a suitable format for user settings.
 */
export const UserSettingsLabelProvider = new ModifierLabelProvider({
    ctrlKey: 'ctrl',
    shiftKey: 'shift',
    altKey: 'alt',
    metaKey: 'cmd',
    separator: '+',
}, {
    ctrlKey: 'ctrl',
    shiftKey: 'shift',
    altKey: 'alt',
    metaKey: 'win',
    separator: '+',
}, {
    ctrlKey: 'ctrl',
    shiftKey: 'shift',
    altKey: 'alt',
    metaKey: 'meta',
    separator: '+',
});
function _simpleAsString(modifiers, key, labels) {
    if (key === null) {
        return '';
    }
    const result = [];
    // translate modifier keys: Ctrl-Shift-Alt-Meta
    if (modifiers.ctrlKey) {
        result.push(labels.ctrlKey);
    }
    if (modifiers.shiftKey) {
        result.push(labels.shiftKey);
    }
    if (modifiers.altKey) {
        result.push(labels.altKey);
    }
    if (modifiers.metaKey) {
        result.push(labels.metaKey);
    }
    // the actual key
    if (key !== '') {
        result.push(key);
    }
    return result.join(labels.separator);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0xhYmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9rZXliaW5kaW5nTGFiZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBY3BDLE1BQU0sT0FBTyxxQkFBcUI7SUFJakMsWUFBWSxHQUFtQixFQUFFLE9BQXVCLEVBQUUsUUFBd0IsT0FBTztRQUN4RixJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0M7UUFDakUsSUFBSSxDQUFDLGNBQWMsbUNBQTJCLEdBQUcsR0FBRyxDQUFDO1FBQ3JELElBQUksQ0FBQyxjQUFjLGlDQUF5QixHQUFHLE9BQU8sQ0FBQztRQUN2RCxJQUFJLENBQUMsY0FBYywrQkFBdUIsR0FBRyxLQUFLLENBQUM7SUFDcEQsQ0FBQztJQUVNLE9BQU8sQ0FBc0IsRUFBbUIsRUFBRSxNQUFvQixFQUFFLGdCQUFxQztRQUNuSCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekMsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JB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