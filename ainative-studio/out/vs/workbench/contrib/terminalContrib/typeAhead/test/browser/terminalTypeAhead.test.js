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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUeXBlQWhlYWQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvdHlwZUFoZWFkL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbFR5cGVBaGVhZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQWEsSUFBSSxFQUFFLGFBQWEsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFpQyxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHekgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSwwQkFBMEIsRUFBd0MsTUFBTSxnREFBZ0QsQ0FBQztBQUVsSSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUM7QUFFcEIsSUFBVyxtQkFHVjtBQUhELFdBQVcsbUJBQW1CO0lBQzdCLGlDQUFVLENBQUE7SUFDVixxQ0FBYyxDQUFBO0FBQ2YsQ0FBQyxFQUhVLG1CQUFtQixLQUFuQixtQkFBbUIsUUFHN0I7QUFFRCxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO0lBQzVDLE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFckQsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM3QixJQUFJLEtBQXNCLENBQUM7UUFD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