/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { executingStateIcon } from '../notebookIcons.js';
import { CellKind } from '../../common/notebookCommon.js';
import { SymbolKinds } from '../../../../../editor/common/languages.js';
export class OutlineEntry {
    get icon() {
        if (this.symbolKind) {
            return SymbolKinds.toIcon(this.symbolKind);
        }
        return this.isExecuting && this.isPaused ? executingStateIcon :
            this.isExecuting ? ThemeIcon.modify(executingStateIcon, 'spin') :
                this.cell.cellKind === CellKind.Markup ? Codicon.markdown : Codicon.code;
    }
    constructor(index, level, cell, label, isExecuting, isPaused, range, symbolKind) {
        this.index = index;
        this.level = level;
        this.cell = cell;
        this.label = label;
        this.isExecuting = isExecuting;
        this.isPaused = isPaused;
        this.range = range;
        this.symbolKind = symbolKind;
        this._children = [];
    }
    addChild(entry) {
        this._children.push(entry);
        entry._parent = this;
    }
    get parent() {
        return this._parent;
    }
    get children() {
        return this._children;
    }
    get markerInfo() {
        return this._markerInfo;
    }
    get position() {
        if (this.range) {
            return { startLineNumber: this.range.startLineNumber, startColumn: this.range.startColumn };
        }
        return undefined;
    }
    updateMarkers(markerService) {
        if (this.cell.cellKind === CellKind.Code) {
            // a code cell can have marker
            const marker = markerService.read({ resource: this.cell.uri, severities: MarkerSeverity.Error | MarkerSeverity.Warning });
            if (marker.length === 0) {
                this._markerInfo = undefined;
            }
            else {
                const topSev = marker.find(a => a.severity === MarkerSeverity.Error)?.severity ?? MarkerSeverity.Warning;
                this._markerInfo = { topSev, count: marker.length };
            }
        }
        else {
            // a markdown cell can inherit markers from its children
            let topChild;
            for (const child of this.children) {
                child.updateMarkers(markerService);
                if (child.markerInfo) {
                    topChild = !topChild ? child.markerInfo.topSev : Math.max(child.markerInfo.topSev, topChild);
                }
            }
            this._markerInfo = topChild && { topSev: topChild, count: 0 };
        }
    }
    clearMarkers() {
        this._markerInfo = undefined;
        for (const child of this.children) {
            child.clearMarkers();
        }
    }
    find(cell, parents) {
        if (cell.id === this.cell.id) {
            return this;
        }
        parents.push(this);
        for (const child of this.children) {
            const result = child.find(cell, parents);
            if (result) {
                return result;
            }
        }
        parents.pop();
        return undefined;
    }
    asFlatList(bucket) {
        bucket.push(this);
        for (const child of this.children) {
            child.asFlatList(bucket);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3V0bGluZUVudHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL091dGxpbmVFbnRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBa0IsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFELE9BQU8sRUFBYyxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQU9wRixNQUFNLE9BQU8sWUFBWTtJQUt4QixJQUFJLElBQUk7UUFDUCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUM5RCxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFDNUUsQ0FBQztJQUVELFlBQ1UsS0FBYSxFQUNiLEtBQWEsRUFDYixJQUFvQixFQUNwQixLQUFhLEVBQ2IsV0FBb0IsRUFDcEIsUUFBaUIsRUFDakIsS0FBYyxFQUNkLFVBQXVCO1FBUHZCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsU0FBSSxHQUFKLElBQUksQ0FBZ0I7UUFDcEIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGdCQUFXLEdBQVgsV0FBVyxDQUFTO1FBQ3BCLGFBQVEsR0FBUixRQUFRLENBQVM7UUFDakIsVUFBSyxHQUFMLEtBQUssQ0FBUztRQUNkLGVBQVUsR0FBVixVQUFVLENBQWE7UUFyQnpCLGNBQVMsR0FBbUIsRUFBRSxDQUFDO0lBc0JuQyxDQUFDO0lBRUwsUUFBUSxDQUFDLEtBQW1CO1FBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNCLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN2QixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsYUFBYSxDQUFDLGFBQTZCO1FBQzFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFDLDhCQUE4QjtZQUM5QixNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxjQUFjLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQzFILElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7WUFDOUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQztnQkFDekcsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLHdEQUF3RDtZQUN4RCxJQUFJLFFBQW9DLENBQUM7WUFDekMsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25DLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ25DLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUN0QixRQUFRLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUM5RixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDL0QsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO1FBQ1gsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3RCLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLElBQW9CLEVBQUUsT0FBdUI7UUFDakQsSUFBSSxJQUFJLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN6QyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE9BQU8sTUFBTSxDQUFDO1lBQ2YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDZCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQXNCO1FBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=