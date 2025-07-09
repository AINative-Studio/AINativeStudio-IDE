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
var MarkupCellRenderer_1, CodeCellRenderer_1;
import { PixelRatio } from '../../../../../../base/browser/pixelRatio.js';
import * as DOM from '../../../../../../base/browser/dom.js';
import { FastDomNode } from '../../../../../../base/browser/fastDomNode.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { CodeEditorWidget } from '../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { BareFontInfo } from '../../../../../../editor/common/config/fontInfo.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../../editor/common/languages/modesRegistry.js';
import { localize } from '../../../../../../nls.js';
import { IMenuService } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { CellPartsCollection } from '../cellPart.js';
import { CellChatPart } from '../cellParts/chat/cellChatPart.js';
import { CellComments } from '../cellParts/cellComments.js';
import { CellContextKeyPart } from '../cellParts/cellContextKeys.js';
import { CellDecorations } from '../cellParts/cellDecorations.js';
import { CellDragAndDropPart } from '../cellParts/cellDnd.js';
import { CodeCellDragImageRenderer } from '../cellParts/cellDragRenderer.js';
import { CellEditorOptions } from '../cellParts/cellEditorOptions.js';
import { CellExecutionPart } from '../cellParts/cellExecution.js';
import { CellFocusPart } from '../cellParts/cellFocus.js';
import { CellFocusIndicator } from '../cellParts/cellFocusIndicator.js';
import { CellProgressBar } from '../cellParts/cellProgressBar.js';
import { CellEditorStatusBar } from '../cellParts/cellStatusPart.js';
import { BetweenCellToolbar, CellTitleToolbarPart } from '../cellParts/cellToolbars.js';
import { CodeCell } from '../cellParts/codeCell.js';
import { RunToolbar } from '../cellParts/codeCellRunToolbar.js';
import { CollapsedCellInput } from '../cellParts/collapsedCellInput.js';
import { CollapsedCellOutput } from '../cellParts/collapsedCellOutput.js';
import { FoldedCellHint } from '../cellParts/foldedCellHint.js';
import { MarkupCell } from '../cellParts/markupCell.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
const $ = DOM.$;
let NotebookCellListDelegate = class NotebookCellListDelegate extends Disposable {
    constructor(targetWindow, configurationService) {
        super();
        this.configurationService = configurationService;
        const editorOptions = this.configurationService.getValue('editor');
        this.lineHeight = BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(targetWindow).value).lineHeight;
    }
    getHeight(element) {
        return element.getHeight(this.lineHeight);
    }
    getDynamicHeight(element) {
        return element.getDynamicHeight();
    }
    getTemplateId(element) {
        if (element.cellKind === CellKind.Markup) {
            return MarkupCellRenderer.TEMPLATE_ID;
        }
        else {
            return CodeCellRenderer.TEMPLATE_ID;
        }
    }
};
NotebookCellListDelegate = __decorate([
    __param(1, IConfigurationService)
], NotebookCellListDelegate);
export { NotebookCellListDelegate };
class AbstractCellRenderer extends Disposable {
    constructor(instantiationService, notebookEditor, contextMenuService, menuService, configurationService, keybindingService, notificationService, contextKeyServiceProvider, language, dndController) {
        super();
        this.instantiationService = instantiationService;
        this.notebookEditor = notebookEditor;
        this.contextMenuService = contextMenuService;
        this.menuService = menuService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.contextKeyServiceProvider = contextKeyServiceProvider;
        this.dndController = dndController;
        this.editorOptions = this._register(new CellEditorOptions(this.notebookEditor.getBaseCellEditorOptions(language), this.notebookEditor.notebookOptions, configurationService));
    }
    dispose() {
        super.dispose();
        this.dndController = undefined;
    }
}
let MarkupCellRenderer = class MarkupCellRenderer extends AbstractCellRenderer {
    static { MarkupCellRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'markdown_cell'; }
    constructor(notebookEditor, dndController, renderedEditors, contextKeyServiceProvider, configurationService, instantiationService, contextMenuService, menuService, keybindingService, notificationService, notebookExecutionStateService) {
        super(instantiationService, notebookEditor, contextMenuService, menuService, configurationService, keybindingService, notificationService, contextKeyServiceProvider, 'markdown', dndController);
        this.renderedEditors = renderedEditors;
        this._notebookExecutionStateService = notebookExecutionStateService;
    }
    get templateId() {
        return MarkupCellRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(rootContainer) {
        rootContainer.classList.add('markdown-cell-row');
        const container = DOM.append(rootContainer, DOM.$('.cell-inner-container'));
        const templateDisposables = new DisposableStore();
        const contextKeyService = templateDisposables.add(this.contextKeyServiceProvider(container));
        const decorationContainer = DOM.append(rootContainer, $('.cell-decoration'));
        const titleToolbarContainer = DOM.append(container, $('.cell-title-toolbar'));
        const focusIndicatorTop = new FastDomNode(DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-top')));
        const focusIndicatorLeft = new FastDomNode(DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-left')));
        const foldingIndicator = DOM.append(focusIndicatorLeft.domNode, DOM.$('.notebook-folding-indicator'));
        const focusIndicatorRight = new FastDomNode(DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-right')));
        const codeInnerContent = DOM.append(container, $('.cell.code'));
        const editorPart = DOM.append(codeInnerContent, $('.cell-editor-part'));
        const cellChatPart = DOM.append(editorPart, $('.cell-chat-part'));
        const cellInputCollapsedContainer = DOM.append(codeInnerContent, $('.input-collapse-container'));
        cellInputCollapsedContainer.style.display = 'none';
        const editorContainer = DOM.append(editorPart, $('.cell-editor-container'));
        editorPart.style.display = 'none';
        const cellCommentPartContainer = DOM.append(container, $('.cell-comment-container'));
        const innerContent = DOM.append(container, $('.cell.markdown'));
        const bottomCellContainer = DOM.append(container, $('.cell-bottom-toolbar-container'));
        const scopedInstaService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const rootClassDelegate = {
            toggle: (className, force) => container.classList.toggle(className, force)
        };
        const titleToolbar = templateDisposables.add(scopedInstaService.createInstance(CellTitleToolbarPart, titleToolbarContainer, rootClassDelegate, this.notebookEditor.creationOptions.menuIds.cellTitleToolbar, this.notebookEditor.creationOptions.menuIds.cellDeleteToolbar, this.notebookEditor));
        const focusIndicatorBottom = new FastDomNode(DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-bottom')));
        const cellParts = new CellPartsCollection(DOM.getWindow(rootContainer), [
            templateDisposables.add(scopedInstaService.createInstance(CellChatPart, this.notebookEditor, cellChatPart)),
            templateDisposables.add(scopedInstaService.createInstance(CellEditorStatusBar, this.notebookEditor, container, editorPart, undefined)),
            templateDisposables.add(new CellFocusIndicator(this.notebookEditor, titleToolbar, focusIndicatorTop, focusIndicatorLeft, focusIndicatorRight, focusIndicatorBottom)),
            templateDisposables.add(new FoldedCellHint(this.notebookEditor, DOM.append(container, $('.notebook-folded-hint')), this._notebookExecutionStateService)),
            templateDisposables.add(new CellDecorations(this.notebookEditor, rootContainer, decorationContainer)),
            templateDisposables.add(scopedInstaService.createInstance(CellComments, this.notebookEditor, cellCommentPartContainer)),
            templateDisposables.add(new CollapsedCellInput(this.notebookEditor, cellInputCollapsedContainer)),
            templateDisposables.add(new CellFocusPart(container, undefined, this.notebookEditor)),
            templateDisposables.add(new CellDragAndDropPart(container)),
            templateDisposables.add(scopedInstaService.createInstance(CellContextKeyPart, this.notebookEditor)),
        ], [
            titleToolbar,
            templateDisposables.add(scopedInstaService.createInstance(BetweenCellToolbar, this.notebookEditor, titleToolbarContainer, bottomCellContainer))
        ]);
        templateDisposables.add(cellParts);
        const templateData = {
            rootContainer,
            cellInputCollapsedContainer,
            instantiationService: scopedInstaService,
            container,
            cellContainer: innerContent,
            editorPart,
            editorContainer,
            foldingIndicator,
            templateDisposables,
            elementDisposables: templateDisposables.add(new DisposableStore()),
            cellParts,
            toJSON: () => { return {}; }
        };
        return templateData;
    }
    renderElement(element, index, templateData, height) {
        if (!this.notebookEditor.hasModel()) {
            throw new Error('The notebook editor is not attached with view model yet.');
        }
        templateData.currentRenderedCell = element;
        templateData.currentEditor = undefined;
        templateData.editorPart.style.display = 'none';
        templateData.cellContainer.innerText = '';
        if (height === undefined) {
            return;
        }
        templateData.elementDisposables.add(templateData.instantiationService.createInstance(MarkupCell, this.notebookEditor, element, templateData, this.renderedEditors));
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    disposeElement(_element, _index, templateData) {
        templateData.elementDisposables.clear();
    }
};
MarkupCellRenderer = MarkupCellRenderer_1 = __decorate([
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IContextMenuService),
    __param(7, IMenuService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, INotebookExecutionStateService)
], MarkupCellRenderer);
export { MarkupCellRenderer };
let CodeCellRenderer = class CodeCellRenderer extends AbstractCellRenderer {
    static { CodeCellRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'code_cell'; }
    constructor(notebookEditor, renderedEditors, editorPool, dndController, contextKeyServiceProvider, configurationService, contextMenuService, menuService, instantiationService, keybindingService, notificationService) {
        super(instantiationService, notebookEditor, contextMenuService, menuService, configurationService, keybindingService, notificationService, contextKeyServiceProvider, PLAINTEXT_LANGUAGE_ID, dndController);
        this.renderedEditors = renderedEditors;
        this.editorPool = editorPool;
    }
    get templateId() {
        return CodeCellRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(rootContainer) {
        rootContainer.classList.add('code-cell-row');
        const container = DOM.append(rootContainer, DOM.$('.cell-inner-container'));
        const templateDisposables = new DisposableStore();
        const contextKeyService = templateDisposables.add(this.contextKeyServiceProvider(container));
        const decorationContainer = DOM.append(rootContainer, $('.cell-decoration'));
        const focusIndicatorTop = new FastDomNode(DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-top')));
        const titleToolbarContainer = DOM.append(container, $('.cell-title-toolbar'));
        // This is also the drag handle
        const focusIndicatorLeft = new FastDomNode(DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-left')));
        const cellChatPart = DOM.append(container, $('.cell-chat-part'));
        const cellContainer = DOM.append(container, $('.cell.code'));
        const runButtonContainer = DOM.append(cellContainer, $('.run-button-container'));
        const cellInputCollapsedContainer = DOM.append(cellContainer, $('.input-collapse-container'));
        cellInputCollapsedContainer.style.display = 'none';
        const executionOrderLabel = DOM.append(focusIndicatorLeft.domNode, $('div.execution-count-label'));
        executionOrderLabel.title = localize('cellExecutionOrderCountLabel', 'Execution Order');
        const editorPart = DOM.append(cellContainer, $('.cell-editor-part'));
        const editorContainer = DOM.append(editorPart, $('.cell-editor-container'));
        const cellCommentPartContainer = DOM.append(container, $('.cell-comment-container'));
        // create a special context key service that set the inCompositeEditor-contextkey
        const editorContextKeyService = templateDisposables.add(this.contextKeyServiceProvider(editorPart));
        const editorInstaService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, editorContextKeyService])));
        EditorContextKeys.inCompositeEditor.bindTo(editorContextKeyService).set(true);
        const editor = editorInstaService.createInstance(CodeEditorWidget, editorContainer, {
            ...this.editorOptions.getDefaultValue(),
            dimension: {
                width: 0,
                height: 0
            },
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'auto',
                handleMouseWheel: false,
                useShadows: false,
            },
        }, {
            contributions: this.notebookEditor.creationOptions.cellEditorContributions
        });
        templateDisposables.add(editor);
        const outputContainer = new FastDomNode(DOM.append(container, $('.output')));
        const cellOutputCollapsedContainer = DOM.append(outputContainer.domNode, $('.output-collapse-container'));
        const outputShowMoreContainer = new FastDomNode(DOM.append(container, $('.output-show-more-container')));
        const focusIndicatorRight = new FastDomNode(DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-right')));
        const focusSinkElement = DOM.append(container, $('.cell-editor-focus-sink'));
        focusSinkElement.setAttribute('tabindex', '0');
        const bottomCellToolbarContainer = DOM.append(container, $('.cell-bottom-toolbar-container'));
        const focusIndicatorBottom = new FastDomNode(DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-bottom')));
        const scopedInstaService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const rootClassDelegate = {
            toggle: (className, force) => container.classList.toggle(className, force)
        };
        const titleToolbar = templateDisposables.add(scopedInstaService.createInstance(CellTitleToolbarPart, titleToolbarContainer, rootClassDelegate, this.notebookEditor.creationOptions.menuIds.cellTitleToolbar, this.notebookEditor.creationOptions.menuIds.cellDeleteToolbar, this.notebookEditor));
        const focusIndicatorPart = templateDisposables.add(new CellFocusIndicator(this.notebookEditor, titleToolbar, focusIndicatorTop, focusIndicatorLeft, focusIndicatorRight, focusIndicatorBottom));
        const contentParts = [
            focusIndicatorPart,
            templateDisposables.add(scopedInstaService.createInstance(CellChatPart, this.notebookEditor, cellChatPart)),
            templateDisposables.add(scopedInstaService.createInstance(CellEditorStatusBar, this.notebookEditor, container, editorPart, editor)),
            templateDisposables.add(scopedInstaService.createInstance(CellProgressBar, editorPart, cellInputCollapsedContainer)),
            templateDisposables.add(new CellDecorations(this.notebookEditor, rootContainer, decorationContainer)),
            templateDisposables.add(scopedInstaService.createInstance(CellComments, this.notebookEditor, cellCommentPartContainer)),
            templateDisposables.add(scopedInstaService.createInstance(CellExecutionPart, this.notebookEditor, executionOrderLabel)),
            templateDisposables.add(scopedInstaService.createInstance(CollapsedCellOutput, this.notebookEditor, cellOutputCollapsedContainer)),
            templateDisposables.add(new CollapsedCellInput(this.notebookEditor, cellInputCollapsedContainer)),
            templateDisposables.add(new CellFocusPart(container, focusSinkElement, this.notebookEditor)),
            templateDisposables.add(new CellDragAndDropPart(container)),
            templateDisposables.add(scopedInstaService.createInstance(CellContextKeyPart, this.notebookEditor)),
        ];
        const { cellExecutePrimary, cellExecuteToolbar } = this.notebookEditor.creationOptions.menuIds;
        if (cellExecutePrimary && cellExecuteToolbar) {
            contentParts.push(templateDisposables.add(scopedInstaService.createInstance(RunToolbar, this.notebookEditor, contextKeyService, container, runButtonContainer, cellExecutePrimary, cellExecuteToolbar)));
        }
        const cellParts = new CellPartsCollection(DOM.getWindow(rootContainer), contentParts, [
            titleToolbar,
            templateDisposables.add(scopedInstaService.createInstance(BetweenCellToolbar, this.notebookEditor, titleToolbarContainer, bottomCellToolbarContainer))
        ]);
        templateDisposables.add(cellParts);
        const templateData = {
            rootContainer,
            editorPart,
            cellInputCollapsedContainer,
            cellOutputCollapsedContainer,
            instantiationService: scopedInstaService,
            container,
            cellContainer,
            focusSinkElement,
            outputContainer,
            outputShowMoreContainer,
            editor,
            templateDisposables,
            elementDisposables: templateDisposables.add(new DisposableStore()),
            cellParts,
            toJSON: () => { return {}; }
        };
        // focusIndicatorLeft covers the left margin area
        // code/outputFocusIndicator need to be registered as drag handlers so their click handlers don't take over
        const dragHandles = [focusIndicatorLeft.domNode, focusIndicatorPart.codeFocusIndicator.domNode, focusIndicatorPart.outputFocusIndicator.domNode];
        this.dndController?.registerDragHandle(templateData, rootContainer, dragHandles, () => new CodeCellDragImageRenderer().getDragImage(templateData, templateData.editor, 'code'));
        return templateData;
    }
    renderElement(element, index, templateData, height) {
        if (!this.notebookEditor.hasModel()) {
            throw new Error('The notebook editor is not attached with view model yet.');
        }
        templateData.currentRenderedCell = element;
        if (height === undefined) {
            return;
        }
        templateData.outputContainer.domNode.innerText = '';
        templateData.outputContainer.domNode.appendChild(templateData.cellOutputCollapsedContainer);
        templateData.elementDisposables.add(templateData.instantiationService.createInstance(CodeCell, this.notebookEditor, element, templateData, this.editorPool));
        this.renderedEditors.set(element, templateData.editor);
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
        this.renderedEditors.delete(element);
    }
};
CodeCellRenderer = CodeCellRenderer_1 = __decorate([
    __param(5, IConfigurationService),
    __param(6, IContextMenuService),
    __param(7, IMenuService),
    __param(8, IInstantiationService),
    __param(9, IKeybindingService),
    __param(10, INotificationService)
], CodeCellRenderer);
export { CodeCellRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9yZW5kZXJlcnMvY2VsbFJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDMUUsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUUxRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQTRCLE1BQU0sNERBQTRELENBQUM7QUFDMUgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1B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