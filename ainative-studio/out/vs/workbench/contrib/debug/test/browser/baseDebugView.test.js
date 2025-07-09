/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as dom from '../../../../../base/browser/dom.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { renderViewTree } from '../../browser/baseDebugView.js';
import { DebugExpressionRenderer } from '../../browser/debugExpressionRenderer.js';
import { isStatusbarInDebugMode } from '../../browser/statusbarColorProvider.js';
import { Expression, Scope, StackFrame, Thread, Variable } from '../../common/debugModel.js';
import { MockSession } from '../common/mockDebug.js';
import { createTestSession } from './callStack.test.js';
import { createMockDebugModel } from './mockDebugModel.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
const $ = dom.$;
suite('Debug - Base Debug View', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let renderer;
    let configurationService;
    function assertVariable(session, scope, disposables, displayType) {
        let variable = new Variable(session, 1, scope, 2, 'foo', 'bar.foo', undefined, 0, 0, undefined, {}, 'string');
        let expression = $('.');
        let name = $('.');
        let type = $('.');
        let value = $('.');
        const label = new HighlightedLabel(name);
        const lazyButton = $('.');
        const store = disposables.add(new DisposableStore());
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, { showChanged: false }));
        assert.strictEqual(label.element.textContent, 'foo');
        assert.strictEqual(value.textContent, '');
        variable.value = 'hey';
        expression = $('.');
        name = $('.');
        type = $('.');
        value = $('.');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, { showChanged: false }));
        assert.strictEqual(value.textContent, 'hey');
        assert.strictEqual(label.element.textContent, displayType ? 'foo: ' : 'foo =');
        assert.strictEqual(type.textContent, displayType ? 'string =' : '');
        variable.value = isWindows ? 'C:\\foo.js:5' : '/foo.js:5';
        expression = $('.');
        name = $('.');
        type = $('.');
        value = $('.');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, { showChanged: false }));
        assert.ok(value.querySelector('a'));
        assert.strictEqual(value.querySelector('a').textContent, variable.value);
        variable = new Variable(session, 1, scope, 2, 'console', 'console', '5', 0, 0, undefined, { kind: 'virtual' });
        expression = $('.');
        name = $('.');
        type = $('.');
        value = $('.');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, { showChanged: false }));
        assert.strictEqual(name.className, 'virtual');
        assert.strictEqual(label.element.textContent, 'console =');
        assert.strictEqual(value.className, 'value number');
        variable = new Variable(session, 1, scope, 2, 'xpto', 'xpto.xpto', undefined, 0, 0, undefined, {}, 'custom-type');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, { showChanged: false }));
        assert.strictEqual(label.element.textContent, 'xpto');
        assert.strictEqual(value.textContent, '');
        variable.value = '2';
        expression = $('.');
        name = $('.');
        type = $('.');
        value = $('.');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, { showChanged: false }));
        assert.strictEqual(value.textContent, '2');
        assert.strictEqual(label.element.textContent, displayType ? 'xpto: ' : 'xpto =');
        assert.strictEqual(type.textContent, displayType ? 'custom-type =' : '');
        label.dispose();
    }
    /**
     * Instantiate services for use by the functions being tested.
     */
    setup(() => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        configurationService = instantiationService.createInstance(TestConfigurationService);
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IHoverService, NullHoverService);
        renderer = instantiationService.createInstance(DebugExpressionRenderer);
    });
    test('render view tree', () => {
        const container = $('.container');
        const treeContainer = renderViewTree(container);
        assert.strictEqual(treeContainer.className, 'debug-view-content file-icon-themable-tree');
        assert.strictEqual(container.childElementCount, 1);
        assert.strictEqual(container.firstChild, treeContainer);
        assert.strictEqual(dom.isHTMLDivElement(treeContainer), true);
    });
    test('render expression value', () => {
        let container = $('.container');
        const store = disposables.add(new DisposableStore());
        store.add(renderer.renderValue(container, 'render \n me', {}));
        assert.strictEqual(container.className, 'container value');
        assert.strictEqual(container.textContent, 'render \n me');
        const expression = new Expression('console');
        expression.value = 'Object';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true }));
        assert.strictEqual(container.className, 'container value unavailable error');
        expression.available = true;
        expression.value = '"string value"';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true }));
        assert.strictEqual(container.className, 'container value string');
        assert.strictEqual(container.textContent, '"string value"');
        expression.type = 'boolean';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true }));
        assert.strictEqual(container.className, 'container value boolean');
        assert.strictEqual(container.textContent, expression.value);
        expression.value = 'this is a long string';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true, maxValueLength: 4 }));
        assert.strictEqual(container.textContent, 'this...');
        expression.value = isWindows ? 'C:\\foo.js:5' : '/foo.js:5';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true }));
        assert.ok(container.querySelector('a'));
        assert.strictEqual(container.querySelector('a').textContent, expression.value);
    });
    test('render variable', () => {
        const session = new MockSession();
        const thread = new Thread(session, 'mockthread', 1);
        const range = {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: undefined,
            endColumn: undefined
        };
        const stackFrame = new StackFrame(thread, 1, null, 'app.js', 'normal', range, 0, true);
        const scope = new Scope(stackFrame, 1, 'local', 1, false, 10, 10);
        configurationService.setUserConfiguration('debug.showVariableTypes', false);
        assertVariable(session, scope, disposables, false);
    });
    test('render variable with display type setting', () => {
        const session = new MockSession();
        const thread = new Thread(session, 'mockthread', 1);
        const range = {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: undefined,
            endColumn: undefined
        };
        const stackFrame = new StackFrame(thread, 1, null, 'app.js', 'normal', range, 0, true);
        const scope = new Scope(stackFrame, 1, 'local', 1, false, 10, 10);
        configurationService.setUserConfiguration('debug.showVariableTypes', true);
        assertVariable(session, scope, disposables, true);
    });
    test('statusbar in debug mode', () => {
        const model = createMockDebugModel(disposables);
        const session = disposables.add(createTestSession(model));
        const session2 = disposables.add(createTestSession(model, undefined, { suppressDebugStatusbar: true }));
        assert.strictEqual(isStatusbarInDebugMode(0 /* State.Inactive */, []), false);
        assert.strictEqual(isStatusbarInDebugMode(1 /* State.Initializing */, [session]), false);
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session]), true);
        assert.strictEqual(isStatusbarInDebugMode(2 /* State.Stopped */, [session]), true);
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session2]), false);
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session, session2]), true);
        session.configuration.noDebug = true;
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session]), false);
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session, session2]), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlYnVnVmlldy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9iYXNlRGVidWdWaWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzNELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFHaEIsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQzlELElBQUksUUFBaUMsQ0FBQztJQUN0QyxJQUFJLG9CQUE4QyxDQUFDO0lBRW5ELFNBQVMsY0FBYyxDQUFDLE9BQW9CLEVBQUUsS0FBWSxFQUFFLFdBQXlDLEVBQUUsV0FBb0I7UUFDMUgsSUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM5RyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDckQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNILE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLFVBQVUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEIsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNILE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxD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QUFDO1FBQzVCLFNBQVMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDNUIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO1FBRTdFLFVBQVUsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQzVCLFVBQVUsQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUM7UUFDcEMsU0FBUyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM1QixLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFFNUQsVUFBVSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7UUFDNUIsU0FBUyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM1QixLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU1RCxVQUFVLENBQUMsS0FBSyxH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