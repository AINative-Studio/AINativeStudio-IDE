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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFByb2ZpbGVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvY29tbW9uL3Rlc3RQcm9maWxlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFdEYsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUM1QyxJQUFJLENBQXFCLENBQUM7SUFDMUIsSUFBSSxFQUFtQixDQUFDO0lBQ3hCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUVsQixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsRUFBRSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDM0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FDaEMsSUFBSSxxQkFBcUIsRUFBRSxFQUMzQixFQUFFLENBQUMsR0FBRyxDQUFDLElBQUks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