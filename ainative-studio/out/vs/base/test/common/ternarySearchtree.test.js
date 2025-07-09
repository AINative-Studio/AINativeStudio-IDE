/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { shuffle } from '../../common/arrays.js';
import { randomPath } from '../../common/extpath.js';
import { StopWatch } from '../../common/stopwatch.js';
import { ConfigKeysIterator, PathIterator, StringIterator, TernarySearchTree, UriIterator } from '../../common/ternarySearchTree.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Ternary Search Tree', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('PathIterator', () => {
        const iter = new PathIterator();
        iter.reset('file:///usr/bin/file.txt');
        assert.strictEqual(iter.value(), 'file:');
        assert.strictEqual(iter.hasNext(), true);
        assert.strictEqual(iter.cmp('file:'), 0);
        assert.ok(iter.cmp('a') < 0);
        assert.ok(iter.cmp('aile:') < 0);
        assert.ok(iter.cmp('z') > 0);
        assert.ok(iter.cmp('zile:') > 0);
        iter.next();
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), false);
        iter.next();
        assert.strictEqual(iter.value(), '');
        assert.strictEqual(iter.hasNext(), false);
        iter.next();
        assert.strictEqual(iter.value(), '');
        assert.strictEqual(iter.hasNext(), false);
        //
        iter.reset('/foo/bar/');
        assert.strictEqual(iter.value(), 'foo');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'bar');
        assert.strictEqual(iter.hasNext(), false);
    });
    test('URIIterator', function () {
        const iter = new UriIterator(() => false, () => false);
        iter.reset(URI.parse('file:///usr/bin/file.txt'));
        assert.strictEqual(iter.value(), 'file');
        // assert.strictEqual(iter.cmp('FILE'), 0);
        assert.strictEqual(iter.cmp('file'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), false);
        iter.reset(URI.parse('file://share/usr/bin/file.txt?foo'));
        // scheme
        assert.strictEqual(iter.value(), 'file');
        // assert.strictEqual(iter.cmp('FILE'), 0);
        assert.strictEqual(iter.cmp('file'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // authority
        assert.strictEqual(iter.value(), 'share');
        assert.strictEqual(iter.cmp('SHARe'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // query
        assert.strictEqual(iter.value(), 'foo');
        assert.strictEqual(iter.cmp('z') > 0, true);
        assert.strictEqual(iter.cmp('a') < 0, true);
        assert.strictEqual(iter.hasNext(), false);
    });
    test('URIIterator - ignore query/fragment', function () {
        const iter = new UriIterator(() => false, () => true);
        iter.reset(URI.parse('file:///usr/bin/file.txt'));
        assert.strictEqual(iter.value(), 'file');
        // assert.strictEqual(iter.cmp('FILE'), 0);
        assert.strictEqual(iter.cmp('file'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), false);
        iter.reset(URI.parse('file://share/usr/bin/file.txt?foo'));
        // scheme
        assert.strictEqual(iter.value(), 'file');
        // assert.strictEqual(iter.cmp('FILE'), 0);
        assert.strictEqual(iter.cmp('file'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // authority
        assert.strictEqual(iter.value(), 'share');
        assert.strictEqual(iter.cmp('SHARe'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), false);
    });
    function assertTstDfs(trie, ...elements) {
        assert.ok(trie._isBalanced(), 'TST is not balanced');
        let i = 0;
        for (const [key, value] of trie) {
            const expected = elements[i++];
            assert.ok(expected);
            assert.strictEqual(key, expected[0]);
            assert.strictEqual(value, expected[1]);
        }
        assert.strictEqual(i, elements.length);
        const map = new Map();
        for (const [key, value] of elements) {
            map.set(key, value);
        }
        map.forEach((value, key) => {
            assert.strictEqual(trie.get(key), value);
        });
        // forEach
        let forEachCount = 0;
        trie.forEach((element, key) => {
            assert.strictEqual(element, map.get(key));
            forEachCount++;
        });
        assert.strictEqual(map.size, forEachCount);
        // iterator
        let iterCount = 0;
        for (const [key, value] of trie) {
            assert.strictEqual(value, map.get(key));
            iterCount++;
        }
        assert.strictEqual(map.size, iterCount);
    }
    test('TernarySearchTree - set', function () {
        let trie = TernarySearchTree.forStrings();
        trie.set('foobar', 1);
        trie.set('foobaz', 2);
        assertTstDfs(trie, ['foobar', 1], ['foobaz', 2]); // longer
        trie = TernarySearchTree.forStrings();
        trie.set('foobar', 1);
        trie.set('fooba', 2);
        assertTstDfs(trie, ['fooba', 2], ['foobar', 1]); // shorter
        trie = TernarySearchTree.forStrings();
        trie.set('foo', 1);
        trie.set('foo', 2);
        assertTstDfs(trie, ['foo', 2]);
        trie = TernarySearchTree.forStrings();
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('bar', 3);
        trie.set('foob', 4);
        trie.set('bazz', 5);
        assertTstDfs(trie, ['bar', 3], ['bazz', 5], ['foo', 1], ['foob', 4], ['foobar', 2]);
    });
    test('TernarySearchTree - set w/ undefined', function () {
        const trie = TernarySearchTree.forStrings();
        trie.set('foobar', undefined);
        trie.set('foobaz', 2);
        assert.strictEqual(trie.get('foobar'), undefined);
        assert.strictEqual(trie.get('foobaz'), 2);
        assert.strictEqual(trie.get('NOT HERE'), undefined);
        assert.ok(trie.has('foobaz'));
        assert.ok(trie.has('foobar'));
        assert.ok(!trie.has('NOT HERE'));
        assertTstDfs(trie, ['foobar', undefined], ['foobaz', 2]); // should check for undefined value
        const oldValue = trie.set('foobar', 3);
        assert.strictEqual(oldValue, undefined);
        assert.strictEqual(trie.get('foobar'), 3);
    });
    test('TernarySearchTree - findLongestMatch', function () {
        const trie = TernarySearchTree.forStrings();
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('foobaz', 3);
        assertTstDfs(trie, ['foo', 1], ['foobar', 2], ['foobaz', 3]);
        assert.strictEqual(trie.findSubstr('f'), undefined);
        assert.strictEqual(trie.findSubstr('z'), undefined);
        assert.strictEqual(trie.findSubstr('foo'), 1);
        assert.strictEqual(trie.findSubstr('fooö'), 1);
        assert.strictEqual(trie.findSubstr('fooba'), 1);
        assert.strictEqual(trie.findSubstr('foobarr'), 2);
        assert.strictEqual(trie.findSubstr('foobazrr'), 3);
    });
    test('TernarySearchTree - basics', function () {
        const trie = new TernarySearchTree(new StringIterator());
        trie.set('foo', 1);
        trie.set('bar', 2);
        trie.set('foobar', 3);
        assertTstDfs(trie, ['bar', 2], ['foo', 1], ['foobar', 3]);
        assert.strictEqual(trie.get('foo'), 1);
        assert.strictEqual(trie.get('bar'), 2);
        assert.strictEqual(trie.get('foobar'), 3);
        assert.strictEqual(trie.get('foobaz'), undefined);
        assert.strictEqual(trie.get('foobarr'), undefined);
        assert.strictEqual(trie.findSubstr('fo'), undefined);
        assert.strictEqual(trie.findSubstr('foo'), 1);
        assert.strictEqual(trie.findSubstr('foooo'), 1);
        trie.delete('foobar');
        trie.delete('bar');
        assert.strictEqual(trie.get('foobar'), undefined);
        assert.strictEqual(trie.get('bar'), undefined);
        trie.set('foobar', 17);
        trie.set('barr', 18);
        assert.strictEqual(trie.get('foobar'), 17);
        assert.strictEqual(trie.get('barr'), 18);
        assert.strictEqual(trie.get('bar'), undefined);
    });
    test('TernarySearchTree - delete & cleanup', function () {
        // normal delete
        let trie = new TernarySearchTree(new StringIterator());
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('bar', 3);
        assertTstDfs(trie, ['bar', 3], ['foo', 1], ['foobar', 2]);
        trie.delete('foo');
        assertTstDfs(trie, ['bar', 3], ['foobar', 2]);
        trie.delete('foobar');
        assertTstDfs(trie, ['bar', 3]);
        // superstr-delete
        trie = new TernarySearchTree(new StringIterator());
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('bar', 3);
        trie.set('foobarbaz', 4);
        trie.deleteSuperstr('foo');
        assertTstDfs(trie, ['bar', 3], ['foo', 1]);
        trie = new TernarySearchTree(new StringIterator());
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('bar', 3);
        trie.set('foobarbaz', 4);
        trie.deleteSuperstr('fo');
        assertTstDfs(trie, ['bar', 3]);
        // trie = new TernarySearchTree<string, number>(new StringIterator());
        // trie.set('foo', 1);
        // trie.set('foobar', 2);
        // trie.set('bar', 3);
        // trie.deleteSuperStr('f');
        // assertTernarySearchTree(trie, ['bar', 3]);
    });
    test('TernarySearchTree (PathSegments) - basics', function () {
        const trie = new TernarySearchTree(new PathIterator());
        trie.set('/user/foo/bar', 1);
        trie.set('/user/foo', 2);
        trie.set('/user/foo/flip/flop', 3);
        assert.strictEqual(trie.get('/user/foo/bar'), 1);
        assert.strictEqual(trie.get('/user/foo'), 2);
        assert.strictEqual(trie.get('/user//foo'), 2);
        assert.strictEqual(trie.get('/user\\foo'), 2);
        assert.strictEqual(trie.get('/user/foo/flip/flop'), 3);
        assert.strictEqual(trie.findSubstr('/user/bar'), undefined);
        assert.strictEqual(trie.findSubstr('/user/foo'), 2);
        assert.strictEqual(trie.findSubstr('\\user\\foo'), 2);
        assert.strictEqual(trie.findSubstr('/user//foo'), 2);
        assert.strictEqual(trie.findSubstr('/user/foo/ba'), 2);
        assert.strictEqual(trie.findSubstr('/user/foo/far/boo'), 2);
        assert.strictEqual(trie.findSubstr('/user/foo/bar'), 1);
        assert.strictEqual(trie.findSubstr('/user/foo/bar/far/boo'), 1);
    });
    test('TernarySearchTree - (AVL) set', function () {
        {
            // rotate left
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/fileA', 1);
            trie.set('/fileB', 2);
            trie.set('/fileC', 3);
            assertTstDfs(trie, ['/fileA', 1], ['/fileB', 2], ['/fileC', 3]);
        }
        {
            // rotate left (inside middle)
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/foo/fileA', 1);
            trie.set('/foo/fileB', 2);
            trie.set('/foo/fileC', 3);
            assertTstDfs(trie, ['/foo/fileA', 1], ['/foo/fileB', 2], ['/foo/fileC', 3]);
        }
        {
            // rotate right
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/fileC', 3);
            trie.set('/fileB', 2);
            trie.set('/fileA', 1);
            assertTstDfs(trie, ['/fileA', 1], ['/fileB', 2], ['/fileC', 3]);
        }
        {
            // rotate right (inside middle)
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/mid/fileC', 3);
            trie.set('/mid/fileB', 2);
            trie.set('/mid/fileA', 1);
            assertTstDfs(trie, ['/mid/fileA', 1], ['/mid/fileB', 2], ['/mid/fileC', 3]);
        }
        {
            // rotate right, left
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/fileD', 7);
            trie.set('/fileB', 2);
            trie.set('/fileG', 42);
            trie.set('/fileF', 24);
            trie.set('/fileZ', 73);
            trie.set('/fileE', 15);
            assertTstDfs(trie, ['/fileB', 2], ['/fileD', 7], ['/fileE', 15], ['/fileF', 24], ['/fileG', 42], ['/fileZ', 73]);
        }
        {
            // rotate left, right
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/fileJ', 42);
            trie.set('/fileZ', 73);
            trie.set('/fileE', 15);
            trie.set('/fileB', 2);
            trie.set('/fileF', 7);
            trie.set('/fileG', 1);
            assertTstDfs(trie, ['/fileB', 2], ['/fileE', 15], ['/fileF', 7], ['/fileG', 1], ['/fileJ', 42], ['/fileZ', 73]);
        }
    });
    test('TernarySearchTree - (BST) delete', function () {
        const trie = new TernarySearchTree(new StringIterator());
        // delete root
        trie.set('d', 1);
        assertTstDfs(trie, ['d', 1]);
        trie.delete('d');
        assertTstDfs(trie);
        // delete node with two element
        trie.clear();
        trie.set('d', 1);
        trie.set('b', 1);
        trie.set('f', 1);
        assertTstDfs(trie, ['b', 1], ['d', 1], ['f', 1]);
        trie.delete('d');
        assertTstDfs(trie, ['b', 1], ['f', 1]);
        // single child node
        trie.clear();
        trie.set('d', 1);
        trie.set('b', 1);
        trie.set('f', 1);
        trie.set('e', 1);
        assertTstDfs(trie, ['b', 1], ['d', 1], ['e', 1], ['f', 1]);
        trie.delete('f');
        assertTstDfs(trie, ['b', 1], ['d', 1], ['e', 1]);
    });
    test('TernarySearchTree - (AVL) delete', function () {
        const trie = new TernarySearchTree(new StringIterator());
        trie.clear();
        trie.set('d', 1);
        trie.set('b', 1);
        trie.set('f', 1);
        trie.set('e', 1);
        trie.set('z', 1);
        assertTstDfs(trie, ['b', 1], ['d', 1], ['e', 1], ['f', 1], ['z', 1]);
        // right, right
        trie.delete('b');
        assertTstDfs(trie, ['d', 1], ['e', 1], ['f', 1], ['z', 1]);
        trie.clear();
        trie.set('d', 1);
        trie.set('c', 1);
        trie.set('f', 1);
        trie.set('a', 1);
        trie.set('b', 1);
        assertTstDfs(trie, ['a', 1], ['b', 1], ['c', 1], ['d', 1], ['f', 1]);
        // left, left
        trie.delete('f');
        assertTstDfs(trie, ['a', 1], ['b', 1], ['c', 1], ['d', 1]);
        // mid
        trie.clear();
        trie.set('a', 1);
        trie.set('ad', 1);
        trie.set('ab', 1);
        trie.set('af', 1);
        trie.set('ae', 1);
        trie.set('az', 1);
        assertTstDfs(trie, ['a', 1], ['ab', 1], ['ad', 1], ['ae', 1], ['af', 1], ['az', 1]);
        trie.delete('ab');
        assertTstDfs(trie, ['a', 1], ['ad', 1], ['ae', 1], ['af', 1], ['az', 1]);
        trie.delete('a');
        assertTstDfs(trie, ['ad', 1], ['ae', 1], ['af', 1], ['az', 1]);
    });
    test('TernarySearchTree: Cannot read property \'1\' of undefined #138284', function () {
        const keys = [
            URI.parse('fake-fs:/C'),
            URI.parse('fake-fs:/A'),
            URI.parse('fake-fs:/D'),
            URI.parse('fake-fs:/B'),
        ];
        const tst = TernarySearchTree.forUris();
        for (const item of keys) {
            tst.set(item, true);
        }
        assert.ok(tst._isBalanced());
        tst.delete(keys[0]);
        assert.ok(tst._isBalanced());
    });
    test('TernarySearchTree: Cannot read property \'1\' of undefined #138284 (simple)', function () {
        const keys = ['C', 'A', 'D', 'B',];
        const tst = TernarySearchTree.forStrings();
        for (const item of keys) {
            tst.set(item, true);
        }
        assertTstDfs(tst, ['A', true], ['B', true], ['C', true], ['D', true]);
        tst.delete(keys[0]);
        assertTstDfs(tst, ['A', true], ['B', true], ['D', true]);
        {
            const tst = TernarySearchTree.forStrings();
            tst.set('C', true);
            tst.set('A', true);
            tst.set('B', true);
            assertTstDfs(tst, ['A', true], ['B', true], ['C', true]);
        }
    });
    test('TernarySearchTree: Cannot read property \'1\' of undefined #138284 (random)', function () {
        for (let round = 10; round >= 0; round--) {
            const keys = [];
            for (let i = 0; i < 100; i++) {
                keys.push(URI.from({ scheme: 'fake-fs', path: randomPath(undefined, undefined, 10) }));
            }
            const tst = TernarySearchTree.forUris();
            try {
                for (const item of keys) {
                    tst.set(item, true);
                    assert.ok(tst._isBalanced(), `SET${item}|${keys.map(String).join()}`);
                }
                for (const item of keys) {
                    tst.delete(item);
                    assert.ok(tst._isBalanced(), `DEL${item}|${keys.map(String).join()}`);
                }
            }
            catch (err) {
                assert.ok(false, `FAILED with keys: ${keys.map(String).join()}`);
            }
        }
    });
    test('TernarySearchTree: Cannot read properties of undefined (reading \'length\'): #161618 (simple)', function () {
        const raw = 'config.debug.toolBarLocation,floating,config.editor.renderControlCharacters,true,config.editor.renderWhitespace,selection,config.files.autoSave,off,config.git.enabled,true,config.notebook.globalToolbar,true,config.terminal.integrated.tabs.enabled,true,config.terminal.integrated.tabs.showActions,singleTerminalOrNarrow,config.terminal.integrated.tabs.showActiveTerminal,singleTerminalOrNarrow,config.workbench.activityBar.visible,true,config.workbench.experimental.settingsProfiles.enabled,true,config.workbench.layoutControl.type,both,config.workbench.sideBar.location,left,config.workbench.statusBar.visible,true';
        const array = raw.split(',');
        const tuples = [];
        for (let i = 0; i < array.length; i += 2) {
            tuples.push([array[i], array[i + 1]]);
        }
        const map = TernarySearchTree.forConfigKeys();
        map.fill(tuples);
        assert.strictEqual([...map].join(), raw);
        assert.ok(map.has('config.editor.renderWhitespace'));
        const len = [...map].length;
        map.delete('config.editor.renderWhitespace');
        assert.ok(map._isBalanced());
        assert.strictEqual([...map].length, len - 1);
    });
    test('TernarySearchTree: Cannot read properties of undefined (reading \'length\'): #161618 (random)', function () {
        const raw = 'config.debug.toolBarLocation,floating,config.editor.renderControlCharacters,true,config.editor.renderWhitespace,selection,config.files.autoSave,off,config.git.enabled,true,config.notebook.globalToolbar,true,config.terminal.integrated.tabs.enabled,true,config.terminal.integrated.tabs.showActions,singleTerminalOrNarrow,config.terminal.integrated.tabs.showActiveTerminal,singleTerminalOrNarrow,config.workbench.activityBar.visible,true,config.workbench.experimental.settingsProfiles.enabled,true,config.workbench.layoutControl.type,both,config.workbench.sideBar.location,left,config.workbench.statusBar.visible,true';
        const array = raw.split(',');
        const tuples = [];
        for (let i = 0; i < array.length; i += 2) {
            tuples.push([array[i], array[i + 1]]);
        }
        for (let round = 100; round >= 0; round--) {
            shuffle(tuples);
            const map = TernarySearchTree.forConfigKeys();
            map.fill(tuples);
            assert.strictEqual([...map].join(), raw);
            assert.ok(map.has('config.editor.renderWhitespace'));
            const len = [...map].length;
            map.delete('config.editor.renderWhitespace');
            assert.ok(map._isBalanced());
            assert.strictEqual([...map].length, len - 1);
        }
    });
    test('TernarySearchTree (PathSegments) - lookup', function () {
        const map = new TernarySearchTree(new PathIterator());
        map.set('/user/foo/bar', 1);
        map.set('/user/foo', 2);
        map.set('/user/foo/flip/flop', 3);
        assert.strictEqual(map.get('/foo'), undefined);
        assert.strictEqual(map.get('/user'), undefined);
        assert.strictEqual(map.get('/user/foo'), 2);
        assert.strictEqual(map.get('/user/foo/bar'), 1);
        assert.strictEqual(map.get('/user/foo/bar/boo'), undefined);
    });
    test('TernarySearchTree (PathSegments) - superstr', function () {
        const map = new TernarySearchTree(new PathIterator());
        map.set('/user/foo/bar', 1);
        map.set('/user/foo', 2);
        map.set('/user/foo/flip/flop', 3);
        map.set('/usr/foo', 4);
        let item;
        let iter = map.findSuperstr('/user');
        item = iter.next();
        assert.strictEqual(item.value[1], 2);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 1);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 3);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        iter = map.findSuperstr('/usr');
        item = iter.next();
        assert.strictEqual(item.value[1], 4);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        assert.strictEqual(map.findSuperstr('/not'), undefined);
        assert.strictEqual(map.findSuperstr('/us'), undefined);
        assert.strictEqual(map.findSuperstr('/usrr'), undefined);
        assert.strictEqual(map.findSuperstr('/userr'), undefined);
    });
    test('TernarySearchTree (PathSegments) - delete_superstr', function () {
        const map = new TernarySearchTree(new PathIterator());
        map.set('/user/foo/bar', 1);
        map.set('/user/foo', 2);
        map.set('/user/foo/flip/flop', 3);
        map.set('/usr/foo', 4);
        assertTstDfs(map, ['/user/foo', 2], ['/user/foo/bar', 1], ['/user/foo/flip/flop', 3], ['/usr/foo', 4]);
        // not a segment
        map.deleteSuperstr('/user/fo');
        assertTstDfs(map, ['/user/foo', 2], ['/user/foo/bar', 1], ['/user/foo/flip/flop', 3], ['/usr/foo', 4]);
        // delete a segment
        map.set('/user/foo/bar', 1);
        map.set('/user/foo', 2);
        map.set('/user/foo/flip/flop', 3);
        map.set('/usr/foo', 4);
        map.deleteSuperstr('/user/foo');
        assertTstDfs(map, ['/user/foo', 2], ['/usr/foo', 4]);
    });
    test('TernarySearchTree (URI) - basics', function () {
        const trie = new TernarySearchTree(new UriIterator(() => false, () => false));
        trie.set(URI.file('/user/foo/bar'), 1);
        trie.set(URI.file('/user/foo'), 2);
        trie.set(URI.file('/user/foo/flip/flop'), 3);
        assert.strictEqual(trie.get(URI.file('/user/foo/bar')), 1);
        assert.strictEqual(trie.get(URI.file('/user/foo')), 2);
        assert.strictEqual(trie.get(URI.file('/user/foo/flip/flop')), 3);
        assert.strictEqual(trie.findSubstr(URI.file('/user/bar')), undefined);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo')), 2);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo/ba')), 2);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo/far/boo')), 2);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo/bar')), 1);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo/bar/far/boo')), 1);
    });
    test('TernarySearchTree (URI) - query parameters', function () {
        const trie = new TernarySearchTree(new UriIterator(() => false, () => true));
        const root = URI.parse('memfs:/?param=1');
        trie.set(root, 1);
        assert.strictEqual(trie.get(URI.parse('memfs:/?param=1')), 1);
        assert.strictEqual(trie.findSubstr(URI.parse('memfs:/?param=1')), 1);
        assert.strictEqual(trie.findSubstr(URI.parse('memfs:/aaa?param=1')), 1);
    });
    test('TernarySearchTree (URI) - lookup', function () {
        const map = new TernarySearchTree(new UriIterator(() => false, () => false));
        map.set(URI.parse('http://foo.bar/user/foo/bar'), 1);
        map.set(URI.parse('http://foo.bar/user/foo?query'), 2);
        map.set(URI.parse('http://foo.bar/user/foo?QUERY'), 3);
        map.set(URI.parse('http://foo.bar/user/foo/flip/flop'), 3);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/foo')), undefined);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user')), undefined);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo/bar')), 1);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo?query')), 2);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo?Query')), undefined);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo?QUERY')), 3);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo/bar/boo')), undefined);
    });
    test('TernarySearchTree (URI) - lookup, casing', function () {
        const map = new TernarySearchTree(new UriIterator(uri => /^https?$/.test(uri.scheme), () => false));
        map.set(URI.parse('http://foo.bar/user/foo/bar'), 1);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/USER/foo/bar')), 1);
        map.set(URI.parse('foo://foo.bar/user/foo/bar'), 1);
        assert.strictEqual(map.get(URI.parse('foo://foo.bar/USER/foo/bar')), undefined);
    });
    test('TernarySearchTree (URI) - superstr', function () {
        const map = new TernarySearchTree(new UriIterator(() => false, () => false));
        map.set(URI.file('/user/foo/bar'), 1);
        map.set(URI.file('/user/foo'), 2);
        map.set(URI.file('/user/foo/flip/flop'), 3);
        map.set(URI.file('/usr/foo'), 4);
        let item;
        let iter = map.findSuperstr(URI.file('/user'));
        item = iter.next();
        assert.strictEqual(item.value[1], 2);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 1);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 3);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        iter = map.findSuperstr(URI.file('/usr'));
        item = iter.next();
        assert.strictEqual(item.value[1], 4);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        iter = map.findSuperstr(URI.file('/'));
        item = iter.next();
        assert.strictEqual(item.value[1], 2);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 1);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 3);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 4);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        assert.strictEqual(map.findSuperstr(URI.file('/not')), undefined);
        assert.strictEqual(map.findSuperstr(URI.file('/us')), undefined);
        assert.strictEqual(map.findSuperstr(URI.file('/usrr')), undefined);
        assert.strictEqual(map.findSuperstr(URI.file('/userr')), undefined);
    });
    test('TernarySearchTree (ConfigKeySegments) - basics', function () {
        const trie = new TernarySearchTree(new ConfigKeysIterator());
        trie.set('config.foo.bar', 1);
        trie.set('config.foo', 2);
        trie.set('config.foo.flip.flop', 3);
        assert.strictEqual(trie.get('config.foo.bar'), 1);
        assert.strictEqual(trie.get('config.foo'), 2);
        assert.strictEqual(trie.get('config.foo.flip.flop'), 3);
        assert.strictEqual(trie.findSubstr('config.bar'), undefined);
        assert.strictEqual(trie.findSubstr('config.foo'), 2);
        assert.strictEqual(trie.findSubstr('config.foo.ba'), 2);
        assert.strictEqual(trie.findSubstr('config.foo.far.boo'), 2);
        assert.strictEqual(trie.findSubstr('config.foo.bar'), 1);
        assert.strictEqual(trie.findSubstr('config.foo.bar.far.boo'), 1);
    });
    test('TernarySearchTree (ConfigKeySegments) - lookup', function () {
        const map = new TernarySearchTree(new ConfigKeysIterator());
        map.set('config.foo.bar', 1);
        map.set('config.foo', 2);
        map.set('config.foo.flip.flop', 3);
        assert.strictEqual(map.get('foo'), undefined);
        assert.strictEqual(map.get('config'), undefined);
        assert.strictEqual(map.get('config.foo'), 2);
        assert.strictEqual(map.get('config.foo.bar'), 1);
        assert.strictEqual(map.get('config.foo.bar.boo'), undefined);
    });
    test('TernarySearchTree (ConfigKeySegments) - superstr', function () {
        const map = new TernarySearchTree(new ConfigKeysIterator());
        map.set('config.foo.bar', 1);
        map.set('config.foo', 2);
        map.set('config.foo.flip.flop', 3);
        map.set('boo', 4);
        let item;
        const iter = map.findSuperstr('config');
        item = iter.next();
        assert.strictEqual(item.value[1], 2);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 1);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 3);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        assert.strictEqual(map.findSuperstr('foo'), undefined);
        assert.strictEqual(map.findSuperstr('config.foo.no'), undefined);
        assert.strictEqual(map.findSuperstr('config.foop'), undefined);
    });
    test('TernarySearchTree (ConfigKeySegments) - delete_superstr', function () {
        const map = new TernarySearchTree(new ConfigKeysIterator());
        map.set('config.foo.bar', 1);
        map.set('config.foo', 2);
        map.set('config.foo.flip.flop', 3);
        map.set('boo', 4);
        assertTstDfs(map, ['boo', 4], ['config.foo', 2], ['config.foo.bar', 1], ['config.foo.flip.flop', 3]);
        // not a segment
        map.deleteSuperstr('config.fo');
        assertTstDfs(map, ['boo', 4], ['config.foo', 2], ['config.foo.bar', 1], ['config.foo.flip.flop', 3]);
        // delete a segment
        map.set('config.foo.bar', 1);
        map.set('config.foo', 2);
        map.set('config.foo.flip.flop', 3);
        map.set('config.boo', 4);
        map.deleteSuperstr('config.foo');
        assertTstDfs(map, ['boo', 4], ['config.foo', 2]);
    });
    test('TST, fill', function () {
        const tst = TernarySearchTree.forStrings();
        const keys = ['foo', 'bar', 'bang', 'bazz'];
        Object.freeze(keys);
        tst.fill(true, keys);
        for (const key of keys) {
            assert.ok(tst.get(key), key);
        }
    });
});
suite.skip('TST, perf', function () {
    function createRandomUris(n) {
        const uris = [];
        function randomWord() {
            let result = '';
            const length = 4 + Math.floor(Math.random() * 4);
            for (let i = 0; i < length; i++) {
                result += (Math.random() * 26 + 65).toString(36);
            }
            return result;
        }
        // generate 10000 random words
        const words = [];
        for (let i = 0; i < 10000; i++) {
            words.push(randomWord());
        }
        for (let i = 0; i < n; i++) {
            let len = 4 + Math.floor(Math.random() * 4);
            const segments = [];
            for (; len >= 0; len--) {
                segments.push(words[Math.floor(Math.random() * words.length)]);
            }
            uris.push(URI.from({ scheme: 'file', path: segments.join('/') }));
        }
        return uris;
    }
    let tree;
    let sampleUris = [];
    let candidates = [];
    suiteSetup(() => {
        const len = 50_000;
        sampleUris = createRandomUris(len);
        candidates = [...sampleUris.slice(0, len / 2), ...createRandomUris(len / 2)];
        shuffle(candidates);
    });
    setup(() => {
        tree = TernarySearchTree.forUris();
        for (const uri of sampleUris) {
            tree.set(uri, true);
        }
    });
    const _profile = false;
    function perfTest(name, callback) {
        test(name, function () {
            if (_profile) {
                console.profile(name);
            }
            const sw = new StopWatch();
            callback();
            console.log(name, sw.elapsed());
            if (_profile) {
                console.profileEnd();
            }
        });
    }
    perfTest('TST, clear', function () {
        tree.clear();
    });
    perfTest('TST, insert', function () {
        const insertTree = TernarySearchTree.forUris();
        for (const uri of sampleUris) {
            insertTree.set(uri, true);
        }
    });
    perfTest('TST, lookup', function () {
        let match = 0;
        for (const candidate of candidates) {
            if (tree.has(candidate)) {
                match += 1;
            }
        }
        assert.strictEqual(match, sampleUris.length / 2);
    });
    perfTest('TST, substr', function () {
        let match = 0;
        for (const candidate of candidates) {
            if (tree.findSubstr(candidate)) {
                match += 1;
            }
        }
        assert.strictEqual(match, sampleUris.length / 2);
    });
    perfTest('TST, superstr', function () {
        for (const candidate of candidates) {
            tree.findSuperstr(candidate);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybmFyeVNlYXJjaHRyZWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3Rlcm5hcnlTZWFyY2h0cmVlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFckUsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUVqQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRXZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFB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LENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRVosTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRVosTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRVosTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFHMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztRQUUzRCxTQUFTO1FBQ1QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekMsMkNBQTJDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFB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QUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVuRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUdoRCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUUvQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FB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QUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsSCxDQUFDO1FBRUQsQ0FBQztZQUNBLHFCQUFxQjtZQUNyQixNQUFNLElBQUksR0FBRyxJQUFJLGlCQUFpQixDQUFpQixJQUFJLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEIsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFB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QUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRSxlQUFlO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQixZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFM0QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakIsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENB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Q0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXBDLElBQUksR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUUsQ0FBQztRQUMzQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFckMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXBDLElBQUksR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUUsQ0FBQztRQUN4QyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMs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