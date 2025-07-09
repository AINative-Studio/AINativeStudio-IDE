/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../common/lifecycle.js';
let baseHoverDelegate = {
    showInstantHover: () => undefined,
    showDelayedHover: () => undefined,
    setupDelayedHover: () => Disposable.None,
    setupDelayedHoverAtMouse: () => Disposable.None,
    hideHover: () => undefined,
    showAndFocusLastHover: () => undefined,
    setupManagedHover: () => null,
    showManagedHover: () => undefined
};
/**
 * Sets the hover delegate for use **only in the `base/` layer**.
 */
export function setBaseLayerHoverDelegate(hoverDelegate) {
    baseHoverDelegate = hoverDelegate;
}
/**
 * Gets the hover delegate for use **only in the `base/` layer**.
 *
 * Since the hover service depends on various platform services, this delegate essentially bypasses
 * the standard dependency injection mechanism by injecting a global hover service at start up. The
 * only reason this should be used is if `IHoverService` is not available.
 */
export function getBaseLayerHoverDelegate() {
    return baseHoverDelegate;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJEZWxlZ2F0ZTIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2hvdmVyL2hvdmVyRGVsZWdhdGUyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUcxRCxJQUFJLGlCQUFpQixHQUFvQjtJQUN4QyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO0lBQ2pDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7SUFDakMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUk7SUFDeEMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUk7SUFDL0MsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7SUFDMUIscUJBQXFCLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztJQUN0QyxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFLO0lBQzlCLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7Q0FDakMsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHlCQUF5QixDQUFDLGFBQThCO0lBQ3ZFLGlCQUFpQixHQUFHLGFBQWEsQ0FBQztBQUNuQyxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLHlCQUF5QjtJQUN4QyxPQUFPLGlCQUFpQixDQUFDO0FBQzFCLENBQUMifQ==