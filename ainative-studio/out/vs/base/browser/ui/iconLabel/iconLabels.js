/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { ThemeIcon } from '../../../common/themables.js';
const labelWithIconsRegex = new RegExp(`(\\\\)?\\$\\((${ThemeIcon.iconNameExpression}(?:${ThemeIcon.iconModifierExpression})?)\\)`, 'g');
export function renderLabelWithIcons(text) {
    const elements = new Array();
    let match;
    let textStart = 0, textStop = 0;
    while ((match = labelWithIconsRegex.exec(text)) !== null) {
        textStop = match.index || 0;
        if (textStart < textStop) {
            elements.push(text.substring(textStart, textStop));
        }
        textStart = (match.index || 0) + match[0].length;
        const [, escaped, codicon] = match;
        elements.push(escaped ? `$(${codicon})` : renderIcon({ id: codicon }));
    }
    if (textStart < text.length) {
        elements.push(text.substring(textStart));
    }
    return elements;
}
export function renderIcon(icon) {
    const node = dom.$(`span`);
    node.classList.add(...ThemeIcon.asClassNameArray(icon));
    return node;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvaWNvbkxhYmVsL2ljb25MYWJlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUM7QUFDcEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXpELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxNQUFNLENBQUMsaUJBQWlCLFNBQVMsQ0FBQyxrQkFBa0IsTUFBTSxTQUFTLENBQUMsc0JBQXNCLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN6SSxNQUFNLFVBQVUsb0JBQW9CLENBQUMsSUFBWTtJQUNoRCxNQUFNLFFBQVEsR0FBRyxJQUFJLEtBQUssRUFBNEIsQ0FBQztJQUN2RCxJQUFJLEtBQTZCLENBQUM7SUFFbEMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDaEMsT0FBTyxDQUFDLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUMxRCxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxTQUFTLEdBQUcsUUFBUSxFQUFFLENBQUM7WUFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFDRCxTQUFTLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFFakQsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUNuQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBRUQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNqQixDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFlO0lBQ3pDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN4RCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMifQ==