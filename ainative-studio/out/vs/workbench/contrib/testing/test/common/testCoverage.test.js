/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createSandbox } from 'sinon';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { onObservableChange } from '../../common/observableUtils.js';
import { TestCoverage } from '../../common/testCoverage.js';
suite('TestCoverage', () => {
    let sandbox;
    let coverageAccessor;
    let testCoverage;
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        sandbox = createSandbox();
        coverageAccessor = {
            getCoverageDetails: sandbox.stub().resolves([]),
        };
        testCoverage = new TestCoverage({}, 'taskId', { extUri: { ignorePathCasing: () => true } }, coverageAccessor);
    });
    teardown(() => {
        sandbox.restore();
    });
    function addTests() {
        const raw1 = {
            id: '1',
            uri: URI.file('/path/to/file'),
            statement: { covered: 10, total: 20 },
            branch: { covered: 5, total: 10 },
            declaration: { covered: 2, total: 5 },
        };
        testCoverage.append(raw1, undefined);
        const raw2 = {
            id: '1',
            uri: URI.file('/path/to/file2'),
            statement: { covered: 5, total: 10 },
            branch: { covered: 1, total: 5 },
        };
        testCoverage.append(raw2, undefined);
        return { raw1, raw2 };
    }
    test('should look up file coverage', async () => {
        const { raw1 } = addTests();
        const fileCoverage = testCoverage.getUri(raw1.uri);
        assert.equal(fileCoverage?.id, raw1.id);
        assert.deepEqual(fileCoverage?.statement, raw1.statement);
        assert.deepEqual(fileCoverage?.branch, raw1.branch);
        assert.deepEqual(fileCoverage?.declaration, raw1.declaration);
        assert.strictEqual(testCoverage.getComputedForUri(raw1.uri), testCoverage.getUri(raw1.uri));
        assert.strictEqual(testCoverage.getComputedForUri(URI.file('/path/to/x')), undefined);
        assert.strictEqual(testCoverage.getUri(URI.file('/path/to/x')), undefined);
    });
    test('should compute coverage for directories', async () => {
        const { raw1 } = addTests();
        const dirCoverage = testCoverage.getComputedForUri(URI.file('/path/to'));
        assert.deepEqual(dirCoverage?.statement, { covered: 15, total: 30 });
        assert.deepEqual(dirCoverage?.branch, { covered: 6, total: 15 });
        assert.deepEqual(dirCoverage?.declaration, raw1.declaration);
    });
    test('should incrementally diff updates to existing files', async () => {
        addTests();
        const raw3 = {
            id: '1',
            uri: URI.file('/path/to/file'),
            statement: { covered: 12, total: 24 },
            branch: { covered: 7, total: 10 },
            declaration: { covered: 2, total: 5 },
        };
        testCoverage.append(raw3, undefined);
        const fileCoverage = testCoverage.getUri(raw3.uri);
        assert.deepEqual(fileCoverage?.statement, raw3.statement);
        assert.deepEqual(fileCoverage?.branch, raw3.branch);
        assert.deepEqual(fileCoverage?.declaration, raw3.declaration);
        const dirCoverage = testCoverage.getComputedForUri(URI.file('/path/to'));
        assert.deepEqual(dirCoverage?.statement, { covered: 17, total: 34 });
        assert.deepEqual(dirCoverage?.branch, { covered: 8, total: 15 });
        assert.deepEqual(dirCoverage?.declaration, raw3.declaration);
    });
    test('should emit changes', async () => {
        const changes = [];
        ds.add(onObservableChange(testCoverage.didAddCoverage, value => changes.push(value.map(v => v.value.uri.toString()))));
        addTests();
        assert.deepStrictEqual(changes, [
            [
                "file:///",
                "file:///",
                "file:///",
                "file:///path",
                "file:///path/to",
                "file:///path/to/file",
            ],
            [
                "file:///",
                "file:///",
                "file:///",
                "file:///path",
                "file:///path/to",
                "file:///path/to/file2",
            ],
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvY29tbW9uL3Rlc3RDb3ZlcmFnZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQWdCLGFBQWEsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUNwRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckUsT0FBTyxFQUFxQixZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUkvRSxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQixJQUFJLE9BQXFCLENBQUM7SUFDMUIsSUFBSSxnQkFBbUMsQ0FBQztJQUN4QyxJQUFJLFlBQTBCLENBQUM7SUFFL0IsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUVyRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxHQUFHLGFBQWEsRUFBRSxDQUFDO1FBQzFCLGdCQUFnQixHQUFHO1lBQ2xCLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1NBQy9DLENBQUM7UUFDRixZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsRUFBb0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFB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