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
import { ActionViewItem } from '../../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Action } from '../../../../../base/common/actions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { NOTEBOOK_ACTIONS_CATEGORY, SELECT_KERNEL_ID } from '../controller/coreActions.js';
import { getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
import { selectKernelIcon } from '../notebookIcons.js';
import { KernelPickerMRUStrategy } from './notebookKernelQuickPickStrategy.js';
import { NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_KERNEL_COUNT } from '../../common/notebookContextKeys.js';
import { INotebookKernelHistoryService, INotebookKernelService } from '../../common/notebookKernelService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
function getEditorFromContext(editorService, context) {
    let editor;
    if (context !== undefined && 'notebookEditorId' in context) {
        const editorId = context.notebookEditorId;
        const matchingEditor = editorService.visibleEditorPanes.find((editorPane) => {
            const notebookEditor = getNotebookEditorFromEditorPane(editorPane);
            return notebookEditor?.getId() === editorId;
        });
        editor = getNotebookEditorFromEditorPane(matchingEditor);
    }
    else if (context !== undefined && 'notebookEditor' in context) {
        editor = context?.notebookEditor;
    }
    else {
        editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    }
    return editor;
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SELECT_KERNEL_ID,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            title: localize2('notebookActions.selectKernel', 'Select Notebook Kernel'),
            icon: selectKernelIcon,
            f1: true,
            precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
            menu: [{
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                    group: 'navigation',
                    order: -10
                }, {
                    id: MenuId.NotebookToolbar,
                    when: ContextKeyExpr.equals('config.notebook.globalToolbar', true),
                    group: 'status',
                    order: -10
                }, {
                    id: MenuId.InteractiveToolbar,
                    when: NOTEBOOK_KERNEL_COUNT.notEqualsTo(0),
                    group: 'status',
                    order: -10
                }],
            metadata: {
                description: localize('notebookActions.selectKernel.args', "Notebook Kernel Args"),
                args: [
                    {
                        name: 'kernelInfo',
                        description: 'The kernel info',
                        schema: {
                            'type': 'object',
                            'required': ['id', 'extension'],
                            'properties': {
                                'id': {
                                    'type': 'string'
                                },
                                'extension': {
                                    'type': 'string'
                                },
                                'notebookEditorId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                ]
            },
        });
    }
    async run(accessor, context) {
        const instantiationService = accessor.get(IInstantiationService);
        const editorService = accessor.get(IEditorService);
        const editor = getEditorFromContext(editorService, context);
        if (!editor || !editor.hasModel()) {
            return false;
        }
        let controllerId = context && 'id' in context ? context.id : undefined;
        let extensionId = context && 'extension' in context ? context.extension : undefined;
        if (controllerId && (typeof controllerId !== 'string' || typeof extensionId !== 'string')) {
            // validate context: id & extension MUST be strings
            controllerId = undefined;
            extensionId = undefined;
        }
        const notebook = editor.textModel;
        const notebookKernelService = accessor.get(INotebookKernelService);
        const matchResult = notebookKernelService.getMatchingKernel(notebook);
        const { selected } = matchResult;
        if (selected && controllerId && selected.id === controllerId && ExtensionIdentifier.equals(selected.extension, extensionId)) {
            // current kernel is wanted kernel -> done
            return true;
        }
        const wantedKernelId = controllerId ? `${extensionId}/${controllerId}` : undefined;
        const strategy = instantiationService.createInstance(KernelPickerMRUStrategy);
        return strategy.showQuickPick(editor, wantedKernelId);
    }
});
let NotebooKernelActionViewItem = class NotebooKernelActionViewItem extends ActionViewItem {
    constructor(actualAction, _editor, options, _notebookKernelService, _notebookKernelHistoryService) {
        const action = new Action('fakeAction', undefined, ThemeIcon.asClassName(selectKernelIcon), true, (event) => actualAction.run(event));
        super(undefined, action, { ...options, label: false, icon: true });
        this._editor = _editor;
        this._notebookKernelService = _notebookKernelService;
        this._notebookKernelHistoryService = _notebookKernelHistoryService;
        this._register(action);
        this._register(_editor.onDidChangeModel(this._update, this));
        this._register(_notebookKernelService.onDidAddKernel(this._update, this));
        this._register(_notebookKernelService.onDidRemoveKernel(this._update, this));
        this._register(_notebookKernelService.onDidChangeNotebookAffinity(this._update, this));
        this._register(_notebookKernelService.onDidChangeSelectedNotebooks(this._update, this));
        this._register(_notebookKernelService.onDidChangeSourceActions(this._update, this));
        this._register(_notebookKernelService.onDidChangeKernelDetectionTasks(this._update, this));
    }
    render(container) {
        this._update();
        super.render(container);
        container.classList.add('kernel-action-view-item');
        this._kernelLabel = document.createElement('a');
        container.appendChild(this._kernelLabel);
        this.updateLabel();
    }
    updateLabel() {
        if (this._kernelLabel) {
            this._kernelLabel.classList.add('kernel-label');
            this._kernelLabel.innerText = this._action.label;
        }
    }
    _update() {
        const notebook = this._editor.textModel;
        if (!notebook) {
            this._resetAction();
            return;
        }
        KernelPickerMRUStrategy.updateKernelStatusAction(notebook, this._action, this._notebookKernelService, this._notebookKernelHistoryService);
        this.updateClass();
    }
    _resetAction() {
        this._action.enabled = false;
        this._action.label = '';
        this._action.class = '';
    }
};
NotebooKernelActionViewItem = __decorate([
    __param(3, INotebookKernelService),
    __param(4, INotebookKernelHistoryService)
], NotebooKernelActionViewItem);
export { NotebooKernelActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld1BhcnRzL25vdGVib29rS2VybmVsVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUEwQixNQUFNLDZEQUE2RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSx1Q0FBdUMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQXNCLE1BQU0seURBQXlELENBQUM7QUFDN0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRixPQUFPLEVBQUUsK0JBQStCLEVBQW1CLE1BQU0sdUJBQXVCLENBQUM7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUEwQixNQUFNLHNDQUFzQyxDQUFDO0FBRXZHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVyRixTQUFTLG9CQUFvQixDQUFDLGFBQTZCLEVBQUUsT0FBZ0M7SUFDNUYsSUFBSSxNQUFtQyxDQUFDO0lBQ3hDLElBQUksT0FBTyxLQUFLLFNBQVMsSUFBSSxrQkFBa0IsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM1RCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7UUFDMUMsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQzNFLE1BQU0sY0FBYyxHQUFHLCtCQUErQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ25FLE9BQU8sY0FBYyxFQUFFLEtBQUssRUFBRSxLQUFLLFFBQVEsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sR0FBRywrQkFBK0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMxRCxDQUFDO1NBQU0sSUFBSSxPQUFPLEtBQUssU0FBUyxJQUFJLGdCQUFnQixJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2pFLE1BQU0sR0FBRyxPQUFPLEVBQUUsY0FBYyxDQUFDO0lBQ2xDLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxHQUFHLCtCQUErQixDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsZ0JBQWdCO1lBQ3BCLFFBQVEsRUFBRSx5QkFBeUI7WUFDbkMsS0FBSyxFQUFFLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRSx3QkFBd0IsQ0FBQztZQUMxRSxJQUFJLEVBQUUsZ0JBQWdCO1lBQ3RCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLHlCQUF5QjtZQUN2QyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7b0JBQ3RCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2Qix5QkFBeUIsRUFDekIsY0FBYyxDQUFDLFNBQVMsQ0FBQywrQkFBK0IsRUFBRSxJQUFJLENBQUMsQ0FDL0Q7b0JBQ0QsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxDQUFDLEVBQUU7aUJBQ1YsRUFBRTtvQkFDRixFQUFFLEVBQUUsTUFBTSxDQUFDLGVBQWU7b0JBQzFCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQztvQkFDbEUsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUMsRUFBRTtpQkFDVixFQUFFO29CQUNGLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QixJQUFJLEVBQUUscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDMUMsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUMsRUFBRTtpQkFDVixDQUFDO1lBQ0YsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxRQUFRLENBQUMsbUNBQW1DLEVBQUUsc0JBQXNCLENBQUM7Z0JBQ2xGLElBQUksRUFBRTtvQkFDTDt3QkFDQyxJQUFJLEVBQUUsWUFBWTt3QkFDbEIsV0FBVyxFQUFFLGlCQUFpQjt3QkFDOUIsTUFBTSxFQUFFOzRCQUNQLE1BQU0sRUFBRSxRQUFROzRCQUNoQixVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDOzRCQUMvQixZQUFZLEVBQUU7Z0NBQ2IsSUFBSSxFQUFFO29DQUNMLE1BQU0sRUFBRSxRQUFRO2lDQUNoQjtnQ0FDRCxXQUFXLEVBQUU7b0NBQ1osTUFBTSxFQUFFLFFBQVE7aUNBQ2hCO2dDQUNELGtCQUFrQixFQUFFO29DQUNuQixNQUFNLEVBQUUsUUFBUTtpQ0FDaEI7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsT0FBZ0M7UUFDckUsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDakUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVuRCxNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFNUQsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ25DLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksWUFBWSxHQUFHLE9BQU8sSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDdkUsSUFBSSxXQUFXLEdBQUcsT0FBTyxJQUFJLFdBQVcsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUVwRixJQUFJLFlBQVksSUFBSSxDQUFDLE9BQU8sWUFBWSxLQUFLLFFBQVEsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzNGLG1EQUFtRDtZQUNuRCxZQUFZLEdBQUcsU0FBUyxDQUFDO1lBQ3pCLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDekIsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDbEMsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbkUsTUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLFdBQVcsQ0FBQztRQUVqQyxJQUFJLFFBQVEsSUFBSSxZQUFZLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxZQUFZLElBQUksbUJBQW1CLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUM3SCwwQ0FBMEM7WUFDMUMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsSUFBSSxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ25GLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzlFLE9BQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDdkQsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVJLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsY0FBYztJQUk5RCxZQUNDLFlBQXFCLEVBQ0osT0FBb0osRUFDckssT0FBK0IsRUFDVSxzQkFBOEMsRUFDdkMsNkJBQTREO1FBRTVHLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3RJLEtBQUssQ0FDSixTQUFTLEVBQ1QsTUFBTSxFQUNOLEVBQUUsR0FBRyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQ3hDLENBQUM7UUFWZSxZQUFPLEdBQVAsT0FBTyxDQUE2STtRQUU1SCwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQ3ZDLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBK0I7UUFRNUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFFLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdFLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzVGLENBQUM7SUFFUSxNQUFNLENBQUMsU0FBc0I7UUFDckMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QixTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoRCxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVrQixXQUFXO1FBQzdCLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUVTLE9BQU87UUFDaEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFFeEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3BCLE9BQU87UUFDUixDQUFDO1FBRUQsdUJBQXVCLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBRTFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBRU8sWUFBWTtRQUNuQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUN6QixDQUFDO0NBQ0QsQ0FBQTtBQTdEWSwyQkFBMkI7SUFRckMsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLDZCQUE2QixDQUFBO0dBVG5CLDJCQUEyQixDQTZEdkMifQ==