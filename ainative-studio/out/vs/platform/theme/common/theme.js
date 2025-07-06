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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2NvbW1vbi90aGVtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLFdBS1g7QUFMRCxXQUFZLFdBQVc7SUFDdEIsNEJBQWEsQ0FBQTtJQUNiLDhCQUFlLENBQUE7SUFDZiw0Q0FBNkIsQ0FBQTtJQUM3Qiw4Q0FBK0IsQ0FBQTtBQUNoQyxDQUFDLEVBTFcsV0FBVyxLQUFYLFdBQVcsUUFLdEI7QUFFRCxNQUFNLENBQU4sSUFBWSxpQkFLWDtBQUxELFdBQVksaUJBQWlCO0lBQzVCLDhCQUFTLENBQUE7SUFDVCx3Q0FBbUIsQ0FBQTtJQUNuQiwwQ0FBcUIsQ0FBQTtJQUNyQiwwQ0FBcUIsQ0FBQTtBQUN0QixDQUFDLEVBTFcsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUs1QjtBQUdELE1BQU0sVUFBVSxjQUFjLENBQUMsTUFBbUI7SUFDakQsT0FBTyxNQUFNLEtBQUssV0FBVyxDQUFDLGtCQUFrQixJQUFJLE1BQU0sS0FBSyxXQUFXLENBQUMsbUJBQW1CLENBQUM7QUFDaEcsQ0FBQztBQUVELE1BQU0sVUFBVSxNQUFNLENBQUMsTUFBbUI7SUFDekMsT0FBTyxNQUFNLEtBQUssV0FBVyxDQUFDLElBQUksSUFBSSxNQUFNLEtBQUssV0FBVyxDQUFDLGtCQUFrQixDQUFDO0FBQ2pGLENBQUMifQ==