/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../editor/common/core/range.js';
import { TestId } from '../../common/testId.js';
import { ITestMessage, InternalTestItem } from '../../common/testTypes.js';
import { buildTestUri } from '../../common/testingUri.js';
export const getMessageArgs = (test, message) => ({
    $mid: 18 /* MarshalledId.TestMessageMenuArgs */,
    test: InternalTestItem.serialize(test),
    message: ITestMessage.serialize(message),
});
export const inspectSubjectHasStack = (subject) => subject instanceof MessageSubject && !!subject.stack?.length;
export class MessageSubject {
    get controllerId() {
        return TestId.root(this.test.extId);
    }
    get isDiffable() {
        return this.message.type === 0 /* TestMessageType.Error */ && ITestMessage.isDiffable(this.message);
    }
    get contextValue() {
        return this.message.type === 0 /* TestMessageType.Error */ ? this.message.contextValue : undefined;
    }
    get stack() {
        return this.message.type === 0 /* TestMessageType.Error */ && this.message.stackTrace?.length ? this.message.stackTrace : undefined;
    }
    constructor(result, test, taskIndex, messageIndex) {
        this.result = result;
        this.taskIndex = taskIndex;
        this.messageIndex = messageIndex;
        this.test = test.item;
        const messages = test.tasks[taskIndex].messages;
        this.messageIndex = messageIndex;
        const parts = { messageIndex, resultId: result.id, taskIndex, testExtId: test.item.extId };
        this.expectedUri = buildTestUri({ ...parts, type: 4 /* TestUriType.ResultExpectedOutput */ });
        this.actualUri = buildTestUri({ ...parts, type: 3 /* TestUriType.ResultActualOutput */ });
        this.messageUri = buildTestUri({ ...parts, type: 2 /* TestUriType.ResultMessage */ });
        const message = this.message = messages[this.messageIndex];
        this.context = getMessageArgs(test, message);
        this.revealLocation = message.location ?? (test.item.uri && test.item.range ? { uri: test.item.uri, range: Range.lift(test.item.range) } : undefined);
    }
}
export class TaskSubject {
    get controllerId() {
        return this.result.tasks[this.taskIndex].ctrlId;
    }
    constructor(result, taskIndex) {
        this.result = result;
        this.taskIndex = taskIndex;
        this.outputUri = buildTestUri({ resultId: result.id, taskIndex, type: 0 /* TestUriType.TaskOutput */ });
    }
}
export class TestOutputSubject {
    get controllerId() {
        return TestId.root(this.test.item.extId);
    }
    constructor(result, taskIndex, test) {
        this.result = result;
        this.taskIndex = taskIndex;
        this.test = test;
        this.outputUri = buildTestUri({ resultId: this.result.id, taskIndex: this.taskIndex, testExtId: this.test.item.extId, type: 1 /* TestUriType.TestOutput */ });
        this.task = result.tasks[this.taskIndex];
    }
}
export const equalsSubject = (a, b) => ((a instanceof MessageSubject && b instanceof MessageSubject && a.message === b.message) ||
    (a instanceof TaskSubject && b instanceof TaskSubject && a.result === b.result && a.taskIndex === b.taskIndex) ||
    (a instanceof TestOutputSubject && b instanceof TestOutputSubject && a.test === b.test && a.taskIndex === b.taskIndex));
export const mapFindTestMessage = (test, fn) => {
    for (let taskIndex = 0; taskIndex < test.tasks.length; taskIndex++) {
        const task = test.tasks[taskIndex];
        for (let messageIndex = 0; messageIndex < task.messages.length; messageIndex++) {
            const r = fn(task, task.messages[messageIndex], messageIndex, taskIndex);
            if (r !== undefined) {
                return r;
            }
        }
    }
    return undefined;
};
export const getSubjectTestItem = (subject) => {
    if (subject instanceof MessageSubject) {
        return subject.test;
    }
    if (subject instanceof TaskSubject) {
        return undefined;
    }
    return subject.test.item;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNTdWJqZWN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0UmVzdWx0c1ZpZXcvdGVzdFJlc3VsdHNTdWJqZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFaEQsT0FBTyxFQUE0QixZQUFZLEVBQXNELGdCQUFnQixFQUFtQyxNQUFNLDJCQUEyQixDQUFDO0FBQzFMLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUV2RSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxJQUFvQixFQUFFLE9BQXFCLEVBQXdCLEVBQUUsQ0FBQyxDQUFDO0lBQ3JHLElBQUksMkNBQWtDO0lBQ3RDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO0lBQ3RDLE9BQU8sRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztDQUN4QyxDQUFDLENBQUM7QUFNSCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLE9BQW1DLEVBQUUsRUFBRSxDQUM3RSxPQUFPLFlBQVksY0FBYyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQztBQUU5RCxNQUFNLE9BQU8sY0FBYztJQVMxQixJQUFXLFlBQVk7UUFDdEIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELElBQVcsVUFBVTtRQUNwQixPQUFPLElB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