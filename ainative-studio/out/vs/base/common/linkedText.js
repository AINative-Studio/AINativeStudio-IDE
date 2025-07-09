/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { memoize } from './decorators.js';
export class LinkedText {
    constructor(nodes) {
        this.nodes = nodes;
    }
    toString() {
        return this.nodes.map(node => typeof node === 'string' ? node : node.label).join('');
    }
}
__decorate([
    memoize
], LinkedText.prototype, "toString", null);
const LINK_REGEX = /\[([^\]]+)\]\(((?:https?:\/\/|command:|file:)[^\)\s]+)(?: (["'])(.+?)(\3))?\)/gi;
export function parseLinkedText(text) {
    const result = [];
    let index = 0;
    let match;
    while (match = LINK_REGEX.exec(text)) {
        if (match.index - index > 0) {
            result.push(text.substring(index, match.index));
        }
        const [, label, href, , title] = match;
        if (title) {
            result.push({ label, href, title });
        }
        else {
            result.push({ label, href });
        }
        index = match.index + match[0].length;
    }
    if (index < text.length) {
        result.push(text.substring(index));
    }
    return new LinkedText(result);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkVGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9saW5rZWRUZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQVUxQyxNQUFNLE9BQU8sVUFBVTtJQUV0QixZQUFxQixLQUF1QjtRQUF2QixVQUFLLEdBQUwsS0FBSyxDQUFrQjtJQUFJLENBQUM7SUFHakQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN0RixDQUFDO0NBQ0Q7QUFIQTtJQURDLE9BQU87MENBR1A7QUFHRixNQUFNLFVBQVUsR0FBRyxpRkFBaUYsQ0FBQztBQUVyRyxNQUFNLFVBQVUsZUFBZSxDQUFDLElBQVk7SUFDM0MsTUFBTSxNQUFNLEdBQXFCLEVBQUUsQ0FBQztJQUVwQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDZCxJQUFJLEtBQTZCLENBQUM7SUFFbEMsT0FBTyxLQUFLLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3RDLElBQUksS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0IsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxBQUFELEVBQUcsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBRXZDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDL0IsQ0FBQyJ9