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
import { EditorInput } from './editorInput.js';
import { ByteSize, IFileService, getLargeFileConfirmationLimit } from '../../../platform/files/common/files.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { dirname, isEqual } from '../../../base/common/resources.js';
import { IFilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { isConfigured } from '../../../platform/configuration/common/configuration.js';
import { ITextResourceConfigurationService } from '../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../services/editor/common/customEditorLabelService.js';
/**
 * The base class for all editor inputs that open resources.
 */
let AbstractResourceEditorInput = class AbstractResourceEditorInput extends EditorInput {
    get capabilities() {
        let capabilities = 32 /* EditorInputCapabilities.CanSplitInGroup */;
        if (this.fileService.hasProvider(this.resource)) {
            if (this.filesConfigurationService.isReadonly(this.resource)) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        else {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        if (!(capabilities & 2 /* EditorInputCapabilities.Readonly */)) {
            capabilities |= 128 /* EditorInputCapabilities.CanDropIntoEditor */;
        }
        return capabilities;
    }
    get preferredResource() { return this._preferredResource; }
    constructor(resource, preferredResource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super();
        this.resource = resource;
        this.labelService = labelService;
        this.fileService = fileService;
        this.filesConfigurationService = filesConfigurationService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.customEditorLabelService = customEditorLabelService;
        this._name = undefined;
        this._shortDescription = undefined;
        this._mediumDescription = undefined;
        this._longDescription = undefined;
        this._shortTitle = undefined;
        this._mediumTitle = undefined;
        this._longTitle = undefined;
        this._preferredResource = preferredResource || resource;
        this.registerListeners();
    }
    registerListeners() {
        // Clear our labels on certain label related events
        this._register(this.labelService.onDidChangeFormatters(e => this.onLabelEvent(e.scheme)));
        this._register(this.fileService.onDidChangeFileSystemProviderRegistrations(e => this.onLabelEvent(e.scheme)));
        this._register(this.fileService.onDidChangeFileSystemProviderCapabilities(e => this.onLabelEvent(e.scheme)));
        this._register(this.customEditorLabelService.onDidChange(() => this.updateLabel()));
        this._register(this.filesConfigurationService.onDidChangeReadonly(() => this._onDidChangeCapabilities.fire()));
    }
    onLabelEvent(scheme) {
        if (scheme === this._preferredResource.scheme) {
            this.updateLabel();
        }
    }
    updateLabel() {
        // Clear any cached labels from before
        this._name = undefined;
        this._shortDescription = undefined;
        this._mediumDescription = undefined;
        this._longDescription = undefined;
        this._shortTitle = undefined;
        this._mediumTitle = undefined;
        this._longTitle = undefined;
        // Trigger recompute of label
        this._onDidChangeLabel.fire();
    }
    setPreferredResource(preferredResource) {
        if (!isEqual(preferredResource, this._preferredResource)) {
            this._preferredResource = preferredResource;
            this.updateLabel();
        }
    }
    getName() {
        if (typeof this._name !== 'string') {
            this._name = this.customEditorLabelService.getName(this._preferredResource) ?? this.labelService.getUriBasenameLabel(this._preferredResource);
        }
        return this._name;
    }
    getDescription(verbosity = 1 /* Verbosity.MEDIUM */) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.shortDescription;
            case 2 /* Verbosity.LONG */:
                return this.longDescription;
            case 1 /* Verbosity.MEDIUM */:
            default:
                return this.mediumDescription;
        }
    }
    get shortDescription() {
        if (typeof this._shortDescription !== 'string') {
            this._shortDescription = this.labelService.getUriBasenameLabel(dirname(this._preferredResource));
        }
        return this._shortDescription;
    }
    get mediumDescription() {
        if (typeof this._mediumDescription !== 'string') {
            this._mediumDescription = this.labelService.getUriLabel(dirname(this._preferredResource), { relative: true });
        }
        return this._mediumDescription;
    }
    get longDescription() {
        if (typeof this._longDescription !== 'string') {
            this._longDescription = this.labelService.getUriLabel(dirname(this._preferredResource));
        }
        return this._longDescription;
    }
    get shortTitle() {
        if (typeof this._shortTitle !== 'string') {
            this._shortTitle = this.getName();
        }
        return this._shortTitle;
    }
    get mediumTitle() {
        if (typeof this._mediumTitle !== 'string') {
            this._mediumTitle = this.labelService.getUriLabel(this._preferredResource, { relative: true });
        }
        return this._mediumTitle;
    }
    get longTitle() {
        if (typeof this._longTitle !== 'string') {
            this._longTitle = this.labelService.getUriLabel(this._preferredResource);
        }
        return this._longTitle;
    }
    getTitle(verbosity) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.shortTitle;
            case 2 /* Verbosity.LONG */:
                return this.longTitle;
            default:
            case 1 /* Verbosity.MEDIUM */:
                return this.mediumTitle;
        }
    }
    isReadonly() {
        return this.filesConfigurationService.isReadonly(this.resource);
    }
    ensureLimits(options) {
        if (options?.limits) {
            return options.limits; // respect passed in limits if any
        }
        // We want to determine the large file configuration based on the best defaults
        // for the resource but also respecting user settings. We only apply user settings
        // if explicitly configured by the user. Otherwise we pick the best limit for the
        // resource scheme.
        const defaultSizeLimit = getLargeFileConfirmationLimit(this.resource);
        let configuredSizeLimit = undefined;
        const configuredSizeLimitMb = this.textResourceConfigurationService.inspect(this.resource, null, 'workbench.editorLargeFileConfirmation');
        if (isConfigured(configuredSizeLimitMb)) {
            configuredSizeLimit = configuredSizeLimitMb.value * ByteSize.MB; // normalize to MB
        }
        return {
            size: configuredSizeLimit ?? defaultSizeLimit
        };
    }
};
AbstractResourceEditorInput = __decorate([
    __param(2, ILabelService),
    __param(3, IFileService),
    __param(4, IFilesConfigurationService),
    __param(5, ITextResourceConfigurationService),
    __param(6, ICustomEditorLabelService)
], AbstractResourceEditorInput);
export { AbstractResourceEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9yZXNvdXJjZUVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQyxPQUFPLEVBQUUsUUFBUSxFQUFtQixZQUFZLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqSSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUVuSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDdkYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDakgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFckc7O0dBRUc7QUFDSSxJQUFlLDJCQUEyQixHQUExQyxNQUFlLDJCQUE0QixTQUFRLFdBQVc7SUFFcEUsSUFBYSxZQUFZO1FBQ3hCLElBQUksWUFBWSxtREFBMEMsQ0FBQztRQUUzRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pELElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsWUFBWSw0Q0FBb0MsQ0FBQztZQUNsRCxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxZQUFZLDRDQUFvQyxDQUFDO1FBQ2xELENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxZQUFZLDJDQUFtQyxDQUFDLEVBQUUsQ0FBQztZQUN4RCxZQUFZLHVEQUE2QyxDQUFDO1FBQzNELENBQUM7UUFFRCxPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0lBR0QsSUFBSSxpQkFBaUIsS0FBVSxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7SUFFaEUsWUFDVSxRQUFhLEVBQ3RCLGlCQUFrQyxFQUNuQixZQUE4QyxFQUMvQyxXQUE0QyxFQUM5Qix5QkFBd0UsRUFDakUsZ0NBQXNGLEVBQzlGLHdCQUFzRTtRQUVqRyxLQUFLLEVBQUUsQ0FBQztRQVJDLGFBQVEsR0FBUixRQUFRLENBQUs7UUFFWSxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUM1QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNYLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFDOUMscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztRQUMzRSw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO1FBZ0QxRixVQUFLLEdBQXVCLFNBQVMsQ0FBQztRQXFCdEMsc0JBQWlCLEdBQXVCLFNBQVMsQ0FBQztRQVNsRCx1QkFBa0IsR0FBdUIsU0FBUyxDQUFDO1FBU25ELHFCQUFnQixHQUF1QixTQUFTLENBQUM7UUFTakQsZ0JBQVcsR0FBdUIsU0FBUyxDQUFDO1FBUzVDLGlCQUFZLEdBQXVCLFNBQVMsQ0FBQztRQVM3QyxlQUFVLEdBQXVCLFNBQVMsQ0FBQztRQTlHbEQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGlCQUFpQixJQUFJLFFBQVEsQ0FBQztRQUV4RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8saUJBQWlCO1FBRXhCLG1EQUFtRDtRQUNuRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hILENBQUM7SUFFTyxZQUFZLENBQUMsTUFBYztRQUNsQyxJQUFJLE1BQU0sS0FBSyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU8sV0FBVztRQUVsQixzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7UUFDdkIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztRQUNuQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUM7UUFDbEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUM7UUFDOUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFFNUIsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRUQsb0JBQW9CLENBQUMsaUJBQXNCO1FBQzFDLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUMxRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsaUJBQWlCLENBQUM7WUFFNUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBR1EsT0FBTztRQUNmLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQy9JLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDbkIsQ0FBQztJQUVRLGNBQWMsQ0FBQyxTQUFTLDJCQUFtQjtRQUNuRCxRQUFRLFNBQVMsRUFBRSxDQUFDO1lBQ25CO2dCQUNDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQzlCO2dCQUNDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUM3Qiw4QkFBc0I7WUFDdEI7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUM7UUFDaEMsQ0FBQztJQUNGLENBQUM7SUFHRCxJQUFZLGdCQUFnQjtRQUMzQixJQUFJLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztJQUMvQixDQUFDO0lBR0QsSUFBWSxpQkFBaUI7UUFDNUIsSUFBSSxPQUFPLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDL0csQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDO0lBQ2hDLENBQUM7SUFHRCxJQUFZLGVBQWU7UUFDMUIsSUFBSSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO0lBQzlCLENBQUM7SUFHRCxJQUFZLFVBQVU7UUFDckIsSUFBSSxPQUFPLElBQUksQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0lBR0QsSUFBWSxXQUFXO1FBQ3RCLElBQUksT0FBTyxJQUFJLENBQUMsWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDaEcsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0lBR0QsSUFBWSxTQUFTO1FBQ3BCLElBQUksT0FBTyxJQUFJLENBQUMsVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDO0lBRVEsUUFBUSxDQUFDLFNBQXFCO1FBQ3RDLFFBQVEsU0FBUyxFQUFFLENBQUM7WUFDbkI7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hCO2dCQUNDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUN2QixRQUFRO1lBQ1I7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRVEsVUFBVTtRQUNsQixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFUyxZQUFZLENBQUMsT0FBd0M7UUFDOUQsSUFBSSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDckIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsa0NBQWtDO1FBQzFELENBQUM7UUFFRCwrRUFBK0U7UUFDL0Usa0ZBQWtGO1FBQ2xGLGlGQUFpRjtRQUNqRixtQkFBbUI7UUFFbkIsTUFBTSxnQkFBZ0IsR0FBRyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEUsSUFBSSxtQkFBbUIsR0FBdUIsU0FBUyxDQUFDO1FBRXhELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLE9BQU8sQ0FBUyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1FBQ2xKLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztZQUN6QyxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQjtRQUNwRixDQUFDO1FBRUQsT0FBTztZQUNOLElBQUksRUFBRSxtQkFBbUIsSUFBSSxnQkFBZ0I7U0FDN0MsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBL0xxQiwyQkFBMkI7SUEwQjlDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLDBCQUEwQixDQUFBO0lBQzFCLFdBQUEsaUNBQWlDLENBQUE7SUFDakMsV0FBQSx5QkFBeUIsQ0FBQTtHQTlCTiwyQkFBMkIsQ0ErTGhEIn0=