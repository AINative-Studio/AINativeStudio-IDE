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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlcktleWJvYXJkTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL3Rlc3QvYnJvd3Nlci9icm93c2VyS2V5Ym9hcmRNYXBwZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyw0Q0FBNEMsQ0FBQztBQUNwRCxPQUFPLDRDQUE0QyxDQUFDO0FBQ3BELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw0QkFBNEIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFdEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDdEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsTUFBTSx5QkFBMEIsU0FBUSxnQ0FBZ0M7SUFDdkUsWUFBWSxvQkFBMkMsRUFBRSxtQkFBeUMsRUFBRSxjQUEr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