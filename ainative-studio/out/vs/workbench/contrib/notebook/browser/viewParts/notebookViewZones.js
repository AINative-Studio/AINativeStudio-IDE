/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IsDevelopmentContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
const invalidFunc = () => { throw new Error(`Invalid notebook view zone change accessor`); };
export class NotebookViewZones extends Disposable {
    constructor(listView, coordinator) {
        super();
        this.listView = listView;
        this.coordinator = coordinator;
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName('view-zones');
        this.domNode.setPosition('absolute');
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this.domNode.setWidth('100%');
        this._zones = {};
        this.listView.containerDomNode.appendChild(this.domNode.domNode);
    }
    changeViewZones(callback) {
        let zonesHaveChanged = false;
        const changeAccessor = {
            addZone: (zone) => {
                zonesHaveChanged = true;
                return this._addZone(zone);
            },
            removeZone: (id) => {
                zonesHaveChanged = true;
                // TODO: validate if zones have changed layout
                this._removeZone(id);
            },
            layoutZone: (id) => {
                zonesHaveChanged = true;
                // TODO: validate if zones have changed layout
                this._layoutZone(id);
            }
        };
        safeInvoke1Arg(callback, changeAccessor);
        // Invalidate changeAccessor
        changeAccessor.addZone = invalidFunc;
        changeAccessor.removeZone = invalidFunc;
        changeAccessor.layoutZone = invalidFunc;
        return zonesHaveChanged;
    }
    getViewZoneLayoutInfo(viewZoneId) {
        const zoneWidget = this._zones[viewZoneId];
        if (!zoneWidget) {
            return null;
        }
        const top = this.listView.getWhitespacePosition(zoneWidget.whitespaceId);
        const height = zoneWidget.zone.heightInPx;
        return { height: height, top: top };
    }
    onCellsChanged(e) {
        const splices = e.splices.slice().reverse();
        splices.forEach(splice => {
            const [start, deleted, newCells] = splice;
            const fromIndex = start;
            const toIndex = start + deleted;
            // 1, 2, 0
            // delete cell index 1 and 2
            // from index 1, to index 3 (exclusive): [1, 3)
            // if we have whitespace afterModelPosition 3, which is after cell index 2
            for (const id in this._zones) {
                const zone = this._zones[id].zone;
                const cellBeforeWhitespaceIndex = zone.afterModelPosition - 1;
                if (cellBeforeWhitespaceIndex >= fromIndex && cellBeforeWhitespaceIndex < toIndex) {
                    // The cell this whitespace was after has been deleted
                    //  => move whitespace to before first deleted cell
                    zone.afterModelPosition = fromIndex;
                    this._updateWhitespace(this._zones[id]);
                }
                else if (cellBeforeWhitespaceIndex >= toIndex) {
                    // adjust afterModelPosition for all other cells
                    const insertLength = newCells.length;
                    const offset = insertLength - deleted;
                    zone.afterModelPosition += offset;
                    this._updateWhitespace(this._zones[id]);
                }
            }
        });
    }
    onHiddenRangesChange() {
        for (const id in this._zones) {
            this._updateWhitespace(this._zones[id]);
        }
    }
    _updateWhitespace(zone) {
        const whitespaceId = zone.whitespaceId;
        const viewPosition = this.coordinator.convertModelIndexToViewIndex(zone.zone.afterModelPosition);
        const isInHiddenArea = this._isInHiddenRanges(zone.zone);
        zone.isInHiddenArea = isInHiddenArea;
        this.listView.changeOneWhitespace(whitespaceId, viewPosition, isInHiddenArea ? 0 : zone.zone.heightInPx);
    }
    layout() {
        for (const id in this._zones) {
            this._layoutZone(id);
        }
    }
    _addZone(zone) {
        const viewPosition = this.coordinator.convertModelIndexToViewIndex(zone.afterModelPosition);
        const whitespaceId = this.listView.insertWhitespace(viewPosition, zone.heightInPx);
        const isInHiddenArea = this._isInHiddenRanges(zone);
        const myZone = {
            whitespaceId: whitespaceId,
            zone: zone,
            domNode: createFastDomNode(zone.domNode),
            isInHiddenArea: isInHiddenArea
        };
        this._zones[whitespaceId] = myZone;
        myZone.domNode.setPosition('absolute');
        myZone.domNode.domNode.style.width = '100%';
        myZone.domNode.setDisplay('none');
        myZone.domNode.setAttribute('notebook-view-zone', whitespaceId);
        this.domNode.appendChild(myZone.domNode);
        return whitespaceId;
    }
    _removeZone(id) {
        this.listView.removeWhitespace(id);
        const zoneWidget = this._zones[id];
        if (zoneWidget) {
            // safely remove the dom node from its parent
            try {
                this.domNode.removeChild(zoneWidget.domNode);
            }
            catch {
                // ignore the error
            }
        }
        delete this._zones[id];
    }
    _layoutZone(id) {
        const zoneWidget = this._zones[id];
        if (!zoneWidget) {
            return;
        }
        this._updateWhitespace(this._zones[id]);
        const isInHiddenArea = this._isInHiddenRanges(zoneWidget.zone);
        if (isInHiddenArea) {
            zoneWidget.domNode.setDisplay('none');
        }
        else {
            const top = this.listView.getWhitespacePosition(zoneWidget.whitespaceId);
            zoneWidget.domNode.setTop(top);
            zoneWidget.domNode.setDisplay('block');
            zoneWidget.domNode.setHeight(zoneWidget.zone.heightInPx);
        }
    }
    _isInHiddenRanges(zone) {
        // The view zone is between two cells (zone.afterModelPosition - 1, zone.afterModelPosition)
        const afterIndex = zone.afterModelPosition;
        // In notebook, the first cell (markdown cell) in a folding range is always visible, so we need to check the cell after the notebook view zone
        return !this.coordinator.modelIndexIsVisible(afterIndex);
    }
    dispose() {
        super.dispose();
        this._zones = {};
    }
}
function safeInvoke1Arg(func, arg1) {
    try {
        func(arg1);
    }
    catch (e) {
        onUnexpectedError(e);
    }
}
class ToggleNotebookViewZoneDeveloperAction extends Action2 {
    static { this.viewZoneIds = []; }
    constructor() {
        super({
            id: 'notebook.developer.addViewZones',
            title: localize2('workbench.notebook.developer.addViewZones', "Toggle Notebook View Zones"),
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
        if (ToggleNotebookViewZoneDeveloperAction.viewZoneIds.length > 0) {
            // remove all view zones
            editor.changeViewZones(accessor => {
                // remove all view zones in reverse order, to follow how we handle this in the prod code
                ToggleNotebookViewZoneDeveloperAction.viewZoneIds.reverse().forEach(id => {
                    accessor.removeZone(id);
                });
                ToggleNotebookViewZoneDeveloperAction.viewZoneIds = [];
            });
        }
        else {
            editor.changeViewZones(accessor => {
                const cells = editor.getCellsInRange();
                if (cells.length === 0) {
                    return;
                }
                const viewZoneIds = [];
                for (let i = 0; i < cells.length; i++) {
                    const domNode = document.createElement('div');
                    domNode.innerText = `View Zone ${i}`;
                    domNode.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
                    const viewZoneId = accessor.addZone({
                        afterModelPosition: i,
                        heightInPx: 200,
                        domNode: domNode,
                    });
                    viewZoneIds.push(viewZoneId);
                }
                ToggleNotebookViewZoneDeveloperAction.viewZoneIds = viewZoneIds;
            });
        }
    }
}
registerAction2(ToggleNotebookViewZoneDeveloperAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3Wm9uZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tWaWV3Wm9uZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLCtCQUErQixFQUFxRixNQUFNLHVCQUF1QixDQUFDO0FBSzNKLE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRSxHQUFHLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQVM3RixNQUFNLE9BQU8saUJBQWtCLFNBQVEsVUFBVTtJQUloRCxZQUE2QixRQUE2QyxFQUFtQixXQUFrQztRQUM5SCxLQUFLLEVBQUUsQ0FBQztRQURvQixhQUFRLEdBQVIsUUFBUSxDQUFxQztRQUFtQixnQkFBVyxHQUFYLFdBQVcsQ0FBdUI7UUFFOUgsSUFBSSxDQUFDLE9BQU8sR0FB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