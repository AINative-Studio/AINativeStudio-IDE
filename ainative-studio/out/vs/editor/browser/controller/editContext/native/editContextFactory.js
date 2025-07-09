/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var EditContext;
(function (EditContext) {
    /**
     * Create an edit context.
     */
    function create(window, options) {
        return new window.EditContext(options);
    }
    EditContext.create = create;
})(EditContext || (EditContext = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdENvbnRleHRGYWN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvbmF0aXZlL2VkaXRDb250ZXh0RmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxNQUFNLEtBQVcsV0FBVyxDQVEzQjtBQVJELFdBQWlCLFdBQVc7SUFFM0I7O09BRUc7SUFDSCxTQUFnQixNQUFNLENBQUMsTUFBYyxFQUFFLE9BQXlCO1FBQy9ELE9BQU8sSUFBSyxNQUFjLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFGZSxrQkFBTSxTQUVyQixDQUFBO0FBQ0YsQ0FBQyxFQVJnQixXQUFXLEtBQVgsV0FBVyxRQVEzQiJ9