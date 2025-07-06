/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TokenQuality, TokenStore } from '../../../common/model/tokenStore.js';
suite('TokenStore', () => {
    let textModel;
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        textModel = {
            getValueLength: () => 11
        };
    });
    test('constructs with empty model', () => {
        const store = new TokenStore(textModel);
        assert.ok(store.root);
        assert.strictEqual(store.root.length, textModel.getValueLength());
    });
    test('builds store with single token', () => {
        const store = new TokenStore(textModel);
        store.buildStore([{
                startOffsetInclusive: 0,
                length: 5,
                token: 1
            }], TokenQuality.Accurate);
        assert.strictEqual(store.root.length, 5);
    });
    test('builds store with multiple tokens', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 4, token: 3 }
        ], TokenQuality.Accurate);
        assert.ok(store.root);
        assert.strictEqual(store.root.length, 10);
    });
    test('creates balanced tree structure', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 2, token: 1 },
            { startOffsetInclusive: 2, length: 2, token: 2 },
            { startOffsetInclusive: 4, length: 2, token: 3 },
            { startOffsetInclusive: 6, length: 2, token: 4 }
        ], TokenQuality.Accurate);
        const root = store.root;
        assert.ok(root.children);
        assert.strictEqual(root.children.length, 2);
        assert.strictEqual(root.children[0].length, 4);
        assert.strictEqual(root.children[1].length, 4);
    });
    test('creates deep tree structure', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 1, token: 1 },
            { startOffsetInclusive: 1, length: 1, token: 2 },
            { startOffsetInclusive: 2, length: 1, token: 3 },
            { startOffsetInclusive: 3, length: 1, token: 4 },
            { startOffsetInclusive: 4, length: 1, token: 5 },
            { startOffsetInclusive: 5, length: 1, token: 6 },
            { startOffsetInclusive: 6, length: 1, token: 7 },
            { startOffsetInclusive: 7, length: 1, token: 8 }
        ], TokenQuality.Accurate);
        const root = store.root;
        assert.ok(root.children);
        assert.strictEqual(root.children.length, 2);
        assert.ok(root.children[0].children);
        assert.strictEqual(root.children[0].children.length, 2);
        assert.ok(root.children[0].children[0].children);
        assert.strictEqual(root.children[0].children[0].children.length, 2);
    });
    test('updates single token in middle', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 3, token: 3 }
        ], TokenQuality.Accurate);
        store.update(3, [
            { startOffsetInclusive: 3, length: 3, token: 4 }
        ], TokenQuality.Accurate);
        const tokens = store.root;
        assert.strictEqual(tokens.children[0].token, 1);
        assert.strictEqual(tokens.children[1].token, 4);
        assert.strictEqual(tokens.children[2].token, 3);
    });
    test('updates multiple consecutive tokens', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 3, token: 3 }
        ], TokenQuality.Accurate);
        store.update(6, [
            { startOffsetInclusive: 3, length: 3, token: 4 },
            { startOffsetInclusive: 6, length: 3, token: 5 }
        ], TokenQuality.Accurate);
        const tokens = store.root;
        assert.strictEqual(tokens.children[0].token, 1);
        assert.strictEqual(tokens.children[1].token, 4);
        assert.strictEqual(tokens.children[2].token, 5);
    });
    test('updates tokens at start of document', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 3, token: 3 }
        ], TokenQuality.Accurate);
        store.update(3, [
            { startOffsetInclusive: 0, length: 3, token: 4 }
        ], TokenQuality.Accurate);
        const tokens = store.root;
        assert.strictEqual(tokens.children[0].token, 4);
        assert.strictEqual(tokens.children[1].token, 2);
        assert.strictEqual(tokens.children[2].token, 3);
    });
    test('updates tokens at end of document', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 3, token: 3 }
        ], TokenQuality.Accurate);
        store.update(3, [
            { startOffsetInclusive: 6, length: 3, token: 4 }
        ], TokenQuality.Accurate);
        const tokens = store.root;
        assert.strictEqual(tokens.children[0].token, 1);
        assert.strictEqual(tokens.children[1].token, 2);
        assert.strictEqual(tokens.children[2].token, 4);
    });
    test('updates length of tokens', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 3, token: 3 }
        ], TokenQuality.Accurate);
        store.update(6, [
            { startOffsetInclusive: 3, length: 5, token: 4 }
        ], TokenQuality.Accurate);
        const tokens = store.root;
        assert.strictEqual(tokens.children[0].token, 1);
        assert.strictEqual(tokens.children[0].length, 3);
        assert.strictEqual(tokens.children[1].token, 4);
        assert.strictEqual(tokens.children[1].length, 5);
    });
    test('update deeply nested tree with new token length in the middle', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 1, token: 1 },
            { startOffsetInclusive: 1, length: 1, token: 2 },
            { startOffsetInclusive: 2, length: 1, token: 3 },
            { startOffsetInclusive: 3, length: 1, token: 4 },
            { startOffsetInclusive: 4, length: 1, token: 5 },
            { startOffsetInclusive: 5, length: 1, token: 6 },
            { startOffsetInclusive: 6, length: 1, token: 7 },
            { startOffsetInclusive: 7, length: 1, token: 8 }
        ], TokenQuality.Accurate);
        // Update token in the middle (position 3-4) to span 3-6
        store.update(3, [
            { startOffsetInclusive: 3, length: 3, token: 9 }
        ], TokenQuality.Accurate);
        const root = store.root;
        // Verify the structure remains balanced
        assert.strictEqual(root.children.length, 3);
        assert.strictEqual(root.children[0].children.length, 2);
        // Verify the lengths are updated correctly
        assert.strictEqual(root.children[0].length, 2); // First 2 tokens
        assert.strictEqual(root.children[1].length, 4); // Token 3 + our new longer token
        assert.strictEqual(root.children[2].length, 2); // Last 2 tokens
    });
    test('update deeply nested tree with a range of tokens that causes tokens to split', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 4, token: 3 },
            { startOffsetInclusive: 10, length: 5, token: 4 },
            { startOffsetInclusive: 15, length: 4, token: 5 },
            { startOffsetInclusive: 19, length: 3, token: 6 },
            { startOffsetInclusive: 22, length: 5, token: 7 },
            { startOffsetInclusive: 27, length: 3, token: 8 }
        ], TokenQuality.Accurate);
        // Update token in the middle which causes tokens to split
        store.update(8, [
            { startOffsetInclusive: 12, length: 4, token: 9 },
            { startOffsetInclusive: 16, length: 4, token: 10 }
        ], TokenQuality.Accurate);
        const root = store.root;
        // Verify the structure remains balanced
        assert.strictEqual(root.children.length, 2);
        assert.strictEqual(root.children[0].children.length, 2);
        // Verify the lengths are updated correctly
        assert.strictEqual(root.children[0].length, 12);
        assert.strictEqual(root.children[1].length, 18);
    });
    test('getTokensInRange returns tokens in middle of document', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 3, token: 3 }
        ], TokenQuality.Accurate);
        const tokens = store.getTokensInRange(3, 6);
        assert.deepStrictEqual(tokens, [{ startOffsetInclusive: 3, length: 3, token: 2 }]);
    });
    test('getTokensInRange returns tokens at start of document', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 3, token: 3 }
        ], TokenQuality.Accurate);
        const tokens = store.getTokensInRange(0, 3);
        assert.deepStrictEqual(tokens, [{ startOffsetInclusive: 0, length: 3, token: 1 }]);
    });
    test('getTokensInRange returns tokens at end of document', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 3, token: 3 }
        ], TokenQuality.Accurate);
        const tokens = store.getTokensInRange(6, 9);
        assert.deepStrictEqual(tokens, [{ startOffsetInclusive: 6, length: 3, token: 3 }]);
    });
    test('getTokensInRange returns multiple tokens across nodes', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 1, token: 1 },
            { startOffsetInclusive: 1, length: 1, token: 2 },
            { startOffsetInclusive: 2, length: 1, token: 3 },
            { startOffsetInclusive: 3, length: 1, token: 4 },
            { startOffsetInclusive: 4, length: 1, token: 5 },
            { startOffsetInclusive: 5, length: 1, token: 6 }
        ], TokenQuality.Accurate);
        const tokens = store.getTokensInRange(2, 5);
        assert.deepStrictEqual(tokens, [
            { startOffsetInclusive: 2, length: 1, token: 3 },
            { startOffsetInclusive: 3, length: 1, token: 4 },
            { startOffsetInclusive: 4, length: 1, token: 5 }
        ]);
    });
    test('Realistic scenario one', () => {
        // inspired by this snippet, with the update adding a space in the constructor's curly braces:
        // /*
        // */
        // class XY {
        // 	constructor() {}
        // }
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 164164 },
            { startOffsetInclusive: 3, length: 1, token: 32836 },
            { startOffsetInclusive: 4, length: 3, token: 164164 },
            { startOffsetInclusive: 7, length: 2, token: 32836 },
            { startOffsetInclusive: 9, length: 5, token: 196676 },
            { startOffsetInclusive: 14, length: 1, token: 32836 },
            { startOffsetInclusive: 15, length: 2, token: 557124 },
            { startOffsetInclusive: 17, length: 4, token: 32836 },
            { startOffsetInclusive: 21, length: 1, token: 32836 },
            { startOffsetInclusive: 22, length: 11, token: 196676 },
            { startOffsetInclusive: 33, length: 7, token: 32836 },
            { startOffsetInclusive: 40, length: 3, token: 32836 }
        ], TokenQuality.Accurate);
        store.update(33, [
            { startOffsetInclusive: 9, length: 5, token: 196676 },
            { startOffsetInclusive: 14, length: 1, token: 32836 },
            { startOffsetInclusive: 15, length: 2, token: 557124 },
            { startOffsetInclusive: 17, length: 4, token: 32836 },
            { startOffsetInclusive: 21, length: 1, token: 32836 },
            { startOffsetInclusive: 22, length: 11, token: 196676 },
            { startOffsetInclusive: 33, length: 8, token: 32836 },
            { startOffsetInclusive: 41, length: 3, token: 32836 }
        ], TokenQuality.Accurate);
    });
    test('Realistic scenario two', () => {
        // inspired by this snippet, with the update deleteing the space in the body of class x
        // class x {
        //
        // }
        // class y {
        // }
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 5, token: 196676 },
            { startOffsetInclusive: 5, length: 1, token: 32836 },
            { startOffsetInclusive: 6, length: 1, token: 557124 },
            { startOffsetInclusive: 7, length: 4, token: 32836 },
            { startOffsetInclusive: 11, length: 3, token: 32836 },
            { startOffsetInclusive: 14, length: 3, token: 32836 },
            { startOffsetInclusive: 17, length: 5, token: 196676 },
            { startOffsetInclusive: 22, length: 1, token: 32836 },
            { startOffsetInclusive: 23, length: 1, token: 557124 },
            { startOffsetInclusive: 24, length: 4, token: 32836 },
            { startOffsetInclusive: 28, length: 2, token: 32836 },
            { startOffsetInclusive: 30, length: 1, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens0 = store.getTokensInRange(0, 16);
        assert.deepStrictEqual(tokens0, [
            { token: 196676, startOffsetInclusive: 0, length: 5 },
            { token: 32836, startOffsetInclusive: 5, length: 1 },
            { token: 557124, startOffsetInclusive: 6, length: 1 },
            { token: 32836, startOffsetInclusive: 7, length: 4 },
            { token: 32836, startOffsetInclusive: 11, length: 3 },
            { token: 32836, startOffsetInclusive: 14, length: 2 }
        ]);
        store.update(14, [
            { startOffsetInclusive: 0, length: 5, token: 196676 },
            { startOffsetInclusive: 5, length: 1, token: 32836 },
            { startOffsetInclusive: 6, length: 1, token: 557124 },
            { startOffsetInclusive: 7, length: 4, token: 32836 },
            { startOffsetInclusive: 11, length: 2, token: 32836 },
            { startOffsetInclusive: 13, length: 3, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens = store.getTokensInRange(0, 16);
        assert.deepStrictEqual(tokens, [
            { token: 196676, startOffsetInclusive: 0, length: 5 },
            { token: 32836, startOffsetInclusive: 5, length: 1 },
            { token: 557124, startOffsetInclusive: 6, length: 1 },
            { token: 32836, startOffsetInclusive: 7, length: 4 },
            { token: 32836, startOffsetInclusive: 11, length: 2 },
            { token: 32836, startOffsetInclusive: 13, length: 3 }
        ]);
    });
    test('Realistic scenario three', () => {
        // inspired by this snippet, with the update adding a space after the { in the constructor
        // /*--
        //  --*/
        //  class TreeViewPane {
        // 	constructor(
        // 		options: IViewletViewOptions,
        // 	) {
        // 	}
        // }
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 5, token: 164164 },
            { startOffsetInclusive: 5, length: 1, token: 32836 },
            { startOffsetInclusive: 6, length: 5, token: 164164 },
            { startOffsetInclusive: 11, length: 2, token: 32836 },
            { startOffsetInclusive: 13, length: 5, token: 196676 },
            { startOffsetInclusive: 18, length: 1, token: 32836 },
            { startOffsetInclusive: 19, length: 12, token: 557124 },
            { startOffsetInclusive: 31, length: 4, token: 32836 },
            { startOffsetInclusive: 35, length: 1, token: 32836 },
            { startOffsetInclusive: 36, length: 11, token: 196676 },
            { startOffsetInclusive: 47, length: 3, token: 32836 },
            { startOffsetInclusive: 50, length: 2, token: 32836 },
            { startOffsetInclusive: 52, length: 7, token: 327748 },
            { startOffsetInclusive: 59, length: 1, token: 98372 },
            { startOffsetInclusive: 60, length: 1, token: 32836 },
            { startOffsetInclusive: 61, length: 19, token: 557124 },
            { startOffsetInclusive: 80, length: 1, token: 32836 },
            { startOffsetInclusive: 81, length: 2, token: 32836 },
            { startOffsetInclusive: 83, length: 6, token: 32836 },
            { startOffsetInclusive: 89, length: 4, token: 32836 },
            { startOffsetInclusive: 93, length: 3, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens0 = store.getTokensInRange(36, 59);
        assert.deepStrictEqual(tokens0, [
            { token: 196676, startOffsetInclusive: 36, length: 11 },
            { token: 32836, startOffsetInclusive: 47, length: 3 },
            { token: 32836, startOffsetInclusive: 50, length: 2 },
            { token: 327748, startOffsetInclusive: 52, length: 7 }
        ]);
        store.update(82, [
            { startOffsetInclusive: 13, length: 5, token: 196676 },
            { startOffsetInclusive: 18, length: 1, token: 32836 },
            { startOffsetInclusive: 19, length: 12, token: 557124 },
            { startOffsetInclusive: 31, length: 4, token: 32836 },
            { startOffsetInclusive: 35, length: 1, token: 32836 },
            { startOffsetInclusive: 36, length: 11, token: 196676 },
            { startOffsetInclusive: 47, length: 3, token: 32836 },
            { startOffsetInclusive: 50, length: 2, token: 32836 },
            { startOffsetInclusive: 52, length: 7, token: 327748 },
            { startOffsetInclusive: 59, length: 1, token: 98372 },
            { startOffsetInclusive: 60, length: 1, token: 32836 },
            { startOffsetInclusive: 61, length: 19, token: 557124 },
            { startOffsetInclusive: 80, length: 1, token: 32836 },
            { startOffsetInclusive: 81, length: 2, token: 32836 },
            { startOffsetInclusive: 83, length: 7, token: 32836 },
            { startOffsetInclusive: 90, length: 4, token: 32836 },
            { startOffsetInclusive: 94, length: 3, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens = store.getTokensInRange(36, 59);
        assert.deepStrictEqual(tokens, [
            { token: 196676, startOffsetInclusive: 36, length: 11 },
            { token: 32836, startOffsetInclusive: 47, length: 3 },
            { token: 32836, startOffsetInclusive: 50, length: 2 },
            { token: 327748, startOffsetInclusive: 52, length: 7 }
        ]);
    });
    test('Realistic scenario four', () => {
        // inspired by this snippet, with the update adding a new line after the return true;
        // function x() {
        // 	return true;
        // }
        // class Y {
        // 	private z = false;
        // }
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 8, token: 196676 },
            { startOffsetInclusive: 8, length: 1, token: 32836 },
            { startOffsetInclusive: 9, length: 1, token: 524356 },
            { startOffsetInclusive: 10, length: 6, token: 32836 },
            { startOffsetInclusive: 16, length: 1, token: 32836 },
            { startOffsetInclusive: 17, length: 6, token: 589892 },
            { startOffsetInclusive: 23, length: 1, token: 32836 },
            { startOffsetInclusive: 24, length: 4, token: 196676 },
            { startOffsetInclusive: 28, length: 1, token: 32836 },
            { startOffsetInclusive: 29, length: 2, token: 32836 },
            { startOffsetInclusive: 31, length: 3, token: 32836 }, // This is the closing curly brace + newline chars
            { startOffsetInclusive: 34, length: 2, token: 32836 },
            { startOffsetInclusive: 36, length: 5, token: 196676 },
            { startOffsetInclusive: 41, length: 1, token: 32836 },
            { startOffsetInclusive: 42, length: 1, token: 557124 },
            { startOffsetInclusive: 43, length: 4, token: 32836 },
            { startOffsetInclusive: 47, length: 1, token: 32836 },
            { startOffsetInclusive: 48, length: 7, token: 196676 },
            { startOffsetInclusive: 55, length: 1, token: 32836 },
            { startOffsetInclusive: 56, length: 1, token: 327748 },
            { startOffsetInclusive: 57, length: 1, token: 32836 },
            { startOffsetInclusive: 58, length: 1, token: 98372 },
            { startOffsetInclusive: 59, length: 1, token: 32836 },
            { startOffsetInclusive: 60, length: 5, token: 196676 },
            { startOffsetInclusive: 65, length: 1, token: 32836 },
            { startOffsetInclusive: 66, length: 2, token: 32836 },
            { startOffsetInclusive: 68, length: 1, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens0 = store.getTokensInRange(36, 59);
        assert.deepStrictEqual(tokens0, [
            { startOffsetInclusive: 36, length: 5, token: 196676 },
            { startOffsetInclusive: 41, length: 1, token: 32836 },
            { startOffsetInclusive: 42, length: 1, token: 557124 },
            { startOffsetInclusive: 43, length: 4, token: 32836 },
            { startOffsetInclusive: 47, length: 1, token: 32836 },
            { startOffsetInclusive: 48, length: 7, token: 196676 },
            { startOffsetInclusive: 55, length: 1, token: 32836 },
            { startOffsetInclusive: 56, length: 1, token: 327748 },
            { startOffsetInclusive: 57, length: 1, token: 32836 },
            { startOffsetInclusive: 58, length: 1, token: 98372 }
        ]);
        // insert a tab + new line after `return true;` (like hitting enter after the ;)
        store.update(32, [
            { startOffsetInclusive: 0, length: 8, token: 196676 },
            { startOffsetInclusive: 8, length: 1, token: 32836 },
            { startOffsetInclusive: 9, length: 1, token: 524356 },
            { startOffsetInclusive: 10, length: 6, token: 32836 },
            { startOffsetInclusive: 16, length: 1, token: 32836 },
            { startOffsetInclusive: 17, length: 6, token: 589892 },
            { startOffsetInclusive: 23, length: 1, token: 32836 },
            { startOffsetInclusive: 24, length: 4, token: 196676 },
            { startOffsetInclusive: 28, length: 1, token: 32836 },
            { startOffsetInclusive: 29, length: 2, token: 32836 },
            { startOffsetInclusive: 31, length: 3, token: 32836 }, // This is the new line, which consists of 3 characters: \t\r\n
            { startOffsetInclusive: 34, length: 2, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens1 = store.getTokensInRange(36, 59);
        assert.deepStrictEqual(tokens1, [
            { startOffsetInclusive: 36, length: 2, token: 32836 },
            { startOffsetInclusive: 38, length: 2, token: 32836 },
            { startOffsetInclusive: 40, length: 5, token: 196676 },
            { startOffsetInclusive: 45, length: 1, token: 32836 },
            { startOffsetInclusive: 46, length: 1, token: 557124 },
            { startOffsetInclusive: 47, length: 4, token: 32836 },
            { startOffsetInclusive: 51, length: 1, token: 32836 },
            { startOffsetInclusive: 52, length: 7, token: 196676 }
        ]);
        // Delete the tab character
        store.update(37, [
            { startOffsetInclusive: 0, length: 8, token: 196676 },
            { startOffsetInclusive: 8, length: 1, token: 32836 },
            { startOffsetInclusive: 9, length: 1, token: 524356 },
            { startOffsetInclusive: 10, length: 6, token: 32836 },
            { startOffsetInclusive: 16, length: 1, token: 32836 },
            { startOffsetInclusive: 17, length: 6, token: 589892 },
            { startOffsetInclusive: 23, length: 1, token: 32836 },
            { startOffsetInclusive: 24, length: 4, token: 196676 },
            { startOffsetInclusive: 28, length: 1, token: 32836 },
            { startOffsetInclusive: 29, length: 2, token: 32836 },
            { startOffsetInclusive: 31, length: 2, token: 32836 }, // This is the changed line: \t\r\n to \r\n
            { startOffsetInclusive: 33, length: 3, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens2 = store.getTokensInRange(36, 59);
        assert.deepStrictEqual(tokens2, [
            { startOffsetInclusive: 36, length: 1, token: 32836 },
            { startOffsetInclusive: 37, length: 2, token: 32836 },
            { startOffsetInclusive: 39, length: 5, token: 196676 },
            { startOffsetInclusive: 44, length: 1, token: 32836 },
            { startOffsetInclusive: 45, length: 1, token: 557124 },
            { startOffsetInclusive: 46, length: 4, token: 32836 },
            { startOffsetInclusive: 50, length: 1, token: 32836 },
            { startOffsetInclusive: 51, length: 7, token: 196676 },
            { startOffsetInclusive: 58, length: 1, token: 32836 }
        ]);
    });
    test('Insert new line and remove tabs (split tokens)', () => {
        // class A {
        // 	a() {
        // 	}
        // }
        //
        // interface I {
        //
        // }
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 5, token: 196676 },
            { startOffsetInclusive: 5, length: 1, token: 32836 },
            { startOffsetInclusive: 6, length: 1, token: 557124 },
            { startOffsetInclusive: 7, length: 3, token: 32836 },
            { startOffsetInclusive: 10, length: 1, token: 32836 },
            { startOffsetInclusive: 11, length: 1, token: 524356 },
            { startOffsetInclusive: 12, length: 5, token: 32836 },
            { startOffsetInclusive: 17, length: 3, token: 32836 }, // This is the closing curly brace line of a()
            { startOffsetInclusive: 20, length: 2, token: 32836 },
            { startOffsetInclusive: 22, length: 1, token: 32836 },
            { startOffsetInclusive: 23, length: 9, token: 196676 },
            { startOffsetInclusive: 32, length: 1, token: 32836 },
            { startOffsetInclusive: 33, length: 1, token: 557124 },
            { startOffsetInclusive: 34, length: 3, token: 32836 },
            { startOffsetInclusive: 37, length: 1, token: 32836 },
            { startOffsetInclusive: 38, length: 1, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens0 = store.getTokensInRange(23, 39);
        assert.deepStrictEqual(tokens0, [
            { startOffsetInclusive: 23, length: 9, token: 196676 },
            { startOffsetInclusive: 32, length: 1, token: 32836 },
            { startOffsetInclusive: 33, length: 1, token: 557124 },
            { startOffsetInclusive: 34, length: 3, token: 32836 },
            { startOffsetInclusive: 37, length: 1, token: 32836 },
            { startOffsetInclusive: 38, length: 1, token: 32836 }
        ]);
        // Insert a new line after a() { }, which will add 2 tabs
        store.update(21, [
            { startOffsetInclusive: 0, length: 5, token: 196676 },
            { startOffsetInclusive: 5, length: 1, token: 32836 },
            { startOffsetInclusive: 6, length: 1, token: 557124 },
            { startOffsetInclusive: 7, length: 3, token: 32836 },
            { startOffsetInclusive: 10, length: 1, token: 32836 },
            { startOffsetInclusive: 11, length: 1, token: 524356 },
            { startOffsetInclusive: 12, length: 5, token: 32836 },
            { startOffsetInclusive: 17, length: 3, token: 32836 },
            { startOffsetInclusive: 20, length: 3, token: 32836 },
            { startOffsetInclusive: 23, length: 1, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens1 = store.getTokensInRange(26, 42);
        assert.deepStrictEqual(tokens1, [
            { startOffsetInclusive: 26, length: 9, token: 196676 },
            { startOffsetInclusive: 35, length: 1, token: 32836 },
            { startOffsetInclusive: 36, length: 1, token: 557124 },
            { startOffsetInclusive: 37, length: 3, token: 32836 },
            { startOffsetInclusive: 40, length: 1, token: 32836 },
            { startOffsetInclusive: 41, length: 1, token: 32836 }
        ]);
        // Insert another new line at the cursor, which will also cause the 2 tabs to be deleted
        store.update(24, [
            { startOffsetInclusive: 0, length: 5, token: 196676 },
            { startOffsetInclusive: 5, length: 1, token: 32836 },
            { startOffsetInclusive: 6, length: 1, token: 557124 },
            { startOffsetInclusive: 7, length: 3, token: 32836 },
            { startOffsetInclusive: 10, length: 1, token: 32836 },
            { startOffsetInclusive: 11, length: 1, token: 524356 },
            { startOffsetInclusive: 12, length: 5, token: 32836 },
            { startOffsetInclusive: 17, length: 3, token: 32836 },
            { startOffsetInclusive: 20, length: 1, token: 32836 },
            { startOffsetInclusive: 21, length: 2, token: 32836 },
            { startOffsetInclusive: 23, length: 1, token: 32836 }
        ], TokenQuality.Accurate);
        const tokens2 = store.getTokensInRange(26, 42);
        assert.deepStrictEqual(tokens2, [
            { startOffsetInclusive: 26, length: 9, token: 196676 },
            { startOffsetInclusive: 35, length: 1, token: 32836 },
            { startOffsetInclusive: 36, length: 1, token: 557124 },
            { startOffsetInclusive: 37, length: 3, token: 32836 },
            { startOffsetInclusive: 40, length: 1, token: 32836 },
            { startOffsetInclusive: 41, length: 1, token: 32836 }
        ]);
    });
    test('delete removes tokens in the middle', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 3, token: 3 }
        ], TokenQuality.Accurate);
        store.delete(3, 3); // delete 3 chars starting at offset 3
        const tokens = store.getTokensInRange(0, 9);
        assert.deepStrictEqual(tokens, [
            { startOffsetInclusive: 0, length: 3, token: 1 },
            { startOffsetInclusive: 3, length: 3, token: 3 }
        ]);
    });
    test('delete merges partially affected token', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 5, token: 1 },
            { startOffsetInclusive: 5, length: 5, token: 2 }
        ], TokenQuality.Accurate);
        store.delete(3, 4); // removes 4 chars within token 1 and partially token 2
        const tokens = store.getTokensInRange(0, 10);
        assert.deepStrictEqual(tokens, [
            { startOffsetInclusive: 0, length: 4, token: 1 },
            // token 2 is now shifted left by 4
            { startOffsetInclusive: 4, length: 3, token: 2 }
        ]);
    });
    test('replace a token with a slightly larger token', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 5, token: 1 },
            { startOffsetInclusive: 5, length: 1, token: 2 },
            { startOffsetInclusive: 6, length: 1, token: 2 },
            { startOffsetInclusive: 7, length: 17, token: 2 },
            { startOffsetInclusive: 24, length: 1, token: 2 },
            { startOffsetInclusive: 25, length: 5, token: 2 },
            { startOffsetInclusive: 30, length: 1, token: 2 },
            { startOffsetInclusive: 31, length: 1, token: 2 },
            { startOffsetInclusive: 32, length: 5, token: 2 }
        ], TokenQuality.Accurate);
        store.update(17, [{ startOffsetInclusive: 7, length: 19, token: 0 }], TokenQuality.Accurate); // removes 4 chars within token 1 and partially token 2
        const tokens = store.getTokensInRange(0, 39);
        assert.deepStrictEqual(tokens, [
            { startOffsetInclusive: 0, length: 5, token: 1 },
            { startOffsetInclusive: 5, length: 1, token: 2 },
            { startOffsetInclusive: 6, length: 1, token: 2 },
            { startOffsetInclusive: 7, length: 19, token: 0 },
            { startOffsetInclusive: 26, length: 1, token: 2 },
            { startOffsetInclusive: 27, length: 5, token: 2 },
            { startOffsetInclusive: 32, length: 1, token: 2 },
            { startOffsetInclusive: 33, length: 1, token: 2 },
            { startOffsetInclusive: 34, length: 5, token: 2 }
        ]);
    });
    test('replace a character from a large token', () => {
        const store = new TokenStore(textModel);
        store.buildStore([
            { startOffsetInclusive: 0, length: 2, token: 1 },
            { startOffsetInclusive: 2, length: 5, token: 2 },
            { startOffsetInclusive: 7, length: 1, token: 3 }
        ], TokenQuality.Accurate);
        store.delete(1, 3);
        const tokens = store.getTokensInRange(0, 7);
        assert.deepStrictEqual(tokens, [
            { startOffsetInclusive: 0, length: 2, token: 1 },
            { startOffsetInclusive: 2, length: 1, token: 2 },
            { startOffsetInclusive: 3, length: 3, token: 2 },
            { startOffsetInclusive: 6, length: 1, token: 3 }
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TdG9yZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL3Rva2VuU3RvcmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRSxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4QixJQUFJLFNBQW9CLENBQUM7SUFDekIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsU0FBUyxHQUFHO1lBQ1gsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDWCxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxNQUFNLEtBQUssR0FBRyxJQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ25FLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxNQUFNLEtBQUssR0FBRyxJQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7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QUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3ZELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7U0FDckQsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFMUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7WUFDaEIsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdEQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdkQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtTQUNyRCxFQUFFLFlBQVksQ0FBQyxR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LG9CQUFvQixFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDcEQsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNwRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1NBQ3JELEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTFCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUU7WUFDOUIsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1lBQ3JELEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtZQUNwRCxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7WUFDckQsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1lBQ3BELEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtZQUNyRCxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7U0FDckQsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLDBGQUEwRjtRQUMxRixPQUFPO1FBQ1AsUUFBUTtRQUNSLHdCQUF3QjtRQUN4QixnQkFBZ0I7UUFDaEIsa0NBQWtDO1FBQ2xDLE9BQU87UUFDUCxLQUFLO1FBQ0wsSUFBSTtRQUdKLE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hDLEtBQUssQ0FBQyxVQUFVLENBQUM7WUFDaEIsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNwRCxFQUFFLG9CQUFvQixFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtZQUN0RCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3ZELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3ZELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3RELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3ZELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7U0FDckQsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRTtZQUMvQixFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7WUFDdkQsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1lBQ3JELEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtZQUNyRCxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7U0FDdEQsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7WUFDaEIsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3RELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdkQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdkQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdEQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdkQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtTQUNyRCxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUxQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFO1lBQzlCLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtZQUN2RCxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7WUFDckQsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1lBQ3JELEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtTQUN0RCxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMscUZBQXFGO1FBQ3JGLGlCQUFpQjtRQUNqQixnQkFBZ0I7UUFDaEIsSUFBSTtRQUVKLFlBQVk7UUFDWixzQkFBc0I7UUFDdEIsSUFBSTtRQUVKLE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hDLEtBQUssQ0FBQyxVQUFVLENBQUM7WUFDaEIsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNwRCxFQUFFLG9CQUFvQixFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdEQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtZQUN0RCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLGtEQUFrRDtZQUN6RyxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3RELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdEQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdEQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtZQUN0RCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdEQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7U0FDckQsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvQyxN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RUFBRSxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUU7WUFDL0IsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdEQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtZQUN0RCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtTQUN0RCxDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7WUFDaEIsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNwRCxFQUFFLG9CQUFvQixFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtB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LG9CQUFvQixFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDcEQsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNwRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3RELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSw4Q0FBOEM7WUFDckcsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDdEQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtZQUN0RCxFQUFFLG9CQUFvQixFQUFF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RSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1lBQ3JELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtTQUNyRCxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUxQixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFO1lBQy9CLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtZQUN0RCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO1lBQ3RELEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtZQUNyRCxFQUFFLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7WUFDckQsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO1NBQ3JELENB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