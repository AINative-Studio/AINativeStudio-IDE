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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import * as nls from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions, IViewDescriptorService } from '../../../../../common/views.js';
import { VIEWLET_ID as debugContainerId } from '../../../../debug/common/debug.js';
import { NOTEBOOK_VARIABLE_VIEW_ENABLED } from './notebookVariableContextKeys.js';
import { NotebookVariablesView } from './notebookVariablesView.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { variablesViewIcon } from '../../notebookIcons.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { INotebookService } from '../../../common/notebookService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
let NotebookVariables = class NotebookVariables extends Disposable {
    constructor(contextKeyService, configurationService, editorService, notebookExecutionStateService, notebookKernelService, notebookDocumentService, viewDescriptorService) {
        super();
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.notebookKernelService = notebookKernelService;
        this.notebookDocumentService = notebookDocumentService;
        this.viewDescriptorService = viewDescriptorService;
        this.listeners = [];
        this.initialized = false;
        this.viewEnabled = NOTEBOOK_VARIABLE_VIEW_ENABLED.bindTo(contextKeyService);
        this.listeners.push(this.editorService.onDidActiveEditorChange(() => this.handleInitEvent()));
        this.listeners.push(this.notebookExecutionStateService.onDidChangeExecution((e) => this.handleInitEvent(e.notebook)));
        this.configListener = configurationService.onDidChangeConfiguration((e) => this.handleConfigChange(e));
    }
    handleConfigChange(e) {
        if (e.affectsConfiguration(NotebookSetting.notebookVariablesView)) {
            this.handleInitEvent();
        }
    }
    handleInitEvent(notebook) {
        const enabled = this.editorService.activeEditorPane?.getId() === 'workbench.editor.repl' ||
            this.configurationService.getValue(NotebookSetting.notebookVariablesView) ||
            // old setting key
            this.configurationService.getValue('notebook.experimental.variablesView');
        if (enabled && (!!notebook || this.editorService.activeEditorPane?.getId() === 'workbench.editor.notebook')) {
            if (this.hasVariableProvider(notebook) && !this.initialized && this.initializeView()) {
                this.viewEnabled.set(true);
                this.initialized = true;
                this.listeners.forEach(listener => listener.dispose());
            }
        }
    }
    hasVariableProvider(notebookUri) {
        const notebook = notebookUri ?
            this.notebookDocumentService.getNotebookTextModel(notebookUri) :
            getNotebookEditorFromEditorPane(this.editorService.activeEditorPane)?.getViewModel()?.notebookDocument;
        return notebook && this.notebookKernelService.getMatchingKernel(notebook).selected?.hasVariableProvider;
    }
    initializeView() {
        const debugViewContainer = this.viewDescriptorService.getViewContainerById(debugContainerId);
        if (debugViewContainer) {
            const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
            const viewDescriptor = {
                id: 'workbench.notebook.variables', name: nls.localize2('notebookVariables', "Notebook Variables"),
                containerIcon: variablesViewIcon, ctorDescriptor: new SyncDescriptor(NotebookVariablesView),
                order: 50, weight: 5, canToggleVisibility: true, canMoveView: true, collapsed: false, when: NOTEBOOK_VARIABLE_VIEW_ENABLED
            };
            viewsRegistry.registerViews([viewDescriptor], debugViewContainer);
            return true;
        }
        return false;
    }
    dispose() {
        super.dispose();
        this.listeners.forEach(listener => listener.dispose());
        this.configListener.dispose();
    }
};
NotebookVariables = __decorate([
    __param(0, IContextKeyService),
    __param(1, IConfigurationService),
    __param(2, IEditorService),
    __param(3, INotebookExecutionStateService),
    __param(4, INotebookKernelService),
    __param(5, INotebookService),
    __param(6, IViewDescriptorService)
], NotebookVariables);
export { NotebookVariables };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL25vdGVib29rVmFyaWFibGVzL25vdGVib29rVmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVyRixPQUFPLEtBQUssR0FBRyxNQUFNLDBCQUEwQixDQUFDO0FBQ2hELE9BQU8sRUFBNkIscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNwSSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRWxGLE9BQU8sRUFBRSxVQUFVLEVBQUUsc0JBQXNCLEVBQWtCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEcsT0FBTyxFQUFFLFVBQVUsSUFBSSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ25FLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrREFBa0Qs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