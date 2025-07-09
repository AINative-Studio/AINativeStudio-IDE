/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../base/common/assert.js';
import { URI } from '../../../../base/common/uri.js';
export const TEST_DATA_SCHEME = 'vscode-test-data';
export var TestUriType;
(function (TestUriType) {
    /** All console output for a task */
    TestUriType[TestUriType["TaskOutput"] = 0] = "TaskOutput";
    /** All console output for a test in a task */
    TestUriType[TestUriType["TestOutput"] = 1] = "TestOutput";
    /** Specific message in a test */
    TestUriType[TestUriType["ResultMessage"] = 2] = "ResultMessage";
    /** Specific actual output message in a test */
    TestUriType[TestUriType["ResultActualOutput"] = 3] = "ResultActualOutput";
    /** Specific expected output message in a test */
    TestUriType[TestUriType["ResultExpectedOutput"] = 4] = "ResultExpectedOutput";
})(TestUriType || (TestUriType = {}));
var TestUriParts;
(function (TestUriParts) {
    TestUriParts["Results"] = "results";
    TestUriParts["AllOutput"] = "output";
    TestUriParts["Messages"] = "message";
    TestUriParts["Text"] = "TestFailureMessage";
    TestUriParts["ActualOutput"] = "ActualOutput";
    TestUriParts["ExpectedOutput"] = "ExpectedOutput";
})(TestUriParts || (TestUriParts = {}));
export const parseTestUri = (uri) => {
    const type = uri.authority;
    const [resultId, ...request] = uri.path.slice(1).split('/');
    if (request[0] === "message" /* TestUriParts.Messages */) {
        const taskIndex = Number(request[1]);
        const testExtId = uri.query;
        const index = Number(request[2]);
        const part = request[3];
        if (type === "results" /* TestUriParts.Results */) {
            switch (part) {
                case "TestFailureMessage" /* TestUriParts.Text */:
                    return { resultId, taskIndex, testExtId, messageIndex: index, type: 2 /* TestUriType.ResultMessage */ };
                case "ActualOutput" /* TestUriParts.ActualOutput */:
                    return { resultId, taskIndex, testExtId, messageIndex: index, type: 3 /* TestUriType.ResultActualOutput */ };
                case "ExpectedOutput" /* TestUriParts.ExpectedOutput */:
                    return { resultId, taskIndex, testExtId, messageIndex: index, type: 4 /* TestUriType.ResultExpectedOutput */ };
                case "message" /* TestUriParts.Messages */:
            }
        }
    }
    if (request[0] === "output" /* TestUriParts.AllOutput */) {
        const testExtId = uri.query;
        const taskIndex = Number(request[1]);
        return testExtId
            ? { resultId, taskIndex, testExtId, type: 1 /* TestUriType.TestOutput */ }
            : { resultId, taskIndex, type: 0 /* TestUriType.TaskOutput */ };
    }
    return undefined;
};
export const buildTestUri = (parsed) => {
    const uriParts = {
        scheme: TEST_DATA_SCHEME,
        authority: "results" /* TestUriParts.Results */
    };
    if (parsed.type === 0 /* TestUriType.TaskOutput */) {
        return URI.from({
            ...uriParts,
            path: ['', parsed.resultId, "output" /* TestUriParts.AllOutput */, parsed.taskIndex].join('/'),
        });
    }
    const msgRef = (resultId, ...remaining) => URI.from({
        ...uriParts,
        query: parsed.testExtId,
        path: ['', resultId, "message" /* TestUriParts.Messages */, ...remaining].join('/'),
    });
    switch (parsed.type) {
        case 3 /* TestUriType.ResultActualOutput */:
            return msgRef(parsed.resultId, parsed.taskIndex, parsed.messageIndex, "ActualOutput" /* TestUriParts.ActualOutput */);
        case 4 /* TestUriType.ResultExpectedOutput */:
            return msgRef(parsed.resultId, parsed.taskIndex, parsed.messageIndex, "ExpectedOutput" /* TestUriParts.ExpectedOutput */);
        case 2 /* TestUriType.ResultMessage */:
            return msgRef(parsed.resultId, parsed.taskIndex, parsed.messageIndex, "TestFailureMessage" /* TestUriParts.Text */);
        case 1 /* TestUriType.TestOutput */:
            return URI.from({
                ...uriParts,
                query: parsed.testExtId,
                path: ['', parsed.resultId, "output" /* TestUriParts.AllOutput */, parsed.taskIndex].join('/'),
            });
        default:
            assertNever(parsed, 'Invalid test uri');
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1VyaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0aW5nVXJpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsa0JBQWtCLENBQUM7QUFFbkQsTUFBTSxDQUFOLElBQWtCLFdBV2pCO0FBWEQsV0FBa0IsV0FBVztJQUM1QixvQ0FBb0M7SUFDcEMseURBQVUsQ0FBQTtJQUNWLDhDQUE4QztJQUM5Qyx5REFBVSxDQUFBO0lBQ1YsaUNBQWlDO0lBQ2pDLCtEQUFhLENBQUE7SUFDYiwrQ0FBK0M7SUFDL0MseUVBQWtCLENBQUE7SUFDbEIsaURBQWlEO0lBQ2pELDZFQUFvQixDQUFBO0FBQ3JCLENBQUMsRUFYaUIsV0FBVyxLQUFYLFdBQVcsUUFXNUI7QUFrQ0QsSUFBVyxZQVFWO0FBUkQsV0FBVyxZQUFZO0lBQ3RCLG1DQUFtQixDQUFBO0lBRW5CLG9DQUFvQixDQUFBO0lBQ3BCLG9DQUFvQixDQUFBO0lBQ3BCLDJDQUEyQixDQUFBO0lBQzNCLDZDQUE2QixDQUFBO0lBQzdCLGlEQUFpQyxDQUFBO0FBQ2xDLENBQUMsRUFSVSxZQUFZLEtBQVosWUFBWSxRQVF0QjtBQUVELE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQVEsRUFBNkIsRUFBRTtJQUNuRSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO0lBQzNCLE1BQU0sQ0FBQyxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLENB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