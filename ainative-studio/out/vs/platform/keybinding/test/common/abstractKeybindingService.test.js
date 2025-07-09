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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RLZXliaW5kaW5nU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvdGVzdC9jb21tb24vYWJzdHJhY3RLZXliaW5kaW5nU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBc0IsWUFBWSxFQUFjLE1BQU0sd0NBQXdDLENBQUM7QUFDOUgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFnRixNQUFNLDBDQUEwQyxDQUFDO0FBQ3hKLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXRGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLEVBQTZGLGdCQUFnQixFQUFFLE1BQU0sOENB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