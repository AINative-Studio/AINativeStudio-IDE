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
import * as DOM from '../../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { EditorExtensionsRegistry } from '../../../../../../editor/browser/editorExtensions.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { NotebookInlineDiffDecorationContribution } from './notebookInlineDiff.js';
import { NotebookEditorExtensionsRegistry } from '../../notebookEditorExtensions.js';
import { INotebookEditorService } from '../../services/notebookEditorService.js';
let NotebookInlineDiffWidget = class NotebookInlineDiffWidget extends Disposable {
    get editorWidget() {
        return this.widget.value;
    }
    constructor(rootElement, groupId, window, options, dimension, instantiationService, widgetService) {
        super();
        this.rootElement = rootElement;
        this.groupId = groupId;
        this.window = window;
        this.options = options;
        this.dimension = dimension;
        this.instantiationService = instantiationService;
        this.widgetService = widgetService;
        this.widget = { value: undefined };
    }
    async show(input, model, previousModel, options) {
        if (!this.widget.value) {
            this.createNotebookWidget(input, this.groupId, this.rootElement);
        }
        if (this.dimension) {
            this.widget.value?.layout(this.dimension, this.rootElement, this.position);
        }
        if (model) {
            await this.widget.value?.setOptions({ ...options });
            this.widget.value?.notebookOptions.previousModelToCompare.set(previousModel, undefined);
            await this.widget.value.setModel(model, options?.viewState);
        }
    }
    hide() {
        if (this.widget.value) {
            this.widget.value.notebookOptions.previousModelToCompare.set(undefined, undefined);
            this.widget.value.onWillHide();
        }
    }
    setLayout(dimension, position) {
        this.dimension = dimension;
        this.position = position;
    }
    createNotebookWidget(input, groupId, rootElement) {
        const contributions = NotebookEditorExtensionsRegistry.getSomeEditorContributions([NotebookInlineDiffDecorationContribution.ID]);
        const menuIds = {
            notebookToolbar: MenuId.NotebookToolbar,
            cellTitleToolbar: MenuId.NotebookCellTitle,
            cellDeleteToolbar: MenuId.NotebookCellDelete,
            cellInsertToolbar: MenuId.NotebookCellBetween,
            cellTopInsertToolbar: MenuId.NotebookCellListTop,
            cellExecuteToolbar: MenuId.NotebookCellExecute,
            cellExecutePrimary: undefined,
        };
        const skipContributions = [
            'editor.contrib.review',
            'editor.contrib.floatingClickMenu',
            'editor.contrib.dirtydiff',
            'editor.contrib.testingOutputPeek',
            'editor.contrib.testingDecorations',
            'store.contrib.stickyScrollController',
            'editor.contrib.findController',
            'editor.contrib.emptyTextEditorHint',
        ];
        const cellEditorContributions = EditorExtensionsRegistry.getEditorContributions().filter(c => skipContributions.indexOf(c.id) === -1);
        this.widget = this.instantiationService.invokeFunction(this.widgetService.retrieveWidget, groupId, input, { contributions, menuIds, cellEditorContributions, options: this.options }, this.dimension, this.window);
        if (this.rootElement && this.widget.value.getDomNode()) {
            this.rootElement.setAttribute('aria-flowto', this.widget.value.getDomNode().id || '');
            DOM.setParentFlowTo(this.widget.value.getDomNode(), this.rootElement);
        }
    }
    dispose() {
        super.dispose();
        if (this.widget.value) {
            this.widget.value.dispose();
        }
    }
};
NotebookInlineDiffWidget = __decorate([
    __param(5, IInstantiationService),
    __param(6, INotebookEditorService)
], NotebookInlineDiffWidget);
export { NotebookInlineDiffWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVEaWZmV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9pbmxpbmVEaWZmL25vdGVib29rSW5saW5lRGlmZldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFDO0FBRTdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFHekcsT0FBTyxFQUFFLHdDQUF3QyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFbkYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHckYsT0FBTyxFQUFnQixzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXhGLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQUt2RCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQzFCLENBQUM7SUFFRCxZQUNrQixXQUF3QixFQUN4QixPQUFlLEVBQ2YsTUFBa0IsRUFDbEIsT0FBd0IsRUFDakMsU0FBb0MsRUFDckIsb0JBQTRELEVBQzNELGFBQXNEO1FBQzlFLEtBQUssRUFBRSxDQUFDO1FBUFMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLFdBQU0sR0FBTixNQUFNLENBQVk7UUFDbEIsWUFBTyxHQUFQLE9BQU8sQ0FBaUI7UUFDakMsY0FBUyxHQUFULFNBQVMsQ0FBMkI7UUFDSix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzFDLGtCQUFhLEdBQWIsYUFBYSxDQUF3QjtRQWR2RSxXQUFNLEdBQXVDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDO0lBZ0IxRSxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUE4QixFQUFFLEtBQW9DLEVBQUUsYUFBNEMsRUFBRSxPQUEyQztRQUN6SyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBRUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEVBQUUsR0FBRyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRXhGLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ25GLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxDQUFDLFNBQXdCLEVBQUUsUUFBMEI7UUFDN0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDMUIsQ0FBQztJQUVPLG9CQUFvQixDQUFDLEtBQThCLEVBQUUsT0FBZSxFQUFFLFdBQW9DO1FBQ2pILE1BQU0sYUFBYSxHQUFHLGdDQUFnQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsd0NBQXdDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqSSxNQUFNLE9BQU8sR0FBRztZQUNmLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZTtZQUN2QyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsaUJBQWlCO1lBQzFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7WUFDNUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtZQUM3QyxvQkFBb0IsRUFBRSxNQUFNLENBQUMsbUJBQW1CO1lBQ2hELGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7WUFDOUMsa0JBQWtCLEVBQUUsU0FBUztTQUM3QixDQUFDO1FBQ0YsTUFBTSxpQkFBaUIsR0FBRztZQUN6Qix1QkFBdUI7WUFDdkIsa0NBQWtDO1lBQ2xDLDBCQUEwQjtZQUMxQixrQ0FBa0M7WUFDbEMsbUNBQW1DO1lBQ25DLHNDQUFzQztZQUN0QywrQkFBK0I7WUFDL0Isb0NBQW9DO1NBQ3BDLENBQUM7UUFDRixNQUFNLHVCQUF1QixHQUFHLHdCQUF3QixDQUFDLHNCQUFzQixFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRJLElBQUksQ0FBQyxNQUFNLEdBQXVDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQzNILE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUgsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDekQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN2RixHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN4RSxDQUFDO0lBQ0YsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXRGWSx3QkFBd0I7SUFlbEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHNCQUFzQixDQUFBO0dBaEJaLHdCQUF3QixDQXNGcEMifQ==