/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { toSlashes } from '../../common/extpath.js';
import { posix, win32 } from '../../common/path.js';
import { isWindows } from '../../common/platform.js';
import { addTrailingPathSeparator, basename, dirname, distinctParents, extUri, extUriIgnorePathCase, hasTrailingPathSeparator, isAbsolutePath, joinPath, normalizePath, relativePath, removeTrailingPathSeparator, resolvePath } from '../../common/resources.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Resources', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('distinctParents', () => {
        // Basic
        let resources = [
            URI.file('/some/folderA/file.txt'),
            URI.file('/some/folderB/file.txt'),
            URI.file('/some/folderC/file.txt')
        ];
        let distinct = distinctParents(resources, r => r);
        assert.strictEqual(distinct.length, 3);
        assert.strictEqual(distinct[0].toString(), resources[0].toString());
        assert.strictEqual(distinct[1].toString(), resources[1].toString());
        assert.strictEqual(distinct[2].toString(), resources[2].toString());
        // Parent / Child
        resources = [
            URI.file('/some/folderA'),
            URI.file('/some/folderA/file.txt'),
            URI.file('/some/folderA/child/file.txt'),
            URI.file('/some/folderA2/file.txt'),
            URI.file('/some/file.txt')
        ];
        distinct = distinctParents(resources, r => r);
        assert.strictEqual(distinct.length, 3);
        assert.strictEqual(distinct[0].toString(), resources[0].toString());
        assert.strictEqual(distinct[1].toString(), resources[3].toString());
        assert.strictEqual(distinct[2].toString(), resources[4].toString());
    });
    test('dirname', () => {
        if (isWindows) {
            assert.strictEqual(dirname(URI.file('c:\\some\\file\\test.txt')).toString(), 'file:///c%3A/some/file');
            assert.strictEqual(dirname(URI.file('c:\\some\\file')).toString(), 'file:///c%3A/some');
            assert.strictEqual(dirname(URI.file('c:\\some\\file\\')).toString(), 'file:///c%3A/some');
            assert.strictEqual(dirname(URI.file('c:\\some')).toString(), 'file:///c%3A/');
            assert.strictEqual(dirname(URI.file('C:\\some')).toString(), 'file:///c%3A/');
            assert.strictEqual(dirname(URI.file('c:\\')).toString(), 'file:///c%3A/');
        }
        else {
            assert.strictEqual(dirname(URI.file('/some/file/test.txt')).toString(), 'file:///some/file');
            assert.strictEqual(dirname(URI.file('/some/file/')).toString(), 'file:///some');
            assert.strictEqual(dirname(URI.file('/some/file')).toString(), 'file:///some');
        }
        assert.strictEqual(dirname(URI.parse('foo://a/some/file/test.txt')).toString(), 'foo://a/some/file');
        assert.strictEqual(dirname(URI.parse('foo://a/some/file/')).toString(), 'foo://a/some');
        assert.strictEqual(dirname(URI.parse('foo://a/some/file')).toString(), 'foo://a/some');
        assert.strictEqual(dirname(URI.parse('foo://a/some')).toString(), 'foo://a/');
        assert.strictEqual(dirname(URI.parse('foo://a/')).toString(), 'foo://a/');
        assert.strictEqual(dirname(URI.parse('foo://a')).toString(), 'foo://a');
        // does not explode (https://github.com/microsoft/vscode/issues/41987)
        dirname(URI.from({ scheme: 'file', authority: '/users/someone/portal.h' }));
        assert.strictEqual(dirname(URI.parse('foo://a/b/c?q')).toString(), 'foo://a/b?q');
    });
    test('basename', () => {
        if (isWindows) {
            assert.strictEqual(basename(URI.file('c:\\some\\file\\test.txt')), 'test.txt');
            assert.strictEqual(basename(URI.file('c:\\some\\file')), 'file');
            assert.strictEqual(basename(URI.file('c:\\some\\file\\')), 'file');
            assert.strictEqual(basename(URI.file('C:\\some\\file\\')), 'file');
        }
        else {
            assert.strictEqual(basename(URI.file('/some/file/test.txt')), 'test.txt');
            assert.strictEqual(basename(URI.file('/some/file/')), 'file');
            assert.strictEqual(basename(URI.file('/some/file')), 'file');
            assert.strictEqual(basename(URI.file('/some')), 'some');
        }
        assert.strictEqual(basename(URI.parse('foo://a/some/file/test.txt')), 'test.txt');
        assert.strictEqual(basename(URI.parse('foo://a/some/file/')), 'file');
        assert.strictEqual(basename(URI.parse('foo://a/some/file')), 'file');
        assert.strictEqual(basename(URI.parse('foo://a/some')), 'some');
        assert.strictEqual(basename(URI.parse('foo://a/')), '');
        assert.strictEqual(basename(URI.parse('foo://a')), '');
    });
    test('joinPath', () => {
        if (isWindows) {
            assert.strictEqual(joinPath(URI.file('c:\\foo\\bar'), '/file.js').toString(), 'file:///c%3A/foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\foo\\bar\\'), 'file.js').toString(), 'file:///c%3A/foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\foo\\bar\\'), '/file.js').toString(), 'file:///c%3A/foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\'), '/file.js').toString(), 'file:///c%3A/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\'), 'bar/file.js').toString(), 'file:///c%3A/bar/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\foo'), './file.js').toString(), 'file:///c%3A/foo/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\foo'), '/./file.js').toString(), 'file:///c%3A/foo/file.js');
            assert.strictEqual(joinPath(URI.file('C:\\foo'), '../file.js').toString(), 'file:///c%3A/file.js');
            assert.strictEqual(joinPath(URI.file('C:\\foo\\.'), '../file.js').toString(), 'file:///c%3A/file.js');
        }
        else {
            assert.strictEqual(joinPath(URI.file('/foo/bar'), '/file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar'), 'file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar/'), '/file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/'), '/file.js').toString(), 'file:///file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar'), './file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar'), '/./file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar'), '../file.js').toString(), 'file:///foo/file.js');
        }
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar')).toString(), 'foo://a/foo/bar');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar'), '/file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar'), 'file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar/'), '/file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/'), '/file.js').toString(), 'foo://a/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar/'), './file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar/'), '/./file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar/'), '../file.js').toString(), 'foo://a/foo/file.js');
        assert.strictEqual(joinPath(URI.from({ scheme: 'myScheme', authority: 'authority', path: '/path', query: 'query', fragment: 'fragment' }), '/file.js').toString(), 'myScheme://authority/path/file.js?query#fragment');
    });
    test('normalizePath', () => {
        if (isWindows) {
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\.\\bar')).toString(), 'file:///c%3A/foo/bar');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\.')).toString(), 'file:///c%3A/foo');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\.\\')).toString(), 'file:///c%3A/foo/');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\..')).toString(), 'file:///c%3A/');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\..\\bar')).toString(), 'file:///c%3A/bar');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\..\\..\\bar')).toString(), 'file:///c%3A/bar');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\foo\\..\\..\\bar')).toString(), 'file:///c%3A/bar');
            assert.strictEqual(normalizePath(URI.file('C:\\foo\\foo\\.\\..\\..\\bar')).toString(), 'file:///c%3A/bar');
            assert.strictEqual(normalizePath(URI.file('C:\\foo\\foo\\.\\..\\some\\..\\bar')).toString(), 'file:///c%3A/foo/bar');
        }
        else {
            assert.strictEqual(normalizePath(URI.file('/foo/./bar')).toString(), 'file:///foo/bar');
            assert.strictEqual(normalizePath(URI.file('/foo/.')).toString(), 'file:///foo');
            assert.strictEqual(normalizePath(URI.file('/foo/./')).toString(), 'file:///foo/');
            assert.strictEqual(normalizePath(URI.file('/foo/..')).toString(), 'file:///');
            assert.strictEqual(normalizePath(URI.file('/foo/../bar')).toString(), 'file:///bar');
            assert.strictEqual(normalizePath(URI.file('/foo/../../bar')).toString(), 'file:///bar');
            assert.strictEqual(normalizePath(URI.file('/foo/foo/../../bar')).toString(), 'file:///bar');
            assert.strictEqual(normalizePath(URI.file('/foo/foo/./../../bar')).toString(), 'file:///bar');
            assert.strictEqual(normalizePath(URI.file('/foo/foo/./../some/../bar')).toString(), 'file:///foo/bar');
            assert.strictEqual(normalizePath(URI.file('/f')).toString(), 'file:///f');
        }
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/./bar')).toString(), 'foo://a/foo/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/.')).toString(), 'foo://a/foo');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/./')).toString(), 'foo://a/foo/');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/..')).toString(), 'foo://a/');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/../bar')).toString(), 'foo://a/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/../../bar')).toString(), 'foo://a/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/foo/../../bar')).toString(), 'foo://a/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/foo/./../../bar')).toString(), 'foo://a/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/foo/./../some/../bar')).toString(), 'foo://a/foo/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a')).toString(), 'foo://a');
        assert.strictEqual(normalizePath(URI.parse('foo://a/')).toString(), 'foo://a/');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/./bar?q=1')).toString(), URI.parse('foo://a/foo/bar?q%3D1').toString());
    });
    test('isAbsolute', () => {
        if (isWindows) {
            assert.strictEqual(isAbsolutePath(URI.file('c:\\foo\\')), true);
            assert.strictEqual(isAbsolutePath(URI.file('C:\\foo\\')), true);
            assert.strictEqual(isAbsolutePath(URI.file('bar')), true); // URI normalizes all file URIs to be absolute
        }
        else {
            assert.strictEqual(isAbsolutePath(URI.file('/foo/bar')), true);
            assert.strictEqual(isAbsolutePath(URI.file('bar')), true); // URI normalizes all file URIs to be absolute
        }
        assert.strictEqual(isAbsolutePath(URI.parse('foo:foo')), false);
        assert.strictEqual(isAbsolutePath(URI.parse('foo://a/foo/.')), true);
    });
    function assertTrailingSeparator(u1, expected) {
        assert.strictEqual(hasTrailingPathSeparator(u1), expected, u1.toString());
    }
    function assertRemoveTrailingSeparator(u1, expected) {
        assertEqualURI(removeTrailingPathSeparator(u1), expected, u1.toString());
    }
    function assertAddTrailingSeparator(u1, expected) {
        assertEqualURI(addTrailingPathSeparator(u1), expected, u1.toString());
    }
    test('trailingPathSeparator', () => {
        assertTrailingSeparator(URI.parse('foo://a/foo'), false);
        assertTrailingSeparator(URI.parse('foo://a/foo/'), true);
        assertTrailingSeparator(URI.parse('foo://a/'), false);
        assertTrailingSeparator(URI.parse('foo://a'), false);
        assertRemoveTrailingSeparator(URI.parse('foo://a/foo'), URI.parse('foo://a/foo'));
        assertRemoveTrailingSeparator(URI.parse('foo://a/foo/'), URI.parse('foo://a/foo'));
        assertRemoveTrailingSeparator(URI.parse('foo://a/'), URI.parse('foo://a/'));
        assertRemoveTrailingSeparator(URI.parse('foo://a'), URI.parse('foo://a'));
        assertAddTrailingSeparator(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/'));
        assertAddTrailingSeparator(URI.parse('foo://a/foo/'), URI.parse('foo://a/foo/'));
        assertAddTrailingSeparator(URI.parse('foo://a/'), URI.parse('foo://a/'));
        assertAddTrailingSeparator(URI.parse('foo://a'), URI.parse('foo://a/'));
        if (isWindows) {
            assertTrailingSeparator(URI.file('c:\\a\\foo'), false);
            assertTrailingSeparator(URI.file('c:\\a\\foo\\'), true);
            assertTrailingSeparator(URI.file('c:\\'), false);
            assertTrailingSeparator(URI.file('\\\\server\\share\\some\\'), true);
            assertTrailingSeparator(URI.file('\\\\server\\share\\'), false);
            assertRemoveTrailingSeparator(URI.file('c:\\a\\foo'), URI.file('c:\\a\\foo'));
            assertRemoveTrailingSeparator(URI.file('c:\\a\\foo\\'), URI.file('c:\\a\\foo'));
            assertRemoveTrailingSeparator(URI.file('c:\\'), URI.file('c:\\'));
            assertRemoveTrailingSeparator(URI.file('\\\\server\\share\\some\\'), URI.file('\\\\server\\share\\some'));
            assertRemoveTrailingSeparator(URI.file('\\\\server\\share\\'), URI.file('\\\\server\\share\\'));
            assertAddTrailingSeparator(URI.file('c:\\a\\foo'), URI.file('c:\\a\\foo\\'));
            assertAddTrailingSeparator(URI.file('c:\\a\\foo\\'), URI.file('c:\\a\\foo\\'));
            assertAddTrailingSeparator(URI.file('c:\\'), URI.file('c:\\'));
            assertAddTrailingSeparator(URI.file('\\\\server\\share\\some'), URI.file('\\\\server\\share\\some\\'));
            assertAddTrailingSeparator(URI.file('\\\\server\\share\\some\\'), URI.file('\\\\server\\share\\some\\'));
        }
        else {
            assertTrailingSeparator(URI.file('/foo/bar'), false);
            assertTrailingSeparator(URI.file('/foo/bar/'), true);
            assertTrailingSeparator(URI.file('/'), false);
            assertRemoveTrailingSeparator(URI.file('/foo/bar'), URI.file('/foo/bar'));
            assertRemoveTrailingSeparator(URI.file('/foo/bar/'), URI.file('/foo/bar'));
            assertRemoveTrailingSeparator(URI.file('/'), URI.file('/'));
            assertAddTrailingSeparator(URI.file('/foo/bar'), URI.file('/foo/bar/'));
            assertAddTrailingSeparator(URI.file('/foo/bar/'), URI.file('/foo/bar/'));
            assertAddTrailingSeparator(URI.file('/'), URI.file('/'));
        }
    });
    function assertEqualURI(actual, expected, message, ignoreCase) {
        const util = ignoreCase ? extUriIgnorePathCase : extUri;
        if (!util.isEqual(expected, actual)) {
            assert.strictEqual(actual.toString(), expected.toString(), message);
        }
    }
    function assertRelativePath(u1, u2, expectedPath, ignoreJoin, ignoreCase) {
        const util = ignoreCase ? extUriIgnorePathCase : extUri;
        assert.strictEqual(util.relativePath(u1, u2), expectedPath, `from ${u1.toString()} to ${u2.toString()}`);
        if (expectedPath !== undefined && !ignoreJoin) {
            assertEqualURI(removeTrailingPathSeparator(joinPath(u1, expectedPath)), removeTrailingPathSeparator(u2), 'joinPath on relativePath should be equal', ignoreCase);
        }
    }
    test('relativePath', () => {
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/bar'), 'bar');
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/bar/'), 'bar');
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/bar/goo'), 'bar/goo');
        assertRelativePath(URI.parse('foo://a/'), URI.parse('foo://a/foo/bar/goo'), 'foo/bar/goo');
        assertRelativePath(URI.parse('foo://a/foo/xoo'), URI.parse('foo://a/foo/bar'), '../bar');
        assertRelativePath(URI.parse('foo://a/foo/xoo/yoo'), URI.parse('foo://a'), '../../..', true);
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/'), '');
        assertRelativePath(URI.parse('foo://a/foo/'), URI.parse('foo://a/foo'), '');
        assertRelativePath(URI.parse('foo://a/foo/'), URI.parse('foo://a/foo/'), '');
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo'), '');
        assertRelativePath(URI.parse('foo://a'), URI.parse('foo://a'), '', true);
        assertRelativePath(URI.parse('foo://a/'), URI.parse('foo://a/'), '');
        assertRelativePath(URI.parse('foo://a/'), URI.parse('foo://a'), '', true);
        assertRelativePath(URI.parse('foo://a/foo?q'), URI.parse('foo://a/foo/bar#h'), 'bar', true);
        assertRelativePath(URI.parse('foo://'), URI.parse('foo://a/b'), undefined);
        assertRelativePath(URI.parse('foo://a2/b'), URI.parse('foo://a/b'), undefined);
        assertRelativePath(URI.parse('goo://a/b'), URI.parse('foo://a/b'), undefined);
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://A/FOO/bar/goo'), 'bar/goo', false, true);
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://A/FOO/BAR/GOO'), 'BAR/GOO', false, true);
        assertRelativePath(URI.parse('foo://a/foo/xoo'), URI.parse('foo://A/FOO/BAR/GOO'), '../BAR/GOO', false, true);
        assertRelativePath(URI.parse('foo:///c:/a/foo'), URI.parse('foo:///C:/a/foo/xoo/'), 'xoo', false, true);
        if (isWindows) {
            assertRelativePath(URI.file('c:\\foo\\bar'), URI.file('c:\\foo\\bar'), '');
            assertRelativePath(URI.file('c:\\foo\\bar\\huu'), URI.file('c:\\foo\\bar'), '..');
            assertRelativePath(URI.file('c:\\foo\\bar\\a1\\a2'), URI.file('c:\\foo\\bar'), '../..');
            assertRelativePath(URI.file('c:\\foo\\bar\\'), URI.file('c:\\foo\\bar\\a1\\a2'), 'a1/a2');
            assertRelativePath(URI.file('c:\\foo\\bar\\'), URI.file('c:\\foo\\bar\\a1\\a2\\'), 'a1/a2');
            assertRelativePath(URI.file('c:\\'), URI.file('c:\\foo\\bar'), 'foo/bar');
            assertRelativePath(URI.file('\\\\server\\share\\some\\'), URI.file('\\\\server\\share\\some\\path'), 'path');
            assertRelativePath(URI.file('\\\\server\\share\\some\\'), URI.file('\\\\server\\share2\\some\\path'), '../../share2/some/path', true); // ignore joinPath assert: path.join is not root aware
        }
        else {
            assertRelativePath(URI.file('/a/foo'), URI.file('/a/foo/bar'), 'bar');
            assertRelativePath(URI.file('/a/foo'), URI.file('/a/foo/bar/'), 'bar');
            assertRelativePath(URI.file('/a/foo'), URI.file('/a/foo/bar/goo'), 'bar/goo');
            assertRelativePath(URI.file('/a/'), URI.file('/a/foo/bar/goo'), 'foo/bar/goo');
            assertRelativePath(URI.file('/'), URI.file('/a/foo/bar/goo'), 'a/foo/bar/goo');
            assertRelativePath(URI.file('/a/foo/xoo'), URI.file('/a/foo/bar'), '../bar');
            assertRelativePath(URI.file('/a/foo/xoo/yoo'), URI.file('/a'), '../../..');
            assertRelativePath(URI.file('/a/foo'), URI.file('/a/foo/'), '');
            assertRelativePath(URI.file('/a/foo'), URI.file('/b/foo/'), '../../b/foo');
        }
    });
    function assertResolve(u1, path, expected) {
        const actual = resolvePath(u1, path);
        assertEqualURI(actual, expected, `from ${u1.toString()} and ${path}`);
        const p = path.indexOf('/') !== -1 ? posix : win32;
        if (!p.isAbsolute(path)) {
            let expectedPath = isWindows ? toSlashes(path) : path;
            expectedPath = expectedPath.startsWith('./') ? expectedPath.substr(2) : expectedPath;
            assert.strictEqual(relativePath(u1, actual), expectedPath, `relativePath (${u1.toString()}) on actual (${actual.toString()}) should be to path (${expectedPath})`);
        }
    }
    test('resolve', () => {
        if (isWindows) {
            assertResolve(URI.file('c:\\foo\\bar'), 'file.js', URI.file('c:\\foo\\bar\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), 't\\file.js', URI.file('c:\\foo\\bar\\t\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), '.\\t\\file.js', URI.file('c:\\foo\\bar\\t\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), 'a1/file.js', URI.file('c:\\foo\\bar\\a1\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), './a1/file.js', URI.file('c:\\foo\\bar\\a1\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), '\\b1\\file.js', URI.file('c:\\b1\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), '/b1/file.js', URI.file('c:\\b1\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar\\'), 'file.js', URI.file('c:\\foo\\bar\\file.js'));
            assertResolve(URI.file('c:\\'), 'file.js', URI.file('c:\\file.js'));
            assertResolve(URI.file('c:\\'), '\\b1\\file.js', URI.file('c:\\b1\\file.js'));
            assertResolve(URI.file('c:\\'), '/b1/file.js', URI.file('c:\\b1\\file.js'));
            assertResolve(URI.file('c:\\'), 'd:\\foo\\bar.txt', URI.file('d:\\foo\\bar.txt'));
            assertResolve(URI.file('\\\\server\\share\\some\\'), 'b1\\file.js', URI.file('\\\\server\\share\\some\\b1\\file.js'));
            assertResolve(URI.file('\\\\server\\share\\some\\'), '\\file.js', URI.file('\\\\server\\share\\file.js'));
            assertResolve(URI.file('c:\\'), '\\\\server\\share\\some\\', URI.file('\\\\server\\share\\some'));
            assertResolve(URI.file('\\\\server\\share\\some\\'), 'c:\\', URI.file('c:\\'));
        }
        else {
            assertResolve(URI.file('/foo/bar'), 'file.js', URI.file('/foo/bar/file.js'));
            assertResolve(URI.file('/foo/bar'), './file.js', URI.file('/foo/bar/file.js'));
            assertResolve(URI.file('/foo/bar'), '/file.js', URI.file('/file.js'));
            assertResolve(URI.file('/foo/bar/'), 'file.js', URI.file('/foo/bar/file.js'));
            assertResolve(URI.file('/'), 'file.js', URI.file('/file.js'));
            assertResolve(URI.file(''), './file.js', URI.file('/file.js'));
            assertResolve(URI.file(''), '/file.js', URI.file('/file.js'));
        }
        assertResolve(URI.parse('foo://server/foo/bar'), 'file.js', URI.parse('foo://server/foo/bar/file.js'));
        assertResolve(URI.parse('foo://server/foo/bar'), './file.js', URI.parse('foo://server/foo/bar/file.js'));
        assertResolve(URI.parse('foo://server/foo/bar'), './file.js', URI.parse('foo://server/foo/bar/file.js'));
        assertResolve(URI.parse('foo://server/foo/bar'), 'c:\\a1\\b1', URI.parse('foo://server/c:/a1/b1'));
        assertResolve(URI.parse('foo://server/foo/bar'), 'c:\\', URI.parse('foo://server/c:'));
    });
    function assertIsEqual(u1, u2, ignoreCase, expected) {
        const util = ignoreCase ? extUriIgnorePathCase : extUri;
        assert.strictEqual(util.isEqual(u1, u2), expected, `${u1.toString()}${expected ? '===' : '!=='}${u2.toString()}`);
        assert.strictEqual(util.compare(u1, u2) === 0, expected);
        assert.strictEqual(util.getComparisonKey(u1) === util.getComparisonKey(u2), expected, `comparison keys ${u1.toString()}, ${u2.toString()}`);
        assert.strictEqual(util.isEqualOrParent(u1, u2), expected, `isEqualOrParent ${u1.toString()}, ${u2.toString()}`);
        if (!ignoreCase) {
            assert.strictEqual(u1.toString() === u2.toString(), expected);
        }
    }
    test('isEqual', () => {
        const fileURI = isWindows ? URI.file('c:\\foo\\bar') : URI.file('/foo/bar');
        const fileURI2 = isWindows ? URI.file('C:\\foo\\Bar') : URI.file('/foo/Bar');
        assertIsEqual(fileURI, fileURI, true, true);
        assertIsEqual(fileURI, fileURI, false, true);
        assertIsEqual(fileURI, fileURI, undefined, true);
        assertIsEqual(fileURI, fileURI2, true, true);
        assertIsEqual(fileURI, fileURI2, false, false);
        const fileURI3 = URI.parse('foo://server:453/foo/bar');
        const fileURI4 = URI.parse('foo://server:453/foo/Bar');
        assertIsEqual(fileURI3, fileURI3, true, true);
        assertIsEqual(fileURI3, fileURI3, false, true);
        assertIsEqual(fileURI3, fileURI3, undefined, true);
        assertIsEqual(fileURI3, fileURI4, true, true);
        assertIsEqual(fileURI3, fileURI4, false, false);
        assertIsEqual(fileURI, fileURI3, true, false);
        assertIsEqual(URI.parse('file://server'), URI.parse('file://server/'), true, true);
        assertIsEqual(URI.parse('http://server'), URI.parse('http://server/'), true, true);
        assertIsEqual(URI.parse('foo://server'), URI.parse('foo://server/'), true, false); // only selected scheme have / as the default path
        assertIsEqual(URI.parse('foo://server/foo'), URI.parse('foo://server/foo/'), true, false);
        assertIsEqual(URI.parse('foo://server/foo'), URI.parse('foo://server/foo?'), true, true);
        const fileURI5 = URI.parse('foo://server:453/foo/bar?q=1');
        const fileURI6 = URI.parse('foo://server:453/foo/bar#xy');
        assertIsEqual(fileURI5, fileURI5, true, true);
        assertIsEqual(fileURI5, fileURI3, true, false);
        assertIsEqual(fileURI6, fileURI6, true, true);
        assertIsEqual(fileURI6, fileURI5, true, false);
        assertIsEqual(fileURI6, fileURI3, true, false);
    });
    test('isEqualOrParent', () => {
        const fileURI = isWindows ? URI.file('c:\\foo\\bar') : URI.file('/foo/bar');
        const fileURI2 = isWindows ? URI.file('c:\\foo') : URI.file('/foo');
        const fileURI2b = isWindows ? URI.file('C:\\Foo\\') : URI.file('/Foo/');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI, fileURI), true, '1');
        assert.strictEqual(extUri.isEqualOrParent(fileURI, fileURI), true, '2');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI, fileURI2), true, '3');
        assert.strictEqual(extUri.isEqualOrParent(fileURI, fileURI2), true, '4');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI, fileURI2b), true, '5');
        assert.strictEqual(extUri.isEqualOrParent(fileURI, fileURI2b), false, '6');
        assert.strictEqual(extUri.isEqualOrParent(fileURI2, fileURI), false, '7');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI2b, fileURI2), true, '8');
        const fileURI3 = URI.parse('foo://server:453/foo/bar/goo');
        const fileURI4 = URI.parse('foo://server:453/foo/');
        const fileURI5 = URI.parse('foo://server:453/foo');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI3, fileURI3, true), true, '11');
        assert.strictEqual(extUri.isEqualOrParent(fileURI3, fileURI3), true, '12');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI3, fileURI4, true), true, '13');
        assert.strictEqual(extUri.isEqualOrParent(fileURI3, fileURI4), true, '14');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI3, fileURI, true), false, '15');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI5, fileURI5, true), true, '16');
        const fileURI6 = URI.parse('foo://server:453/foo?q=1');
        const fileURI7 = URI.parse('foo://server:453/foo/bar?q=1');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI6, fileURI5), false, '17');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI6, fileURI6), true, '18');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI7, fileURI6), true, '19');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI7, fileURI5), false, '20');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9yZXNvdXJjZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsd0JBQXdCLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLDJCQUEyQixFQUFFLFdBQVcsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xRLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFHckUsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFFdkIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBRTVCLFFBQVE7UUFDUixJQUFJLFNBQVMsR0FBRztZQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUM7WUFDbEMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQztZQUNsQyxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDO1NBQ2xDLENBQUM7UUFFRixJQUFJLFFB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RSxDQUFDLENBQUM7UUFDNUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3RSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDM0Usa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUYsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzNFLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFL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