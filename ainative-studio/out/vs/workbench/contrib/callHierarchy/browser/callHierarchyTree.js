/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CallHierarchyModel, } from '../common/callHierarchy.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createMatches } from '../../../../base/common/filters.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { compare } from '../../../../base/common/strings.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
export class Call {
    constructor(item, locations, model, parent) {
        this.item = item;
        this.locations = locations;
        this.model = model;
        this.parent = parent;
    }
    static compare(a, b) {
        let res = compare(a.item.uri.toString(), b.item.uri.toString());
        if (res === 0) {
            res = Range.compareRangesUsingStarts(a.item.range, b.item.range);
        }
        return res;
    }
}
export class DataSource {
    constructor(getDirection) {
        this.getDirection = getDirection;
    }
    hasChildren() {
        return true;
    }
    async getChildren(element) {
        if (element instanceof CallHierarchyModel) {
            return element.roots.map(root => new Call(root, undefined, element, undefined));
        }
        const { model, item } = element;
        if (this.getDirection() === "outgoingCalls" /* CallHierarchyDirection.CallsFrom */) {
            return (await model.resolveOutgoingCalls(item, CancellationToken.None)).map(call => {
                return new Call(call.to, call.fromRanges.map(range => ({ range, uri: item.uri })), model, element);
            });
        }
        else {
            return (await model.resolveIncomingCalls(item, CancellationToken.None)).map(call => {
                return new Call(call.from, call.fromRanges.map(range => ({ range, uri: call.from.uri })), model, element);
            });
        }
    }
}
export class Sorter {
    compare(element, otherElement) {
        return Call.compare(element, otherElement);
    }
}
export class IdentityProvider {
    constructor(getDirection) {
        this.getDirection = getDirection;
    }
    getId(element) {
        let res = this.getDirection() + JSON.stringify(element.item.uri) + JSON.stringify(element.item.range);
        if (element.parent) {
            res += this.getId(element.parent);
        }
        return res;
    }
}
class CallRenderingTemplate {
    constructor(icon, label) {
        this.icon = icon;
        this.label = label;
    }
}
export class CallRenderer {
    constructor() {
        this.templateId = CallRenderer.id;
    }
    static { this.id = 'CallRenderer'; }
    renderTemplate(container) {
        container.classList.add('callhierarchy-element');
        const icon = document.createElement('div');
        container.appendChild(icon);
        const label = new IconLabel(container, { supportHighlights: true });
        return new CallRenderingTemplate(icon, label);
    }
    renderElement(node, _index, template) {
        const { element, filterData } = node;
        const deprecated = element.item.tags?.includes(1 /* SymbolTag.Deprecated */);
        template.icon.className = '';
        template.icon.classList.add('inline', ...ThemeIcon.asClassNameArray(SymbolKinds.toIcon(element.item.kind)));
        template.label.setLabel(element.item.name, element.item.detail, { labelEscapeNewLines: true, matches: createMatches(filterData), strikethrough: deprecated });
    }
    disposeTemplate(template) {
        template.label.dispose();
    }
}
export class VirtualDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(_element) {
        return CallRenderer.id;
    }
}
export class AccessibilityProvider {
    constructor(getDirection) {
        this.getDirection = getDirection;
    }
    getWidgetAriaLabel() {
        return localize('tree.aria', "Call Hierarchy");
    }
    getAriaLabel(element) {
        if (this.getDirection() === "outgoingCalls" /* CallHierarchyDirection.CallsFrom */) {
            return localize('from', "calls from {0}", element.item.name);
        }
        else {
            return localize('to', "callers of {0}", element.item.name);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbEhpZXJhcmNoeVRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2FsbEhpZXJhcmNoeS9icm93c2VyL2NhbGxIaWVyYXJjaHlUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBNkMsa0JBQWtCLEdBQUcsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU1RSxPQUFPLEVBQWMsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQXVCLE1BQU0sd0NBQXdDLENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE1BQU0sT0FBTyxJQUFJO0lBQ2hCLFlBQ1UsSUFBdUIsRUFDdkIsU0FBaUMsRUFDakMsS0FBeUIsRUFDekIsTUFBd0I7UUFIeEIsU0FBSSxHQUFKLElBQUksQ0FBbUI7UUFDdkIsY0FBUyxHQUFULFNBQVMsQ0FBd0I7UUFDakMsVUFBSyxHQUFMLEtBQUssQ0FBb0I7UUFDekIsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7SUFDOUIsQ0FBQztJQUVMLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBTyxFQUFFLENBQU87UUFDOUIsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUMs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