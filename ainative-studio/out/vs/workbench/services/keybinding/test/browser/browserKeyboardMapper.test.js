/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import '../../browser/keyboardLayouts/en.darwin.js';
import '../../browser/keyboardLayouts/de.darwin.js';
import { KeyboardLayoutContribution } from '../../browser/keyboardLayouts/_.contribution.js';
import { BrowserKeyboardMapperFactoryBase } from '../../browser/keyboardLayoutService.js';
import { KeymapInfo } from '../../common/keymapInfo.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class TestKeyboardMapperFactory extends BrowserKeyboardMapperFactoryBase {
    constructor(configurationService, notificationService, storageService, commandService) {
        // super(notificationService, storageService, commandService);
        super(configurationService);
        const keymapInfos = KeyboardLayoutContribution.INSTANCE.layoutInfos;
        this._keymapInfos.push(...keymapInfos.map(info => (new KeymapInfo(info.layout, info.secondaryLayouts, info.mapping, info.isUserKeyboardLayout))));
        this._mru = this._keymapInfos;
        this._initialized = true;
        this.setLayoutFromBrowserAPI();
        const usLayout = this.getUSStandardLayout();
        if (usLayout) {
            this.setActiveKeyMapping(usLayout.mapping);
        }
    }
}
suite('keyboard layout loader', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let instance;
    setup(() => {
        instantiationService = new TestInstantiationService();
        const storageService = new TestStorageService();
        const notitifcationService = instantiationService.stub(INotificationService, new TestNotificationService());
        const configurationService = instantiationService.stub(IConfigurationService, new TestConfigurationService());
        const commandService = instantiationService.stub(ICommandService, {});
        ds.add(instantiationService);
        ds.add(storageService);
        instance = new TestKeyboardMapperFactory(configurationService, notitifcationService, storageService, commandService);
        ds.add(instance);
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('load default US keyboard layout', () => {
        assert.notStrictEqual(instance.activeKeyboardLayout, null);
    });
    test('isKeyMappingActive', () => {
        instance.setUSKeyboardLayout();
        assert.strictEqual(instance.isKeyMappingActive({
            KeyA: {
                value: 'a',
                valueIsDeadKey: false,
                withShift: 'A',
                withShiftIsDeadKey: false,
                withAltGr: 'å',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Å',
                withShiftAltGrIsDeadKey: false
            }
        }), true);
        assert.strictEqual(instance.isKeyMappingActive({
            KeyA: {
                value: 'a',
                valueIsDeadKey: false,
                withShift: 'A',
                withShiftIsDeadKey: false,
                withAltGr: 'å',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Å',
                withShiftAltGrIsDeadKey: false
            },
            KeyZ: {
                value: 'z',
                valueIsDeadKey: false,
                withShift: 'Z',
                withShiftIsDeadKey: false,
                withAltGr: 'Ω',
                withAltGrIsDeadKey: false,
                withShiftAltGr: '¸',
                withShiftAltGrIsDeadKey: false
            }
        }), true);
        assert.strictEqual(instance.isKeyMappingActive({
            KeyZ: {
                value: 'y',
                valueIsDeadKey: false,
                withShift: 'Y',
                withShiftIsDeadKey: false,
                withAltGr: '¥',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Ÿ',
                withShiftAltGrIsDeadKey: false
            },
        }), false);
    });
    test('Switch keymapping', () => {
        instance.setActiveKeyMapping({
            KeyZ: {
                value: 'y',
                valueIsDeadKey: false,
                withShift: 'Y',
                withShiftIsDeadKey: false,
                withAltGr: '¥',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Ÿ',
                withShiftAltGrIsDeadKey: false
            }
        });
        assert.strictEqual(!!instance.activeKeyboardLayout.isUSStandard, false);
        assert.strictEqual(instance.isKeyMappingActive({
            KeyZ: {
                value: 'y',
                valueIsDeadKey: false,
                withShift: 'Y',
                withShiftIsDeadKey: false,
                withAltGr: '¥',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Ÿ',
                withShiftAltGrIsDeadKey: false
            },
        }), true);
        instance.setUSKeyboardLayout();
        assert.strictEqual(instance.activeKeyboardLayout.isUSStandard, true);
    });
    test('Switch keyboard layout info', () => {
        instance.setKeyboardLayout('com.apple.keylayout.German');
        assert.strictEqual(!!instance.activeKeyboardLayout.isUSStandard, false);
        assert.strictEqual(instance.isKeyMappingActive({
            KeyZ: {
                value: 'y',
                valueIsDeadKey: false,
                withShift: 'Y',
                withShiftIsDeadKey: false,
                withAltGr: '¥',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Ÿ',
                withShiftAltGrIsDeadKey: false
            },
        }), true);
        instance.setUSKeyboardLayout();
        assert.strictEqual(instance.activeKeyboardLayout.isUSStandard, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlcktleWJvYXJkTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvdGVzdC9icm93c2VyL2Jyb3dzZXJLZXlib2FyZE1hcHBlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLDRDQUE0QyxDQUFDO0FBQ3BELE9BQU8sNENBQTRDLENBQUM7QUFDcEQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUV0RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxNQUFNLHlCQUEwQixTQUFRLGdDQUFnQztJQUN2RSxZQUFZLG9CQUEyQyxFQUFFLG1CQUF5QyxFQUFFLGNBQStCLEVB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