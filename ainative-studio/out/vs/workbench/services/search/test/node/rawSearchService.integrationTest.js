/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { Emitter } from '../../../../../base/common/event.js';
import { FileAccess } from '../../../../../base/common/network.js';
import * as path from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { flakySuite } from '../../../../../base/test/node/testUtils.js';
import { isSerializedSearchComplete, isSerializedSearchSuccess } from '../../common/search.js';
import { SearchService as RawSearchService } from '../../node/rawSearchService.js';
const TEST_FOLDER_QUERIES = [
    { folder: URI.file(path.normalize('/some/where')) }
];
const TEST_FIXTURES = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath);
const MULTIROOT_QUERIES = [
    { folder: URI.file(path.join(TEST_FIXTURES, 'examples')) },
    { folder: URI.file(path.join(TEST_FIXTURES, 'more')) }
];
const stats = {
    fileWalkTime: 0,
    cmdTime: 1,
    directoriesWalked: 2,
    filesWalked: 3
};
class TestSearchEngine {
    constructor(result, config) {
        this.result = result;
        this.config = config;
        this.isCanceled = false;
        TestSearchEngine.last = this;
    }
    search(onResult, onProgress, done) {
        const self = this;
        (function next() {
            process.nextTick(() => {
                if (self.isCanceled) {
                    done(null, {
                        limitHit: false,
                        stats: stats,
                        messages: [],
                    });
                    return;
                }
                const result = self.result();
                if (!result) {
                    done(null, {
                        limitHit: false,
                        stats: stats,
                        messages: [],
                    });
                }
                else {
                    onResult(result);
                    next();
                }
            });
        })();
    }
    cancel() {
        this.isCanceled = true;
    }
}
flakySuite('RawSearchService', () => {
    const rawSearch = {
        type: 1 /* QueryType.File */,
        folderQueries: TEST_FOLDER_QUERIES,
        filePattern: 'a'
    };
    const rawMatch = {
        base: path.normalize('/some'),
        relativePath: 'where',
        searchPath: undefined
    };
    const match = {
        path: path.normalize('/some/where')
    };
    test('Individual results', async function () {
        let i = 5;
        const Engine = TestSearchEngine.bind(null, () => i-- ? rawMatch : null);
        const service = new RawSearchService();
        let results = 0;
        const cb = value => {
            if (!!value.message) {
                return;
            }
            if (!Array.isArray(value)) {
                assert.deepStrictEqual(value, match);
                results++;
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        await service.doFileSearchWithEngine(Engine, rawSearch, cb, null, 0);
        return assert.strictEqual(results, 5);
    });
    test('Batch results', async function () {
        let i = 25;
        const Engine = TestSearchEngine.bind(null, () => i-- ? rawMatch : null);
        const service = new RawSearchService();
        const results = [];
        const cb = value => {
            if (!!value.message) {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach(m => {
                    assert.deepStrictEqual(m, match);
                });
                results.push(value.length);
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        await service.doFileSearchWithEngine(Engine, rawSearch, cb, undefined, 10);
        assert.deepStrictEqual(results, [10, 10, 5]);
    });
    test('Collect batched results', async function () {
        const uriPath = '/some/where';
        let i = 25;
        const Engine = TestSearchEngine.bind(null, () => i-- ? rawMatch : null);
        const service = new RawSearchService();
        function fileSearch(config, batchSize) {
            let promise;
            const emitter = new Emitter({
                onWillAddFirstListener: () => {
                    promise = createCancelablePromise(token => service.doFileSearchWithEngine(Engine, config, p => emitter.fire(p), token, batchSize)
                        .then(c => emitter.fire(c), err => emitter.fire({ type: 'error', error: err })));
                },
                onDidRemoveLastListener: () => {
                    promise.cancel();
                }
            });
            return emitter.event;
        }
        const result = await collectResultsFromEvent(fileSearch(rawSearch, 10));
        result.files.forEach(f => {
            assert.strictEqual(f.path.replace(/\\/g, '/'), uriPath);
        });
        assert.strictEqual(result.files.length, 25, 'Result');
    });
    test('Multi-root with include pattern and maxResults', async function () {
        const service = new RawSearchService();
        const query = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            maxResults: 1,
            includePattern: {
                '*.txt': true,
                '*.js': true
            },
        };
        const result = await collectResultsFromEvent(service.fileSearch(query));
        assert.strictEqual(result.files.length, 1, 'Result');
    });
    test('Handles maxResults=0 correctly', async function () {
        const service = new RawSearchService();
        const query = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            maxResults: 0,
            sortByScore: true,
            includePattern: {
                '*.txt': true,
                '*.js': true
            },
        };
        const result = await collectResultsFromEvent(service.fileSearch(query));
        assert.strictEqual(result.files.length, 0, 'Result');
    });
    test('Multi-root with include pattern and exists', async function () {
        const service = new RawSearchService();
        const query = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            exists: true,
            includePattern: {
                '*.txt': true,
                '*.js': true
            },
        };
        const result = await collectResultsFromEvent(service.fileSearch(query));
        assert.strictEqual(result.files.length, 0, 'Result');
        assert.ok(result.limitHit);
    });
    test('Sorted results', async function () {
        const paths = ['bab', 'bbc', 'abb'];
        const matches = paths.map(relativePath => ({
            base: path.normalize('/some/where'),
            relativePath,
            basename: relativePath,
            size: 3,
            searchPath: undefined
        }));
        const Engine = TestSearchEngine.bind(null, () => matches.shift());
        const service = new RawSearchService();
        const results = [];
        const cb = value => {
            if (!!value.message) {
                return;
            }
            if (Array.isArray(value)) {
                results.push(...value.map(v => v.path));
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        await service.doFileSearchWithEngine(Engine, {
            type: 1 /* QueryType.File */,
            folderQueries: TEST_FOLDER_QUERIES,
            filePattern: 'bb',
            sortByScore: true,
            maxResults: 2
        }, cb, undefined, 1);
        assert.notStrictEqual(typeof TestSearchEngine.last.config.maxResults, 'number');
        assert.deepStrictEqual(results, [path.normalize('/some/where/bbc'), path.normalize('/some/where/bab')]);
    });
    test('Sorted result batches', async function () {
        let i = 25;
        const Engine = TestSearchEngine.bind(null, () => i-- ? rawMatch : null);
        const service = new RawSearchService();
        const results = [];
        const cb = value => {
            if (!!value.message) {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach(m => {
                    assert.deepStrictEqual(m, match);
                });
                results.push(value.length);
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        await service.doFileSearchWithEngine(Engine, {
            type: 1 /* QueryType.File */,
            folderQueries: TEST_FOLDER_QUERIES,
            filePattern: 'a',
            sortByScore: true,
            maxResults: 23
        }, cb, undefined, 10);
        assert.deepStrictEqual(results, [10, 10, 3]);
    });
    test('Cached results', function () {
        const paths = ['bcb', 'bbc', 'aab'];
        const matches = paths.map(relativePath => ({
            base: path.normalize('/some/where'),
            relativePath,
            basename: relativePath,
            size: 3,
            searchPath: undefined
        }));
        const Engine = TestSearchEngine.bind(null, () => matches.shift());
        const service = new RawSearchService();
        const results = [];
        const cb = value => {
            if (!!value.message) {
                return;
            }
            if (Array.isArray(value)) {
                results.push(...value.map(v => v.path));
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        return service.doFileSearchWithEngine(Engine, {
            type: 1 /* QueryType.File */,
            folderQueries: TEST_FOLDER_QUERIES,
            filePattern: 'b',
            sortByScore: true,
            cacheKey: 'x'
        }, cb, undefined, -1).then(complete => {
            assert.strictEqual(complete.stats.fromCache, false);
            assert.deepStrictEqual(results, [path.normalize('/some/where/bcb'), path.normalize('/some/where/bbc'), path.normalize('/some/where/aab')]);
        }).then(async () => {
            const results = [];
            const cb = value => {
                if (Array.isArray(value)) {
                    results.push(...value.map(v => v.path));
                }
                else {
                    assert.fail(JSON.stringify(value));
                }
            };
            try {
                const complete = await service.doFileSearchWithEngine(Engine, {
                    type: 1 /* QueryType.File */,
                    folderQueries: TEST_FOLDER_QUERIES,
                    filePattern: 'bc',
                    sortByScore: true,
                    cacheKey: 'x'
                }, cb, undefined, -1);
                assert.ok(complete.stats.fromCache);
                assert.deepStrictEqual(results, [path.normalize('/some/where/bcb'), path.normalize('/some/where/bbc')]);
            }
            catch (e) { }
        }).then(() => {
            return service.clearCache('x');
        }).then(async () => {
            matches.push({
                base: path.normalize('/some/where'),
                relativePath: 'bc',
                searchPath: undefined
            });
            const results = [];
            const cb = value => {
                if (!!value.message) {
                    return;
                }
                if (Array.isArray(value)) {
                    results.push(...value.map(v => v.path));
                }
                else {
                    assert.fail(JSON.stringify(value));
                }
            };
            const complete = await service.doFileSearchWithEngine(Engine, {
                type: 1 /* QueryType.File */,
                folderQueries: TEST_FOLDER_QUERIES,
                filePattern: 'bc',
                sortByScore: true,
                cacheKey: 'x'
            }, cb, undefined, -1);
            assert.strictEqual(complete.stats.fromCache, false);
            assert.deepStrictEqual(results, [path.normalize('/some/where/bc')]);
        });
    });
});
function collectResultsFromEvent(event) {
    const files = [];
    let listener;
    return new Promise((c, e) => {
        listener = event(ev => {
            if (isSerializedSearchComplete(ev)) {
                if (isSerializedSearchSuccess(ev)) {
                    c({ files, limitHit: ev.limitHit });
                }
                else {
                    e(ev.error);
                }
                listener.dispose();
            }
            else if (Array.isArray(ev)) {
                files.push(...ev);
            }
            else if (ev.path) {
                files.push(ev);
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3U2VhcmNoU2VydmljZS5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L25vZGUvcmF3U2VhcmNoU2VydmljZS5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFFckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQWtQLDBCQUEwQixFQUFFLHlCQUF5QixFQUFhLE1BQU0sd0JBQXdCLENBQUM7QUFDMVYsT0FBTyxFQUFxQixhQUFhLElBQUksZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV0RyxNQUFNLG1CQUFtQixHQUFHO0lBQzNCLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFO0NBQ25ELENBQUM7QUFFRixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsaURBQWlELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNySCxNQUFNLGlCQUFpQixHQUFtQjtJQUN6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