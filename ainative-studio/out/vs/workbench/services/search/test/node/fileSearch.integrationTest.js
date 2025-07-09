/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileAccess } from '../../../../../base/common/network.js';
import * as path from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { flakySuite } from '../../../../../base/test/node/testUtils.js';
import { isProgressMessage } from '../../common/search.js';
import { SearchService } from '../../node/rawSearchService.js';
const TEST_FIXTURES = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath);
const TEST_FIXTURES2 = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures2').fsPath);
const EXAMPLES_FIXTURES = path.join(TEST_FIXTURES, 'examples');
const MORE_FIXTURES = path.join(TEST_FIXTURES, 'more');
const TEST_ROOT_FOLDER = { folder: URI.file(TEST_FIXTURES) };
const ROOT_FOLDER_QUERY = [
    TEST_ROOT_FOLDER
];
const MULTIROOT_QUERIES = [
    { folder: URI.file(EXAMPLES_FIXTURES), folderName: 'examples_folder' },
    { folder: URI.file(MORE_FIXTURES) }
];
const numThreads = undefined;
async function doSearchTest(query, expectedResultCount) {
    const svc = new SearchService();
    const results = [];
    await svc.doFileSearch(query, numThreads, e => {
        if (!isProgressMessage(e)) {
            if (Array.isArray(e)) {
                results.push(...e);
            }
            else {
                results.push(e);
            }
        }
    });
    assert.strictEqual(results.length, expectedResultCount, `rg ${results.length} !== ${expectedResultCount}`);
}
flakySuite('FileSearch-integration', function () {
    test('File - simple', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY
        };
        return doSearchTest(config, 14);
    });
    test('File - filepattern', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'anotherfile'
        };
        return doSearchTest(config, 1);
    });
    test('File - exclude', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'file',
            excludePattern: { '**/anotherfolder/**': true }
        };
        return doSearchTest(config, 2);
    });
    test('File - multiroot', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            filePattern: 'file',
            excludePattern: { '**/anotherfolder/**': true }
        };
        return doSearchTest(config, 2);
    });
    test('File - multiroot with folder name', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            filePattern: 'examples_folder anotherfile'
        };
        return doSearchTest(config, 1);
    });
    test('File - multiroot with folder name and sibling exclude', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: [
                { folder: URI.file(TEST_FIXTURES), folderName: 'folder1' },
                { folder: URI.file(TEST_FIXTURES2) }
            ],
            filePattern: 'folder1 site',
            excludePattern: { '*.css': { when: '$(basename).less' } }
        };
        return doSearchTest(config, 1);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlYXJjaC5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L25vZGUvZmlsZVNlYXJjaC5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUEyRCxpQkFBaUIsRUFBYSxNQUFNLHdCQUF3QixDQUFDO0FBQy9ILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUvRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsaURBQWlELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNySCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsa0RBQWtELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN2SCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQy9ELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZELE1BQU0sZ0JBQWdCLEdBQWlCLEVBQUUsTUFBTSxFQUFFLEdB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