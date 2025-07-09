/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TypeHierarchyModel } from '../common/typeHierarchy.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createMatches } from '../../../../base/common/filters.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { compare } from '../../../../base/common/strings.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
export class Type {
    constructor(item, model, parent) {
        this.item = item;
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
        if (element instanceof TypeHierarchyModel) {
            return element.roots.map(root => new Type(root, element, undefined));
        }
        const { model, item } = element;
        if (this.getDirection() === "supertypes" /* TypeHierarchyDirection.Supertypes */) {
            return (await model.provideSupertypes(item, CancellationToken.None)).map(item => {
                return new Type(item, model, element);
            });
        }
        else {
            return (await model.provideSubtypes(item, CancellationToken.None)).map(item => {
                return new Type(item, model, element);
            });
        }
    }
}
export class Sorter {
    compare(element, otherElement) {
        return Type.compare(element, otherElement);
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
class TypeRenderingTemplate {
    constructor(icon, label) {
        this.icon = icon;
        this.label = label;
    }
}
export class TypeRenderer {
    constructor() {
        this.templateId = TypeRenderer.id;
    }
    static { this.id = 'TypeRenderer'; }
    renderTemplate(container) {
        container.classList.add('typehierarchy-element');
        const icon = document.createElement('div');
        container.appendChild(icon);
        const label = new IconLabel(container, { supportHighlights: true });
        return new TypeRenderingTemplate(icon, label);
    }
    renderElement(node, _index, template) {
        const { element, filterData } = node;
        const deprecated = element.item.tags?.includes(1 /* SymbolTag.Deprecated */);
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
        return TypeRenderer.id;
    }
}
export class AccessibilityProvider {
    constructor(getDirection) {
        this.getDirection = getDirection;
    }
    getWidgetAriaLabel() {
        return localize('tree.aria', "Type Hierarchy");
    }
    getAriaLabel(element) {
        if (this.getDirection() === "supertypes" /* TypeHierarchyDirection.Supertypes */) {
            return localize('supertypes', "supertypes of {0}", element.item.name);
        }
        else {
            return localize('subtypes', "subtypes of {0}", element.item.name);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUhpZXJhcmNoeVRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdHlwZUhpZXJhcmNoeS9icm93c2VyL3R5cGVIaWVyYXJjaHlUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBNkMsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU1RSxPQUFPLEVBQWMsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQWEsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsTUFBTSxPQUFPLElBQUk7SUFDaEIsWUFDVSxJQUF1QixFQUN2QixLQUF5QixFQUN6QixNQUF3QjtRQUZ4QixTQUFJLEdBQUosSUFBSSxDQUFtQjtRQUN2QixVQUFLLEdBQUwsS0FBSyxDQUFvQjtRQUN6QixXQUFNLEdBQU4sTUFBTSxDQUFrQjtJQUM5QixDQUFDO0lBRUwsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFPLEVBQUUsQ0FBTztRQUM5QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUs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