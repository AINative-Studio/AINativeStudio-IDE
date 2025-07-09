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
import { localize } from '../../../../nls.js';
import { BINARY_DIFF_EDITOR_ID } from '../../../common/editor.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { SideBySideEditor } from './sideBySideEditor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { BaseBinaryResourceEditor } from './binaryEditor.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
/**
 * An implementation of editor for diffing binary files like images or videos.
 */
let BinaryResourceDiffEditor = class BinaryResourceDiffEditor extends SideBySideEditor {
    static { this.ID = BINARY_DIFF_EDITOR_ID; }
    constructor(group, telemetryService, instantiationService, themeService, storageService, configurationService, textResourceConfigurationService, editorService, editorGroupService) {
        super(group, telemetryService, instantiationService, themeService, storageService, configurationService, textResourceConfigurationService, editorService, editorGroupService);
    }
    getMetadata() {
        const primary = this.getPrimaryEditorPane();
        const secondary = this.getSecondaryEditorPane();
        if (primary instanceof BaseBinaryResourceEditor && secondary instanceof BaseBinaryResourceEditor) {
            return localize('metadataDiff', "{0} ↔ {1}", secondary.getMetadata(), primary.getMetadata());
        }
        return undefined;
    }
};
BinaryResourceDiffEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, IStorageService),
    __param(5, IConfigurationService),
    __param(6, ITextResourceConfigurationService),
    __param(7, IEditorService),
    __param(8, IEditorGroupsService)
], BinaryResourceDiffEditor);
export { BinaryResourceDiffEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5RGlmZkVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvYmluYXJ5RGlmZkVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwSCxPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWxGOztHQUVHO0FBQ0ksSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxnQkFBZ0I7YUFFcEMsT0FBRSxHQUFHLHFCQUFxQixBQUF4QixDQUF5QjtJQUVwRCxZQUNDLEtBQW1CLEVBQ0EsZ0JBQW1DLEVBQy9CLG9CQUEyQyxFQUNuRCxZQUEyQixFQUN6QixjQUErQixFQUN6QixvQkFBMkMsRUFDL0IsZ0NBQW1FLEVBQ3RGLGFBQTZCLEVBQ3ZCLGtCQUF3QztRQUU5RCxLQUFLLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsZ0NBQWdDLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDL0ssQ0FBQztJQUVELFdBQVc7UUFDVixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM1QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUVoRCxJQUFJLE9BQU8sWUFBWSx3QkFBd0IsSUFBSSxTQUFTLFlBQVksd0JBQXdCLEVBQUUsQ0FBQztZQUNsRyxPQUFPLFFBQVEsQ0FBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUM5RixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQzs7QUEzQlcsd0JBQXdCO0lBTWxDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlDQUFpQyxDQUFBO0lBQ2pDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxvQkFBb0IsQ0FBQTtHQWJWLHdCQUF3QixDQTRCcEMifQ==