/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { findExpressionInStackFrame } from '../../browser/debugHover.js';
import { Scope, StackFrame, Thread, Variable } from '../../common/debugModel.js';
import { Source } from '../../common/debugSource.js';
import { createTestSession } from './callStack.test.js';
import { createMockDebugModel, mockUriIdentityService } from './mockDebugModel.js';
suite('Debug - Hover', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('find expression in stack frame', async () => {
        const model = createMockDebugModel(disposables);
        const session = disposables.add(createTestSession(model));
        const thread = new class extends Thread {
            getCallStack() {
                return [stackFrame];
            }
        }(session, 'mockthread', 1);
        const firstSource = new Source({
            name: 'internalModule.js',
            path: 'a/b/c/d/internalModule.js',
            sourceReference: 10,
        }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
        const stackFrame = new class extends StackFrame {
            getScopes() {
                return Promise.resolve([scope]);
            }
        }(thread, 1, firstSource, 'app.js', 'normal', { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 10 }, 1, true);
        const scope = new class extends Scope {
            getChildren() {
                return Promise.resolve([variableA]);
            }
        }(stackFrame, 1, 'local', 1, false, 10, 10);
        const variableA = new class extends Variable {
            getChildren() {
                return Promise.resolve([variableB]);
            }
        }(session, 1, scope, 2, 'A', 'A', undefined, 0, 0, undefined, {}, 'string');
        const variableB = new Variable(session, 1, scope, 2, 'B', 'A.B', undefined, 0, 0, undefined, {}, 'string');
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, []), undefined);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['A']), variableA);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['doesNotExist', 'no']), undefined);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['a']), undefined);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['B']), undefined);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['A', 'B']), variableB);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['A', 'C']), undefined);
        // We do not search in expensive scopes
        scope.expensive = true;
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['A']), undefined);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdIb3Zlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9kZWJ1Z0hvdmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDakYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRW5GLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2pELE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUUxRCxNQUFNLE1BQU0sR0FBRyxJQUFJLEtBQU0sU0FBUSxNQUFNO1lBQ3RCLFlB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