/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { TestProfileService } from '../../common/testProfileService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
suite('Workbench - TestProfileService', () => {
    let t;
    let ds;
    let idCounter = 0;
    teardown(() => {
        ds.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        idCounter = 0;
        ds = new DisposableStore();
        t = ds.add(new TestProfileService(new MockContextKeyService(), ds.add(new TestStorageService())));
    });
    const addProfile = (profile) => {
        const p = {
            controllerId: 'ctrlId',
            group: 2 /* TestRunProfileBitset.Run */,
            isDefault: true,
            label: 'profile',
            profileId: idCounter++,
            hasConfigurationHandler: false,
            tag: null,
            supportsContinuousRun: false,
            ...profile,
        };
        t.addProfile({ id: 'ctrlId' }, p);
        return p;
    };
    const assertGroupDefaults = (group, expected) => {
        assert.deepStrictEqual(t.getGroupDefaultProfiles(group).map(p => p.label), expected.map(e => e.label));
    };
    const expectProfiles = (expected, actual) => {
        const e = expected.map(e => e.label).sort();
        const a = actual.sort();
        assert.deepStrictEqual(e, a);
    };
    test('getGroupDefaultProfiles', () => {
        addProfile({ isDefault: true, group: 4 /* TestRunProfileBitset.Debug */, label: 'a' });
        addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'b' });
        addProfile({ isDefault: true, group: 2 /* TestRunProfileBitset.Run */, label: 'c' });
        addProfile({ isDefault: true, group: 2 /* TestRunProfileBitset.Run */, label: 'd', controllerId: '2' });
        addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'e', controllerId: '2' });
        expectProfiles(t.getGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */), ['c', 'd']);
        expectProfiles(t.getGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */), ['a']);
    });
    suite('setGroupDefaultProfiles', () => {
        test('applies simple changes', () => {
            const p1 = addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'a' });
            addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'b' });
            const p3 = addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'c' });
            addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'd' });
            t.setGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */, [p3]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p3]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p1]);
        });
        test('syncs labels if same', () => {
            const p1 = addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'a' });
            const p2 = addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'b' });
            const p3 = addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'a' });
            const p4 = addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'b' });
            t.setGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */, [p3]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p3]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p1]);
            t.setGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */, [p2]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p4]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p2]);
        });
        test('does not mess up sync for multiple controllers', () => {
            // ctrl a and b both of have their own labels. ctrl c does not and should be unaffected
            const p1 = addProfile({ isDefault: false, controllerId: 'a', group: 4 /* TestRunProfileBitset.Debug */, label: 'a' });
            const p2 = addProfile({ isDefault: false, controllerId: 'b', group: 4 /* TestRunProfileBitset.Debug */, label: 'b1' });
            const p3 = addProfile({ isDefault: false, controllerId: 'b', group: 4 /* TestRunProfileBitset.Debug */, label: 'b2' });
            const p4 = addProfile({ isDefault: false, controllerId: 'c', group: 4 /* TestRunProfileBitset.Debug */, label: 'c1' });
            const p5 = addProfile({ isDefault: false, controllerId: 'a', group: 2 /* TestRunProfileBitset.Run */, label: 'a' });
            const p6 = addProfile({ isDefault: false, controllerId: 'b', group: 2 /* TestRunProfileBitset.Run */, label: 'b1' });
            const p7 = addProfile({ isDefault: false, controllerId: 'b', group: 2 /* TestRunProfileBitset.Run */, label: 'b2' });
            const p8 = addProfile({ isDefault: false, controllerId: 'b', group: 2 /* TestRunProfileBitset.Run */, label: 'b3' });
            // same profile on both
            t.setGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */, [p3]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p7]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p3]);
            // different profile, other should be unaffected
            t.setGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */, [p8]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p8]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p5]);
            // multiple changes in one go, with unmatched c
            t.setGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */, [p1, p2, p4]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p5, p6, p8]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p1, p2, p4]);
            // identity
            t.setGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */, [p5, p6, p8]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p5, p6, p8]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p1, p2, p4]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFByb2ZpbGVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy90ZXN0L2NvbW1vbi90ZXN0UHJvZmlsZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXRGLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFDNUMsSUFBSSxDQUFxQixDQUFDO0lBQzFCLElBQUksRUFBbUIsQ0FBQztJQUN4QixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFFbEIsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNkLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNkLEVBQUUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzNCLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQ2hDLElBQUkscUJBQXFCLEVBQUUsRUFDM0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJ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