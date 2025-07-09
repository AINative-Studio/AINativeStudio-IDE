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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2hvdmVyL2hvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBNlhoRyxNQUFNLFVBQVUsbUNBQW1DLENBQUMsR0FBWTtJQUMvRCxNQUFNLFNBQVMsR0FBRyxHQUF5QyxDQUFDO0lBQzVELE9BQU8sT0FBTyxTQUFTLEtBQUssUUFBUSxJQUFJLFVBQVUsSUFBSSxTQUFTLElBQUksOEJBQThCLElBQUksU0FBUyxDQUFDO0FBQ2hILENBQUM7QUFNRCxNQUFNLFVBQVUsZ0NBQWdDLENBQUMsR0FBWTtJQUM1RCxNQUFNLFNBQVMsR0FBRyxHQUFzQyxDQUFDO0lBQ3pELE9BQU8sT0FBTyxTQUFTLEtBQUssUUFBUSxJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUM7QUFDaEUsQ0FBQztBQTBCRCwyQkFBMkIifQ==