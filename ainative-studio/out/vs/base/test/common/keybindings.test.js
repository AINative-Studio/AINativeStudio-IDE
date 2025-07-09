/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyCodeChord, ScanCodeChord } from '../../common/keybindings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('keyCodes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #173325: wrong interpretations of special keys (e.g. [Equal] is mistaken for V)', () => {
        const a = new KeyCodeChord(true, false, false, false, 52 /* KeyCode.KeyV */);
        const b = new ScanCodeChord(true, false, false, false, 52 /* ScanCode.Equal */);
        assert.strictEqual(a.getHashCode() === b.getHashCode(), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2tleWJpbmRpbmdzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBRXRCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHVGQUF1RixFQUFFLEdBQUcsRUFBRTtRQUNsRyxNQUFNLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLHdCQUFlLENBQUM7UUFDcEUsTUFBTSxDQUFDLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSywwQkFBaUIsQ0FBQztRQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFDLENBQUM7QUFFSixDQUFDLENBQUMsQ0FBQyJ9