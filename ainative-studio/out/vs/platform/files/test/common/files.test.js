/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isEqual, isEqualOrParent } from '../../../../base/common/extpath.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../base/test/common/utils.js';
import { FileChangesEvent, isParent } from '../../common/files.js';
suite('Files', () => {
    test('FileChangesEvent - basics', function () {
        const changes = [
            { resource: toResource.call(this, '/foo/updated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/foo/otherupdated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */ },
            { resource: toResource.call(this, '/bar/deleted.txt'), type: 2 /* FileChangeType.DELETED */ },
            { resource: toResource.call(this, '/bar/folder'), type: 2 /* FileChangeType.DELETED */ },
            { resource: toResource.call(this, '/BAR/FOLDER'), type: 2 /* FileChangeType.DELETED */ }
        ];
        for (const ignorePathCasing of [false, true]) {
            const event = new FileChangesEvent(changes, ignorePathCasing);
            assert(!event.contains(toResource.call(this, '/foo'), 0 /* FileChangeType.UPDATED */));
            assert(event.affects(toResource.call(this, '/foo'), 0 /* FileChangeType.UPDATED */));
            assert(event.contains(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */));
            assert(event.affects(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */));
            assert(event.contains(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */));
            assert(event.affects(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */));
            assert(event.contains(toResource.call(this, '/foo/updated.txt'), 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */, 2 /* FileChangeType.DELETED */));
            assert(!event.contains(toResource.call(this, '/foo/updated.txt'), 1 /* FileChangeType.ADDED */, 2 /* FileChangeType.DELETED */));
            assert(!event.contains(toResource.call(this, '/foo/updated.txt'), 1 /* FileChangeType.ADDED */));
            assert(!event.contains(toResource.call(this, '/foo/updated.txt'), 2 /* FileChangeType.DELETED */));
            assert(!event.affects(toResource.call(this, '/foo/updated.txt'), 2 /* FileChangeType.DELETED */));
            assert(event.contains(toResource.call(this, '/bar/folder'), 2 /* FileChangeType.DELETED */));
            assert(event.contains(toResource.call(this, '/BAR/FOLDER'), 2 /* FileChangeType.DELETED */));
            assert(event.affects(toResource.call(this, '/BAR'), 2 /* FileChangeType.DELETED */));
            if (ignorePathCasing) {
                assert(event.contains(toResource.call(this, '/BAR/folder'), 2 /* FileChangeType.DELETED */));
                assert(event.affects(toResource.call(this, '/bar'), 2 /* FileChangeType.DELETED */));
            }
            else {
                assert(!event.contains(toResource.call(this, '/BAR/folder'), 2 /* FileChangeType.DELETED */));
                assert(event.affects(toResource.call(this, '/bar'), 2 /* FileChangeType.DELETED */));
            }
            assert(event.contains(toResource.call(this, '/bar/folder/somefile'), 2 /* FileChangeType.DELETED */));
            assert(event.contains(toResource.call(this, '/bar/folder/somefile/test.txt'), 2 /* FileChangeType.DELETED */));
            assert(event.contains(toResource.call(this, '/BAR/FOLDER/somefile/test.txt'), 2 /* FileChangeType.DELETED */));
            if (ignorePathCasing) {
                assert(event.contains(toResource.call(this, '/BAR/folder/somefile/test.txt'), 2 /* FileChangeType.DELETED */));
            }
            else {
                assert(!event.contains(toResource.call(this, '/BAR/folder/somefile/test.txt'), 2 /* FileChangeType.DELETED */));
            }
            assert(!event.contains(toResource.call(this, '/bar/folder2/somefile'), 2 /* FileChangeType.DELETED */));
            assert.strictEqual(1, event.rawAdded.length);
            assert.strictEqual(2, event.rawUpdated.length);
            assert.strictEqual(3, event.rawDeleted.length);
            assert.strictEqual(true, event.gotAdded());
            assert.strictEqual(true, event.gotUpdated());
            assert.strictEqual(true, event.gotDeleted());
        }
    });
    test('FileChangesEvent - supports multiple changes on file tree', function () {
        for (const type of [1 /* FileChangeType.ADDED */, 0 /* FileChangeType.UPDATED */, 2 /* FileChangeType.DELETED */]) {
            const changes = [
                { resource: toResource.call(this, '/foo/bar/updated.txt'), type },
                { resource: toResource.call(this, '/foo/bar/otherupdated.txt'), type },
                { resource: toResource.call(this, '/foo/bar'), type },
                { resource: toResource.call(this, '/foo'), type },
                { resource: toResource.call(this, '/bar'), type },
                { resource: toResource.call(this, '/bar/foo'), type },
                { resource: toResource.call(this, '/bar/foo/updated.txt'), type },
                { resource: toResource.call(this, '/bar/foo/otherupdated.txt'), type }
            ];
            for (const ignorePathCasing of [false, true]) {
                const event = new FileChangesEvent(changes, ignorePathCasing);
                for (const change of changes) {
                    assert(event.contains(change.resource, type));
                    assert(event.affects(change.resource, type));
                }
                assert(event.affects(toResource.call(this, '/foo'), type));
                assert(event.affects(toResource.call(this, '/bar'), type));
                assert(event.affects(toResource.call(this, '/'), type));
                assert(!event.affects(toResource.call(this, '/foobar'), type));
                assert(!event.contains(toResource.call(this, '/some/foo/bar'), type));
                assert(!event.affects(toResource.call(this, '/some/foo/bar'), type));
                assert(!event.contains(toResource.call(this, '/some/bar'), type));
                assert(!event.affects(toResource.call(this, '/some/bar'), type));
                switch (type) {
                    case 1 /* FileChangeType.ADDED */:
                        assert.strictEqual(8, event.rawAdded.length);
                        break;
                    case 2 /* FileChangeType.DELETED */:
                        assert.strictEqual(8, event.rawDeleted.length);
                        break;
                }
            }
        }
    });
    test('FileChangesEvent - correlation', function () {
        let changes = [
            { resource: toResource.call(this, '/foo/updated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/foo/otherupdated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */ },
        ];
        let event = new FileChangesEvent(changes, true);
        assert.strictEqual(event.hasCorrelation(), false);
        assert.strictEqual(event.correlates(100), false);
        changes = [
            { resource: toResource.call(this, '/foo/updated.txt'), type: 0 /* FileChangeType.UPDATED */, cId: 100 },
            { resource: toResource.call(this, '/foo/otherupdated.txt'), type: 0 /* FileChangeType.UPDATED */, cId: 100 },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */, cId: 100 },
        ];
        event = new FileChangesEvent(changes, true);
        assert.strictEqual(event.hasCorrelation(), true);
        assert.strictEqual(event.correlates(100), true);
        assert.strictEqual(event.correlates(120), false);
        changes = [
            { resource: toResource.call(this, '/foo/updated.txt'), type: 0 /* FileChangeType.UPDATED */, cId: 100 },
            { resource: toResource.call(this, '/foo/otherupdated.txt'), type: 0 /* FileChangeType.UPDATED */ },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */, cId: 100 },
        ];
        event = new FileChangesEvent(changes, true);
        assert.strictEqual(event.hasCorrelation(), false);
        assert.strictEqual(event.correlates(100), false);
        assert.strictEqual(event.correlates(120), false);
        changes = [
            { resource: toResource.call(this, '/foo/updated.txt'), type: 0 /* FileChangeType.UPDATED */, cId: 100 },
            { resource: toResource.call(this, '/foo/otherupdated.txt'), type: 0 /* FileChangeType.UPDATED */, cId: 120 },
            { resource: toResource.call(this, '/added.txt'), type: 1 /* FileChangeType.ADDED */, cId: 100 },
        ];
        event = new FileChangesEvent(changes, true);
        assert.strictEqual(event.hasCorrelation(), false);
        assert.strictEqual(event.correlates(100), false);
        assert.strictEqual(event.correlates(120), false);
    });
    function testIsEqual(testMethod) {
        // corner cases
        assert(testMethod('', '', true));
        assert(!testMethod(null, '', true));
        assert(!testMethod(undefined, '', true));
        // basics (string)
        assert(testMethod('/', '/', true));
        assert(testMethod('/some', '/some', true));
        assert(testMethod('/some/path', '/some/path', true));
        assert(testMethod('c:\\', 'c:\\', true));
        assert(testMethod('c:\\some', 'c:\\some', true));
        assert(testMethod('c:\\some\\path', 'c:\\some\\path', true));
        assert(testMethod('/someöäü/path', '/someöäü/path', true));
        assert(testMethod('c:\\someöäü\\path', 'c:\\someöäü\\path', true));
        assert(!testMethod('/some/path', '/some/other/path', true));
        assert(!testMethod('c:\\some\\path', 'c:\\some\\other\\path', true));
        assert(!testMethod('c:\\some\\path', 'd:\\some\\path', true));
        assert(testMethod('/some/path', '/some/PATH', true));
        assert(testMethod('/someöäü/path', '/someÖÄÜ/PATH', true));
        assert(testMethod('c:\\some\\path', 'c:\\some\\PATH', true));
        assert(testMethod('c:\\someöäü\\path', 'c:\\someÖÄÜ\\PATH', true));
        assert(testMethod('c:\\some\\path', 'C:\\some\\PATH', true));
    }
    test('isEqual (ignoreCase)', function () {
        testIsEqual(isEqual);
        // basics (uris)
        assert(isEqual(URI.file('/some/path').fsPath, URI.file('/some/path').fsPath, true));
        assert(isEqual(URI.file('c:\\some\\path').fsPath, URI.file('c:\\some\\path').fsPath, true));
        assert(isEqual(URI.file('/someöäü/path').fsPath, URI.file('/someöäü/path').fsPath, true));
        assert(isEqual(URI.file('c:\\someöäü\\path').fsPath, URI.file('c:\\someöäü\\path').fsPath, true));
        assert(!isEqual(URI.file('/some/path').fsPath, URI.file('/some/other/path').fsPath, true));
        assert(!isEqual(URI.file('c:\\some\\path').fsPath, URI.file('c:\\some\\other\\path').fsPath, true));
        assert(isEqual(URI.file('/some/path').fsPath, URI.file('/some/PATH').fsPath, true));
        assert(isEqual(URI.file('/someöäü/path').fsPath, URI.file('/someÖÄÜ/PATH').fsPath, true));
        assert(isEqual(URI.file('c:\\some\\path').fsPath, URI.file('c:\\some\\PATH').fsPath, true));
        assert(isEqual(URI.file('c:\\someöäü\\path').fsPath, URI.file('c:\\someÖÄÜ\\PATH').fsPath, true));
        assert(isEqual(URI.file('c:\\some\\path').fsPath, URI.file('C:\\some\\PATH').fsPath, true));
    });
    test('isParent (ignorecase)', function () {
        if (isWindows) {
            assert(isParent('c:\\some\\path', 'c:\\', true));
            assert(isParent('c:\\some\\path', 'c:\\some', true));
            assert(isParent('c:\\some\\path', 'c:\\some\\', true));
            assert(isParent('c:\\someöäü\\path', 'c:\\someöäü', true));
            assert(isParent('c:\\someöäü\\path', 'c:\\someöäü\\', true));
            assert(isParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar', true));
            assert(isParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\', true));
            assert(isParent('c:\\some\\path', 'C:\\', true));
            assert(isParent('c:\\some\\path', 'c:\\SOME', true));
            assert(isParent('c:\\some\\path', 'c:\\SOME\\', true));
            assert(!isParent('c:\\some\\path', 'd:\\', true));
            assert(!isParent('c:\\some\\path', 'c:\\some\\path', true));
            assert(!isParent('c:\\some\\path', 'd:\\some\\path', true));
            assert(!isParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\barr', true));
            assert(!isParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\test', true));
        }
        if (isMacintosh || isLinux) {
            assert(isParent('/some/path', '/', true));
            assert(isParent('/some/path', '/some', true));
            assert(isParent('/some/path', '/some/', true));
            assert(isParent('/someöäü/path', '/someöäü', true));
            assert(isParent('/someöäü/path', '/someöäü/', true));
            assert(isParent('/foo/bar/test.ts', '/foo/bar', true));
            assert(isParent('/foo/bar/test.ts', '/foo/bar/', true));
            assert(isParent('/some/path', '/SOME', true));
            assert(isParent('/some/path', '/SOME/', true));
            assert(isParent('/someöäü/path', '/SOMEÖÄÜ', true));
            assert(isParent('/someöäü/path', '/SOMEÖÄÜ/', true));
            assert(!isParent('/some/path', '/some/path', true));
            assert(!isParent('/foo/bar/test.ts', '/foo/barr', true));
            assert(!isParent('/foo/bar/test.ts', '/foo/bar/test', true));
        }
    });
    test('isEqualOrParent (ignorecase)', function () {
        // same assertions apply as with isEqual()
        testIsEqual(isEqualOrParent); //
        if (isWindows) {
            assert(isEqualOrParent('c:\\some\\path', 'c:\\', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\some', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\some\\', true));
            assert(isEqualOrParent('c:\\someöäü\\path', 'c:\\someöäü', true));
            assert(isEqualOrParent('c:\\someöäü\\path', 'c:\\someöäü\\', true));
            assert(isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar', true));
            assert(isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\some\\path', true));
            assert(isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\test.ts', true));
            assert(isEqualOrParent('c:\\some\\path', 'C:\\', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\SOME', true));
            assert(isEqualOrParent('c:\\some\\path', 'c:\\SOME\\', true));
            assert(!isEqualOrParent('c:\\some\\path', 'd:\\', true));
            assert(!isEqualOrParent('c:\\some\\path', 'd:\\some\\path', true));
            assert(!isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\barr', true));
            assert(!isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\test', true));
            assert(!isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\bar\\test.', true));
            assert(!isEqualOrParent('c:\\foo\\bar\\test.ts', 'c:\\foo\\BAR\\test.', true));
        }
        if (isMacintosh || isLinux) {
            assert(isEqualOrParent('/some/path', '/', true));
            assert(isEqualOrParent('/some/path', '/some', true));
            assert(isEqualOrParent('/some/path', '/some/', true));
            assert(isEqualOrParent('/someöäü/path', '/someöäü', true));
            assert(isEqualOrParent('/someöäü/path', '/someöäü/', true));
            assert(isEqualOrParent('/foo/bar/test.ts', '/foo/bar', true));
            assert(isEqualOrParent('/foo/bar/test.ts', '/foo/bar/', true));
            assert(isEqualOrParent('/some/path', '/some/path', true));
            assert(isEqualOrParent('/some/path', '/SOME', true));
            assert(isEqualOrParent('/some/path', '/SOME/', true));
            assert(isEqualOrParent('/someöäü/path', '/SOMEÖÄÜ', true));
            assert(isEqualOrParent('/someöäü/path', '/SOMEÖÄÜ/', true));
            assert(!isEqualOrParent('/foo/bar/test.ts', '/foo/barr', true));
            assert(!isEqualOrParent('/foo/bar/test.ts', '/foo/bar/test', true));
            assert(!isEqualOrParent('foo/bar/test.ts', 'foo/bar/test.', true));
            assert(!isEqualOrParent('foo/bar/test.ts', 'foo/BAR/test.', true));
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy90ZXN0L2NvbW1vbi9maWxlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDNUcsT0FBTyxFQUFFLGdCQUFnQixFQUErQixRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVoRyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUVuQixJQUFJLENBQUMsMkJBQTJCLEVBQUU7UUFDakMsTUFBTSxPQUFPLEdBQUc7WUFDZixFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLElBQUksZ0NBQXdCLEVBQUU7WUFDckYsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsRUFBRSxJQUFJLGdDQUF3QixFQUFFO1lBQzFGLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxFQUFFLElBQUksOEJBQXNCLEVBQUU7WUFDN0UsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUs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