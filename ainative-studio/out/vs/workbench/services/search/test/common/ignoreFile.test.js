/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IgnoreFile } from '../../common/ignoreFile.js';
function runAssert(input, ignoreFile, ignoreFileLocation, shouldMatch, traverse) {
    return (prefix) => {
        const isDir = input.endsWith('/');
        const rawInput = isDir ? input.slice(0, input.length - 1) : input;
        const matcher = new IgnoreFile(ignoreFile, prefix + ignoreFileLocation);
        if (traverse) {
            const traverses = matcher.isPathIncludedInTraversal(prefix + rawInput, isDir);
            if (shouldMatch) {
                assert(traverses, `${ignoreFileLocation}: ${ignoreFile} should traverse ${isDir ? 'dir' : 'file'} ${prefix}${rawInput}`);
            }
            else {
                assert(!traverses, `${ignoreFileLocation}: ${ignoreFile} should not traverse ${isDir ? 'dir' : 'file'} ${prefix}${rawInput}`);
            }
        }
        else {
            const ignores = matcher.isArbitraryPathIgnored(prefix + rawInput, isDir);
            if (shouldMatch) {
                assert(ignores, `${ignoreFileLocation}: ${ignoreFile} should ignore ${isDir ? 'dir' : 'file'} ${prefix}${rawInput}`);
            }
            else {
                assert(!ignores, `${ignoreFileLocation}: ${ignoreFile} should not ignore ${isDir ? 'dir' : 'file'} ${prefix}${rawInput}`);
            }
        }
    };
}
function assertNoTraverses(ignoreFile, ignoreFileLocation, input) {
    const runWithPrefix = runAssert(input, ignoreFile, ignoreFileLocation, false, true);
    runWithPrefix('');
    runWithPrefix('/someFolder');
}
function assertTraverses(ignoreFile, ignoreFileLocation, input) {
    const runWithPrefix = runAssert(input, ignoreFile, ignoreFileLocation, true, true);
    runWithPrefix('');
    runWithPrefix('/someFolder');
}
function assertIgnoreMatch(ignoreFile, ignoreFileLocation, input) {
    const runWithPrefix = runAssert(input, ignoreFile, ignoreFileLocation, true, false);
    runWithPrefix('');
    runWithPrefix('/someFolder');
}
function assertNoIgnoreMatch(ignoreFile, ignoreFileLocation, input) {
    const runWithPrefix = runAssert(input, ignoreFile, ignoreFileLocation, false, false);
    runWithPrefix('');
    runWithPrefix('/someFolder');
}
suite('Parsing .gitignore files', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('paths with trailing slashes do not match files', () => {
        const i = 'node_modules/\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/');
        assertNoIgnoreMatch(i, '/', '/inner/node_modules');
        assertIgnoreMatch(i, '/', '/inner/node_modules/');
    });
    test('parsing simple gitignore files', () => {
        let i = 'node_modules\nout\n';
        assertIgnoreMatch(i, '/', '/node_modules');
        assertNoTraverses(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/file');
        assertIgnoreMatch(i, '/', '/dir/node_modules');
        assertIgnoreMatch(i, '/', '/dir/node_modules/file');
        assertIgnoreMatch(i, '/', '/out');
        assertNoTraverses(i, '/', '/out');
        assertIgnoreMatch(i, '/', '/out/file');
        assertIgnoreMatch(i, '/', '/dir/out');
        assertIgnoreMatch(i, '/', '/dir/out/file');
        i = '/node_modules\n/out\n';
        assertIgnoreMatch(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/file');
        assertNoIgnoreMatch(i, '/', '/dir/node_modules');
        assertNoIgnoreMatch(i, '/', '/dir/node_modules/file');
        assertIgnoreMatch(i, '/', '/out');
        assertIgnoreMatch(i, '/', '/out/file');
        assertNoIgnoreMatch(i, '/', '/dir/out');
        assertNoIgnoreMatch(i, '/', '/dir/out/file');
        i = 'node_modules/\nout/\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/');
        assertIgnoreMatch(i, '/', '/node_modules/file');
        assertIgnoreMatch(i, '/', '/dir/node_modules/');
        assertNoIgnoreMatch(i, '/', '/dir/node_modules');
        assertIgnoreMatch(i, '/', '/dir/node_modules/file');
        assertIgnoreMatch(i, '/', '/out/');
        assertNoIgnoreMatch(i, '/', '/out');
        assertIgnoreMatch(i, '/', '/out/file');
        assertNoIgnoreMatch(i, '/', '/dir/out');
        assertIgnoreMatch(i, '/', '/dir/out/');
        assertIgnoreMatch(i, '/', '/dir/out/file');
    });
    test('parsing files-in-folder exclude', () => {
        let i = 'node_modules/*\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertNoIgnoreMatch(i, '/', '/node_modules/');
        assertTraverses(i, '/', '/node_modules');
        assertTraverses(i, '/', '/node_modules/');
        assertIgnoreMatch(i, '/', '/node_modules/something');
        assertNoTraverses(i, '/', '/node_modules/something');
        assertIgnoreMatch(i, '/', '/node_modules/something/else');
        assertIgnoreMatch(i, '/', '/node_modules/@types');
        assertNoTraverses(i, '/', '/node_modules/@types');
        i = 'node_modules/**/*\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertNoIgnoreMatch(i, '/', '/node_modules/');
        assertIgnoreMatch(i, '/', '/node_modules/something');
        assertIgnoreMatch(i, '/', '/node_modules/something/else');
        assertIgnoreMatch(i, '/', '/node_modules/@types');
    });
    test('parsing simple negations', () => {
        let i = 'node_modules/*\n!node_modules/@types\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertTraverses(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/something');
        assertNoTraverses(i, '/', '/node_modules/something');
        assertIgnoreMatch(i, '/', '/node_modules/something/else');
        assertNoIgnoreMatch(i, '/', '/node_modules/@types');
        assertTraverses(i, '/', '/node_modules/@types');
        assertTraverses(i, '/', '/node_modules/@types/boop');
        i = '*.log\n!important.log\n';
        assertIgnoreMatch(i, '/', '/test.log');
        assertIgnoreMatch(i, '/', '/inner/test.log');
        assertNoIgnoreMatch(i, '/', '/important.log');
        assertNoIgnoreMatch(i, '/', '/inner/important.log');
        assertNoTraverses(i, '/', '/test.log');
        assertNoTraverses(i, '/', '/inner/test.log');
        assertTraverses(i, '/', '/important.log');
        assertTraverses(i, '/', '/inner/important.log');
    });
    test('nested .gitignores', () => {
        let i = 'node_modules\nout\n';
        assertIgnoreMatch(i, '/inner/', '/inner/node_modules');
        assertIgnoreMatch(i, '/inner/', '/inner/more/node_modules');
        i = '/node_modules\n/out\n';
        assertIgnoreMatch(i, '/inner/', '/inner/node_modules');
        assertNoIgnoreMatch(i, '/inner/', '/inner/more/node_modules');
        assertNoIgnoreMatch(i, '/inner/', '/node_modules');
        i = 'node_modules/\nout/\n';
        assertNoIgnoreMatch(i, '/inner/', '/inner/node_modules');
        assertIgnoreMatch(i, '/inner/', '/inner/node_modules/');
        assertNoIgnoreMatch(i, '/inner/', '/inner/more/node_modules');
        assertIgnoreMatch(i, '/inner/', '/inner/more/node_modules/');
        assertNoIgnoreMatch(i, '/inner/', '/node_modules');
    });
    test('file extension matches', () => {
        let i = '*.js\n';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        i = '/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.js');
        i = '**/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = 'inner/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = '/inner/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = '**/inner/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = '**/inner/**/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = '**/more/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/more/myFile.js');
    });
    test('real world example: vscode-js-debug', () => {
        const i = `.cache/
			.profile/
			.cdp-profile/
			.headless-profile/
			.vscode-test/
			.DS_Store
			node_modules/
			out/
			dist
			/coverage
			/.nyc_output
			demos/web-worker/vscode-pwa-dap.log
			demos/web-worker/vscode-pwa-cdp.log
			.dynamic-testWorkspace
			**/test/**/*.actual
			/testWorkspace/web/tmp
			/testWorkspace/**/debug.log
			/testWorkspace/webview/win/true/
			*.cpuprofile`;
        const included = [
            '/distro',
            '/inner/coverage',
            '/inner/.nyc_output',
            '/inner/demos/web-worker/vscode-pwa-dap.log',
            '/inner/demos/web-worker/vscode-pwa-cdp.log',
            '/testWorkspace/webview/win/true',
            '/a/best/b/c.actual',
            '/best/b/c.actual',
        ];
        const excluded = [
            '/.profile/',
            '/inner/.profile/',
            '/.DS_Store',
            '/inner/.DS_Store',
            '/coverage',
            '/.nyc_output',
            '/demos/web-worker/vscode-pwa-dap.log',
            '/demos/web-worker/vscode-pwa-cdp.log',
            '/.dynamic-testWorkspace',
            '/inner/.dynamic-testWorkspace',
            '/test/.actual',
            '/test/hello.actual',
            '/a/test/.actual',
            '/a/test/b.actual',
            '/a/test/b/.actual',
            '/a/test/b/c.actual',
            '/a/b/test/.actual',
            '/a/b/test/f/c.actual',
            '/testWorkspace/web/tmp',
            '/testWorkspace/debug.log',
            '/testWorkspace/a/debug.log',
            '/testWorkspace/a/b/debug.log',
            '/testWorkspace/webview/win/true/',
            '/.cpuprofile',
            '/a.cpuprofile',
            '/aa/a.cpuprofile',
            '/aaa/aa/a.cpuprofile',
        ];
        for (const include of included) {
            assertNoIgnoreMatch(i, '/', include);
        }
        for (const exclude of excluded) {
            assertIgnoreMatch(i, '/', exclude);
        }
    });
    test('real world example: vscode', () => {
        const i = `.DS_Store
			.cache
			npm-debug.log
			Thumbs.db
			node_modules/
			.build/
			extensions/**/dist/
			/out*/
			/extensions/**/out/
			src/vs/server
			resources/server
			build/node_modules
			coverage/
			test_data/
			test-results/
			yarn-error.log
			vscode.lsif
			vscode.db
			/.profile-oss`;
        const included = [
            '/inner/extensions/dist',
            '/inner/extensions/boop/dist/test',
            '/inner/extensions/boop/doop/dist',
            '/inner/extensions/boop/doop/dist/test',
            '/inner/extensions/boop/doop/dist/test',
            '/inner/extensions/out/test',
            '/inner/extensions/boop/out',
            '/inner/extensions/boop/out/test',
            '/inner/out/',
            '/inner/out/test',
            '/inner/out1/',
            '/inner/out1/test',
            '/inner/out2/',
            '/inner/out2/test',
            '/inner/.profile-oss',
            // Files.
            '/extensions/dist',
            '/extensions/boop/doop/dist',
            '/extensions/boop/out',
        ];
        const excluded = [
            '/extensions/dist/',
            '/extensions/boop/dist/test',
            '/extensions/boop/doop/dist/',
            '/extensions/boop/doop/dist/test',
            '/extensions/boop/doop/dist/test',
            '/extensions/out/test',
            '/extensions/boop/out/',
            '/extensions/boop/out/test',
            '/out/',
            '/out/test',
            '/out1/',
            '/out1/test',
            '/out2/',
            '/out2/test',
            '/.profile-oss',
        ];
        for (const include of included) {
            assertNoIgnoreMatch(i, '/', include);
        }
        for (const exclude of excluded) {
            assertIgnoreMatch(i, '/', exclude);
        }
    });
    test('various advanced constructs found in popular repos', () => {
        const runTest = ({ pattern, included, excluded }) => {
            for (const include of included) {
                assertNoIgnoreMatch(pattern, '/', include);
            }
            for (const exclude of excluded) {
                assertIgnoreMatch(pattern, '/', exclude);
            }
        };
        runTest({
            pattern: `**/node_modules
			/packages/*/dist`,
            excluded: [
                '/node_modules',
                '/test/node_modules',
                '/node_modules/test',
                '/test/node_modules/test',
                '/packages/a/dist',
                '/packages/abc/dist',
                '/packages/abc/dist/test',
            ],
            included: [
                '/inner/packages/a/dist',
                '/inner/packages/abc/dist',
                '/inner/packages/abc/dist/test',
                '/packages/dist',
                '/packages/dist/test',
                '/packages/a/b/dist',
                '/packages/a/b/dist/test',
            ],
        });
        runTest({
            pattern: `.yarn/*
			# !.yarn/cache
			!.yarn/patches
			!.yarn/plugins
			!.yarn/releases
			!.yarn/sdks
			!.yarn/versions`,
            excluded: [
                '/.yarn/test',
                '/.yarn/cache',
            ],
            included: [
                '/inner/.yarn/test',
                '/inner/.yarn/cache',
                '/.yarn/patches',
                '/.yarn/plugins',
                '/.yarn/releases',
                '/.yarn/sdks',
                '/.yarn/versions',
            ],
        });
        runTest({
            pattern: `[._]*s[a-w][a-z]
			[._]s[a-w][a-z]
			*.un~
			*~`,
            excluded: [
                '/~',
                '/abc~',
                '/inner/~',
                '/inner/abc~',
                '/.un~',
                '/a.un~',
                '/test/.un~',
                '/test/a.un~',
                '/.saa',
                '/....saa',
                '/._._sby',
                '/inner/._._sby',
                '/_swz',
            ],
            included: [
                '/.jaa',
            ],
        });
        // TODO: the rest of these :)
        runTest({
            pattern: `*.pbxuser
			!default.pbxuser
			*.mode1v3
			!default.mode1v3
			*.mode2v3
			!default.mode2v3
			*.perspectivev3
			!default.perspectivev3`,
            excluded: [],
            included: [],
        });
        runTest({
            pattern: `[Dd]ebug/
			[Dd]ebugPublic/
			[Rr]elease/
			[Rr]eleases/
			*.[Mm]etrics.xml
			[Tt]est[Rr]esult*/
			[Bb]uild[Ll]og.*
			bld/
			[Bb]in/
			[Oo]bj/
			[Ll]og/`,
            excluded: [],
            included: [],
        });
        runTest({
            pattern: `Dockerfile*
			!/tests/bud/*/Dockerfile*
			!/tests/conformance/**/Dockerfile*`,
            excluded: [],
            included: [],
        });
        runTest({
            pattern: `*.pdf
			*.html
			!author_bio.html
			!colo.html
			!copyright.html
			!cover.html
			!ix.html
			!titlepage.html
			!toc.html`,
            excluded: [],
            included: [],
        });
        runTest({
            pattern: `/log/*
			/tmp/*
			!/log/.keep
			!/tmp/.keep`,
            excluded: [],
            included: [],
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlRmlsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L2NvbW1vbi9pZ25vcmVGaWxlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUV4RCxTQUFTLFNBQVMsQ0FBQyxLQUFhLEVBQUUsVUFBa0IsRUFBRSxrQkFBMEIsRUFBRSxXQUFvQixFQUFFLFFBQWlCO0lBQ3hILE9BQU8sQ0FBQyxNQUFjLEVBQUUsRUFBRTtRQUN6QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBRWxFLE1BQU0sT0FBTyxHQUFHLElBQUksVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsQ0FBQztRQUN4RSxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sR0FBRyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFOUUsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLGtCQUFrQixLQUFLLFVBQVUsb0JBQW9CLEtBQUssQ0FB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