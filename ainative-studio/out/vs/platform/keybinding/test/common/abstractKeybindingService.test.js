/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { createSimpleKeybinding, KeyCodeChord } from '../../../../base/common/keybindings.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { OS } from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ContextKeyExpr } from '../../../contextkey/common/contextkey.js';
import { AbstractKeybindingService } from '../../common/abstractKeybindingService.js';
import { KeybindingResolver } from '../../common/keybindingResolver.js';
import { ResolvedKeybindingItem } from '../../common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../common/usLayoutResolvedKeybinding.js';
import { createUSLayoutResolvedKeybinding } from './keybindingsTestUtils.js';
import { NullLogService } from '../../../log/common/log.js';
import { NoOpNotification } from '../../../notification/common/notification.js';
import { NullTelemetryService } from '../../../telemetry/common/telemetryUtils.js';
function createContext(ctx) {
    return {
        getValue: (key) => {
            return ctx[key];
        }
    };
}
suite('AbstractKeybindingService', () => {
    class TestKeybindingService extends AbstractKeybindingService {
        constructor(resolver, contextKeyService, commandService, notificationService) {
            super(contextKeyService, commandService, NullTelemetryService, notificationService, new NullLogService());
            this._resolver = resolver;
        }
        _getResolver() {
            return this._resolver;
        }
        _documentHasFocus() {
            return true;
        }
        resolveKeybinding(kb) {
            return USLayoutResolvedKeybinding.resolveKeybinding(kb, OS);
        }
        resolveKeyboardEvent(keyboardEvent) {
            const chord = new KeyCodeChord(keyboardEvent.ctrlKey, keyboardEvent.shiftKey, keyboardEvent.altKey, keyboardEvent.metaKey, keyboardEvent.keyCode).toKeybinding();
            return this.resolveKeybinding(chord)[0];
        }
        resolveUserBinding(userBinding) {
            return [];
        }
        testDispatch(kb) {
            const keybinding = createSimpleKeybinding(kb, OS);
            return this._dispatch({
                _standardKeyboardEventBrand: true,
                ctrlKey: keybinding.ctrlKey,
                shiftKey: keybinding.shiftKey,
                altKey: keybinding.altKey,
                metaKey: keybinding.metaKey,
                altGraphKey: false,
                keyCode: keybinding.keyCode,
                code: null
            }, null);
        }
        _dumpDebugInfo() {
            return '';
        }
        _dumpDebugInfoJSON() {
            return '';
        }
        registerSchemaContribution() {
            // noop
        }
        enableKeybindingHoldMode() {
            return undefined;
        }
    }
    let createTestKeybindingService = null;
    let currentContextValue = null;
    let executeCommandCalls = null;
    let showMessageCalls = null;
    let statusMessageCalls = null;
    let statusMessageCallsDisposed = null;
    teardown(() => {
        currentContextValue = null;
        executeCommandCalls = null;
        showMessageCalls = null;
        createTestKeybindingService = null;
        statusMessageCalls = null;
        statusMessageCallsDisposed = null;
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        createTestKeybindingService = (items) => {
            const contextKeyService = {
                _serviceBrand: undefined,
                onDidChangeContext: undefined,
                bufferChangeEvents() { },
                createKey: undefined,
                contextMatchesRules: undefined,
                getContextKeyValue: undefined,
                createScoped: undefined,
                createOverlay: undefined,
                getContext: (target) => {
                    return currentContextValue;
                },
                updateParent: () => { }
            };
            const commandService = {
                _serviceBrand: undefined,
                onWillExecuteCommand: () => Disposable.None,
                onDidExecuteCommand: () => Disposable.None,
                executeCommand: (commandId, ...args) => {
                    executeCommandCalls.push({
                        commandId: commandId,
                        args: args
                    });
                    return Promise.resolve(undefined);
                }
            };
            const notificationService = {
                _serviceBrand: undefined,
                onDidAddNotification: undefined,
                onDidRemoveNotification: undefined,
                onDidChangeFilter: undefined,
                notify: (notification) => {
                    showMessageCalls.push({ sev: notification.severity, message: notification.message });
                    return new NoOpNotification();
                },
                info: (message) => {
                    showMessageCalls.push({ sev: Severity.Info, message });
                    return new NoOpNotification();
                },
                warn: (message) => {
                    showMessageCalls.push({ sev: Severity.Warning, message });
                    return new NoOpNotification();
                },
                error: (message) => {
                    showMessageCalls.push({ sev: Severity.Error, message });
                    return new NoOpNotification();
                },
                prompt(severity, message, choices, options) {
                    throw new Error('not implemented');
                },
                status(message, options) {
                    statusMessageCalls.push(message);
                    return {
                        dispose: () => {
                            statusMessageCallsDisposed.push(message);
                        }
                    };
                },
                setFilter() {
                    throw new Error('not implemented');
                },
                getFilter() {
                    throw new Error('not implemented');
                },
                getFilters() {
                    throw new Error('not implemented');
                },
                removeFilter() {
                    throw new Error('not implemented');
                }
            };
            const resolver = new KeybindingResolver(items, [], () => { });
            return new TestKeybindingService(resolver, contextKeyService, commandService, notificationService);
        };
    });
    function kbItem(keybinding, command, when) {
        return new ResolvedKeybindingItem(createUSLayoutResolvedKeybinding(keybinding, OS), command, null, when, true, null, false);
    }
    function toUsLabel(keybinding) {
        return createUSLayoutResolvedKeybinding(keybinding, OS).getLabel();
    }
    suite('simple tests: single- and multi-chord keybindings are dispatched', () => {
        test('a single-chord keybinding is dispatched correctly; this test makes sure the dispatch in general works before we test empty-string/null command ID', () => {
            const key = 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */;
            const kbService = createTestKeybindingService([
                kbItem(key, 'myCommand'),
            ]);
            currentContextValue = createContext({});
            const shouldPreventDefault = kbService.testDispatch(key);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, ([{ commandId: "myCommand", args: [null] }]));
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, []);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            kbService.dispose();
        });
        test('a multi-chord keybinding is dispatched correctly', () => {
            const chord0 = 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */;
            const chord1 = 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */;
            const key = [chord0, chord1];
            const kbService = createTestKeybindingService([
                kbItem(key, 'myCommand'),
            ]);
            currentContextValue = createContext({});
            let shouldPreventDefault = kbService.testDispatch(chord0);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, ([`(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`]));
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            shouldPreventDefault = kbService.testDispatch(chord1);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, ([{ commandId: "myCommand", args: [null] }]));
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, ([`(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`]));
            assert.deepStrictEqual(statusMessageCallsDisposed, ([`(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`]));
            kbService.dispose();
        });
    });
    suite('keybindings with empty-string/null command ID', () => {
        test('a single-chord keybinding with an empty string command ID unbinds the keybinding (shouldPreventDefault = false)', () => {
            const kbService = createTestKeybindingService([
                kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 'myCommand'),
                kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, ''),
            ]);
            // send Ctrl/Cmd + K
            currentContextValue = createContext({});
            const shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
            assert.deepStrictEqual(shouldPreventDefault, false);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, []);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            kbService.dispose();
        });
        test('a single-chord keybinding with a null command ID unbinds the keybinding (shouldPreventDefault = false)', () => {
            const kbService = createTestKeybindingService([
                kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 'myCommand'),
                kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, null),
            ]);
            // send Ctrl/Cmd + K
            currentContextValue = createContext({});
            const shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
            assert.deepStrictEqual(shouldPreventDefault, false);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, []);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            kbService.dispose();
        });
        test('a multi-chord keybinding with an empty-string command ID keeps the keybinding (shouldPreventDefault = true)', () => {
            const chord0 = 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */;
            const chord1 = 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */;
            const key = [chord0, chord1];
            const kbService = createTestKeybindingService([
                kbItem(key, 'myCommand'),
                kbItem(key, ''),
            ]);
            currentContextValue = createContext({});
            let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, ([`(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`]));
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, ([`(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`, `The key combination (${toUsLabel(chord0)}, ${toUsLabel(chord1)}) is not a command.`]));
            assert.deepStrictEqual(statusMessageCallsDisposed, ([`(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`]));
            kbService.dispose();
        });
        test('a multi-chord keybinding with a null command ID keeps the keybinding (shouldPreventDefault = true)', () => {
            const chord0 = 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */;
            const chord1 = 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */;
            const key = [chord0, chord1];
            const kbService = createTestKeybindingService([
                kbItem(key, 'myCommand'),
                kbItem(key, null),
            ]);
            currentContextValue = createContext({});
            let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, ([`(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`]));
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */);
            assert.deepStrictEqual(shouldPreventDefault, true);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, ([`(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`, `The key combination (${toUsLabel(chord0)}, ${toUsLabel(chord1)}) is not a command.`]));
            assert.deepStrictEqual(statusMessageCallsDisposed, ([`(${toUsLabel(chord0)}) was pressed. Waiting for second key of chord...`]));
            kbService.dispose();
        });
    });
    test('issue #16498: chord mode is quit for invalid chords', () => {
        const kbService = createTestKeybindingService([
            kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */), 'chordCommand'),
            kbItem(1 /* KeyCode.Backspace */, 'simpleCommand'),
        ]);
        // send Ctrl/Cmd + K
        let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, []);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, [
            `(${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}) was pressed. Waiting for second key of chord...`
        ]);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send backspace
        shouldPreventDefault = kbService.testDispatch(1 /* KeyCode.Backspace */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, []);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, [
            `The key combination (${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}, ${toUsLabel(1 /* KeyCode.Backspace */)}) is not a command.`
        ]);
        assert.deepStrictEqual(statusMessageCallsDisposed, [
            `(${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}) was pressed. Waiting for second key of chord...`
        ]);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send backspace
        shouldPreventDefault = kbService.testDispatch(1 /* KeyCode.Backspace */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [{
                commandId: 'simpleCommand',
                args: [null]
            }]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        kbService.dispose();
    });
    test('issue #16833: Keybinding service should not testDispatch on modifier keys', () => {
        const kbService = createTestKeybindingService([
            kbItem(5 /* KeyCode.Ctrl */, 'nope'),
            kbItem(57 /* KeyCode.Meta */, 'nope'),
            kbItem(6 /* KeyCode.Alt */, 'nope'),
            kbItem(4 /* KeyCode.Shift */, 'nope'),
            kbItem(2048 /* KeyMod.CtrlCmd */, 'nope'),
            kbItem(256 /* KeyMod.WinCtrl */, 'nope'),
            kbItem(512 /* KeyMod.Alt */, 'nope'),
            kbItem(1024 /* KeyMod.Shift */, 'nope'),
        ]);
        function assertIsIgnored(keybinding) {
            const shouldPreventDefault = kbService.testDispatch(keybinding);
            assert.strictEqual(shouldPreventDefault, false);
            assert.deepStrictEqual(executeCommandCalls, []);
            assert.deepStrictEqual(showMessageCalls, []);
            assert.deepStrictEqual(statusMessageCalls, []);
            assert.deepStrictEqual(statusMessageCallsDisposed, []);
            executeCommandCalls = [];
            showMessageCalls = [];
            statusMessageCalls = [];
            statusMessageCallsDisposed = [];
        }
        assertIsIgnored(5 /* KeyCode.Ctrl */);
        assertIsIgnored(57 /* KeyCode.Meta */);
        assertIsIgnored(6 /* KeyCode.Alt */);
        assertIsIgnored(4 /* KeyCode.Shift */);
        assertIsIgnored(2048 /* KeyMod.CtrlCmd */);
        assertIsIgnored(256 /* KeyMod.WinCtrl */);
        assertIsIgnored(512 /* KeyMod.Alt */);
        assertIsIgnored(1024 /* KeyMod.Shift */);
        kbService.dispose();
    });
    test('can trigger command that is sharing keybinding with chord', () => {
        const kbService = createTestKeybindingService([
            kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */), 'chordCommand'),
            kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 'simpleCommand', ContextKeyExpr.has('key1')),
        ]);
        // send Ctrl/Cmd + K
        currentContextValue = createContext({
            key1: true
        });
        let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [{
                commandId: 'simpleCommand',
                args: [null]
            }]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send Ctrl/Cmd + K
        currentContextValue = createContext({});
        shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, []);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, [
            `(${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}) was pressed. Waiting for second key of chord...`
        ]);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send Ctrl/Cmd + X
        currentContextValue = createContext({});
        shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [{
                commandId: 'chordCommand',
                args: [null]
            }]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, [
            `(${toUsLabel(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */)}) was pressed. Waiting for second key of chord...`
        ]);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        kbService.dispose();
    });
    test('cannot trigger chord if command is overwriting', () => {
        const kbService = createTestKeybindingService([
            kbItem(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */), 'chordCommand', ContextKeyExpr.has('key1')),
            kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 'simpleCommand'),
        ]);
        // send Ctrl/Cmd + K
        currentContextValue = createContext({});
        let shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [{
                commandId: 'simpleCommand',
                args: [null]
            }]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send Ctrl/Cmd + K
        currentContextValue = createContext({
            key1: true
        });
        shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, true);
        assert.deepStrictEqual(executeCommandCalls, [{
                commandId: 'simpleCommand',
                args: [null]
            }]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        // send Ctrl/Cmd + X
        currentContextValue = createContext({
            key1: true
        });
        shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */);
        assert.strictEqual(shouldPreventDefault, false);
        assert.deepStrictEqual(executeCommandCalls, []);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        kbService.dispose();
    });
    test('can have spying command', () => {
        const kbService = createTestKeybindingService([
            kbItem(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, '^simpleCommand'),
        ]);
        // send Ctrl/Cmd + K
        currentContextValue = createContext({});
        const shouldPreventDefault = kbService.testDispatch(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */);
        assert.strictEqual(shouldPreventDefault, false);
        assert.deepStrictEqual(executeCommandCalls, [{
                commandId: 'simpleCommand',
                args: [null]
            }]);
        assert.deepStrictEqual(showMessageCalls, []);
        assert.deepStrictEqual(statusMessageCalls, []);
        assert.deepStrictEqual(statusMessageCallsDisposed, []);
        executeCommandCalls = [];
        showMessageCalls = [];
        statusMessageCalls = [];
        statusMessageCallsDisposed = [];
        kbService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RLZXliaW5kaW5nU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5YmluZGluZy90ZXN0L2NvbW1vbi9hYnN0cmFjdEtleWJpbmRpbmdTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLHNCQUFzQixFQUFzQixZQUFZLEVBQWMsTUFBTSx3Q0FBd0MsQ0FBQztBQUM5SCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQWdGLE1BQU0sMENBQTBDLENBQUM7QUFDeEosT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDaEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sRUFBNkYsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FB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