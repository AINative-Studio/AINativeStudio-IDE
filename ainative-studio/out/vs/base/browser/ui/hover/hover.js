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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9ob3Zlci9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQTZYaEcsTUFBTSxVQUFVLG1DQUFtQyxDQUFDLEdBQVk7SUFDL0QsTUFBTSxTQUFTLEdBQUcsR0FBeUMsQ0FBQztJQUM1RCxPQUFPLE9BQU8sU0FBUyxLQUFLLFFBQVEsSUFBSSxVQUFVLElBQUksU0FBUyxJQUFJLDhCQUE4QixJQUFJLFNBQVMsQ0FBQztBQUNoSCxDQUFDO0FBTUQsTUFBTSxVQUFVLGdDQUFnQyxDQUFDLEdBQVk7SUFDNUQsTUFBTSxTQUFTLEdBQUcsR0FBc0MsQ0FBQztJQUN6RCxPQUFPLE9BQU8sU0FBUyxLQUFLLFFBQVEsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDO0FBQ2hFLENBQUM7QUEwQkQsMkJBQTJCIn0=