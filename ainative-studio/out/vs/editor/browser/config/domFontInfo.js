/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FastDomNode } from '../../../base/browser/fastDomNode.js';
export function applyFontInfo(domNode, fontInfo) {
    if (domNode instanceof FastDomNode) {
        domNode.setFontFamily(fontInfo.getMassagedFontFamily());
        domNode.setFontWeight(fontInfo.fontWeight);
        domNode.setFontSize(fontInfo.fontSize);
        domNode.setFontFeatureSettings(fontInfo.fontFeatureSettings);
        domNode.setFontVariationSettings(fontInfo.fontVariationSettings);
        domNode.setLineHeight(fontInfo.lineHeight);
        domNode.setLetterSpacing(fontInfo.letterSpacing);
    }
    else {
        domNode.style.fontFamily = fontInfo.getMassagedFontFamily();
        domNode.style.fontWeight = fontInfo.fontWeight;
        domNode.style.fontSize = fontInfo.fontSize + 'px';
        domNode.style.fontFeatureSettings = fontInfo.fontFeatureSettings;
        domNode.style.fontVariationSettings = fontInfo.fontVariationSettings;
        domNode.style.lineHeight = fontInfo.lineHeight + 'px';
        domNode.style.letterSpacing = fontInfo.letterSpacing + 'px';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tRm9udEluZm8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29uZmlnL2RvbUZvbnRJbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUduRSxNQUFNLFVBQVUsYUFBYSxDQUFDLE9BQStDLEVBQUUsUUFBc0I7SUFDcEcsSUFBSSxPQUFPLFlBQVksV0FBVyxFQUFFLENBQUM7UUFDcEMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzNDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM3RCxPQUFPLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDakUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDM0MsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNsRCxDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzVELE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUM7UUFDL0MsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDbEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxRQUFRLENBQUMsbUJBQW1CLENBQUM7UUFDakUsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxRQUFRLENBQUMscUJBQXFCLENBQUM7UUFDckUsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7SUFDN0QsQ0FBQztBQUNGLENBQUMifQ==