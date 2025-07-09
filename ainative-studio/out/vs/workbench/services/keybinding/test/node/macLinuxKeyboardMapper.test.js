/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyChord, ScanCodeUtils } from '../../../../../base/common/keyCodes.js';
import { KeyCodeChord, decodeKeybinding, createSimpleKeybinding, ScanCodeChord, Keybinding } from '../../../../../base/common/keybindings.js';
import { UserSettingsLabelProvider } from '../../../../../base/common/keybindingLabels.js';
import { USLayoutResolvedKeybinding } from '../../../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
import { MacLinuxKeyboardMapper } from '../../common/macLinuxKeyboardMapper.js';
import { assertMapping, assertResolveKeyboardEvent, assertResolveKeybinding, readRawMapping } from './keyboardMapperTestUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const WRITE_FILE_IF_DIFFERENT = false;
async function createKeyboardMapper(isUSStandard, file, mapAltGrToCtrlAlt, OS) {
    const rawMappings = await readRawMapping(file);
    return new MacLinuxKeyboardMapper(isUSStandard, rawMappings, mapAltGrToCtrlAlt, OS);
}
suite('keyboardMapper - MAC de_ch', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        const _mapper = await createKeyboardMapper(false, 'mac_de_ch', false, 2 /* OperatingSystem.Macintosh */);
        mapper = _mapper;
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'mac_de_ch.txt');
    });
    function assertKeybindingTranslation(kb, expected) {
        _assertKeybindingTranslation(mapper, 2 /* OperatingSystem.Macintosh */, kb, expected);
    }
    function _assertResolveKeybinding(k, expected) {
        assertResolveKeybinding(mapper, decodeKeybinding(k, 2 /* OperatingSystem.Macintosh */), expected);
    }
    test('kb => hw', () => {
        // unchanged
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */, 'cmd+Digit1');
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, 'cmd+KeyB');
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 32 /* KeyCode.KeyB */, 'shift+cmd+KeyB');
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 32 /* KeyCode.KeyB */, 'ctrl+shift+alt+cmd+KeyB');
        // flips Y and Z
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */, 'cmd+KeyY');
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 'cmd+KeyZ');
        // Ctrl+/
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */, 'shift+cmd+Digit7');
    });
    test('resolveKeybinding Cmd+A', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, [{
                label: '⌘A',
                ariaLabel: 'Command+A',
                electronAccelerator: 'Cmd+A',
                userSettingsLabel: 'cmd+a',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['meta+[KeyA]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Cmd+B', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, [{
                label: '⌘B',
                ariaLabel: 'Command+B',
                electronAccelerator: 'Cmd+B',
                userSettingsLabel: 'cmd+b',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['meta+[KeyB]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Cmd+Z', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */, [{
                label: '⌘Z',
                ariaLabel: 'Command+Z',
                electronAccelerator: 'Cmd+Z',
                userSettingsLabel: 'cmd+z',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['meta+[KeyY]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Cmd+[KeyY]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: -1,
            code: 'KeyY'
        }, {
            label: '⌘Z',
            ariaLabel: 'Command+Z',
            electronAccelerator: 'Cmd+Z',
            userSettingsLabel: 'cmd+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['meta+[KeyY]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeybinding Cmd+]', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */, [{
                label: '⌃⌥⌘6',
                ariaLabel: 'Control+Option+Command+6',
                electronAccelerator: 'Ctrl+Alt+Cmd+6',
                userSettingsLabel: 'ctrl+alt+cmd+6',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+alt+meta+[Digit6]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Cmd+[BracketRight]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: -1,
            code: 'BracketRight'
        }, {
            label: '⌘¨',
            ariaLabel: 'Command+¨',
            electronAccelerator: null,
            userSettingsLabel: 'cmd+[BracketRight]',
            isWYSIWYG: false,
            isMultiChord: false,
            dispatchParts: ['meta+[BracketRight]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeybinding Shift+]', () => {
        _assertResolveKeybinding(1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */, [{
                label: '⌃⌥9',
                ariaLabel: 'Control+Option+9',
                electronAccelerator: 'Ctrl+Alt+9',
                userSettingsLabel: 'ctrl+alt+9',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+alt+[Digit9]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Cmd+/', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */, [{
                label: '⇧⌘7',
                ariaLabel: 'Shift+Command+7',
                electronAccelerator: 'Shift+Cmd+7',
                userSettingsLabel: 'shift+cmd+7',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['shift+meta+[Digit7]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Cmd+Shift+/', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 90 /* KeyCode.Slash */, [{
                label: '⇧⌘\'',
                ariaLabel: 'Shift+Command+\'',
                electronAccelerator: null,
                userSettingsLabel: 'shift+cmd+[Minus]',
                isWYSIWYG: false,
                isMultiChord: false,
                dispatchParts: ['shift+meta+[Minus]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Cmd+K Cmd+\\', () => {
        _assertResolveKeybinding(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */), [{
                label: '⌘K ⌃⇧⌥⌘7',
                ariaLabel: 'Command+K Control+Shift+Option+Command+7',
                electronAccelerator: null,
                userSettingsLabel: 'cmd+k ctrl+shift+alt+cmd+7',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['meta+[KeyK]', 'ctrl+shift+alt+meta+[Digit7]'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeybinding Cmd+K Cmd+=', () => {
        _assertResolveKeybinding(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */), [{
                label: '⌘K ⇧⌘0',
                ariaLabel: 'Command+K Shift+Command+0',
                electronAccelerator: null,
                userSettingsLabel: 'cmd+k shift+cmd+0',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['meta+[KeyK]', 'shift+meta+[Digit0]'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeybinding Cmd+DownArrow', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, [{
                label: '⌘↓',
                ariaLabel: 'Command+DownArrow',
                electronAccelerator: 'Cmd+Down',
                userSettingsLabel: 'cmd+down',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['meta+[ArrowDown]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Cmd+NUMPAD_0', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 98 /* KeyCode.Numpad0 */, [{
                label: '⌘NumPad0',
                ariaLabel: 'Command+NumPad0',
                electronAccelerator: null,
                userSettingsLabel: 'cmd+numpad0',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['meta+[Numpad0]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+Home', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */, [{
                label: '⌘Home',
                ariaLabel: 'Command+Home',
                electronAccelerator: 'Cmd+Home',
                userSettingsLabel: 'cmd+home',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['meta+[Home]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Ctrl+[Home]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: -1,
            code: 'Home'
        }, {
            label: '⌘Home',
            ariaLabel: 'Command+Home',
            electronAccelerator: 'Cmd+Home',
            userSettingsLabel: 'cmd+home',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['meta+[Home]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveUserBinding Cmd+[Comma] Cmd+/', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(false, false, false, true, 60 /* ScanCode.Comma */),
            new KeyCodeChord(false, false, false, true, 90 /* KeyCode.Slash */),
        ]), [{
                label: '⌘, ⇧⌘7',
                ariaLabel: 'Command+, Shift+Command+7',
                electronAccelerator: null,
                userSettingsLabel: 'cmd+[Comma] shift+cmd+7',
                isWYSIWYG: false,
                isMultiChord: true,
                dispatchParts: ['meta+[Comma]', 'shift+meta+[Digit7]'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeyboardEvent Single Modifier MetaLeft+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: -1,
            code: 'MetaLeft'
        }, {
            label: '⌘',
            ariaLabel: 'Command',
            electronAccelerator: null,
            userSettingsLabel: 'cmd',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['meta'],
        });
    });
    test('resolveKeyboardEvent Single Modifier MetaRight+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: -1,
            code: 'MetaRight'
        }, {
            label: '⌘',
            ariaLabel: 'Command',
            electronAccelerator: null,
            userSettingsLabel: 'cmd',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['meta'],
        });
    });
});
suite('keyboardMapper - MAC en_us', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        const _mapper = await createKeyboardMapper(true, 'mac_en_us', false, 2 /* OperatingSystem.Macintosh */);
        mapper = _mapper;
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'mac_en_us.txt');
    });
    test('resolveUserBinding Cmd+[Comma] Cmd+/', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(false, false, false, true, 60 /* ScanCode.Comma */),
            new KeyCodeChord(false, false, false, true, 90 /* KeyCode.Slash */),
        ]), [{
                label: '⌘, ⌘/',
                ariaLabel: 'Command+, Command+/',
                electronAccelerator: null,
                userSettingsLabel: 'cmd+, cmd+/',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['meta+[Comma]', 'meta+[Slash]'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeyboardEvent Single Modifier MetaLeft+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: -1,
            code: 'MetaLeft'
        }, {
            label: '⌘',
            ariaLabel: 'Command',
            electronAccelerator: null,
            userSettingsLabel: 'cmd',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['meta'],
        });
    });
    test('resolveKeyboardEvent Single Modifier MetaRight+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: -1,
            code: 'MetaRight'
        }, {
            label: '⌘',
            ariaLabel: 'Command',
            electronAccelerator: null,
            userSettingsLabel: 'cmd',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['meta'],
        });
    });
    test('resolveKeyboardEvent mapAltGrToCtrlAlt AltGr+Z', async () => {
        const mapper = await createKeyboardMapper(true, 'mac_en_us', true, 2 /* OperatingSystem.Macintosh */);
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: true,
            keyCode: -1,
            code: 'KeyZ'
        }, {
            label: '⌃⌥Z',
            ariaLabel: 'Control+Option+Z',
            electronAccelerator: 'Ctrl+Alt+Z',
            userSettingsLabel: 'ctrl+alt+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+alt+[KeyZ]'],
            singleModifierDispatchParts: [null],
        });
    });
});
suite('keyboardMapper - LINUX de_ch', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        const _mapper = await createKeyboardMapper(false, 'linux_de_ch', false, 3 /* OperatingSystem.Linux */);
        mapper = _mapper;
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'linux_de_ch.txt');
    });
    function assertKeybindingTranslation(kb, expected) {
        _assertKeybindingTranslation(mapper, 3 /* OperatingSystem.Linux */, kb, expected);
    }
    function _assertResolveKeybinding(k, expected) {
        assertResolveKeybinding(mapper, decodeKeybinding(k, 3 /* OperatingSystem.Linux */), expected);
    }
    test('kb => hw', () => {
        // unchanged
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */, 'ctrl+Digit1');
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, 'ctrl+KeyB');
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 32 /* KeyCode.KeyB */, 'ctrl+shift+KeyB');
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 32 /* KeyCode.KeyB */, 'ctrl+shift+alt+meta+KeyB');
        // flips Y and Z
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */, 'ctrl+KeyY');
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 'ctrl+KeyZ');
        // Ctrl+/
        assertKeybindingTranslation(2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */, 'ctrl+shift+Digit7');
    });
    test('resolveKeybinding Ctrl+A', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, [{
                label: 'Ctrl+A',
                ariaLabel: 'Control+A',
                electronAccelerator: 'Ctrl+A',
                userSettingsLabel: 'ctrl+a',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[KeyA]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+Z', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */, [{
                label: 'Ctrl+Z',
                ariaLabel: 'Control+Z',
                electronAccelerator: 'Ctrl+Z',
                userSettingsLabel: 'ctrl+z',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[KeyY]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Ctrl+[KeyY]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'KeyY'
        }, {
            label: 'Ctrl+Z',
            ariaLabel: 'Control+Z',
            electronAccelerator: 'Ctrl+Z',
            userSettingsLabel: 'ctrl+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+[KeyY]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeybinding Ctrl+]', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */, []);
    });
    test('resolveKeyboardEvent Ctrl+[BracketRight]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'BracketRight'
        }, {
            label: 'Ctrl+¨',
            ariaLabel: 'Control+¨',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl+[BracketRight]',
            isWYSIWYG: false,
            isMultiChord: false,
            dispatchParts: ['ctrl+[BracketRight]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeybinding Shift+]', () => {
        _assertResolveKeybinding(1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */, [{
                label: 'Ctrl+Alt+0',
                ariaLabel: 'Control+Alt+0',
                electronAccelerator: 'Ctrl+Alt+0',
                userSettingsLabel: 'ctrl+alt+0',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+alt+[Digit0]'],
                singleModifierDispatchParts: [null],
            }, {
                label: 'Ctrl+Alt+$',
                ariaLabel: 'Control+Alt+$',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+alt+[Backslash]',
                isWYSIWYG: false,
                isMultiChord: false,
                dispatchParts: ['ctrl+alt+[Backslash]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+/', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */, [{
                label: 'Ctrl+Shift+7',
                ariaLabel: 'Control+Shift+7',
                electronAccelerator: 'Ctrl+Shift+7',
                userSettingsLabel: 'ctrl+shift+7',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+shift+[Digit7]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+Shift+/', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 90 /* KeyCode.Slash */, [{
                label: 'Ctrl+Shift+\'',
                ariaLabel: 'Control+Shift+\'',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+shift+[Minus]',
                isWYSIWYG: false,
                isMultiChord: false,
                dispatchParts: ['ctrl+shift+[Minus]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+K Ctrl+\\', () => {
        _assertResolveKeybinding(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */), []);
    });
    test('resolveKeybinding Ctrl+K Ctrl+=', () => {
        _assertResolveKeybinding(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */), [{
                label: 'Ctrl+K Ctrl+Shift+0',
                ariaLabel: 'Control+K Control+Shift+0',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+k ctrl+shift+0',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['ctrl+[KeyK]', 'ctrl+shift+[Digit0]'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeybinding Ctrl+DownArrow', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, [{
                label: 'Ctrl+DownArrow',
                ariaLabel: 'Control+DownArrow',
                electronAccelerator: 'Ctrl+Down',
                userSettingsLabel: 'ctrl+down',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[ArrowDown]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+NUMPAD_0', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 98 /* KeyCode.Numpad0 */, [{
                label: 'Ctrl+NumPad0',
                ariaLabel: 'Control+NumPad0',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+numpad0',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[Numpad0]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+Home', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */, [{
                label: 'Ctrl+Home',
                ariaLabel: 'Control+Home',
                electronAccelerator: 'Ctrl+Home',
                userSettingsLabel: 'ctrl+home',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[Home]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Ctrl+[Home]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'Home'
        }, {
            label: 'Ctrl+Home',
            ariaLabel: 'Control+Home',
            electronAccelerator: 'Ctrl+Home',
            userSettingsLabel: 'ctrl+home',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+[Home]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeyboardEvent Ctrl+[KeyX]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'KeyX'
        }, {
            label: 'Ctrl+X',
            ariaLabel: 'Control+X',
            electronAccelerator: 'Ctrl+X',
            userSettingsLabel: 'ctrl+x',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+[KeyX]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveUserBinding Ctrl+[Comma] Ctrl+/', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(true, false, false, false, 60 /* ScanCode.Comma */),
            new KeyCodeChord(true, false, false, false, 90 /* KeyCode.Slash */),
        ]), [{
                label: 'Ctrl+, Ctrl+Shift+7',
                ariaLabel: 'Control+, Control+Shift+7',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+[Comma] ctrl+shift+7',
                isWYSIWYG: false,
                isMultiChord: true,
                dispatchParts: ['ctrl+[Comma]', 'ctrl+shift+[Digit7]'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeyboardEvent Single Modifier ControlLeft+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'ControlLeft'
        }, {
            label: 'Ctrl',
            ariaLabel: 'Control',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['ctrl'],
        });
    });
    test('resolveKeyboardEvent Single Modifier ControlRight+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'ControlRight'
        }, {
            label: 'Ctrl',
            ariaLabel: 'Control',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['ctrl'],
        });
    });
});
suite('keyboardMapper - LINUX en_us', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        const _mapper = await createKeyboardMapper(true, 'linux_en_us', false, 3 /* OperatingSystem.Linux */);
        mapper = _mapper;
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'linux_en_us.txt');
    });
    function _assertResolveKeybinding(k, expected) {
        assertResolveKeybinding(mapper, decodeKeybinding(k, 3 /* OperatingSystem.Linux */), expected);
    }
    test('resolveKeybinding Ctrl+A', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, [{
                label: 'Ctrl+A',
                ariaLabel: 'Control+A',
                electronAccelerator: 'Ctrl+A',
                userSettingsLabel: 'ctrl+a',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[KeyA]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+Z', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */, [{
                label: 'Ctrl+Z',
                ariaLabel: 'Control+Z',
                electronAccelerator: 'Ctrl+Z',
                userSettingsLabel: 'ctrl+z',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[KeyZ]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Ctrl+[KeyZ]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'KeyZ'
        }, {
            label: 'Ctrl+Z',
            ariaLabel: 'Control+Z',
            electronAccelerator: 'Ctrl+Z',
            userSettingsLabel: 'ctrl+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+[KeyZ]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeybinding Ctrl+]', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */, [{
                label: 'Ctrl+]',
                ariaLabel: 'Control+]',
                electronAccelerator: 'Ctrl+]',
                userSettingsLabel: 'ctrl+]',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[BracketRight]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Ctrl+[BracketRight]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'BracketRight'
        }, {
            label: 'Ctrl+]',
            ariaLabel: 'Control+]',
            electronAccelerator: 'Ctrl+]',
            userSettingsLabel: 'ctrl+]',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+[BracketRight]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeybinding Shift+]', () => {
        _assertResolveKeybinding(1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */, [{
                label: 'Shift+]',
                ariaLabel: 'Shift+]',
                electronAccelerator: 'Shift+]',
                userSettingsLabel: 'shift+]',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['shift+[BracketRight]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+/', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */, [{
                label: 'Ctrl+/',
                ariaLabel: 'Control+/',
                electronAccelerator: 'Ctrl+/',
                userSettingsLabel: 'ctrl+/',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[Slash]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+Shift+/', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 90 /* KeyCode.Slash */, [{
                label: 'Ctrl+Shift+/',
                ariaLabel: 'Control+Shift+/',
                electronAccelerator: 'Ctrl+Shift+/',
                userSettingsLabel: 'ctrl+shift+/',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+shift+[Slash]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+K Ctrl+\\', () => {
        _assertResolveKeybinding(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */), [{
                label: 'Ctrl+K Ctrl+\\',
                ariaLabel: 'Control+K Control+\\',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+k ctrl+\\',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['ctrl+[KeyK]', 'ctrl+[Backslash]'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeybinding Ctrl+K Ctrl+=', () => {
        _assertResolveKeybinding(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */), [{
                label: 'Ctrl+K Ctrl+=',
                ariaLabel: 'Control+K Control+=',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+k ctrl+=',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['ctrl+[KeyK]', 'ctrl+[Equal]'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeybinding Ctrl+DownArrow', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, [{
                label: 'Ctrl+DownArrow',
                ariaLabel: 'Control+DownArrow',
                electronAccelerator: 'Ctrl+Down',
                userSettingsLabel: 'ctrl+down',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[ArrowDown]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+NUMPAD_0', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 98 /* KeyCode.Numpad0 */, [{
                label: 'Ctrl+NumPad0',
                ariaLabel: 'Control+NumPad0',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+numpad0',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[Numpad0]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+Home', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */, [{
                label: 'Ctrl+Home',
                ariaLabel: 'Control+Home',
                electronAccelerator: 'Ctrl+Home',
                userSettingsLabel: 'ctrl+home',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[Home]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Ctrl+[Home]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'Home'
        }, {
            label: 'Ctrl+Home',
            ariaLabel: 'Control+Home',
            electronAccelerator: 'Ctrl+Home',
            userSettingsLabel: 'ctrl+home',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+[Home]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeybinding Ctrl+Shift+,', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 87 /* KeyCode.Comma */, [{
                label: 'Ctrl+Shift+,',
                ariaLabel: 'Control+Shift+,',
                electronAccelerator: 'Ctrl+Shift+,',
                userSettingsLabel: 'ctrl+shift+,',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+shift+[Comma]'],
                singleModifierDispatchParts: [null],
            }, {
                label: 'Ctrl+<',
                ariaLabel: 'Control+<',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+[IntlBackslash]',
                isWYSIWYG: false,
                isMultiChord: false,
                dispatchParts: ['ctrl+[IntlBackslash]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('issue #23393: resolveKeybinding Ctrl+Enter', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */, [{
                label: 'Ctrl+Enter',
                ariaLabel: 'Control+Enter',
                electronAccelerator: 'Ctrl+Enter',
                userSettingsLabel: 'ctrl+enter',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[Enter]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('issue #23393: resolveKeyboardEvent Ctrl+[NumpadEnter]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'NumpadEnter'
        }, {
            label: 'Ctrl+Enter',
            ariaLabel: 'Control+Enter',
            electronAccelerator: 'Ctrl+Enter',
            userSettingsLabel: 'ctrl+enter',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+[Enter]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveUserBinding Ctrl+[Comma] Ctrl+/', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(true, false, false, false, 60 /* ScanCode.Comma */),
            new KeyCodeChord(true, false, false, false, 90 /* KeyCode.Slash */),
        ]), [{
                label: 'Ctrl+, Ctrl+/',
                ariaLabel: 'Control+, Control+/',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+, ctrl+/',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['ctrl+[Comma]', 'ctrl+[Slash]'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveUserBinding Ctrl+[Comma]', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(true, false, false, false, 60 /* ScanCode.Comma */)
        ]), [{
                label: 'Ctrl+,',
                ariaLabel: 'Control+,',
                electronAccelerator: 'Ctrl+,',
                userSettingsLabel: 'ctrl+,',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[Comma]'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Single Modifier ControlLeft+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'ControlLeft'
        }, {
            label: 'Ctrl',
            ariaLabel: 'Control',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['ctrl'],
        });
    });
    test('resolveKeyboardEvent Single Modifier ControlRight+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'ControlRight'
        }, {
            label: 'Ctrl',
            ariaLabel: 'Control',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['ctrl'],
        });
    });
    test('resolveKeyboardEvent Single Modifier ShiftLeft+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: true,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'ShiftLeft'
        }, {
            label: 'Shift',
            ariaLabel: 'Shift',
            electronAccelerator: null,
            userSettingsLabel: 'shift',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['shift'],
        });
    });
    test('resolveKeyboardEvent Single Modifier ShiftRight+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: true,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'ShiftRight'
        }, {
            label: 'Shift',
            ariaLabel: 'Shift',
            electronAccelerator: null,
            userSettingsLabel: 'shift',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['shift'],
        });
    });
    test('resolveKeyboardEvent Single Modifier AltLeft+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: true,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'AltLeft'
        }, {
            label: 'Alt',
            ariaLabel: 'Alt',
            electronAccelerator: null,
            userSettingsLabel: 'alt',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['alt'],
        });
    });
    test('resolveKeyboardEvent Single Modifier AltRight+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: true,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'AltRight'
        }, {
            label: 'Alt',
            ariaLabel: 'Alt',
            electronAccelerator: null,
            userSettingsLabel: 'alt',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['alt'],
        });
    });
    test('resolveKeyboardEvent Single Modifier MetaLeft+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: -1,
            code: 'MetaLeft'
        }, {
            label: 'Super',
            ariaLabel: 'Super',
            electronAccelerator: null,
            userSettingsLabel: 'meta',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['meta'],
        });
    });
    test('resolveKeyboardEvent Single Modifier MetaRight+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: -1,
            code: 'MetaRight'
        }, {
            label: 'Super',
            ariaLabel: 'Super',
            electronAccelerator: null,
            userSettingsLabel: 'meta',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['meta'],
        });
    });
    test('resolveKeyboardEvent Only Modifiers Ctrl+Shift+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: true,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'ShiftLeft'
        }, {
            label: 'Ctrl+Shift',
            ariaLabel: 'Control+Shift',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl+shift',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeyboardEvent mapAltGrToCtrlAlt AltGr+Z', async () => {
        const mapper = await createKeyboardMapper(true, 'linux_en_us', true, 3 /* OperatingSystem.Linux */);
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: true,
            keyCode: -1,
            code: 'KeyZ'
        }, {
            label: 'Ctrl+Alt+Z',
            ariaLabel: 'Control+Alt+Z',
            electronAccelerator: 'Ctrl+Alt+Z',
            userSettingsLabel: 'ctrl+alt+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+alt+[KeyZ]'],
            singleModifierDispatchParts: [null],
        });
    });
});
suite('keyboardMapper', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #23706: Linux UK layout: Ctrl + Apostrophe also toggles terminal', () => {
        const mapper = new MacLinuxKeyboardMapper(false, {
            'Backquote': {
                'value': '`',
                'withShift': '¬',
                'withAltGr': '|',
                'withShiftAltGr': '|'
            }
        }, false, 3 /* OperatingSystem.Linux */);
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'Backquote'
        }, {
            label: 'Ctrl+`',
            ariaLabel: 'Control+`',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl+`',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+[Backquote]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('issue #24064: NumLock/NumPad keys stopped working in 1.11 on Linux', () => {
        const mapper = new MacLinuxKeyboardMapper(false, {}, false, 3 /* OperatingSystem.Linux */);
        function assertNumpadKeyboardEvent(keyCode, code, label, electronAccelerator, userSettingsLabel, dispatch) {
            assertResolveKeyboardEvent(mapper, {
                _standardKeyboardEventBrand: true,
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false,
                altGraphKey: false,
                keyCode: keyCode,
                code: code
            }, {
                label: label,
                ariaLabel: label,
                electronAccelerator: electronAccelerator,
                userSettingsLabel: userSettingsLabel,
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: [dispatch],
                singleModifierDispatchParts: [null],
            });
        }
        assertNumpadKeyboardEvent(13 /* KeyCode.End */, 'Numpad1', 'End', 'End', 'end', '[End]');
        assertNumpadKeyboardEvent(18 /* KeyCode.DownArrow */, 'Numpad2', 'DownArrow', 'Down', 'down', '[ArrowDown]');
        assertNumpadKeyboardEvent(12 /* KeyCode.PageDown */, 'Numpad3', 'PageDown', 'PageDown', 'pagedown', '[PageDown]');
        assertNumpadKeyboardEvent(15 /* KeyCode.LeftArrow */, 'Numpad4', 'LeftArrow', 'Left', 'left', '[ArrowLeft]');
        assertNumpadKeyboardEvent(0 /* KeyCode.Unknown */, 'Numpad5', 'NumPad5', null, 'numpad5', '[Numpad5]');
        assertNumpadKeyboardEvent(17 /* KeyCode.RightArrow */, 'Numpad6', 'RightArrow', 'Right', 'right', '[ArrowRight]');
        assertNumpadKeyboardEvent(14 /* KeyCode.Home */, 'Numpad7', 'Home', 'Home', 'home', '[Home]');
        assertNumpadKeyboardEvent(16 /* KeyCode.UpArrow */, 'Numpad8', 'UpArrow', 'Up', 'up', '[ArrowUp]');
        assertNumpadKeyboardEvent(11 /* KeyCode.PageUp */, 'Numpad9', 'PageUp', 'PageUp', 'pageup', '[PageUp]');
        assertNumpadKeyboardEvent(19 /* KeyCode.Insert */, 'Numpad0', 'Insert', 'Insert', 'insert', '[Insert]');
        assertNumpadKeyboardEvent(20 /* KeyCode.Delete */, 'NumpadDecimal', 'Delete', 'Delete', 'delete', '[Delete]');
    });
    test('issue #24107: Delete, Insert, Home, End, PgUp, PgDn, and arrow keys no longer work editor in 1.11', () => {
        const mapper = new MacLinuxKeyboardMapper(false, {}, false, 3 /* OperatingSystem.Linux */);
        function assertKeyboardEvent(keyCode, code, label, electronAccelerator, userSettingsLabel, dispatch) {
            assertResolveKeyboardEvent(mapper, {
                _standardKeyboardEventBrand: true,
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false,
                altGraphKey: false,
                keyCode: keyCode,
                code: code
            }, {
                label: label,
                ariaLabel: label,
                electronAccelerator: electronAccelerator,
                userSettingsLabel: userSettingsLabel,
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: [dispatch],
                singleModifierDispatchParts: [null],
            });
        }
        // https://github.com/microsoft/vscode/issues/24107#issuecomment-292318497
        assertKeyboardEvent(16 /* KeyCode.UpArrow */, 'Lang3', 'UpArrow', 'Up', 'up', '[ArrowUp]');
        assertKeyboardEvent(18 /* KeyCode.DownArrow */, 'NumpadEnter', 'DownArrow', 'Down', 'down', '[ArrowDown]');
        assertKeyboardEvent(15 /* KeyCode.LeftArrow */, 'Convert', 'LeftArrow', 'Left', 'left', '[ArrowLeft]');
        assertKeyboardEvent(17 /* KeyCode.RightArrow */, 'NonConvert', 'RightArrow', 'Right', 'right', '[ArrowRight]');
        assertKeyboardEvent(20 /* KeyCode.Delete */, 'PrintScreen', 'Delete', 'Delete', 'delete', '[Delete]');
        assertKeyboardEvent(19 /* KeyCode.Insert */, 'NumpadDivide', 'Insert', 'Insert', 'insert', '[Insert]');
        assertKeyboardEvent(13 /* KeyCode.End */, 'Unknown', 'End', 'End', 'end', '[End]');
        assertKeyboardEvent(14 /* KeyCode.Home */, 'IntlRo', 'Home', 'Home', 'home', '[Home]');
        assertKeyboardEvent(12 /* KeyCode.PageDown */, 'ControlRight', 'PageDown', 'PageDown', 'pagedown', '[PageDown]');
        assertKeyboardEvent(11 /* KeyCode.PageUp */, 'Lang4', 'PageUp', 'PageUp', 'pageup', '[PageUp]');
        // https://github.com/microsoft/vscode/issues/24107#issuecomment-292323924
        assertKeyboardEvent(12 /* KeyCode.PageDown */, 'ControlRight', 'PageDown', 'PageDown', 'pagedown', '[PageDown]');
        assertKeyboardEvent(11 /* KeyCode.PageUp */, 'Lang4', 'PageUp', 'PageUp', 'pageup', '[PageUp]');
        assertKeyboardEvent(13 /* KeyCode.End */, '', 'End', 'End', 'end', '[End]');
        assertKeyboardEvent(14 /* KeyCode.Home */, 'IntlRo', 'Home', 'Home', 'home', '[Home]');
        assertKeyboardEvent(20 /* KeyCode.Delete */, 'PrintScreen', 'Delete', 'Delete', 'delete', '[Delete]');
        assertKeyboardEvent(19 /* KeyCode.Insert */, 'NumpadDivide', 'Insert', 'Insert', 'insert', '[Insert]');
        assertKeyboardEvent(17 /* KeyCode.RightArrow */, 'NonConvert', 'RightArrow', 'Right', 'right', '[ArrowRight]');
        assertKeyboardEvent(15 /* KeyCode.LeftArrow */, 'Convert', 'LeftArrow', 'Left', 'left', '[ArrowLeft]');
        assertKeyboardEvent(18 /* KeyCode.DownArrow */, 'NumpadEnter', 'DownArrow', 'Down', 'down', '[ArrowDown]');
        assertKeyboardEvent(16 /* KeyCode.UpArrow */, 'Lang3', 'UpArrow', 'Up', 'up', '[ArrowUp]');
    });
});
suite('keyboardMapper - LINUX ru', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        const _mapper = await createKeyboardMapper(false, 'linux_ru', false, 3 /* OperatingSystem.Linux */);
        mapper = _mapper;
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'linux_ru.txt');
    });
    function _assertResolveKeybinding(k, expected) {
        assertResolveKeybinding(mapper, decodeKeybinding(k, 3 /* OperatingSystem.Linux */), expected);
    }
    test('resolveKeybinding Ctrl+S', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 49 /* KeyCode.KeyS */, [{
                label: 'Ctrl+S',
                ariaLabel: 'Control+S',
                electronAccelerator: 'Ctrl+S',
                userSettingsLabel: 'ctrl+s',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+[KeyS]'],
                singleModifierDispatchParts: [null],
            }]);
    });
});
suite('keyboardMapper - LINUX en_uk', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        const _mapper = await createKeyboardMapper(false, 'linux_en_uk', false, 3 /* OperatingSystem.Linux */);
        mapper = _mapper;
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'linux_en_uk.txt');
    });
    test('issue #24522: resolveKeyboardEvent Ctrl+Alt+[Minus]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: true,
            metaKey: false,
            altGraphKey: false,
            keyCode: -1,
            code: 'Minus'
        }, {
            label: 'Ctrl+Alt+-',
            ariaLabel: 'Control+Alt+-',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl+alt+[Minus]',
            isWYSIWYG: false,
            isMultiChord: false,
            dispatchParts: ['ctrl+alt+[Minus]'],
            singleModifierDispatchParts: [null],
        });
    });
});
suite('keyboardMapper - MAC zh_hant', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        const _mapper = await createKeyboardMapper(false, 'mac_zh_hant', false, 2 /* OperatingSystem.Macintosh */);
        mapper = _mapper;
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'mac_zh_hant.txt');
    });
    function _assertResolveKeybinding(k, expected) {
        assertResolveKeybinding(mapper, decodeKeybinding(k, 2 /* OperatingSystem.Macintosh */), expected);
    }
    test('issue #28237 resolveKeybinding Cmd+C', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, [{
                label: '⌘C',
                ariaLabel: 'Command+C',
                electronAccelerator: 'Cmd+C',
                userSettingsLabel: 'cmd+c',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['meta+[KeyC]'],
                singleModifierDispatchParts: [null],
            }]);
    });
});
suite('keyboardMapper - MAC zh_hant2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        const _mapper = await createKeyboardMapper(false, 'mac_zh_hant2', false, 2 /* OperatingSystem.Macintosh */);
        mapper = _mapper;
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'mac_zh_hant2.txt');
    });
});
function _assertKeybindingTranslation(mapper, OS, kb, _expected) {
    let expected;
    if (typeof _expected === 'string') {
        expected = [_expected];
    }
    else if (Array.isArray(_expected)) {
        expected = _expected;
    }
    else {
        expected = [];
    }
    const runtimeKeybinding = createSimpleKeybinding(kb, OS);
    const keybindingLabel = new USLayoutResolvedKeybinding([runtimeKeybinding], OS).getUserSettingsLabel();
    const actualHardwareKeypresses = mapper.keyCodeChordToScanCodeChord(runtimeKeybinding);
    if (actualHardwareKeypresses.length === 0) {
        assert.deepStrictEqual([], expected, `simpleKeybindingToHardwareKeypress -- "${keybindingLabel}" -- actual: "[]" -- expected: "${expected}"`);
        return;
    }
    const actual = actualHardwareKeypresses
        .map(k => UserSettingsLabelProvider.toLabel(OS, [k], (keybinding) => ScanCodeUtils.toString(keybinding.scanCode)));
    assert.deepStrictEqual(actual, expected, `simpleKeybindingToHardwareKeypress -- "${keybindingLabel}" -- actual: "${actual}" -- expected: "${expected}"`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFjTGludXhLZXlib2FyZE1hcHBlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL3Rlc3Qvbm9kZS9tYWNMaW51eEtleWJvYXJkTWFwcGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQTZCLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzlJLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTNGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ3JILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hGLE9BQU8sRUFBdUIsYUFBYSxFQUFFLDBCQUEwQixFQUFFLHVCQUF1QixFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXZKLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE1BQU0sdUJBQXVCLEdBQUcsS0FBSyxDQUFDO0FBRXRDLEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxZQUFxQixFQUFFLElBQVksRUFBRSxpQkFBMEIsRUFBRSxFQUFtQjtJQUN2SCxNQUFNLFdBQVcsR0FBRyxNQUFNLGNBQWMsQ0FBMkIsSUFBSSxDQUFDLENBQUM7SUFDekUsT0FBTyxJQUFJLHNCQUFzQixDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUs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