/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as dom from '../../../../../base/browser/dom.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { DebugExpressionRenderer } from '../../browser/debugExpressionRenderer.js';
import { VariablesRenderer } from '../../browser/variablesView.js';
import { IDebugService } from '../../common/debug.js';
import { Scope, StackFrame, Thread, Variable } from '../../common/debugModel.js';
import { MockDebugService, MockSession } from '../common/mockDebug.js';
const $ = dom.$;
function assertVariable(disposables, variablesRenderer, displayType) {
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
    variablesRenderer.renderElement(node, 0, data);
    assert.strictEqual(value.textContent, '');
    assert.strictEqual(label.element.textContent, 'foo');
    node.element.value = 'xpto';
    variablesRenderer.renderElement(node, 0, data);
    assert.strictEqual(value.textContent, 'xpto');
    assert.strictEqual(type.textContent, displayType ? 'string =' : '');
    assert.strictEqual(label.element.textContent, displayType ? 'foo: ' : 'foo =');
    variablesRenderer.disposeTemplate(data);
}
suite('Debug - Variable Debug View', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let variablesRenderer;
    let instantiationService;
    let expressionRenderer;
    let configurationService;
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
    test('variable expressions with display type', () => {
        configurationService.setUserConfiguration('debug.showVariableTypes', true);
        instantiationService.stub(IConfigurationService, configurationService);
        variablesRenderer = instantiationService.createInstance(VariablesRenderer, expressionRenderer);
        assertVariable(disposables, variablesRenderer, true);
    });
    test('variable expressions', () => {
        configurationService.setUserConfiguration('debug.showVariableTypes', false);
        instantiationService.stub(IConfigurationService, configurationService);
        variablesRenderer = instantiationService.createInstance(VariablesRenderer, expressionRenderer);
        assertVariable(disposables, variablesRenderer, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVzVmlldy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci92YXJpYWJsZXNWaWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRWxHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQWMsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRXZFLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFaEIsU0FBUyxjQUFjLENBQUMsV0FBeUMsRUFBRSxpQkFBb0MsRUFBRSxXQUFvQjtJQUM1SCxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO0lBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEQsTUFBTSxLQUFLLEdBQUc7UUFDYixlQUFlLEVBQUUsQ0FBQztRQUNsQixXQUFXLEVBQUUsQ0FBQztRQUNkLGFBQWEsRUFBRSxTQUFVO1FBQ3pCLFNBQVMsRUFBRSxTQUFVO0tBQ3JCLENBQUM7SUFDRixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEYsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbEUsTUFBTSxJQUFJLEdBQUc7UUFDWixPQUFPLEVBQUUsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUM7UUFDdkcsS0FBSyxFQUFFLENBQUM7UUFDUixvQkFBb0IsRUFBRSxDQUFDO1FBQ3ZCLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUNyQixXQUFXLEVBQUUsS0FBSztRQUNsQixTQUFTLEVBQUUsS0FBSztRQUNoQixPQUFPLEVBQUUsSUFBSTtRQUNiLFVBQVUsRUFBRSxTQUFTO1FBQ3JCLFFBQVEsRUFBRSxFQUFFO0tBQ1osQ0FBQztJQUNGLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMxQixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDMUIsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakMsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztJQUNqRSxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQztJQUNqQyxNQUFNLElBQUksR0FBRztRQUNaLFVBQVU7UUFDVixJQUFJO1FBQ0osSUFBSTtRQUNKLEtBQUs7UUFDTCxLQUFLO1FBQ0wsVUFBVTtRQUNWLGlCQUFpQjtRQUNqQixpQkFBaUI7UUFDakIsa0JBQWtCO1FBQ2xCLGNBQWM7S0FDZCxDQUFDO0lBQ0YsaUJBQWlCLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0lBQzVCLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRS9FLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRUQsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQzlELElBQUksaUJBQW9DLENBQUM7SUFDekMsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLGtCQUEyQyxDQUFDO0lBQ2hELElBQUksb0JBQThDLENBQUM7SUFFbkQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM3RSxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNyRixvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN2RSxrQkFBa0IsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUNsRixNQUFNLFlBQVksR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDNUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzNELFlBQVksQ0FBQyxZQUFZLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBWSxFQUFFLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQSxDQUFDO1FBQ3ZILFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxxQkFBcUIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUM7UUFDcEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDbkQsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0Usb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdkUsaUJBQWlCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDL0YsY0FBYyxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDakMsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdkUsaUJBQWlCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDL0YsY0FBYyxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2RCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=