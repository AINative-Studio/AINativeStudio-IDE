/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IsDevelopmentContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { CellKind } from '../../common/notebookCommon.js';
import { getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
export class NotebookCellOverlays extends Disposable {
    constructor(listView) {
        super();
        this.listView = listView;
        this._lastOverlayId = 0;
        this._overlays = Object.create(null);
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName('cell-overlays');
        this.domNode.setPosition('absolute');
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this.domNode.setWidth('100%');
        this.listView.containerDomNode.appendChild(this.domNode.domNode);
    }
    changeCellOverlays(callback) {
        let overlaysHaveChanged = false;
        const changeAccessor = {
            addOverlay: (overlay) => {
                overlaysHaveChanged = true;
                return this._addOverlay(overlay);
            },
            removeOverlay: (id) => {
                overlaysHaveChanged = true;
                this._removeOverlay(id);
            },
            layoutOverlay: (id) => {
                overlaysHaveChanged = true;
                this._layoutOverlay(id);
            }
        };
        callback(changeAccessor);
        return overlaysHaveChanged;
    }
    onCellsChanged(e) {
        this.layout();
    }
    onHiddenRangesChange() {
        this.layout();
    }
    layout() {
        for (const id in this._overlays) {
            this._layoutOverlay(id);
        }
    }
    _addOverlay(overlay) {
        const overlayId = `${++this._lastOverlayId}`;
        const overlayWidget = {
            overlayId,
            overlay,
            domNode: createFastDomNode(overlay.domNode)
        };
        this._overlays[overlayId] = overlayWidget;
        overlayWidget.domNode.setClassName('cell-overlay');
        overlayWidget.domNode.setPosition('absolute');
        this.domNode.appendChild(overlayWidget.domNode);
        return overlayId;
    }
    _removeOverlay(id) {
        const overlay = this._overlays[id];
        if (overlay) {
            // overlay.overlay.dispose();
            try {
                this.domNode.removeChild(overlay.domNode);
            }
            catch {
                // no op
            }
            delete this._overlays[id];
        }
    }
    _layoutOverlay(id) {
        const overlay = this._overlays[id];
        if (!overlay) {
            return;
        }
        const isInHiddenRanges = this._isInHiddenRanges(overlay);
        if (isInHiddenRanges) {
            overlay.domNode.setDisplay('none');
            return;
        }
        overlay.domNode.setDisplay('block');
        const index = this.listView.indexOf(overlay.overlay.cell);
        if (index === -1) {
            // should not happen
            return;
        }
        const top = this.listView.elementTop(index);
        overlay.domNode.setTop(top);
    }
    _isInHiddenRanges(zone) {
        const index = this.listView.indexOf(zone.overlay.cell);
        if (index === -1) {
            return true;
        }
        return false;
    }
}
class ToggleNotebookCellOverlaysDeveloperAction extends Action2 {
    static { this.cellOverlayIds = []; }
    constructor() {
        super({
            id: 'notebook.developer.addCellOverlays',
            title: localize2('workbench.notebook.developer.addCellOverlays', "Toggle Notebook Cell Overlays"),
            category: Categories.Developer,
            precondition: IsDevelopmentContext,
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        if (ToggleNotebookCellOverlaysDeveloperAction.cellOverlayIds.length > 0) {
            // remove all view zones
            editor.changeCellOverlays(accessor => {
                ToggleNotebookCellOverlaysDeveloperAction.cellOverlayIds.forEach(id => {
                    accessor.removeOverlay(id);
                });
                ToggleNotebookCellOverlaysDeveloperAction.cellOverlayIds = [];
            });
        }
        else {
            editor.changeCellOverlays(accessor => {
                const cells = editor.getCellsInRange();
                if (cells.length === 0) {
                    return;
                }
                const cellOverlayIds = [];
                for (let i = 0; i < cells.length; i++) {
                    if (cells[i].cellKind !== CellKind.Markup) {
                        continue;
                    }
                    const domNode = document.createElement('div');
                    domNode.innerText = `Cell Overlay ${i}`;
                    domNode.style.top = '10px';
                    domNode.style.right = '10px';
                    domNode.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
                    const overlayId = accessor.addOverlay({
                        cell: cells[i],
                        domNode: domNode,
                    });
                    cellOverlayIds.push(overlayId);
                }
                ToggleNotebookCellOverlaysDeveloperAction.cellOverlayIds = cellOverlayIds;
            });
        }
    }
}
registerAction2(ToggleNotebookCellOverlaysDeveloperAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsT3ZlcmxheXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tDZWxsT3ZlcmxheXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFlLE1BQU0sNENBQTRDLENBQUM7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSwrQkFBK0IsRUFBMkYsTUFBTSx1QkFBdUIsQ0FBQztBQVVqSyxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsVUFBVTtJQUtuRCxZQUNrQixRQUE2QztRQUU5RCxLQUFLLEVBQUUsQ0FBQztRQUZTLGFBQVEsR0FBUixRQUFRLENBQXFDO1FBTHZELG1CQUFjLEdBQUcsQ0FBQyxDQUFDO1FBRW5CLGNBQVMsR0FBa0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQU10RixJQUFJLENBQUMsT0FBTyxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENB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