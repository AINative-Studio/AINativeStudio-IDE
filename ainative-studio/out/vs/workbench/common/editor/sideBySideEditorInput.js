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
var SideBySideEditorInput_1;
import { Event } from '../../../base/common/event.js';
import { localize } from '../../../nls.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { EditorExtensions, isResourceSideBySideEditorInput, isDiffEditorInput, isResourceDiffEditorInput, findViewStateForEditor, isEditorInput, isResourceEditorInput, isResourceMergeEditorInput, isResourceMultiDiffEditorInput } from '../editor.js';
import { EditorInput } from './editorInput.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
/**
 * Side by side editor inputs that have a primary and secondary side.
 */
let SideBySideEditorInput = class SideBySideEditorInput extends EditorInput {
    static { SideBySideEditorInput_1 = this; }
    static { this.ID = 'workbench.editorinputs.sidebysideEditorInput'; }
    get typeId() {
        return SideBySideEditorInput_1.ID;
    }
    get capabilities() {
        // Use primary capabilities as main capabilities...
        let capabilities = this.primary.capabilities;
        // ...with the exception of `CanSplitInGroup` which
        // is only relevant to single editors.
        capabilities &= ~32 /* EditorInputCapabilities.CanSplitInGroup */;
        // Trust: should be considered for both sides
        if (this.secondary.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */)) {
            capabilities |= 16 /* EditorInputCapabilities.RequiresTrust */;
        }
        // Singleton: should be considered for both sides
        if (this.secondary.hasCapability(8 /* EditorInputCapabilities.Singleton */)) {
            capabilities |= 8 /* EditorInputCapabilities.Singleton */;
        }
        // Indicate we show more than one editor
        capabilities |= 256 /* EditorInputCapabilities.MultipleEditors */;
        return capabilities;
    }
    get resource() {
        if (this.hasIdenticalSides) {
            // pretend to be just primary side when being asked for a resource
            // in case both sides are the same. this can help when components
            // want to identify this input among others (e.g. in history).
            return this.primary.resource;
        }
        return undefined;
    }
    constructor(preferredName, preferredDescription, secondary, primary, editorService) {
        super();
        this.preferredName = preferredName;
        this.preferredDescription = preferredDescription;
        this.secondary = secondary;
        this.primary = primary;
        this.editorService = editorService;
        this.hasIdenticalSides = this.primary.matches(this.secondary);
        this.registerListeners();
    }
    registerListeners() {
        // When the primary or secondary input gets disposed, dispose this diff editor input
        this._register(Event.once(Event.any(this.primary.onWillDispose, this.secondary.onWillDispose))(() => {
            if (!this.isDisposed()) {
                this.dispose();
            }
        }));
        // Re-emit some events from the primary side to the outside
        this._register(this.primary.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
        // Re-emit some events from both sides to the outside
        this._register(this.primary.onDidChangeCapabilities(() => this._onDidChangeCapabilities.fire()));
        this._register(this.secondary.onDidChangeCapabilities(() => this._onDidChangeCapabilities.fire()));
        this._register(this.primary.onDidChangeLabel(() => this._onDidChangeLabel.fire()));
        this._register(this.secondary.onDidChangeLabel(() => this._onDidChangeLabel.fire()));
    }
    getName() {
        const preferredName = this.getPreferredName();
        if (preferredName) {
            return preferredName;
        }
        if (this.hasIdenticalSides) {
            return this.primary.getName(); // keep name concise when same editor is opened side by side
        }
        return localize('sideBySideLabels', "{0} - {1}", this.secondary.getName(), this.primary.getName());
    }
    getPreferredName() {
        return this.preferredName;
    }
    getDescription(verbosity) {
        const preferredDescription = this.getPreferredDescription();
        if (preferredDescription) {
            return preferredDescription;
        }
        if (this.hasIdenticalSides) {
            return this.primary.getDescription(verbosity);
        }
        return super.getDescription(verbosity);
    }
    getPreferredDescription() {
        return this.preferredDescription;
    }
    getTitle(verbosity) {
        let title;
        if (this.hasIdenticalSides) {
            title = this.primary.getTitle(verbosity) ?? this.getName();
        }
        else {
            title = super.getTitle(verbosity);
        }
        const preferredTitle = this.getPreferredTitle();
        if (preferredTitle) {
            title = `${preferredTitle} (${title})`;
        }
        return title;
    }
    getPreferredTitle() {
        if (this.preferredName && this.preferredDescription) {
            return `${this.preferredName} ${this.preferredDescription}`;
        }
        if (this.preferredName || this.preferredDescription) {
            return this.preferredName ?? this.preferredDescription;
        }
        return undefined;
    }
    getLabelExtraClasses() {
        if (this.hasIdenticalSides) {
            return this.primary.getLabelExtraClasses();
        }
        return super.getLabelExtraClasses();
    }
    getAriaLabel() {
        if (this.hasIdenticalSides) {
            return this.primary.getAriaLabel();
        }
        return super.getAriaLabel();
    }
    getTelemetryDescriptor() {
        const descriptor = this.primary.getTelemetryDescriptor();
        return { ...descriptor, ...super.getTelemetryDescriptor() };
    }
    isDirty() {
        return this.primary.isDirty();
    }
    isSaving() {
        return this.primary.isSaving();
    }
    async save(group, options) {
        const primarySaveResult = await this.primary.save(group, options);
        return this.saveResultToEditor(primarySaveResult);
    }
    async saveAs(group, options) {
        const primarySaveResult = await this.primary.saveAs(group, options);
        return this.saveResultToEditor(primarySaveResult);
    }
    saveResultToEditor(primarySaveResult) {
        if (!primarySaveResult || !this.hasIdenticalSides) {
            return primarySaveResult;
        }
        if (this.primary.matches(primarySaveResult)) {
            return this;
        }
        if (primarySaveResult instanceof EditorInput) {
            return new SideBySideEditorInput_1(this.preferredName, this.preferredDescription, primarySaveResult, primarySaveResult, this.editorService);
        }
        if (!isResourceDiffEditorInput(primarySaveResult) && !isResourceMultiDiffEditorInput(primarySaveResult) && !isResourceSideBySideEditorInput(primarySaveResult) && !isResourceMergeEditorInput(primarySaveResult)) {
            return {
                primary: primarySaveResult,
                secondary: primarySaveResult,
                label: this.preferredName,
                description: this.preferredDescription
            };
        }
        return undefined;
    }
    revert(group, options) {
        return this.primary.revert(group, options);
    }
    async rename(group, target) {
        if (!this.hasIdenticalSides) {
            return; // currently only enabled when both sides are identical
        }
        // Forward rename to primary side
        const renameResult = await this.primary.rename(group, target);
        if (!renameResult) {
            return undefined;
        }
        // Build a side-by-side result from the rename result
        if (isEditorInput(renameResult.editor)) {
            return {
                editor: new SideBySideEditorInput_1(this.preferredName, this.preferredDescription, renameResult.editor, renameResult.editor, this.editorService),
                options: {
                    ...renameResult.options,
                    viewState: findViewStateForEditor(this, group, this.editorService)
                }
            };
        }
        if (isResourceEditorInput(renameResult.editor)) {
            return {
                editor: {
                    label: this.preferredName,
                    description: this.preferredDescription,
                    primary: renameResult.editor,
                    secondary: renameResult.editor,
                    options: {
                        ...renameResult.options,
                        viewState: findViewStateForEditor(this, group, this.editorService)
                    }
                }
            };
        }
        return undefined;
    }
    isReadonly() {
        return this.primary.isReadonly();
    }
    toUntyped(options) {
        const primaryResourceEditorInput = this.primary.toUntyped(options);
        const secondaryResourceEditorInput = this.secondary.toUntyped(options);
        // Prevent nested side by side editors which are unsupported
        if (primaryResourceEditorInput && secondaryResourceEditorInput &&
            !isResourceDiffEditorInput(primaryResourceEditorInput) && !isResourceDiffEditorInput(secondaryResourceEditorInput) &&
            !isResourceMultiDiffEditorInput(primaryResourceEditorInput) && !isResourceMultiDiffEditorInput(secondaryResourceEditorInput) &&
            !isResourceSideBySideEditorInput(primaryResourceEditorInput) && !isResourceSideBySideEditorInput(secondaryResourceEditorInput) &&
            !isResourceMergeEditorInput(primaryResourceEditorInput) && !isResourceMergeEditorInput(secondaryResourceEditorInput)) {
            const untypedInput = {
                label: this.preferredName,
                description: this.preferredDescription,
                primary: primaryResourceEditorInput,
                secondary: secondaryResourceEditorInput
            };
            if (typeof options?.preserveViewState === 'number') {
                untypedInput.options = {
                    viewState: findViewStateForEditor(this, options.preserveViewState, this.editorService)
                };
            }
            return untypedInput;
        }
        return undefined;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (isDiffEditorInput(otherInput) || isResourceDiffEditorInput(otherInput)) {
            return false; // prevent subclass from matching
        }
        if (otherInput instanceof SideBySideEditorInput_1) {
            return this.primary.matches(otherInput.primary) && this.secondary.matches(otherInput.secondary);
        }
        if (isResourceSideBySideEditorInput(otherInput)) {
            return this.primary.matches(otherInput.primary) && this.secondary.matches(otherInput.secondary);
        }
        return false;
    }
};
SideBySideEditorInput = SideBySideEditorInput_1 = __decorate([
    __param(4, IEditorService)
], SideBySideEditorInput);
export { SideBySideEditorInput };
export class AbstractSideBySideEditorInputSerializer {
    canSerialize(editorInput) {
        const input = editorInput;
        if (input.primary && input.secondary) {
            const [secondaryInputSerializer, primaryInputSerializer] = this.getSerializers(input.secondary.typeId, input.primary.typeId);
            return !!(secondaryInputSerializer?.canSerialize(input.secondary) && primaryInputSerializer?.canSerialize(input.primary));
        }
        return false;
    }
    serialize(editorInput) {
        const input = editorInput;
        if (input.primary && input.secondary) {
            const [secondaryInputSerializer, primaryInputSerializer] = this.getSerializers(input.secondary.typeId, input.primary.typeId);
            if (primaryInputSerializer && secondaryInputSerializer) {
                const primarySerialized = primaryInputSerializer.serialize(input.primary);
                const secondarySerialized = secondaryInputSerializer.serialize(input.secondary);
                if (primarySerialized && secondarySerialized) {
                    const serializedEditorInput = {
                        name: input.getPreferredName(),
                        description: input.getPreferredDescription(),
                        primarySerialized,
                        secondarySerialized,
                        primaryTypeId: input.primary.typeId,
                        secondaryTypeId: input.secondary.typeId
                    };
                    return JSON.stringify(serializedEditorInput);
                }
            }
        }
        return undefined;
    }
    deserialize(instantiationService, serializedEditorInput) {
        const deserialized = JSON.parse(serializedEditorInput);
        const [secondaryInputSerializer, primaryInputSerializer] = this.getSerializers(deserialized.secondaryTypeId, deserialized.primaryTypeId);
        if (primaryInputSerializer && secondaryInputSerializer) {
            const primaryInput = primaryInputSerializer.deserialize(instantiationService, deserialized.primarySerialized);
            const secondaryInput = secondaryInputSerializer.deserialize(instantiationService, deserialized.secondarySerialized);
            if (primaryInput instanceof EditorInput && secondaryInput instanceof EditorInput) {
                return this.createEditorInput(instantiationService, deserialized.name, deserialized.description, secondaryInput, primaryInput);
            }
        }
        return undefined;
    }
    getSerializers(secondaryEditorInputTypeId, primaryEditorInputTypeId) {
        const registry = Registry.as(EditorExtensions.EditorFactory);
        return [registry.getEditorSerializer(secondaryEditorInputTypeId), registry.getEditorSerializer(primaryEditorInputTypeId)];
    }
}
export class SideBySideEditorInputSerializer extends AbstractSideBySideEditorInputSerializer {
    createEditorInput(instantiationService, name, description, secondaryInput, primaryInput) {
        return instantiationService.createInstance(SideBySideEditorInput, name, description, secondaryInput, primaryInput);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZUJ5U2lkZUVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL3NpZGVCeVNpZGVFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUEwRSxnQkFBZ0IsRUFBMEYsK0JBQStCLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLEVBQWtDLHNCQUFzQixFQUFlLGFBQWEsRUFBRSxxQkFBcUIsRUFBYSwwQkFBMEIsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNqZCxPQUFPLEVBQUUsV0FBVyxFQUF5QixNQUFNLGtCQUFrQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUUvRTs7R0FFRztBQUNJLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsV0FBVzs7YUFFckMsT0FBRSxHQUFXLDhDQUE4QyxBQUF6RCxDQUEwRDtJQUU1RSxJQUFhLE1BQU07UUFDbEIsT0FBTyx1QkFBcUIsQ0FBQyxFQUFFLENBQUM7SUFDakMsQ0FBQztJQUVELElBQWEsWUFBWTtRQUV4QixtREFBbUQ7UUFDbkQsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFFN0MsbURBQW1EO1FBQ25ELHNDQUFzQztRQUN0QyxZQUFZLElBQUksaURBQXdDLENBQUM7UUFFekQsNkNBQTZDO1FBQzdD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