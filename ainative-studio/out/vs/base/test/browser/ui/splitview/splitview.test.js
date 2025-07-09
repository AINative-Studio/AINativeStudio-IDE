/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Sizing, SplitView } from '../../../../browser/ui/splitview/splitview.js';
import { Emitter } from '../../../../common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
class TestView {
    get minimumSize() { return this._minimumSize; }
    set minimumSize(size) { this._minimumSize = size; this._onDidChange.fire(undefined); }
    get maximumSize() { return this._maximumSize; }
    set maximumSize(size) { this._maximumSize = size; this._onDidChange.fire(undefined); }
    get element() { this._onDidGetElement.fire(); return this._element; }
    get size() { return this._size; }
    get orthogonalSize() { return this._orthogonalSize; }
    constructor(_minimumSize, _maximumSize, priority = 0 /* LayoutPriority.Normal */) {
        this._minimumSize = _minimumSize;
        this._maximumSize = _maximumSize;
        this.priority = priority;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._element = document.createElement('div');
        this._onDidGetElement = new Emitter();
        this.onDidGetElement = this._onDidGetElement.event;
        this._size = 0;
        this._orthogonalSize = 0;
        this._onDidLayout = new Emitter();
        this.onDidLayout = this._onDidLayout.event;
        this._onDidFocus = new Emitter();
        this.onDidFocus = this._onDidFocus.event;
        assert(_minimumSize <= _maximumSize, 'splitview view minimum size must be <= maximum size');
    }
    layout(size, _offset, orthogonalSize) {
        this._size = size;
        this._orthogonalSize = orthogonalSize;
        this._onDidLayout.fire({ size, orthogonalSize });
    }
    focus() {
        this._onDidFocus.fire();
    }
    dispose() {
        this._onDidChange.dispose();
        this._onDidGetElement.dispose();
        this._onDidLayout.dispose();
        this._onDidFocus.dispose();
    }
}
function getSashes(splitview) {
    return splitview.sashItems.map((i) => i.sash);
}
suite('Splitview', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let container;
    setup(() => {
        container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.width = `${200}px`;
        container.style.height = `${200}px`;
    });
    test('empty splitview has empty DOM', () => {
        store.add(new SplitView(container));
        assert.strictEqual(container.firstElementChild.firstElementChild.childElementCount, 0, 'split view should be empty');
    });
    test('has views and sashes as children', () => {
        const view1 = store.add(new TestView(20, 20));
        const view2 = store.add(new TestView(20, 20));
        const view3 = store.add(new TestView(20, 20));
        const splitview = store.add(new SplitView(container));
        splitview.addView(view1, 20);
        splitview.addView(view2, 20);
        splitview.addView(view3, 20);
        let viewQuery = container.querySelectorAll('.monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view');
        assert.strictEqual(viewQuery.length, 3, 'split view should have 3 views');
        let sashQuery = container.querySelectorAll('.monaco-split-view2 > .sash-container > .monaco-sash');
        assert.strictEqual(sashQuery.length, 2, 'split view should have 2 sashes');
        splitview.removeView(2);
        viewQuery = container.querySelectorAll('.monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view');
        assert.strictEqual(viewQuery.length, 2, 'split view should have 2 views');
        sashQuery = container.querySelectorAll('.monaco-split-view2 > .sash-container > .monaco-sash');
        assert.strictEqual(sashQuery.length, 1, 'split view should have 1 sash');
        splitview.removeView(0);
        viewQuery = container.querySelectorAll('.monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view');
        assert.strictEqual(viewQuery.length, 1, 'split view should have 1 view');
        sashQuery = container.querySelectorAll('.monaco-split-view2 > .sash-container > .monaco-sash');
        assert.strictEqual(sashQuery.length, 0, 'split view should have no sashes');
        splitview.removeView(0);
        viewQuery = container.querySelectorAll('.monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view');
        assert.strictEqual(viewQuery.length, 0, 'split view should have no views');
        sashQuery = container.querySelectorAll('.monaco-split-view2 > .sash-container > .monaco-sash');
        assert.strictEqual(sashQuery.length, 0, 'split view should have no sashes');
    });
    test('calls view methods on addView and removeView', () => {
        const view = store.add(new TestView(20, 20));
        const splitview = store.add(new SplitView(container));
        let didLayout = false;
        store.add(view.onDidLayout(() => didLayout = true));
        store.add(view.onDidGetElement(() => undefined));
        splitview.addView(view, 20);
        assert.strictEqual(view.size, 20, 'view has right size');
        assert(didLayout, 'layout is called');
        assert(didLayout, 'render is called');
    });
    test('stretches view to viewport', () => {
        const view = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view, 20);
        assert.strictEqual(view.size, 200, 'view is stretched');
        splitview.layout(200);
        assert.strictEqual(view.size, 200, 'view stayed the same');
        splitview.layout(100);
        assert.strictEqual(view.size, 100, 'view is collapsed');
        splitview.layout(20);
        assert.strictEqual(view.size, 20, 'view is collapsed');
        splitview.layout(10);
        assert.strictEqual(view.size, 20, 'view is clamped');
        splitview.layout(200);
        assert.strictEqual(view.size, 200, 'view is stretched');
    });
    test('can resize views', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, 20);
        splitview.addView(view2, 20);
        splitview.addView(view3, 20);
        assert.strictEqual(view1.size, 160, 'view1 is stretched');
        assert.strictEqual(view2.size, 20, 'view2 size is 20');
        assert.strictEqual(view3.size, 20, 'view3 size is 20');
        splitview.resizeView(1, 40);
        assert.strictEqual(view1.size, 140, 'view1 is collapsed');
        assert.strictEqual(view2.size, 40, 'view2 is stretched');
        assert.strictEqual(view3.size, 20, 'view3 stays the same');
        splitview.resizeView(0, 70);
        assert.strictEqual(view1.size, 70, 'view1 is collapsed');
        assert.strictEqual(view2.size, 40, 'view2 stays the same');
        assert.strictEqual(view3.size, 90, 'view3 is stretched');
        splitview.resizeView(2, 40);
        assert.strictEqual(view1.size, 70, 'view1 stays the same');
        assert.strictEqual(view2.size, 90, 'view2 is collapsed');
        assert.strictEqual(view3.size, 40, 'view3 is stretched');
    });
    test('reacts to view changes', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, 20);
        splitview.addView(view2, 20);
        splitview.addView(view3, 20);
        assert.strictEqual(view1.size, 160, 'view1 is stretched');
        assert.strictEqual(view2.size, 20, 'view2 size is 20');
        assert.strictEqual(view3.size, 20, 'view3 size is 20');
        view1.maximumSize = 20;
        assert.strictEqual(view1.size, 20, 'view1 is collapsed');
        assert.strictEqual(view2.size, 20, 'view2 stays the same');
        assert.strictEqual(view3.size, 160, 'view3 is stretched');
        view3.maximumSize = 40;
        assert.strictEqual(view1.size, 20, 'view1 stays the same');
        assert.strictEqual(view2.size, 140, 'view2 is stretched');
        assert.strictEqual(view3.size, 40, 'view3 is collapsed');
        view2.maximumSize = 200;
        assert.strictEqual(view1.size, 20, 'view1 stays the same');
        assert.strictEqual(view2.size, 140, 'view2 stays the same');
        assert.strictEqual(view3.size, 40, 'view3 stays the same');
        view3.maximumSize = Number.POSITIVE_INFINITY;
        view3.minimumSize = 100;
        assert.strictEqual(view1.size, 20, 'view1 is collapsed');
        assert.strictEqual(view2.size, 80, 'view2 is collapsed');
        assert.strictEqual(view3.size, 100, 'view3 is stretched');
    });
    test('sashes are properly enabled/disabled', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        splitview.addView(view3, Sizing.Distribute);
        const sashes = getSashes(splitview);
        assert.strictEqual(sashes.length, 2, 'there are two sashes');
        assert.strictEqual(sashes[0].state, 3 /* SashState.Enabled */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 3 /* SashState.Enabled */, 'second sash is enabled');
        splitview.layout(60);
        assert.strictEqual(sashes[0].state, 0 /* SashState.Disabled */, 'first sash is disabled');
        assert.strictEqual(sashes[1].state, 0 /* SashState.Disabled */, 'second sash is disabled');
        splitview.layout(20);
        assert.strictEqual(sashes[0].state, 0 /* SashState.Disabled */, 'first sash is disabled');
        assert.strictEqual(sashes[1].state, 0 /* SashState.Disabled */, 'second sash is disabled');
        splitview.layout(200);
        assert.strictEqual(sashes[0].state, 3 /* SashState.Enabled */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 3 /* SashState.Enabled */, 'second sash is enabled');
        view1.maximumSize = 20;
        assert.strictEqual(sashes[0].state, 0 /* SashState.Disabled */, 'first sash is disabled');
        assert.strictEqual(sashes[1].state, 3 /* SashState.Enabled */, 'second sash is enabled');
        view2.maximumSize = 20;
        assert.strictEqual(sashes[0].state, 0 /* SashState.Disabled */, 'first sash is disabled');
        assert.strictEqual(sashes[1].state, 0 /* SashState.Disabled */, 'second sash is disabled');
        view1.maximumSize = 300;
        assert.strictEqual(sashes[0].state, 1 /* SashState.AtMinimum */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 1 /* SashState.AtMinimum */, 'second sash is enabled');
        view2.maximumSize = 200;
        assert.strictEqual(sashes[0].state, 1 /* SashState.AtMinimum */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 1 /* SashState.AtMinimum */, 'second sash is enabled');
        splitview.resizeView(0, 40);
        assert.strictEqual(sashes[0].state, 3 /* SashState.Enabled */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 3 /* SashState.Enabled */, 'second sash is enabled');
    });
    test('issue #35497', () => {
        const view1 = store.add(new TestView(160, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(66, 66));
        const splitview = store.add(new SplitView(container));
        splitview.layout(986);
        splitview.addView(view1, 142, 0);
        assert.strictEqual(view1.size, 986, 'first view is stretched');
        store.add(view2.onDidGetElement(() => {
            assert.throws(() => splitview.resizeView(1, 922));
            assert.throws(() => splitview.resizeView(1, 922));
        }));
        splitview.addView(view2, 66, 0);
        assert.strictEqual(view2.size, 66, 'second view is fixed');
        assert.strictEqual(view1.size, 986 - 66, 'first view is collapsed');
        const viewContainers = container.querySelectorAll('.split-view-view');
        assert.strictEqual(viewContainers.length, 2, 'there are two view containers');
        assert.strictEqual(viewContainers.item(0).style.height, '66px', 'second view container is 66px');
        assert.strictEqual(viewContainers.item(1).style.height, `${986 - 66}px`, 'first view container is 66px');
    });
    test('automatic size distribution', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        assert.strictEqual(view1.size, 200);
        splitview.addView(view2, 50);
        assert.deepStrictEqual([view1.size, view2.size], [150, 50]);
        splitview.addView(view3, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 66, 68]);
        splitview.removeView(1, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view3.size], [100, 100]);
    });
    test('add views before layout', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.addView(view1, 100);
        splitview.addView(view2, 75);
        splitview.addView(view3, 25);
        splitview.layout(200);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [67, 67, 66]);
    });
    test('split sizing', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        assert.strictEqual(view1.size, 200);
        splitview.addView(view2, Sizing.Split(0));
        assert.deepStrictEqual([view1.size, view2.size], [100, 100]);
        splitview.addView(view3, Sizing.Split(1));
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [100, 50, 50]);
    });
    test('split sizing 2', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        assert.strictEqual(view1.size, 200);
        splitview.addView(view2, Sizing.Split(0));
        assert.deepStrictEqual([view1.size, view2.size], [100, 100]);
        splitview.addView(view3, Sizing.Split(0));
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [50, 100, 50]);
    });
    test('proportional layout', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size], [100, 100]);
        splitview.layout(100);
        assert.deepStrictEqual([view1.size, view2.size], [50, 50]);
    });
    test('disable proportional layout', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container, { proportionalLayout: false }));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size], [100, 100]);
        splitview.layout(100);
        assert.deepStrictEqual([view1.size, view2.size], [80, 20]);
    });
    test('high layout priority', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY, 2 /* LayoutPriority.High */));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container, { proportionalLayout: false }));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        splitview.addView(view3, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 68, 66]);
        splitview.layout(180);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 48, 66]);
        splitview.layout(124);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 20, 38]);
        splitview.layout(60);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [20, 20, 20]);
        splitview.layout(200);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [20, 160, 20]);
    });
    test('low layout priority', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY, 1 /* LayoutPriority.Low */));
        const splitview = store.add(new SplitView(container, { proportionalLayout: false }));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        splitview.addView(view3, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 68, 66]);
        splitview.layout(180);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 48, 66]);
        splitview.layout(132);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [46, 20, 66]);
        splitview.layout(60);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [20, 20, 20]);
        splitview.layout(200);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [20, 160, 20]);
    });
    test('context propagates to views', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY, 1 /* LayoutPriority.Low */));
        const splitview = store.add(new SplitView(container, { proportionalLayout: false }));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        splitview.addView(view3, Sizing.Distribute);
        splitview.layout(200, 100);
        assert.deepStrictEqual([view1.orthogonalSize, view2.orthogonalSize, view3.orthogonalSize], [100, 100, 100]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsaXR2aWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvc3BsaXR2aWV3L3NwbGl0dmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQXlCLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFbkYsTUFBTSxRQUFRO0lBS2IsSUFBSSxXQUFXLEtBQWEsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUN2RCxJQUFJLFdBQVcsQ0FBQyxJQUFZLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFOUYsSUFBSSxXQUFXLEtBQWEsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUN2RCxJQUFJLFdBQVcsQ0FBQyxJQUFZLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHOUYsSUFBSSxPQUFPLEtBQWtCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFNbEYsSUFBSSxJQUFJLEtBQWEsT0FBTyxJQUFJLENBQUMs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