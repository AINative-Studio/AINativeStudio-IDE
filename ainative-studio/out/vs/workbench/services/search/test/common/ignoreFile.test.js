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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlRmlsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3QvY29tbW9uL2lnbm9yZUZpbGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRXhELFNBQVMsU0FBUyxDQUFDLEtBQWEsRUFBRSxVQUFrQixFQUFFLGtCQUEwQixFQUFFLFdBQW9CLEVBQUUsUUFBaUI7SUFDeEgsT0FBTyxDQUFDLE1BQWMsRUFBRSxFQUFFO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFFbEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hFLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsTUFBTSxHQUFHLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUU5RSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsa0JBQWtCLEtBQUssVUFBVSxvQkFBb0IsS0FB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