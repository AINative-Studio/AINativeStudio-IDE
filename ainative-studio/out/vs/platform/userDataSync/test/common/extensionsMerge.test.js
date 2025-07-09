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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc01lcmdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL3Rlc3QvY29tbW9uL2V4dGVuc2lvbnNNZXJnZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHeEQsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUU3Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLEVBQUU7UUFDbkUsTUFBTSxlQUFlLEdBQUc7WUFDdkIsbUJBQW1CLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQzNELG1CQUFtQixDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUMzRCxtQkFBbUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7U0FDM0QsQ0FBQztRQUVGLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTlELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVB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