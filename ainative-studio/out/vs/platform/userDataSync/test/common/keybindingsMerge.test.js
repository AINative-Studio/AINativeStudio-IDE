/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { merge } from '../../common/keybindingsMerge.js';
import { TestUserDataSyncUtilService } from './userDataSyncClient.js';
suite('KeybindingsMerge - No Conflicts', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('merge when local and remote are same with one entry', async () => {
        const localContent = stringify([{ key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const remoteContent = stringify([{ key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same with similar when contexts', async () => {
        const localContent = stringify([{ key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const remoteContent = stringify([{ key: 'alt+c', command: 'a', when: '!editorReadonly && editorTextFocus' }]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote has entries in different order', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+a', command: 'a', when: 'editorTextFocus' }
        ]);
        const remoteContent = stringify([
            { key: 'alt+a', command: 'a', when: 'editorTextFocus' },
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' }
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same with multiple entries', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } }
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } }
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same with different base content', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } }
        ]);
        const baseContent = stringify([
            { key: 'ctrl+c', command: 'e' },
            { key: 'shift+d', command: 'd', args: { text: '`' } }
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } }
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same with multiple entries in different order', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } }
        ]);
        const remoteContent = stringify([
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same when remove entry is in different order', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } }
        ]);
        const remoteContent = stringify([
            { key: 'alt+d', command: '-a' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when a new entry is added to remote', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when multiple new entries are added to remote', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'cmd+d', command: 'c' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when multiple new entries are added to remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'cmd+d', command: 'c' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when an entry is removed from remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when an entry (same command) is removed from remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when an entry is updated in remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when a command with multiple entries is updated from remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'shift+c', command: 'c' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: 'b' },
            { key: 'cmd+c', command: 'a' },
        ]);
        const remoteContent = stringify([
            { key: 'shift+c', command: 'c' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: 'b' },
            { key: 'cmd+d', command: 'a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when remote has moved forwareded with multiple changes and local stays with base', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+e', command: 'd' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+d', command: '-a' },
            { key: 'alt+f', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when a new entry is added to local', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when multiple new entries are added to local', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'cmd+d', command: 'c' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when multiple new entries are added to local from base and remote is not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'cmd+d', command: 'c' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when an entry is removed from local from base and remote has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when an entry (with same command) is removed from local from base and remote has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when an entry is updated in local from base and remote has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when a command with multiple entries is updated from local from base and remote has not changed', async () => {
        const localContent = stringify([
            { key: 'shift+c', command: 'c' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: 'b' },
            { key: 'cmd+c', command: 'a' },
        ]);
        const remoteContent = stringify([
            { key: 'shift+c', command: 'c' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: 'b' },
            { key: 'cmd+d', command: 'a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local has moved forwareded with multiple changes and remote stays with base', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+d', command: '-a' },
            { key: 'alt+f', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+e', command: 'd' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
        ]);
        const expected = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+d', command: '-a' },
            { key: 'alt+f', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, expected);
    });
    test('merge when local and remote has moved forwareded with conflicts', async () => {
        const baseContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'ctrl+c', command: '-a' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const localContent = stringify([
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+e', command: 'd' },
            { key: 'cmd+c', command: '-c' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+e', command: 'e' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+a', command: 'f' },
            { key: 'cmd+c', command: '-c' },
            { key: 'cmd+d', command: 'd' },
            { key: 'alt+d', command: '-f' },
            { key: 'alt+c', command: 'c', when: 'context1' },
            { key: 'alt+g', command: 'g', when: 'context2' },
        ]);
        const expected = stringify([
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'd' },
            { key: 'cmd+c', command: '-c' },
            { key: 'alt+c', command: 'c', when: 'context1' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+e', command: 'e' },
            { key: 'alt+g', command: 'g', when: 'context2' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, expected);
    });
    test('merge when local and remote with one entry but different value', async () => {
        const localContent = stringify([{ key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const remoteContent = stringify([{ key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+d",
		"command": "a",
		"when": "editorTextFocus && !editorReadonly"
	}
]`);
    });
    test('merge when local and remote with different keybinding', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+a', command: '-a', when: 'editorTextFocus && !editorReadonly' }
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+a', command: '-a', when: 'editorTextFocus && !editorReadonly' }
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+d",
		"command": "a",
		"when": "editorTextFocus && !editorReadonly"
	},
	{
		"key": "alt+a",
		"command": "-a",
		"when": "editorTextFocus && !editorReadonly"
	}
]`);
    });
    test('merge when the entry is removed in local but updated in remote', async () => {
        const baseContent = stringify([{ key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const localContent = stringify([]);
        const remoteContent = stringify([{ key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[]`);
    });
    test('merge when the entry is removed in local but updated in remote and a new entry is added in local', async () => {
        const baseContent = stringify([{ key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const localContent = stringify([{ key: 'alt+b', command: 'b' }]);
        const remoteContent = stringify([{ key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+b",
		"command": "b"
	}
]`);
    });
    test('merge when the entry is removed in remote but updated in local', async () => {
        const baseContent = stringify([{ key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const localContent = stringify([{ key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const remoteContent = stringify([]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+c",
		"command": "a",
		"when": "editorTextFocus && !editorReadonly"
	}
]`);
    });
    test('merge when the entry is removed in remote but updated in local and a new entry is added in remote', async () => {
        const baseContent = stringify([{ key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const localContent = stringify([{ key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' }]);
        const remoteContent = stringify([{ key: 'alt+b', command: 'b' }]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+c",
		"command": "a",
		"when": "editorTextFocus && !editorReadonly"
	},
	{
		"key": "alt+b",
		"command": "b"
	}
]`);
    });
    test('merge when local and remote has moved forwareded with conflicts (2)', async () => {
        const baseContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+c', command: '-a' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const localContent = stringify([
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+e', command: 'd' },
            { key: 'cmd+c', command: '-c' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+e', command: 'e' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+a', command: 'f' },
            { key: 'cmd+c', command: '-c' },
            { key: 'cmd+d', command: 'd' },
            { key: 'alt+d', command: '-f' },
            { key: 'alt+c', command: 'c', when: 'context1' },
            { key: 'alt+g', command: 'g', when: 'context2' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+d",
		"command": "-f"
	},
	{
		"key": "cmd+d",
		"command": "d"
	},
	{
		"key": "cmd+c",
		"command": "-c"
	},
	{
		"key": "cmd+d",
		"command": "c",
		"when": "context1"
	},
	{
		"key": "alt+a",
		"command": "f"
	},
	{
		"key": "alt+e",
		"command": "e"
	},
	{
		"key": "alt+g",
		"command": "g",
		"when": "context2"
	}
]`);
    });
});
async function mergeKeybindings(localContent, remoteContent, baseContent) {
    const userDataSyncUtilService = new TestUserDataSyncUtilService();
    const formattingOptions = await userDataSyncUtilService.resolveFormattingOptions();
    return merge(localContent, remoteContent, baseContent, formattingOptions, userDataSyncUtilService);
}
function stringify(value) {
    return JSON.stringify(value, null, '\t');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NNZXJnZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9rZXliaW5kaW5nc01lcmdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RSxLQUFLLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBRTdDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RFLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxvQ0FBb0MsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsb0NBQW9DLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUcsTUFBTSxNQUFNLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxD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MUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDL0IsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDOUIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDOUIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDL0IsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUNoRCxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUMvQixDQUFDLENBQUM7UUFDSCxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUM7WUFDOUIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDL0IsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDOUIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDL0IsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUNoRCxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM5QixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtTQUM5QixDQUFDLENBQUM7UUFDSCxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUM7WUFDL0IsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDOUIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDL0IsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDOUIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDL0IsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUNoRCxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFO1NBQ2hELENBQUMsQ0FBQztRQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNoRixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQ3JDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBK0JELENBQUMsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0FBRUosQ0FBQyxDQUFDLENBQUM7QUFFSCxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsWUFBb0IsRUFBRSxhQUFxQixFQUFFLFdBQTBCO0lBQ3RHLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSwyQkFBMkIsRUFBRSxDQUFDO0lBQ2xFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0lBQ25GLE9BQU8sS0FBSyxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixDQUFDLENBQUM7QUFDcEcsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLEtBQVU7SUFDNUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDMUMsQ0FBQyJ9