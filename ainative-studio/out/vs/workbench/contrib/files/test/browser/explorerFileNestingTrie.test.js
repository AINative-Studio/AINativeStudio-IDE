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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvdGVzdC9icm93c2VyL2V4cGxvcmVyRmlsZU5lc3RpbmdUcmllLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsTUFBTSxzQkFBc0IsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7QUFFL0UsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFDckIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixNQUFNLENBQUMsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sQ0FBQyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDNUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNuRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDNUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixNQUFNLENBQUMsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDMUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDMUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMxRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3ZDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUM3RSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUMzRyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7SUFDL0csQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ3JCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6QixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDdEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLENBQUMsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDbkYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLE1BQU0sQ0FBQyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUM3RSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQzFGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN6RSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sQ0FBQyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3RDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUM5RSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDN0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUMvRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDM0csTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBQy9HLENBQUMsQ0FBQyxDQUFDO0lBR0gsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3pGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtJQUN0Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sZUFBZSxHQUFHLENBQUMsTUFBZ0MsRUFBRSxRQUFrQyxFQUFFLEVBQUU7UUFDaEcsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUYsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyRixNQUFNLE1BQU0sR0FBRyxTQUFTLEdBQUcsS0FBSyxHQUFHLFdBQVcsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEUsS0FBSyxNQUFNLE1BQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNwQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBRSxDQUFDO1lBQ2hDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3QixNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN4RCxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztZQUNoQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3JDLEtBQUssTUFBTSxLQUFLLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ3pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDO0lBRUYsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxNQUFNLENBQUMsR0FBRyxJQUFJLHVCQUF1QixDQUFDO1lBQ3JDLENBQUMsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDdkIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0QixNQUFNO1lBQ04sV0FBVztZQUNYLFdBQVc7WUFDWCxZQUFZO1lBQ1osYUFBYTtZQUNiLE1BQU07WUFDTixZQUFZO1lBQ1osaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixhQUFhO1NBQ2IsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNaLGVBQWUsQ0FBQyxPQUFPLEVBQUU7WUFDeEIsTUFBTSxFQUFFLENBQUMsV0FBVyxDQUFDO1lBQ3JCLFdBQVcsRUFBRSxDQUFDLGFBQWEsQ0FBQztZQUM1QixZQUFZLEVBQUUsRUFBRTtZQUNoQixNQUFNLEVBQUUsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxDQUFDO1NBQzNFLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLENBQUMsR0FBRyxJQUFJLHVCQUF1QixDQUFDO1lBQ3JDLENBQUMsTUFBTSxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDM0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1NBQzVCLENBQUMsQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdEIsTUFBTTtZQUNOLE1BQU07WUFDTixPQUFPO1lBQ1AsT0FBTztZQUNQLE1BQU07WUFDTixPQUFPO1lBQ1AsTUFBTTtZQUNOLE1BQU07WUFDTixPQUFPO1lBQ1AsTUFBTTtZQUNOLE9BQU87U0FDUCxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ1osZUFBZSxDQUFDLE9BQU8sRUFBRTtZQUN4QixNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDaEIsT0FBTyxFQUFFLEVBQUU7WUFDWCxPQUFPLEVBQUUsRUFBRTtZQUNYLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUNqQixNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO1lBQ3pCLE1BQU0sRUFBRSxFQUFFO1lBQ1YsT0FBTyxFQUFFLEVBQUU7U0FDWCxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxHQUFHLElBQUksdUJBQXVCLENBQUM7WUFDckMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDekMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN6QixDQUFDLEtBQUssRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRXpCLENBQUMsTUFBTSxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDM0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDNUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMzQixDQUFDLE1BQU0sRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1NBQzNCLENBQUMsQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdEIsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSTtZQUN0QixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUs7WUFDbkIsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNO1lBQ3RCLE1BQU0sRUFBRSxNQUFNO1lBQ2QsTUFBTSxFQUFFLE1BQU07WUFDZCxNQUFNLEVBQUUsTUFBTTtZQUNkLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU07WUFDOUIsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU07U0FDdEMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVaLGVBQWUsQ0FBQyxPQUFPLEVBQUU7WUFDeEIsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDdEMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQy9CLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNsQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDaEIsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ2hCLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUNoQixNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQztZQUNoQyxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFO1NBQzFELENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtRQUN2RCxNQUFNLENBQUMsR0FBRyxJQUFJLHVCQUF1QixDQUFDO1lBQ3JDLENBQUMsWUFBWSxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDakMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVILE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdEIsWUFBWTtZQUNaLE1BQU07WUFDTixNQUFNO1lBQ04sYUFBYTtTQUNiLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFWixlQUFlLENBQUMsT0FBTyxFQUFFO1lBQ3hCLFlBQVksRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUN0QixNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUM7U0FDdkIsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELE1BQU0sQ0FBQyxHQUFHLElBQUksdUJBQXVCLENBQUM7WUFDckMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNqQyxDQUFDLE1BQU0sRUFBRSxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0QixZQUFZO1lBQ1osTUFBTTtZQUNOLE1BQU07WUFDTixhQUFhO1NBQ2IsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVaLGVBQWUsQ0FBQyxPQUFPLEVBQUU7WUFDeEIsWUFBWSxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ3RCLE1BQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQztTQUN2QixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDeEQsTUFBTSxDQUFDLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQztZQUNyQyxDQUFDLGNBQWMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ25DLENBQUMsTUFBTSxFQUFFLENBQUMsdUJBQXVCLENBQUMsQ0FBQztTQUNuQyxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3RCLGNBQWM7WUFDZCxNQUFNO1lBQ04sTUFBTTtZQUNOLGNBQWM7U0FDZCxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRVosZUFBZSxDQUFDLE9BQU8sRUFBRTtZQUN4QixjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDeEIsTUFBTSxFQUFFLENBQUMsY0FBYyxDQUFDO1NBQ3hCLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEdBQUcsRUFBRTtRQUMxRCxNQUFNLENBQUMsR0FBRyxJQUFJLHVCQUF1QixDQUFDO1lBQ3JDLENBQUMsTUFBTSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUM3QixDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3RCLFFBQVE7WUFDUixhQUFhO1lBQ2IsWUFBWTtZQUNaLFdBQVc7U0FDWCxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRVosZUFBZSxDQUFDLE9BQU8sRUFBRTtZQUN4QixRQUFRLEVBQUUsQ0FBQyxhQUFhLENBQUM7WUFDekIsWUFBWSxFQUFFLEVBQUU7WUFDaEIsV0FBVyxFQUFFLEVBQUU7U0FDZixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFDckMsTUFBTSxDQUFDLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQztZQUNyQyxDQUFDLGNBQWMsRUFBRSxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMzSCxDQUFDLFlBQVksRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQzVCLENBQUMsQ0FBQztRQUVILE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdEIsY0FBYztZQUNkLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxXQUFXO1lBQzVDLFVBQVU7U0FDVixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRVosZUFBZSxDQUFDLE9BQU8sRUFBRTtZQUN4QixjQUFjLEVBQUU7Z0JBQ2YsUUFBUSxFQUFFLHFCQUFxQixFQUFFLFdBQVc7YUFBQztZQUM5QyxVQUFVLEVBQUUsRUFBRTtTQUNkLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDeEIsTUFBTSxDQUFDLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQztZQUNyQyxDQUFDLFlBQVksRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQzVCLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdkIsZ0JBQWdCO1lBQ2hCLGVBQWU7U0FDZixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRVosZUFBZSxDQUFDLFFBQVEsRUFBRTtZQUN6QixnQkFBZ0IsRUFBRSxDQUFDLGVBQWUsQ0FBQztTQUNuQyxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLFdBQVc7WUFDWCxlQUFlO1NBQ2YsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVaLGVBQWUsQ0FBQyxRQUFRLEVBQUU7WUFDekIsV0FBVyxFQUFFLENBQUMsZUFBZSxDQUFDO1NBQzlCLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLENBQUMsR0FBRyxJQUFJLHVCQUF1QixDQUFDO1lBQ3JDLENBQUMsWUFBWSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUNuQyxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLGVBQWU7WUFDZixnQkFBZ0I7WUFDaEIsVUFBVTtTQUNWLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFWixlQUFlLENBQUMsUUFBUSxFQUFFO1lBQ3pCLGVBQWUsRUFBRSxDQUFDLGdCQUFnQixDQUFDO1lBQ25DLFVBQVUsRUFBRSxFQUFFO1NBQ2QsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sQ0FBQyxHQUFHLElBQUksdUJBQXVCLENBQUM7WUFDckMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdkIsZUFBZTtZQUNmLFFBQVE7WUFDUixVQUFVO1NBQ1YsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVaLGVBQWUsQ0FBQyxRQUFRLEVBQUU7WUFDekIsZUFBZSxFQUFFLENBQUMsUUFBUSxDQUFDO1lBQzNCLFVBQVUsRUFBRSxFQUFFO1NBQ2QsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sQ0FBQyxHQUFHLElBQUksdUJBQXVCLENBQUM7WUFDckMsQ0FBQyxHQUFHLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1NBQ25DLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdkIsV0FBVztZQUNYLGdCQUFnQjtZQUNoQix1QkFBdUI7WUFDdkIsWUFBWTtZQUNaLFlBQVk7WUFDWixpQkFBaUI7U0FDakIsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVaLGVBQWUsQ0FBQyxRQUFRLEVBQUU7WUFDekIsV0FBVyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsdUJBQXVCLENBQUM7WUFDeEQsWUFBWSxFQUFFLEVBQUU7WUFDaEIsWUFBWSxFQUFFLEVBQUU7WUFDaEIsaUJBQWlCLEVBQUUsRUFBRTtTQUNyQixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0MsTUFBTSxDQUFDLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQztZQUNyQyxDQUFDLEdBQUcsRUFBRSxDQUFDLDBCQUEwQixDQUFDLENBQUM7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN2QixXQUFXO1lBQ1gsZ0JBQWdCO1lBQ2hCLHVCQUF1QjtZQUN2QixZQUFZO1lBQ1osWUFBWTtZQUNaLGlCQUFpQjtTQUNqQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRVosZUFBZSxDQUFDLFFBQVEsRUFBRTtZQUN6QixXQUFXLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQztZQUN4RCxZQUFZLEVBQUUsRUFBRTtZQUNoQixZQUFZLEVBQUUsRUFBRTtZQUNoQixpQkFBaUIsRUFBRSxFQUFFO1NBQ3JCLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLENBQUMsR0FBRyxJQUFJLHVCQUF1QixDQUFDO1lBQ3JDLENBQUMsVUFBVSxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN2QixjQUFjO1lBQ2QsZ0JBQWdCO1lBQ2hCLFVBQVU7U0FDVixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRWxCLGVBQWUsQ0FBQyxRQUFRLEVBQUU7WUFDekIsVUFBVSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7WUFDOUIsY0FBYyxFQUFFLEVBQUU7U0FDbEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxTQUFTLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQztZQUM3QyxDQUFDLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3ZCLENBQUMsTUFBTSxFQUFFLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUMvQyxDQUFDLE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzVCLENBQUMsTUFBTSxFQUFFLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDOUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUM1QixDQUFDLE9BQU8sRUFBRSxDQUFDLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFDakQsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2pDLENBQUMsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUMvQixDQUFDLFFBQVEsRUFBRSxDQUFDLG1CQUFtQixFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFDbkQsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ25ELENBQUMsUUFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUM5QixDQUFDLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDOUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUN0RCxDQUFDLFFBQVEsRUFBRSxDQUFDLG1CQUFtQixFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQ2xELENBQUMsVUFBVSxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUNyQyxDQUFDLE1BQU0sRUFBRSxDQUFDLGlCQUFpQixFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDbkQsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzdCLENBQUMsUUFBUSxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUNqQyxDQUFDLE1BQU0sRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDN0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2hDLENBQUMsWUFBWSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNuQyxDQUFDLFFBQVEsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDL0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzlCLENBQUMsS0FBSyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDekIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN6QixDQUFDLFFBQVEsRUFBRSxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDdEMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxRQUFRLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDM0gsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM1QixDQUFDLFlBQVksRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2pDLENBQUMsTUFBTSxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoRSxNQUFNLEdBQUcsQ0FBQyxHQUFHLEtBQUs7WUFDbEIsTUFBTSxHQUFHLENBQUMsR0FBRyxNQUFNO1lBQ25CLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTTtZQUNuQixNQUFNLEdBQUcsQ0FBQyxHQUFHLEtBQUs7WUFDbEIsTUFBTSxHQUFHLENBQUMsR0FBRyxPQUFPO1lBQ3BCLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTTtTQUNuQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFVixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDaEMscUJBQXFCO1FBQ3JCLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM5QixNQUFNLENBQUMsR0FBRyxHQUFHLEtBQUssR0FBRyxJQUFJLEVBQUUsYUFBYSxHQUFHLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUQseUJBQXlCO0lBQzFCLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==