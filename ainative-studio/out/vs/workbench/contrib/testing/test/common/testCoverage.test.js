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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy90ZXN0L2NvbW1vbi90ZXN0Q292ZXJhZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFnQixhQUFhLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JFLE9BQU8sRUFBcUIsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFJL0UsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsSUFBSSxPQUFxQixDQUFDO0lBQzFCLElBQUksZ0JBQW1DLENBQUM7SUFDeEMsSUFBSSxZQUEwQixDQUFDO0lBRS9CLE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFckQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE9BQU8sR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUMxQixnQkFBZ0IsR0FBRztZQUNsQixrQkFBa0IsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztTQUMvQyxDQUFDO1FBQ0YsWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLEVBQW9CLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLEVB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