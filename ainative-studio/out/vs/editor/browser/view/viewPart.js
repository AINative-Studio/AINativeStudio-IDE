/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ViewEventHandler } from '../../common/viewEventHandler.js';
export class ViewPart extends ViewEventHandler {
    constructor(context) {
        super();
        this._context = context;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        super.dispose();
    }
}
export var PartFingerprint;
(function (PartFingerprint) {
    PartFingerprint[PartFingerprint["None"] = 0] = "None";
    PartFingerprint[PartFingerprint["ContentWidgets"] = 1] = "ContentWidgets";
    PartFingerprint[PartFingerprint["OverflowingContentWidgets"] = 2] = "OverflowingContentWidgets";
    PartFingerprint[PartFingerprint["OverflowGuard"] = 3] = "OverflowGuard";
    PartFingerprint[PartFingerprint["OverlayWidgets"] = 4] = "OverlayWidgets";
    PartFingerprint[PartFingerprint["OverflowingOverlayWidgets"] = 5] = "OverflowingOverlayWidgets";
    PartFingerprint[PartFingerprint["ScrollableElement"] = 6] = "ScrollableElement";
    PartFingerprint[PartFingerprint["TextArea"] = 7] = "TextArea";
    PartFingerprint[PartFingerprint["ViewLines"] = 8] = "ViewLines";
    PartFingerprint[PartFingerprint["Minimap"] = 9] = "Minimap";
    PartFingerprint[PartFingerprint["ViewLinesGpu"] = 10] = "ViewLinesGpu";
})(PartFingerprint || (PartFingerprint = {}));
export class PartFingerprints {
    static write(target, partId) {
        target.setAttribute('data-mprt', String(partId));
    }
    static read(target) {
        const r = target.getAttribute('data-mprt');
        if (r === null) {
            return 0 /* PartFingerprint.None */;
        }
        return parseInt(r, 10);
    }
    static collect(child, stopAt) {
        const result = [];
        let resultLen = 0;
        while (child && child !== child.ownerDocument.body) {
            if (child === stopAt) {
                break;
            }
            if (child.nodeType === child.ELEMENT_NODE) {
                result[resultLen++] = this.read(child);
            }
            child = child.parentElement;
        }
        const r = new Uint8Array(resultLen);
        for (let i = 0; i < resultLen; i++) {
            r[i] = result[resultLen - i - 1];
        }
        return r;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlldy92aWV3UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVwRSxNQUFNLE9BQWdCLFFBQVMsU0FBUSxnQkFBZ0I7SUFJdEQsWUFBWSxPQUFvQjtRQUMvQixLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FJRDtBQUVELE1BQU0sQ0FBTixJQUFrQixlQVlqQjtBQVpELFdBQWtCLGVBQWU7SUFDaEMscURBQUksQ0FBQTtJQUNKLHlFQUFjLENBQUE7SUFDZCwrRkFBeUIsQ0FBQTtJQUN6Qix1RUFBYSxDQUFBO0lBQ2IseUVBQWMsQ0FBQTtJQUNkLCtGQUF5QixDQUFBO0lBQ3pCLCtFQUFpQixDQUFBO0lBQ2pCLDZEQUFRLENBQUE7SUFDUiwrREFBUyxDQUFBO0lBQ1QsMkRBQU8sQ0FBQTtJQUNQLHNFQUFZLENBQUE7QUFDYixDQUFDLEVBWmlCLGVBQWUsS0FBZixlQUFlLFFBWWhDO0FBRUQsTUFBTSxPQUFPLGdCQUFnQjtJQUVyQixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQTBDLEVBQUUsTUFBdUI7UUFDdEYsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBZTtRQUNqQyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ2hCLG9DQUE0QjtRQUM3QixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQXFCLEVBQUUsTUFBZTtRQUMzRCxNQUFNLE1BQU0sR0FBc0IsRUFBRSxDQUFDO1FBQ3JDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUVsQixPQUFPLEtBQUssSUFBSSxLQUFLLEtBQUssS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwRCxJQUFJLEtBQUssS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDdEIsTUFBTTtZQUNQLENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUMzQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3hDLENBQUM7WUFDRCxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQztRQUM3QixDQUFDO1FBRUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBQ0QsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0NBQ0QifQ==