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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2NvbW1vbi9leHRIb3N0VGVybWluYWxTaGVsbEludGVncmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUV0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbkUsU0FBUyxPQUFPLENBQUMsS0FBYTtJQUM3QixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDcEIsVUFBVSxFQUFFLDJDQUEyQyxDQUFDLElBQUk7UUFDNUQsS0FBSztRQUNMLFNBQVMsRUFBRSxJQUFJO0tBQ2YsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUNELFNBQVMsU0FBUyxDQUFDLEtBQWlEO0lBQ25FLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDL0IsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUNELFNBQVMsR0FBRyxDQUFDLElBQVk7SUFDeEIsT0FBTyxZQUFZLElBQUksTUFBTSxDQUFDO0FBQy9CLENBQUM7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