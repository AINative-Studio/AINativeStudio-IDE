/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { OffsetRange } from '../../../common/core/offsetRange.js';
import { StringText } from '../../../common/core/textEdit.js';
import { Random } from './random.js';
suite('TextEdit', () => {
    suite('inverse', () => {
        ensureNoDisposablesAreLeakedInTestSuite();
        function runTest(seed) {
            const rand = Random.create(seed);
            const source = new StringText(rand.nextMultiLineString(10, new OffsetRange(0, 10)));
            const edit = rand.nextTextEdit(source, rand.nextIntRange(1, 5));
            const invEdit = edit.inverse(source);
            const s1 = edit.apply(source);
            const s2 = invEdit.applyToString(s1);
            assert.deepStrictEqual(s2, source.value);
        }
        test.skip('brute-force', () => {
            for (let i = 0; i < 100_000; i++) {
                runTest(i);
            }
        });
        for (let seed = 0; seed < 20; seed++) {
            test(`test ${seed}`, () => runTest(seed));
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vY29yZS90ZXh0RWRpdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFckMsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7SUFDdEIsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDckIsdUNBQXVDLEVBQUUsQ0FBQztRQUUxQyxTQUFTLE9BQU8sQ0FBQyxJQUFZO1lBQzVCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakMsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxJQUFJLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXBGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVyQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlCLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFckMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7WUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNsQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDWixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFLLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0MsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==