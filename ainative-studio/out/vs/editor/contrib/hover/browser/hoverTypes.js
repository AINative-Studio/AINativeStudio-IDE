/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var HoverAnchorType;
(function (HoverAnchorType) {
    HoverAnchorType[HoverAnchorType["Range"] = 1] = "Range";
    HoverAnchorType[HoverAnchorType["ForeignElement"] = 2] = "ForeignElement";
})(HoverAnchorType || (HoverAnchorType = {}));
export class HoverRangeAnchor {
    constructor(priority, range, initialMousePosX, initialMousePosY) {
        this.priority = priority;
        this.range = range;
        this.initialMousePosX = initialMousePosX;
        this.initialMousePosY = initialMousePosY;
        this.type = 1 /* HoverAnchorType.Range */;
    }
    equals(other) {
        return (other.type === 1 /* HoverAnchorType.Range */ && this.range.equalsRange(other.range));
    }
    canAdoptVisibleHover(lastAnchor, showAtPosition) {
        return (lastAnchor.type === 1 /* HoverAnchorType.Range */ && showAtPosition.lineNumber === this.range.startLineNumber);
    }
}
export class HoverForeignElementAnchor {
    constructor(priority, owner, range, initialMousePosX, initialMousePosY, supportsMarkerHover) {
        this.priority = priority;
        this.owner = owner;
        this.range = range;
        this.initialMousePosX = initialMousePosX;
        this.initialMousePosY = initialMousePosY;
        this.supportsMarkerHover = supportsMarkerHover;
        this.type = 2 /* HoverAnchorType.ForeignElement */;
    }
    equals(other) {
        return (other.type === 2 /* HoverAnchorType.ForeignElement */ && this.owner === other.owner);
    }
    canAdoptVisibleHover(lastAnchor, showAtPosition) {
        return (lastAnchor.type === 2 /* HoverAnchorType.ForeignElement */ && this.owner === lastAnchor.owner);
    }
}
/**
 * Default implementation of IRenderedHoverParts.
 */
export class RenderedHoverParts {
    constructor(renderedHoverParts, disposables) {
        this.renderedHoverParts = renderedHoverParts;
        this.disposables = disposables;
    }
    dispose() {
        for (const part of this.renderedHoverParts) {
            part.dispose();
        }
        this.disposables?.dispose();
    }
}
export const HoverParticipantRegistry = (new class HoverParticipantRegistry {
    constructor() {
        this._participants = [];
    }
    register(ctor) {
        this._participants.push(ctor);
    }
    getAll() {
        return this._participants;
    }
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2hvdmVyVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUF1Q2hHLE1BQU0sQ0FBTixJQUFrQixlQUdqQjtBQUhELFdBQWtCLGVBQWU7SUFDaEMsdURBQVMsQ0FBQTtJQUNULHlFQUFrQixDQUFBO0FBQ25CLENBQUMsRUFIaUIsZUFBZSxLQUFmLGVBQWUsUUFHaEM7QUFFRCxNQUFNLE9BQU8sZ0JBQWdCO0lBRTVCLFlBQ2lCLFFBQWdCLEVBQ2hCLEtBQVksRUFDWixnQkFBb0MsRUFDcEMsZ0JBQW9DO1FBSHBDLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBb0I7UUFDcEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFvQjtRQUxyQyxTQUFJLGlDQUF5QjtJQU83QyxDQUFDO0lBQ00sTUFBTSxDQUFDLEtBQWtCO1FBQy9CLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxrQ0FBMEIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBQ00sb0JBQW9CLENBQUMsVUFBdUIsRUFBRSxjQUF3QjtRQUM1RSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksa0NBQTBCLElBQUksY0FBYyxDQUFDLFVBQVUsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hILENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx5QkFBeUI7SUFFckMsWUFDaUIsUUFBZ0IsRUFDaEIsS0FBOEIsRUFDOUIsS0FBWSxFQUNaLGdCQUFvQyxFQUNwQyxnQkFBb0MsRUFDcEMsbUJBQXdDO1FBTHhDLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsVUFBSyxHQUFMLEtBQUssQ0FBeUI7UUFDOUIsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBb0I7UUFDcEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFvQjtRQUNwQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBUHpDLFNBQUksMENBQWtDO0lBU3RELENBQUM7SUFDTSxNQUFNLENBQUMsS0FBa0I7UUFDL0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLDJDQUFtQyxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFDTSxvQkFBb0IsQ0FBQyxVQUF1QixFQUFFLGNBQXdCO1FBQzVFLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSwyQ0FBbUMsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRyxDQUFDO0NBQ0Q7QUFpRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBRTlCLFlBQTRCLGtCQUEyQyxFQUFtQixXQUF5QjtRQUF2Rix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXlCO1FBQW1CLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQUksQ0FBQztJQUV4SCxPQUFPO1FBQ04sS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLENBQUM7SUFDN0IsQ0FBQztDQUNEO0FBaUJELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLENBQUMsSUFBSSxNQUFNLHdCQUF3QjtJQUE5QjtRQUU1QyxrQkFBYSxHQUFrQyxFQUFFLENBQUM7SUFVbkQsQ0FBQztJQVJPLFFBQVEsQ0FBb0MsSUFBa0Y7UUFDcEksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBbUMsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFTSxNQUFNO1FBQ1osT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7Q0FFRCxFQUFFLENBQUMsQ0FBQyJ9