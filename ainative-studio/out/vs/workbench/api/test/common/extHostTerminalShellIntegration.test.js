/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { InternalTerminalShellIntegration } from '../../common/extHostTerminalShellIntegration.js';
import { Emitter } from '../../../../base/common/event.js';
import { TerminalShellExecutionCommandLineConfidence } from '../../common/extHostTypes.js';
import { deepStrictEqual, notStrictEqual, strictEqual } from 'assert';
import { DeferredPromise } from '../../../../base/common/async.js';
function cmdLine(value) {
    return Object.freeze({
        confidence: TerminalShellExecutionCommandLineConfidence.High,
        value,
        isTrusted: true,
    });
}
function asCmdLine(value) {
    if (typeof value === 'string') {
        return cmdLine(value);
    }
    return value;
}
function vsc(data) {
    return `\x1b]633;${data}\x07`;
}
const testCommandLine = 'echo hello world';
const testCommandLine2 = 'echo goodbye world';
suite('InternalTerminalShellIntegration', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let si;
    let terminal;
    let onDidStartTerminalShellExecution;
    let trackedEvents;
    let readIteratorsFlushed;
    async function startExecutionAwaitObject(commandLine, cwd) {
        return await new Promise(r => {
            store.add(onDidStartTerminalShellExecution.event(e => {
                r(e.execution);
            }));
            si.startShellExecution(asCmdLine(commandLine), cwd);
        });
    }
    async function endExecutionAwaitObject(commandLine) {
        return await new Promise(r => {
            store.add(si.onDidRequestEndExecution(e => r(e.execution)));
            si.endShellExecution(asCmdLine(commandLine), 0);
        });
    }
    async function emitData(data) {
        // AsyncIterableObjects are initialized in a microtask, this doesn't matter in practice
        // since the events will always come through in different events.
        await new Promise(r => queueMicrotask(r));
        si.emitData(data);
    }
    function assertTrackedEvents(expected) {
        deepStrictEqual(trackedEvents, expected);
    }
    function assertNonDataTrackedEvents(expected) {
        deepStrictEqual(trackedEvents.filter(e => e.type !== 'data'), expected);
    }
    function assertDataTrackedEvents(expected) {
        deepStrictEqual(trackedEvents.filter(e => e.type === 'data'), expected);
    }
    setup(() => {
        terminal = Symbol('testTerminal');
        onDidStartTerminalShellExecution = store.add(new Emitter());
        si = store.add(new InternalTerminalShellIntegration(terminal, onDidStartTerminalShellExecution));
        trackedEvents = [];
        readIteratorsFlushed = [];
        store.add(onDidStartTerminalShellExecution.event(async (e) => {
            trackedEvents.push({
                type: 'start',
                commandLine: e.execution.commandLine.value,
            });
            const stream = e.execution.read();
            const readIteratorsFlushedDeferred = new DeferredPromise();
            readIteratorsFlushed.push(readIteratorsFlushedDeferred.p);
            for await (const data of stream) {
                trackedEvents.push({
                    type: 'data',
                    commandLine: e.execution.commandLine.value,
                    data,
                });
            }
            readIteratorsFlushedDeferred.complete();
        }));
        store.add(si.onDidRequestEndExecution(e => trackedEvents.push({
            type: 'end',
            commandLine: e.execution.commandLine.value,
        })));
    });
    test('simple execution', async () => {
        const execution = await startExecutionAwaitObject(testCommandLine);
        deepStrictEqual(execution.commandLine.value, testCommandLine);
        const execution2 = await endExecutionAwaitObject(testCommandLine);
        strictEqual(execution2, execution);
        assertTrackedEvents([
            { commandLine: testCommandLine, type: 'start' },
            { commandLine: testCommandLine, type: 'end' },
        ]);
    });
    test('different execution unexpectedly ended', async () => {
        const execution1 = await startExecutionAwaitObject(testCommandLine);
        const execution2 = await endExecutionAwaitObject(testCommandLine2);
        strictEqual(execution1, execution2, 'when a different execution is ended, the one that started first should end');
        assertTrackedEvents([
            { commandLine: testCommandLine, type: 'start' },
            // This looks weird, but it's the same execution behind the scenes, just the command
            // line was updated
            { commandLine: testCommandLine2, type: 'end' },
        ]);
    });
    test('no end event', async () => {
        const execution1 = await startExecutionAwaitObject(testCommandLine);
        const endedExecution = await new Promise(r => {
            store.add(si.onDidRequestEndExecution(e => r(e.execution)));
            startExecutionAwaitObject(testCommandLine2);
        });
        strictEqual(execution1, endedExecution, 'when no end event is fired, the current execution should end');
        // Clean up disposables
        await endExecutionAwaitObject(testCommandLine2);
        await Promise.all(readIteratorsFlushed);
        assertTrackedEvents([
            { commandLine: testCommandLine, type: 'start' },
            { commandLine: testCommandLine, type: 'end' },
            { commandLine: testCommandLine2, type: 'start' },
            { commandLine: testCommandLine2, type: 'end' },
        ]);
    });
    suite('executeCommand', () => {
        test('^C to clear previous command', async () => {
            const commandLine = 'foo';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const firstExecution = await startExecutionAwaitObject('^C');
            notStrictEqual(firstExecution, apiRequestedExecution.value);
            si.emitData('SIGINT');
            si.endShellExecution(cmdLine('^C'), 0);
            si.startShellExecution(cmdLine(commandLine), undefined);
            await emitData('1');
            await endExecutionAwaitObject(commandLine);
            // IMPORTANT: We cannot reliably assert the order of data events here because flushing
            // of the async iterator is asynchronous and could happen after the execution's end
            // event fires if an execution is started immediately afterwards.
            await Promise.all(readIteratorsFlushed);
            assertNonDataTrackedEvents([
                { commandLine: '^C', type: 'start' },
                { commandLine: '^C', type: 'end' },
                { commandLine, type: 'start' },
                { commandLine, type: 'end' },
            ]);
            assertDataTrackedEvents([
                { commandLine: '^C', type: 'data', data: 'SIGINT' },
                { commandLine, type: 'data', data: '1' },
            ]);
        });
        test('multi-line command line', async () => {
            const commandLine = 'foo\nbar';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const startedExecution = await startExecutionAwaitObject('foo');
            strictEqual(startedExecution, apiRequestedExecution.value);
            si.emitData('1');
            si.emitData('2');
            si.endShellExecution(cmdLine('foo'), 0);
            si.startShellExecution(cmdLine('bar'), undefined);
            si.emitData('3');
            si.emitData('4');
            const endedExecution = await endExecutionAwaitObject('bar');
            strictEqual(startedExecution, endedExecution);
            assertTrackedEvents([
                { commandLine, type: 'start' },
                { commandLine, type: 'data', data: '1' },
                { commandLine, type: 'data', data: '2' },
                { commandLine, type: 'data', data: '3' },
                { commandLine, type: 'data', data: '4' },
                { commandLine, type: 'end' },
            ]);
        });
        test('multi-line command with long second command', async () => {
            const commandLine = 'echo foo\ncat << EOT\nline1\nline2\nline3\nEOT';
            const subCommandLine1 = 'echo foo';
            const subCommandLine2 = 'cat << EOT\nline1\nline2\nline3\nEOT';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const startedExecution = await startExecutionAwaitObject(subCommandLine1);
            strictEqual(startedExecution, apiRequestedExecution.value);
            si.emitData(`${vsc('C')}foo`);
            si.endShellExecution(cmdLine(subCommandLine1), 0);
            si.startShellExecution(cmdLine(subCommandLine2), undefined);
            si.emitData(`${vsc('C')}line1`);
            si.emitData('line2');
            si.emitData('line3');
            const endedExecution = await endExecutionAwaitObject(subCommandLine2);
            strictEqual(startedExecution, endedExecution);
            assertTrackedEvents([
                { commandLine, type: 'start' },
                { commandLine, type: 'data', data: `${vsc('C')}foo` },
                { commandLine, type: 'data', data: `${vsc('C')}line1` },
                { commandLine, type: 'data', data: 'line2' },
                { commandLine, type: 'data', data: 'line3' },
                { commandLine, type: 'end' },
            ]);
        });
        test('multi-line command comment followed by long second command', async () => {
            const commandLine = '# comment: foo\ncat << EOT\nline1\nline2\nline3\nEOT';
            const subCommandLine1 = '# comment: foo';
            const subCommandLine2 = 'cat << EOT\nline1\nline2\nline3\nEOT';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const startedExecution = await startExecutionAwaitObject(subCommandLine1);
            strictEqual(startedExecution, apiRequestedExecution.value);
            si.emitData(`${vsc('C')}`);
            si.endShellExecution(cmdLine(subCommandLine1), 0);
            si.startShellExecution(cmdLine(subCommandLine2), undefined);
            si.emitData(`${vsc('C')}line1`);
            si.emitData('line2');
            si.emitData('line3');
            const endedExecution = await endExecutionAwaitObject(subCommandLine2);
            strictEqual(startedExecution, endedExecution);
            assertTrackedEvents([
                { commandLine, type: 'start' },
                { commandLine, type: 'data', data: `${vsc('C')}` },
                { commandLine, type: 'data', data: `${vsc('C')}line1` },
                { commandLine, type: 'data', data: 'line2' },
                { commandLine, type: 'data', data: 'line3' },
                { commandLine, type: 'end' },
            ]);
        });
        test('4 multi-line commands with output', async () => {
            const commandLine = 'echo "\nfoo"\ngit commit -m "hello\n\nworld"\ncat << EOT\nline1\nline2\nline3\nEOT\n{\necho "foo"\n}';
            const subCommandLine1 = 'echo "\nfoo"';
            const subCommandLine2 = 'git commit -m "hello\n\nworld"';
            const subCommandLine3 = 'cat << EOT\nline1\nline2\nline3\nEOT';
            const subCommandLine4 = '{\necho "foo"\n}';
            const apiRequestedExecution = si.requestNewShellExecution(cmdLine(commandLine), undefined);
            const startedExecution = await startExecutionAwaitObject(subCommandLine1);
            strictEqual(startedExecution, apiRequestedExecution.value);
            si.emitData(`${vsc('C')}foo`);
            si.endShellExecution(cmdLine(subCommandLine1), 0);
            si.startShellExecution(cmdLine(subCommandLine2), undefined);
            si.emitData(`${vsc('C')} 2 files changed, 61 insertions(+), 2 deletions(-)`);
            si.endShellExecution(cmdLine(subCommandLine2), 0);
            si.startShellExecution(cmdLine(subCommandLine3), undefined);
            si.emitData(`${vsc('C')}line1`);
            si.emitData('line2');
            si.emitData('line3');
            si.endShellExecution(cmdLine(subCommandLine3), 0);
            si.emitData(`${vsc('C')}foo`);
            si.startShellExecution(cmdLine(subCommandLine4), undefined);
            const endedExecution = await endExecutionAwaitObject(subCommandLine4);
            strictEqual(startedExecution, endedExecution);
            assertTrackedEvents([
                { commandLine, type: 'start' },
                { commandLine, type: 'data', data: `${vsc('C')}foo` },
                { commandLine, type: 'data', data: `${vsc('C')} 2 files changed, 61 insertions(+), 2 deletions(-)` },
                { commandLine, type: 'data', data: `${vsc('C')}line1` },
                { commandLine, type: 'data', data: 'line2' },
                { commandLine, type: 'data', data: 'line3' },
                { commandLine, type: 'data', data: `${vsc('C')}foo` },
                { commandLine, type: 'end' },
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9jb21tb24vZXh0SG9zdFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFFdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRW5FLFNBQVMsT0FBTyxDQUFDLEtBQWE7SUFDN0IsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ3BCLFVBQVUsRUFBRSwyQ0FBMkMsQ0FBQyxJQUFJO1FBQzVELEtBQUs7UUFDTCxTQUFTLEVBQUUsSUFBSTtLQUNmLENBQUMsQ0FBQztBQUNKLENBQUM7QUFDRCxTQUFTLFNBQVMsQ0FBQyxLQUFpRDtJQUNuRSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9CLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFDRCxTQUFTLEdBQUcsQ0FBQyxJQUFZO0lBQ3hCLE9BQU8sWUFBWSxJQUFJLE1BQU0sQ0FBQztBQUMvQixDQUFD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