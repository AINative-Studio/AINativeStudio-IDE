/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { workbenchInstantiationService, TestServiceAccessor, registerTestFileEditor, createEditorPart } from '../../workbenchTestServices.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { isEditorPaneWithSelection } from '../../../../common/editor.js';
import { DeferredPromise } from '../../../../../base/common/async.js';
import { TextEditorPaneSelection } from '../../../../browser/parts/editor/textEditor.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
suite('TextEditorPane', () => {
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestFileEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    async function createServices() {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        return instantiationService.createInstance(TestServiceAccessor);
    }
    test('editor pane selection', async function () {
        const accessor = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        let pane = await accessor.editorService.openEditor({ resource });
        assert.ok(pane && isEditorPaneWithSelection(pane));
        const onDidFireSelectionEventOfEditType = new DeferredPromise();
        disposables.add(pane.onDidChangeSelection(e => {
            if (e.reason === 3 /* EditorPaneSelectionChangeReason.EDIT */) {
                onDidFireSelectionEventOfEditType.complete(e);
            }
        }));
        // Changing model reports selection change
        // of EDIT kind
        const model = disposables.add(await accessor.textFileService.files.resolve(resource));
        model.textEditorModel.setValue('Hello World');
        const event = await onDidFireSelectionEventOfEditType.p;
        assert.strictEqual(event.reason, 3 /* EditorPaneSelectionChangeReason.EDIT */);
        // getSelection() works and can be restored
        //
        // Note: this is a bit bogus because in tests our code editors have
        //       no view and no cursor can be set as such. So the selection
        //       will always report for the first line and column.
        pane.setSelection(new Selection(1, 1, 1, 1), 2 /* EditorPaneSelectionChangeReason.USER */);
        const selection = pane.getSelection();
        assert.ok(selection);
        await pane.group.closeAllEditors();
        const options = selection.restore({});
        pane = await accessor.editorService.openEditor({ resource, options });
        assert.ok(pane && isEditorPaneWithSelection(pane));
        const newSelection = pane.getSelection();
        assert.ok(newSelection);
        assert.strictEqual(newSelection.compare(selection), 1 /* EditorPaneSelectionCompareResult.IDENTICAL */);
        await model.revert();
        await pane.group.closeAllEditors();
    });
    test('TextEditorPaneSelection', function () {
        const sel1 = new TextEditorPaneSelection(new Selection(1, 1, 2, 2));
        const sel2 = new TextEditorPaneSelection(new Selection(5, 5, 6, 6));
        const sel3 = new TextEditorPaneSelection(new Selection(50, 50, 60, 60));
        const sel4 = { compare: () => { throw new Error(); }, restore: (options) => options };
        assert.strictEqual(sel1.compare(sel1), 1 /* EditorPaneSelectionCompareResult.IDENTICAL */);
        assert.strictEqual(sel1.compare(sel2), 2 /* EditorPaneSelectionCompareResult.SIMILAR */);
        assert.strictEqual(sel1.compare(sel3), 3 /* EditorPaneSelectionCompareResult.DIFFERENT */);
        assert.strictEqual(sel1.compare(sel4), 3 /* EditorPaneSelectionCompareResult.DIFFERENT */);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvclBhbmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci90ZXh0RWRpdG9yUGFuZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBc0IsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVsSyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBc0cseUJBQXlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM3SyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRzNFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFFNUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxD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