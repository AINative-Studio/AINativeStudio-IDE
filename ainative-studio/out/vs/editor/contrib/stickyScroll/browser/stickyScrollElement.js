/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class StickyRange {
    constructor(startLineNumber, endLineNumber) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
    }
}
export class StickyElement {
    constructor(
    /**
     * Range of line numbers spanned by the current scope
     */
    range, 
    /**
     * Must be sorted by start line number
    */
    children, 
    /**
     * Parent sticky outline element
     */
    parent) {
        this.range = range;
        this.children = children;
        this.parent = parent;
    }
}
export class StickyModel {
    constructor(uri, version, element, outlineProviderId) {
        this.uri = uri;
        this.version = version;
        this.element = element;
        this.outlineProviderId = outlineProviderId;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsRWxlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3RpY2t5U2Nyb2xsL2Jyb3dzZXIvc3RpY2t5U2Nyb2xsRWxlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNpQixlQUF1QixFQUN2QixhQUFxQjtRQURyQixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBUTtJQUNsQyxDQUFDO0NBQ0w7QUFFRCxNQUFNLE9BQU8sYUFBYTtJQUV6QjtJQUNDOztPQUVHO0lBQ2EsS0FBOEI7SUFDOUM7O01BRUU7SUFDYyxRQUF5QjtJQUN6Qzs7T0FFRztJQUNhLE1BQWlDO1FBUmpDLFVBQUssR0FBTCxLQUFLLENBQXlCO1FBSTlCLGFBQVEsR0FBUixRQUFRLENBQWlCO1FBSXpCLFdBQU0sR0FBTixNQUFNLENBQTJCO0lBRWxELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFXO0lBQ3ZCLFlBQ1UsR0FBUSxFQUNSLE9BQWUsRUFDZixPQUFrQyxFQUNsQyxpQkFBcUM7UUFIckMsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixZQUFPLEdBQVAsT0FBTyxDQUEyQjtRQUNsQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO0lBQzNDLENBQUM7Q0FDTCJ9