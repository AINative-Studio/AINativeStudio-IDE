/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var Constants;
(function (Constants) {
    Constants[Constants["MINIMUM_HEIGHT"] = 4] = "MINIMUM_HEIGHT";
})(Constants || (Constants = {}));
export class ColorZone {
    constructor(from, to, colorId) {
        this._colorZoneBrand = undefined;
        this.from = from | 0;
        this.to = to | 0;
        this.colorId = colorId | 0;
    }
    static compare(a, b) {
        if (a.colorId === b.colorId) {
            if (a.from === b.from) {
                return a.to - b.to;
            }
            return a.from - b.from;
        }
        return a.colorId - b.colorId;
    }
}
/**
 * A zone in the overview ruler
 */
export class OverviewRulerZone {
    constructor(startLineNumber, endLineNumber, heightInLines, color) {
        this._overviewRulerZoneBrand = undefined;
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
        this.heightInLines = heightInLines;
        this.color = color;
        this._colorZone = null;
    }
    static compare(a, b) {
        if (a.color === b.color) {
            if (a.startLineNumber === b.startLineNumber) {
                if (a.heightInLines === b.heightInLines) {
                    return a.endLineNumber - b.endLineNumber;
                }
                return a.heightInLines - b.heightInLines;
            }
            return a.startLineNumber - b.startLineNumber;
        }
        return a.color < b.color ? -1 : 1;
    }
    setColorZone(colorZone) {
        this._colorZone = colorZone;
    }
    getColorZones() {
        return this._colorZone;
    }
}
export class OverviewZoneManager {
    constructor(getVerticalOffsetForLine) {
        this._getVerticalOffsetForLine = getVerticalOffsetForLine;
        this._zones = [];
        this._colorZonesInvalid = false;
        this._lineHeight = 0;
        this._domWidth = 0;
        this._domHeight = 0;
        this._outerHeight = 0;
        this._pixelRatio = 1;
        this._lastAssignedId = 0;
        this._color2Id = Object.create(null);
        this._id2Color = [];
    }
    getId2Color() {
        return this._id2Color;
    }
    setZones(newZones) {
        this._zones = newZones;
        this._zones.sort(OverviewRulerZone.compare);
    }
    setLineHeight(lineHeight) {
        if (this._lineHeight === lineHeight) {
            return false;
        }
        this._lineHeight = lineHeight;
        this._colorZonesInvalid = true;
        return true;
    }
    setPixelRatio(pixelRatio) {
        this._pixelRatio = pixelRatio;
        this._colorZonesInvalid = true;
    }
    getDOMWidth() {
        return this._domWidth;
    }
    getCanvasWidth() {
        return this._domWidth * this._pixelRatio;
    }
    setDOMWidth(width) {
        if (this._domWidth === width) {
            return false;
        }
        this._domWidth = width;
        this._colorZonesInvalid = true;
        return true;
    }
    getDOMHeight() {
        return this._domHeight;
    }
    getCanvasHeight() {
        return this._domHeight * this._pixelRatio;
    }
    setDOMHeight(height) {
        if (this._domHeight === height) {
            return false;
        }
        this._domHeight = height;
        this._colorZonesInvalid = true;
        return true;
    }
    getOuterHeight() {
        return this._outerHeight;
    }
    setOuterHeight(outerHeight) {
        if (this._outerHeight === outerHeight) {
            return false;
        }
        this._outerHeight = outerHeight;
        this._colorZonesInvalid = true;
        return true;
    }
    resolveColorZones() {
        const colorZonesInvalid = this._colorZonesInvalid;
        const lineHeight = Math.floor(this._lineHeight);
        const totalHeight = Math.floor(this.getCanvasHeight());
        const outerHeight = Math.floor(this._outerHeight);
        const heightRatio = totalHeight / outerHeight;
        const halfMinimumHeight = Math.floor(4 /* Constants.MINIMUM_HEIGHT */ * this._pixelRatio / 2);
        const allColorZones = [];
        for (let i = 0, len = this._zones.length; i < len; i++) {
            const zone = this._zones[i];
            if (!colorZonesInvalid) {
                const colorZone = zone.getColorZones();
                if (colorZone) {
                    allColorZones.push(colorZone);
                    continue;
                }
            }
            const offset1 = this._getVerticalOffsetForLine(zone.startLineNumber);
            const offset2 = (zone.heightInLines === 0
                ? this._getVerticalOffsetForLine(zone.endLineNumber) + lineHeight
                : offset1 + zone.heightInLines * lineHeight);
            const y1 = Math.floor(heightRatio * offset1);
            const y2 = Math.floor(heightRatio * offset2);
            let ycenter = Math.floor((y1 + y2) / 2);
            let halfHeight = (y2 - ycenter);
            if (halfHeight < halfMinimumHeight) {
                halfHeight = halfMinimumHeight;
            }
            if (ycenter - halfHeight < 0) {
                ycenter = halfHeight;
            }
            if (ycenter + halfHeight > totalHeight) {
                ycenter = totalHeight - halfHeight;
            }
            const color = zone.color;
            let colorId = this._color2Id[color];
            if (!colorId) {
                colorId = (++this._lastAssignedId);
                this._color2Id[color] = colorId;
                this._id2Color[colorId] = color;
            }
            const colorZone = new ColorZone(ycenter - halfHeight, ycenter + halfHeight, colorId);
            zone.setColorZone(colorZone);
            allColorZones.push(colorZone);
        }
        this._colorZonesInvalid = false;
        allColorZones.sort(ColorZone.compare);
        return allColorZones;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdab25lTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC9vdmVydmlld1pvbmVNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLElBQVcsU0FFVjtBQUZELFdBQVcsU0FBUztJQUNuQiw2REFBa0IsQ0FBQTtBQUNuQixDQUFDLEVBRlUsU0FBUyxLQUFULFNBQVMsUUFFbkI7QUFFRCxNQUFNLE9BQU8sU0FBUztJQU9yQixZQUFZLElBQVksRUFBRSxFQUFVLEVBQUUsT0FBZTtRQU5yRCxvQkFBZSxHQUFTLFNBQVMsQ0FBQztRQU9qQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFZLEVBQUUsQ0FBWTtRQUMvQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3BCLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUN4QixDQUFDO1FBQ0QsT0FBTyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDOUIsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFD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