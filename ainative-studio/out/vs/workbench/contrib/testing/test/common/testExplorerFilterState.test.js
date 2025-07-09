/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestExplorerFilterState } from '../../common/testExplorerFilterState.js';
suite('TestExplorerFilterState', () => {
    let t;
    let ds;
    teardown(() => {
        ds.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        ds = new DisposableStore();
        t = ds.add(new TestExplorerFilterState(ds.add(new InMemoryStorageService())));
    });
    const assertFilteringFor = (expected) => {
        for (const [term, expectation] of Object.entries(expected)) {
            assert.strictEqual(t.isFilteringFor(term), expectation, `expected filtering for ${term} === ${expectation}`);
        }
    };
    const termFiltersOff = {
        ["@failed" /* TestFilterTerm.Failed */]: false,
        ["@executed" /* TestFilterTerm.Executed */]: false,
        ["@doc" /* TestFilterTerm.CurrentDoc */]: false,
        ["@hidden" /* TestFilterTerm.Hidden */]: false,
    };
    test('filters simple globs', () => {
        t.setText('hello, !world');
        assert.deepStrictEqual(t.globList, [{ text: 'hello', include: true }, { text: 'world', include: false }]);
        assert.deepStrictEqual(t.includeTags, new Set());
        assert.deepStrictEqual(t.excludeTags, new Set());
        assertFilteringFor(termFiltersOff);
    });
    test('filters to patterns', () => {
        t.setText('@doc');
        assert.deepStrictEqual(t.globList, []);
        assert.deepStrictEqual(t.includeTags, new Set());
        assert.deepStrictEqual(t.excludeTags, new Set());
        assertFilteringFor({
            ...termFiltersOff,
            ["@doc" /* TestFilterTerm.CurrentDoc */]: true,
        });
    });
    test('filters to tags', () => {
        t.setText('@hello:world !@foo:bar');
        assert.deepStrictEqual(t.globList, []);
        assert.deepStrictEqual(t.includeTags, new Set(['hello\0world']));
        assert.deepStrictEqual(t.excludeTags, new Set(['foo\0bar']));
        assertFilteringFor(termFiltersOff);
    });
    test('filters to mixed terms and tags', () => {
        t.setText('@hello:world foo, !bar @doc !@foo:bar');
        assert.deepStrictEqual(t.globList, [{ text: 'foo', include: true }, { text: 'bar', include: false }]);
        assert.deepStrictEqual(t.includeTags, new Set(['hello\0world']));
        assert.deepStrictEqual(t.excludeTags, new Set(['foo\0bar']));
        assertFilteringFor({
            ...termFiltersOff,
            ["@doc" /* TestFilterTerm.CurrentDoc */]: true,
        });
    });
    test('parses quotes', () => {
        t.setText('@hello:"world" @foo:\'bar\' baz');
        assert.deepStrictEqual(t.globList, [{ text: 'baz', include: true }]);
        assert.deepStrictEqual([...t.includeTags], ['hello\0world', 'foo\0bar']);
        assert.deepStrictEqual(t.excludeTags, new Set());
    });
    test('parses quotes with escapes', () => {
        t.setText('@hello:"world\\"1" foo');
        assert.deepStrictEqual(t.globList, [{ text: 'foo', include: true }]);
        assert.deepStrictEqual([...t.includeTags], ['hello\0world"1']);
        assert.deepStrictEqual(t.excludeTags, new Set());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4cGxvcmVyRmlsdGVyU3RhdGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvY29tbW9uL3Rlc3RFeHBsb3JlckZpbHRlclN0YXRlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsdUJBQXVCLEVBQWtCLE1BQU0seUNBQXlDLENBQUM7QUFFbEcsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxJQUFJLENBQTBCLENBQUM7SUFDL0IsSUFBSSxFQUFtQixDQUFDO0lBRXhCLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLEVBQUUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzNCLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0UsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLGtCQUFrQixHQUFHLENBQUMsUUFBNkMsRUFBRSxFQUFFO1FBQzVFLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQXNCLENBQUMsRUFBRSxXQUFXLEVBQUUsMEJBQTBCLElBQUksUUFBUSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ2hJLENBQUM7SUFDRixDQUFDLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRztRQUN0Qix1Q0FBdUIsRUFBRSxLQUFLO1FBQzlCLDJDQUF5QixFQUFFLEtBQUs7UUFDaEMsd0NBQTJCLEVBQUUsS0FBSztRQUNsQyx1Q0FBdUIsRUFBRSxLQUFLO0tBQzlCLENBQUM7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDM0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDakQsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNqRCxrQkFBa0IsQ0FBQztZQUNsQixHQUFHLGNBQWM7WUFDakIsd0NBQTJCLEVBQUUsSUFBSTtTQUNqQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDNUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdELGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxDQUFDLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdELGtCQUFrQixDQUFDO1lBQ2xCLEdBQUcsY0FBYztZQUNqQix3Q0FBMkIsRUFBRSxJQUFJO1NBQ2pDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLENBQUMsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=