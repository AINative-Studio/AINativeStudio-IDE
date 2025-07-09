/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { NotebookEditorWidgetService } from '../../browser/services/notebookEditorServiceImpl.js';
import { NotebookEditorInput } from '../../common/notebookEditorInput.js';
import { setupInstantiationService } from './testNotebookEditor.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
let TestNotebookEditorWidgetService = class TestNotebookEditorWidgetService extends NotebookEditorWidgetService {
    constructor(editorGroupService, editorService, contextKeyService, instantiationService) {
        super(editorGroupService, editorService, contextKeyService, instantiationService);
    }
    createWidget() {
        return new class extends mock() {
            constructor() {
                super(...arguments);
                this.onWillHide = () => { };
                this.getDomNode = () => { return { remove: () => { } }; };
                this.dispose = () => { };
            }
        };
    }
};
TestNotebookEditorWidgetService = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IEditorService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService)
], TestNotebookEditorWidgetService);
function createNotebookInput(path, editorType) {
    return new class extends mock() {
        constructor() {
            super(...arguments);
            this.resource = URI.parse(path);
        }
        get typeId() { return editorType; }
    };
}
suite('NotebookEditorWidgetService', () => {
    let disposables;
    let instantiationService;
    let editorGroup1;
    let editorGroup2;
    let ondidRemoveGroup;
    let onDidCloseEditor;
    let onWillMoveEditor;
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        ondidRemoveGroup = new Emitter();
        onDidCloseEditor = new Emitter();
        onWillMoveEditor = new Emitter();
        editorGroup1 = new class extends mock() {
            constructor() {
                super(...arguments);
                this.id = 1;
                this.onDidCloseEditor = onDidCloseEditor.event;
                this.onWillMoveEditor = onWillMoveEditor.event;
            }
        };
        editorGroup2 = new class extends mock() {
            constructor() {
                super(...arguments);
                this.id = 2;
                this.onDidCloseEditor = Event.None;
                this.onWillMoveEditor = Event.None;
            }
        };
        instantiationService = setupInstantiationService(disposables);
        instantiationService.stub(IEditorGroupsService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidRemoveGroup = ondidRemoveGroup.event;
                this.onDidAddGroup = Event.None;
                this.whenReady = Promise.resolve();
                this.groups = [editorGroup1, editorGroup2];
            }
            getPart(container) {
                return { windowId: 0 };
            }
        });
        instantiationService.stub(IEditorService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidEditorsChange = Event.None;
            }
        });
    });
    test('Retrieve widget within group', async function () {
        const notebookEditorInput = createNotebookInput('/test.np', 'type1');
        const notebookEditorService = disposables.add(instantiationService.createInstance(TestNotebookEditorWidgetService));
        const widget = notebookEditorService.retrieveWidget(instantiationService, 1, notebookEditorInput);
        const value = widget.value;
        const widget2 = notebookEditorService.retrieveWidget(instantiationService, 1, notebookEditorInput);
        assert.notStrictEqual(widget2.value, undefined, 'should create a widget');
        assert.strictEqual(value, widget2.value, 'should return the same widget');
        assert.strictEqual(widget.value, undefined, 'initial borrow should no longer have widget');
    });
    test('Retrieve independent widgets', async function () {
        const inputType1 = createNotebookInput('/test.np', 'type1');
        const inputType2 = createNotebookInput('/test.np', 'type2');
        const notebookEditorService = disposables.add(instantiationService.createInstance(TestNotebookEditorWidgetService));
        const widget = notebookEditorService.retrieveWidget(instantiationService, 1, inputType1);
        const widgetDiffGroup = notebookEditorService.retrieveWidget(instantiationService, 2, inputType1);
        const widgetDiffType = notebookEditorService.retrieveWidget(instantiationService, 1, inputType2);
        assert.notStrictEqual(widget.value, undefined, 'should create a widget');
        assert.notStrictEqual(widgetDiffGroup.value, undefined, 'should create a widget');
        assert.notStrictEqual(widgetDiffType.value, undefined, 'should create a widget');
        assert.notStrictEqual(widget.value, widgetDiffGroup.value, 'should return a different widget');
        assert.notStrictEqual(widget.value, widgetDiffType.value, 'should return a different widget');
    });
    test('Only relevant widgets get disposed', async function () {
        const inputType1 = createNotebookInput('/test.np', 'type1');
        const inputType2 = createNotebookInput('/test.np', 'type2');
        const notebookEditorService = disposables.add(instantiationService.createInstance(TestNotebookEditorWidgetService));
        const widget = notebookEditorService.retrieveWidget(instantiationService, 1, inputType1);
        const widgetDiffType = notebookEditorService.retrieveWidget(instantiationService, 1, inputType2);
        const widgetDiffGroup = notebookEditorService.retrieveWidget(instantiationService, 2, inputType1);
        ondidRemoveGroup.fire(editorGroup1);
        assert.strictEqual(widget.value, undefined, 'widgets in group should get disposed');
        assert.strictEqual(widgetDiffType.value, undefined, 'widgets in group should get disposed');
        assert.notStrictEqual(widgetDiffGroup.value, undefined, 'other group should not be disposed');
        notebookEditorService.dispose();
    });
    test('Widget should move between groups when editor is moved', async function () {
        const inputType1 = createNotebookInput('/test.np', NotebookEditorInput.ID);
        const notebookEditorService = disposables.add(instantiationService.createInstance(TestNotebookEditorWidgetService));
        const initialValue = notebookEditorService.retrieveWidget(instantiationService, 1, inputType1).value;
        await new Promise(resolve => setTimeout(resolve, 0));
        onWillMoveEditor.fire({
            editor: inputType1,
            groupId: 1,
            target: 2,
        });
        const widgetDiffGroup = notebookEditorService.retrieveWidget(instantiationService, 2, inputType1);
        const widgetFirstGroup = notebookEditorService.retrieveWidget(instantiationService, 1, inputType1);
        assert.notStrictEqual(initialValue, undefined, 'valid widget');
        assert.strictEqual(widgetDiffGroup.value, initialValue, 'widget should be reused in new group');
        assert.notStrictEqual(widgetFirstGroup.value, initialValue, 'should create a new widget in the first group');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTm90ZWJvb2tFZGl0b3JXaWRnZXRTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL05vdGVib29rRWRpdG9yV2lkZ2V0U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBSXRHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BFLE9BQU8sRUFBZ0Isb0JBQW9CLEVBQWUsTUFBTSwyREFBMkQsQ0FBQztBQUM1SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFckYsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBZ0MsU0FBUSwyQkFBMkI7SUFDeEUsWUFDdUIsa0JBQXdDLEVBQzlDLGFBQTZCLEVBQ3pCLGlCQUFxQyxFQUNsQyxvQkFBMkM7UUFFbEUsS0FBSyxDQUFDLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFFa0IsWUFBWTtRQUM5QixPQUFPLElBQUksS0FBTSxTQUFRLElBQUksRUFBd0I7WUFBMUM7O2dCQUNELGVBQVUsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZCLGVBQVUsR0FBRyxHQUFHLEVBQUUsR0FBRyxPQUFPLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxZQUFPLEdBQUcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlCLENBQUM7U0FBQSxDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUFqQkssK0JBQStCO0lBRWxDLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7R0FMbEIsK0JBQStCLENBaUJwQztBQUVELFNBQVMsbUJBQW1CLENBQUMsSUFBWSxFQUFFLFVBQWtCO0lBQzVELE9BQU8sSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUF1QjtRQUF6Qzs7WUFDRCxhQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyQyxDQUFDO1FBREEsSUFBYSxNQUFNLEtBQUssT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDO0tBQzVDLENBQUM7QUFDSCxDQUFDO0FBRUQsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxJQUFJLFdBQTRCLENBQUM7SUFDakMsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLFlBQTBCLENBQUM7SUFDL0IsSUFBSSxZQUEwQixDQUFDO0lBRS9CLElBQUksZ0JBQXVDLENBQUM7SUFDNUMsSUFBSSxnQkFBNEMsQ0FBQztJQUNqRCxJQUFJLGdCQUErQyxDQUFDO0lBQ3BELFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUV0Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVwQyxnQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBZ0IsQ0FBQztRQUMvQyxnQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBcUIsQ0FBQztRQUNwRCxnQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBd0IsQ0FBQztRQUV2RCxZQUFZLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUFnQjtZQUFsQzs7Z0JBQ1QsT0FBRSxHQUFHLENBQUMsQ0FBQztnQkFDUCxxQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7Z0JBQzFDLHFCQUFnQixHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQztZQUNwRCxDQUFDO1NBQUEsQ0FBQztRQUNGLFlBQVksR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQWdCO1lBQWxDOztnQkFDVCxPQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNQLHFCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQzlCLHFCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDeEMsQ0FBQztTQUFBLENBQUM7UUFFRixvQkFBb0IsR0FBRyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUF3QjtZQUExQzs7Z0JBQzFDLHFCQUFnQixHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQztnQkFDMUMsa0JBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUMzQixjQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixXQUFNLEdBQUcsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFNaEQsQ0FBQztZQUhTLE9BQU8sQ0FBQyxTQUFrQjtnQkFDbEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQVMsQ0FBQztZQUMvQixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBQ0gsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQWtCO1lBQXBDOztnQkFDcEMsdUJBQWtCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztZQUMxQyxDQUFDO1NBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSztRQUN6QyxNQUFNLG1CQUFtQixHQUFHLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRSxNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQztRQUNwSCxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDbEcsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUMzQixNQUFNLE9BQU8sR0FBRyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFFbkcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsK0JBQStCLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLDZDQUE2QyxDQUFDLENBQUM7SUFDNUYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSztRQUN6QyxNQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDNUQsTUFBTSxVQUFVLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzVELE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDO1FBQ3BILE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDekYsTUFBTSxlQUFlLEdBQUcscUJBQXFCLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsRyxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWpHLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUN6RSxNQUFNLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDbEYsTUFBTSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2pGLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsS0FBSyxFQUFFLGtDQUFrQyxDQUFDLENBQUM7UUFDL0YsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLLEVBQUUsa0NBQWtDLENBQUMsQ0FBQztJQUMvRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLO1FBQy9DLE1BQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM1RCxNQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDNUQsTUFBTSxxQkFBcUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUM7UUFDcEgsTUFBTSxNQUFNLEdBQUcscUJBQXFCLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN6RixNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2pHLE1BQU0sZUFBZSxHQUFHLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFbEcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXBDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztRQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLHNDQUFzQyxDQUFDLENBQUM7UUFDNUYsTUFBTSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDO1FBRTlGLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEtBQUs7UUFDbkUsTUFBTSxVQUFVLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxFQUFFLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDO1FBQ3BILE1BQU0sWUFBWSxHQUFHLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDO1FBRXJHLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO1lBQ3JCLE1BQU0sRUFBRSxVQUFVO1lBQ2xCLE9BQU8sRUFBRSxDQUFDO1lBQ1YsTUFBTSxFQUFFLENBQUM7U0FDVCxDQUFDLENBQUM7UUFFSCxNQUFNLGVBQWUsR0FBRyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2xHLE1BQU0sZ0JBQWdCLEdBQUcscUJBQXFCLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVuRyxNQUFNLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSwrQ0FBK0MsQ0FBQyxDQUFDO0lBQzlHLENBQUMsQ0FBQyxDQUFDO0FBRUosQ0FBQyxDQUFDLENBQUMifQ==