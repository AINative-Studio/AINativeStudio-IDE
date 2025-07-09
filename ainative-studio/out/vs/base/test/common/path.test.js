/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// NOTE: VSCode's copy of nodejs path library to be usable in common (non-node) namespace
// Copied from: https://github.com/nodejs/node/tree/43dd49c9782848c25e5b03448c8a0f923f13c158
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
import assert from 'assert';
import * as path from '../../common/path.js';
import { isWeb, isWindows } from '../../common/platform.js';
import * as process from '../../common/process.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Paths (Node Implementation)', () => {
    const __filename = 'path.test.js';
    ensureNoDisposablesAreLeakedInTestSuite();
    test('join', () => {
        const failures = [];
        const backslashRE = /\\/g;
        const joinTests = [
            [[path.posix.join, path.win32.join],
                // arguments                     result
                [[['.', 'x/b', '..', '/b/c.js'], 'x/b/c.js'],
                    [[], '.'],
                    [['/.', 'x/b', '..', '/b/c.js'], '/x/b/c.js'],
                    [['/foo', '../../../bar'], '/bar'],
                    [['foo', '../../../bar'], '../../bar'],
                    [['foo/', '../../../bar'], '../../bar'],
                    [['foo/x', '../../../bar'], '../bar'],
                    [['foo/x', './bar'], 'foo/x/bar'],
                    [['foo/x/', './bar'], 'foo/x/bar'],
                    [['foo/x/', '.', 'bar'], 'foo/x/bar'],
                    [['./'], './'],
                    [['.', './'], './'],
                    [['.', '.', '.'], '.'],
                    [['.', './', '.'], '.'],
                    [['.', '/./', '.'], '.'],
                    [['.', '/////./', '.'], '.'],
                    [['.'], '.'],
                    [['', '.'], '.'],
                    [['', 'foo'], 'foo'],
                    [['foo', '/bar'], 'foo/bar'],
                    [['', '/foo'], '/foo'],
                    [['', '', '/foo'], '/foo'],
                    [['', '', 'foo'], 'foo'],
                    [['foo', ''], 'foo'],
                    [['foo/', ''], 'foo/'],
                    [['foo', '', '/bar'], 'foo/bar'],
                    [['./', '..', '/foo'], '../foo'],
                    [['./', '..', '..', '/foo'], '../../foo'],
                    [['.', '..', '..', '/foo'], '../../foo'],
                    [['', '..', '..', '/foo'], '../../foo'],
                    [['/'], '/'],
                    [['/', '.'], '/'],
                    [['/', '..'], '/'],
                    [['/', '..', '..'], '/'],
                    [[''], '.'],
                    [['', ''], '.'],
                    [[' /foo'], ' /foo'],
                    [[' ', 'foo'], ' /foo'],
                    [[' ', '.'], ' '],
                    [[' ', '/'], ' /'],
                    [[' ', ''], ' '],
                    [['/', 'foo'], '/foo'],
                    [['/', '/foo'], '/foo'],
                    [['/', '//foo'], '/foo'],
                    [['/', '', '/foo'], '/foo'],
                    [['', '/', 'foo'], '/foo'],
                    [['', '/', '/foo'], '/foo']
                ]
            ]
        ];
        // Windows-specific join tests
        joinTests.push([
            path.win32.join,
            joinTests[0][1].slice(0).concat([
                // UNC path expected
                [['//foo/bar'], '\\\\foo\\bar\\'],
                [['\\/foo/bar'], '\\\\foo\\bar\\'],
                [['\\\\foo/bar'], '\\\\foo\\bar\\'],
                // UNC path expected - server and share separate
                [['//foo', 'bar'], '\\\\foo\\bar\\'],
                [['//foo/', 'bar'], '\\\\foo\\bar\\'],
                [['//foo', '/bar'], '\\\\foo\\bar\\'],
                // UNC path expected - questionable
                [['//foo', '', 'bar'], '\\\\foo\\bar\\'],
                [['//foo/', '', 'bar'], '\\\\foo\\bar\\'],
                [['//foo/', '', '/bar'], '\\\\foo\\bar\\'],
                // UNC path expected - even more questionable
                [['', '//foo', 'bar'], '\\\\foo\\bar\\'],
                [['', '//foo/', 'bar'], '\\\\foo\\bar\\'],
                [['', '//foo/', '/bar'], '\\\\foo\\bar\\'],
                // No UNC path expected (no double slash in first component)
                [['\\', 'foo/bar'], '\\foo\\bar'],
                [['\\', '/foo/bar'], '\\foo\\bar'],
                [['', '/', '/foo/bar'], '\\foo\\bar'],
                // No UNC path expected (no non-slashes in first component -
                // questionable)
                [['//', 'foo/bar'], '\\foo\\bar'],
                [['//', '/foo/bar'], '\\foo\\bar'],
                [['\\\\', '/', '/foo/bar'], '\\foo\\bar'],
                [['//'], '\\'],
                // No UNC path expected (share name missing - questionable).
                [['//foo'], '\\foo'],
                [['//foo/'], '\\foo\\'],
                [['//foo', '/'], '\\foo\\'],
                [['//foo', '', '/'], '\\foo\\'],
                // No UNC path expected (too many leading slashes - questionable)
                [['///foo/bar'], '\\foo\\bar'],
                [['////foo', 'bar'], '\\foo\\bar'],
                [['\\\\\\/foo/bar'], '\\foo\\bar'],
                // Drive-relative vs drive-absolute paths. This merely describes the
                // status quo, rather than being obviously right
                [['c:'], 'c:.'],
                [['c:.'], 'c:.'],
                [['c:', ''], 'c:.'],
                [['', 'c:'], 'c:.'],
                [['c:.', '/'], 'c:.\\'],
                [['c:.', 'file'], 'c:file'],
                [['c:', '/'], 'c:\\'],
                [['c:', 'file'], 'c:\\file']
            ])
        ]);
        joinTests.forEach((test) => {
            if (!Array.isArray(test[0])) {
                test[0] = [test[0]];
            }
            test[0].forEach((join) => {
                test[1].forEach((test) => {
                    const actual = join.apply(null, test[0]);
                    const expected = test[1];
                    // For non-Windows specific tests with the Windows join(), we need to try
                    // replacing the slashes since the non-Windows specific tests' `expected`
                    // use forward slashes
                    let actualAlt;
                    let os;
                    if (join === path.win32.join) {
                        actualAlt = actual.replace(backslashRE, '/');
                        os = 'win32';
                    }
                    else {
                        os = 'posix';
                    }
                    const message = `path.${os}.join(${test[0].map(JSON.stringify).join(',')})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                    if (actual !== expected && actualAlt !== expected) {
                        failures.push(`\n${message}`);
                    }
                });
            });
        });
        assert.strictEqual(failures.length, 0, failures.join(''));
    });
    test('dirname', () => {
        assert.strictEqual(path.posix.dirname('/a/b/'), '/a');
        assert.strictEqual(path.posix.dirname('/a/b'), '/a');
        assert.strictEqual(path.posix.dirname('/a'), '/');
        assert.strictEqual(path.posix.dirname(''), '.');
        assert.strictEqual(path.posix.dirname('/'), '/');
        assert.strictEqual(path.posix.dirname('////'), '/');
        assert.strictEqual(path.posix.dirname('//a'), '//');
        assert.strictEqual(path.posix.dirname('foo'), '.');
        assert.strictEqual(path.win32.dirname('c:\\'), 'c:\\');
        assert.strictEqual(path.win32.dirname('c:\\foo'), 'c:\\');
        assert.strictEqual(path.win32.dirname('c:\\foo\\'), 'c:\\');
        assert.strictEqual(path.win32.dirname('c:\\foo\\bar'), 'c:\\foo');
        assert.strictEqual(path.win32.dirname('c:\\foo\\bar\\'), 'c:\\foo');
        assert.strictEqual(path.win32.dirname('c:\\foo\\bar\\baz'), 'c:\\foo\\bar');
        assert.strictEqual(path.win32.dirname('\\'), '\\');
        assert.strictEqual(path.win32.dirname('\\foo'), '\\');
        assert.strictEqual(path.win32.dirname('\\foo\\'), '\\');
        assert.strictEqual(path.win32.dirname('\\foo\\bar'), '\\foo');
        assert.strictEqual(path.win32.dirname('\\foo\\bar\\'), '\\foo');
        assert.strictEqual(path.win32.dirname('\\foo\\bar\\baz'), '\\foo\\bar');
        assert.strictEqual(path.win32.dirname('c:'), 'c:');
        assert.strictEqual(path.win32.dirname('c:foo'), 'c:');
        assert.strictEqual(path.win32.dirname('c:foo\\'), 'c:');
        assert.strictEqual(path.win32.dirname('c:foo\\bar'), 'c:foo');
        assert.strictEqual(path.win32.dirname('c:foo\\bar\\'), 'c:foo');
        assert.strictEqual(path.win32.dirname('c:foo\\bar\\baz'), 'c:foo\\bar');
        assert.strictEqual(path.win32.dirname('file:stream'), '.');
        assert.strictEqual(path.win32.dirname('dir\\file:stream'), 'dir');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share'), '\\\\unc\\share');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo'), '\\\\unc\\share\\');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\'), '\\\\unc\\share\\');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\bar'), '\\\\unc\\share\\foo');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\bar\\'), '\\\\unc\\share\\foo');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\bar\\baz'), '\\\\unc\\share\\foo\\bar');
        assert.strictEqual(path.win32.dirname('/a/b/'), '/a');
        assert.strictEqual(path.win32.dirname('/a/b'), '/a');
        assert.strictEqual(path.win32.dirname('/a'), '/');
        assert.strictEqual(path.win32.dirname(''), '.');
        assert.strictEqual(path.win32.dirname('/'), '/');
        assert.strictEqual(path.win32.dirname('////'), '/');
        assert.strictEqual(path.win32.dirname('foo'), '.');
        // Tests from VSCode
        function assertDirname(p, expected, win = false) {
            const actual = win ? path.win32.dirname(p) : path.posix.dirname(p);
            if (actual !== expected) {
                assert.fail(`${p}: expected: ${expected}, ours: ${actual}`);
            }
        }
        assertDirname('foo/bar', 'foo');
        assertDirname('foo\\bar', 'foo', true);
        assertDirname('/foo/bar', '/foo');
        assertDirname('\\foo\\bar', '\\foo', true);
        assertDirname('/foo', '/');
        assertDirname('\\foo', '\\', true);
        assertDirname('/', '/');
        assertDirname('\\', '\\', true);
        assertDirname('foo', '.');
        assertDirname('f', '.');
        assertDirname('f/', '.');
        assertDirname('/folder/', '/');
        assertDirname('c:\\some\\file.txt', 'c:\\some', true);
        assertDirname('c:\\some', 'c:\\', true);
        assertDirname('c:\\', 'c:\\', true);
        assertDirname('c:', 'c:', true);
        assertDirname('\\\\server\\share\\some\\path', '\\\\server\\share\\some', true);
        assertDirname('\\\\server\\share\\some', '\\\\server\\share\\', true);
        assertDirname('\\\\server\\share\\', '\\\\server\\share\\', true);
    });
    test('extname', () => {
        const failures = [];
        const slashRE = /\//g;
        [
            [__filename, '.js'],
            ['', ''],
            ['/path/to/file', ''],
            ['/path/to/file.ext', '.ext'],
            ['/path.to/file.ext', '.ext'],
            ['/path.to/file', ''],
            ['/path.to/.file', ''],
            ['/path.to/.file.ext', '.ext'],
            ['/path/to/f.ext', '.ext'],
            ['/path/to/..ext', '.ext'],
            ['/path/to/..', ''],
            ['file', ''],
            ['file.ext', '.ext'],
            ['.file', ''],
            ['.file.ext', '.ext'],
            ['/file', ''],
            ['/file.ext', '.ext'],
            ['/.file', ''],
            ['/.file.ext', '.ext'],
            ['.path/file.ext', '.ext'],
            ['file.ext.ext', '.ext'],
            ['file.', '.'],
            ['.', ''],
            ['./', ''],
            ['.file.ext', '.ext'],
            ['.file', ''],
            ['.file.', '.'],
            ['.file..', '.'],
            ['..', ''],
            ['../', ''],
            ['..file.ext', '.ext'],
            ['..file', '.file'],
            ['..file.', '.'],
            ['..file..', '.'],
            ['...', '.'],
            ['...ext', '.ext'],
            ['....', '.'],
            ['file.ext/', '.ext'],
            ['file.ext//', '.ext'],
            ['file/', ''],
            ['file//', ''],
            ['file./', '.'],
            ['file.//', '.'],
        ].forEach((test) => {
            const expected = test[1];
            [path.posix.extname, path.win32.extname].forEach((extname) => {
                let input = test[0];
                let os;
                if (extname === path.win32.extname) {
                    input = input.replace(slashRE, '\\');
                    os = 'win32';
                }
                else {
                    os = 'posix';
                }
                const actual = extname(input);
                const message = `path.${os}.extname(${JSON.stringify(input)})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                if (actual !== expected) {
                    failures.push(`\n${message}`);
                }
            });
            {
                const input = `C:${test[0].replace(slashRE, '\\')}`;
                const actual = path.win32.extname(input);
                const message = `path.win32.extname(${JSON.stringify(input)})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                if (actual !== expected) {
                    failures.push(`\n${message}`);
                }
            }
        });
        assert.strictEqual(failures.length, 0, failures.join(''));
        // On Windows, backslash is a path separator.
        assert.strictEqual(path.win32.extname('.\\'), '');
        assert.strictEqual(path.win32.extname('..\\'), '');
        assert.strictEqual(path.win32.extname('file.ext\\'), '.ext');
        assert.strictEqual(path.win32.extname('file.ext\\\\'), '.ext');
        assert.strictEqual(path.win32.extname('file\\'), '');
        assert.strictEqual(path.win32.extname('file\\\\'), '');
        assert.strictEqual(path.win32.extname('file.\\'), '.');
        assert.strictEqual(path.win32.extname('file.\\\\'), '.');
        // On *nix, backslash is a valid name component like any other character.
        assert.strictEqual(path.posix.extname('.\\'), '');
        assert.strictEqual(path.posix.extname('..\\'), '.\\');
        assert.strictEqual(path.posix.extname('file.ext\\'), '.ext\\');
        assert.strictEqual(path.posix.extname('file.ext\\\\'), '.ext\\\\');
        assert.strictEqual(path.posix.extname('file\\'), '');
        assert.strictEqual(path.posix.extname('file\\\\'), '');
        assert.strictEqual(path.posix.extname('file.\\'), '.\\');
        assert.strictEqual(path.posix.extname('file.\\\\'), '.\\\\');
        // Tests from VSCode
        assert.strictEqual(path.extname('far.boo'), '.boo');
        assert.strictEqual(path.extname('far.b'), '.b');
        assert.strictEqual(path.extname('far.'), '.');
        assert.strictEqual(path.extname('far.boo/boo.far'), '.far');
        assert.strictEqual(path.extname('far.boo/boo'), '');
    });
    test('resolve', () => {
        const failures = [];
        const slashRE = /\//g;
        const backslashRE = /\\/g;
        const resolveTests = [
            [path.win32.resolve,
                // arguments                               result
                [[['c:/blah\\blah', 'd:/games', 'c:../a'], 'c:\\blah\\a'],
                    [['c:/ignore', 'd:\\a/b\\c/d', '\\e.exe'], 'd:\\e.exe'],
                    [['c:/ignore', 'c:/some/file'], 'c:\\some\\file'],
                    [['d:/ignore', 'd:some/dir//'], 'd:\\ignore\\some\\dir'],
                    [['//server/share', '..', 'relative\\'], '\\\\server\\share\\relative'],
                    [['c:/', '//'], 'c:\\'],
                    [['c:/', '//dir'], 'c:\\dir'],
                    [['c:/', '//server/share'], '\\\\server\\share\\'],
                    [['c:/', '//server//share'], '\\\\server\\share\\'],
                    [['c:/', '///some//dir'], 'c:\\some\\dir'],
                    [['C:\\foo\\tmp.3\\', '..\\tmp.3\\cycles\\root.js'],
                        'C:\\foo\\tmp.3\\cycles\\root.js']
                ]
            ],
            [path.posix.resolve,
                // arguments                    result
                [[['/var/lib', '../', 'file/'], '/var/file'],
                    [['/var/lib', '/../', 'file/'], '/file'],
                    [['/some/dir', '.', '/absolute/'], '/absolute'],
                    [['/foo/tmp.3/', '../tmp.3/cycles/root.js'], '/foo/tmp.3/cycles/root.js']
                ]
            ],
            [(isWeb ? path.posix.resolve : path.resolve),
                // arguments						result
                [[['.'], process.cwd()],
                    [['a/b/c', '../../..'], process.cwd()]
                ]
            ],
        ];
        resolveTests.forEach((test) => {
            const resolve = test[0];
            //@ts-expect-error
            test[1].forEach((test) => {
                //@ts-expect-error
                const actual = resolve.apply(null, test[0]);
                let actualAlt;
                const os = resolve === path.win32.resolve ? 'win32' : 'posix';
                if (resolve === path.win32.resolve && !isWindows) {
                    actualAlt = actual.replace(backslashRE, '/');
                }
                else if (resolve !== path.win32.resolve && isWindows) {
                    actualAlt = actual.replace(slashRE, '\\');
                }
                const expected = test[1];
                const message = `path.${os}.resolve(${test[0].map(JSON.stringify).join(',')})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                if (actual !== expected && actualAlt !== expected) {
                    failures.push(`\n${message}`);
                }
            });
        });
        assert.strictEqual(failures.length, 0, failures.join(''));
        // if (isWindows) {
        // 	// Test resolving the current Windows drive letter from a spawned process.
        // 	// See https://github.com/nodejs/node/issues/7215
        // 	const currentDriveLetter = path.parse(process.cwd()).root.substring(0, 2);
        // 	const resolveFixture = fixtures.path('path-resolve.js');
        // 	const spawnResult = child.spawnSync(
        // 		process.argv[0], [resolveFixture, currentDriveLetter]);
        // 	const resolvedPath = spawnResult.stdout.toString().trim();
        // 	assert.strictEqual(resolvedPath.toLowerCase(), process.cwd().toLowerCase());
        // }
    });
    test('basename', () => {
        assert.strictEqual(path.basename(__filename), 'path.test.js');
        assert.strictEqual(path.basename(__filename, '.js'), 'path.test');
        assert.strictEqual(path.basename('.js', '.js'), '');
        assert.strictEqual(path.basename(''), '');
        assert.strictEqual(path.basename('/dir/basename.ext'), 'basename.ext');
        assert.strictEqual(path.basename('/basename.ext'), 'basename.ext');
        assert.strictEqual(path.basename('basename.ext'), 'basename.ext');
        assert.strictEqual(path.basename('basename.ext/'), 'basename.ext');
        assert.strictEqual(path.basename('basename.ext//'), 'basename.ext');
        assert.strictEqual(path.basename('aaa/bbb', '/bbb'), 'bbb');
        assert.strictEqual(path.basename('aaa/bbb', 'a/bbb'), 'bbb');
        assert.strictEqual(path.basename('aaa/bbb', 'bbb'), 'bbb');
        assert.strictEqual(path.basename('aaa/bbb//', 'bbb'), 'bbb');
        assert.strictEqual(path.basename('aaa/bbb', 'bb'), 'b');
        assert.strictEqual(path.basename('aaa/bbb', 'b'), 'bb');
        assert.strictEqual(path.basename('/aaa/bbb', '/bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/bbb', 'a/bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/bbb', 'bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/bbb//', 'bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/bbb', 'bb'), 'b');
        assert.strictEqual(path.basename('/aaa/bbb', 'b'), 'bb');
        assert.strictEqual(path.basename('/aaa/bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/'), 'aaa');
        assert.strictEqual(path.basename('/aaa/b'), 'b');
        assert.strictEqual(path.basename('/a/b'), 'b');
        assert.strictEqual(path.basename('//a'), 'a');
        assert.strictEqual(path.basename('a', 'a'), '');
        // On Windows a backslash acts as a path separator.
        assert.strictEqual(path.win32.basename('\\dir\\basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('\\basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('basename.ext\\'), 'basename.ext');
        assert.strictEqual(path.win32.basename('basename.ext\\\\'), 'basename.ext');
        assert.strictEqual(path.win32.basename('foo'), 'foo');
        assert.strictEqual(path.win32.basename('aaa\\bbb', '\\bbb'), 'bbb');
        assert.strictEqual(path.win32.basename('aaa\\bbb', 'a\\bbb'), 'bbb');
        assert.strictEqual(path.win32.basename('aaa\\bbb', 'bbb'), 'bbb');
        assert.strictEqual(path.win32.basename('aaa\\bbb\\\\\\\\', 'bbb'), 'bbb');
        assert.strictEqual(path.win32.basename('aaa\\bbb', 'bb'), 'b');
        assert.strictEqual(path.win32.basename('aaa\\bbb', 'b'), 'bb');
        assert.strictEqual(path.win32.basename('C:'), '');
        assert.strictEqual(path.win32.basename('C:.'), '.');
        assert.strictEqual(path.win32.basename('C:\\'), '');
        assert.strictEqual(path.win32.basename('C:\\dir\\base.ext'), 'base.ext');
        assert.strictEqual(path.win32.basename('C:\\basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('C:basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('C:basename.ext\\'), 'basename.ext');
        assert.strictEqual(path.win32.basename('C:basename.ext\\\\'), 'basename.ext');
        assert.strictEqual(path.win32.basename('C:foo'), 'foo');
        assert.strictEqual(path.win32.basename('file:stream'), 'file:stream');
        assert.strictEqual(path.win32.basename('a', 'a'), '');
        // On unix a backslash is just treated as any other character.
        assert.strictEqual(path.posix.basename('\\dir\\basename.ext'), '\\dir\\basename.ext');
        assert.strictEqual(path.posix.basename('\\basename.ext'), '\\basename.ext');
        assert.strictEqual(path.posix.basename('basename.ext'), 'basename.ext');
        assert.strictEqual(path.posix.basename('basename.ext\\'), 'basename.ext\\');
        assert.strictEqual(path.posix.basename('basename.ext\\\\'), 'basename.ext\\\\');
        assert.strictEqual(path.posix.basename('foo'), 'foo');
        // POSIX filenames may include control characters
        // c.f. http://www.dwheeler.com/essays/fixing-unix-linux-filenames.html
        const controlCharFilename = `Icon${String.fromCharCode(13)}`;
        assert.strictEqual(path.posix.basename(`/a/b/${controlCharFilename}`), controlCharFilename);
        // Tests from VSCode
        assert.strictEqual(path.basename('foo/bar'), 'bar');
        assert.strictEqual(path.posix.basename('foo\\bar'), 'foo\\bar');
        assert.strictEqual(path.win32.basename('foo\\bar'), 'bar');
        assert.strictEqual(path.basename('/foo/bar'), 'bar');
        assert.strictEqual(path.posix.basename('\\foo\\bar'), '\\foo\\bar');
        assert.strictEqual(path.win32.basename('\\foo\\bar'), 'bar');
        assert.strictEqual(path.basename('./bar'), 'bar');
        assert.strictEqual(path.posix.basename('.\\bar'), '.\\bar');
        assert.strictEqual(path.win32.basename('.\\bar'), 'bar');
        assert.strictEqual(path.basename('/bar'), 'bar');
        assert.strictEqual(path.posix.basename('\\bar'), '\\bar');
        assert.strictEqual(path.win32.basename('\\bar'), 'bar');
        assert.strictEqual(path.basename('bar/'), 'bar');
        assert.strictEqual(path.posix.basename('bar\\'), 'bar\\');
        assert.strictEqual(path.win32.basename('bar\\'), 'bar');
        assert.strictEqual(path.basename('bar'), 'bar');
        assert.strictEqual(path.basename('////////'), '');
        assert.strictEqual(path.posix.basename('\\\\\\\\'), '\\\\\\\\');
        assert.strictEqual(path.win32.basename('\\\\\\\\'), '');
    });
    test('relative', () => {
        const failures = [];
        const relativeTests = [
            [path.win32.relative,
                // arguments                     result
                [['c:/blah\\blah', 'd:/games', 'd:\\games'],
                    ['c:/aaaa/bbbb', 'c:/aaaa', '..'],
                    ['c:/aaaa/bbbb', 'c:/cccc', '..\\..\\cccc'],
                    ['c:/aaaa/bbbb', 'c:/aaaa/bbbb', ''],
                    ['c:/aaaa/bbbb', 'c:/aaaa/cccc', '..\\cccc'],
                    ['c:/aaaa/', 'c:/aaaa/cccc', 'cccc'],
                    ['c:/', 'c:\\aaaa\\bbbb', 'aaaa\\bbbb'],
                    ['c:/aaaa/bbbb', 'd:\\', 'd:\\'],
                    ['c:/AaAa/bbbb', 'c:/aaaa/bbbb', ''],
                    ['c:/aaaaa/', 'c:/aaaa/cccc', '..\\aaaa\\cccc'],
                    ['C:\\foo\\bar\\baz\\quux', 'C:\\', '..\\..\\..\\..'],
                    ['C:\\foo\\test', 'C:\\foo\\test\\bar\\package.json', 'bar\\package.json'],
                    ['C:\\foo\\bar\\baz-quux', 'C:\\foo\\bar\\baz', '..\\baz'],
                    ['C:\\foo\\bar\\baz', 'C:\\foo\\bar\\baz-quux', '..\\baz-quux'],
                    ['\\\\foo\\bar', '\\\\foo\\bar\\baz', 'baz'],
                    ['\\\\foo\\bar\\baz', '\\\\foo\\bar', '..'],
                    ['\\\\foo\\bar\\baz-quux', '\\\\foo\\bar\\baz', '..\\baz'],
                    ['\\\\foo\\bar\\baz', '\\\\foo\\bar\\baz-quux', '..\\baz-quux'],
                    ['C:\\baz-quux', 'C:\\baz', '..\\baz'],
                    ['C:\\baz', 'C:\\baz-quux', '..\\baz-quux'],
                    ['\\\\foo\\baz-quux', '\\\\foo\\baz', '..\\baz'],
                    ['\\\\foo\\baz', '\\\\foo\\baz-quux', '..\\baz-quux'],
                    ['C:\\baz', '\\\\foo\\bar\\baz', '\\\\foo\\bar\\baz'],
                    ['\\\\foo\\bar\\baz', 'C:\\baz', 'C:\\baz']
                ]
            ],
            [path.posix.relative,
                // arguments          result
                [['/var/lib', '/var', '..'],
                    ['/var/lib', '/bin', '../../bin'],
                    ['/var/lib', '/var/lib', ''],
                    ['/var/lib', '/var/apache', '../apache'],
                    ['/var/', '/var/lib', 'lib'],
                    ['/', '/var/lib', 'var/lib'],
                    ['/foo/test', '/foo/test/bar/package.json', 'bar/package.json'],
                    ['/Users/a/web/b/test/mails', '/Users/a/web/b', '../..'],
                    ['/foo/bar/baz-quux', '/foo/bar/baz', '../baz'],
                    ['/foo/bar/baz', '/foo/bar/baz-quux', '../baz-quux'],
                    ['/baz-quux', '/baz', '../baz'],
                    ['/baz', '/baz-quux', '../baz-quux']
                ]
            ]
        ];
        relativeTests.forEach((test) => {
            const relative = test[0];
            //@ts-expect-error
            test[1].forEach((test) => {
                //@ts-expect-error
                const actual = relative(test[0], test[1]);
                const expected = test[2];
                const os = relative === path.win32.relative ? 'win32' : 'posix';
                const message = `path.${os}.relative(${test.slice(0, 2).map(JSON.stringify).join(',')})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                if (actual !== expected) {
                    failures.push(`\n${message}`);
                }
            });
        });
        assert.strictEqual(failures.length, 0, failures.join(''));
    });
    test('normalize', () => {
        assert.strictEqual(path.win32.normalize('./fixtures///b/../b/c.js'), 'fixtures\\b\\c.js');
        assert.strictEqual(path.win32.normalize('/foo/../../../bar'), '\\bar');
        assert.strictEqual(path.win32.normalize('a//b//../b'), 'a\\b');
        assert.strictEqual(path.win32.normalize('a//b//./c'), 'a\\b\\c');
        assert.strictEqual(path.win32.normalize('a//b//.'), 'a\\b');
        assert.strictEqual(path.win32.normalize('//server/share/dir/file.ext'), '\\\\server\\share\\dir\\file.ext');
        assert.strictEqual(path.win32.normalize('/a/b/c/../../../x/y/z'), '\\x\\y\\z');
        assert.strictEqual(path.win32.normalize('C:'), 'C:.');
        assert.strictEqual(path.win32.normalize('C:..\\abc'), 'C:..\\abc');
        assert.strictEqual(path.win32.normalize('C:..\\..\\abc\\..\\def'), 'C:..\\..\\def');
        assert.strictEqual(path.win32.normalize('C:\\.'), 'C:\\');
        assert.strictEqual(path.win32.normalize('file:stream'), 'file:stream');
        assert.strictEqual(path.win32.normalize('bar\\foo..\\..\\'), 'bar\\');
        assert.strictEqual(path.win32.normalize('bar\\foo..\\..'), 'bar');
        assert.strictEqual(path.win32.normalize('bar\\foo..\\..\\baz'), 'bar\\baz');
        assert.strictEqual(path.win32.normalize('bar\\foo..\\'), 'bar\\foo..\\');
        assert.strictEqual(path.win32.normalize('bar\\foo..'), 'bar\\foo..');
        assert.strictEqual(path.win32.normalize('..\\foo..\\..\\..\\bar'), '..\\..\\bar');
        assert.strictEqual(path.win32.normalize('..\\...\\..\\.\\...\\..\\..\\bar'), '..\\..\\bar');
        assert.strictEqual(path.win32.normalize('../../../foo/../../../bar'), '..\\..\\..\\..\\..\\bar');
        assert.strictEqual(path.win32.normalize('../../../foo/../../../bar/../../'), '..\\..\\..\\..\\..\\..\\');
        assert.strictEqual(path.win32.normalize('../foobar/barfoo/foo/../../../bar/../../'), '..\\..\\');
        assert.strictEqual(path.win32.normalize('../.../../foobar/../../../bar/../../baz'), '..\\..\\..\\..\\baz');
        assert.strictEqual(path.win32.normalize('foo/bar\\baz'), 'foo\\bar\\baz');
        assert.strictEqual(path.posix.normalize('./fixtures///b/../b/c.js'), 'fixtures/b/c.js');
        assert.strictEqual(path.posix.normalize('/foo/../../../bar'), '/bar');
        assert.strictEqual(path.posix.normalize('a//b//../b'), 'a/b');
        assert.strictEqual(path.posix.normalize('a//b//./c'), 'a/b/c');
        assert.strictEqual(path.posix.normalize('a//b//.'), 'a/b');
        assert.strictEqual(path.posix.normalize('/a/b/c/../../../x/y/z'), '/x/y/z');
        assert.strictEqual(path.posix.normalize('///..//./foo/.//bar'), '/foo/bar');
        assert.strictEqual(path.posix.normalize('bar/foo../../'), 'bar/');
        assert.strictEqual(path.posix.normalize('bar/foo../..'), 'bar');
        assert.strictEqual(path.posix.normalize('bar/foo../../baz'), 'bar/baz');
        assert.strictEqual(path.posix.normalize('bar/foo../'), 'bar/foo../');
        assert.strictEqual(path.posix.normalize('bar/foo..'), 'bar/foo..');
        assert.strictEqual(path.posix.normalize('../foo../../../bar'), '../../bar');
        assert.strictEqual(path.posix.normalize('../.../.././.../../../bar'), '../../bar');
        assert.strictEqual(path.posix.normalize('../../../foo/../../../bar'), '../../../../../bar');
        assert.strictEqual(path.posix.normalize('../../../foo/../../../bar/../../'), '../../../../../../');
        assert.strictEqual(path.posix.normalize('../foobar/barfoo/foo/../../../bar/../../'), '../../');
        assert.strictEqual(path.posix.normalize('../.../../foobar/../../../bar/../../baz'), '../../../../baz');
        assert.strictEqual(path.posix.normalize('foo/bar\\baz'), 'foo/bar\\baz');
    });
    test('isAbsolute', () => {
        assert.strictEqual(path.win32.isAbsolute('/'), true);
        assert.strictEqual(path.win32.isAbsolute('//'), true);
        assert.strictEqual(path.win32.isAbsolute('//server'), true);
        assert.strictEqual(path.win32.isAbsolute('//server/file'), true);
        assert.strictEqual(path.win32.isAbsolute('\\\\server\\file'), true);
        assert.strictEqual(path.win32.isAbsolute('\\\\server'), true);
        assert.strictEqual(path.win32.isAbsolute('\\\\'), true);
        assert.strictEqual(path.win32.isAbsolute('c'), false);
        assert.strictEqual(path.win32.isAbsolute('c:'), false);
        assert.strictEqual(path.win32.isAbsolute('c:\\'), true);
        assert.strictEqual(path.win32.isAbsolute('c:/'), true);
        assert.strictEqual(path.win32.isAbsolute('c://'), true);
        assert.strictEqual(path.win32.isAbsolute('C:/Users/'), true);
        assert.strictEqual(path.win32.isAbsolute('C:\\Users\\'), true);
        assert.strictEqual(path.win32.isAbsolute('C:cwd/another'), false);
        assert.strictEqual(path.win32.isAbsolute('C:cwd\\another'), false);
        assert.strictEqual(path.win32.isAbsolute('directory/directory'), false);
        assert.strictEqual(path.win32.isAbsolute('directory\\directory'), false);
        assert.strictEqual(path.posix.isAbsolute('/home/foo'), true);
        assert.strictEqual(path.posix.isAbsolute('/home/foo/..'), true);
        assert.strictEqual(path.posix.isAbsolute('bar/'), false);
        assert.strictEqual(path.posix.isAbsolute('./baz'), false);
        // Tests from VSCode:
        // Absolute Paths
        [
            'C:/',
            'C:\\',
            'C:/foo',
            'C:\\foo',
            'z:/foo/bar.txt',
            'z:\\foo\\bar.txt',
            '\\\\localhost\\c$\\foo',
            '/',
            '/foo'
        ].forEach(absolutePath => {
            assert.ok(path.win32.isAbsolute(absolutePath), absolutePath);
        });
        [
            '/',
            '/foo',
            '/foo/bar.txt'
        ].forEach(absolutePath => {
            assert.ok(path.posix.isAbsolute(absolutePath), absolutePath);
        });
        // Relative Paths
        [
            '',
            'foo',
            'foo/bar',
            './foo',
            'http://foo.com/bar'
        ].forEach(nonAbsolutePath => {
            assert.ok(!path.win32.isAbsolute(nonAbsolutePath), nonAbsolutePath);
        });
        [
            '',
            'foo',
            'foo/bar',
            './foo',
            'http://foo.com/bar',
            'z:/foo/bar.txt',
        ].forEach(nonAbsolutePath => {
            assert.ok(!path.posix.isAbsolute(nonAbsolutePath), nonAbsolutePath);
        });
    });
    test('path', () => {
        // path.sep tests
        // windows
        assert.strictEqual(path.win32.sep, '\\');
        // posix
        assert.strictEqual(path.posix.sep, '/');
        // path.delimiter tests
        // windows
        assert.strictEqual(path.win32.delimiter, ';');
        // posix
        assert.strictEqual(path.posix.delimiter, ':');
        // if (isWindows) {
        // 	assert.strictEqual(path, path.win32);
        // } else {
        // 	assert.strictEqual(path, path.posix);
        // }
    });
    // test('perf', () => {
    // 	const folderNames = [
    // 		'abc',
    // 		'Users',
    // 		'reallylongfoldername',
    // 		's',
    // 		'reallyreallyreallylongfoldername',
    // 		'home'
    // 	];
    // 	const basePaths = [
    // 		'C:',
    // 		'',
    // 	];
    // 	const separators = [
    // 		'\\',
    // 		'/'
    // 	];
    // 	function randomInt(ciel: number): number {
    // 		return Math.floor(Math.random() * ciel);
    // 	}
    // 	let pathsToNormalize = [];
    // 	let pathsToJoin = [];
    // 	let i;
    // 	for (i = 0; i < 1000000; i++) {
    // 		const basePath = basePaths[randomInt(basePaths.length)];
    // 		let lengthOfPath = randomInt(10) + 2;
    // 		let pathToNormalize = basePath + separators[randomInt(separators.length)];
    // 		while (lengthOfPath-- > 0) {
    // 			pathToNormalize = pathToNormalize + folderNames[randomInt(folderNames.length)] + separators[randomInt(separators.length)];
    // 		}
    // 		pathsToNormalize.push(pathToNormalize);
    // 		let pathToJoin = '';
    // 		lengthOfPath = randomInt(10) + 2;
    // 		while (lengthOfPath-- > 0) {
    // 			pathToJoin = pathToJoin + folderNames[randomInt(folderNames.length)] + separators[randomInt(separators.length)];
    // 		}
    // 		pathsToJoin.push(pathToJoin + '.ts');
    // 	}
    // 	let newTime = 0;
    // 	let j;
    // 	for(j = 0; j < pathsToJoin.length; j++) {
    // 		const path1 = pathsToNormalize[j];
    // 		const path2 = pathsToNormalize[j];
    // 		const newStart = performance.now();
    // 		path.join(path1, path2);
    // 		newTime += performance.now() - newStart;
    // 	}
    // 	assert.ok(false, `Time: ${newTime}ms.`);
    // });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vcGF0aC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLHlGQUF5RjtBQUN6Riw0RkFBNEY7QUFFNUYsc0RBQXNEO0FBQ3RELEVBQUU7QUFDRiwwRUFBMEU7QUFDMUUsZ0VBQWdFO0FBQ2hFLHNFQUFzRTtBQUN0RSxzRUFBc0U7QUFDdEUsNEVBQTRFO0FBQzVFLHFFQUFxRTtBQUNyRSx3QkFBd0I7QUFDeEIsRUFBRTtBQUNGLDBFQUEwRTtBQUMxRSx5REFBeUQ7QUFDekQsRUFBRTtBQUNGLDBFQUEwRTtBQUMxRSw2REFBNkQ7QUFDN0QsNEVBQTRFO0FBQzVFLDJFQUEyRTtBQUMzRSx3RUFBd0U7QUFDeEUsNEVBQTRFO0FBQzVFLHlDQUF5QztBQUV6QyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLElBQUksTUFBTSxzQkFBc0IsQ0FBQztBQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzVELE9BQU8sS0FBSyxPQUFPLE1BQU0seUJBQXlCLENBQUM7QUFDbkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDO0lBQ2xDLHVDQUF1QyxFQUFFLENBQUM7SUFDMUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDakIsTUFBTSxRQUFRLEdBQUcsRUFBYyxDQUFDO1FBQ2hDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQztRQUUxQixNQUFNLFNBQVMsR0FBUTtZQUN0QixDQUFD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Q0FBQyxVQUFVLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFD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QztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMs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