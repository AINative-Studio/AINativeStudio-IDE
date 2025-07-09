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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsRWxlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdGlja3lTY3JvbGwvYnJvd3Nlci9zdGlja3lTY3JvbGxFbGVtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sT0FBTyxXQUFXO0lBQ3ZCLFlBQ2lCLGVBQXVCLEVBQ3ZCLGFBQXFCO1FBRHJCLG9CQUFlLEdBQWYsZUFBZSxDQUFRO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO0lBQ2xDLENBQUM7Q0FDTDtBQUVELE1BQU0sT0FBTyxhQUFhO0lBRXpCO0lBQ0M7O09BRUc7SUFDYSxLQUE4QjtJQUM5Qzs7TUFFRTtJQUNjLFFBQXlCO0lBQ3pDOztPQUVHO0lBQ2EsTUFBaUM7UUFSakMsVUFBSyxHQUFMLEtBQUssQ0FBeUI7UUFJOUIsYUFBUSxHQUFSLFFBQVEsQ0FBaUI7UUFJekIsV0FBTSxHQUFOLE1BQU0sQ0FBMkI7SUFFbEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFDdkIsWUFDVSxHQUFRLEVBQ1IsT0FBZSxFQUNmLE9BQWtDLEVBQ2xDLGlCQUFxQztRQUhyQyxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLFlBQU8sR0FBUCxPQUFPLENBQTJCO1FBQ2xDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7SUFDM0MsQ0FBQztDQUNMIn0=