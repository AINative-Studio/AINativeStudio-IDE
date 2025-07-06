/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ListProjection } from '../../../browser/explorerProjections/listProjection.js';
import { TestId } from '../../../common/testId.js';
import { TestTreeTestHarness } from '../testObjectTree.js';
import { TestTestItem } from '../../common/testStubs.js';
suite('Workbench - Testing Explorer Hierarchal by Name Projection', () => {
    let harness;
    let onTestChanged;
    let resultsService;
    teardown(() => {
        harness.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        onTestChanged = new Emitter();
        resultsService = {
            onResultsChanged: () => undefined,
            onTestChanged: onTestChanged.event,
            getStateById: () => ({ state: { state: 0 }, computedState: 0 }),
        };
        harness = new TestTreeTestHarness(l => new ListProjection({}, l, resultsService));
    });
    test('renders initial tree', () => {
        harness.flush();
        assert.deepStrictEqual(harness.tree.getRendered(), [
            { e: 'aa' }, { e: 'ab' }, { e: 'b' }
        ]);
    });
    test('updates render if second test provider appears', async () => {
        harness.flush();
        harness.pushDiff({
            op: 0 /* TestDiffOpType.Add */,
            item: { controllerId: 'ctrl2', expand: 3 /* TestItemExpandState.Expanded */, item: new TestTestItem(new TestId(['ctrl2']), 'root2').toTestItem() },
        }, {
            op: 0 /* TestDiffOpType.Add */,
            item: { controllerId: 'ctrl2', expand: 0 /* TestItemExpandState.NotExpandable */, item: new TestTestItem(new TestId(['ctrl2', 'id-c']), 'c', undefined).toTestItem() },
        });
        assert.deepStrictEqual(harness.flush(), [
            { e: 'root', children: [{ e: 'aa' }, { e: 'ab' }, { e: 'b' }] },
            { e: 'root2', children: [{ e: 'c' }] },
        ]);
    });
    test('updates nodes if they add children', async () => {
        harness.flush();
        harness.c.root.children.get('id-a').children.add(new TestTestItem(new TestId(['ctrlId', 'id-a', 'id-ac']), 'ac'));
        assert.deepStrictEqual(harness.flush(), [
            { e: 'aa' },
            { e: 'ab' },
            { e: 'ac' },
            { e: 'b' }
        ]);
    });
    test('updates nodes if they remove children', async () => {
        harness.flush();
        harness.c.root.children.get('id-a').children.delete('id-ab');
        assert.deepStrictEqual(harness.flush(), [
            { e: 'aa' },
            { e: 'b' }
        ]);
    });
    test('swaps when node is no longer leaf', async () => {
        harness.flush();
        harness.c.root.children.get('id-b').children.add(new TestTestItem(new TestId(['ctrlId', 'id-b', 'id-ba']), 'ba'));
        assert.deepStrictEqual(harness.flush(), [
            { e: 'aa' },
            { e: 'ab' },
            { e: 'ba' },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFtZVByb2plY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9icm93c2VyL2V4cGxvcmVyUHJvamVjdGlvbnMvbmFtZVByb2plY3Rpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHbkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRXpELEtBQUssQ0FBQyw0REFBNEQsRUFBRSxHQUFHLEVBQUU7SUFDeEUsSUFBSSxPQUE0QyxDQUFDO0lBQ2pELElBQUksYUFBNEMsQ0FBQztJQUNqRCxJQUFJLGNBQW1CLENBQUM7SUFFeEIsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNuQixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGFBQWEsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzlCLGNBQWMsR0FBRztZQUNoQixnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO1lBQ2pDLGFBQWEsRUFBRSxhQUFhLENBQUMsS0FB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