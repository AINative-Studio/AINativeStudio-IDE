/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AbstractProgressScope, ScopedProgressIndicator } from '../../browser/progressIndicator.js';
class TestProgressBar {
    constructor() {
        this.fTotal = 0;
        this.fWorked = 0;
        this.fInfinite = false;
        this.fDone = false;
    }
    infinite() {
        this.fDone = null;
        this.fInfinite = true;
        return this;
    }
    total(total) {
        this.fDone = null;
        this.fTotal = total;
        return this;
    }
    hasTotal() {
        return !!this.fTotal;
    }
    worked(worked) {
        this.fDone = null;
        if (this.fWorked) {
            this.fWorked += worked;
        }
        else {
            this.fWorked = worked;
        }
        return this;
    }
    done() {
        this.fDone = true;
        this.fInfinite = null;
        this.fWorked = null;
        this.fTotal = null;
        return this;
    }
    stop() {
        return this.done();
    }
    show() { }
    hide() { }
}
suite('Progress Indicator', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('ScopedProgressIndicator', async () => {
        const testProgressBar = new TestProgressBar();
        const progressScope = disposables.add(new class extends AbstractProgressScope {
            constructor() { super('test.scopeId', true); }
            testOnScopeOpened(scopeId) { super.onScopeOpened(scopeId); }
            testOnScopeClosed(scopeId) { super.onScopeClosed(scopeId); }
        }());
        const testObject = disposables.add(new ScopedProgressIndicator(testProgressBar, progressScope));
        // Active: Show (Infinite)
        let fn = testObject.show(true);
        assert.strictEqual(true, testProgressBar.fInfinite);
        fn.done();
        assert.strictEqual(true, testProgressBar.fDone);
        // Active: Show (Total / Worked)
        fn = testObject.show(100);
        assert.strictEqual(false, !!testProgressBar.fInfinite);
        assert.strictEqual(100, testProgressBar.fTotal);
        fn.worked(20);
        assert.strictEqual(20, testProgressBar.fWorked);
        fn.total(80);
        assert.strictEqual(80, testProgressBar.fTotal);
        fn.done();
        assert.strictEqual(true, testProgressBar.fDone);
        // Inactive: Show (Infinite)
        progressScope.testOnScopeClosed('test.scopeId');
        testObject.show(true);
        assert.strictEqual(false, !!testProgressBar.fInfinite);
        progressScope.testOnScopeOpened('test.scopeId');
        assert.strictEqual(true, testProgressBar.fInfinite);
        // Inactive: Show (Total / Worked)
        progressScope.testOnScopeClosed('test.scopeId');
        fn = testObject.show(100);
        fn.total(80);
        fn.worked(20);
        assert.strictEqual(false, !!testProgressBar.fTotal);
        progressScope.testOnScopeOpened('test.scopeId');
        assert.strictEqual(20, testProgressBar.fWorked);
        assert.strictEqual(80, testProgressBar.fTotal);
        // Acive: Show While
        let p = Promise.resolve(null);
        await testObject.showWhile(p);
        assert.strictEqual(true, testProgressBar.fDone);
        progressScope.testOnScopeClosed('test.scopeId');
        p = Promise.resolve(null);
        await testObject.showWhile(p);
        assert.strictEqual(true, testProgressBar.fDone);
        progressScope.testOnScopeOpened('test.scopeId');
        assert.strictEqual(true, testProgressBar.fDone);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NJbmRpY2F0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcm9ncmVzcy90ZXN0L2Jyb3dzZXIvcHJvZ3Jlc3NJbmRpY2F0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXBHLE1BQU0sZUFBZTtJQUFyQjtRQUNDLFdBQU0sR0FBVyxDQUFDLENBQUM7UUFDbkIsWUFBTyxHQUFXLENBQUMsQ0FBQztRQUNwQixjQUFTLEdBQVksS0FBSyxDQUFDO1FBQzNCLFVBQUssR0FBWSxLQUFLLENBQUM7SUFpRHhCLENBQUM7SUEvQ0EsUUFBUTtRQUNQLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBRXRCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFhO1FBQ2xCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBRXBCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBYztRQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUssQ0FBQztRQUVuQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQztRQUN4QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3ZCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFFbEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFLLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFLLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFLLENBQUM7UUFFcEIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSTtRQUNILE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxJQUFJLEtBQVcsQ0FBQztJQUVoQixJQUFJLEtBQVcsQ0FBQztDQUNoQjtBQUVELEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFFaEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUUxQyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFDLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDOUMsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQU0sU0FBUSxxQkFBcUI7WUFDNUUsZ0JBQWdCLEtBQUssQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlDLGlCQUFpQixDQUFDLE9BQWUsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRSxpQkFBaUIsQ0FBQyxPQUFlLElBQVUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDMUUsRUFBRSxDQUFDLENBQUM7UUFDTCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLENBQU8sZUFBZ0IsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBRXZHLDBCQUEwQjtRQUMxQixJQUFJLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwRCxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDVixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFaEQsZ0NBQWdDO1FBQ2hDLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDZCxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEQsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNiLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDVixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFaEQsNEJBQTRCO1FBQzVCLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNoRCxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkQsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVwRCxrQ0FBa0M7UUFDbEMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2hELEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDYixFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRCxhQUFhLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUvQyxvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QixNQUFNLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hELGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNoRCxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixNQUFNLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hELGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=