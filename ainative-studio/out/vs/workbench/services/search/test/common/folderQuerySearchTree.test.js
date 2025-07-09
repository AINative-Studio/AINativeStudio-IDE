/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import assert from 'assert';
import { FolderQuerySearchTree } from '../../common/folderQuerySearchTree.js';
suite('FolderQuerySearchTree', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const fq1 = { folder: URI.parse('file:///folder1?query1#fragment1') };
    const fq2 = { folder: URI.parse('file:///folder2?query2#fragment2') };
    const fq3 = { folder: URI.parse('file:///folder3?query3#fragment3') };
    const fq4 = { folder: URI.parse('file:///folder3?query3') };
    const fq5 = { folder: URI.parse('file:///folder3') };
    const folderQueries = [
        fq1,
        fq2,
        fq3,
        fq4,
        fq5,
    ];
    const getFolderQueryInfo = (fq, i) => ({ folder: fq.folder, index: i });
    test('find query fragment aware substr correctly', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const result = tree.findQueryFragmentAwareSubstr(fq1.folder);
        const result2 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder1/foo/bar?query1#fragment1'));
        assert.deepStrictEqual(result, { folder: fq1.folder, index: 0 });
        assert.deepStrictEqual(result2, { folder: fq1.folder, index: 0 });
    });
    test('do not to URIs that do not have queries if the base has query', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const result = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder1'));
        const result2 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder1?query1'));
        assert.deepStrictEqual(result, undefined);
        assert.deepStrictEqual(result2, undefined);
    });
    test('match correct entry with query/fragment', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const result = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder3/file.txt?query3#fragment3'));
        assert.deepStrictEqual(result, { folder: fq3.folder, index: 2 });
        const result2 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder3/file.txt?query3'));
        assert.deepStrictEqual(result2, { folder: fq4.folder, index: 3 });
        const result3 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder3/file.txt'));
        assert.deepStrictEqual(result3, { folder: fq5.folder, index: 4 });
    });
    test('can find substr of non-query/fragment URIs', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const result = tree.findQueryFragmentAwareSubstr(fq5.folder);
        const result2 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder3/hello/world'));
        assert.deepStrictEqual(result, { folder: fq5.folder, index: 4 });
        assert.deepStrictEqual(result2, { folder: fq5.folder, index: 4 });
    });
    test('iterate over all folderQueryInfo correctly', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const results = [];
        tree.forEachFolderQueryInfo(info => results.push(info));
        assert.equal(results.length, 5);
        assert.deepStrictEqual(results, folderQueries.map((fq, i) => getFolderQueryInfo(fq, i)));
    });
    test('`/` as a path', () => {
        const trie = new FolderQuerySearchTree([{ folder: URI.parse('memfs:/?q=1') }], getFolderQueryInfo);
        assert.deepStrictEqual(trie.findQueryFragmentAwareSubstr(URI.parse('memfs:/file.txt?q=1')), { folder: URI.parse('memfs:/?q=1'), index: 0 });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVyUXVlcnlTZWFyY2hUcmVlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L2NvbW1vbi9mb2xkZXJRdWVyeVNlYXJjaFRyZWUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRzlFLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsdUNBQXVDLEVBQUUsQ0FBQztJQUMxQyxNQUFNLEdBQUcsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLEVBQUUsQ0FBQztJQUN0RSxNQUFNLEdBQUcsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLEVBQUUsQ0FBQztJQUN0RSxNQUFNLEdBQUcsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLEVBQUUsQ0FBQztJQUN0RSxNQUFNLEdBQUcsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztJQUM1RCxNQUFNLEdBQUcsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztJQUVyRCxNQUFNLGFBQWEsR0FBd0I7UUFDMUMsR0FB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