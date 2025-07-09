/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as path from '../../../../../base/common/path.js';
import * as platform from '../../../../../base/common/platform.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { Engine as FileSearchEngine, FileWalker } from '../../node/fileSearch.js';
import { flakySuite } from '../../../../../base/test/node/testUtils.js';
import { FileAccess } from '../../../../../base/common/network.js';
const TEST_FIXTURES = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath);
const EXAMPLES_FIXTURES = URI.file(path.join(TEST_FIXTURES, 'examples'));
const MORE_FIXTURES = URI.file(path.join(TEST_FIXTURES, 'more'));
const TEST_ROOT_FOLDER = { folder: URI.file(TEST_FIXTURES) };
const ROOT_FOLDER_QUERY = [
    TEST_ROOT_FOLDER
];
const ROOT_FOLDER_QUERY_36438 = [
    { folder: URI.file(path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures2/36438').fsPath)) }
];
const MULTIROOT_QUERIES = [
    { folder: EXAMPLES_FIXTURES },
    { folder: MORE_FIXTURES }
];
flakySuite('FileSearchEngine', () => {
    test('Files: *.js', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.js'
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 4);
            done();
        });
    });
    test('Files: maxResults', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            maxResults: 1
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: maxResults without Ripgrep', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            maxResults: 1,
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: exists', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: { '**/file.txt': true },
            exists: true
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(complete.limitHit);
            done();
        });
    });
    test('Files: not exists', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: { '**/nofile.txt': true },
            exists: true
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(!complete.limitHit);
            done();
        });
    });
    test('Files: exists without Ripgrep', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: { '**/file.txt': true },
            exists: true,
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(complete.limitHit);
            done();
        });
    });
    test('Files: not exists without Ripgrep', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: { '**/nofile.txt': true },
            exists: true,
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(!complete.limitHit);
            done();
        });
    });
    test('Files: examples/com*', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: path.join('examples', 'com*')
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: examples (fuzzy)', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'xl'
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 7);
            done();
        });
    });
    test('Files: multiroot', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            filePattern: 'file'
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 3);
            done();
        });
    });
    test('Files: multiroot with includePattern and maxResults', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            maxResults: 1,
            includePattern: {
                '*.txt': true,
                '*.js': true
            },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: multiroot with includePattern and exists', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            exists: true,
            includePattern: {
                '*.txt': true,
                '*.js': true
            },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(complete.limitHit);
            done();
        });
    });
    test('Files: NPE (CamelCase)', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'NullPE'
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: *.*', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*'
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 14);
            done();
        });
    });
    test('Files: *.as', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.as'
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            done();
        });
    });
    test('Files: *.* without derived', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'site.*',
            excludePattern: { '**/*.css': { 'when': '$(basename).less' } }
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), 'site.less');
            done();
        });
    });
    test('Files: *.* exclude folder without wildcard', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            excludePattern: { 'examples': true }
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 8);
            done();
        });
    });
    test('Files: exclude folder without wildcard #36438', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY_36438,
            excludePattern: { 'modules': true }
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: include folder without wildcard #36438', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY_36438,
            includePattern: { 'modules/**': true }
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: *.* exclude folder with leading wildcard', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            excludePattern: { '**/examples': true }
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 8);
            done();
        });
    });
    test('Files: *.* exclude folder with trailing wildcard', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            excludePattern: { 'examples/**': true }
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 8);
            done();
        });
    });
    test('Files: *.* exclude with unicode', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            excludePattern: { '**/üm laut汉语': true }
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 13);
            done();
        });
    });
    test('Files: *.* include with unicode', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            includePattern: { '**/üm laut汉语/*': true }
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: multiroot with exclude', function (done) {
        const folderQueries = [
            {
                folder: EXAMPLES_FIXTURES,
                excludePattern: [{
                        pattern: { '**/anotherfile.txt': true }
                    }]
            },
            {
                folder: MORE_FIXTURES,
                excludePattern: [{
                        pattern: {
                            '**/file.txt': true
                        }
                    }]
            }
        ];
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries,
            filePattern: '*'
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 5);
            done();
        });
    });
    test('Files: Unicode and Spaces', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '汉语'
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), '汉语.txt');
            done();
        });
    });
    test('Files: no results', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'nofilematch'
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            done();
        });
    });
    test('Files: relative path matched once', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: path.normalize(path.join('examples', 'company.js'))
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), 'company.js');
            done();
        });
    });
    test('Files: Include pattern, single files', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: {
                'site.css': true,
                'examples/company.js': true,
                'examples/subfolder/subfile.txt': true
            }
        });
        const res = [];
        engine.search((result) => {
            res.push(result);
        }, () => { }, (error) => {
            assert.ok(!error);
            const basenames = res.map(r => path.basename(r.relativePath));
            assert.ok(basenames.indexOf('site.css') !== -1, `site.css missing in ${JSON.stringify(basenames)}`);
            assert.ok(basenames.indexOf('company.js') !== -1, `company.js missing in ${JSON.stringify(basenames)}`);
            assert.ok(basenames.indexOf('subfile.txt') !== -1, `subfile.txt missing in ${JSON.stringify(basenames)}`);
            done();
        });
    });
    test('Files: extraFiles only', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: [],
            extraFileResources: [
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'site.css'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'examples', 'company.js'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'index.html')))
            ],
            filePattern: '*.js'
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), 'company.js');
            done();
        });
    });
    test('Files: extraFiles only (with include)', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: [],
            extraFileResources: [
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'site.css'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'examples', 'company.js'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'index.html')))
            ],
            filePattern: '*.*',
            includePattern: { '**/*.css': true }
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), 'site.css');
            done();
        });
    });
    test('Files: extraFiles only (with exclude)', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: [],
            extraFileResources: [
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'site.css'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'examples', 'company.js'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'index.html')))
            ],
            filePattern: '*.*',
            excludePattern: { '**/*.css': true }
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 2);
            done();
        });
    });
    test('Files: no dupes in nested folders', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: [
                { folder: EXAMPLES_FIXTURES },
                { folder: joinPath(EXAMPLES_FIXTURES, 'subfolder') }
            ],
            filePattern: 'subfile.txt'
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
});
flakySuite('FileWalker', () => {
    (platform.isWindows ? test.skip : test)('Find: exclude subfolder', function (done) {
        const file0 = './more/file.txt';
        const file1 = './examples/subfolder/subfile.txt';
        const walker = new FileWalker({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            excludePattern: { '**/something': true }
        });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            const walker = new FileWalker({
                type: 1 /* QueryType.File */,
                folderQueries: ROOT_FOLDER_QUERY,
                excludePattern: { '**/subfolder': true }
            });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: folder excludes', function (done) {
        const folderQueries = [
            {
                folder: URI.file(TEST_FIXTURES),
                excludePattern: [{
                        pattern: { '**/subfolder': true }
                    }]
            }
        ];
        const file0 = './more/file.txt';
        const file1 = './examples/subfolder/subfile.txt';
        const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries });
        const cmd1 = walker.spawnFindCmd(folderQueries[0]);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert(outputContains(stdout1, file0), stdout1);
            assert(!outputContains(stdout1, file1), stdout1);
            done();
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude multiple folders', function (done) {
        const file0 = './index.html';
        const file1 = './examples/small.js';
        const file2 = './more/file.txt';
        const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries: ROOT_FOLDER_QUERY, excludePattern: { '**/something': true } });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file2), -1, stdout1);
            const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries: ROOT_FOLDER_QUERY, excludePattern: { '{**/examples,**/more}': true } });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                assert.strictEqual(stdout2.split('\n').indexOf(file2), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude folder path suffix', function (done) {
        const file0 = './examples/company.js';
        const file1 = './examples/subfolder/subfile.txt';
        const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries: ROOT_FOLDER_QUERY, excludePattern: { '**/examples/something': true } });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries: ROOT_FOLDER_QUERY, excludePattern: { '**/examples/subfolder': true } });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude subfolder path suffix', function (done) {
        const file0 = './examples/subfolder/subfile.txt';
        const file1 = './examples/subfolder/anotherfolder/anotherfile.txt';
        const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries: ROOT_FOLDER_QUERY, excludePattern: { '**/subfolder/something': true } });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries: ROOT_FOLDER_QUERY, excludePattern: { '**/subfolder/anotherfolder': true } });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude folder path', function (done) {
        const file0 = './examples/company.js';
        const file1 = './examples/subfolder/subfile.txt';
        const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries: ROOT_FOLDER_QUERY, excludePattern: { 'examples/something': true } });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries: ROOT_FOLDER_QUERY, excludePattern: { 'examples/subfolder': true } });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude combination of paths', function (done) {
        const filesIn = [
            './examples/subfolder/subfile.txt',
            './examples/company.js',
            './index.html'
        ];
        const filesOut = [
            './examples/subfolder/anotherfolder/anotherfile.txt',
            './more/file.txt'
        ];
        const walker = new FileWalker({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            excludePattern: {
                '**/subfolder/anotherfolder': true,
                '**/something/else': true,
                '**/more': true,
                '**/andmore': true
            }
        });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            for (const fileIn of filesIn) {
                assert.notStrictEqual(stdout1.split('\n').indexOf(fileIn), -1, stdout1);
            }
            for (const fileOut of filesOut) {
                assert.strictEqual(stdout1.split('\n').indexOf(fileOut), -1, stdout1);
            }
            done();
        });
    });
    function outputContains(stdout, ...files) {
        const lines = stdout.split('\n');
        return files.every(file => lines.indexOf(file) >= 0);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3Qvbm9kZS9zZWFyY2guaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxRQUFRLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsTUFBTSxJQUFJLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFbkUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLGlEQUFpRCxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDckgsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDekUsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLE1BQU0sZ0JBQWdCLEdBQWlCLEVBQUUsTUFBTSxF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