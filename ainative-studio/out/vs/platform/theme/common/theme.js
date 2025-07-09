/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Color scheme used by the OS and by color themes.
 */
export var ColorScheme;
(function (ColorScheme) {
    ColorScheme["DARK"] = "dark";
    ColorScheme["LIGHT"] = "light";
    ColorScheme["HIGH_CONTRAST_DARK"] = "hcDark";
    ColorScheme["HIGH_CONTRAST_LIGHT"] = "hcLight";
})(ColorScheme || (ColorScheme = {}));
export var ThemeTypeSelector;
(function (ThemeTypeSelector) {
    ThemeTypeSelector["VS"] = "vs";
    ThemeTypeSelector["VS_DARK"] = "vs-dark";
    ThemeTypeSelector["HC_BLACK"] = "hc-black";
    ThemeTypeSelector["HC_LIGHT"] = "hc-light";
})(ThemeTypeSelector || (ThemeTypeSelector = {}));
export function isHighContrast(scheme) {
    return scheme === ColorScheme.HIGH_CONTRAST_DARK || scheme === ColorScheme.HIGH_CONTRAST_LIGHT;
}
export function isDark(scheme) {
    return scheme === ColorScheme.DARK || scheme === ColorScheme.HIGH_CONTRAST_DARK;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvY29tbW9uL3RoZW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksV0FLWDtBQUxELFdBQVksV0FBVztJQUN0Qiw0QkFBYSxDQUFBO0lBQ2IsOEJBQWUsQ0FBQTtJQUNmLDRDQUE2QixDQUFBO0lBQzdCLDhDQUErQixDQUFBO0FBQ2hDLENBQUMsRUFMVyxXQUFXLEtBQVgsV0FBVyxRQUt0QjtBQUVELE1BQU0sQ0FBTixJQUFZLGlCQUtYO0FBTEQsV0FBWSxpQkFBaUI7SUFDNUIsOEJBQVMsQ0FBQTtJQUNULHdDQUFtQixDQUFBO0lBQ25CLDBDQUFxQixDQUFBO0lBQ3JCLDBDQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFMVyxpQkFBaUIsS0FBakIsaUJBQWlCLFFBSzVCO0FBR0QsTUFBTSxVQUFVLGNBQWMsQ0FBQyxNQUFtQjtJQUNqRCxPQUFPLE1BQU0sS0FBSyxXQUFXLENBQUMsa0JBQWtCLElBQUksTUFBTSxLQUFLLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQztBQUNoRyxDQUFDO0FBRUQsTUFBTSxVQUFVLE1BQU0sQ0FBQyxNQUFtQjtJQUN6QyxPQUFPLE1BQU0sS0FBSyxXQUFXLENBQUMsSUFBSSxJQUFJLE1BQU0sS0FBSyxXQUFXLENBQUMsa0JBQWtCLENBQUM7QUFDakYsQ0FBQyJ9