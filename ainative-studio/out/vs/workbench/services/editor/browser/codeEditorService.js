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
import { isCodeEditor, isDiffEditor, isCompositeEditor, getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { AbstractCodeEditorService } from '../../../../editor/browser/services/abstractCodeEditorService.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../common/editorService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { applyTextEditorOptions } from '../../../common/editor/editorOptions.js';
let CodeEditorService = class CodeEditorService extends AbstractCodeEditorService {
    constructor(editorService, themeService, configurationService) {
        super(themeService);
        this.editorService = editorService;
        this.configurationService = configurationService;
        this._register(this.registerCodeEditorOpenHandler(this.doOpenCodeEditor.bind(this)));
        this._register(this.registerCodeEditorOpenHandler(this.doOpenCodeEditorFromDiff.bind(this)));
    }
    getActiveCodeEditor() {
        const activeTextEditorControl = this.editorService.activeTextEditorControl;
        if (isCodeEditor(activeTextEditorControl)) {
            return activeTextEditorControl;
        }
        if (isDiffEditor(activeTextEditorControl)) {
            return activeTextEditorControl.getModifiedEditor();
        }
        const activeControl = this.editorService.activeEditorPane?.getControl();
        if (isCompositeEditor(activeControl) && isCodeEditor(activeControl.activeCodeEditor)) {
            return activeControl.activeCodeEditor;
        }
        return null;
    }
    async doOpenCodeEditorFromDiff(input, source, sideBySide) {
        // Special case: If the active editor is a diff editor and the request to open originates and
        // targets the modified side of it, we just apply the request there to prevent opening the modified
        // side as separate editor.
        const activeTextEditorControl = this.editorService.activeTextEditorControl;
        if (!sideBySide && // we need the current active group to be the target
            isDiffEditor(activeTextEditorControl) && // we only support this for active text diff editors
            input.options && // we need options to apply
            input.resource && // we need a request resource to compare with
            source === activeTextEditorControl.getModifiedEditor() && // we need the source of this request to be the modified side of the diff editor
            activeTextEditorControl.getModel() && // we need a target model to compare with
            isEqual(input.resource, activeTextEditorControl.getModel()?.modified.uri) // we need the input resources to match with modified side
        ) {
            const targetEditor = activeTextEditorControl.getModifiedEditor();
            applyTextEditorOptions(input.options, targetEditor, 0 /* ScrollType.Smooth */);
            return targetEditor;
        }
        return null;
    }
    // Open using our normal editor service
    async doOpenCodeEditor(input, source, sideBySide) {
        // Special case: we want to detect the request to open an editor that
        // is different from the current one to decide whether the current editor
        // should be pinned or not. This ensures that the source of a navigation
        // is not being replaced by the target. An example is "Goto definition"
        // that otherwise would replace the editor everytime the user navigates.
        const enablePreviewFromCodeNavigation = this.configurationService.getValue().workbench?.editor?.enablePreviewFromCodeNavigation;
        if (!enablePreviewFromCodeNavigation && // we only need to do this if the configuration requires it
            source && // we need to know the origin of the navigation
            !input.options?.pinned && // we only need to look at preview editors that open
            !sideBySide && // we only need to care if editor opens in same group
            !isEqual(source.getModel()?.uri, input.resource) // we only need to do this if the editor is about to change
        ) {
            for (const visiblePane of this.editorService.visibleEditorPanes) {
                if (getCodeEditor(visiblePane.getControl()) === source) {
                    visiblePane.group.pinEditor();
                    break;
                }
            }
        }
        // Open as editor
        const control = await this.editorService.openEditor(input, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
        if (control) {
            const widget = control.getControl();
            if (isCodeEditor(widget)) {
                return widget;
            }
            if (isCompositeEditor(widget) && isCodeEditor(widget.activeCodeEditor)) {
                return widget.activeCodeEditor;
            }
        }
        return null;
    }
};
CodeEditorService = __decorate([
    __param(0, IEditorService),
    __param(1, IThemeService),
    __param(2, IConfigurationService)
], CodeEditorService);
export { CodeEditorService };
registerSingleton(ICodeEditorService, CodeEditorService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci9icm93c2VyL2NvZGVFZGl0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBZSxZQUFZLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hJLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRzdHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRixPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTFFLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEseUJBQXlCO0lBRS9ELFlBQ2tDLGFBQTZCLEVBQy9DLFlBQTJCLEVBQ0Ysb0JBQTJDO1FBRW5GLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUphLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUV0Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBSW5GLElBQUksQ0FBQyxTQUFTLENBQUMsSUFB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