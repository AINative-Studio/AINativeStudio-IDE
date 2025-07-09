/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as dom from '../../../../../base/browser/dom.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { WatchExpressionsRenderer } from '../../browser/watchExpressionsView.js';
import { Scope, StackFrame, Thread, Variable } from '../../common/debugModel.js';
import { MockDebugService, MockSession } from '../common/mockDebug.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { IDebugService } from '../../common/debug.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { DebugExpressionRenderer } from '../../browser/debugExpressionRenderer.js';
const $ = dom.$;
function assertWatchVariable(disposables, watchExpressionsRenderer, displayType) {
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
    const node = {
        element: new Variable(session, 1, scope, 2, 'foo', 'bar.foo', undefined, 0, 0, undefined, {}, 'string'),
        depth: 0,
        visibleChildrenCount: 1,
        visibleChildIndex: -1,
        collapsible: false,
        collapsed: false,
        visible: true,
        filterData: undefined,
        children: []
    };
    const expression = $('.');
    const name = $('.');
    const type = $('.');
    const value = $('.');
    const label = disposables.add(new HighlightedLabel(name));
    const lazyButton = $('.');
    const inputBoxContainer = $('.');
    const elementDisposable = disposables.add(new DisposableStore());
    const templateDisposable = disposables.add(new DisposableStore());
    const currentElement = undefined;
    const data = {
        expression,
        name,
        type,
        value,
        label,
        lazyButton,
        inputBoxContainer,
        elementDisposable,
        templateDisposable,
        currentElement
    };
    watchExpressionsRenderer.renderElement(node, 0, data);
    assert.strictEqual(value.textContent, '');
    assert.strictEqual(label.element.textContent, displayType ? 'foo: ' : 'foo =');
    node.element.value = 'xpto';
    watchExpressionsRenderer.renderElement(node, 0, data);
    assert.strictEqual(value.textContent, 'xpto');
    assert.strictEqual(type.textContent, displayType ? 'string =' : '');
    assert.strictEqual(label.element.textContent, displayType ? 'foo: ' : 'foo =');
}
suite('Debug - Watch Debug View', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let watchExpressionsRenderer;
    let instantiationService;
    let configurationService;
    let expressionRenderer;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        configurationService = instantiationService.createInstance(TestConfigurationService);
        instantiationService.stub(IConfigurationService, configurationService);
        expressionRenderer = instantiationService.createInstance(DebugExpressionRenderer);
        const debugService = new MockDebugService();
        instantiationService.stub(IHoverService, NullHoverService);
        debugService.getViewModel = () => ({ focusedStackFrame: undefined, getSelectedExpression: () => undefined });
        debugService.getViewModel().getSelectedExpression = () => undefined;
        instantiationService.stub(IDebugService, debugService);
    });
    test('watch expressions with display type', () => {
        configurationService.setUserConfiguration('debug', { showVariableTypes: true });
        instantiationService.stub(IConfigurationService, configurationService);
        watchExpressionsRenderer = instantiationService.createInstance(WatchExpressionsRenderer, expressionRenderer);
        assertWatchVariable(disposables, watchExpressionsRenderer, true);
    });
    test('watch expressions', () => {
        configurationService.setUserConfiguration('debug', { showVariableTypes: false });
        instantiationService.stub(IConfigurationService, configurationService);
        watchExpressionsRenderer = instantiationService.createInstance(WatchExpressionsRenderer, expressionRenderer);
        assertWatchVariable(disposables, watchExpressionsRenderer, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hFeHByZXNzaW9uVmlldy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci93YXRjaEV4cHJlc3Npb25WaWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN2RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBYyxNQUFNLHVCQUF1QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pI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