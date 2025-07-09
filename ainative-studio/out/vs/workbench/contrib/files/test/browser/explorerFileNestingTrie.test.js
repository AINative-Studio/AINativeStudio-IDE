/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PreTrie, ExplorerFileNestingTrie, SufTrie } from '../../common/explorerFileNestingTrie.js';
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const fakeFilenameAttributes = { dirname: 'mydir', basename: '', extname: '' };
suite('SufTrie', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('exactMatches', () => {
        const t = new SufTrie();
        t.add('.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), []);
    });
    test('starMatches', () => {
        const t = new SufTrie();
        t.add('*.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['MyKey']);
    });
    test('starSubstitutes', () => {
        const t = new SufTrie();
        t.add('*.npmrc', '${capture}.json');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['.json']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['a.json']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['a.b.c.d.json']);
    });
    test('multiMatches', () => {
        const t = new SufTrie();
        t.add('*.npmrc', 'Key1');
        t.add('*.json', 'Key2');
        t.add('*d.npmrc', 'Key3');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['Key1', 'Key3']);
    });
    test('multiSubstitutes', () => {
        const t = new SufTrie();
        t.add('*.npmrc', 'Key1.${capture}.js');
        t.add('*.json', 'Key2.${capture}.js');
        t.add('*d.npmrc', 'Key3.${capture}.js');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1..js']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2..js']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2.a.js']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1.a.js']);
        assert.deepStrictEqual(t.get('a.b.cd.npmrc', fakeFilenameAttributes), ['Key1.a.b.cd.js', 'Key3.a.b.c.js']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['Key1.a.b.c.d.js', 'Key3.a.b.c..js']);
    });
});
suite('PreTrie', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('exactMatches', () => {
        const t = new PreTrie();
        t.add('.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), []);
    });
    test('starMatches', () => {
        const t = new PreTrie();
        t.add('*.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['MyKey']);
    });
    test('starSubstitutes', () => {
        const t = new PreTrie();
        t.add('*.npmrc', '${capture}.json');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['.json']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['a.json']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['a.b.c.d.json']);
    });
    test('multiMatches', () => {
        const t = new PreTrie();
        t.add('*.npmrc', 'Key1');
        t.add('*.json', 'Key2');
        t.add('*d.npmrc', 'Key3');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['Key1', 'Key3']);
    });
    test('multiSubstitutes', () => {
        const t = new PreTrie();
        t.add('*.npmrc', 'Key1.${capture}.js');
        t.add('*.json', 'Key2.${capture}.js');
        t.add('*d.npmrc', 'Key3.${capture}.js');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1..js']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2..js']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2.a.js']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1.a.js']);
        assert.deepStrictEqual(t.get('a.b.cd.npmrc', fakeFilenameAttributes), ['Key1.a.b.cd.js', 'Key3.a.b.c.js']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['Key1.a.b.c.d.js', 'Key3.a.b.c..js']);
    });
    test('emptyMatches', () => {
        const t = new PreTrie();
        t.add('package*json', 'package');
        assert.deepStrictEqual(t.get('package.json', fakeFilenameAttributes), ['package']);
        assert.deepStrictEqual(t.get('packagejson', fakeFilenameAttributes), ['package']);
        assert.deepStrictEqual(t.get('package-lock.json', fakeFilenameAttributes), ['package']);
    });
});
suite('StarTrie', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const assertMapEquals = (actual, expected) => {
        const actualStr = [...actual.entries()].map(e => `${e[0]} => [${[...e[1].keys()].join()}]`);
        const expectedStr = Object.entries(expected).map(e => `${e[0]}: [${[e[1]].join()}]`);
        const bigMsg = actualStr + '===' + expectedStr;
        assert.strictEqual(actual.size, Object.keys(expected).length, bigMsg);
        for (const parent of actual.keys()) {
            const act = actual.get(parent);
            const exp = expected[parent];
            const str = [...act.keys()].join() + '===' + exp.join();
            const msg = bigMsg + '\n' + str;
            assert(act.size === exp.length, msg);
            for (const child of exp) {
                assert(act.has(child), msg);
            }
        }
    };
    test('does added extension nesting', () => {
        const t = new ExplorerFileNestingTrie([
            ['*', ['${capture}.*']],
        ]);
        const nesting = t.nest([
            'file',
            'file.json',
            'boop.test',
            'boop.test1',
            'boop.test.1',
            'beep',
            'beep.test1',
            'beep.boop.test1',
            'beep.boop.test2',
            'beep.boop.a',
        ], 'mydir');
        assertMapEquals(nesting, {
            'file': ['file.json'],
            'boop.test': ['boop.test.1'],
            'boop.test1': [],
            'beep': ['beep.test1', 'beep.boop.test1', 'beep.boop.test2', 'beep.boop.a']
        });
    });
    test('does ext specific nesting', () => {
        const t = new ExplorerFileNestingTrie([
            ['*.ts', ['${capture}.js']],
            ['*.js', ['${capture}.map']],
        ]);
        const nesting = t.nest([
            'a.ts',
            'a.js',
            'a.jss',
            'ab.js',
            'b.js',
            'b.map',
            'c.ts',
            'c.js',
            'c.map',
            'd.ts',
            'd.map',
        ], 'mydir');
        assertMapEquals(nesting, {
            'a.ts': ['a.js'],
            'ab.js': [],
            'a.jss': [],
            'b.js': ['b.map'],
            'c.ts': ['c.js', 'c.map'],
            'd.ts': [],
            'd.map': [],
        });
    });
    test('handles loops', () => {
        const t = new ExplorerFileNestingTrie([
            ['*.a', ['${capture}.b', '${capture}.c']],
            ['*.b', ['${capture}.a']],
            ['*.c', ['${capture}.d']],
            ['*.aa', ['${capture}.bb']],
            ['*.bb', ['${capture}.cc', '${capture}.dd']],
            ['*.cc', ['${capture}.aa']],
            ['*.dd', ['${capture}.ee']],
        ]);
        const nesting = t.nest([
            '.a', '.b', '.c', '.d',
            'a.a', 'a.b', 'a.d',
            'a.aa', 'a.bb', 'a.cc',
            'b.aa', 'b.bb',
            'c.bb', 'c.cc',
            'd.aa', 'd.cc',
            'e.aa', 'e.bb', 'e.dd', 'e.ee',
            'f.aa', 'f.bb', 'f.cc', 'f.dd', 'f.ee',
        ], 'mydir');
        assertMapEquals(nesting, {
            '.a': [], '.b': [], '.c': [], '.d': [],
            'a.a': [], 'a.b': [], 'a.d': [],
            'a.aa': [], 'a.bb': [], 'a.cc': [],
            'b.aa': ['b.bb'],
            'c.bb': ['c.cc'],
            'd.cc': ['d.aa'],
            'e.aa': ['e.bb', 'e.dd', 'e.ee'],
            'f.aa': [], 'f.bb': [], 'f.cc': [], 'f.dd': [], 'f.ee': []
        });
    });
    test('does general bidirectional suffix matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['*-vsdoc.js', ['${capture}.js']],
            ['*.js', ['${capture}-vscdoc.js']],
        ]);
        const nesting = t.nest([
            'a-vsdoc.js',
            'a.js',
            'b.js',
            'b-vscdoc.js',
        ], 'mydir');
        assertMapEquals(nesting, {
            'a-vsdoc.js': ['a.js'],
            'b.js': ['b-vscdoc.js'],
        });
    });
    test('does general bidirectional prefix matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['vsdoc-*.js', ['${capture}.js']],
            ['*.js', ['vscdoc-${capture}.js']],
        ]);
        const nesting = t.nest([
            'vsdoc-a.js',
            'a.js',
            'b.js',
            'vscdoc-b.js',
        ], 'mydir');
        assertMapEquals(nesting, {
            'vsdoc-a.js': ['a.js'],
            'b.js': ['vscdoc-b.js'],
        });
    });
    test('does general bidirectional general matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['foo-*-bar.js', ['${capture}.js']],
            ['*.js', ['bib-${capture}-bap.js']],
        ]);
        const nesting = t.nest([
            'foo-a-bar.js',
            'a.js',
            'b.js',
            'bib-b-bap.js',
        ], 'mydir');
        assertMapEquals(nesting, {
            'foo-a-bar.js': ['a.js'],
            'b.js': ['bib-b-bap.js'],
        });
    });
    test('does extension specific path segment matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['*.js', ['${capture}.*.js']],
        ]);
        const nesting = t.nest([
            'foo.js',
            'foo.test.js',
            'fooTest.js',
            'bar.js.js',
        ], 'mydir');
        assertMapEquals(nesting, {
            'foo.js': ['foo.test.js'],
            'fooTest.js': [],
            'bar.js.js': [],
        });
    });
    test('does exact match nesting', () => {
        const t = new ExplorerFileNestingTrie([
            ['package.json', ['.npmrc', 'npm-shrinkwrap.json', 'yarn.lock', '.yarnclean', '.yarnignore', '.yarn-integrity', '.yarnrc']],
            ['bower.json', ['.bowerrc']],
        ]);
        const nesting = t.nest([
            'package.json',
            '.npmrc', 'npm-shrinkwrap.json', 'yarn.lock',
            '.bowerrc',
        ], 'mydir');
        assertMapEquals(nesting, {
            'package.json': [
                '.npmrc', 'npm-shrinkwrap.json', 'yarn.lock'
            ],
            '.bowerrc': [],
        });
    });
    test('eslint test', () => {
        const t = new ExplorerFileNestingTrie([
            ['.eslintrc*', ['.eslint*']],
        ]);
        const nesting1 = t.nest([
            '.eslintrc.json',
            '.eslintignore',
        ], 'mydir');
        assertMapEquals(nesting1, {
            '.eslintrc.json': ['.eslintignore'],
        });
        const nesting2 = t.nest([
            '.eslintrc',
            '.eslintignore',
        ], 'mydir');
        assertMapEquals(nesting2, {
            '.eslintrc': ['.eslintignore'],
        });
    });
    test('basename expansion', () => {
        const t = new ExplorerFileNestingTrie([
            ['*-vsdoc.js', ['${basename}.doc']],
        ]);
        const nesting1 = t.nest([
            'boop-vsdoc.js',
            'boop-vsdoc.doc',
            'boop.doc',
        ], 'mydir');
        assertMapEquals(nesting1, {
            'boop-vsdoc.js': ['boop-vsdoc.doc'],
            'boop.doc': [],
        });
    });
    test('extname expansion', () => {
        const t = new ExplorerFileNestingTrie([
            ['*-vsdoc.js', ['${extname}.doc']],
        ]);
        const nesting1 = t.nest([
            'boop-vsdoc.js',
            'js.doc',
            'boop.doc',
        ], 'mydir');
        assertMapEquals(nesting1, {
            'boop-vsdoc.js': ['js.doc'],
            'boop.doc': [],
        });
    });
    test('added segment matcher', () => {
        const t = new ExplorerFileNestingTrie([
            ['*', ['${basename}.*.${extname}']],
        ]);
        const nesting1 = t.nest([
            'some.file',
            'some.html.file',
            'some.html.nested.file',
            'other.file',
            'some.thing',
            'some.thing.else',
        ], 'mydir');
        assertMapEquals(nesting1, {
            'some.file': ['some.html.file', 'some.html.nested.file'],
            'other.file': [],
            'some.thing': [],
            'some.thing.else': [],
        });
    });
    test('added segment matcher (old format)', () => {
        const t = new ExplorerFileNestingTrie([
            ['*', ['$(basename).*.$(extname)']],
        ]);
        const nesting1 = t.nest([
            'some.file',
            'some.html.file',
            'some.html.nested.file',
            'other.file',
            'some.thing',
            'some.thing.else',
        ], 'mydir');
        assertMapEquals(nesting1, {
            'some.file': ['some.html.file', 'some.html.nested.file'],
            'other.file': [],
            'some.thing': [],
            'some.thing.else': [],
        });
    });
    test('dirname matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['index.ts', ['${dirname}.ts']],
        ]);
        const nesting1 = t.nest([
            'otherFile.ts',
            'MyComponent.ts',
            'index.ts',
        ], 'MyComponent');
        assertMapEquals(nesting1, {
            'index.ts': ['MyComponent.ts'],
            'otherFile.ts': [],
        });
    });
    test.skip('is fast', () => {
        const bigNester = new ExplorerFileNestingTrie([
            ['*', ['${capture}.*']],
            ['*.js', ['${capture}.*.js', '${capture}.map']],
            ['*.jsx', ['${capture}.js']],
            ['*.ts', ['${capture}.js', '${capture}.*.ts']],
            ['*.tsx', ['${capture}.js']],
            ['*.css', ['${capture}.*.css', '${capture}.map']],
            ['*.html', ['${capture}.*.html']],
            ['*.htm', ['${capture}.*.htm']],
            ['*.less', ['${capture}.*.less', '${capture}.css']],
            ['*.scss', ['${capture}.*.scss', '${capture}.css']],
            ['*.sass', ['${capture}.css']],
            ['*.styl', ['${capture}.css']],
            ['*.coffee', ['${capture}.*.coffee', '${capture}.js']],
            ['*.iced', ['${capture}.*.iced', '${capture}.js']],
            ['*.config', ['${capture}.*.config']],
            ['*.cs', ['${capture}.*.cs', '${capture}.cs.d.ts']],
            ['*.vb', ['${capture}.*.vb']],
            ['*.json', ['${capture}.*.json']],
            ['*.md', ['${capture}.html']],
            ['*.mdown', ['${capture}.html']],
            ['*.markdown', ['${capture}.html']],
            ['*.mdwn', ['${capture}.html']],
            ['*.svg', ['${capture}.svgz']],
            ['*.a', ['${capture}.b']],
            ['*.b', ['${capture}.a']],
            ['*.resx', ['${capture}.designer.cs']],
            ['package.json', ['.npmrc', 'npm-shrinkwrap.json', 'yarn.lock', '.yarnclean', '.yarnignore', '.yarn-integrity', '.yarnrc']],
            ['bower.json', ['.bowerrc']],
            ['*-vsdoc.js', ['${capture}.js']],
            ['*.tt', ['${capture}.*']]
        ]);
        const bigFiles = Array.from({ length: 50000 / 6 }).map((_, i) => [
            'file' + i + '.js',
            'file' + i + '.map',
            'file' + i + '.css',
            'file' + i + '.ts',
            'file' + i + '.d.ts',
            'file' + i + '.jsx',
        ]).flat();
        const start = performance.now();
        // const _bigResult =
        bigNester.nest(bigFiles, 'mydir');
        const end = performance.now();
        assert(end - start < 1000, 'too slow...' + (end - start));
        // console.log(bigResult)
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy90ZXN0L2Jyb3dzZXIvZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxNQUFNLHNCQUFzQixHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztBQUUvRSxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sQ0FBQyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMs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