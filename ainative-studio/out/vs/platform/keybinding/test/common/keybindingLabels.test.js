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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0xhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvdGVzdC9jb21tb24va2V5YmluZGluZ0xhYmVscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBRWhGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTdFLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFFOUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLGFBQWEsQ0FBQyxFQUFtQixFQUFFLFVBQWtCLEVBQUUsUUFBZ0I7UUFDL0UsTUFBTSxvQkFBb0IsR0FBRyxnQ0FBZ0MsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFFLENBQUM7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixjQUFjO1FBQ2QsYUFBYSx5REFBd0MsR0FBRyxDQUFDLENBQUM7UUFFMUQsZUFBZTtRQUNmLGFBQWEsa0NBQTBCLGlEQUE2QixFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2hGLGFBQWEsa0NBQTBCLCtDQUEyQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9FLGFBQWEsa0NBQTBCLDRDQUF5QixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzNFLGFBQWEsa0NBQTBCLGdEQUE2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