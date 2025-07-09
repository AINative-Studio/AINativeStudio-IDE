/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { KeybindingEditorDecorationsRenderer } from '../../browser/keybindingsEditorContribution.js';
suite('KeybindingsEditorContribution', () => {
    function assertUserSettingsFuzzyEquals(a, b, expected) {
        const actual = KeybindingEditorDecorationsRenderer._userSettingsFuzzyEquals(a, b);
        const message = expected ? `${a} == ${b}` : `${a} != ${b}`;
        assert.strictEqual(actual, expected, 'fuzzy: ' + message);
    }
    function assertEqual(a, b) {
        assertUserSettingsFuzzyEquals(a, b, true);
    }
    function assertDifferent(a, b) {
        assertUserSettingsFuzzyEquals(a, b, false);
    }
    test('_userSettingsFuzzyEquals', () => {
        assertEqual('a', 'a');
        assertEqual('a', 'A');
        assertEqual('ctrl+a', 'CTRL+A');
        assertEqual('ctrl+a', ' CTRL+A ');
        assertEqual('ctrl+shift+a', 'shift+ctrl+a');
        assertEqual('ctrl+shift+a ctrl+alt+b', 'shift+ctrl+a alt+ctrl+b');
        assertDifferent('ctrl+[KeyA]', 'ctrl+a');
        // issue #23335
        assertEqual('cmd+shift+p', 'shift+cmd+p');
        assertEqual('cmd+shift+p', 'shift-cmd-p');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy90ZXN0L2Jyb3dzZXIva2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFckcsS0FBSyxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtJQUUzQyxTQUFTLDZCQUE2QixDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsUUFBaUI7UUFDN0UsTUFBTSxNQUFNLEdBQUcsbUNBQW1DLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELFNBQVMsV0FBVyxDQUFDLENBQVMsRUFBRSxDQUFTO1FBQ3hDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFDLENBQVMsRUFBRSxDQUFTO1FBQzVDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFDckMsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN0QixXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEMsV0FBVyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVsQyxXQUFXLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzVDLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBRWxFLGVBQWUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFekMsZUFBZTtRQUNmLFdBQVcsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDMUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMifQ==