/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { decodeKeybinding, createSimpleKeybinding } from '../../../../base/common/keybindings.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { OS } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ContextKeyExpr } from '../../../contextkey/common/contextkey.js';
import { KeybindingResolver } from '../../common/keybindingResolver.js';
import { ResolvedKeybindingItem } from '../../common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../common/usLayoutResolvedKeybinding.js';
import { createUSLayoutResolvedKeybinding } from './keybindingsTestUtils.js';
function createContext(ctx) {
    return {
        getValue: (key) => {
            return ctx[key];
        }
    };
}
suite('KeybindingResolver', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function kbItem(keybinding, command, commandArgs, when, isDefault) {
        const resolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
        return new ResolvedKeybindingItem(resolvedKeybinding, command, commandArgs, when, isDefault, null, false);
    }
    function getDispatchStr(chord) {
        return USLayoutResolvedKeybinding.getDispatchStr(chord);
    }
    test('resolve key', () => {
        const keybinding = 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 56 /* KeyCode.KeyZ */;
        const runtimeKeybinding = createSimpleKeybinding(keybinding, OS);
        const contextRules = ContextKeyExpr.equals('bar', 'baz');
        const keybindingItem = kbItem(keybinding, 'yes', null, contextRules, true);
        assert.strictEqual(contextRules.evaluate(createContext({ bar: 'baz' })), true);
        assert.strictEqual(contextRules.evaluate(createContext({ bar: 'bz' })), false);
        const resolver = new KeybindingResolver([keybindingItem], [], () => { });
        const r1 = resolver.resolve(createContext({ bar: 'baz' }), [], getDispatchStr(runtimeKeybinding));
        assert.ok(r1.kind === 2 /* ResultKind.KbFound */);
        assert.strictEqual(r1.commandId, 'yes');
        const r2 = resolver.resolve(createContext({ bar: 'bz' }), [], getDispatchStr(runtimeKeybinding));
        assert.strictEqual(r2.kind, 0 /* ResultKind.NoMatchingKb */);
    });
    test('resolve key with arguments', () => {
        const commandArgs = { text: 'no' };
        const keybinding = 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 56 /* KeyCode.KeyZ */;
        const runtimeKeybinding = createSimpleKeybinding(keybinding, OS);
        const contextRules = ContextKeyExpr.equals('bar', 'baz');
        const keybindingItem = kbItem(keybinding, 'yes', commandArgs, contextRules, true);
        const resolver = new KeybindingResolver([keybindingItem], [], () => { });
        const r = resolver.resolve(createContext({ bar: 'baz' }), [], getDispatchStr(runtimeKeybinding));
        assert.ok(r.kind === 2 /* ResultKind.KbFound */);
        assert.strictEqual(r.commandArgs, commandArgs);
    });
    suite('handle keybinding removals', () => {
        test('simple 1', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true)
            ];
            const overrides = [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), false)
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), false),
            ]);
        });
        test('simple 2', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ];
            const overrides = [
                kbItem(33 /* KeyCode.KeyC */, 'yes3', null, ContextKeyExpr.equals('3', 'c'), false)
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true),
                kbItem(33 /* KeyCode.KeyC */, 'yes3', null, ContextKeyExpr.equals('3', 'c'), false),
            ]);
        });
        test('removal with not matching when', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-yes1', null, ContextKeyExpr.equals('1', 'b'), false)
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ]);
        });
        test('removal with not matching keybinding', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ];
            const overrides = [
                kbItem(32 /* KeyCode.KeyB */, '-yes1', null, ContextKeyExpr.equals('1', 'a'), false)
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ]);
        });
        test('removal with matching keybinding and when', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-yes1', null, ContextKeyExpr.equals('1', 'a'), false)
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ]);
        });
        test('removal with unspecified keybinding', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ];
            const overrides = [
                kbItem(0, '-yes1', null, ContextKeyExpr.equals('1', 'a'), false)
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ]);
        });
        test('removal with unspecified when', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-yes1', null, undefined, false)
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ]);
        });
        test('removal with unspecified when and unspecified keybinding', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ];
            const overrides = [
                kbItem(0, '-yes1', null, undefined, false)
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ]);
        });
        test('issue #138997 - removal in default list', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'yes1', null, undefined, true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, undefined, true),
                kbItem(0, '-yes1', null, undefined, false)
            ];
            const overrides = [];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, undefined, true)
            ]);
        });
        test('issue #612#issuecomment-222109084 cannot remove keybindings for commands with ^', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, '^yes1', null, ContextKeyExpr.equals('1', 'a'), true),
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-yes1', null, undefined, false)
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(32 /* KeyCode.KeyB */, 'yes2', null, ContextKeyExpr.equals('2', 'b'), true)
            ]);
        });
        test('issue #140884 Unable to reassign F1 as keybinding for Show All Commands', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, true),
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-command1', null, undefined, false),
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, false)
            ]);
        });
        test('issue #141638: Keyboard Shortcuts: Change When Expression might actually remove keybinding in Insiders', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, true),
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, ContextKeyExpr.equals('a', '1'), false),
                kbItem(31 /* KeyCode.KeyA */, '-command1', null, undefined, false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, ContextKeyExpr.equals('a', '1'), false)
            ]);
        });
        test('issue #157751: Auto-quoting of context keys prevents removal of keybindings via UI', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, ContextKeyExpr.deserialize(`editorTextFocus && activeEditor != workbench.editor.notebook && editorLangId in julia.supportedLanguageIds`), true),
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-command1', null, ContextKeyExpr.deserialize(`editorTextFocus && activeEditor != 'workbench.editor.notebook' && editorLangId in 'julia.supportedLanguageIds'`), false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, []);
        });
        test('issue #160604: Remove keybindings with when clause does not work', () => {
            const defaults = [
                kbItem(31 /* KeyCode.KeyA */, 'command1', null, undefined, true),
            ];
            const overrides = [
                kbItem(31 /* KeyCode.KeyA */, '-command1', null, ContextKeyExpr.true(), false),
            ];
            const actual = KeybindingResolver.handleRemovals([...defaults, ...overrides]);
            assert.deepStrictEqual(actual, []);
        });
        test('contextIsEntirelyIncluded', () => {
            const toContextKeyExpression = (expr) => {
                if (typeof expr === 'string' || !expr) {
                    return ContextKeyExpr.deserialize(expr);
                }
                return expr;
            };
            const assertIsIncluded = (a, b) => {
                assert.strictEqual(KeybindingResolver.whenIsEntirelyIncluded(toContextKeyExpression(a), toContextKeyExpression(b)), true);
            };
            const assertIsNotIncluded = (a, b) => {
                assert.strictEqual(KeybindingResolver.whenIsEntirelyIncluded(toContextKeyExpression(a), toContextKeyExpression(b)), false);
            };
            assertIsIncluded(null, null);
            assertIsIncluded(null, ContextKeyExpr.true());
            assertIsIncluded(ContextKeyExpr.true(), null);
            assertIsIncluded(ContextKeyExpr.true(), ContextKeyExpr.true());
            assertIsIncluded('key1', null);
            assertIsIncluded('key1', '');
            assertIsIncluded('key1', 'key1');
            assertIsIncluded('key1', ContextKeyExpr.true());
            assertIsIncluded('!key1', '');
            assertIsIncluded('!key1', '!key1');
            assertIsIncluded('key2', '');
            assertIsIncluded('key2', 'key2');
            assertIsIncluded('key1 && key1 && key2 && key2', 'key2');
            assertIsIncluded('key1 && key2', 'key2');
            assertIsIncluded('key1 && key2', 'key1');
            assertIsIncluded('key1 && key2', '');
            assertIsIncluded('key1', 'key1 || key2');
            assertIsIncluded('key1 || !key1', 'key2 || !key2');
            assertIsIncluded('key1', 'key1 || key2 && key3');
            assertIsNotIncluded('key1', '!key1');
            assertIsNotIncluded('!key1', 'key1');
            assertIsNotIncluded('key1 && key2', 'key3');
            assertIsNotIncluded('key1 && key2', 'key4');
            assertIsNotIncluded('key1', 'key2');
            assertIsNotIncluded('key1 || key2', 'key2');
            assertIsNotIncluded('', 'key2');
            assertIsNotIncluded(null, 'key2');
        });
    });
    suite('resolve command', () => {
        function _kbItem(keybinding, command, when) {
            return kbItem(keybinding, command, null, when, true);
        }
        const items = [
            // This one will never match because its "when" is always overwritten by another one
            _kbItem(54 /* KeyCode.KeyX */, 'first', ContextKeyExpr.and(ContextKeyExpr.equals('key1', true), ContextKeyExpr.notEquals('key2', false))),
            // This one always overwrites first
            _kbItem(54 /* KeyCode.KeyX */, 'second', ContextKeyExpr.equals('key2', true)),
            // This one is a secondary mapping for `second`
            _kbItem(56 /* KeyCode.KeyZ */, 'second', undefined),
            // This one sometimes overwrites first
            _kbItem(54 /* KeyCode.KeyX */, 'third', ContextKeyExpr.equals('key3', true)),
            // This one is always overwritten by another one
            _kbItem(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 'fourth', ContextKeyExpr.equals('key4', true)),
            // This one overwrites with a chord the previous one
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */), 'fifth', undefined),
            // This one has no keybinding
            _kbItem(0, 'sixth', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */), 'seventh', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */), 'seventh', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */), 'uncomment lines', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */), // cmd+k cmd+c
            'comment lines', undefined),
            _kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */), // cmd+g cmd+c
            'unreachablechord', undefined),
            _kbItem(2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, // cmd+g
            'eleven', undefined),
            _kbItem([2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 31 /* KeyCode.KeyA */, 32 /* KeyCode.KeyB */], // cmd+k a b
            'long multi chord', undefined),
            _kbItem([2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */], // cmd+b cmd+c
            'shadowed by long-multi-chord-2', undefined),
            _kbItem([2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, 39 /* KeyCode.KeyI */], // cmd+b cmd+c i
            'long-multi-chord-2', undefined)
        ];
        const resolver = new KeybindingResolver(items, [], () => { });
        const testKbLookupByCommand = (commandId, expectedKeys) => {
            // Test lookup
            const lookupResult = resolver.lookupKeybindings(commandId);
            assert.strictEqual(lookupResult.length, expectedKeys.length, 'Length mismatch @ commandId ' + commandId);
            for (let i = 0, len = lookupResult.length; i < len; i++) {
                const expected = createUSLayoutResolvedKeybinding(expectedKeys[i], OS);
                assert.strictEqual(lookupResult[i].resolvedKeybinding.getUserSettingsLabel(), expected.getUserSettingsLabel(), 'value mismatch @ commandId ' + commandId);
            }
        };
        const testResolve = (ctx, _expectedKey, commandId) => {
            const expectedKeybinding = decodeKeybinding(_expectedKey, OS);
            const previousChord = [];
            for (let i = 0, len = expectedKeybinding.chords.length; i < len; i++) {
                const chord = getDispatchStr(expectedKeybinding.chords[i]);
                const result = resolver.resolve(ctx, previousChord, chord);
                if (i === len - 1) {
                    // if it's the final chord, then we should find a valid command,
                    // and there should not be a chord.
                    assert.ok(result.kind === 2 /* ResultKind.KbFound */, `Enters multi chord for ${commandId} at chord ${i}`);
                    assert.strictEqual(result.commandId, commandId, `Enters multi chord for ${commandId} at chord ${i}`);
                }
                else if (i > 0) {
                    // if this is an intermediate chord, we should not find a valid command,
                    // and there should be an open chord we continue.
                    assert.ok(result.kind === 1 /* ResultKind.MoreChordsNeeded */, `Continues multi chord for ${commandId} at chord ${i}`);
                }
                else {
                    // if it's not the final chord and not an intermediate, then we should not
                    // find a valid command, and we should enter a chord.
                    assert.ok(result.kind === 1 /* ResultKind.MoreChordsNeeded */, `Enters multi chord for ${commandId} at chord ${i}`);
                }
                previousChord.push(chord);
            }
        };
        test('resolve command - 1', () => {
            testKbLookupByCommand('first', []);
        });
        test('resolve command - 2', () => {
            testKbLookupByCommand('second', [56 /* KeyCode.KeyZ */, 54 /* KeyCode.KeyX */]);
            testResolve(createContext({ key2: true }), 54 /* KeyCode.KeyX */, 'second');
            testResolve(createContext({}), 56 /* KeyCode.KeyZ */, 'second');
        });
        test('resolve command - 3', () => {
            testKbLookupByCommand('third', [54 /* KeyCode.KeyX */]);
            testResolve(createContext({ key3: true }), 54 /* KeyCode.KeyX */, 'third');
        });
        test('resolve command - 4', () => {
            testKbLookupByCommand('fourth', []);
        });
        test('resolve command - 5', () => {
            testKbLookupByCommand('fifth', [KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */)]);
            testResolve(createContext({}), KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */), 'fifth');
        });
        test('resolve command - 6', () => {
            testKbLookupByCommand('seventh', [KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)]);
            testResolve(createContext({}), KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */), 'seventh');
        });
        test('resolve command - 7', () => {
            testKbLookupByCommand('uncomment lines', [KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */)]);
            testResolve(createContext({}), KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */), 'uncomment lines');
        });
        test('resolve command - 8', () => {
            testKbLookupByCommand('comment lines', [KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */)]);
            testResolve(createContext({}), KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */), 'comment lines');
        });
        test('resolve command - 9', () => {
            testKbLookupByCommand('unreachablechord', []);
        });
        test('resolve command - 10', () => {
            testKbLookupByCommand('eleven', [2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */]);
            testResolve(createContext({}), 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, 'eleven');
        });
        test('resolve command - 11', () => {
            testKbLookupByCommand('sixth', []);
        });
        test('resolve command - 12', () => {
            testKbLookupByCommand('long multi chord', [[2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 31 /* KeyCode.KeyA */, 32 /* KeyCode.KeyB */]]);
            testResolve(createContext({}), [2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 31 /* KeyCode.KeyA */, 32 /* KeyCode.KeyB */], 'long multi chord');
        });
        const emptyContext = createContext({});
        test('KBs having common prefix - the one defined later is returned', () => {
            testResolve(emptyContext, [2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, 39 /* KeyCode.KeyI */], 'long-multi-chord-2');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1Jlc29sdmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5YmluZGluZy90ZXN0L2NvbW1vbi9rZXliaW5kaW5nUmVzb2x2ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLHNCQUFzQixFQUFnQixNQUFNLHdDQUF3QyxDQUFDO0FBQ2hILE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQWtDLE1BQU0sMENBQTBDLENBQUM7QUFDMUcsT0FBTyxFQUFFLGtCQUFrQixFQUFjLE1BQU0sb0NBQW9DLENBQUM7QUFDcEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDaEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFN0UsU0FBUyxhQUFhLENBQUMsR0FBUTtJQUM5QixPQUFPO1FBQ04sUUFBUSxFQUFFLENBQUMsR0FBVyxFQUFFLEVBQUU7WUFDekIsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakIsQ0FBQztLQUNELENBQUM7QUFDSCxDQUFDO0FBRUQsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUVoQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsTUFB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