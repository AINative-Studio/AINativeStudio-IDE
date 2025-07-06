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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVEaWZmV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvaW5saW5lRGlmZi9ub3RlYm9va0lubGluZURpZmZXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBR3pHLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRW5GLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR3JGLE9BQU8sRUFBZ0Isc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV4RixJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFLdkQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUMxQixDQUFDO0lBRUQsWUFDa0IsV0FBd0IsRUFDeEIsT0FBZSxFQUNmLE1BQWtCLEVBQ2xCLE9BQXdCLEVBQ2pDLFNBQW9DLEVBQ3JCLG9CQUE0RCxFQUMzRCxhQUFzRDtRQUM5RSxLQUFLLEVBQUUsQ0FBQztRQVBTLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hCLFlBQU8sR0FBUCxPQUFPLENBQVE7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