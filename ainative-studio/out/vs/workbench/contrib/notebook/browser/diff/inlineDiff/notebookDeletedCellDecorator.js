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
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { splitLines } from '../../../../../../base/common/strings.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { tokenizeToString } from '../../../../../../editor/common/languages/textToHtmlTokenizer.js';
import { DefaultLineHeight } from '../diffElementViewModel.js';
import { NotebookOverviewRulerLane } from '../../notebookBrowser.js';
import * as DOM from '../../../../../../base/browser/dom.js';
import { MenuWorkbenchToolBar } from '../../../../../../platform/actions/browser/toolbar.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { overviewRulerDeletedForeground } from '../../../../scm/common/quickDiff.js';
const ttPolicy = createTrustedTypesPolicy('notebookRenderer', { createHTML: value => value });
let NotebookDeletedCellDecorator = class NotebookDeletedCellDecorator extends Disposable {
    constructor(_notebookEditor, toolbar, languageService, instantiationService) {
        super();
        this._notebookEditor = _notebookEditor;
        this.toolbar = toolbar;
        this.languageService = languageService;
        this.instantiationService = instantiationService;
        this.zoneRemover = this._register(new DisposableStore());
        this.createdViewZones = new Map();
        this.deletedCellInfos = new Map();
    }
    getTop(deletedIndex) {
        const info = this.deletedCellInfos.get(deletedIndex);
        if (!info) {
            return;
        }
        if (info.previousIndex === -1) {
            // deleted cell is before the first real cell
            return 0;
        }
        const cells = this._notebookEditor.getCellsInRange({ start: info.previousIndex, end: info.previousIndex + 1 });
        if (!cells.length) {
            return this._notebookEditor.getLayoutInfo().height + info.offset;
        }
        const cell = cells[0];
        const cellHeight = this._notebookEditor.getHeightOfElement(cell);
        const top = this._notebookEditor.getAbsoluteTopOfElement(cell);
        return top + cellHeight + info.offset;
    }
    reveal(deletedIndex) {
        const top = this.getTop(deletedIndex);
        if (typeof top === 'number') {
            this._notebookEditor.focusContainer();
            this._notebookEditor.revealOffsetInCenterIfOutsideViewport(top);
            const info = this.deletedCellInfos.get(deletedIndex);
            if (info) {
                const prevIndex = info.previousIndex === -1 ? 0 : info.previousIndex;
                this._notebookEditor.setFocus({ start: prevIndex, end: prevIndex });
                this._notebookEditor.setSelections([{ start: prevIndex, end: prevIndex }]);
            }
        }
    }
    apply(diffInfo, original) {
        this.clear();
        let currentIndex = -1;
        const deletedCellsToRender = { cells: [], index: 0 };
        diffInfo.forEach(diff => {
            if (diff.type === 'delete') {
                const deletedCell = original.cells[diff.originalCellIndex];
                if (deletedCell) {
                    deletedCellsToRender.cells.push({ cell: deletedCell, originalIndex: diff.originalCellIndex, previousIndex: currentIndex });
                    deletedCellsToRender.index = currentIndex;
                }
            }
            else {
                if (deletedCellsToRender.cells.length) {
                    this._createWidget(deletedCellsToRender.index + 1, deletedCellsToRender.cells);
                    deletedCellsToRender.cells.length = 0;
                }
                currentIndex = diff.modifiedCellIndex;
            }
        });
        if (deletedCellsToRender.cells.length) {
            this._createWidget(deletedCellsToRender.index + 1, deletedCellsToRender.cells);
        }
    }
    clear() {
        this.deletedCellInfos.clear();
        this.zoneRemover.clear();
    }
    _createWidget(index, cells) {
        this._createWidgetImpl(index, cells);
    }
    async _createWidgetImpl(index, cells) {
        const rootContainer = document.createElement('div');
        const widgets = [];
        const heights = await Promise.all(cells.map(async (cell) => {
            const widget = new NotebookDeletedCellWidget(this._notebookEditor, this.toolbar, cell.cell.getValue(), cell.cell.language, rootContainer, cell.originalIndex, this.languageService, this.instantiationService);
            widgets.push(widget);
            const height = await widget.render();
            this.deletedCellInfos.set(cell.originalIndex, { height, previousIndex: cell.previousIndex, offset: 0 });
            return height;
        }));
        Array.from(this.deletedCellInfos.keys()).sort((a, b) => a - b).forEach((originalIndex) => {
            const previousDeletedCell = this.deletedCellInfos.get(originalIndex - 1);
            if (previousDeletedCell) {
                const deletedCell = this.deletedCellInfos.get(originalIndex);
                if (deletedCell) {
                    deletedCell.offset = previousDeletedCell.height + previousDeletedCell.offset;
                }
            }
        });
        const totalHeight = heights.reduce((prev, curr) => prev + curr, 0);
        this._notebookEditor.changeViewZones(accessor => {
            const notebookViewZone = {
                afterModelPosition: index,
                heightInPx: totalHeight + 4,
                domNode: rootContainer
            };
            const id = accessor.addZone(notebookViewZone);
            accessor.layoutZone(id);
            this.createdViewZones.set(index, id);
            const deletedCellOverviewRulereDecorationIds = this._notebookEditor.deltaCellDecorations([], [{
                    viewZoneId: id,
                    options: {
                        overviewRuler: {
                            color: overviewRulerDeletedForeground,
                            position: NotebookOverviewRulerLane.Center,
                        }
                    }
                }]);
            this.zoneRemover.add(toDisposable(() => {
                if (this.createdViewZones.get(index) === id) {
                    this.createdViewZones.delete(index);
                }
                if (!this._notebookEditor.isDisposed) {
                    this._notebookEditor.changeViewZones(accessor => {
                        accessor.removeZone(id);
                        dispose(widgets);
                    });
                    this._notebookEditor.deltaCellDecorations(deletedCellOverviewRulereDecorationIds, []);
                }
            }));
        });
    }
};
NotebookDeletedCellDecorator = __decorate([
    __param(2, ILanguageService),
    __param(3, IInstantiationService)
], NotebookDeletedCellDecorator);
export { NotebookDeletedCellDecorator };
let NotebookDeletedCellWidget = class NotebookDeletedCellWidget extends Disposable {
    // private readonly toolbar: HTMLElement;
    constructor(_notebookEditor, _toolbarOptions, code, language, container, _originalIndex, languageService, instantiationService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._toolbarOptions = _toolbarOptions;
        this.code = code;
        this.language = language;
        this._originalIndex = _originalIndex;
        this.languageService = languageService;
        this.instantiationService = instantiationService;
        this.container = DOM.append(container, document.createElement('div'));
        this._register(toDisposable(() => {
            container.removeChild(this.container);
        }));
    }
    async render() {
        const code = this.code;
        const languageId = this.language;
        const codeHtml = await tokenizeToString(this.languageService, code, languageId);
        // const colorMap = this.getDefaultColorMap();
        const fontInfo = this._notebookEditor.getBaseCellEditorOptions(languageId).value;
        const fontFamilyVar = '--notebook-editor-font-family';
        const fontSizeVar = '--notebook-editor-font-size';
        const fontWeightVar = '--notebook-editor-font-weight';
        // If we have any editors, then use left layout of one of those.
        const editor = this._notebookEditor.codeEditors.map(c => c[1]).find(c => c);
        const layoutInfo = editor?.getOptions().get(151 /* EditorOption.layoutInfo */);
        const style = ``
            + `font-family: var(${fontFamilyVar});`
            + `font-weight: var(${fontWeightVar});`
            + `font-size: var(${fontSizeVar});`
            + fontInfo.lineHeight ? `line-height: ${fontInfo.lineHeight}px;` : ''
            + layoutInfo?.contentLeft ? `margin-left: ${layoutInfo}px;` : ''
            + `white-space: pre;`;
        const rootContainer = this.container;
        rootContainer.classList.add('code-cell-row');
        if (this._toolbarOptions) {
            const toolbar = document.createElement('div');
            toolbar.className = this._toolbarOptions?.className;
            rootContainer.appendChild(toolbar);
            const scopedInstaService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this._notebookEditor.scopedContextKeyService])));
            const toolbarWidget = scopedInstaService.createInstance(MenuWorkbenchToolBar, toolbar, this._toolbarOptions.menuId, {
                telemetrySource: this._toolbarOptions.telemetrySource,
                hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
                toolbarOptions: { primaryGroup: () => true },
                menuOptions: {
                    renderShortTitle: true,
                    arg: this._toolbarOptions.argFactory(this._originalIndex),
                },
            });
            this._store.add(toolbarWidget);
            toolbar.style.position = 'absolute';
            toolbar.style.right = '40px';
            toolbar.style.zIndex = '10';
            toolbar.classList.add('hover'); // Show by default
        }
        const container = DOM.append(rootContainer, DOM.$('.cell-inner-container'));
        container.style.position = 'relative'; // Add this line
        const focusIndicatorLeft = DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-left'));
        const cellContainer = DOM.append(container, DOM.$('.cell.code'));
        DOM.append(focusIndicatorLeft, DOM.$('div.execution-count-label'));
        const editorPart = DOM.append(cellContainer, DOM.$('.cell-editor-part'));
        let editorContainer = DOM.append(editorPart, DOM.$('.cell-editor-container'));
        editorContainer = DOM.append(editorContainer, DOM.$('.code', { style }));
        if (fontInfo.fontFamily) {
            editorContainer.style.setProperty(fontFamilyVar, fontInfo.fontFamily);
        }
        if (fontInfo.fontSize) {
            editorContainer.style.setProperty(fontSizeVar, `${fontInfo.fontSize}px`);
        }
        if (fontInfo.fontWeight) {
            editorContainer.style.setProperty(fontWeightVar, fontInfo.fontWeight);
        }
        editorContainer.innerHTML = (ttPolicy?.createHTML(codeHtml) || codeHtml);
        const lineCount = splitLines(code).length;
        const height = (lineCount * (fontInfo.lineHeight || DefaultLineHeight)) + 12 + 12; // We have 12px top and bottom in generated code HTML;
        const totalHeight = height + 16 + 16;
        return totalHeight;
    }
};
NotebookDeletedCellWidget = __decorate([
    __param(6, ILanguageService),
    __param(7, IInstantiationService)
], NotebookDeletedCellWidget);
export { NotebookDeletedCellWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEZWxldGVkQ2VsbERlY29yYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvaW5saW5lRGlmZi9ub3RlYm9va0RlbGV0ZWRDZWxsRGVjb3JhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNoSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFHcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFL0QsT0FBTyxFQUFtQix5QkFBeUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3RGLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFzQixNQUFNLHVEQUF1RCxDQUFDO0FBRWpILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXJGLE1BQU0sUUFB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