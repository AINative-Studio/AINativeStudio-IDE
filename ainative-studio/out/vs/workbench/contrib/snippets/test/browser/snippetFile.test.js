/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { SnippetFile, Snippet } from '../../browser/snippetsFile.js';
import { URI } from '../../../../../base/common/uri.js';
import { SnippetParser } from '../../../../../editor/contrib/snippet/browser/snippetParser.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Snippets', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    class TestSnippetFile extends SnippetFile {
        constructor(filepath, snippets) {
            super(3 /* SnippetSource.Extension */, filepath, undefined, undefined, undefined, undefined);
            this.data.push(...snippets);
        }
    }
    test('SnippetFile#select', () => {
        let file = new TestSnippetFile(URI.file('somepath/foo.code-snippets'), []);
        let bucket = [];
        file.select('', bucket);
        assert.strictEqual(bucket.length, 0);
        file = new TestSnippetFile(URI.file('somepath/foo.code-snippets'), [
            new Snippet(false, ['foo'], 'FooSnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['foo'], 'FooSnippet2', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['bar'], 'BarSnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['bar.comment'], 'BarSnippet2', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['bar.strings'], 'BarSnippet2', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['bazz', 'bazz'], 'BazzSnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        bucket = [];
        file.select('foo', bucket);
        assert.strictEqual(bucket.length, 2);
        bucket = [];
        file.select('fo', bucket);
        assert.strictEqual(bucket.length, 0);
        bucket = [];
        file.select('bar', bucket);
        assert.strictEqual(bucket.length, 1);
        bucket = [];
        file.select('bar.comment', bucket);
        assert.strictEqual(bucket.length, 2);
        bucket = [];
        file.select('bazz', bucket);
        assert.strictEqual(bucket.length, 1);
    });
    test('SnippetFile#select - any scope', function () {
        const file = new TestSnippetFile(URI.file('somepath/foo.code-snippets'), [
            new Snippet(false, [], 'AnySnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['foo'], 'FooSnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const bucket = [];
        file.select('foo', bucket);
        assert.strictEqual(bucket.length, 2);
    });
    test('Snippet#needsClipboard', function () {
        function assertNeedsClipboard(body, expected) {
            const snippet = new Snippet(false, ['foo'], 'FooSnippet1', 'foo', '', body, 'test', 1 /* SnippetSource.User */, generateUuid());
            assert.strictEqual(snippet.needsClipboard, expected);
            assert.strictEqual(SnippetParser.guessNeedsClipboard(body), expected);
        }
        assertNeedsClipboard('foo$CLIPBOARD', true);
        assertNeedsClipboard('${CLIPBOARD}', true);
        assertNeedsClipboard('foo${CLIPBOARD}bar', true);
        assertNeedsClipboard('foo$clipboard', false);
        assertNeedsClipboard('foo${clipboard}', false);
        assertNeedsClipboard('baba', false);
    });
    test('Snippet#isTrivial', function () {
        function assertIsTrivial(body, expected) {
            const snippet = new Snippet(false, ['foo'], 'FooSnippet1', 'foo', '', body, 'test', 1 /* SnippetSource.User */, generateUuid());
            assert.strictEqual(snippet.isTrivial, expected);
        }
        assertIsTrivial('foo', true);
        assertIsTrivial('foo$0', true);
        assertIsTrivial('foo$0bar', false);
        assertIsTrivial('foo$1', false);
        assertIsTrivial('foo$1$0', false);
        assertIsTrivial('${1:foo}', false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldEZpbGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy90ZXN0L2Jyb3dzZXIvc25pcHBldEZpbGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQWlCLE1BQU0sK0JBQStCLENBQUM7QUFDcEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMvRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLFVBQVUsRUFBRTtJQUVqQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sZUFBZ0IsU0FBUSxXQUFXO1FBQ3hDLFlBQVksUUFBYSxFQUFFLFFBQW1CO1lBQzdDLEtBQUssa0NBQTBCLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVUsRUFBRSxTQUFVLENBQUMsQ0FBQztZQUN2RixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO1FBQzdCLENBQUM7S0FDRDtJQUVELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLElBQUksTUFBTSxHQUFjLEVBQUUsQ0FBQztR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