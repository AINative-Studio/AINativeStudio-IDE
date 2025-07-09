/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { BidirectionalMap, LinkedMap, LRUCache, mapsStrictEqualIgnoreOrder, MRUCache, NKeyMap, ResourceMap, SetMap } from '../../common/map.js';
import { extUriIgnorePathCase } from '../../common/resources.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Map', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('LinkedMap - Simple', () => {
        const map = new LinkedMap();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        assert.deepStrictEqual([...map.keys()], ['ak', 'bk']);
        assert.deepStrictEqual([...map.values()], ['av', 'bv']);
        assert.strictEqual(map.first, 'av');
        assert.strictEqual(map.last, 'bv');
    });
    test('LinkedMap - Touch Old one', () => {
        const map = new LinkedMap();
        map.set('ak', 'av');
        map.set('ak', 'av', 1 /* Touch.AsOld */);
        assert.deepStrictEqual([...map.keys()], ['ak']);
        assert.deepStrictEqual([...map.values()], ['av']);
    });
    test('LinkedMap - Touch New one', () => {
        const map = new LinkedMap();
        map.set('ak', 'av');
        map.set('ak', 'av', 2 /* Touch.AsNew */);
        assert.deepStrictEqual([...map.keys()], ['ak']);
        assert.deepStrictEqual([...map.values()], ['av']);
    });
    test('LinkedMap - Touch Old two', () => {
        const map = new LinkedMap();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        map.set('bk', 'bv', 1 /* Touch.AsOld */);
        assert.deepStrictEqual([...map.keys()], ['bk', 'ak']);
        assert.deepStrictEqual([...map.values()], ['bv', 'av']);
    });
    test('LinkedMap - Touch New two', () => {
        const map = new LinkedMap();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        map.set('ak', 'av', 2 /* Touch.AsNew */);
        assert.deepStrictEqual([...map.keys()], ['bk', 'ak']);
        assert.deepStrictEqual([...map.values()], ['bv', 'av']);
    });
    test('LinkedMap - Touch Old from middle', () => {
        const map = new LinkedMap();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        map.set('ck', 'cv');
        map.set('bk', 'bv', 1 /* Touch.AsOld */);
        assert.deepStrictEqual([...map.keys()], ['bk', 'ak', 'ck']);
        assert.deepStrictEqual([...map.values()], ['bv', 'av', 'cv']);
    });
    test('LinkedMap - Touch New from middle', () => {
        const map = new LinkedMap();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        map.set('ck', 'cv');
        map.set('bk', 'bv', 2 /* Touch.AsNew */);
        assert.deepStrictEqual([...map.keys()], ['ak', 'ck', 'bk']);
        assert.deepStrictEqual([...map.values()], ['av', 'cv', 'bv']);
    });
    test('LinkedMap - basics', function () {
        const map = new LinkedMap();
        assert.strictEqual(map.size, 0);
        map.set('1', 1);
        map.set('2', '2');
        map.set('3', true);
        const obj = Object.create(null);
        map.set('4', obj);
        const date = Date.now();
        map.set('5', date);
        assert.strictEqual(map.size, 5);
        assert.strictEqual(map.get('1'), 1);
        assert.strictEqual(map.get('2'), '2');
        assert.strictEqual(map.get('3'), true);
        assert.strictEqual(map.get('4'), obj);
        assert.strictEqual(map.get('5'), date);
        assert.ok(!map.get('6'));
        map.delete('6');
        assert.strictEqual(map.size, 5);
        assert.strictEqual(map.delete('1'), true);
        assert.strictEqual(map.delete('2'), true);
        assert.strictEqual(map.delete('3'), true);
        assert.strictEqual(map.delete('4'), true);
        assert.strictEqual(map.delete('5'), true);
        assert.strictEqual(map.size, 0);
        assert.ok(!map.get('5'));
        assert.ok(!map.get('4'));
        assert.ok(!map.get('3'));
        assert.ok(!map.get('2'));
        assert.ok(!map.get('1'));
        map.set('1', 1);
        map.set('2', '2');
        map.set('3', true);
        assert.ok(map.has('1'));
        assert.strictEqual(map.get('1'), 1);
        assert.strictEqual(map.get('2'), '2');
        assert.strictEqual(map.get('3'), true);
        map.clear();
        assert.strictEqual(map.size, 0);
        assert.ok(!map.get('1'));
        assert.ok(!map.get('2'));
        assert.ok(!map.get('3'));
        assert.ok(!map.has('1'));
    });
    test('LinkedMap - Iterators', () => {
        const map = new LinkedMap();
        map.set(1, 1);
        map.set(2, 2);
        map.set(3, 3);
        for (const elem of map.keys()) {
            assert.ok(elem);
        }
        for (const elem of map.values()) {
            assert.ok(elem);
        }
        for (const elem of map.entries()) {
            assert.ok(elem);
        }
        {
            const keys = map.keys();
            const values = map.values();
            const entries = map.entries();
            map.get(1);
            keys.next();
            values.next();
            entries.next();
        }
        {
            const keys = map.keys();
            const values = map.values();
            const entries = map.entries();
            map.get(1, 2 /* Touch.AsNew */);
            let exceptions = 0;
            try {
                keys.next();
            }
            catch (err) {
                exceptions++;
            }
            try {
                values.next();
            }
            catch (err) {
                exceptions++;
            }
            try {
                entries.next();
            }
            catch (err) {
                exceptions++;
            }
            assert.strictEqual(exceptions, 3);
        }
    });
    test('LinkedMap - LRU Cache simple', () => {
        const cache = new LRUCache(5);
        [1, 2, 3, 4, 5].forEach(value => cache.set(value, value));
        assert.strictEqual(cache.size, 5);
        cache.set(6, 6);
        assert.strictEqual(cache.size, 5);
        assert.deepStrictEqual([...cache.keys()], [2, 3, 4, 5, 6]);
        cache.set(7, 7);
        assert.strictEqual(cache.size, 5);
        assert.deepStrictEqual([...cache.keys()], [3, 4, 5, 6, 7]);
        const values = [];
        [3, 4, 5, 6, 7].forEach(key => values.push(cache.get(key)));
        assert.deepStrictEqual(values, [3, 4, 5, 6, 7]);
    });
    test('LinkedMap - LRU Cache get', () => {
        const cache = new LRUCache(5);
        [1, 2, 3, 4, 5].forEach(value => cache.set(value, value));
        assert.strictEqual(cache.size, 5);
        assert.deepStrictEqual([...cache.keys()], [1, 2, 3, 4, 5]);
        cache.get(3);
        assert.deepStrictEqual([...cache.keys()], [1, 2, 4, 5, 3]);
        cache.peek(4);
        assert.deepStrictEqual([...cache.keys()], [1, 2, 4, 5, 3]);
        const values = [];
        [1, 2, 3, 4, 5].forEach(key => values.push(cache.get(key)));
        assert.deepStrictEqual(values, [1, 2, 3, 4, 5]);
    });
    test('LinkedMap - LRU Cache limit', () => {
        const cache = new LRUCache(10);
        for (let i = 1; i <= 10; i++) {
            cache.set(i, i);
        }
        assert.strictEqual(cache.size, 10);
        cache.limit = 5;
        assert.strictEqual(cache.size, 5);
        assert.deepStrictEqual([...cache.keys()], [6, 7, 8, 9, 10]);
        cache.limit = 20;
        assert.strictEqual(cache.size, 5);
        for (let i = 11; i <= 20; i++) {
            cache.set(i, i);
        }
        assert.deepStrictEqual(cache.size, 15);
        const values = [];
        for (let i = 6; i <= 20; i++) {
            values.push(cache.get(i));
            assert.strictEqual(cache.get(i), i);
        }
        assert.deepStrictEqual([...cache.values()], values);
    });
    test('LinkedMap - LRU Cache limit with ratio', () => {
        const cache = new LRUCache(10, 0.5);
        for (let i = 1; i <= 10; i++) {
            cache.set(i, i);
        }
        assert.strictEqual(cache.size, 10);
        cache.set(11, 11);
        assert.strictEqual(cache.size, 5);
        assert.deepStrictEqual([...cache.keys()], [7, 8, 9, 10, 11]);
        const values = [];
        [...cache.keys()].forEach(key => values.push(cache.get(key)));
        assert.deepStrictEqual(values, [7, 8, 9, 10, 11]);
        assert.deepStrictEqual([...cache.values()], values);
    });
    test('LinkedMap - MRU Cache simple', () => {
        const cache = new MRUCache(5);
        [1, 2, 3, 4, 5].forEach(value => cache.set(value, value));
        assert.strictEqual(cache.size, 5);
        cache.set(6, 6);
        assert.strictEqual(cache.size, 5);
        assert.deepStrictEqual([...cache.keys()], [1, 2, 3, 4, 6]);
        cache.set(7, 7);
        assert.strictEqual(cache.size, 5);
        assert.deepStrictEqual([...cache.keys()], [1, 2, 3, 4, 7]);
        const values = [];
        [1, 2, 3, 4, 7].forEach(key => values.push(cache.get(key)));
        assert.deepStrictEqual(values, [1, 2, 3, 4, 7]);
    });
    test('LinkedMap - MRU Cache get', () => {
        const cache = new MRUCache(5);
        [1, 2, 3, 4, 5].forEach(value => cache.set(value, value));
        assert.strictEqual(cache.size, 5);
        assert.deepStrictEqual([...cache.keys()], [1, 2, 3, 4, 5]);
        cache.get(3);
        assert.deepStrictEqual([...cache.keys()], [1, 2, 4, 5, 3]);
        cache.peek(4);
        assert.deepStrictEqual([...cache.keys()], [1, 2, 4, 5, 3]);
        const values = [];
        [1, 2, 3, 4, 5].forEach(key => values.push(cache.get(key)));
        assert.deepStrictEqual(values, [1, 2, 3, 4, 5]);
    });
    test('LinkedMap - MRU Cache limit with ratio', () => {
        const cache = new MRUCache(10, 0.5);
        for (let i = 1; i <= 10; i++) {
            cache.set(i, i);
        }
        assert.strictEqual(cache.size, 10);
        cache.set(11, 11);
        assert.strictEqual(cache.size, 5);
        assert.deepStrictEqual([...cache.keys()], [1, 2, 3, 4, 11]);
        const values = [];
        [...cache.keys()].forEach(key => values.push(cache.get(key)));
        assert.deepStrictEqual(values, [1, 2, 3, 4, 11]);
        assert.deepStrictEqual([...cache.values()], values);
    });
    test('LinkedMap - toJSON / fromJSON', () => {
        let map = new LinkedMap();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        map.set('ck', 'cv');
        const json = map.toJSON();
        map = new LinkedMap();
        map.fromJSON(json);
        let i = 0;
        map.forEach((value, key) => {
            if (i === 0) {
                assert.strictEqual(key, 'ak');
                assert.strictEqual(value, 'av');
            }
            else if (i === 1) {
                assert.strictEqual(key, 'bk');
                assert.strictEqual(value, 'bv');
            }
            else if (i === 2) {
                assert.strictEqual(key, 'ck');
                assert.strictEqual(value, 'cv');
            }
            i++;
        });
    });
    test('LinkedMap - delete Head and Tail', function () {
        const map = new LinkedMap();
        assert.strictEqual(map.size, 0);
        map.set('1', 1);
        assert.strictEqual(map.size, 1);
        map.delete('1');
        assert.strictEqual(map.get('1'), undefined);
        assert.strictEqual(map.size, 0);
        assert.strictEqual([...map.keys()].length, 0);
    });
    test('LinkedMap - delete Head', function () {
        const map = new LinkedMap();
        assert.strictEqual(map.size, 0);
        map.set('1', 1);
        map.set('2', 2);
        assert.strictEqual(map.size, 2);
        map.delete('1');
        assert.strictEqual(map.get('2'), 2);
        assert.strictEqual(map.size, 1);
        assert.strictEqual([...map.keys()].length, 1);
        assert.strictEqual([...map.keys()][0], '2');
    });
    test('LinkedMap - delete Tail', function () {
        const map = new LinkedMap();
        assert.strictEqual(map.size, 0);
        map.set('1', 1);
        map.set('2', 2);
        assert.strictEqual(map.size, 2);
        map.delete('2');
        assert.strictEqual(map.get('1'), 1);
        assert.strictEqual(map.size, 1);
        assert.strictEqual([...map.keys()].length, 1);
        assert.strictEqual([...map.keys()][0], '1');
    });
    test('ResourceMap - basics', function () {
        const map = new ResourceMap();
        const resource1 = URI.parse('some://1');
        const resource2 = URI.parse('some://2');
        const resource3 = URI.parse('some://3');
        const resource4 = URI.parse('some://4');
        const resource5 = URI.parse('some://5');
        const resource6 = URI.parse('some://6');
        assert.strictEqual(map.size, 0);
        const res = map.set(resource1, 1);
        assert.ok(res === map);
        map.set(resource2, '2');
        map.set(resource3, true);
        const values = [...map.values()];
        assert.strictEqual(values[0], 1);
        assert.strictEqual(values[1], '2');
        assert.strictEqual(values[2], true);
        let counter = 0;
        map.forEach((value, key, mapObj) => {
            assert.strictEqual(value, values[counter++]);
            assert.ok(URI.isUri(key));
            assert.ok(map === mapObj);
        });
        const obj = Object.create(null);
        map.set(resource4, obj);
        const date = Date.now();
        map.set(resource5, date);
        assert.strictEqual(map.size, 5);
        assert.strictEqual(map.get(resource1), 1);
        assert.strictEqual(map.get(resource2), '2');
        assert.strictEqual(map.get(resource3), true);
        assert.strictEqual(map.get(resource4), obj);
        assert.strictEqual(map.get(resource5), date);
        assert.ok(!map.get(resource6));
        map.delete(resource6);
        assert.strictEqual(map.size, 5);
        assert.ok(map.delete(resource1));
        assert.ok(map.delete(resource2));
        assert.ok(map.delete(resource3));
        assert.ok(map.delete(resource4));
        assert.ok(map.delete(resource5));
        assert.strictEqual(map.size, 0);
        assert.ok(!map.get(resource5));
        assert.ok(!map.get(resource4));
        assert.ok(!map.get(resource3));
        assert.ok(!map.get(resource2));
        assert.ok(!map.get(resource1));
        map.set(resource1, 1);
        map.set(resource2, '2');
        map.set(resource3, true);
        assert.ok(map.has(resource1));
        assert.strictEqual(map.get(resource1), 1);
        assert.strictEqual(map.get(resource2), '2');
        assert.strictEqual(map.get(resource3), true);
        map.clear();
        assert.strictEqual(map.size, 0);
        assert.ok(!map.get(resource1));
        assert.ok(!map.get(resource2));
        assert.ok(!map.get(resource3));
        assert.ok(!map.has(resource1));
        map.set(resource1, false);
        map.set(resource2, 0);
        assert.ok(map.has(resource1));
        assert.ok(map.has(resource2));
    });
    test('ResourceMap - files (do NOT ignorecase)', function () {
        const map = new ResourceMap();
        const fileA = URI.parse('file://some/filea');
        const fileB = URI.parse('some://some/other/fileb');
        const fileAUpper = URI.parse('file://SOME/FILEA');
        map.set(fileA, 'true');
        assert.strictEqual(map.get(fileA), 'true');
        assert.ok(!map.get(fileAUpper));
        assert.ok(!map.get(fileB));
        map.set(fileAUpper, 'false');
        assert.strictEqual(map.get(fileAUpper), 'false');
        assert.strictEqual(map.get(fileA), 'true');
        const windowsFile = URI.file('c:\\test with %25\\c#code');
        const uncFile = URI.file('\\\\shäres\\path\\c#\\plugin.json');
        map.set(windowsFile, 'true');
        map.set(uncFile, 'true');
        assert.strictEqual(map.get(windowsFile), 'true');
        assert.strictEqual(map.get(uncFile), 'true');
    });
    test('ResourceMap - files (ignorecase)', function () {
        const map = new ResourceMap(uri => extUriIgnorePathCase.getComparisonKey(uri));
        const fileA = URI.parse('file://some/filea');
        const fileB = URI.parse('some://some/other/fileb');
        const fileAUpper = URI.parse('file://SOME/FILEA');
        map.set(fileA, 'true');
        assert.strictEqual(map.get(fileA), 'true');
        assert.strictEqual(map.get(fileAUpper), 'true');
        assert.ok(!map.get(fileB));
        map.set(fileAUpper, 'false');
        assert.strictEqual(map.get(fileAUpper), 'false');
        assert.strictEqual(map.get(fileA), 'false');
        const windowsFile = URI.file('c:\\test with %25\\c#code');
        const uncFile = URI.file('\\\\shäres\\path\\c#\\plugin.json');
        map.set(windowsFile, 'true');
        map.set(uncFile, 'true');
        assert.strictEqual(map.get(windowsFile), 'true');
        assert.strictEqual(map.get(uncFile), 'true');
    });
    test('ResourceMap - files (ignorecase, BUT preservecase)', function () {
        const map = new ResourceMap(uri => extUriIgnorePathCase.getComparisonKey(uri));
        const fileA = URI.parse('file://some/filea');
        const fileAUpper = URI.parse('file://SOME/FILEA');
        map.set(fileA, 1);
        assert.strictEqual(map.get(fileA), 1);
        assert.strictEqual(map.get(fileAUpper), 1);
        assert.deepStrictEqual(Array.from(map.keys()).map(String), [fileA].map(String));
        assert.deepStrictEqual(Array.from(map), [[fileA, 1]]);
        map.set(fileAUpper, 1);
        assert.strictEqual(map.get(fileA), 1);
        assert.strictEqual(map.get(fileAUpper), 1);
        assert.deepStrictEqual(Array.from(map.keys()).map(String), [fileAUpper].map(String));
        assert.deepStrictEqual(Array.from(map), [[fileAUpper, 1]]);
    });
    test('mapsStrictEqualIgnoreOrder', () => {
        const map1 = new Map();
        const map2 = new Map();
        assert.strictEqual(mapsStrictEqualIgnoreOrder(map1, map2), true);
        map1.set('foo', 'bar');
        assert.strictEqual(mapsStrictEqualIgnoreOrder(map1, map2), false);
        map2.set('foo', 'bar');
        assert.strictEqual(mapsStrictEqualIgnoreOrder(map1, map2), true);
        map2.set('bar', 'foo');
        assert.strictEqual(mapsStrictEqualIgnoreOrder(map1, map2), false);
        map1.set('bar', 'foo');
        assert.strictEqual(mapsStrictEqualIgnoreOrder(map1, map2), true);
    });
});
suite('BidirectionalMap', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should set and get values correctly', () => {
        const map = new BidirectionalMap();
        map.set('one', 1);
        map.set('two', 2);
        map.set('three', 3);
        assert.strictEqual(map.get('one'), 1);
        assert.strictEqual(map.get('two'), 2);
        assert.strictEqual(map.get('three'), 3);
    });
    test('should get keys by value correctly', () => {
        const map = new BidirectionalMap();
        map.set('one', 1);
        map.set('two', 2);
        map.set('three', 3);
        assert.strictEqual(map.getKey(1), 'one');
        assert.strictEqual(map.getKey(2), 'two');
        assert.strictEqual(map.getKey(3), 'three');
    });
    test('should delete values correctly', () => {
        const map = new BidirectionalMap();
        map.set('one', 1);
        map.set('two', 2);
        map.set('three', 3);
        assert.strictEqual(map.delete('one'), true);
        assert.strictEqual(map.get('one'), undefined);
        assert.strictEqual(map.getKey(1), undefined);
        assert.strictEqual(map.delete('two'), true);
        assert.strictEqual(map.get('two'), undefined);
        assert.strictEqual(map.getKey(2), undefined);
        assert.strictEqual(map.delete('three'), true);
        assert.strictEqual(map.get('three'), undefined);
        assert.strictEqual(map.getKey(3), undefined);
    });
    test('should handle non-existent keys correctly', () => {
        const map = new BidirectionalMap();
        map.set('one', 1);
        map.set('two', 2);
        map.set('three', 3);
        assert.strictEqual(map.get('four'), undefined);
        assert.strictEqual(map.getKey(4), undefined);
        assert.strictEqual(map.delete('four'), false);
    });
    test('should handle forEach correctly', () => {
        const map = new BidirectionalMap();
        map.set('one', 1);
        map.set('two', 2);
        map.set('three', 3);
        const keys = [];
        const values = [];
        map.forEach((value, key) => {
            keys.push(key);
            values.push(value);
        });
        assert.deepStrictEqual(keys, ['one', 'two', 'three']);
        assert.deepStrictEqual(values, [1, 2, 3]);
    });
    test('should handle clear correctly', () => {
        const map = new BidirectionalMap();
        map.set('one', 1);
        map.set('two', 2);
        map.set('three', 3);
        map.clear();
        assert.strictEqual(map.get('one'), undefined);
        assert.strictEqual(map.get('two'), undefined);
        assert.strictEqual(map.get('three'), undefined);
        assert.strictEqual(map.getKey(1), undefined);
        assert.strictEqual(map.getKey(2), undefined);
        assert.strictEqual(map.getKey(3), undefined);
    });
});
suite('SetMap', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('add and get', () => {
        const setMap = new SetMap();
        setMap.add('a', 1);
        setMap.add('a', 2);
        setMap.add('b', 3);
        assert.deepStrictEqual([...setMap.get('a')], [1, 2]);
        assert.deepStrictEqual([...setMap.get('b')], [3]);
    });
    test('delete', () => {
        const setMap = new SetMap();
        setMap.add('a', 1);
        setMap.add('a', 2);
        setMap.add('b', 3);
        setMap.delete('a', 1);
        assert.deepStrictEqual([...setMap.get('a')], [2]);
        setMap.delete('a', 2);
        assert.deepStrictEqual([...setMap.get('a')], []);
    });
    test('forEach', () => {
        const setMap = new SetMap();
        setMap.add('a', 1);
        setMap.add('a', 2);
        setMap.add('b', 3);
        let sum = 0;
        setMap.forEach('a', value => sum += value);
        assert.strictEqual(sum, 3);
    });
    test('get empty set', () => {
        const setMap = new SetMap();
        assert.deepStrictEqual([...setMap.get('a')], []);
    });
});
suite('NKeyMap', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('set and get', () => {
        const map = new NKeyMap();
        map.set(1, 'a', 'b', 'c', 'd');
        map.set(2, 'a', 'c', 'c', 'd');
        map.set(3, 'b', 'e', 'f', 'g');
        assert.strictEqual(map.get('a', 'b', 'c', 'd'), 1);
        assert.strictEqual(map.get('a', 'c', 'c', 'd'), 2);
        assert.strictEqual(map.get('b', 'e', 'f', 'g'), 3);
        assert.strictEqual(map.get('a', 'b', 'c', 'a'), undefined);
    });
    test('clear', () => {
        const map = new NKeyMap();
        map.set(1, 'a', 'b', 'c', 'd');
        map.set(2, 'a', 'c', 'c', 'd');
        map.set(3, 'b', 'e', 'f', 'g');
        map.clear();
        assert.strictEqual(map.get('a', 'b', 'c', 'd'), undefined);
        assert.strictEqual(map.get('a', 'c', 'c', 'd'), undefined);
        assert.strictEqual(map.get('b', 'e', 'f', 'g'), undefined);
    });
    test('values', () => {
        const map = new NKeyMap();
        map.set(1, 'a', 'b', 'c', 'd');
        map.set(2, 'a', 'c', 'c', 'd');
        map.set(3, 'b', 'e', 'f', 'g');
        assert.deepStrictEqual(Array.from(map.values()), [1, 2, 3]);
    });
    test('toString', () => {
        const map = new NKeyMap();
        map.set(1, 'f', 'o', 'o');
        map.set(2, 'b', 'a', 'r');
        map.set(3, 'b', 'a', 'z');
        map.set(3, 'b', 'o', 'o');
        assert.strictEqual(map.toString(), [
            'f: ',
            '  o: ',
            '    o: 1',
            'b: ',
            '  a: ',
            '    r: 2',
            '    z: 3',
            '  o: ',
            '    o: 3',
            '',
        ].join('\n'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9tYXAudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsMEJBQTBCLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFTLE1BQU0scUJBQXFCLENBQUM7QUFDdkosT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtJQUVqQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxTQUFTLEVBQWtCLENBQUM7UUFDNUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUksU0FBUyxFQUFrQixDQUFDO1FBQzVDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksc0JBQWMsQ0FBQztRQUNqQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLFNBQVMsRUFBa0IsQ0FBQztRQUM1QyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQixHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLHNCQUFjLENBQUM7UUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxTQUFTLEVBQWtCLENBQUM7UUFDNUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxzQkFBYyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxTQUFTLEVBQWtCLENBQUM7UUFDNUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxzQkFBYyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVB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dEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUV6QixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDekIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6QixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFekIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFdkMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRVosTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENB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QUFDO1FBRTlDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUM1QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUksUUFBUSxDQUFpQixDQUFDLENBQUMsQ0FBQztRQUU5QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDYixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sTUFBTSxHQUFh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QyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQWlCLENBQUMsQ0FBQyxDQUFDO1FBRTlDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNkLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENB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Q0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxzQkFBc0IsRUFBRTtRQUM1QixNQUFNLEdBQUcsR0FBRyxJQUFJLFdBQVcsRUFBTyxDQUFDO1FBRW5DLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4QyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4QyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVoQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUN2QixHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4QixHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV6QixNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFcEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRXhCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN4QixHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV6QixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRS9CLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRWpDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFL0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFekIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFN0MsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRVosTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxH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LENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN2QixNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRXZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtRQUNoRCxNQUFNLEdBQUcsR0FBRyxJQUFJLGdCQUFnQixFQUFrQixDQUFDO1FBQ25ELEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGdCQUFnQixFQUFrQixDQUFDO1FBQ25ELEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGdCQUFnQixFQUFrQixDQUFDO1FBQ25ELEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtRQUN0RCxNQUFNLEdBQUcsR0FBRyxJQUFJLGdCQUFnQixFQUFrQixDQUFDO1FBQ25ELEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxNQUFNLEdBQUcsR0FBRyxJQUFJLGdCQUFnQixFQUFrQixDQUFDO1FBQ25ELEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBCLE1BQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQztRQUMxQixNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUMxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGdCQUFnQixFQUFrQixDQUFDO1FBQ25ELEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBCLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVaLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtJQUVwQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxFQUFrQixDQUFDO1FBQzVDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNuQixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBa0IsQ0FBQztRQUM1QyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQixNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxFQUFrQixDQUFDO1FBQzVDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25CLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNaLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQWtCLENBQUM7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxFQUE0QyxDQUFDO1FBQ3BFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM1RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2xCLE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxFQUE0QyxDQUFDO1FBQ3BFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNaLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFDbkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLEVBQTRDLENBQUM7UUFDcEUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDL0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDL0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDL0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDckIsTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLEVBQW9DLENBQUM7UUFDNUQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQixHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNsQyxLQUFLO1lBQ0wsT0FBTztZQUNQLFVBQVU7WUFDVixLQUFLO1lBQ0wsT0FBTztZQUNQLFVBQVU7WUFDVixVQUFVO1lBQ1YsT0FBTztZQUNQLFVBQVU7WUFDVixFQUFFO1NBQ0YsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==