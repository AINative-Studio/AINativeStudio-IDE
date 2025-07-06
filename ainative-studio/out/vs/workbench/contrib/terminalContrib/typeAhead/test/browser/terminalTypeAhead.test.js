/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { stub, useFakeTimers } from 'sinon';
import { Emitter } from '../../../../../../base/common/event.js';
import { PredictionStats, TypeAheadAddon } from '../../browser/terminalTypeAheadAddon.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { DEFAULT_LOCAL_ECHO_EXCLUDE } from '../../common/terminalTypeAheadConfiguration.js';
const CSI = `\x1b[`;
var CursorMoveDirection;
(function (CursorMoveDirection) {
    CursorMoveDirection["Back"] = "D";
    CursorMoveDirection["Forwards"] = "C";
})(CursorMoveDirection || (CursorMoveDirection = {}));
suite('Workbench - Terminal Typeahead', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    suite('PredictionStats', () => {
        let stats;
        let add;
        let succeed;
        let fail;
        setup(() => {
            add = ds.add(new Emitter());
            succeed = ds.add(new Emitter());
            fail = ds.add(new Emitter());
            stats = ds.add(new PredictionStats({
                onPredictionAdded: add.event,
                onPredictionSucceeded: succeed.event,
                onPredictionFailed: fail.event,
            }));
        });
        test('creates sane data', () => {
            const stubs = createPredictionStubs(5);
            const clock = useFakeTimers();
            try {
                for (const s of stubs) {
                    add.fire(s);
                }
                for (let i = 0; i < stubs.length; i++) {
                    clock.tick(100);
                    (i % 2 ? fail : succeed).fire(stubs[i]);
                }
                assert.strictEqual(stats.accuracy, 3 / 5);
                assert.strictEqual(stats.sampleSize, 5);
                assert.deepStrictEqual(stats.latency, {
                    count: 3,
                    min: 100,
                    max: 500,
                    median: 300
                });
            }
            finally {
                clock.restore();
            }
        });
        test('circular buffer', () => {
            const bufferSize = 24;
            const stubs = createPredictionStubs(bufferSize * 2);
            for (const s of stubs.slice(0, bufferSize)) {
                add.fire(s);
                succeed.fire(s);
            }
            assert.strictEqual(stats.accuracy, 1);
            for (const s of stubs.slice(bufferSize, bufferSize * 3 / 2)) {
                add.fire(s);
                fail.fire(s);
            }
            assert.strictEqual(stats.accuracy, 0.5);
            for (const s of stubs.slice(bufferSize * 3 / 2)) {
                add.fire(s);
                fail.fire(s);
            }
            assert.strictEqual(stats.accuracy, 0);
        });
    });
    suite('timeline', () => {
        let onBeforeProcessData;
        let publicLog;
        let config;
        let addon;
        const predictedHelloo = [
            `${CSI}?25l`, // hide cursor
            `${CSI}2;7H`, // move cursor
            'o', // new character
            `${CSI}2;8H`, // place cursor back at end of line
            `${CSI}?25h`, // show cursor
        ].join('');
        const expectProcessed = (input, output) => {
            const evt = { data: input };
            onBeforeProcessData.fire(evt);
            assert.strictEqual(JSON.stringify(evt.data), JSON.stringify(output));
        };
        setup(() => {
            onBeforeProcessData = ds.add(new Emitter());
            config = upcastPartial({
                localEchoStyle: 'italic',
                localEchoLatencyThreshold: 0,
                localEchoExcludePrograms: DEFAULT_LOCAL_ECHO_EXCLUDE,
            });
            publicLog = stub();
            addon = new TestTypeAheadAddon(upcastPartial({ onBeforeProcessData: onBeforeProcessData.event }), new TestConfigurationService({ terminal: { integrated: { ...config } } }), upcastPartial({ publicLog }));
            addon.unlockMakingPredictions();
        });
        teardown(() => {
            addon.dispose();
        });
        test('predicts a single character', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            t.expectWritten(`${CSI}3mo${CSI}23m`);
        });
        test('validates character prediction', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('o', predictedHelloo);
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('validates zsh prediction (#112842)', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('o', predictedHelloo);
            t.onData('x');
            expectProcessed('\box', [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;8H`, // move cursor
                '\box', // new data
                `${CSI}2;9H`, // place cursor back at end of line
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('does not validate zsh prediction on differing lookbehindn (#112842)', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('o', predictedHelloo);
            t.onData('x');
            expectProcessed('\bqx', [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;8H`, // move cursor cursor
                `${CSI}X`, // delete character
                `${CSI}0m`, // reset style
                '\bqx', // new data
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 0.5);
        });
        test('rolls back character prediction', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('q', [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;7H`, // move cursor cursor
                `${CSI}X`, // delete character
                `${CSI}0m`, // reset style
                'q', // new character
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 0);
        });
        test('handles left arrow when we hit the boundary', () => {
            const t = ds.add(createMockTerminal({ lines: ['|'] }));
            addon.activate(t.terminal);
            addon.unlockNavigating();
            const cursorXBefore = addon.physicalCursor(t.terminal.buffer.active)?.x;
            t.onData(`${CSI}${"D" /* CursorMoveDirection.Back */}`);
            t.expectWritten('');
            // Trigger rollback because we don't expect this data
            onBeforeProcessData.fire({ data: 'xy' });
            assert.strictEqual(addon.physicalCursor(t.terminal.buffer.active)?.x, 
            // The cursor should not have changed because we've hit the
            // boundary (start of prompt)
            cursorXBefore);
        });
        test('handles right arrow when we hit the boundary', () => {
            const t = ds.add(createMockTerminal({ lines: ['|'] }));
            addon.activate(t.terminal);
            addon.unlockNavigating();
            const cursorXBefore = addon.physicalCursor(t.terminal.buffer.active)?.x;
            t.onData(`${CSI}${"C" /* CursorMoveDirection.Forwards */}`);
            t.expectWritten('');
            // Trigger rollback because we don't expect this data
            onBeforeProcessData.fire({ data: 'xy' });
            assert.strictEqual(addon.physicalCursor(t.terminal.buffer.active)?.x, 
            // The cursor should not have changed because we've hit the
            // boundary (end of prompt)
            cursorXBefore);
        });
        test('internal cursor state is reset when all predictions are undone', () => {
            const t = ds.add(createMockTerminal({ lines: ['|'] }));
            addon.activate(t.terminal);
            addon.unlockNavigating();
            const cursorXBefore = addon.physicalCursor(t.terminal.buffer.active)?.x;
            t.onData(`${CSI}${"D" /* CursorMoveDirection.Back */}`);
            t.expectWritten('');
            addon.undoAllPredictions();
            assert.strictEqual(addon.physicalCursor(t.terminal.buffer.active)?.x, 
            // The cursor should not have changed because we've hit the
            // boundary (start of prompt)
            cursorXBefore);
        });
        test('restores cursor graphics mode', () => {
            const t = ds.add(createMockTerminal({
                lines: ['hello|'],
                cursorAttrs: { isAttributeDefault: false, isBold: true, isFgPalette: true, getFgColor: 1 },
            }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed('q', [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;7H`, // move cursor cursor
                `${CSI}X`, // delete character
                `${CSI}1;38;5;1m`, // reset style
                'q', // new character
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 0);
        });
        test('validates against and applies graphics mode on predicted', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed(`${CSI}4mo`, [
                `${CSI}?25l`, // hide cursor
                `${CSI}2;7H`, // move cursor
                `${CSI}4m`, // new PTY's style
                'o', // new character
                `${CSI}2;8H`, // place cursor back at end of line
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('ignores cursor hides or shows', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('o');
            expectProcessed(`${CSI}?25lo${CSI}?25h`, [
                `${CSI}?25l`, // hide cursor from PTY
                `${CSI}?25l`, // hide cursor
                `${CSI}2;7H`, // move cursor
                'o', // new character
                `${CSI}?25h`, // show cursor from PTY
                `${CSI}2;8H`, // place cursor back at end of line
                `${CSI}?25h`, // show cursor
            ].join(''));
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('matches backspace at EOL (bash style)', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('\x7F');
            expectProcessed(`\b${CSI}K`, `\b${CSI}K`);
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('matches backspace at EOL (zsh style)', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('\x7F');
            expectProcessed('\b \b', '\b \b');
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('gradually matches backspace', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            t.onData('\x7F');
            expectProcessed('\b', '');
            expectProcessed(' \b', '\b \b');
            assert.strictEqual(addon.stats?.accuracy, 1);
        });
        test('restores old character after invalid backspace', () => {
            const t = ds.add(createMockTerminal({ lines: ['hel|lo'] }));
            addon.activate(t.terminal);
            addon.unlockNavigating();
            t.onData('\x7F');
            t.expectWritten(`${CSI}2;4H${CSI}X`);
            expectProcessed('x', `${CSI}?25l${CSI}0ml${CSI}2;5H${CSI}0mx${CSI}?25h`);
            assert.strictEqual(addon.stats?.accuracy, 0);
        });
        test('waits for validation before deleting to left of cursor', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            // initially should not backspace (until the server confirms it)
            t.onData('\x7F');
            t.expectWritten('');
            expectProcessed('\b \b', '\b \b');
            t.cursor.x--;
            // enter input on the column...
            t.onData('o');
            onBeforeProcessData.fire({ data: 'o' });
            t.cursor.x++;
            t.clearWritten();
            // now that the column is 'unlocked', we should be able to predict backspace on it
            t.onData('\x7F');
            t.expectWritten(`${CSI}2;6H${CSI}X`);
        });
        test('waits for first valid prediction on a line', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.lockMakingPredictions();
            addon.activate(t.terminal);
            t.onData('o');
            t.expectWritten('');
            expectProcessed('o', 'o');
            t.onData('o');
            t.expectWritten(`${CSI}3mo${CSI}23m`);
        });
        test('disables on title change', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.activate(t.terminal);
            addon.reevaluateNow();
            assert.strictEqual(addon.isShowing, true, 'expected to show initially');
            t.onTitleChange.fire('foo - VIM.exe');
            addon.reevaluateNow();
            assert.strictEqual(addon.isShowing, false, 'expected to hide when vim is open');
            t.onTitleChange.fire('foo - git.exe');
            addon.reevaluateNow();
            assert.strictEqual(addon.isShowing, true, 'expected to show again after vim closed');
        });
        test('adds line wrap prediction even if behind a boundary', () => {
            const t = ds.add(createMockTerminal({ lines: ['hello|'] }));
            addon.lockMakingPredictions();
            addon.activate(t.terminal);
            t.onData('hi'.repeat(50));
            t.expectWritten('');
            expectProcessed('hi', [
                `${CSI}?25l`, // hide cursor
                'hi', // this greeting characters
                ...new Array(36).fill(`${CSI}3mh${CSI}23m${CSI}3mi${CSI}23m`), // rest of the greetings that fit on this line
                `${CSI}2;81H`, // move to end of line
                `${CSI}?25h`
            ].join(''));
        });
    });
});
class TestTypeAheadAddon extends TypeAheadAddon {
    unlockMakingPredictions() {
        this._lastRow = { y: 1, startingX: 100, endingX: 100, charState: 2 /* CharPredictState.Validated */ };
    }
    lockMakingPredictions() {
        this._lastRow = undefined;
    }
    unlockNavigating() {
        this._lastRow = { y: 1, startingX: 1, endingX: 1, charState: 2 /* CharPredictState.Validated */ };
    }
    reevaluateNow() {
        this._reevaluatePredictorStateNow(this.stats, this._timeline);
    }
    get isShowing() {
        return !!this._timeline?.isShowingPredictions;
    }
    undoAllPredictions() {
        this._timeline?.undoAllPredictions();
    }
    physicalCursor(buffer) {
        return this._timeline?.physicalCursor(buffer);
    }
    tentativeCursor(buffer) {
        return this._timeline?.tentativeCursor(buffer);
    }
}
function upcastPartial(v) {
    return v;
}
function createPredictionStubs(n) {
    return new Array(n).fill(0).map(stubPrediction);
}
function stubPrediction() {
    return {
        apply: () => '',
        rollback: () => '',
        matches: () => 0,
        rollForwards: () => '',
    };
}
function createMockTerminal({ lines, cursorAttrs }) {
    const ds = new DisposableStore();
    const written = [];
    const cursor = { y: 1, x: 1 };
    const onTitleChange = ds.add(new Emitter());
    const onData = ds.add(new Emitter());
    const csiEmitter = ds.add(new Emitter());
    for (let y = 0; y < lines.length; y++) {
        const line = lines[y];
        if (line.includes('|')) {
            cursor.y = y + 1;
            cursor.x = line.indexOf('|') + 1;
            lines[y] = line.replace('|', ''); // CodeQL [SM02383] replacing the first occurrence is intended
            break;
        }
    }
    return {
        written,
        cursor,
        expectWritten: (s) => {
            assert.strictEqual(JSON.stringify(written.join('')), JSON.stringify(s));
            written.splice(0, written.length);
        },
        clearWritten: () => written.splice(0, written.length),
        onData: (s) => onData.fire(s),
        csiEmitter,
        onTitleChange,
        dispose: () => ds.dispose(),
        terminal: {
            cols: 80,
            rows: 5,
            onResize: new Emitter().event,
            onData: onData.event,
            onTitleChange: onTitleChange.event,
            parser: {
                registerCsiHandler(_, callback) {
                    ds.add(csiEmitter.event(callback));
                },
            },
            write(line) {
                written.push(line);
            },
            _core: {
                _inputHandler: {
                    _curAttrData: mockCell('', cursorAttrs)
                },
                writeSync() {
                }
            },
            buffer: {
                active: {
                    type: 'normal',
                    baseY: 0,
                    get cursorY() { return cursor.y; },
                    get cursorX() { return cursor.x; },
                    getLine(y) {
                        const s = lines[y - 1] || '';
                        return {
                            length: s.length,
                            getCell: (x) => mockCell(s[x - 1] || ''),
                            translateToString: (trim, start = 0, end = s.length) => {
                                const out = s.slice(start, end);
                                return trim ? out.trimRight() : out;
                            },
                        };
                    },
                }
            }
        }
    };
}
function mockCell(char, attrs = {}) {
    return new Proxy({}, {
        get(_, prop) {
            if (typeof prop === 'string' && attrs.hasOwnProperty(prop)) {
                return () => attrs[prop];
            }
            switch (prop) {
                case 'getWidth':
                    return () => 1;
                case 'getChars':
                    return () => char;
                case 'getCode':
                    return () => char.charCodeAt(0) || 0;
                case 'isAttributeDefault':
                    return () => true;
                default:
                    return String(prop).startsWith('is') ? (() => false) : (() => 0);
            }
        },
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUeXBlQWhlYWQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi90eXBlQWhlYWQvdGVzdC9icm93c2VyL3Rlcm1pbmFsVHlwZUFoZWFkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBYSxJQUFJLEVBQUUsYUFBYSxFQUFFLE1BQU0sT0FBTyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQWlDLGVBQWUsRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUd6SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLDBCQUEwQixFQUF3QyxNQUFNLGdEQUFnRCxDQUFDO0FBRWxJLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQztBQUVwQixJQUFXLG1CQUdWO0FBSEQsV0FBVyxtQkFBbUI7SUFDN0IsaUNBQVUsQ0FBQTtJQUNWLHFDQUFjLENBQUE7QUFDZixDQUFDLEVBSFUsbUJBQW1CLEtBQW5CLG1CQUFtQixRQUc3QjtBQUVELEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFDNUMsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUVyRCxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLElBQUksS0FBc0IsQ0FBQztRQUMz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