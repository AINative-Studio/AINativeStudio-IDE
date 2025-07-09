/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { addSetting, merge, updateIgnoredSettings } from '../../common/settingsMerge.js';
const formattingOptions = { eol: '\n', insertSpaces: false, tabSize: 4 };
suite('SettingsMerge - Merge', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('merge when local and remote are same with one entry', async () => {
        const localContent = stringify({ 'a': 1 });
        const remoteContent = stringify({ 'a': 1 });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local and remote are same with multiple entries', async () => {
        const localContent = stringify({
            'a': 1,
            'b': 2
        });
        const remoteContent = stringify({
            'a': 1,
            'b': 2
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local and remote are same with multiple entries in different order', async () => {
        const localContent = stringify({
            'b': 2,
            'a': 1,
        });
        const remoteContent = stringify({
            'a': 1,
            'b': 2
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.conflictsSettings.length, 0);
    });
    test('merge when local and remote are same with different base content', async () => {
        const localContent = stringify({
            'b': 2,
            'a': 1,
        });
        const baseContent = stringify({
            'a': 2,
            'b': 1
        });
        const remoteContent = stringify({
            'a': 1,
            'b': 2
        });
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(actual.hasConflicts);
    });
    test('merge when a new entry is added to remote', async () => {
        const localContent = stringify({
            'a': 1,
        });
        const remoteContent = stringify({
            'a': 1,
            'b': 2
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when multiple new entries are added to remote', async () => {
        const localContent = stringify({
            'a': 1,
        });
        const remoteContent = stringify({
            'a': 1,
            'b': 2,
            'c': 3,
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when multiple new entries are added to remote from base and local has not changed', async () => {
        const localContent = stringify({
            'a': 1,
        });
        const remoteContent = stringify({
            'b': 2,
            'a': 1,
            'c': 3,
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when an entry is removed from remote from base and local has not changed', async () => {
        const localContent = stringify({
            'a': 1,
            'b': 2,
        });
        const remoteContent = stringify({
            'a': 1,
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when all entries are removed from base and local has not changed', async () => {
        const localContent = stringify({
            'a': 1,
        });
        const remoteContent = stringify({});
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when an entry is updated in remote from base and local has not changed', async () => {
        const localContent = stringify({
            'a': 1,
        });
        const remoteContent = stringify({
            'a': 2
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when remote has moved forwareded with multiple changes and local stays with base', async () => {
        const localContent = stringify({
            'a': 1,
        });
        const remoteContent = stringify({
            'a': 2,
            'b': 1,
            'c': 3,
            'd': 4,
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when remote has moved forwareded with order changes and local stays with base', async () => {
        const localContent = stringify({
            'a': 1,
            'b': 2,
            'c': 3,
        });
        const remoteContent = stringify({
            'a': 2,
            'd': 4,
            'c': 3,
            'b': 2,
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when remote has moved forwareded with comment changes and local stays with base', async () => {
        const localContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1,
}`;
        const remoteContent = stringify `
{
	// comment b has changed
	"b": 2,
	// this is comment for c
	"c": 1,
}`;
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when remote has moved forwareded with comment and order changes and local stays with base', async () => {
        const localContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1,
}`;
        const remoteContent = stringify `
{
	// this is comment for c
	"c": 1,
	// comment b has changed
	"b": 2,
}`;
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when a new entries are added to local', async () => {
        const localContent = stringify({
            'a': 1,
            'b': 2,
            'c': 3,
            'd': 4,
        });
        const remoteContent = stringify({
            'a': 1,
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when multiple new entries are added to local from base and remote is not changed', async () => {
        const localContent = stringify({
            'a': 2,
            'b': 1,
            'c': 3,
            'd': 4,
        });
        const remoteContent = stringify({
            'a': 1,
        });
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when an entry is removed from local from base and remote has not changed', async () => {
        const localContent = stringify({
            'a': 1,
            'c': 2
        });
        const remoteContent = stringify({
            'a': 2,
            'b': 1,
            'c': 3,
            'd': 4,
        });
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when an entry is updated in local from base and remote has not changed', async () => {
        const localContent = stringify({
            'a': 1,
            'c': 2
        });
        const remoteContent = stringify({
            'a': 2,
            'c': 2,
        });
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local has moved forwarded with multiple changes and remote stays with base', async () => {
        const localContent = stringify({
            'a': 2,
            'b': 1,
            'c': 3,
            'd': 4,
        });
        const remoteContent = stringify({
            'a': 1,
        });
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local has moved forwarded with order changes and remote stays with base', async () => {
        const localContent = `
{
	"b": 2,
	"c": 1,
}`;
        const remoteContent = stringify `
{
	"c": 1,
	"b": 2,
}`;
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local has moved forwarded with comment changes and remote stays with base', async () => {
        const localContent = `
{
	// comment for b has changed
	"b": 2,
	// comment for c
	"c": 1,
}`;
        const remoteContent = stringify `
{
	// comment for b
	"b": 2,
	// comment for c
	"c": 1,
}`;
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local has moved forwarded with comment and order changes and remote stays with base', async () => {
        const localContent = `
{
	// comment for c
	"c": 1,
	// comment for b has changed
	"b": 2,
}`;
        const remoteContent = stringify `
{
	// comment for b
	"b": 2,
	// comment for c
	"c": 1,
}`;
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local and remote with one entry but different value', async () => {
        const localContent = stringify({
            'a': 1
        });
        const remoteContent = stringify({
            'a': 2
        });
        const expectedConflicts = [{ key: 'a', localValue: 1, remoteValue: 2 }];
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('merge when the entry is removed in remote but updated in local and a new entry is added in remote', async () => {
        const baseContent = stringify({
            'a': 1
        });
        const localContent = stringify({
            'a': 2
        });
        const remoteContent = stringify({
            'b': 2
        });
        const expectedConflicts = [{ key: 'a', localValue: 2, remoteValue: undefined }];
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            'a': 2,
            'b': 2
        }));
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('merge with single entry and local is empty', async () => {
        const baseContent = stringify({
            'a': 1
        });
        const localContent = stringify({});
        const remoteContent = stringify({
            'a': 2
        });
        const expectedConflicts = [{ key: 'a', localValue: undefined, remoteValue: 2 }];
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('merge when local and remote has moved forwareded with conflicts', async () => {
        const baseContent = stringify({
            'a': 1,
            'b': 2,
            'c': 3,
            'd': 4,
        });
        const localContent = stringify({
            'a': 2,
            'c': 3,
            'd': 5,
            'e': 4,
            'f': 1,
        });
        const remoteContent = stringify({
            'b': 3,
            'c': 3,
            'd': 6,
            'e': 5,
        });
        const expectedConflicts = [
            { key: 'b', localValue: undefined, remoteValue: 3 },
            { key: 'a', localValue: 2, remoteValue: undefined },
            { key: 'd', localValue: 5, remoteValue: 6 },
            { key: 'e', localValue: 4, remoteValue: 5 },
        ];
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            'a': 2,
            'c': 3,
            'd': 5,
            'e': 4,
            'f': 1,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            'b': 3,
            'c': 3,
            'd': 6,
            'e': 5,
            'f': 1,
        }));
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('merge when local and remote has moved forwareded with change in order', async () => {
        const baseContent = stringify({
            'a': 1,
            'b': 2,
            'c': 3,
            'd': 4,
        });
        const localContent = stringify({
            'a': 2,
            'c': 3,
            'b': 2,
            'd': 4,
            'e': 5,
        });
        const remoteContent = stringify({
            'a': 1,
            'b': 2,
            'c': 4,
        });
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            'a': 2,
            'c': 4,
            'b': 2,
            'e': 5,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            'a': 2,
            'b': 2,
            'e': 5,
            'c': 4,
        }));
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, []);
    });
    test('merge when local and remote has moved forwareded with comment changes', async () => {
        const baseContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const localContent = `
{
	// comment b has changed in local
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const remoteContent = `
{
	// comment b has changed in remote
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, []);
    });
    test('resolve when local and remote has moved forwareded with resolved conflicts', async () => {
        const baseContent = stringify({
            'a': 1,
            'b': 2,
            'c': 3,
            'd': 4,
        });
        const localContent = stringify({
            'a': 2,
            'c': 3,
            'd': 5,
            'e': 4,
            'f': 1,
        });
        const remoteContent = stringify({
            'b': 3,
            'c': 3,
            'd': 6,
            'e': 5,
        });
        const expectedConflicts = [
            { key: 'd', localValue: 5, remoteValue: 6 },
        ];
        const actual = merge(localContent, remoteContent, baseContent, [], [{ key: 'a', value: 2 }, { key: 'b', value: undefined }, { key: 'e', value: 5 }], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            'a': 2,
            'c': 3,
            'd': 5,
            'e': 5,
            'f': 1,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            'c': 3,
            'd': 6,
            'e': 5,
            'f': 1,
            'a': 2,
        }));
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('ignored setting is not merged when changed in local and remote', async () => {
        const localContent = stringify({ 'a': 1 });
        const remoteContent = stringify({ 'a': 2 });
        const actual = merge(localContent, remoteContent, null, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when changed in local and remote from base', async () => {
        const baseContent = stringify({ 'a': 0 });
        const localContent = stringify({ 'a': 1 });
        const remoteContent = stringify({ 'a': 2 });
        const actual = merge(localContent, remoteContent, baseContent, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when added in remote', async () => {
        const localContent = stringify({});
        const remoteContent = stringify({ 'a': 1 });
        const actual = merge(localContent, remoteContent, null, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when added in remote from base', async () => {
        const localContent = stringify({ 'b': 2 });
        const remoteContent = stringify({ 'a': 1, 'b': 2 });
        const actual = merge(localContent, remoteContent, localContent, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when removed in remote', async () => {
        const localContent = stringify({ 'a': 1 });
        const remoteContent = stringify({});
        const actual = merge(localContent, remoteContent, null, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when removed in remote from base', async () => {
        const localContent = stringify({ 'a': 2 });
        const remoteContent = stringify({});
        const actual = merge(localContent, remoteContent, localContent, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged with other changes without conflicts', async () => {
        const baseContent = stringify({
            'a': 2,
            'b': 2,
            'c': 3,
            'd': 4,
            'e': 5,
        });
        const localContent = stringify({
            'a': 1,
            'b': 2,
            'c': 3,
        });
        const remoteContent = stringify({
            'a': 3,
            'b': 3,
            'd': 4,
            'e': 6,
        });
        const actual = merge(localContent, remoteContent, baseContent, ['a', 'e'], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            'a': 1,
            'b': 3,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            'a': 3,
            'b': 3,
            'e': 6,
        }));
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged with other changes conflicts', async () => {
        const baseContent = stringify({
            'a': 2,
            'b': 2,
            'c': 3,
            'd': 4,
            'e': 5,
        });
        const localContent = stringify({
            'a': 1,
            'b': 4,
            'c': 3,
            'd': 5,
        });
        const remoteContent = stringify({
            'a': 3,
            'b': 3,
            'e': 6,
        });
        const expectedConflicts = [
            { key: 'd', localValue: 5, remoteValue: undefined },
            { key: 'b', localValue: 4, remoteValue: 3 },
        ];
        const actual = merge(localContent, remoteContent, baseContent, ['a', 'e'], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            'a': 1,
            'b': 4,
            'd': 5,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            'a': 3,
            'b': 3,
            'e': 6,
        }));
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
        assert.ok(actual.hasConflicts);
    });
    test('merge when remote has comments and local is empty', async () => {
        const localContent = `
{

}`;
        const remoteContent = stringify `
{
	// this is a comment
	"a": 1,
}`;
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
});
suite('SettingsMerge - Compute Remote Content', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('local content is returned when there are no ignored settings', async () => {
        const localContent = stringify({
            'a': 1,
            'b': 2,
            'c': 3,
        });
        const remoteContent = stringify({
            'a': 3,
            'b': 3,
            'd': 4,
            'e': 6,
        });
        const actual = updateIgnoredSettings(localContent, remoteContent, [], formattingOptions);
        assert.strictEqual(actual, localContent);
    });
    test('when target content is empty', async () => {
        const remoteContent = stringify({
            'a': 3,
        });
        const actual = updateIgnoredSettings('', remoteContent, ['a'], formattingOptions);
        assert.strictEqual(actual, '');
    });
    test('when source content is empty', async () => {
        const localContent = stringify({
            'a': 3,
            'b': 3,
        });
        const expected = stringify({
            'b': 3,
        });
        const actual = updateIgnoredSettings(localContent, '', ['a'], formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('ignored settings are not updated from remote content', async () => {
        const localContent = stringify({
            'a': 1,
            'b': 2,
            'c': 3,
        });
        const remoteContent = stringify({
            'a': 3,
            'b': 3,
            'd': 4,
            'e': 6,
        });
        const expected = stringify({
            'a': 3,
            'b': 2,
            'c': 3,
        });
        const actual = updateIgnoredSettings(localContent, remoteContent, ['a'], formattingOptions);
        assert.strictEqual(actual, expected);
    });
});
suite('SettingsMerge - Add Setting', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Insert after a setting without comments', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 2,
	"d": 3
}`;
        const expected = `
{
	"a": 2,
	"b": 2,
	"d": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting without comments at the end', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 2
}`;
        const expected = `
{
	"a": 2,
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert between settings without comment', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert between settings and there is a comment in between in source', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting and after a comment at the end', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for b
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting ending with comma and after a comment at the end', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a comment and there are no settings', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2
}`;
        const targetContent = `
{
	// this is comment for b
}`;
        const expected = `
{
	// this is comment for b
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting and between a comment and setting', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting between two comments and there is a setting after', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b
	// this is comment for c
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting between two comments on the same line and there is a setting after', () => {
        const sourceContent = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	/* this is comment for b */ // this is comment for c
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2, // this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting between two line comments on the same line and there is a setting after', () => {
        const sourceContent = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b // this is comment for c
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b // this is comment for c
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting between two comments and there is no setting after', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2
	// this is a comment
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for b
	// this is a comment
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2
	// this is a comment
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting with comma and between two comments and there is no setting after', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2
	// this is a comment
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b
	// this is a comment
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2
	// this is a comment
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting without comments', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"d": 2,
	"c": 3
}`;
        const expected = `
{
	"d": 2,
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting without comments at the end', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"c": 3
}`;
        const expected = `
{
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting with comment', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	// this is comment for c
	"c": 3
}`;
        const expected = `
{
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting and before a comment at the beginning', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2,
	"c": 3,
}`;
        const targetContent = `
{
	// this is comment for b
	"c": 3
}`;
        const expected = `
{
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting ending with comma and before a comment at the begninning', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2,
	"c": 3,
}`;
        const targetContent = `
{
	// this is comment for b
	"c": 3,
}`;
        const expected = `
{
	// this is comment for b
	"b": 2,
	"c": 3,
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting and between a setting and comment', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"d": 1,
	// this is comment for b
	"c": 3
}`;
        const expected = `
{
	"d": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting between two comments and there is a setting before', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"d": 1,
	// this is comment for b
	// this is comment for c
	"c": 3
}`;
        const expected = `
{
	"d": 1,
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting between two comments on the same line and there is a setting before', () => {
        const sourceContent = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"d": 1,
	/* this is comment for b */ // this is comment for c
	"c": 3
}`;
        const expected = `
{
	"d": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting between two line comments on the same line and there is a setting before', () => {
        const sourceContent = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"d": 1,
	// this is comment for b // this is comment for c
	"c": 3
}`;
        const expected = `
{
	"d": 1,
	"b": 2,
	// this is comment for b // this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting between two comments and there is no setting before', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const targetContent = `
{
	// this is comment for b
	// this is comment for c
	"c": 1
}`;
        const expected = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting with comma and between two comments and there is no setting before', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const targetContent = `
{
	// this is comment for b
	// this is comment for c
	"c": 1,
}`;
        const expected = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1,
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting that is of object type', () => {
        const sourceContent = `
{
	"b": {
		"d": 1
	},
	"a": 2,
	"c": 1
}`;
        const targetContent = `
{
	"b": {
		"d": 1
	},
	"c": 1
}`;
        const actual = addSetting('a', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, sourceContent);
    });
    test('Insert after a setting that is of array type', () => {
        const sourceContent = `
{
	"b": [
		1
	],
	"a": 2,
	"c": 1
}`;
        const targetContent = `
{
	"b": [
		1
	],
	"c": 1
}`;
        const actual = addSetting('a', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, sourceContent);
    });
    test('Insert after a comment with comma separator of previous setting and no next nodes ', () => {
        const sourceContent = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for a
	,
}`;
        const expected = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a comment with comma separator of previous setting and there is a setting after ', () => {
        const sourceContent = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for a
	,
	"c": 3
}`;
        const expected = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a comment with comma separator of previous setting and there is a comment after ', () => {
        const sourceContent = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2
	// this is a comment
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for a
	,
	// this is a comment
}`;
        const expected = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2
	// this is a comment
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
});
function stringify(value) {
    return JSON.stringify(value, null, '\t');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NNZXJnZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9zZXR0aW5nc01lcmdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHekYsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFFekUsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUVuQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxxREFBcUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RSxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM1QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxh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