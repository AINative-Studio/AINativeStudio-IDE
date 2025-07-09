/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isLocalizedString(thing) {
    return thing
        && typeof thing === 'object'
        && typeof thing.original === 'string'
        && typeof thing.value === 'string';
}
export function isICommandActionToggleInfo(thing) {
    return thing ? thing.condition !== undefined : false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbi9jb21tb24vYWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBcUJoRyxNQUFNLFVBQVUsaUJBQWlCLENBQUMsS0FBVTtJQUMzQyxPQUFPLEtBQUs7V0FDUixPQUFPLEtBQUssS0FBSyxRQUFRO1dBQ3pCLE9BQU8sS0FBSyxDQUFDLFFBQVEsS0FBSyxRQUFRO1dBQ2xDLE9BQU8sS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUM7QUFDckMsQ0FBQztBQWtDRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsS0FBa0U7SUFDNUcsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUE0QixLQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ2xGLENBQUMifQ==