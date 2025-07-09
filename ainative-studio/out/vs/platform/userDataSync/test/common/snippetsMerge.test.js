/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { merge } from '../../common/snippetsMerge.js';
const tsSnippet1 = `{

	// Place your snippets for TypeScript here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted. Possible variables are:
	// $1, $2 for tab stops, $0 for the final cursor position, Placeholders with the
	// same ids are connected.
	"Print to console": {
	// Example:
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console",
	}

}`;
const tsSnippet2 = `{

	// Place your snippets for TypeScript here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted. Possible variables are:
	// $1, $2 for tab stops, $0 for the final cursor position, Placeholders with the
	// same ids are connected.
	"Print to console": {
	// Example:
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console always",
	}

}`;
const htmlSnippet1 = `{
/*
	// Place your snippets for HTML here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted.
	// Example:
	"Print to console": {
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console"
	}
*/
"Div": {
	"prefix": "div",
		"body": [
			"<div>",
			"",
			"</div>"
		],
			"description": "New div"
	}
}`;
const htmlSnippet2 = `{
/*
	// Place your snippets for HTML here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted.
	// Example:
	"Print to console": {
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console"
	}
*/
"Div": {
	"prefix": "div",
		"body": [
			"<div>",
			"",
			"</div>"
		],
			"description": "New div changed"
	}
}`;
const cSnippet = `{
	// Place your snippets for c here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted. Possible variables are:
	// $1, $2 for tab stops, $0 for the final cursor position.Placeholders with the
	// same ids are connected.
	// Example:
	"Print to console": {
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console"
	}
}`;
suite('SnippetsMerge', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('merge when local and remote are same with one snippet', async () => {
        const local = { 'html.json': htmlSnippet1 };
        const remote = { 'html.json': htmlSnippet1 };
        const actual = merge(local, remote, null);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when local and remote are same with multiple entries', async () => {
        const local = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, null);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when local and remote are same with multiple entries in different order', async () => {
        const local = { 'typescript.json': tsSnippet1, 'html.json': htmlSnippet1 };
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, null);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when local and remote are same with different base content', async () => {
        const local = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const base = { 'html.json': htmlSnippet2, 'typescript.json': tsSnippet2 };
        const actual = merge(local, remote, base);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when a new entry is added to remote', async () => {
        const local = { 'html.json': htmlSnippet1 };
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, null);
        assert.deepStrictEqual(actual.local.added, { 'typescript.json': tsSnippet1 });
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when multiple new entries are added to remote', async () => {
        const local = {};
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, null);
        assert.deepStrictEqual(actual.local.added, remote);
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when new entry is added to remote from base and local has not changed', async () => {
        const local = { 'html.json': htmlSnippet1 };
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, local);
        assert.deepStrictEqual(actual.local.added, { 'typescript.json': tsSnippet1 });
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when an entry is removed from remote from base and local has not changed', async () => {
        const local = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const remote = { 'html.json': htmlSnippet1 };
        const actual = merge(local, remote, local);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, ['typescript.json']);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when all entries are removed from base and local has not changed', async () => {
        const local = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const remote = {};
        const actual = merge(local, remote, local);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, ['html.json', 'typescript.json']);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when an entry is updated in remote from base and local has not changed', async () => {
        const local = { 'html.json': htmlSnippet1 };
        const remote = { 'html.json': htmlSnippet2 };
        const actual = merge(local, remote, local);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, { 'html.json': htmlSnippet2 });
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when remote has moved forwarded with multiple changes and local stays with base', async () => {
        const local = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const remote = { 'html.json': htmlSnippet2, 'c.json': cSnippet };
        const actual = merge(local, remote, local);
        assert.deepStrictEqual(actual.local.added, { 'c.json': cSnippet });
        assert.deepStrictEqual(actual.local.updated, { 'html.json': htmlSnippet2 });
        assert.deepStrictEqual(actual.local.removed, ['typescript.json']);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when a new entries are added to local', async () => {
        const local = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1, 'c.json': cSnippet };
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, null);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, { 'c.json': cSnippet });
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when multiple new entries are added to local from base and remote is not changed', async () => {
        const local = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1, 'c.json': cSnippet };
        const remote = { 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, remote);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, { 'html.json': htmlSnippet1, 'c.json': cSnippet });
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when an entry is removed from local from base and remote has not changed', async () => {
        const local = { 'html.json': htmlSnippet1 };
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, remote);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, ['typescript.json']);
    });
    test('merge when an entry is updated in local from base and remote has not changed', async () => {
        const local = { 'html.json': htmlSnippet2, 'typescript.json': tsSnippet1 };
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, remote);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, { 'html.json': htmlSnippet2 });
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when local has moved forwarded with multiple changes and remote stays with base', async () => {
        const local = { 'html.json': htmlSnippet2, 'c.json': cSnippet };
        const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, remote);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, { 'c.json': cSnippet });
        assert.deepStrictEqual(actual.remote.updated, { 'html.json': htmlSnippet2 });
        assert.deepStrictEqual(actual.remote.removed, ['typescript.json']);
    });
    test('merge when local and remote with one entry but different value', async () => {
        const local = { 'html.json': htmlSnippet1 };
        const remote = { 'html.json': htmlSnippet2 };
        const actual = merge(local, remote, null);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, ['html.json']);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when the entry is removed in remote but updated in local and a new entry is added in remote', async () => {
        const base = { 'html.json': htmlSnippet1 };
        const local = { 'html.json': htmlSnippet2 };
        const remote = { 'typescript.json': tsSnippet1 };
        const actual = merge(local, remote, base);
        assert.deepStrictEqual(actual.local.added, { 'typescript.json': tsSnippet1 });
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, ['html.json']);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge with single entry and local is empty', async () => {
        const base = { 'html.json': htmlSnippet1 };
        const local = {};
        const remote = { 'html.json': htmlSnippet2 };
        const actual = merge(local, remote, base);
        assert.deepStrictEqual(actual.local.added, { 'html.json': htmlSnippet2 });
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, []);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when local and remote has moved forwareded with conflicts', async () => {
        const base = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const local = { 'html.json': htmlSnippet2, 'c.json': cSnippet };
        const remote = { 'typescript.json': tsSnippet2 };
        const actual = merge(local, remote, base);
        assert.deepStrictEqual(actual.local.added, { 'typescript.json': tsSnippet2 });
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, ['html.json']);
        assert.deepStrictEqual(actual.remote.added, { 'c.json': cSnippet });
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
    test('merge when local and remote has moved forwareded with multiple conflicts', async () => {
        const base = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
        const local = { 'html.json': htmlSnippet2, 'typescript.json': tsSnippet2, 'c.json': cSnippet };
        const remote = { 'c.json': cSnippet };
        const actual = merge(local, remote, base);
        assert.deepStrictEqual(actual.local.added, {});
        assert.deepStrictEqual(actual.local.updated, {});
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.conflicts, ['html.json', 'typescript.json']);
        assert.deepStrictEqual(actual.remote.added, {});
        assert.deepStrictEqual(actual.remote.updated, {});
        assert.deepStrictEqual(actual.remote.removed, []);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNNZXJnZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9zbmlwcGV0c01lcmdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxNQUFNLFVBQVUsR0FBRzs7Ozs7Ozs7Ozs7Ozs7OztFQWdCakIsQ0FBQztBQUVILE1BQU0sVUFBVSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7O0VBZ0JqQixDQUFDO0FBRUgsTUFBTSxZQUFZLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBdUJuQixDQUFDO0FBRUgsTUFBTSxZQUFZLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBdUJuQixDQUFDO0FBRUgsTUFBTSxRQUFRLEdBQUc7Ozs7Ozs7Ozs7Ozs7O0VBY2YsQ0FBQztBQUVILEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hFLE1BQU0sS0FBSyxHQUFHLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxDQUFDO1FBQzVDLE1BQU0sTUFBTSxHQUFHLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxDQUFDO1FBRTdDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxD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