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
var DiffEditorInput_1;
import { localize } from '../../../nls.js';
import { AbstractSideBySideEditorInputSerializer, SideBySideEditorInput } from './sideBySideEditorInput.js';
import { TEXT_DIFF_EDITOR_ID, BINARY_DIFF_EDITOR_ID, isResourceDiffEditorInput } from '../editor.js';
import { BaseTextEditorModel } from './textEditorModel.js';
import { DiffEditorModel } from './diffEditorModel.js';
import { TextDiffEditorModel } from './textDiffEditorModel.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { shorten } from '../../../base/common/labels.js';
import { isResolvedEditorModel } from '../../../platform/editor/common/editor.js';
/**
 * The base editor input for the diff editor. It is made up of two editor inputs, the original version
 * and the modified version.
 */
let DiffEditorInput = class DiffEditorInput extends SideBySideEditorInput {
    static { DiffEditorInput_1 = this; }
    static { this.ID = 'workbench.editors.diffEditorInput'; }
    get typeId() {
        return DiffEditorInput_1.ID;
    }
    get editorId() {
        return this.modified.editorId === this.original.editorId ? this.modified.editorId : undefined;
    }
    get capabilities() {
        let capabilities = super.capabilities;
        // Force description capability depends on labels
        if (this.labels.forceDescription) {
            capabilities |= 64 /* EditorInputCapabilities.ForceDescription */;
        }
        return capabilities;
    }
    constructor(preferredName, preferredDescription, original, modified, forceOpenAsBinary, editorService) {
        super(preferredName, preferredDescription, original, modified, editorService);
        this.original = original;
        this.modified = modified;
        this.forceOpenAsBinary = forceOpenAsBinary;
        this.cachedModel = undefined;
        this.labels = this.computeLabels();
    }
    computeLabels() {
        // Name
        let name;
        let forceDescription = false;
        if (this.preferredName) {
            name = this.preferredName;
        }
        else {
            const originalName = this.original.getName();
            const modifiedName = this.modified.getName();
            name = localize('sideBySideLabels', "{0} ↔ {1}", originalName, modifiedName);
            // Enforce description when the names are identical
            forceDescription = originalName === modifiedName;
        }
        // Description
        let shortDescription;
        let mediumDescription;
        let longDescription;
        if (this.preferredDescription) {
            shortDescription = this.preferredDescription;
            mediumDescription = this.preferredDescription;
            longDescription = this.preferredDescription;
        }
        else {
            shortDescription = this.computeLabel(this.original.getDescription(0 /* Verbosity.SHORT */), this.modified.getDescription(0 /* Verbosity.SHORT */));
            longDescription = this.computeLabel(this.original.getDescription(2 /* Verbosity.LONG */), this.modified.getDescription(2 /* Verbosity.LONG */));
            // Medium Description: try to be verbose by computing
            // a label that resembles the difference between the two
            const originalMediumDescription = this.original.getDescription(1 /* Verbosity.MEDIUM */);
            const modifiedMediumDescription = this.modified.getDescription(1 /* Verbosity.MEDIUM */);
            if ((typeof originalMediumDescription === 'string' && typeof modifiedMediumDescription === 'string') && // we can only `shorten` when both sides are strings...
                (originalMediumDescription || modifiedMediumDescription) // ...however never when both sides are empty strings
            ) {
                const [shortenedOriginalMediumDescription, shortenedModifiedMediumDescription] = shorten([originalMediumDescription, modifiedMediumDescription]);
                mediumDescription = this.computeLabel(shortenedOriginalMediumDescription, shortenedModifiedMediumDescription);
            }
        }
        // Title
        let shortTitle = this.computeLabel(this.original.getTitle(0 /* Verbosity.SHORT */) ?? this.original.getName(), this.modified.getTitle(0 /* Verbosity.SHORT */) ?? this.modified.getName(), ' ↔ ');
        let mediumTitle = this.computeLabel(this.original.getTitle(1 /* Verbosity.MEDIUM */) ?? this.original.getName(), this.modified.getTitle(1 /* Verbosity.MEDIUM */) ?? this.modified.getName(), ' ↔ ');
        let longTitle = this.computeLabel(this.original.getTitle(2 /* Verbosity.LONG */) ?? this.original.getName(), this.modified.getTitle(2 /* Verbosity.LONG */) ?? this.modified.getName(), ' ↔ ');
        const preferredTitle = this.getPreferredTitle();
        if (preferredTitle) {
            shortTitle = `${preferredTitle} (${shortTitle})`;
            mediumTitle = `${preferredTitle} (${mediumTitle})`;
            longTitle = `${preferredTitle} (${longTitle})`;
        }
        return { name, shortDescription, mediumDescription, longDescription, forceDescription, shortTitle, mediumTitle, longTitle };
    }
    computeLabel(originalLabel, modifiedLabel, separator = ' - ') {
        if (!originalLabel || !modifiedLabel) {
            return undefined;
        }
        if (originalLabel === modifiedLabel) {
            return modifiedLabel;
        }
        return `${originalLabel}${separator}${modifiedLabel}`;
    }
    getName() {
        return this.labels.name;
    }
    getDescription(verbosity = 1 /* Verbosity.MEDIUM */) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.labels.shortDescription;
            case 2 /* Verbosity.LONG */:
                return this.labels.longDescription;
            case 1 /* Verbosity.MEDIUM */:
            default:
                return this.labels.mediumDescription;
        }
    }
    getTitle(verbosity) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.labels.shortTitle;
            case 2 /* Verbosity.LONG */:
                return this.labels.longTitle;
            default:
            case 1 /* Verbosity.MEDIUM */:
                return this.labels.mediumTitle;
        }
    }
    async resolve() {
        // Create Model - we never reuse our cached model if refresh is true because we cannot
        // decide for the inputs within if the cached model can be reused or not. There may be
        // inputs that need to be loaded again and thus we always recreate the model and dispose
        // the previous one - if any.
        const resolvedModel = await this.createModel();
        this.cachedModel?.dispose();
        this.cachedModel = resolvedModel;
        return this.cachedModel;
    }
    prefersEditorPane(editorPanes) {
        if (this.forceOpenAsBinary) {
            return editorPanes.find(editorPane => editorPane.typeId === BINARY_DIFF_EDITOR_ID);
        }
        return editorPanes.find(editorPane => editorPane.typeId === TEXT_DIFF_EDITOR_ID);
    }
    async createModel() {
        // Join resolve call over two inputs and build diff editor model
        const [originalEditorModel, modifiedEditorModel] = await Promise.all([
            this.original.resolve(),
            this.modified.resolve()
        ]);
        // If both are text models, return textdiffeditor model
        if (modifiedEditorModel instanceof BaseTextEditorModel && originalEditorModel instanceof BaseTextEditorModel) {
            return new TextDiffEditorModel(originalEditorModel, modifiedEditorModel);
        }
        // Otherwise return normal diff model
        return new DiffEditorModel(isResolvedEditorModel(originalEditorModel) ? originalEditorModel : undefined, isResolvedEditorModel(modifiedEditorModel) ? modifiedEditorModel : undefined);
    }
    toUntyped(options) {
        const untyped = super.toUntyped(options);
        if (untyped) {
            return {
                ...untyped,
                modified: untyped.primary,
                original: untyped.secondary
            };
        }
        return undefined;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof DiffEditorInput_1) {
            return this.modified.matches(otherInput.modified) && this.original.matches(otherInput.original) && otherInput.forceOpenAsBinary === this.forceOpenAsBinary;
        }
        if (isResourceDiffEditorInput(otherInput)) {
            return this.modified.matches(otherInput.modified) && this.original.matches(otherInput.original);
        }
        return false;
    }
    dispose() {
        // Free the diff editor model but do not propagate the dispose() call to the two inputs
        // We never created the two inputs (original and modified) so we can not dispose
        // them without sideeffects.
        if (this.cachedModel) {
            this.cachedModel.dispose();
            this.cachedModel = undefined;
        }
        super.dispose();
    }
};
DiffEditorInput = DiffEditorInput_1 = __decorate([
    __param(5, IEditorService)
], DiffEditorInput);
export { DiffEditorInput };
export class DiffEditorInputSerializer extends AbstractSideBySideEditorInputSerializer {
    createEditorInput(instantiationService, name, description, secondaryInput, primaryInput) {
        return instantiationService.createInstance(DiffEditorInput, name, description, secondaryInput, primaryInput, undefined);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL2RpZmZFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRzVHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBNEYseUJBQXlCLEVBQTZFLE1BQU0sY0FBYyxDQUFDO0FBQzFRLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUUvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBZ0JsRjs7O0dBR0c7QUFDSSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLHFCQUFxQjs7YUFFaEMsT0FBRSxHQUFXLG1DQUFtQyxBQUE5QyxDQUErQztJQUUxRSxJQUFhLE1BQU07UUFDbEIsT0FBTyxpQkFBZSxDQUFDLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBYSxRQUFRO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMs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