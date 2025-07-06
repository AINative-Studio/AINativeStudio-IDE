/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ContentHoverResult {
    constructor(hoverParts, isComplete, options) {
        this.hoverParts = hoverParts;
        this.isComplete = isComplete;
        this.options = options;
    }
    filter(anchor) {
        const filteredHoverParts = this.hoverParts.filter((m) => m.isValidForHoverAnchor(anchor));
        if (filteredHoverParts.length === this.hoverParts.length) {
            return this;
        }
        return new FilteredContentHoverResult(this, filteredHoverParts, this.isComplete, this.options);
    }
}
export class FilteredContentHoverResult extends ContentHoverResult {
    constructor(original, messages, isComplete, options) {
        super(messages, isComplete, options);
        this.original = original;
    }
    filter(anchor) {
        return this.original.filter(anchor);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvY29udGVudEhvdmVyVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsTUFBTSxPQUFPLGtCQUFrQjtJQUU5QixZQUNpQixVQUF3QixFQUN4QixVQUFtQixFQUNuQixPQUFvQztRQUZwQyxlQUFVLEdBQVYsVUFBVSxDQUFjO1FBQ3hCLGVBQVUsR0FBVixVQUFVLENBQVM7UUFDbkIsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7SUFDakQsQ0FBQztJQUVFLE1BQU0sQ0FBQyxNQUFtQjtRQUNoQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMxRixJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU8sSUFBSSwwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEcsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDBCQUEyQixTQUFRLGtCQUFrQjtJQUVqRSxZQUNrQixRQUE0QixFQUM3QyxRQUFzQixFQUN0QixVQUFtQixFQUNuQixPQUFvQztRQUVwQyxLQUFLLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUxwQixhQUFRLEdBQVIsUUFBUSxDQUFvQjtJQU05QyxDQUFDO0lBRWUsTUFBTSxDQUFDLE1BQW1CO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDckMsQ0FBQztDQUNEIn0=