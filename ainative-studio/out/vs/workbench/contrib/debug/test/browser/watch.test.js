/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { createMockDebugModel } from './mockDebugModel.js';
// Expressions
function assertWatchExpressions(watchExpressions, expectedName) {
    assert.strictEqual(watchExpressions.length, 2);
    watchExpressions.forEach(we => {
        assert.strictEqual(we.available, false);
        assert.strictEqual(we.reference, 0);
        assert.strictEqual(we.name, expectedName);
    });
}
suite('Debug - Watch', () => {
    let model;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        model = createMockDebugModel(disposables);
    });
    test('watch expressions', () => {
        assert.strictEqual(model.getWatchExpressions().length, 0);
        model.addWatchExpression('console');
        model.addWatchExpression('console');
        let watchExpressions = model.getWatchExpressions();
        assertWatchExpressions(watchExpressions, 'console');
        model.renameWatchExpression(watchExpressions[0].getId(), 'new_name');
        model.renameWatchExpression(watchExpressions[1].getId(), 'new_name');
        assertWatchExpressions(model.getWatchExpressions(), 'new_name');
        assertWatchExpressions(model.getWatchExpressions(), 'new_name');
        model.addWatchExpression('mockExpression');
        model.moveWatchExpression(model.getWatchExpressions()[2].getId(), 1);
        watchExpressions = model.getWatchExpressions();
        assert.strictEqual(watchExpressions[0].name, 'new_name');
        assert.strictEqual(watchExpressions[1].name, 'mockExpression');
        assert.strictEqual(watchExpressions[2].name, 'new_name');
        model.removeWatchExpressions();
        assert.strictEqual(model.getWatchExpressions().length, 0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2gudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvd2F0Y2gudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFM0QsY0FBYztBQUVkLFNBQVMsc0JBQXNCLENBQUMsZ0JBQThCLEVBQUUsWUFBb0I7SUFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0MsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLElBQUksS0FBaUIsQ0FBQztJQUN0QixNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixLQUFLLEdBQUcsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDcEMsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUNuRCxzQkFBc0IsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVwRCxLQUFLLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDckUsS0FBSyxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3JFLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWhFLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWhFLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzNDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXpELEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==