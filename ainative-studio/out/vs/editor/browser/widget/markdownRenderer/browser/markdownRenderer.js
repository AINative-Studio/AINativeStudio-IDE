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
var MarkdownRenderer_1;
import { renderMarkdown } from '../../../../../base/browser/markdownRenderer.js';
import { createTrustedTypesPolicy } from '../../../../../base/browser/trustedTypes.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../common/languages/modesRegistry.js';
import { tokenizeToString } from '../../../../common/languages/textToHtmlTokenizer.js';
import { applyFontInfo } from '../../../config/domFontInfo.js';
import './renderedMarkdown.css';
/**
 * Markdown renderer that can render codeblocks with the editor mechanics. This
 * renderer should always be preferred.
 */
let MarkdownRenderer = class MarkdownRenderer {
    static { MarkdownRenderer_1 = this; }
    static { this._ttpTokenizer = createTrustedTypesPolicy('tokenizeToString', {
        createHTML(html) {
            return html;
        }
    }); }
    constructor(_options, _languageService, _openerService) {
        this._options = _options;
        this._languageService = _languageService;
        this._openerService = _openerService;
    }
    render(markdown, options, markedOptions) {
        if (!markdown) {
            const element = document.createElement('span');
            return { element, dispose: () => { } };
        }
        const disposables = new DisposableStore();
        const rendered = disposables.add(renderMarkdown(markdown, { ...this._getRenderOptions(markdown, disposables), ...options }, markedOptions));
        rendered.element.classList.add('rendered-markdown');
        return {
            element: rendered.element,
            dispose: () => disposables.dispose()
        };
    }
    _getRenderOptions(markdown, disposables) {
        return {
            codeBlockRenderer: async (languageAlias, value) => {
                // In markdown,
                // it is possible that we stumble upon language aliases (e.g.js instead of javascript)
                // it is possible no alias is given in which case we fall back to the current editor lang
                let languageId;
                if (languageAlias) {
                    languageId = this._languageService.getLanguageIdByLanguageName(languageAlias);
                }
                else if (this._options.editor) {
                    languageId = this._options.editor.getModel()?.getLanguageId();
                }
                if (!languageId) {
                    languageId = PLAINTEXT_LANGUAGE_ID;
                }
                const html = await tokenizeToString(this._languageService, value, languageId);
                const element = document.createElement('span');
                element.innerHTML = (MarkdownRenderer_1._ttpTokenizer?.createHTML(html) ?? html);
                // use "good" font
                if (this._options.editor) {
                    const fontInfo = this._options.editor.getOption(52 /* EditorOption.fontInfo */);
                    applyFontInfo(element, fontInfo);
                }
                else if (this._options.codeBlockFontFamily) {
                    element.style.fontFamily = this._options.codeBlockFontFamily;
                }
                if (this._options.codeBlockFontSize !== undefined) {
                    element.style.fontSize = this._options.codeBlockFontSize;
                }
                return element;
            },
            actionHandler: {
                callback: (link) => this.openMarkdownLink(link, markdown),
                disposables
            }
        };
    }
    async openMarkdownLink(link, markdown) {
        await openLinkFromMarkdown(this._openerService, link, markdown.isTrusted);
    }
};
MarkdownRenderer = MarkdownRenderer_1 = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService)
], MarkdownRenderer);
export { MarkdownRenderer };
export async function openLinkFromMarkdown(openerService, link, isTrusted, skipValidation) {
    try {
        return await openerService.open(link, {
            fromUserGesture: true,
            allowContributedOpeners: true,
            allowCommands: toAllowCommandsOption(isTrusted),
            skipValidation
        });
    }
    catch (e) {
        onUnexpectedError(e);
        return false;
    }
}
function toAllowCommandsOption(isTrusted) {
    if (isTrusted === true) {
        return true; // Allow all commands
    }
    if (isTrusted && Array.isArray(isTrusted.enabledCommands)) {
        return isTrusted.enabledCommands; // Allow subset of commands
    }
    return false; // Block commands
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25SZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvbWFya2Rvd25SZW5kZXJlci9icm93c2VyL21hcmtkb3duUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBd0MsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdkgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFekUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFL0QsT0FBTyx3QkFBd0IsQ0FBQztBQVloQzs7O0dBR0c7QUFDSSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjs7YUFFYixrQkFBYSxHQUFHLHdCQUF3QixDQUFDLGtCQUFrQixFQUFFO1FBQzNFLFVBQVUsQ0FBQyxJQUFZO1lBQ3RCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztLQUNELENBQUMsQUFKMEIsQ0FJekI7SUFFSCxZQUNrQixRQUFrQyxFQUNoQixnQkFBa0MsRUFDcEMsY0FBOEI7UUFGOUMsYUFBUSxHQUFSLFFBQVEs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