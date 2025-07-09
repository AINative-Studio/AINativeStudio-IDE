/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { CoverageDetailsModel } from '../../browser/codeCoverageDecorations.js';
suite('Code Coverage Decorations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const textModel = { getValueInRange: () => '' };
    const assertRanges = async (model) => await assertSnapshot(model.ranges.map(r => ({
        range: r.range.toString(),
        count: r.metadata.detail.type === 2 /* DetailType.Branch */ ? r.metadata.detail.detail.branches[r.metadata.detail.branch].count : r.metadata.detail.count,
    })));
    test('CoverageDetailsModel#1', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Range(2, 0, 3, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(4, 0, 6, 0), type: 1 /* DetailType.Statement */, branches: [{ location: new Range(3, 0, 7, 0), count: 3 }], count: 4 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
    test('CoverageDetailsModel#2', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Range(2, 0, 4, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(3, 0, 3, 5), type: 1 /* DetailType.Statement */, count: 3 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
    test('CoverageDetailsModel#3', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Range(2, 0, 3, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(4, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 3 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
    test('CoverageDetailsModel#4', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Position(2, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(4, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 3 },
            { location: new Position(4, 3), type: 1 /* DetailType.Statement */, count: 4 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNvdmVyYWdlRGVjb3JhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvYnJvd3Nlci9jb2RlQ292ZXJhZ2VEZWNvcmF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR2hGLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7SUFDdkMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLFNBQVMsR0FBRyxFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQXVCLENBQUM7SUFDckUsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQUUsRUFBRSxDQUFDLE1BQU0sY0FBYyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2RyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUU7UUFDekIsS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksOEJBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLO0tBQ2xKLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFTCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekMsc0NBQXNDO1FBQ3RDLE1BQU0sT0FBTyxHQUFzQjtZQUNsQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLDhCQUFzQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7WUFDekUsRUFBRSxRQUFRLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSw4QkFBc0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO1lBQ3pFLEVBQUUsUUFBUSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksOEJBQXNCLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtTQUNwSSxDQUFDO1FBRUYsNkNBQTZDO1FBQzdDLE1BQU0sS0FBSyxHQUFHLElBQUksb0JBQW9CLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTNELGlEQUFpRDtRQUNqRCxNQUFNLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6QyxzQ0FBc0M7UUFDdEMsTUFBTSxPQUFPLEdBQXNCO1lBQ2xDLEVBQUUsUUFBUSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksOEJBQXNCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUN6RSxFQUFFLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLDhCQUFzQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7WUFDekUsRUFBRSxRQUFRLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSw4QkFBc0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO1NBQ3pFLENBQUM7UUFFRiw2Q0FBNkM7UUFDN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFM0QsaURBQWlEO1FBQ2pELE1BQU0sWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pDLHNDQUFzQztRQUN0QyxNQUFNLE9BQU8sR0FBc0I7WUFDbEMsRUFBRSxRQUFRLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSw4QkFBc0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO1lBQ3pFLEVBQUUsUUFBUSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksOEJBQXNCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUN6RSxFQUFFLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLDhCQUFzQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7U0FDekUsQ0FBQztRQUVGLDZDQUE2QztRQUM3QyxNQUFNLEtBQUssR0FBRyxJQUFJLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUUzRCxpREFBaUQ7UUFDakQsTUFBTSxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekMsc0NBQXNDO1FBQ3RDLE1BQU0sT0FBTyxHQUFzQjtZQUNsQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLDhCQUFzQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7WUFDekUsRUFBRSxRQUFRLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksOEJBQXNCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUN0RSxFQUFFLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLDhCQUFzQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7WUFDekUsRUFBRSxRQUFRLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksOEJBQXNCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtTQUN0RSxDQUFDO1FBRUYsNkNBQTZDO1FBQzdDLE1BQU0sS0FBSyxHQUFHLElBQUksb0JBQW9CLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTNELGlEQUFpRDtRQUNqRCxNQUFNLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=