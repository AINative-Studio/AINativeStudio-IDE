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
import { $, append, show } from '../../../../base/browser/dom.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { URI } from '../../../../base/common/uri.js';
import { FileKind } from '../../../../platform/files/common/files.js';
export function getAriaId(index) {
    return `simple-suggest-aria-id-${index}`;
}
let SimpleSuggestWidgetItemRenderer = class SimpleSuggestWidgetItemRenderer {
    constructor(_getFontInfo, _onDidFontConfigurationChange, _themeService, _modelService, _languageService) {
        this._getFontInfo = _getFontInfo;
        this._onDidFontConfigurationChange = _onDidFontConfigurationChange;
        this._themeService = _themeService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._onDidToggleDetails = new Emitter();
        this.onDidToggleDetails = this._onDidToggleDetails.event;
        this._disposables = new DisposableStore();
        this.templateId = 'suggestion';
    }
    dispose() {
        this._onDidToggleDetails.dispose();
        this._disposables.dispose();
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const root = container;
        root.classList.add('show-file-icons');
        const icon = append(container, $('.icon'));
        const colorspan = append(icon, $('span.colorspan'));
        const text = append(container, $('.contents'));
        const main = append(text, $('.main'));
        const iconContainer = append(main, $('.icon-label.codicon'));
        const left = append(main, $('span.left'));
        const right = append(main, $('span.right'));
        const iconLabel = new IconLabel(left, { supportHighlights: true, supportIcons: true });
        disposables.add(iconLabel);
        const parametersLabel = append(left, $('span.signature-label'));
        const qualifierLabel = append(left, $('span.qualifier-label'));
        const detailsLabel = append(right, $('span.details-label'));
        // const readMore = append(right, $('span.readMore' + ThemeIcon.asCSSSelector(suggestMoreInfoIcon)));
        // readMore.title = nls.localize('readMore', "Read More");
        const configureFont = () => {
            const fontFeatureSettings = '';
            const { fontFamily, fontSize, lineHeight, fontWeight, letterSpacing } = this._getFontInfo();
            const fontSizePx = `${fontSize}px`;
            const lineHeightPx = `${lineHeight}px`;
            const letterSpacingPx = `${letterSpacing}px`;
            root.style.fontSize = fontSizePx;
            root.style.fontWeight = fontWeight;
            root.style.letterSpacing = letterSpacingPx;
            main.style.fontFamily = fontFamily;
            main.style.fontFeatureSettings = fontFeatureSettings;
            main.style.lineHeight = lineHeightPx;
            icon.style.height = lineHeightPx;
            icon.style.width = lineHeightPx;
            // readMore.style.height = lineHeightPx;
            // readMore.style.width = lineHeightPx;
        };
        configureFont();
        this._disposables.add(this._onDidFontConfigurationChange(() => configureFont()));
        return { root, left, right, icon, colorspan, iconLabel, iconContainer, parametersLabel, qualifierLabel, detailsLabel, disposables };
    }
    renderElement(element, index, data) {
        const { completion } = element;
        data.root.id = getAriaId(index);
        data.colorspan.style.backgroundColor = '';
        const labelOptions = {
            labelEscapeNewLines: true,
            matches: createMatches(element.score)
        };
        // const color: string[] = [];
        // if (completion.kind === CompletionItemKind.Color && _completionItemColor.extract(element, color)) {
        // 	// special logic for 'color' completion items
        // 	data.icon.className = 'icon customcolor';
        // 	data.iconContainer.className = 'icon hide';
        // 	data.colorspan.style.backgroundColor = color[0];
        // } else
        if (completion.kindLabel === 'File' && this._themeService.getFileIconTheme().hasFileIcons) {
            // special logic for 'file' completion items
            data.icon.className = 'icon hide';
            data.iconContainer.className = 'icon hide';
            const labelClasses = getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: element.textLabel }), FileKind.FILE);
            const detailClasses = getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: completion.detail }), FileKind.FILE);
            labelOptions.extraClasses = labelClasses.length > detailClasses.length ? labelClasses : detailClasses;
        }
        else if (completion.kindLabel === 'Folder' && this._themeService.getFileIconTheme().hasFolderIcons) {
            // special logic for 'folder' completion items
            data.icon.className = 'icon hide';
            data.iconContainer.className = 'icon hide';
            labelOptions.extraClasses = [
                getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: element.textLabel }), FileKind.FOLDER),
                getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: completion.detail }), FileKind.FOLDER)
            ].flat();
        }
        else {
            // normal icon
            data.icon.className = 'icon hide';
            data.iconContainer.className = '';
            data.iconContainer.classList.add('suggest-icon', ...ThemeIcon.asClassNameArray(completion.icon || Codicon.symbolText));
        }
        // if (completion.tags && completion.tags.indexOf(CompletionItemTag.Deprecated) >= 0) {
        // 	labelOptions.extraClasses = (labelOptions.extraClasses || []).concat(['deprecated']);
        // 	labelOptions.matches = [];
        // }
        data.iconLabel.setLabel(element.textLabel, undefined, labelOptions);
        if (typeof completion.label === 'string') {
            data.parametersLabel.textContent = '';
            data.detailsLabel.textContent = stripNewLines(completion.detail || '');
            data.root.classList.add('string-label');
        }
        else {
            data.parametersLabel.textContent = stripNewLines(completion.label.detail || '');
            data.detailsLabel.textContent = stripNewLines(completion.label.description || '');
            data.root.classList.remove('string-label');
        }
        // if (this._editor.getOption(EditorOption.suggest).showInlineDetails) {
        show(data.detailsLabel);
        // } else {
        // 	hide(data.detailsLabel);
        // }
        // if (canExpandCompletionItem(element)) {
        // 	data.right.classList.add('can-expand-details');
        // 	show(data.readMore);
        // 	data.readMore.onmousedown = e => {
        // 		e.stopPropagation();
        // 		e.preventDefault();
        // 	};
        // 	data.readMore.onclick = e => {
        // 		e.stopPropagation();
        // 		e.preventDefault();
        // 		this._onDidToggleDetails.fire();
        // 	};
        // } else {
        data.right.classList.remove('can-expand-details');
        // hide(data.readMore);
        // data.readMore.onmousedown = null;
        // data.readMore.onclick = null;
        // }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
SimpleSuggestWidgetItemRenderer = __decorate([
    __param(2, IThemeService),
    __param(3, IModelService),
    __param(4, ILanguageService)
], SimpleSuggestWidgetItemRenderer);
export { SimpleSuggestWidgetItemRenderer };
function stripNewLines(str) {
    return str.replace(/\r\n|\r|\n/g, '');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlU3VnZ2VzdFdpZGdldFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zdWdnZXN0L2Jyb3dzZXIvc2ltcGxlU3VnZ2VzdFdpZGdldFJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQTBCLE1BQU0sb0RBQW9ELENBQUM7QUFHdkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXRFLE1BQU0sVUFBVSxTQUFTLENBQUMsS0FBYTtJQUN0QyxPQUFPLDBCQUEwQixLQUFLLEVB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