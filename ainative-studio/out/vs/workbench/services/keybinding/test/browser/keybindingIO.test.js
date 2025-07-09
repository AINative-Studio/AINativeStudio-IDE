/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyChord } from '../../../../../base/common/keyCodes.js';
import { KeyCodeChord, decodeKeybinding, ScanCodeChord, Keybinding } from '../../../../../base/common/keybindings.js';
import { KeybindingParser } from '../../../../../base/common/keybindingParser.js';
import { KeybindingIO } from '../../common/keybindingIO.js';
import { createUSLayoutResolvedKeybinding } from '../../../../../platform/keybinding/test/common/keybindingsTestUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('keybindingIO', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('serialize/deserialize', () => {
        function testOneSerialization(keybinding, expected, msg, OS) {
            const usLayoutResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
            const actualSerialized = usLayoutResolvedKeybinding.getUserSettingsLabel();
            assert.strictEqual(actualSerialized, expected, expected + ' - ' + msg);
        }
        function testSerialization(keybinding, expectedWin, expectedMac, expectedLinux) {
            testOneSerialization(keybinding, expectedWin, 'win', 1 /* OperatingSystem.Windows */);
            testOneSerialization(keybinding, expectedMac, 'mac', 2 /* OperatingSystem.Macintosh */);
            testOneSerialization(keybinding, expectedLinux, 'linux', 3 /* OperatingSystem.Linux */);
        }
        function testOneDeserialization(keybinding, _expected, msg, OS) {
            const actualDeserialized = KeybindingParser.parseKeybinding(keybinding);
            const expected = decodeKeybinding(_expected, OS);
            assert.deepStrictEqual(actualDeserialized, expected, keybinding + ' - ' + msg);
        }
        function testDeserialization(inWin, inMac, inLinux, expected) {
            testOneDeserialization(inWin, expected, 'win', 1 /* OperatingSystem.Windows */);
            testOneDeserialization(inMac, expected, 'mac', 2 /* OperatingSystem.Macintosh */);
            testOneDeserialization(inLinux, expected, 'linux', 3 /* OperatingSystem.Linux */);
        }
        function testRoundtrip(keybinding, expectedWin, expectedMac, expectedLinux) {
            testSerialization(keybinding, expectedWin, expectedMac, expectedLinux);
            testDeserialization(expectedWin, expectedMac, expectedLinux, keybinding);
        }
        testRoundtrip(21 /* KeyCode.Digit0 */, '0', '0', '0');
        testRoundtrip(31 /* KeyCode.KeyA */, 'a', 'a', 'a');
        testRoundtrip(16 /* KeyCode.UpArrow */, 'up', 'up', 'up');
        testRoundtrip(17 /* KeyCode.RightArrow */, 'right', 'right', 'right');
        testRoundtrip(18 /* KeyCode.DownArrow */, 'down', 'down', 'down');
        testRoundtrip(15 /* KeyCode.LeftArrow */, 'left', 'left', 'left');
        // one modifier
        testRoundtrip(512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'alt+a', 'alt+a', 'alt+a');
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 'ctrl+a', 'cmd+a', 'ctrl+a');
        testRoundtrip(1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'shift+a', 'shift+a', 'shift+a');
        testRoundtrip(256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'win+a', 'ctrl+a', 'meta+a');
        // two modifiers
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'ctrl+alt+a', 'alt+cmd+a', 'ctrl+alt+a');
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+a', 'shift+cmd+a', 'ctrl+shift+a');
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+win+a', 'ctrl+cmd+a', 'ctrl+meta+a');
        testRoundtrip(1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'shift+alt+a', 'shift+alt+a', 'shift+alt+a');
        testRoundtrip(1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'shift+win+a', 'ctrl+shift+a', 'shift+meta+a');
        testRoundtrip(512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'alt+win+a', 'ctrl+alt+a', 'alt+meta+a');
        // three modifiers
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+a', 'shift+alt+cmd+a', 'ctrl+shift+alt+a');
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+win+a', 'ctrl+shift+cmd+a', 'ctrl+shift+meta+a');
        testRoundtrip(1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'shift+alt+win+a', 'ctrl+shift+alt+a', 'shift+alt+meta+a');
        // all modifiers
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+win+a', 'ctrl+shift+alt+cmd+a', 'ctrl+shift+alt+meta+a');
        // chords
        testRoundtrip(KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */), 'ctrl+a ctrl+a', 'cmd+a cmd+a', 'ctrl+a ctrl+a');
        testRoundtrip(KeyChord(2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */, 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */), 'ctrl+up ctrl+up', 'cmd+up cmd+up', 'ctrl+up ctrl+up');
        // OEM keys
        testRoundtrip(85 /* KeyCode.Semicolon */, ';', ';', ';');
        testRoundtrip(86 /* KeyCode.Equal */, '=', '=', '=');
        testRoundtrip(87 /* KeyCode.Comma */, ',', ',', ',');
        testRoundtrip(88 /* KeyCode.Minus */, '-', '-', '-');
        testRoundtrip(89 /* KeyCode.Period */, '.', '.', '.');
        testRoundtrip(90 /* KeyCode.Slash */, '/', '/', '/');
        testRoundtrip(91 /* KeyCode.Backquote */, '`', '`', '`');
        testRoundtrip(115 /* KeyCode.ABNT_C1 */, 'abnt_c1', 'abnt_c1', 'abnt_c1');
        testRoundtrip(116 /* KeyCode.ABNT_C2 */, 'abnt_c2', 'abnt_c2', 'abnt_c2');
        testRoundtrip(92 /* KeyCode.BracketLeft */, '[', '[', '[');
        testRoundtrip(93 /* KeyCode.Backslash */, '\\', '\\', '\\');
        testRoundtrip(94 /* KeyCode.BracketRight */, ']', ']', ']');
        testRoundtrip(95 /* KeyCode.Quote */, '\'', '\'', '\'');
        testRoundtrip(96 /* KeyCode.OEM_8 */, 'oem_8', 'oem_8', 'oem_8');
        testRoundtrip(97 /* KeyCode.IntlBackslash */, 'oem_102', 'oem_102', 'oem_102');
        // OEM aliases
        testDeserialization('OEM_1', 'OEM_1', 'OEM_1', 85 /* KeyCode.Semicolon */);
        testDeserialization('OEM_PLUS', 'OEM_PLUS', 'OEM_PLUS', 86 /* KeyCode.Equal */);
        testDeserialization('OEM_COMMA', 'OEM_COMMA', 'OEM_COMMA', 87 /* KeyCode.Comma */);
        testDeserialization('OEM_MINUS', 'OEM_MINUS', 'OEM_MINUS', 88 /* KeyCode.Minus */);
        testDeserialization('OEM_PERIOD', 'OEM_PERIOD', 'OEM_PERIOD', 89 /* KeyCode.Period */);
        testDeserialization('OEM_2', 'OEM_2', 'OEM_2', 90 /* KeyCode.Slash */);
        testDeserialization('OEM_3', 'OEM_3', 'OEM_3', 91 /* KeyCode.Backquote */);
        testDeserialization('ABNT_C1', 'ABNT_C1', 'ABNT_C1', 115 /* KeyCode.ABNT_C1 */);
        testDeserialization('ABNT_C2', 'ABNT_C2', 'ABNT_C2', 116 /* KeyCode.ABNT_C2 */);
        testDeserialization('OEM_4', 'OEM_4', 'OEM_4', 92 /* KeyCode.BracketLeft */);
        testDeserialization('OEM_5', 'OEM_5', 'OEM_5', 93 /* KeyCode.Backslash */);
        testDeserialization('OEM_6', 'OEM_6', 'OEM_6', 94 /* KeyCode.BracketRight */);
        testDeserialization('OEM_7', 'OEM_7', 'OEM_7', 95 /* KeyCode.Quote */);
        testDeserialization('OEM_8', 'OEM_8', 'OEM_8', 96 /* KeyCode.OEM_8 */);
        testDeserialization('OEM_102', 'OEM_102', 'OEM_102', 97 /* KeyCode.IntlBackslash */);
        // accepts '-' as separator
        testDeserialization('ctrl-shift-alt-win-a', 'ctrl-shift-alt-cmd-a', 'ctrl-shift-alt-meta-a', 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */);
        // various input mistakes
        testDeserialization(' ctrl-shift-alt-win-A ', ' shift-alt-cmd-Ctrl-A ', ' ctrl-shift-alt-META-A ', 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */);
    });
    test('deserialize scan codes', () => {
        assert.deepStrictEqual(KeybindingParser.parseKeybinding('ctrl+shift+[comma] ctrl+/'), new Keybinding([new ScanCodeChord(true, true, false, false, 60 /* ScanCode.Comma */), new KeyCodeChord(true, false, false, false, 90 /* KeyCode.Slash */)]));
    });
    test('issue #10452 - invalid command', () => {
        const strJSON = `[{ "key": "ctrl+k ctrl+f", "command": ["firstcommand", "seccondcommand"] }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.strictEqual(keybindingItem.command, null);
    });
    test('issue #10452 - invalid when', () => {
        const strJSON = `[{ "key": "ctrl+k ctrl+f", "command": "firstcommand", "when": [] }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.strictEqual(keybindingItem.when, undefined);
    });
    test('issue #10452 - invalid key', () => {
        const strJSON = `[{ "key": [], "command": "firstcommand" }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.deepStrictEqual(keybindingItem.keybinding, null);
    });
    test('issue #10452 - invalid key 2', () => {
        const strJSON = `[{ "key": "", "command": "firstcommand" }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.deepStrictEqual(keybindingItem.keybinding, null);
    });
    test('test commands args', () => {
        const strJSON = `[{ "key": "ctrl+k ctrl+f", "command": "firstcommand", "when": [], "args": { "text": "theText" } }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.strictEqual(keybindingItem.commandArgs.text, 'theText');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0lPLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvdGVzdC9icm93c2VyL2tleWJpbmRpbmdJTy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUE2QixNQUFNLHdDQUF3QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3RILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWxGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUMxSCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFFbEMsU0FBUyxvQkFBb0IsQ0FBQyxVQUFrQixFQUFFLFFBQWdCLEVBQUUsR0FBVyxFQUFFLEVBQW1CO1lBQ25HLE1BQU0sMEJBQTBCLEdBQUcsZ0NBQWdDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFDO1lBQ3JGLE1BQU0sZ0JBQWdCLEdBQUcsMEJBQTBCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxRQUFRLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFDRCxTQUFTLGlCQUFpQixDQUFDLFVBQWtCLEVBQUUsV0FBbUIsRUFBRSxXQUFtQixFQUFFLGFBQXFCO1lBQzdHLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsS0FBSyxrQ0FBMEIsQ0FBQztZQUM5RSxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLEtBQUssb0NBQTRCLENBQUM7WUFDaEYsb0JBQW9CLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxPQUFPLGdDQUF3QixDQUFDO1FBQ2pGLENBQUM7UUFFRCxTQUFTLHNCQUFzQixDQUFDLFVBQWtCLEVBQUUsU0FBaUIsRUFBRSxHQUFXLEVBQUUsRUFBbUI7WUFDdEcsTUFBTSxrQkFBa0IsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDeEUsTUFBTSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLFVBQVUsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUNELFNBQVMsbUJBQW1CLENBQUMsS0FBYSxFQUFFLEtBQWEsRUFBRSxPQUFlLEVBQUUsUUFBZ0I7WUFDM0Ysc0JBQXNCLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLGtDQUEwQixDQUFDO1lBQ3hFLHNCQUFzQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxvQ0FBNEIsQ0FBQztZQUMxRSxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sZ0NBQXdCLENBQUM7UUFDM0UsQ0FBQztRQUVELFNBQVMsYUFBYSxDQUFDLFVBQWtCLEVBQUUsV0FBbUIsRUFBRSxXQUFtQixFQUFFLGFBQXFCO1lBQ3pHLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3ZFLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzFFLENBQUM7UUFFRCxhQUFhLDBCQUFpQixHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzdDLGFBQWEsd0JBQWUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzQyxhQUFhLDJCQUFrQixJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELGFBQWEsOEJBQXFCLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0QsYUFBYSw2QkFBb0IsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6RCxhQUFhLDZCQUFvQixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXpELGVBQWU7UUFDZixhQUFhLENBQUMsNENBQXlCLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRSxhQUFhLENBQUMsaURBQTZCLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxRSxhQUFhLENBQUMsK0NBQTJCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM1RSxhQUFhLENBQUMsZ0RBQTZCLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUUxRSxnQkFBZ0I7UUFDaEIsYUFBYSxDQUFDLGdEQUEyQix3QkFBZSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbkcsYUFBYSxDQUFDLG1EQUE2Qix3QkFBZSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDM0csYUFBYSxDQUFDLG9EQUErQix3QkFBZSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDekcsYUFBYSxDQUFDLDhDQUF5Qix3QkFBZSxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDckcsYUFBYSxDQUFDLGtEQUE2Qix3QkFBZSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDM0csYUFBYSxDQUFDLCtDQUEyQix3QkFBZSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFbkcsa0JBQWtCO1FBQ2xCLGFBQWEsQ0FBQyxtREFBNkIsdUJBQWEsd0JBQWUsRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3BJLGFBQWEsQ0FBQyxtREFBNkIsMkJBQWlCLHdCQUFlLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUMxSSxhQUFhLENBQUMsOENBQXlCLDJCQUFpQix3QkFBZSxFQUFFLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFFcEksZ0JBQWdCO1FBQ2hCLGFBQWEsQ0FBQyxtREFBNkIsdUJBQWEsMkJBQWlCLHdCQUFlLEVBQUUsc0JBQXNCLEVBQUUsc0JBQXNCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztRQUVuSyxTQUFTO1FBQ1QsYUFBYSxDQUFDLFFBQVEsQ0FBQyxpREFBNkIsRUFBRSxpREFBNkIsQ0FBQyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDdkksYUFBYSxDQUFDLFFBQVEsQ0FBQyxvREFBZ0MsRUFBRSxvREFBZ0MsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRW5KLFdBQVc7UUFDWCxhQUFhLDZCQUFvQixHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hELGFBQWEseUJBQWdCLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUMsYUFBYSx5QkFBZ0IsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QyxhQUFhLHlCQUFnQixHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLGFBQWEsMEJBQWlCLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0MsYUFBYSx5QkFBZ0IsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QyxhQUFhLDZCQUFvQixHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hELGFBQWEsNEJBQWtCLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDaEUsYUFBYSw0QkFBa0IsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNoRSxhQUFhLCtCQUFzQixHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELGFBQWEsNkJBQW9CLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkQsYUFBYSxnQ0FBdUIsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuRCxhQUFhLHlCQUFnQixJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9DLGFBQWEseUJBQWdCLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsYUFBYSxpQ0FBd0IsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV0RSxjQUFjO1FBQ2QsbUJBQW1CLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLDZCQUFvQixDQUFDO1FBQ2xFLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSx5QkFBZ0IsQ0FBQztRQUN2RSxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFdBQVcseUJBQWdCLENBQUM7UUFDMUUsbUJBQW1CLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxXQUFXLHlCQUFnQixDQUFDO1FBQzFFLG1CQUFtQixDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsWUFBWSwwQkFBaUIsQ0FBQztRQUM5RSxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8seUJBQWdCLENBQUM7UUFDOUQsbUJBQW1CLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLDZCQUFvQixDQUFDO1FBQ2xFLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyw0QkFBa0IsQ0FBQztRQUN0RSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsNEJBQWtCLENBQUM7UUFDdEUsbUJBQW1CLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLCtCQUFzQixDQUFDO1FBQ3BFLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyw2QkFBb0IsQ0FBQztRQUNsRSxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sZ0NBQXVCLENBQUM7UUFDckUsbUJBQW1CLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLHlCQUFnQixDQUFDO1FBQzlELG1CQUFtQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyx5QkFBZ0IsQ0FBQztRQUM5RCxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsaUNBQXdCLENBQUM7UUFFNUUsMkJBQTJCO1FBQzNCLG1CQUFtQixDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixFQUFFLHVCQUF1QixFQUFFLG1EQUE2Qix1QkFBYSwyQkFBaUIsd0JBQWUsQ0FBQyxDQUFDO1FBRXpLLHlCQUF5QjtRQUN6QixtQkFBbUIsQ0FBQyx3QkFBd0IsRUFBRSx3QkFBd0IsRUFBRSx5QkFBeUIsRUFBRSxtREFBNkIsdUJBQWEsMkJBQWlCLHdCQUFlLENBQUMsQ0FBQztJQUNoTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDbkMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLDJCQUEyQixDQUFDLEVBQzdELElBQUksVUFBVSxDQUFDLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSywwQkFBaUIsRUFBRSxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLHlCQUFnQixDQUFDLENBQUMsQ0FDekksQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxNQUFNLE9BQU8sR0FBRyw2RUFBNkUsQ0FBQztRQUM5RixNQUFNLGNBQWMsR0FBVyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLHFFQUFxRSxDQUFDO1FBQ3RGLE1BQU0sY0FBYyxHQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNwRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsTUFBTSxPQUFPLEdBQUcsNENBQTRDLENBQUM7UUFDN0QsTUFBTSxjQUFjLEdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxNQUFNLE9BQU8sR0FBRyw0Q0FBNEMsQ0FBQztRQUM3RCxNQUFNLGNBQWMsR0FBVyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sT0FBTyxHQUFHLG9HQUFvRyxDQUFDO1FBQ3JILE1BQU0sY0FBYyxHQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9