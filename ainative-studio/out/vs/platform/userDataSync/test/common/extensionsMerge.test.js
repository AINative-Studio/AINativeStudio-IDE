/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { merge } from '../../common/extensionsMerge.js';
suite('ExtensionsMerge', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('merge returns local extension if remote does not exist', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, null, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, localExtensions);
    });
    test('merge returns local extension if remote does not exist with ignored extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const expected = [
            localExtensions[1],
            localExtensions[2],
        ];
        const actual = merge(localExtensions, null, null, [], ['a'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge returns local extension if remote does not exist with ignored extensions (ignore case)', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const expected = [
            localExtensions[1],
            localExtensions[2],
        ];
        const actual = merge(localExtensions, null, null, [], ['A'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge returns local extension if remote does not exist with skipped extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const skippedExtension = [
            aSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
        ];
        const expected = [...localExtensions];
        const actual = merge(localExtensions, null, null, skippedExtension, [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge returns local extension if remote does not exist with skipped and ignored extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const skippedExtension = [
            aSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
        ];
        const expected = [localExtensions[1], localExtensions[2]];
        const actual = merge(localExtensions, null, null, skippedExtension, ['a'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when there is no base', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when there is no base and with ignored extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], ['a'], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when remote is moved forwarded', () => {
        const baseExtensions = [
            aSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'a', uuid: 'a' }, { id: 'd', uuid: 'd' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when remote is moved forwarded with disabled extension', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' }, disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' }, disabled: true })]);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when remote moved forwarded with ignored extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], ['a'], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'd', uuid: 'd' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when remote is moved forwarded with skipped extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [
            aSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'd', uuid: 'd' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when remote is moved forwarded with skipped and ignored extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [
            aSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, ['b'], []);
        assert.deepStrictEqual(actual.local.added, [anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } })]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'd', uuid: 'd' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when local is moved forwarded', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when local is moved forwarded with disabled extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when local is moved forwarded with ignored settings', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], ['b'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
    });
    test('merge local and remote extensions when local is moved forwarded with skipped extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [
            aSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when local is moved forwarded with skipped and ignored extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [
            aSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, ['c'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when both moved forwarded', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, [anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } })]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when both moved forwarded with ignored extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], ['a', 'e'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when both moved forwarded with skipped extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [
            aSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, [], []);
        assert.deepStrictEqual(actual.local.added, [anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } })]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when both moved forwarded with skipped and ignoredextensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [
            aSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, ['e'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge when remote extension has no uuid and different extension id case', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'A' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'A', uuid: 'a' } }),
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, [anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } })]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge when remote extension is not an installed extension', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' }, installed: false }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge when remote extension is not an installed extension but is an installed extension locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge when an extension is not an installed extension remotely and does not exist locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' }, installed: false }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge when an extension is an installed extension remotely but not locally and updated locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge when an extension is an installed extension remotely but not locally and updated remotely', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge not installed extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' }, installed: false }),
        ];
        const expected = [
            anExpectedBuiltinSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedBuiltinSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge: remote extension with prerelease is added', () => {
        const localExtensions = [];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true })]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension with prerelease is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true })]);
    });
    test('merge: remote extension with prerelease is added when local extension without prerelease is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension without prerelease is added when local extension with prerelease is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to prerelease', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to release', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to prerelease', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true })]);
    });
    test('merge: local extension is changed to release', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
    });
    test('merge: local extension not an installed extension - remote preRelease property is taken precedence when there are no updates', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension not an installed extension - remote preRelease property is taken precedence when there are updates locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false, disabled: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true, disabled: true })]);
    });
    test('merge: local extension not an installed extension - remote preRelease property is taken precedence when there are updates remotely', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true, disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true, disabled: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension not an installed extension - remote version is taken precedence when there are no updates', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension not an installed extension - remote version is taken precedence when there are updates locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false, disabled: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0', disabled: true })]);
    });
    test('merge: local extension not an installed extension - remote version property is taken precedence when there are updates remotely', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0', disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0', disabled: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has builtin extension, local does not have extension, remote has extension installed', () => {
        const localExtensions = [];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0', installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' })]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has installed extension, local has installed extension, remote has extension builtin', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has installed extension, local has builtin extension, remote does not has extension', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedBuiltinSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
    });
    test('merge: base has builtin extension, local has installed extension, remote has builtin extension with updated state', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false, state: { 'a': 1 } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, state: { 'a': 1 } })]);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, state: { 'a': 1 } })]);
    });
    test('merge: base has installed extension, last time synced as builtin extension, local has installed extension, remote has builtin extension with updated state', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false, state: { 'a': 1 } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, state: { 'a': 1 } })]);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, state: { 'a': 1 } })]);
    });
    test('merge: base has builtin extension, local does not have extension, remote has builtin extension', () => {
        const localExtensions = [];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0', installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0', installed: false }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has installed extension, last synced as builtin, local does not have extension, remote has installed extension', () => {
        const localExtensions = [];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has builtin extension, last synced as builtin, local does not have extension, remote has installed extension', () => {
        const localExtensions = [];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0', installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.added, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' })]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension with pinned is added', () => {
        const localExtensions = [];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true })]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension with pinned is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true })]);
    });
    test('merge: remote extension with pinned is added when local extension without pinned is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension without pinned is added when local extension with pinned is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to pinned', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to unpinned', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to pinned', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true })]);
    });
    test('merge: local extension is changed to unpinned', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
    });
    test('merge: local extension not an installed extension - remote pinned property is taken precedence when there are no updates', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension not an installed extension - remote pinned property is taken precedence when there are updates locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false, disabled: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true, disabled: true })]);
    });
    test('merge: local extension not an installed extension - remote pinned property is taken precedence when there are updates remotely', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true, disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true, disabled: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to pinned and version changed', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true })]);
    });
    test('merge: local extension is changed to unpinned and version changed', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
    });
    test('merge: remote extension is changed to pinned and version changed', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to pinned and version changed and remote extension is channged to pinned with different version', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.2', pinned: true }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.2', pinned: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to unpinned and version changed', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to unpinned and version changed and remote extension is channged to unpinned with different version', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1' }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.2' }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('sync adding local application scoped extension', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: true }),
        ];
        const actual = merge(localExtensions, null, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, localExtensions);
    });
    test('sync merging local extension with isApplicationScoped property and remote does not has isApplicationScoped property', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: false }),
        ];
        const baseExtensions = [
            aSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, baseExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } })]);
    });
    test('sync merging when applicaiton scope is changed locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: true }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: false }),
        ];
        const actual = merge(localExtensions, baseExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, localExtensions);
    });
    test('sync merging when applicaiton scope is changed remotely', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: false }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: true })]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge does not remove remote extension when skipped extension has uuid but remote does not has', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'b' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } })], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge does not remove remote extension when last sync builtin extension has uuid but remote does not has', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'b' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], [{ id: 'b', uuid: 'b' }]);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    function anExpectedSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            pinned: false,
            preRelease: false,
            installed: true,
            ...extension
        };
    }
    function anExpectedBuiltinSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            pinned: false,
            preRelease: false,
            ...extension
        };
    }
    function aLocalSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            pinned: false,
            preRelease: false,
            installed: true,
            ...extension
        };
    }
    function aRemoteSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            pinned: false,
            preRelease: false,
            installed: true,
            ...extension
        };
    }
    function aSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            installed: true,
            ...extension
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc01lcmdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9leHRlbnNpb25zTWVyZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR3hELEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFFN0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsd0RBQXdELEVBQUUsR0FBRyxFQUFFO1FBQ25FLE1BQU0sZUFBZSxHQUFHO1lBQ3ZCLG1CQUFtQixDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUMzRCxtQkFBbUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDM0QsbUJBQW1CLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1NBQzNELENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU5RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FB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