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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FileReferencesRenderer_1;
import * as dom from '../../../../../base/browser/dom.js';
import { CountBadge } from '../../../../../base/browser/ui/countBadge/countBadge.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { IconLabel } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { createMatches, FuzzyScore } from '../../../../../base/common/filters.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { basename, dirname } from '../../../../../base/common/resources.js';
import { ITextModelService } from '../../../../common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { defaultCountBadgeStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { FileReferences, OneReference, ReferencesModel } from '../referencesModel.js';
let DataSource = class DataSource {
    constructor(_resolverService) {
        this._resolverService = _resolverService;
    }
    hasChildren(element) {
        if (element instanceof ReferencesModel) {
            return true;
        }
        if (element instanceof FileReferences) {
            return true;
        }
        return false;
    }
    getChildren(element) {
        if (element instanceof ReferencesModel) {
            return element.groups;
        }
        if (element instanceof FileReferences) {
            return element.resolve(this._resolverService).then(val => {
                // if (element.failure) {
                // 	// refresh the element on failure so that
                // 	// we can update its rendering
                // 	return tree.refresh(element).then(() => val.children);
                // }
                return val.children;
            });
        }
        throw new Error('bad tree');
    }
};
DataSource = __decorate([
    __param(0, ITextModelService)
], DataSource);
export { DataSource };
//#endregion
export class Delegate {
    getHeight() {
        return 23;
    }
    getTemplateId(element) {
        if (element instanceof FileReferences) {
            return FileReferencesRenderer.id;
        }
        else {
            return OneReferenceRenderer.id;
        }
    }
}
let StringRepresentationProvider = class StringRepresentationProvider {
    constructor(_keybindingService) {
        this._keybindingService = _keybindingService;
    }
    getKeyboardNavigationLabel(element) {
        if (element instanceof OneReference) {
            const parts = element.parent.getPreview(element)?.preview(element.range);
            if (parts) {
                return parts.value;
            }
        }
        // FileReferences or unresolved OneReference
        return basename(element.uri);
    }
    mightProducePrintableCharacter(event) {
        return this._keybindingService.mightProducePrintableCharacter(event);
    }
};
StringRepresentationProvider = __decorate([
    __param(0, IKeybindingService)
], StringRepresentationProvider);
export { StringRepresentationProvider };
export class IdentityProvider {
    getId(element) {
        return element instanceof OneReference ? element.id : element.uri;
    }
}
//#region render: File
let FileReferencesTemplate = class FileReferencesTemplate extends Disposable {
    constructor(container, _labelService) {
        super();
        this._labelService = _labelService;
        const parent = document.createElement('div');
        parent.classList.add('reference-file');
        this.file = this._register(new IconLabel(parent, { supportHighlights: true }));
        this.badge = this._register(new CountBadge(dom.append(parent, dom.$('.count')), {}, defaultCountBadgeStyles));
        container.appendChild(parent);
    }
    set(element, matches) {
        const parent = dirname(element.uri);
        this.file.setLabel(this._labelService.getUriBasenameLabel(element.uri), this._labelService.getUriLabel(parent, { relative: true }), { title: this._labelService.getUriLabel(element.uri), matches });
        const len = element.children.length;
        this.badge.setCount(len);
        if (len > 1) {
            this.badge.setTitleFormat(localize('referencesCount', "{0} references", len));
        }
        else {
            this.badge.setTitleFormat(localize('referenceCount', "{0} reference", len));
        }
    }
};
FileReferencesTemplate = __decorate([
    __param(1, ILabelService)
], FileReferencesTemplate);
let FileReferencesRenderer = class FileReferencesRenderer {
    static { FileReferencesRenderer_1 = this; }
    static { this.id = 'FileReferencesRenderer'; }
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
        this.templateId = FileReferencesRenderer_1.id;
    }
    renderTemplate(container) {
        return this._instantiationService.createInstance(FileReferencesTemplate, container);
    }
    renderElement(node, index, template) {
        template.set(node.element, createMatches(node.filterData));
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
};
FileReferencesRenderer = FileReferencesRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], FileReferencesRenderer);
export { FileReferencesRenderer };
//#endregion
//#region render: Reference
class OneReferenceTemplate extends Disposable {
    constructor(container) {
        super();
        this.label = this._register(new HighlightedLabel(container));
    }
    set(element, score) {
        const preview = element.parent.getPreview(element)?.preview(element.range);
        if (!preview || !preview.value) {
            // this means we FAILED to resolve the document or the value is the empty string
            this.label.set(`${basename(element.uri)}:${element.range.startLineNumber + 1}:${element.range.startColumn + 1}`);
        }
        else {
            // render search match as highlight unless
            // we have score, then render the score
            const { value, highlight } = preview;
            if (score && !FuzzyScore.isDefault(score)) {
                this.label.element.classList.toggle('referenceMatch', false);
                this.label.set(value, createMatches(score));
            }
            else {
                this.label.element.classList.toggle('referenceMatch', true);
                this.label.set(value, [highlight]);
            }
        }
    }
}
export class OneReferenceRenderer {
    constructor() {
        this.templateId = OneReferenceRenderer.id;
    }
    static { this.id = 'OneReferenceRenderer'; }
    renderTemplate(container) {
        return new OneReferenceTemplate(container);
    }
    renderElement(node, index, templateData) {
        templateData.set(node.element, node.filterData);
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
}
//#endregion
export class AccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('treeAriaLabel', "References");
    }
    getAriaLabel(element) {
        return element.ariaMessage;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc1RyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZ290b1N5bWJvbC9icm93c2VyL3BlZWsvcmVmZXJlbmNlc1RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFFMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUlsRixPQUFPLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBVSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFNL0UsSUFBTSxV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