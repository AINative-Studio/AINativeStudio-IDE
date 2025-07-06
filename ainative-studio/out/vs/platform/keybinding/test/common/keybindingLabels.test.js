/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { createUSLayoutResolvedKeybinding } from './keybindingsTestUtils.js';
suite('KeybindingLabels', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertUSLabel(OS, keybinding, expected) {
        const usResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
        assert.strictEqual(usResolvedKeybinding.getLabel(), expected);
    }
    test('Windows US label', () => {
        // no modifier
        assertUSLabel(1 /* OperatingSystem.Windows */, 31 /* KeyCode.KeyA */, 'A');
        // one modifier
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 'Ctrl+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'Shift+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Alt+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Windows+A');
        // two modifiers
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Ctrl+Alt+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Windows+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Shift+Alt+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Shift+Windows+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Alt+Windows+A');
        // three modifiers
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Windows+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Alt+Windows+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Shift+Alt+Windows+A');
        // four modifiers
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Windows+A');
        // chord
        assertUSLabel(1 /* OperatingSystem.Windows */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'Ctrl+A Ctrl+B');
    });
    test('Linux US label', () => {
        // no modifier
        assertUSLabel(3 /* OperatingSystem.Linux */, 31 /* KeyCode.KeyA */, 'A');
        // one modifier
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 'Ctrl+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'Shift+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Alt+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Super+A');
        // two modifiers
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Ctrl+Alt+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Super+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Shift+Alt+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Shift+Super+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Alt+Super+A');
        // three modifiers
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Super+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Alt+Super+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Shift+Alt+Super+A');
        // four modifiers
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Super+A');
        // chord
        assertUSLabel(3 /* OperatingSystem.Linux */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'Ctrl+A Ctrl+B');
    });
    test('Mac US label', () => {
        // no modifier
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 31 /* KeyCode.KeyA */, 'A');
        // one modifier
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, '⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, '⇧A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, '⌥A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃A');
        // two modifiers
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, '⇧⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, '⌥⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, '⇧⌥A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⇧A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⌥A');
        // three modifiers
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, '⇧⌥⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⇧⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⌥⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⇧⌥A');
        // four modifiers
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⇧⌥⌘A');
        // chord
        assertUSLabel(2 /* OperatingSystem.Macintosh */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), '⌘A ⌘B');
        // special keys
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 15 /* KeyCode.LeftArrow */, '←');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 16 /* KeyCode.UpArrow */, '↑');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 17 /* KeyCode.RightArrow */, '→');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 18 /* KeyCode.DownArrow */, '↓');
    });
    test('Aria label', () => {
        function assertAriaLabel(OS, keybinding, expected) {
            const usResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
            assert.strictEqual(usResolvedKeybinding.getAriaLabel(), expected);
        }
        assertAriaLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Control+Shift+Alt+Windows+A');
        assertAriaLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Control+Shift+Alt+Super+A');
        assertAriaLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Control+Shift+Option+Command+A');
    });
    test('Electron Accelerator label', () => {
        function assertElectronAcceleratorLabel(OS, keybinding, expected) {
            const usResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
            assert.strictEqual(usResolvedKeybinding.getElectronAccelerator(), expected);
        }
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Super+A');
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Super+A');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Cmd+A');
        // electron cannot handle chords
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), null);
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), null);
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), null);
        // electron cannot handle numpad keys
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, 99 /* KeyCode.Numpad1 */, null);
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, 99 /* KeyCode.Numpad1 */, null);
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 99 /* KeyCode.Numpad1 */, null);
        // special
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 15 /* KeyCode.LeftArrow */, 'Left');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 16 /* KeyCode.UpArrow */, 'Up');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 17 /* KeyCode.RightArrow */, 'Right');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 18 /* KeyCode.DownArrow */, 'Down');
    });
    test('User Settings label', () => {
        function assertElectronAcceleratorLabel(OS, keybinding, expected) {
            const usResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
            assert.strictEqual(usResolvedKeybinding.getUserSettingsLabel(), expected);
        }
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+win+a');
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+meta+a');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+cmd+a');
        // electron cannot handle chords
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'ctrl+a ctrl+b');
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'ctrl+a ctrl+b');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'cmd+a cmd+b');
    });
    test('issue #91235: Do not end with a +', () => {
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 6 /* KeyCode.Alt */, 'Ctrl+Alt');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0xhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL3Rlc3QvY29tbW9uL2tleWJpbmRpbmdMYWJlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQztBQUVoRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUU3RSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBRTlCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxhQUFhLENBQUMsRUFBbUIsRUFBRSxVQUFrQixFQUFFLFFBQWdCO1FBQy9FLE1BQU0sb0JBQW9CLEdBQUcsZ0NBQWdDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsY0FBYztRQUNkLGFBQWEseURBQXdDLEdBQUcsQ0FBQyxDQUFDO1FBRTFELGVBQWU7UUFDZixhQUFhLGtDQUEwQixpREFBNkIsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNoRixhQUFhLGtDQUEwQiwrQ0FBMkIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvRSxhQUFhLGtDQUEwQiw0Q0FBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzRSxhQUFhLGtDQUEwQixn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