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
import * as objects from '../../../../base/common/objects.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { CodeEditorWidget } from './codeEditorWidget.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
let EmbeddedCodeEditorWidget = class EmbeddedCodeEditorWidget extends CodeEditorWidget {
    constructor(domElement, options, codeEditorWidgetOptions, parentEditor, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        super(domElement, { ...parentEditor.getRawOptions(), overflowWidgetsDomNode: parentEditor.getOverflowWidgetsDomNode() }, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService);
        this._parentEditor = parentEditor;
        this._overwriteOptions = options;
        // Overwrite parent's options
        super.updateOptions(this._overwriteOptions);
        this._register(parentEditor.onDidChangeConfiguration((e) => this._onParentConfigurationChanged(e)));
    }
    getParentEditor() {
        return this._parentEditor;
    }
    _onParentConfigurationChanged(e) {
        super.updateOptions(this._parentEditor.getRawOptions());
        super.updateOptions(this._overwriteOptions);
    }
    updateOptions(newOptions) {
        objects.mixin(this._overwriteOptions, newOptions, true);
        super.updateOptions(this._overwriteOptions);
    }
};
EmbeddedCodeEditorWidget = __decorate([
    __param(4, IInstantiationService),
    __param(5, ICodeEditorService),
    __param(6, ICommandService),
    __param(7, IContextKeyService),
    __param(8, IThemeService),
    __param(9, INotificationService),
    __param(10, IAccessibilityService),
    __param(11, ILanguageConfigurationService),
    __param(12, ILanguageFeaturesService)
], EmbeddedCodeEditorWidget);
export { EmbeddedCodeEditorWidget };
export function getOuterEditor(accessor) {
    const editor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
    if (editor instanceof EmbeddedCodeEditorWidget) {
        return editor.getParentEditor();
    }
    return editor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZWRkZWRDb2RlRWRpdG9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9jb2RlRWRpdG9yL2VtYmVkZGVkQ29kZUVkaXRvcldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBNEIsTUFBTSx1QkFBdUIsQ0FBQztBQUVuRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMzRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUUzRSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLGdCQUFnQjtJQUk3RCxZQUNDLFVBQXVCLEVBQ3ZCLE9BQXVCLEVBQ3ZCLHVCQUFpRCxFQUNqRCxZQUF5QixFQUNGLG9CQUEyQyxFQUM5QyxpQkFBcUMsRUFDeEMsY0FBK0IsRUFDNUIsaUJBQXFDLEVBQzFDLFlBQTJCLEVBQ3BCLG1CQUF5QyxFQUN4QyxvQkFBMkMsRUFDbkMsNEJBQTJELEVBQ2hFLHVCQUFpRDtRQUUzRSxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsR0FBRyxZQUFZLENBQUMsYUFBYSxFQUFFLEVBQUUsc0JBQXNCLEVBQUUsWUFBWSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsRUFBRSx1QkFBdUIsRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLDRCQUE0QixFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFFOVUsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7UUFDbEMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQztRQUVqQyw2QkFBNkI7UUFDN0IsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUU1QyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQTRCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEksQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDM0IsQ0FBQztJQUVPLDZCQUE2QixDQUFDLENBQTRCO1FBQ2pFLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVRLGFBQWEsQ0FBQyxVQUEwQjtRQUNoRCxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0NBQ0QsQ0FBQTtBQTNDWSx3QkFBd0I7SUFTbEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLDZCQUE2QixDQUFBO0lBQzdCLFlBQUEsd0JBQXdCLENBQUE7R0FqQmQsd0JBQXdCLENBMkNwQzs7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLFFBQTBCO0lBQ3hELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQ3ZFLElBQUksTUFBTSxZQUFZLHdCQUF3QixFQUFFLENBQUM7UUFDaEQsT0FBTyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDakMsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyJ9