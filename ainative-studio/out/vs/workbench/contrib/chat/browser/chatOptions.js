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
var ChatEditorOptions_1;
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IViewDescriptorService } from '../../../common/views.js';
let ChatEditorOptions = class ChatEditorOptions extends Disposable {
    static { ChatEditorOptions_1 = this; }
    static { this.lineHeightEm = 1.4; }
    get configuration() {
        return this._config;
    }
    static { this.relevantSettingIds = [
        'chat.editor.lineHeight',
        'chat.editor.fontSize',
        'chat.editor.fontFamily',
        'chat.editor.fontWeight',
        'chat.editor.wordWrap',
        'editor.cursorBlinking',
        'editor.fontLigatures',
        'editor.accessibilitySupport',
        'editor.bracketPairColorization.enabled',
        'editor.bracketPairColorization.independentColorPoolPerBracketType',
    ]; }
    constructor(viewId, foreground, inputEditorBackgroundColor, resultEditorBackgroundColor, configurationService, themeService, viewDescriptorService) {
        super();
        this.foreground = foreground;
        this.inputEditorBackgroundColor = inputEditorBackgroundColor;
        this.resultEditorBackgroundColor = resultEditorBackgroundColor;
        this.configurationService = configurationService;
        this.themeService = themeService;
        this.viewDescriptorService = viewDescriptorService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this.themeService.onDidColorThemeChange(e => this.update()));
        this._register(this.viewDescriptorService.onDidChangeLocation(e => {
            if (e.views.some(v => v.id === viewId)) {
                this.update();
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (ChatEditorOptions_1.relevantSettingIds.some(id => e.affectsConfiguration(id))) {
                this.update();
            }
        }));
        this.update();
    }
    update() {
        const editorConfig = this.configurationService.getValue('editor');
        // TODO shouldn't the setting keys be more specific?
        const chatEditorConfig = this.configurationService.getValue('chat')?.editor;
        const accessibilitySupport = this.configurationService.getValue('editor.accessibilitySupport');
        this._config = {
            foreground: this.themeService.getColorTheme().getColor(this.foreground),
            inputEditor: {
                backgroundColor: this.themeService.getColorTheme().getColor(this.inputEditorBackgroundColor),
                accessibilitySupport,
            },
            resultEditor: {
                backgroundColor: this.themeService.getColorTheme().getColor(this.resultEditorBackgroundColor),
                fontSize: chatEditorConfig.fontSize,
                fontFamily: chatEditorConfig.fontFamily === 'default' ? editorConfig.fontFamily : chatEditorConfig.fontFamily,
                fontWeight: chatEditorConfig.fontWeight,
                lineHeight: chatEditorConfig.lineHeight ? chatEditorConfig.lineHeight : ChatEditorOptions_1.lineHeightEm * chatEditorConfig.fontSize,
                bracketPairColorization: {
                    enabled: this.configurationService.getValue('editor.bracketPairColorization.enabled'),
                    independentColorPoolPerBracketType: this.configurationService.getValue('editor.bracketPairColorization.independentColorPoolPerBracketType'),
                },
                wordWrap: chatEditorConfig.wordWrap,
                fontLigatures: editorConfig.fontLigatures,
            }
        };
        this._onDidChange.fire();
    }
};
ChatEditorOptions = ChatEditorOptions_1 = __decorate([
    __param(4, IConfigurationService),
    __param(5, IThemeService),
    __param(6, IViewDescriptorService)
], ChatEditorOptions);
export { ChatEditorOptions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdE9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBdUMzRCxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7O2FBQ3hCLGlCQUFZLEdBQUcsR0FBRyxBQUFOLENBQU87SUFNM0MsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO2FBRXVCLHVCQUFrQixHQUFHO1FBQzVDLHdCQUF3QjtRQUN4QixzQkFBc0I7UUFDdEIsd0JBQXdCO1FBQ3hCLHdCQUF3QjtRQUN4QixzQkFBc0I7UUFDdEIsdUJBQXVCO1FBQ3ZCLHNCQUFzQjtRQUN0Qiw2QkFBNkI7UUFDN0Isd0NBQXdDO1FBQ3hDLG1FQUFtRTtLQUNuRSxBQVh5QyxDQVd4QztJQUVGLFlBQ0MsTUFBMEIsRUFDVCxVQUFrQixFQUNsQiwwQkFBa0MsRUFDbEMsMkJBQW1DLEVBQzdCLG9CQUE0RCxFQUNwRSxZQUE0QyxFQUNuQyxxQkFBOEQ7UUFFdEYsS0FBSyxFQUFFLENBQUM7UUFQUyxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLCtCQUEwQixH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