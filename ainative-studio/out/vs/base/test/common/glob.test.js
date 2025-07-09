/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as glob from '../../common/glob.js';
import { sep } from '../../common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Glob', () => {
    // test('perf', () => {
    // 	let patterns = [
    // 		'{**/*.cs,**/*.json,**/*.csproj,**/*.sln}',
    // 		'{**/*.cs,**/*.csproj,**/*.sln}',
    // 		'{**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.es6,**/*.mjs,**/*.cjs}',
    // 		'**/*.go',
    // 		'{**/*.ps,**/*.ps1}',
    // 		'{**/*.c,**/*.cpp,**/*.h}',
    // 		'{**/*.fsx,**/*.fsi,**/*.fs,**/*.ml,**/*.mli}',
    // 		'{**/*.js,**/*.jsx,**/*.es6,**/*.mjs,**/*.cjs}',
    // 		'{**/*.ts,**/*.tsx}',
    // 		'{**/*.php}',
    // 		'{**/*.php}',
    // 		'{**/*.php}',
    // 		'{**/*.php}',
    // 		'{**/*.py}',
    // 		'{**/*.py}',
    // 		'{**/*.py}',
    // 		'{**/*.rs,**/*.rslib}',
    // 		'{**/*.cpp,**/*.cc,**/*.h}',
    // 		'{**/*.md}',
    // 		'{**/*.md}',
    // 		'{**/*.md}'
    // 	];
    // 	let paths = [
    // 		'/DNXConsoleApp/Program.cs',
    // 		'C:\\DNXConsoleApp\\foo\\Program.cs',
    // 		'test/qunit',
    // 		'test/test.txt',
    // 		'test/node_modules',
    // 		'.hidden.txt',
    // 		'/node_module/test/foo.js'
    // 	];
    // 	let results = 0;
    // 	let c = 1000;
    // 	console.profile('glob.match');
    // 	while (c-- > 0) {
    // 		for (let path of paths) {
    // 			for (let pattern of patterns) {
    // 				let r = glob.match(pattern, path);
    // 				if (r) {
    // 					results += 42;
    // 				}
    // 			}
    // 		}
    // 	}
    // 	console.profileEnd();
    // });
    function assertGlobMatch(pattern, input) {
        assert(glob.match(pattern, input), `${JSON.stringify(pattern)} should match ${input}`);
        assert(glob.match(pattern, nativeSep(input)), `${pattern} should match ${nativeSep(input)}`);
    }
    function assertNoGlobMatch(pattern, input) {
        assert(!glob.match(pattern, input), `${pattern} should not match ${input}`);
        assert(!glob.match(pattern, nativeSep(input)), `${pattern} should not match ${nativeSep(input)}`);
    }
    test('simple', () => {
        let p = 'node_modules';
        assertGlobMatch(p, 'node_modules');
        assertNoGlobMatch(p, 'node_module');
        assertNoGlobMatch(p, '/node_modules');
        assertNoGlobMatch(p, 'test/node_modules');
        p = 'test.txt';
        assertGlobMatch(p, 'test.txt');
        assertNoGlobMatch(p, 'test?txt');
        assertNoGlobMatch(p, '/text.txt');
        assertNoGlobMatch(p, 'test/test.txt');
        p = 'test(.txt';
        assertGlobMatch(p, 'test(.txt');
        assertNoGlobMatch(p, 'test?txt');
        p = 'qunit';
        assertGlobMatch(p, 'qunit');
        assertNoGlobMatch(p, 'qunit.css');
        assertNoGlobMatch(p, 'test/qunit');
        // Absolute
        p = '/DNXConsoleApp/**/*.cs';
        assertGlobMatch(p, '/DNXConsoleApp/Program.cs');
        assertGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
        p = 'C:/DNXConsoleApp/**/*.cs';
        assertGlobMatch(p, 'C:\\DNXConsoleApp\\Program.cs');
        assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
        p = '*';
        assertGlobMatch(p, '');
    });
    test('dot hidden', function () {
        let p = '.*';
        assertGlobMatch(p, '.git');
        assertGlobMatch(p, '.hidden.txt');
        assertNoGlobMatch(p, 'git');
        assertNoGlobMatch(p, 'hidden.txt');
        assertNoGlobMatch(p, 'path/.git');
        assertNoGlobMatch(p, 'path/.hidden.txt');
        p = '**/.*';
        assertGlobMatch(p, '.git');
        assertGlobMatch(p, '/.git');
        assertGlobMatch(p, '.hidden.txt');
        assertNoGlobMatch(p, 'git');
        assertNoGlobMatch(p, 'hidden.txt');
        assertGlobMatch(p, 'path/.git');
        assertGlobMatch(p, 'path/.hidden.txt');
        assertGlobMatch(p, '/path/.git');
        assertGlobMatch(p, '/path/.hidden.txt');
        assertNoGlobMatch(p, 'path/git');
        assertNoGlobMatch(p, 'pat.h/hidden.txt');
        p = '._*';
        assertGlobMatch(p, '._git');
        assertGlobMatch(p, '._hidden.txt');
        assertNoGlobMatch(p, 'git');
        assertNoGlobMatch(p, 'hidden.txt');
        assertNoGlobMatch(p, 'path/._git');
        assertNoGlobMatch(p, 'path/._hidden.txt');
        p = '**/._*';
        assertGlobMatch(p, '._git');
        assertGlobMatch(p, '._hidden.txt');
        assertNoGlobMatch(p, 'git');
        assertNoGlobMatch(p, 'hidden._txt');
        assertGlobMatch(p, 'path/._git');
        assertGlobMatch(p, 'path/._hidden.txt');
        assertGlobMatch(p, '/path/._git');
        assertGlobMatch(p, '/path/._hidden.txt');
        assertNoGlobMatch(p, 'path/git');
        assertNoGlobMatch(p, 'pat.h/hidden._txt');
    });
    test('file pattern', function () {
        let p = '*.js';
        assertGlobMatch(p, 'foo.js');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = 'html.*';
        assertGlobMatch(p, 'html.js');
        assertGlobMatch(p, 'html.txt');
        assertNoGlobMatch(p, 'htm.txt');
        p = '*.*';
        assertGlobMatch(p, 'html.js');
        assertGlobMatch(p, 'html.txt');
        assertGlobMatch(p, 'htm.txt');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
        p = 'node_modules/test/*.js';
        assertGlobMatch(p, 'node_modules/test/foo.js');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_module/test/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
    });
    test('star', () => {
        let p = 'node*modules';
        assertGlobMatch(p, 'node_modules');
        assertGlobMatch(p, 'node_super_modules');
        assertNoGlobMatch(p, 'node_module');
        assertNoGlobMatch(p, '/node_modules');
        assertNoGlobMatch(p, 'test/node_modules');
        p = '*';
        assertGlobMatch(p, 'html.js');
        assertGlobMatch(p, 'html.txt');
        assertGlobMatch(p, 'htm.txt');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
    });
    test('file / folder match', function () {
        const p = '**/node_modules/**';
        assertGlobMatch(p, 'node_modules');
        assertGlobMatch(p, 'node_modules/');
        assertGlobMatch(p, 'a/node_modules');
        assertGlobMatch(p, 'a/node_modules/');
        assertGlobMatch(p, 'node_modules/foo');
        assertGlobMatch(p, 'foo/node_modules/foo/bar');
        assertGlobMatch(p, '/node_modules');
        assertGlobMatch(p, '/node_modules/');
        assertGlobMatch(p, '/a/node_modules');
        assertGlobMatch(p, '/a/node_modules/');
        assertGlobMatch(p, '/node_modules/foo');
        assertGlobMatch(p, '/foo/node_modules/foo/bar');
    });
    test('questionmark', () => {
        let p = 'node?modules';
        assertGlobMatch(p, 'node_modules');
        assertNoGlobMatch(p, 'node_super_modules');
        assertNoGlobMatch(p, 'node_module');
        assertNoGlobMatch(p, '/node_modules');
        assertNoGlobMatch(p, 'test/node_modules');
        p = '?';
        assertGlobMatch(p, 'h');
        assertNoGlobMatch(p, 'html.txt');
        assertNoGlobMatch(p, 'htm.txt');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
    });
    test('globstar', () => {
        let p = '**/*.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, '/foo.js');
        assertGlobMatch(p, 'folder/foo.js');
        assertGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        assertNoGlobMatch(p, '/some.js/test');
        assertNoGlobMatch(p, '\\some.js\\test');
        p = '**/project.json';
        assertGlobMatch(p, 'project.json');
        assertGlobMatch(p, '/project.json');
        assertGlobMatch(p, 'some/folder/project.json');
        assertGlobMatch(p, '/some/folder/project.json');
        assertNoGlobMatch(p, 'some/folder/file_project.json');
        assertNoGlobMatch(p, 'some/folder/fileproject.json');
        assertNoGlobMatch(p, 'some/rrproject.json');
        assertNoGlobMatch(p, 'some\\rrproject.json');
        p = 'test/**';
        assertGlobMatch(p, 'test');
        assertGlobMatch(p, 'test/foo');
        assertGlobMatch(p, 'test/foo/');
        assertGlobMatch(p, 'test/foo.js');
        assertGlobMatch(p, 'test/other/foo.js');
        assertNoGlobMatch(p, 'est/other/foo.js');
        p = '**';
        assertGlobMatch(p, '/');
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'folder/foo.js');
        assertGlobMatch(p, 'folder/foo/');
        assertGlobMatch(p, '/node_modules/foo.js');
        assertGlobMatch(p, 'foo.jss');
        assertGlobMatch(p, 'some.js/test');
        p = 'test/**/*.js';
        assertGlobMatch(p, 'test/foo.js');
        assertGlobMatch(p, 'test/other/foo.js');
        assertGlobMatch(p, 'test/other/more/foo.js');
        assertNoGlobMatch(p, 'test/foo.ts');
        assertNoGlobMatch(p, 'test/other/foo.ts');
        assertNoGlobMatch(p, 'test/other/more/foo.ts');
        p = '**/**/*.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, '/foo.js');
        assertGlobMatch(p, 'folder/foo.js');
        assertGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = '**/node_modules/**/*.js';
        assertNoGlobMatch(p, 'foo.js');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertGlobMatch(p, 'node_modules/foo.js');
        assertGlobMatch(p, '/node_modules/foo.js');
        assertGlobMatch(p, 'node_modules/some/folder/foo.js');
        assertGlobMatch(p, '/node_modules/some/folder/foo.js');
        assertNoGlobMatch(p, 'node_modules/some/folder/foo.ts');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = '{**/node_modules/**,**/.git/**,**/bower_components/**}';
        assertGlobMatch(p, 'node_modules');
        assertGlobMatch(p, '/node_modules');
        assertGlobMatch(p, '/node_modules/more');
        assertGlobMatch(p, 'some/test/node_modules');
        assertGlobMatch(p, 'some\\test\\node_modules');
        assertGlobMatch(p, '/some/test/node_modules');
        assertGlobMatch(p, '\\some\\test\\node_modules');
        assertGlobMatch(p, 'C:\\\\some\\test\\node_modules');
        assertGlobMatch(p, 'C:\\\\some\\test\\node_modules\\more');
        assertGlobMatch(p, 'bower_components');
        assertGlobMatch(p, 'bower_components/more');
        assertGlobMatch(p, '/bower_components');
        assertGlobMatch(p, 'some/test/bower_components');
        assertGlobMatch(p, 'some\\test\\bower_components');
        assertGlobMatch(p, '/some/test/bower_components');
        assertGlobMatch(p, '\\some\\test\\bower_components');
        assertGlobMatch(p, 'C:\\\\some\\test\\bower_components');
        assertGlobMatch(p, 'C:\\\\some\\test\\bower_components\\more');
        assertGlobMatch(p, '.git');
        assertGlobMatch(p, '/.git');
        assertGlobMatch(p, 'some/test/.git');
        assertGlobMatch(p, 'some\\test\\.git');
        assertGlobMatch(p, '/some/test/.git');
        assertGlobMatch(p, '\\some\\test\\.git');
        assertGlobMatch(p, 'C:\\\\some\\test\\.git');
        assertNoGlobMatch(p, 'tempting');
        assertNoGlobMatch(p, '/tempting');
        assertNoGlobMatch(p, 'some/test/tempting');
        assertNoGlobMatch(p, 'some\\test\\tempting');
        assertNoGlobMatch(p, '/some/test/tempting');
        assertNoGlobMatch(p, '\\some\\test\\tempting');
        assertNoGlobMatch(p, 'C:\\\\some\\test\\tempting');
        p = '{**/package.json,**/project.json}';
        assertGlobMatch(p, 'package.json');
        assertGlobMatch(p, '/package.json');
        assertNoGlobMatch(p, 'xpackage.json');
        assertNoGlobMatch(p, '/xpackage.json');
    });
    test('issue 41724', function () {
        let p = 'some/**/*.js';
        assertGlobMatch(p, 'some/foo.js');
        assertGlobMatch(p, 'some/folder/foo.js');
        assertNoGlobMatch(p, 'something/foo.js');
        assertNoGlobMatch(p, 'something/folder/foo.js');
        p = 'some/**/*';
        assertGlobMatch(p, 'some/foo.js');
        assertGlobMatch(p, 'some/folder/foo.js');
        assertNoGlobMatch(p, 'something/foo.js');
        assertNoGlobMatch(p, 'something/folder/foo.js');
    });
    test('brace expansion', function () {
        let p = '*.{html,js}';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'foo.html');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = '*.{html}';
        assertGlobMatch(p, 'foo.html');
        assertNoGlobMatch(p, 'foo.js');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = '{node_modules,testing}';
        assertGlobMatch(p, 'node_modules');
        assertGlobMatch(p, 'testing');
        assertNoGlobMatch(p, 'node_module');
        assertNoGlobMatch(p, 'dtesting');
        p = '**/{foo,bar}';
        assertGlobMatch(p, 'foo');
        assertGlobMatch(p, 'bar');
        assertGlobMatch(p, 'test/foo');
        assertGlobMatch(p, 'test/bar');
        assertGlobMatch(p, 'other/more/foo');
        assertGlobMatch(p, 'other/more/bar');
        assertGlobMatch(p, '/foo');
        assertGlobMatch(p, '/bar');
        assertGlobMatch(p, '/test/foo');
        assertGlobMatch(p, '/test/bar');
        assertGlobMatch(p, '/other/more/foo');
        assertGlobMatch(p, '/other/more/bar');
        p = '{foo,bar}/**';
        assertGlobMatch(p, 'foo');
        assertGlobMatch(p, 'bar');
        assertGlobMatch(p, 'bar/');
        assertGlobMatch(p, 'foo/test');
        assertGlobMatch(p, 'bar/test');
        assertGlobMatch(p, 'bar/test/');
        assertGlobMatch(p, 'foo/other/more');
        assertGlobMatch(p, 'bar/other/more');
        assertGlobMatch(p, 'bar/other/more/');
        p = '{**/*.d.ts,**/*.js}';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        assertGlobMatch(p, 'foo.d.ts');
        assertGlobMatch(p, 'testing/foo.d.ts');
        assertGlobMatch(p, 'testing\\foo.d.ts');
        assertGlobMatch(p, '/testing/foo.d.ts');
        assertGlobMatch(p, '\\testing\\foo.d.ts');
        assertGlobMatch(p, 'C:\\testing\\foo.d.ts');
        assertNoGlobMatch(p, 'foo.d');
        assertNoGlobMatch(p, 'testing/foo.d');
        assertNoGlobMatch(p, 'testing\\foo.d');
        assertNoGlobMatch(p, '/testing/foo.d');
        assertNoGlobMatch(p, '\\testing\\foo.d');
        assertNoGlobMatch(p, 'C:\\testing\\foo.d');
        p = '{**/*.d.ts,**/*.js,path/simple.jgs}';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, 'path/simple.jgs');
        assertNoGlobMatch(p, '/path/simple.jgs');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        p = '{**/*.d.ts,**/*.js,foo.[0-9]}';
        assertGlobMatch(p, 'foo.5');
        assertGlobMatch(p, 'foo.8');
        assertNoGlobMatch(p, 'bar.5');
        assertNoGlobMatch(p, 'foo.f');
        assertGlobMatch(p, 'foo.js');
        p = 'prefix/{**/*.d.ts,**/*.js,foo.[0-9]}';
        assertGlobMatch(p, 'prefix/foo.5');
        assertGlobMatch(p, 'prefix/foo.8');
        assertNoGlobMatch(p, 'prefix/bar.5');
        assertNoGlobMatch(p, 'prefix/foo.f');
        assertGlobMatch(p, 'prefix/foo.js');
    });
    test('expression support (single)', function () {
        const siblings = ['test.html', 'test.txt', 'test.ts', 'test.js'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        // { "**/*.js": { "when": "$(basename).ts" } }
        let expression = {
            '**/*.js': {
                when: '$(basename).ts'
            }
        };
        assert.strictEqual('**/*.js', glob.match(expression, 'test.js', hasSibling));
        assert.strictEqual(glob.match(expression, 'test.js', () => false), null);
        assert.strictEqual(glob.match(expression, 'test.js', name => name === 'te.ts'), null);
        assert.strictEqual(glob.match(expression, 'test.js'), null);
        expression = {
            '**/*.js': {
                when: ''
            }
        };
        assert.strictEqual(glob.match(expression, 'test.js', hasSibling), null);
        expression = {
            '**/*.js': {}
        };
        assert.strictEqual('**/*.js', glob.match(expression, 'test.js', hasSibling));
        expression = {};
        assert.strictEqual(glob.match(expression, 'test.js', hasSibling), null);
    });
    test('expression support (multiple)', function () {
        const siblings = ['test.html', 'test.txt', 'test.ts', 'test.js'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        // { "**/*.js": { "when": "$(basename).ts" } }
        const expression = {
            '**/*.js': { when: '$(basename).ts' },
            '**/*.as': true,
            '**/*.foo': false,
            '**/*.bananas': { bananas: true }
        };
        assert.strictEqual('**/*.js', glob.match(expression, 'test.js', hasSibling));
        assert.strictEqual('**/*.as', glob.match(expression, 'test.as', hasSibling));
        assert.strictEqual('**/*.bananas', glob.match(expression, 'test.bananas', hasSibling));
        assert.strictEqual('**/*.bananas', glob.match(expression, 'test.bananas'));
        assert.strictEqual(glob.match(expression, 'test.foo', hasSibling), null);
    });
    test('brackets', () => {
        let p = 'foo.[0-9]';
        assertGlobMatch(p, 'foo.5');
        assertGlobMatch(p, 'foo.8');
        assertNoGlobMatch(p, 'bar.5');
        assertNoGlobMatch(p, 'foo.f');
        p = 'foo.[^0-9]';
        assertNoGlobMatch(p, 'foo.5');
        assertNoGlobMatch(p, 'foo.8');
        assertNoGlobMatch(p, 'bar.5');
        assertGlobMatch(p, 'foo.f');
        p = 'foo.[!0-9]';
        assertNoGlobMatch(p, 'foo.5');
        assertNoGlobMatch(p, 'foo.8');
        assertNoGlobMatch(p, 'bar.5');
        assertGlobMatch(p, 'foo.f');
        p = 'foo.[0!^*?]';
        assertNoGlobMatch(p, 'foo.5');
        assertNoGlobMatch(p, 'foo.8');
        assertGlobMatch(p, 'foo.0');
        assertGlobMatch(p, 'foo.!');
        assertGlobMatch(p, 'foo.^');
        assertGlobMatch(p, 'foo.*');
        assertGlobMatch(p, 'foo.?');
        p = 'foo[/]bar';
        assertNoGlobMatch(p, 'foo/bar');
        p = 'foo.[[]';
        assertGlobMatch(p, 'foo.[');
        p = 'foo.[]]';
        assertGlobMatch(p, 'foo.]');
        p = 'foo.[][!]';
        assertGlobMatch(p, 'foo.]');
        assertGlobMatch(p, 'foo.[');
        assertGlobMatch(p, 'foo.!');
        p = 'foo.[]-]';
        assertGlobMatch(p, 'foo.]');
        assertGlobMatch(p, 'foo.-');
    });
    test('full path', function () {
        assertGlobMatch('testing/this/foo.txt', 'testing/this/foo.txt');
    });
    test('ending path', function () {
        assertGlobMatch('**/testing/this/foo.txt', 'some/path/testing/this/foo.txt');
    });
    test('prefix agnostic', function () {
        let p = '**/*.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, '/foo.js');
        assertGlobMatch(p, '\\foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        assertNoGlobMatch(p, 'foo.ts');
        assertNoGlobMatch(p, 'testing/foo.ts');
        assertNoGlobMatch(p, 'testing\\foo.ts');
        assertNoGlobMatch(p, '/testing/foo.ts');
        assertNoGlobMatch(p, '\\testing\\foo.ts');
        assertNoGlobMatch(p, 'C:\\testing\\foo.ts');
        assertNoGlobMatch(p, 'foo.js.txt');
        assertNoGlobMatch(p, 'testing/foo.js.txt');
        assertNoGlobMatch(p, 'testing\\foo.js.txt');
        assertNoGlobMatch(p, '/testing/foo.js.txt');
        assertNoGlobMatch(p, '\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'C:\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'testing.js/foo');
        assertNoGlobMatch(p, 'testing.js\\foo');
        assertNoGlobMatch(p, '/testing.js/foo');
        assertNoGlobMatch(p, '\\testing.js\\foo');
        assertNoGlobMatch(p, 'C:\\testing.js\\foo');
        p = '**/foo.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, '/foo.js');
        assertGlobMatch(p, '\\foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
    });
    test('cached properly', function () {
        const p = '**/*.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        assertNoGlobMatch(p, 'foo.ts');
        assertNoGlobMatch(p, 'testing/foo.ts');
        assertNoGlobMatch(p, 'testing\\foo.ts');
        assertNoGlobMatch(p, '/testing/foo.ts');
        assertNoGlobMatch(p, '\\testing\\foo.ts');
        assertNoGlobMatch(p, 'C:\\testing\\foo.ts');
        assertNoGlobMatch(p, 'foo.js.txt');
        assertNoGlobMatch(p, 'testing/foo.js.txt');
        assertNoGlobMatch(p, 'testing\\foo.js.txt');
        assertNoGlobMatch(p, '/testing/foo.js.txt');
        assertNoGlobMatch(p, '\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'C:\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'testing.js/foo');
        assertNoGlobMatch(p, 'testing.js\\foo');
        assertNoGlobMatch(p, '/testing.js/foo');
        assertNoGlobMatch(p, '\\testing.js\\foo');
        assertNoGlobMatch(p, 'C:\\testing.js\\foo');
        // Run again and make sure the regex are properly reused
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        assertNoGlobMatch(p, 'foo.ts');
        assertNoGlobMatch(p, 'testing/foo.ts');
        assertNoGlobMatch(p, 'testing\\foo.ts');
        assertNoGlobMatch(p, '/testing/foo.ts');
        assertNoGlobMatch(p, '\\testing\\foo.ts');
        assertNoGlobMatch(p, 'C:\\testing\\foo.ts');
        assertNoGlobMatch(p, 'foo.js.txt');
        assertNoGlobMatch(p, 'testing/foo.js.txt');
        assertNoGlobMatch(p, 'testing\\foo.js.txt');
        assertNoGlobMatch(p, '/testing/foo.js.txt');
        assertNoGlobMatch(p, '\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'C:\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'testing.js/foo');
        assertNoGlobMatch(p, 'testing.js\\foo');
        assertNoGlobMatch(p, '/testing.js/foo');
        assertNoGlobMatch(p, '\\testing.js\\foo');
        assertNoGlobMatch(p, 'C:\\testing.js\\foo');
    });
    test('invalid glob', function () {
        const p = '**/*(.js';
        assertNoGlobMatch(p, 'foo.js');
    });
    test('split glob aware', function () {
        assert.deepStrictEqual(glob.splitGlobAware('foo,bar', ','), ['foo', 'bar']);
        assert.deepStrictEqual(glob.splitGlobAware('foo', ','), ['foo']);
        assert.deepStrictEqual(glob.splitGlobAware('{foo,bar}', ','), ['{foo,bar}']);
        assert.deepStrictEqual(glob.splitGlobAware('foo,bar,{foo,bar}', ','), ['foo', 'bar', '{foo,bar}']);
        assert.deepStrictEqual(glob.splitGlobAware('{foo,bar},foo,bar,{foo,bar}', ','), ['{foo,bar}', 'foo', 'bar', '{foo,bar}']);
        assert.deepStrictEqual(glob.splitGlobAware('[foo,bar]', ','), ['[foo,bar]']);
        assert.deepStrictEqual(glob.splitGlobAware('foo,bar,[foo,bar]', ','), ['foo', 'bar', '[foo,bar]']);
        assert.deepStrictEqual(glob.splitGlobAware('[foo,bar],foo,bar,[foo,bar]', ','), ['[foo,bar]', 'foo', 'bar', '[foo,bar]']);
    });
    test('expression with disabled glob', function () {
        const expr = { '**/*.js': false };
        assert.strictEqual(glob.match(expr, 'foo.js'), null);
    });
    test('expression with two non-trivia globs', function () {
        const expr = {
            '**/*.j?': true,
            '**/*.t?': true
        };
        assert.strictEqual(glob.match(expr, 'foo.js'), '**/*.j?');
        assert.strictEqual(glob.match(expr, 'foo.as'), null);
    });
    test('expression with non-trivia glob (issue 144458)', function () {
        const pattern = '**/p*';
        assert.strictEqual(glob.match(pattern, 'foo/barp'), false);
        assert.strictEqual(glob.match(pattern, 'foo/bar/ap'), false);
        assert.strictEqual(glob.match(pattern, 'ap'), false);
        assert.strictEqual(glob.match(pattern, 'foo/barp1'), false);
        assert.strictEqual(glob.match(pattern, 'foo/bar/ap1'), false);
        assert.strictEqual(glob.match(pattern, 'ap1'), false);
        assert.strictEqual(glob.match(pattern, '/foo/barp'), false);
        assert.strictEqual(glob.match(pattern, '/foo/bar/ap'), false);
        assert.strictEqual(glob.match(pattern, '/ap'), false);
        assert.strictEqual(glob.match(pattern, '/foo/barp1'), false);
        assert.strictEqual(glob.match(pattern, '/foo/bar/ap1'), false);
        assert.strictEqual(glob.match(pattern, '/ap1'), false);
        assert.strictEqual(glob.match(pattern, 'foo/pbar'), true);
        assert.strictEqual(glob.match(pattern, '/foo/pbar'), true);
        assert.strictEqual(glob.match(pattern, 'foo/bar/pa'), true);
        assert.strictEqual(glob.match(pattern, '/p'), true);
    });
    test('expression with empty glob', function () {
        const expr = { '': true };
        assert.strictEqual(glob.match(expr, 'foo.js'), null);
    });
    test('expression with other falsy value', function () {
        const expr = { '**/*.js': 0 };
        assert.strictEqual(glob.match(expr, 'foo.js'), '**/*.js');
    });
    test('expression with two basename globs', function () {
        const expr = {
            '**/bar': true,
            '**/baz': true
        };
        assert.strictEqual(glob.match(expr, 'bar'), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo'), null);
        assert.strictEqual(glob.match(expr, 'foo/bar'), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo\\bar'), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo/foo'), null);
    });
    test('expression with two basename globs and a siblings expression', function () {
        const expr = {
            '**/bar': true,
            '**/baz': true,
            '**/*.js': { when: '$(basename).ts' }
        };
        const siblings = ['foo.ts', 'foo.js', 'foo', 'bar'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        assert.strictEqual(glob.match(expr, 'bar', hasSibling), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo', hasSibling), null);
        assert.strictEqual(glob.match(expr, 'foo/bar', hasSibling), '**/bar');
        if (isWindows) {
            // backslash is a valid file name character on posix
            assert.strictEqual(glob.match(expr, 'foo\\bar', hasSibling), '**/bar');
        }
        assert.strictEqual(glob.match(expr, 'foo/foo', hasSibling), null);
        assert.strictEqual(glob.match(expr, 'foo.js', hasSibling), '**/*.js');
        assert.strictEqual(glob.match(expr, 'bar.js', hasSibling), null);
    });
    test('expression with multipe basename globs', function () {
        const expr = {
            '**/bar': true,
            '{**/baz,**/foo}': true
        };
        assert.strictEqual(glob.match(expr, 'bar'), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo'), '{**/baz,**/foo}');
        assert.strictEqual(glob.match(expr, 'baz'), '{**/baz,**/foo}');
        assert.strictEqual(glob.match(expr, 'abc'), null);
    });
    test('falsy expression/pattern', function () {
        assert.strictEqual(glob.match(null, 'foo'), false);
        assert.strictEqual(glob.match('', 'foo'), false);
        assert.strictEqual(glob.parse(null)('foo'), false);
        assert.strictEqual(glob.parse('')('foo'), false);
    });
    test('falsy path', function () {
        assert.strictEqual(glob.parse('foo')(null), false);
        assert.strictEqual(glob.parse('foo')(''), false);
        assert.strictEqual(glob.parse('**/*.j?')(null), false);
        assert.strictEqual(glob.parse('**/*.j?')(''), false);
        assert.strictEqual(glob.parse('**/*.foo')(null), false);
        assert.strictEqual(glob.parse('**/*.foo')(''), false);
        assert.strictEqual(glob.parse('**/foo')(null), false);
        assert.strictEqual(glob.parse('**/foo')(''), false);
        assert.strictEqual(glob.parse('{**/baz,**/foo}')(null), false);
        assert.strictEqual(glob.parse('{**/baz,**/foo}')(''), false);
        assert.strictEqual(glob.parse('{**/*.baz,**/*.foo}')(null), false);
        assert.strictEqual(glob.parse('{**/*.baz,**/*.foo}')(''), false);
    });
    test('expression/pattern basename', function () {
        assert.strictEqual(glob.parse('**/foo')('bar/baz', 'baz'), false);
        assert.strictEqual(glob.parse('**/foo')('bar/foo', 'foo'), true);
        assert.strictEqual(glob.parse('{**/baz,**/foo}')('baz/bar', 'bar'), false);
        assert.strictEqual(glob.parse('{**/baz,**/foo}')('baz/foo', 'foo'), true);
        const expr = { '**/*.js': { when: '$(basename).ts' } };
        const siblings = ['foo.ts', 'foo.js'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        assert.strictEqual(glob.parse(expr)('bar/baz.js', 'baz.js', hasSibling), null);
        assert.strictEqual(glob.parse(expr)('bar/foo.js', 'foo.js', hasSibling), '**/*.js');
    });
    test('expression/pattern basename terms', function () {
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/*.foo')), []);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/foo')), ['foo']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/foo/')), ['foo']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('{**/baz,**/foo}')), ['baz', 'foo']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('{**/baz/,**/foo/}')), ['baz', 'foo']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse({
            '**/foo': true,
            '{**/bar,**/baz}': true,
            '{**/bar2/,**/baz2/}': true,
            '**/bulb': false
        })), ['foo', 'bar', 'baz', 'bar2', 'baz2']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse({
            '**/foo': { when: '$(basename).zip' },
            '**/bar': true
        })), ['bar']);
    });
    test('expression/pattern optimization for basenames', function () {
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/foo/**')), []);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/foo/**', { trimForExclusions: true })), ['foo']);
        testOptimizationForBasenames('**/*.foo/**', [], [['baz/bar.foo/bar/baz', true]]);
        testOptimizationForBasenames('**/foo/**', ['foo'], [['bar/foo', true], ['bar/foo/baz', false]]);
        testOptimizationForBasenames('{**/baz/**,**/foo/**}', ['baz', 'foo'], [['bar/baz', true], ['bar/foo', true]]);
        testOptimizationForBasenames({
            '**/foo/**': true,
            '{**/bar/**,**/baz/**}': true,
            '**/bulb/**': false
        }, ['foo', 'bar', 'baz'], [
            ['bar/foo', '**/foo/**'],
            ['foo/bar', '{**/bar/**,**/baz/**}'],
            ['bar/nope', null]
        ]);
        const siblings = ['baz', 'baz.zip', 'nope'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        testOptimizationForBasenames({
            '**/foo/**': { when: '$(basename).zip' },
            '**/bar/**': true
        }, ['bar'], [
            ['bar/foo', null],
            ['bar/foo/baz', null],
            ['bar/foo/nope', null],
            ['foo/bar', '**/bar/**'],
        ], [
            null,
            hasSibling,
            hasSibling
        ]);
    });
    function testOptimizationForBasenames(pattern, basenameTerms, matches, siblingsFns = []) {
        const parsed = glob.parse(pattern, { trimForExclusions: true });
        assert.deepStrictEqual(glob.getBasenameTerms(parsed), basenameTerms);
        matches.forEach(([text, result], i) => {
            assert.strictEqual(parsed(text, null, siblingsFns[i]), result);
        });
    }
    test('trailing slash', function () {
        // Testing existing (more or less intuitive) behavior
        assert.strictEqual(glob.parse('**/foo/')('bar/baz', 'baz'), false);
        assert.strictEqual(glob.parse('**/foo/')('bar/foo', 'foo'), true);
        assert.strictEqual(glob.parse('**/*.foo/')('bar/file.baz', 'file.baz'), false);
        assert.strictEqual(glob.parse('**/*.foo/')('bar/file.foo', 'file.foo'), true);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}')('bar/baz', 'baz'), false);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}')('bar/foo', 'foo'), true);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}')('bar/abc', 'abc'), true);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}', { trimForExclusions: true })('bar/baz', 'baz'), false);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}', { trimForExclusions: true })('bar/foo', 'foo'), true);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}', { trimForExclusions: true })('bar/abc', 'abc'), true);
    });
    test('expression/pattern path', function () {
        assert.strictEqual(glob.parse('**/foo/bar')(nativeSep('foo/baz'), 'baz'), false);
        assert.strictEqual(glob.parse('**/foo/bar')(nativeSep('foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('**/foo/bar')(nativeSep('bar/foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('**/foo/bar/**')(nativeSep('bar/foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('**/foo/bar/**')(nativeSep('bar/foo/bar/baz'), 'baz'), true);
        assert.strictEqual(glob.parse('**/foo/bar/**', { trimForExclusions: true })(nativeSep('bar/foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('**/foo/bar/**', { trimForExclusions: true })(nativeSep('bar/foo/bar/baz'), 'baz'), false);
        assert.strictEqual(glob.parse('foo/bar')(nativeSep('foo/baz'), 'baz'), false);
        assert.strictEqual(glob.parse('foo/bar')(nativeSep('foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('foo/bar/baz')(nativeSep('foo/bar/baz'), 'baz'), true); // #15424
        assert.strictEqual(glob.parse('foo/bar')(nativeSep('bar/foo/bar'), 'bar'), false);
        assert.strictEqual(glob.parse('foo/bar/**')(nativeSep('foo/bar/baz'), 'baz'), true);
        assert.strictEqual(glob.parse('foo/bar/**', { trimForExclusions: true })(nativeSep('foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('foo/bar/**', { trimForExclusions: true })(nativeSep('foo/bar/baz'), 'baz'), false);
    });
    test('expression/pattern paths', function () {
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/*.foo')), []);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo')), []);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo/bar')), ['*/foo/bar']);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo/bar/')), ['*/foo/bar']);
        // Not supported
        // assert.deepStrictEqual(glob.getPathTerms(glob.parse('{**/baz/bar,**/foo/bar,**/bar}')), ['*/baz/bar', '*/foo/bar']);
        // assert.deepStrictEqual(glob.getPathTerms(glob.parse('{**/baz/bar/,**/foo/bar/,**/bar/}')), ['*/baz/bar', '*/foo/bar']);
        const parsed = glob.parse({
            '**/foo/bar': true,
            '**/foo2/bar2': true,
            // Not supported
            // '{**/bar/foo,**/baz/foo}': true,
            // '{**/bar2/foo/,**/baz2/foo/}': true,
            '**/bulb': true,
            '**/bulb2': true,
            '**/bulb/foo': false
        });
        assert.deepStrictEqual(glob.getPathTerms(parsed), ['*/foo/bar', '*/foo2/bar2']);
        assert.deepStrictEqual(glob.getBasenameTerms(parsed), ['bulb', 'bulb2']);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse({
            '**/foo/bar': { when: '$(basename).zip' },
            '**/bar/foo': true,
            '**/bar2/foo2': true
        })), ['*/bar/foo', '*/bar2/foo2']);
    });
    test('expression/pattern optimization for paths', function () {
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo/bar/**')), []);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo/bar/**', { trimForExclusions: true })), ['*/foo/bar']);
        testOptimizationForPaths('**/*.foo/bar/**', [], [[nativeSep('baz/bar.foo/bar/baz'), true]]);
        testOptimizationForPaths('**/foo/bar/**', ['*/foo/bar'], [[nativeSep('bar/foo/bar'), true], [nativeSep('bar/foo/bar/baz'), false]]);
        // Not supported
        // testOptimizationForPaths('{**/baz/bar/**,**/foo/bar/**}', ['*/baz/bar', '*/foo/bar'], [[nativeSep('bar/baz/bar'), true], [nativeSep('bar/foo/bar'), true]]);
        testOptimizationForPaths({
            '**/foo/bar/**': true,
            // Not supported
            // '{**/bar/bar/**,**/baz/bar/**}': true,
            '**/bulb/bar/**': false
        }, ['*/foo/bar'], [
            [nativeSep('bar/foo/bar'), '**/foo/bar/**'],
            // Not supported
            // [nativeSep('foo/bar/bar'), '{**/bar/bar/**,**/baz/bar/**}'],
            [nativeSep('/foo/bar/nope'), null]
        ]);
        const siblings = ['baz', 'baz.zip', 'nope'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        testOptimizationForPaths({
            '**/foo/123/**': { when: '$(basename).zip' },
            '**/bar/123/**': true
        }, ['*/bar/123'], [
            [nativeSep('bar/foo/123'), null],
            [nativeSep('bar/foo/123/baz'), null],
            [nativeSep('bar/foo/123/nope'), null],
            [nativeSep('foo/bar/123'), '**/bar/123/**'],
        ], [
            null,
            hasSibling,
            hasSibling
        ]);
    });
    function testOptimizationForPaths(pattern, pathTerms, matches, siblingsFns = []) {
        const parsed = glob.parse(pattern, { trimForExclusions: true });
        assert.deepStrictEqual(glob.getPathTerms(parsed), pathTerms);
        matches.forEach(([text, result], i) => {
            assert.strictEqual(parsed(text, null, siblingsFns[i]), result);
        });
    }
    function nativeSep(slashPath) {
        return slashPath.replace(/\//g, sep);
    }
    test('relative pattern - glob star', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo', pattern: '**/*.cs' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\bar\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.ts');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\Program.cs');
            assertNoGlobMatch(p, 'C:\\other\\DNXConsoleApp\\foo\\Program.ts');
        }
        else {
            const p = { base: '/DNXConsoleApp/foo', pattern: '**/*.cs' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
            assertGlobMatch(p, '/DNXConsoleApp/foo/bar/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.ts');
            assertNoGlobMatch(p, '/DNXConsoleApp/Program.cs');
            assertNoGlobMatch(p, '/other/DNXConsoleApp/foo/Program.ts');
        }
    });
    test('relative pattern - single star', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo', pattern: '*.cs' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\bar\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.ts');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\Program.cs');
            assertNoGlobMatch(p, 'C:\\other\\DNXConsoleApp\\foo\\Program.ts');
        }
        else {
            const p = { base: '/DNXConsoleApp/foo', pattern: '*.cs' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/bar/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.ts');
            assertNoGlobMatch(p, '/DNXConsoleApp/Program.cs');
            assertNoGlobMatch(p, '/other/DNXConsoleApp/foo/Program.ts');
        }
    });
    test('relative pattern - single star with path', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo', pattern: 'something/*.cs' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\something\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
        }
        else {
            const p = { base: '/DNXConsoleApp/foo', pattern: 'something/*.cs' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/something/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
        }
    });
    test('relative pattern - single star alone', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo\\something\\Program.cs', pattern: '*' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\something\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
        }
        else {
            const p = { base: '/DNXConsoleApp/foo/something/Program.cs', pattern: '*' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/something/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
        }
    });
    test('relative pattern - ignores case on macOS/Windows', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo', pattern: 'something/*.cs' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\something\\Program.cs'.toLowerCase());
        }
        else if (isMacintosh) {
            const p = { base: '/DNXConsoleApp/foo', pattern: 'something/*.cs' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/something/Program.cs'.toLowerCase());
        }
        else if (isLinux) {
            const p = { base: '/DNXConsoleApp/foo', pattern: 'something/*.cs' };
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/something/Program.cs'.toLowerCase());
        }
    });
    test('relative pattern - trailing slash / backslash (#162498)', function () {
        if (isWindows) {
            let p = { base: 'C:\\', pattern: 'foo.cs' };
            assertGlobMatch(p, 'C:\\foo.cs');
            p = { base: 'C:\\bar\\', pattern: 'foo.cs' };
            assertGlobMatch(p, 'C:\\bar\\foo.cs');
        }
        else {
            let p = { base: '/', pattern: 'foo.cs' };
            assertGlobMatch(p, '/foo.cs');
            p = { base: '/bar/', pattern: 'foo.cs' };
            assertGlobMatch(p, '/bar/foo.cs');
        }
    });
    test('pattern with "base" does not explode - #36081', function () {
        assert.ok(glob.match({ 'base': true }, 'base'));
    });
    test('relative pattern - #57475', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo', pattern: 'styles/style.css' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\styles\\style.css');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
        }
        else {
            const p = { base: '/DNXConsoleApp/foo', pattern: 'styles/style.css' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/styles/style.css');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
        }
    });
    test('URI match', () => {
        const p = 'scheme:/**/*.md';
        assertGlobMatch(p, URI.file('super/duper/long/some/file.md').with({ scheme: 'scheme' }).toString());
    });
    test('expression fails when siblings use promises (https://github.com/microsoft/vscode/issues/146294)', async function () {
        const siblings = ['test.html', 'test.txt', 'test.ts'];
        const hasSibling = (name) => Promise.resolve(siblings.indexOf(name) !== -1);
        // { "**/*.js": { "when": "$(basename).ts" } }
        const expression = {
            '**/test.js': { when: '$(basename).js' },
            '**/*.js': { when: '$(basename).ts' }
        };
        const parsedExpression = glob.parse(expression);
        assert.strictEqual('**/*.js', await parsedExpression('test.js', undefined, hasSibling));
    });
    test('patternsEquals', () => {
        assert.ok(glob.patternsEquals(['a'], ['a']));
        assert.ok(!glob.patternsEquals(['a'], ['b']));
        assert.ok(glob.patternsEquals(['a', 'b', 'c'], ['a', 'b', 'c']));
        assert.ok(!glob.patternsEquals(['1', '2'], ['1', '3']));
        assert.ok(glob.patternsEquals([{ base: 'a', pattern: '*' }, 'b', 'c'], [{ base: 'a', pattern: '*' }, 'b', 'c']));
        assert.ok(glob.patternsEquals(undefined, undefined));
        assert.ok(!glob.patternsEquals(undefined, ['b']));
        assert.ok(!glob.patternsEquals(['a'], undefined));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vZ2xvYi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssSUFBSSxNQUFNLHNCQUFzQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO0lBRWxCLHVCQUF1QjtJQUV2QixvQkFBb0I7SUFDcEIsZ0RBQWdEO0lBQ2hELHNDQUFzQztJQUN0QyxzRUFBc0U7SUFDdEUsZUFBZTtJQUNmLDBCQUEwQjtJQUMxQixnQ0FBZ0M7SUFDaEMsb0RBQW9EO0lBQ3BELHFEQUFxRDtJQUNyRCwwQkFBMEI7SUFDMUIsa0JBQWtCO0lBQ2xCLGtCQUFrQjtJQUNsQixrQkFBa0I7SUFDbEIsa0JBQWtCO0lBQ2xCLGlCQUFpQjtJQUNqQixpQkFBaUI7SUFDakIsaUJBQWlCO0lBQ2pCLDRCQUE0QjtJQUM1QixpQ0FBaUM7SUFDakMsaUJBQWlCO0lBQ2pCLGlCQUFpQjtJQUNqQixnQkFBZ0I7SUFDaEIsTUFBTTtJQUVOLGlCQUFpQjtJQUNqQixpQ0FBaUM7SUFDakMsMENBQTBDO0lBQzFDLGtCQUFrQjtJQUNsQixxQkFBcUI7SUFDckIseUJBQXlCO0lBQ3pCLG1CQUFtQjtJQUNuQiwr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TSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMEJBQTBCLEVBQUU7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsWUFBWSxFQUFFO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsSUFBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUU7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFMUUsTUFBTSxJQUFJLEdBQUcsRUFBRSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1FBQ3ZELE1BQU0sUUFBUSxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRW5FLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3JGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1DQUFtQyxFQUFFO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3RixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRS9GLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDdkQsUUFBUSxFQUFFLElBQUk7WUFDZCxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLHFCQUFxQixFQUFFLElBQUk7WUFDM0IsU0FBUyxFQUFFLEtBQUs7U0FDaEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVB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