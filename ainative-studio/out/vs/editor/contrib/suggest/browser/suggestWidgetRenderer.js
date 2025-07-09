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
import { $, append, hide, show } from '../../../../base/browser/dom.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Emitter } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { CompletionItemKinds } from '../../../common/languages.js';
import { getIconClasses } from '../../../common/services/getIconClasses.js';
import { IModelService } from '../../../common/services/model.js';
import { ILanguageService } from '../../../common/languages/language.js';
import * as nls from '../../../../nls.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { canExpandCompletionItem } from './suggestWidgetDetails.js';
const suggestMoreInfoIcon = registerIcon('suggest-more-info', Codicon.chevronRight, nls.localize('suggestMoreInfoIcon', 'Icon for more information in the suggest widget.'));
const _completionItemColor = new class ColorExtractor {
    static { this._regexRelaxed = /(#([\da-fA-F]{3}){1,2}|(rgb|hsl)a\(\s*(\d{1,3}%?\s*,\s*){3}(1|0?\.\d+)\)|(rgb|hsl)\(\s*\d{1,3}%?(\s*,\s*\d{1,3}%?){2}\s*\))/; }
    static { this._regexStrict = new RegExp(`^${ColorExtractor._regexRelaxed.source}$`, 'i'); }
    extract(item, out) {
        if (item.textLabel.match(ColorExtractor._regexStrict)) {
            out[0] = item.textLabel;
            return true;
        }
        if (item.completion.detail && item.completion.detail.match(ColorExtractor._regexStrict)) {
            out[0] = item.completion.detail;
            return true;
        }
        if (item.completion.documentation) {
            const value = typeof item.completion.documentation === 'string'
                ? item.completion.documentation
                : item.completion.documentation.value;
            const match = ColorExtractor._regexRelaxed.exec(value);
            if (match && (match.index === 0 || match.index + match[0].length === value.length)) {
                out[0] = match[0];
                return true;
            }
        }
        return false;
    }
};
let ItemRenderer = class ItemRenderer {
    constructor(_editor, _modelService, _languageService, _themeService) {
        this._editor = _editor;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._themeService = _themeService;
        this._onDidToggleDetails = new Emitter();
        this.onDidToggleDetails = this._onDidToggleDetails.event;
        this.templateId = 'suggestion';
    }
    dispose() {
        this._onDidToggleDetails.dispose();
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
        const readMore = append(right, $('span.readMore' + ThemeIcon.asCSSSelector(suggestMoreInfoIcon)));
        readMore.title = nls.localize('readMore', "Read More");
        const configureFont = () => {
            const options = this._editor.getOptions();
            const fontInfo = options.get(52 /* EditorOption.fontInfo */);
            const fontFamily = fontInfo.getMassagedFontFamily();
            const fontFeatureSettings = fontInfo.fontFeatureSettings;
            const fontSize = options.get(124 /* EditorOption.suggestFontSize */) || fontInfo.fontSize;
            const lineHeight = options.get(125 /* EditorOption.suggestLineHeight */) || fontInfo.lineHeight;
            const fontWeight = fontInfo.fontWeight;
            const letterSpacing = fontInfo.letterSpacing;
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
            readMore.style.height = lineHeightPx;
            readMore.style.width = lineHeightPx;
        };
        return { root, left, right, icon, colorspan, iconLabel, iconContainer, parametersLabel, qualifierLabel, detailsLabel, readMore, disposables, configureFont };
    }
    renderElement(element, index, data) {
        data.configureFont();
        const { completion } = element;
        data.colorspan.style.backgroundColor = '';
        const labelOptions = {
            labelEscapeNewLines: true,
            matches: createMatches(element.score)
        };
        const color = [];
        if (completion.kind === 19 /* CompletionItemKind.Color */ && _completionItemColor.extract(element, color)) {
            // special logic for 'color' completion items
            data.icon.className = 'icon customcolor';
            data.iconContainer.className = 'icon hide';
            data.colorspan.style.backgroundColor = color[0];
        }
        else if (completion.kind === 20 /* CompletionItemKind.File */ && this._themeService.getFileIconTheme().hasFileIcons) {
            // special logic for 'file' completion items
            data.icon.className = 'icon hide';
            data.iconContainer.className = 'icon hide';
            const labelClasses = getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: element.textLabel }), FileKind.FILE);
            const detailClasses = getIconClasses(this._modelService, this._languageService, URI.from({ scheme: 'fake', path: completion.detail }), FileKind.FILE);
            labelOptions.extraClasses = labelClasses.length > detailClasses.length ? labelClasses : detailClasses;
        }
        else if (completion.kind === 23 /* CompletionItemKind.Folder */ && this._themeService.getFileIconTheme().hasFolderIcons) {
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
            data.iconContainer.classList.add('suggest-icon', ...ThemeIcon.asClassNameArray(CompletionItemKinds.toIcon(completion.kind)));
        }
        if (completion.tags && completion.tags.indexOf(1 /* CompletionItemTag.Deprecated */) >= 0) {
            labelOptions.extraClasses = (labelOptions.extraClasses || []).concat(['deprecated']);
            labelOptions.matches = [];
        }
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
        if (this._editor.getOption(123 /* EditorOption.suggest */).showInlineDetails) {
            show(data.detailsLabel);
        }
        else {
            hide(data.detailsLabel);
        }
        if (canExpandCompletionItem(element)) {
            data.right.classList.add('can-expand-details');
            show(data.readMore);
            data.readMore.onmousedown = e => {
                e.stopPropagation();
                e.preventDefault();
            };
            data.readMore.onclick = e => {
                e.stopPropagation();
                e.preventDefault();
                this._onDidToggleDetails.fire();
            };
        }
        else {
            data.right.classList.remove('can-expand-details');
            hide(data.readMore);
            data.readMore.onmousedown = null;
            data.readMore.onclick = null;
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
ItemRenderer = __decorate([
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, IThemeService)
], ItemRenderer);
export { ItemRenderer };
function stripNewLines(str) {
    return str.replace(/\r\n|\r|\n/g, '');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci9zdWdnZXN0V2lkZ2V0UmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQTBCLE1BQU0sb0RBQW9ELENBQUM7QUFFdkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHckQsT0FBTyxFQUFzQixtQkFBbUIsRUFBcUIsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxZQUFZ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