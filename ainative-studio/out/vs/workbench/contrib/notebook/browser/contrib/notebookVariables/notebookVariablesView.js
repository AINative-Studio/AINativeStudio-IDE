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
var NotebookVariablesView_1;
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import * as nls from '../../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree } from '../../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../../../common/views.js';
import { CONTEXT_VARIABLE_EXTENSIONID, CONTEXT_VARIABLE_INTERFACES, CONTEXT_VARIABLE_LANGUAGE, CONTEXT_VARIABLE_NAME, CONTEXT_VARIABLE_TYPE, CONTEXT_VARIABLE_VALUE } from '../../../../debug/common/debug.js';
import { NotebookVariableDataSource } from './notebookVariablesDataSource.js';
import { NotebookVariableAccessibilityProvider, NotebookVariableRenderer, NotebookVariablesDelegate } from './notebookVariablesTree.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { isCompositeNotebookEditorInput } from '../../../common/notebookEditorInput.js';
let NotebookVariablesView = class NotebookVariablesView extends ViewPane {
    static { NotebookVariablesView_1 = this; }
    static { this.ID = 'notebookVariablesView'; }
    static { this.NOTEBOOK_TITLE = nls.localize2('notebook.notebookVariables', "Notebook Variables"); }
    static { this.REPL_TITLE = nls.localize2('notebook.ReplVariables', "REPL Variables"); }
    constructor(options, editorService, notebookKernelService, notebookExecutionStateService, keybindingService, contextMenuService, contextKeyService, configurationService, instantiationService, viewDescriptorService, openerService, quickInputService, commandService, themeService, hoverService, menuService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorService = editorService;
        this.notebookKernelService = notebookKernelService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.menuService = menuService;
        this._register(this.editorService.onDidActiveEditorChange(() => this.handleActiveEditorChange()));
        this._register(this.notebookKernelService.onDidNotebookVariablesUpdate(this.handleVariablesChanged.bind(this)));
        this._register(this.notebookExecutionStateService.onDidChangeExecution(this.handleExecutionStateChange.bind(this)));
        this._register(this.editorService.onDidCloseEditor((e) => this.handleCloseEditor(e)));
        this.handleActiveEditorChange(false);
        this.dataSource = new NotebookVariableDataSource(this.notebookKernelService);
        this.updateScheduler = new RunOnceScheduler(() => this.tree?.updateChildren(), 100);
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'notebookVariablesTree', container, new NotebookVariablesDelegate(), [this.instantiationService.createInstance(NotebookVariableRenderer)], this.dataSource, {
            accessibilityProvider: new NotebookVariableAccessibilityProvider(),
            identityProvider: { getId: (e) => e.id },
        });
        this.tree.layout();
        if (this.activeNotebook) {
            this.tree.setInput({ kind: 'root', notebook: this.activeNotebook });
        }
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
    }
    onContextMenu(e) {
        if (!e.element) {
            return;
        }
        const element = e.element;
        const arg = {
            source: element.notebook.uri.toString(),
            name: element.name,
            value: element.value,
            type: element.type,
            expression: element.expression,
            language: element.language,
            extensionId: element.extensionId
        };
        const overlayedContext = this.contextKeyService.createOverlay([
            [CONTEXT_VARIABLE_NAME.key, element.name],
            [CONTEXT_VARIABLE_VALUE.key, element.value],
            [CONTEXT_VARIABLE_TYPE.key, element.type],
            [CONTEXT_VARIABLE_INTERFACES.key, element.interfaces],
            [CONTEXT_VARIABLE_LANGUAGE.key, element.language],
            [CONTEXT_VARIABLE_EXTENSIONID.key, element.extensionId]
        ]);
        const menuActions = this.menuService.getMenuActions(MenuId.NotebookVariablesContext, overlayedContext, { arg, shouldForwardArgs: true });
        const actions = getFlatContextMenuActions(menuActions);
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => actions
        });
    }
    focus() {
        super.focus();
        this.tree?.domFocus();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree?.layout(height, width);
    }
    setActiveNotebook(notebookDocument, editor, doUpdate = true) {
        this.activeNotebook = notebookDocument;
        if (isCompositeNotebookEditorInput(editor.input)) {
            this.updateTitle(NotebookVariablesView_1.REPL_TITLE.value);
        }
        else {
            this.updateTitle(NotebookVariablesView_1.NOTEBOOK_TITLE.value);
        }
        if (doUpdate) {
            this.tree?.setInput({ kind: 'root', notebook: notebookDocument });
            this.updateScheduler.schedule();
        }
    }
    getActiveNotebook() {
        const notebookEditor = this.editorService.activeEditorPane;
        const notebookDocument = getNotebookEditorFromEditorPane(notebookEditor)?.textModel;
        return notebookDocument && notebookEditor ? { notebookDocument, notebookEditor } : undefined;
    }
    handleCloseEditor(e) {
        if (e.editor.resource && e.editor.resource.toString() === this.activeNotebook?.uri.toString()) {
            this.tree?.setInput({ kind: 'empty' });
            this.updateScheduler.schedule();
        }
    }
    handleActiveEditorChange(doUpdate = true) {
        const found = this.getActiveNotebook();
        if (found && found.notebookDocument !== this.activeNotebook) {
            this.setActiveNotebook(found.notebookDocument, found.notebookEditor, doUpdate);
        }
    }
    handleExecutionStateChange(event) {
        if (this.activeNotebook && event.affectsNotebook(this.activeNotebook.uri)) {
            // new execution state means either new variables or the kernel is busy so we shouldn't ask
            this.dataSource.cancel();
            // changed === undefined -> excecution ended
            if (event.changed === undefined) {
                this.updateScheduler.schedule();
            }
            else {
                this.updateScheduler.cancel();
            }
        }
        else if (!this.getActiveNotebook()) {
            // check if the updated variables are for a visible notebook
            this.editorService.visibleEditorPanes.forEach(editor => {
                const notebookDocument = getNotebookEditorFromEditorPane(editor)?.textModel;
                if (notebookDocument && event.affectsNotebook(notebookDocument.uri)) {
                    this.setActiveNotebook(notebookDocument, editor);
                }
            });
        }
    }
    handleVariablesChanged(notebookUri) {
        if (this.activeNotebook && notebookUri.toString() === this.activeNotebook.uri.toString()) {
            this.updateScheduler.schedule();
        }
        else if (!this.getActiveNotebook()) {
            // check if the updated variables are for a visible notebook
            this.editorService.visibleEditorPanes.forEach(editor => {
                const notebookDocument = getNotebookEditorFromEditorPane(editor)?.textModel;
                if (notebookDocument && notebookDocument.uri.toString() === notebookUri.toString()) {
                    this.setActiveNotebook(notebookDocument, editor);
                }
            });
        }
    }
};
NotebookVariablesView = NotebookVariablesView_1 = __decorate([
    __param(1, IEditorService),
    __param(2, INotebookKernelService),
    __param(3, INotebookExecutionStateService),
    __param(4, IKeybindingService),
    __param(5, IContextMenuService),
    __param(6, IContextKeyService),
    __param(7, IConfigurationService),
    __param(8, IInstantiationService),
    __param(9, IViewDescriptorService),
    __param(10, IOpenerService),
    __param(11, IQuickInputService),
    __param(12, ICommandService),
    __param(13, IThemeService),
    __param(14, IHoverService),
    __param(15, IMenuService)
], NotebookVariablesView);
export { NotebookVariablesView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va1ZhcmlhYmxlcy9ub3RlYm9va1ZhcmlhYmxlc1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRTFFLE9BQU8sS0FBSyxHQUFHLE1BQU0sMEJBQTBCLENBQUM7QUFFaEQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDbEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FB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