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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFtZVByb2plY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvYnJvd3Nlci9leHBsb3JlclByb2plY3Rpb25zL25hbWVQcm9qZWN0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDeEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBR25ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV6RCxLQUFLLENBQUMsNERBQTRELEVBQUUsR0FBRyxFQUFFO0lBQ3hFLElBQUksT0FBNEMsQ0FBQztJQUNqRCxJQUFJLGFBQTRDLENBQUM7SUFDakQsSUFBSSxjQUFtQixDQUFDO0lBRXhCLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixhQUFhLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM5QixjQUFjLEdBQUc7WUFDaEIsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztZQUNqQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEtB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