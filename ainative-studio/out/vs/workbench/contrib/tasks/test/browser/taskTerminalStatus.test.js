/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ACTIVE_TASK_STATUS, FAILED_TASK_STATUS, SUCCEEDED_TASK_STATUS, TaskTerminalStatus } from '../../browser/taskTerminalStatus.js';
import { CommonTask, TaskEventKind } from '../../common/tasks.js';
import { TerminalStatusList } from '../../../terminal/browser/terminalStatusList.js';
class TestTaskService {
    constructor() {
        this._onDidStateChange = new Emitter();
    }
    get onDidStateChange() {
        return this._onDidStateChange.event;
    }
    triggerStateChange(event) {
        this._onDidStateChange.fire(event);
    }
}
class TestaccessibilitySignalService {
    async playSignal(cue) {
        return;
    }
}
class TestTerminal extends Disposable {
    constructor() {
        super();
        this.statusList = this._register(new TerminalStatusList(new TestConfigurationService()));
    }
    dispose() {
        super.dispose();
    }
}
class TestTask extends CommonTask {
    constructor() {
        super('test', undefined, undefined, {}, {}, { kind: '', label: '' });
    }
    getFolderId() {
        throw new Error('Method not implemented.');
    }
    fromObject(object) {
        throw new Error('Method not implemented.');
    }
}
class TestProblemCollector extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidFindFirstMatch = new Emitter();
        this.onDidFindFirstMatch = this._onDidFindFirstMatch.event;
        this._onDidFindErrors = new Emitter();
        this.onDidFindErrors = this._onDidFindErrors.event;
        this._onDidRequestInvalidateLastMarker = new Emitter();
        this.onDidRequestInvalidateLastMarker = this._onDidRequestInvalidateLastMarker.event;
    }
}
suite('Task Terminal Status', () => {
    let instantiationService;
    let taskService;
    let taskTerminalStatus;
    let testTerminal;
    let testTask;
    let problemCollector;
    let accessibilitySignalService;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        instantiationService = store.add(new TestInstantiationService());
        taskService = new TestTaskService();
        accessibilitySignalService = new TestaccessibilitySignalService();
        taskTerminalStatus = store.add(new TaskTerminalStatus(taskService, accessibilitySignalService));
        testTerminal = store.add(instantiationService.createInstance(TestTerminal));
        testTask = instantiationService.createInstance(TestTask);
        problemCollector = store.add(instantiationService.createInstance(TestProblemCollector));
    });
    test('Should add failed status when there is an exit code on task end', async () => {
        taskTerminalStatus.addTerminal(testTask, testTerminal, problemCollector);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessStarted });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.End });
        await poll(async () => Promise.resolve(), () => testTerminal?.statusList.primary?.id === FAILED_TASK_STATUS.id, 'terminal status should be updated');
    });
    test('Should add active status when a non-background task is run for a second time in the same terminal', () => {
        taskTerminalStatus.addTerminal(testTask, testTerminal, problemCollector);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessStarted });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessStarted, runType: "singleRun" /* TaskRunType.SingleRun */ });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
    });
    test('Should drop status when a background task exits', async () => {
        taskTerminalStatus.addTerminal(testTask, testTerminal, problemCollector);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessStarted, runType: "background" /* TaskRunType.Background */ });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessEnded, exitCode: 0 });
        await poll(async () => Promise.resolve(), () => testTerminal?.statusList.statuses?.includes(SUCCEEDED_TASK_STATUS) === false, 'terminal should have dropped status');
    });
    test('Should add succeeded status when a non-background task exits', () => {
        taskTerminalStatus.addTerminal(testTask, testTerminal, problemCollector);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessStarted, runType: "singleRun" /* TaskRunType.SingleRun */ });
        assertStatus(testTerminal.statusList, ACTIVE_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.Inactive });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
        taskService.triggerStateChange({ kind: TaskEventKind.ProcessEnded, exitCode: 0 });
        assertStatus(testTerminal.statusList, SUCCEEDED_TASK_STATUS);
    });
});
function assertStatus(actual, expected) {
    ok(actual.statuses.length === 1, '# of statuses');
    ok(actual.primary?.id === expected.id, 'ID');
    ok(actual.primary?.severity === expected.severity, 'Severity');
}
async function poll(fn, acceptFn, timeoutMessage, retryCount = 200, retryInterval = 10 // millis
) {
    let trial = 1;
    let lastError = '';
    while (true) {
        if (trial > retryCount) {
            throw new Error(`Timeout: ${timeoutMessage} after ${(retryCount * retryInterval) / 1000} seconds.\r${lastError}`);
        }
        let result;
        try {
            result = await fn();
            if (acceptFn(result)) {
                return result;
            }
            else {
                lastError = 'Did not pass accept function';
            }
        }
        catch (e) {
            lastError = Array.isArray(e.stack) ? e.stack.join('\n') : e.stack;
        }
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        trial++;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1Rlcm1pbmFsU3RhdHVzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy90ZXN0L2Jyb3dzZXIvdGFza1Rlcm1pbmFsU3RhdHVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXhJLE9BQU8sRUFBRSxVQUFVLEVBQWMsYUFBYSxFQUFlLE1BQU0sdUJBQXVCLENBQUM7QUFHM0YsT0FBTyxFQUF1QixrQkFBa0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRzFHLE1BQU0sZUFBZTtJQUFyQjtRQUNrQixzQkFBaUIsR0FBd0IsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQU96RSxDQUFDO0lBTkEsSUFBVyxnQkFBZ0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO0lBQ3JDLENBQUM7SUFDTSxrQkFBa0IsQ0FBQyxLQUEwQjtRQUNuRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQW1CLENB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