/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EVENT_KEY_CODE_MAP, IMMUTABLE_CODE_TO_KEY_CODE, IMMUTABLE_KEY_CODE_TO_CODE, KeyChord, KeyCodeUtils, NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE, ScanCodeUtils } from '../../common/keyCodes.js';
import { decodeKeybinding, KeyCodeChord, Keybinding } from '../../common/keybindings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('keyCodes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testBinaryEncoding(expected, k, OS) {
        assert.deepStrictEqual(decodeKeybinding(k, OS), expected);
    }
    test('mapping for Minus', () => {
        // [147, 83, 0, ScanCode.Minus, 'Minus', KeyCode.US_MINUS, '-', 189, 'VK_OEM_MINUS', '-', 'OEM_MINUS'],
        assert.strictEqual(EVENT_KEY_CODE_MAP[189], 88 /* KeyCode.Minus */);
        assert.strictEqual(NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE['VK_OEM_MINUS'], 88 /* KeyCode.Minus */);
        assert.strictEqual(ScanCodeUtils.lowerCaseToEnum('minus'), 51 /* ScanCode.Minus */);
        assert.strictEqual(ScanCodeUtils.toEnum('Minus'), 51 /* ScanCode.Minus */);
        assert.strictEqual(ScanCodeUtils.toString(51 /* ScanCode.Minus */), 'Minus');
        assert.strictEqual(IMMUTABLE_CODE_TO_KEY_CODE[51 /* ScanCode.Minus */], -1 /* KeyCode.DependsOnKbLayout */);
        assert.strictEqual(IMMUTABLE_KEY_CODE_TO_CODE[88 /* KeyCode.Minus */], -1 /* ScanCode.DependsOnKbLayout */);
        assert.strictEqual(KeyCodeUtils.toString(88 /* KeyCode.Minus */), '-');
        assert.strictEqual(KeyCodeUtils.fromString('-'), 88 /* KeyCode.Minus */);
        assert.strictEqual(KeyCodeUtils.toUserSettingsUS(88 /* KeyCode.Minus */), '-');
        assert.strictEqual(KeyCodeUtils.toUserSettingsGeneral(88 /* KeyCode.Minus */), 'OEM_MINUS');
        assert.strictEqual(KeyCodeUtils.fromUserSettings('-'), 88 /* KeyCode.Minus */);
        assert.strictEqual(KeyCodeUtils.fromUserSettings('OEM_MINUS'), 88 /* KeyCode.Minus */);
        assert.strictEqual(KeyCodeUtils.fromUserSettings('oem_minus'), 88 /* KeyCode.Minus */);
    });
    test('mapping for Space', () => {
        // [21, 10, 1, ScanCode.Space, 'Space', KeyCode.Space, 'Space', 32, 'VK_SPACE', empty, empty],
        assert.strictEqual(EVENT_KEY_CODE_MAP[32], 10 /* KeyCode.Space */);
        assert.strictEqual(NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE['VK_SPACE'], 10 /* KeyCode.Space */);
        assert.strictEqual(ScanCodeUtils.lowerCaseToEnum('space'), 50 /* ScanCode.Space */);
        assert.strictEqual(ScanCodeUtils.toEnum('Space'), 50 /* ScanCode.Space */);
        assert.strictEqual(ScanCodeUtils.toString(50 /* ScanCode.Space */), 'Space');
        assert.strictEqual(IMMUTABLE_CODE_TO_KEY_CODE[50 /* ScanCode.Space */], 10 /* KeyCode.Space */);
        assert.strictEqual(IMMUTABLE_KEY_CODE_TO_CODE[10 /* KeyCode.Space */], 50 /* ScanCode.Space */);
        assert.strictEqual(KeyCodeUtils.toString(10 /* KeyCode.Space */), 'Space');
        assert.strictEqual(KeyCodeUtils.fromString('Space'), 10 /* KeyCode.Space */);
        assert.strictEqual(KeyCodeUtils.toUserSettingsUS(10 /* KeyCode.Space */), 'Space');
        assert.strictEqual(KeyCodeUtils.toUserSettingsGeneral(10 /* KeyCode.Space */), 'Space');
        assert.strictEqual(KeyCodeUtils.fromUserSettings('Space'), 10 /* KeyCode.Space */);
        assert.strictEqual(KeyCodeUtils.fromUserSettings('space'), 10 /* KeyCode.Space */);
    });
    test('MAC binary encoding', () => {
        function test(expected, k) {
            testBinaryEncoding(expected, k, 2 /* OperatingSystem.Macintosh */);
        }
        test(null, 0);
        test(new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new Keybinding([
            new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */),
            new KeyCodeChord(false, false, false, false, 2 /* KeyCode.Tab */)
        ]), KeyChord(3 /* KeyCode.Enter */, 2 /* KeyCode.Tab */));
        test(new Keybinding([
            new KeyCodeChord(false, false, false, true, 55 /* KeyCode.KeyY */),
            new KeyCodeChord(false, false, false, false, 56 /* KeyCode.KeyZ */)
        ]), KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */));
    });
    test('WINDOWS & LINUX binary encoding', () => {
        [3 /* OperatingSystem.Linux */, 1 /* OperatingSystem.Windows */].forEach((OS) => {
            function test(expected, k) {
                testBinaryEncoding(expected, k, OS);
            }
            test(null, 0);
            test(new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new Keybinding([
                new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */),
                new KeyCodeChord(false, false, false, false, 2 /* KeyCode.Tab */)
            ]), KeyChord(3 /* KeyCode.Enter */, 2 /* KeyCode.Tab */));
            test(new Keybinding([
                new KeyCodeChord(true, false, false, false, 55 /* KeyCode.KeyY */),
                new KeyCodeChord(false, false, false, false, 56 /* KeyCode.KeyZ */)
            ]), KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Q29kZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2tleUNvZGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSwwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSxRQUFRLEVBQVcsWUFBWSxFQUFVLG1DQUFtQyxFQUFZLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzdOLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFekYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBRXRCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxrQkFBa0IsQ0FBQyxRQUEyQixFQUFFLENBQVMsRUFBRSxFQUFtQjtRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5Qix1R0FBdUc7UUFDdkcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMseUJBQWdCLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQ0FBbUMsQ0FBQyxjQUFjLENBQUMseUJBQWdCLENBQUM7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQywwQkFBaUIsQ0FBQztRQUMzRSxN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