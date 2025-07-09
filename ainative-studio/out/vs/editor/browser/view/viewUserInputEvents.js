/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../../common/core/position.js';
export class ViewUserInputEvents {
    constructor(coordinatesConverter) {
        this.onKeyDown = null;
        this.onKeyUp = null;
        this.onContextMenu = null;
        this.onMouseMove = null;
        this.onMouseLeave = null;
        this.onMouseDown = null;
        this.onMouseUp = null;
        this.onMouseDrag = null;
        this.onMouseDrop = null;
        this.onMouseDropCanceled = null;
        this.onMouseWheel = null;
        this._coordinatesConverter = coordinatesConverter;
    }
    emitKeyDown(e) {
        this.onKeyDown?.(e);
    }
    emitKeyUp(e) {
        this.onKeyUp?.(e);
    }
    emitContextMenu(e) {
        this.onContextMenu?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseMove(e) {
        this.onMouseMove?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseLeave(e) {
        this.onMouseLeave?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseDown(e) {
        this.onMouseDown?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseUp(e) {
        this.onMouseUp?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseDrag(e) {
        this.onMouseDrag?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseDrop(e) {
        this.onMouseDrop?.(this._convertViewToModelMouseEvent(e));
    }
    emitMouseDropCanceled() {
        this.onMouseDropCanceled?.();
    }
    emitMouseWheel(e) {
        this.onMouseWheel?.(e);
    }
    _convertViewToModelMouseEvent(e) {
        if (e.target) {
            return {
                event: e.event,
                target: this._convertViewToModelMouseTarget(e.target)
            };
        }
        return e;
    }
    _convertViewToModelMouseTarget(target) {
        return ViewUserInputEvents.convertViewToModelMouseTarget(target, this._coordinatesConverter);
    }
    static convertViewToModelMouseTarget(target, coordinatesConverter) {
        const result = { ...target };
        if (result.position) {
            result.position = coordinatesConverter.convertViewPositionToModelPosition(result.position);
        }
        if (result.range) {
            result.range = coordinatesConverter.convertViewRangeToModelRange(result.range);
        }
        if (result.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */ || result.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
            result.detail = this.convertViewToModelViewZoneData(result.detail, coordinatesConverter);
        }
        return result;
    }
    static convertViewToModelViewZoneData(data, coordinatesConverter) {
        return {
            viewZoneId: data.viewZoneId,
            positionBefore: data.positionBefore ? coordinatesConverter.convertViewPositionToModelPosition(data.positionBefore) : data.positionBefore,
            positionAfter: data.positionAfter ? coordinatesConverter.convertViewPositionToModelPosition(data.positionAfter) : data.positionAfter,
            position: coordinatesConverter.convertViewPositionToModelPosition(data.position),
            afterLineNumber: coordinatesConverter.convertViewPositionToModelPosition(new Position(data.afterLineNumber, 1)).lineNumber,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1VzZXJJbnB1dEV2ZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3L3ZpZXdVc2VySW5wdXRFdmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBTXpELE1BQU0sT0FBTyxtQkFBbUI7SUFnQi9CLFlBQVksb0JBQTJDO1FBZGhELGNBQVMsR0FBeUMsSUFBSSxDQUFDO1FBQ3ZELFlBQU8sR0FBeUMsSUFBSSxDQUFDO1FBQ3JELGtCQUFhLEdBQTRDLElBQUksQ0FBQztRQUM5RCxnQkFBVyxHQUE0QyxJQUFJLENBQUM7UUFDNUQsaUJBQVksR0FBbUQsSUFBSSxDQUFDO1FBQ3BFLGdCQUFXLEdBQTRDLElBQUksQ0FBQztRQUM1RCxjQUFTLEdBQTRDLElBQUksQ0FBQztRQUMxRCxnQkFBVyxHQUE0QyxJQUFJLENBQUM7UUFDNUQsZ0JBQVcsR0FBbUQsSUFBSSxDQUFDO1FBQ25FLHdCQUFtQixHQUErQixJQUFJLENBQUM7UUFDdkQsaUJBQVksR0FBMkMsSUFBSSxDQUFDO1FBS2xFLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxvQkFBb0IsQ0FBQztJQUNuRCxDQUFDO0lBRU0sV0FBVyxDQUFDLENBQWlCO1FBQ25DLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyQixDQUFDO0lBRU0sU0FBUyxDQUFDLENBQWlCO1FBQ2pDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQixDQUFDO0lBRU0sZUFBZSxDQUFDLENBQW9CO1FBQzFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxD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