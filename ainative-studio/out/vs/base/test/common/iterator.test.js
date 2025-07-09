/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Iterable } from '../../common/iterator.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Iterable', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    const customIterable = new class {
        *[Symbol.iterator]() {
            yield 'one';
            yield 'two';
            yield 'three';
        }
    };
    test('first', function () {
        assert.strictEqual(Iterable.first([]), undefined);
        assert.strictEqual(Iterable.first([1]), 1);
        assert.strictEqual(Iterable.first(customIterable), 'one');
        assert.strictEqual(Iterable.first(customIterable), 'one'); // fresh
    });
    test('wrap', function () {
        assert.deepStrictEqual([...Iterable.wrap(1)], [1]);
        assert.deepStrictEqual([...Iterable.wrap([1, 2, 3])], [1, 2, 3]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlcmF0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2l0ZXJhdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFckUsS0FBSyxDQUFDLFVBQVUsRUFBRTtJQUVqQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sY0FBYyxHQUFHLElBQUk7UUFFMUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFDakIsTUFBTSxLQUFLLENBQUM7WUFDWixNQUFNLEtBQUssQ0FBQztZQUNaLE1BQU0sT0FBTyxDQUFDO1FBQ2YsQ0FBQztLQUNELENBQUM7SUFFRixJQUFJLENBQUMsT0FBTyxFQUFFO1FBRWIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVE7SUFDcEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1osTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEUsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9