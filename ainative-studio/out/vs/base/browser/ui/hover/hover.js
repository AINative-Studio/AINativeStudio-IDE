/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isManagedHoverTooltipMarkdownString(obj) {
    const candidate = obj;
    return typeof candidate === 'object' && 'markdown' in candidate && 'markdownNotSupportedFallback' in candidate;
}
export function isManagedHoverTooltipHTMLElement(obj) {
    const candidate = obj;
    return typeof candidate === 'object' && 'element' in candidate;
}
// #endregion Managed hover
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvaG92ZXIvaG92ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUE2WGhHLE1BQU0sVUFBVSxtQ0FBbUMsQ0FBQyxHQUFZO0lBQy9ELE1BQU0sU0FBUyxHQUFHLEdBQXlDLENBQUM7SUFDNUQsT0FBTyxPQUFPLFNBQVMsS0FBSyxRQUFRLElBQUksVUFBVSxJQUFJLFNBQVMsSUFBSSw4QkFBOEIsSUFBSSxTQUFTLENBQUM7QUFDaEgsQ0FBQztBQU1ELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FBQyxHQUFZO0lBQzVELE1BQU0sU0FBUyxHQUFHLEdBQXNDLENBQUM7SUFDekQsT0FBTyxPQUFPLFNBQVMsS0FBSyxRQUFRLElBQUksU0FBUyxJQUFJLFNBQVMsQ0FBQztBQUNoRSxDQUFDO0FBMEJELDJCQUEyQiJ9