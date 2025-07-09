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
import { generateUuid } from '../../../../base/common/uuid.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { DEFAULT_MARKDOWN_STYLES, renderMarkdownDocument } from '../../markdown/browser/markdownDocumentRenderer.js';
import { language } from '../../../../base/common/platform.js';
import { joinPath } from '../../../../base/common/resources.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { asWebviewUri } from '../../webview/common/webview.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { gettingStartedContentRegistry } from '../common/gettingStartedContent.js';
let GettingStartedDetailsRenderer = class GettingStartedDetailsRenderer {
    constructor(fileService, notificationService, extensionService, languageService) {
        this.fileService = fileService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.languageService = languageService;
        this.mdCache = new ResourceMap();
        this.svgCache = new ResourceMap();
    }
    async renderMarkdown(path, base) {
        const content = await this.readAndCacheStepMarkdown(path, base);
        const nonce = generateUuid();
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        const inDev = document.location.protocol === 'http:';
        const imgSrcCsp = inDev ? 'img-src https: data: http:' : 'img-src https: data:';
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; ${imgSrcCsp}; media-src https:; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}
					${css}
					body > img {
						align-self: flex-start;
					}
					body > img[centered] {
						align-self: center;
					}
					body {
						display: flex;
						flex-direction: column;
						padding: 0;
						height: inherit;
					}
					.theme-picker-row {
						display: flex;
						justify-content: center;
						gap: 32px;
					}
					checklist {
						display: flex;
						gap: 32px;
						flex-direction: column;
					}
					checkbox {
						display: flex;
						flex-direction: column;
						align-items: center;
						margin: 5px;
						cursor: pointer;
					}
					checkbox > img {
						margin-bottom: 8px !important;
					}
					checkbox.checked > img {
						box-sizing: border-box;
					}
					checkbox.checked > img {
						outline: 2px solid var(--vscode-focusBorder);
						outline-offset: 4px;
						border-radius: 4px;
					}
					.theme-picker-link {
						margin-top: 16px;
						color: var(--vscode-textLink-foreground);
					}
					blockquote > p:first-child {
						margin-top: 0;
					}
					body > * {
						margin-block-end: 0.25em;
						margin-block-start: 0.25em;
					}
					vertically-centered {
						padding-top: 5px;
						padding-bottom: 5px;
						display: flex;
						justify-content: center;
						flex-direction: column;
					}
					html {
						height: 100%;
						padding-right: 32px;
					}
					h1 {
						font-size: 19.5px;
					}
					h2 {
						font-size: 18.5px;
					}
				</style>
			</head>
			<body>
				<vertically-centered>
					${content}
				</vertically-centered>
			</body>
			<script nonce="${nonce}">
				const vscode = acquireVsCodeApi();

				document.querySelectorAll('[when-checked]').forEach(el => {
					el.addEventListener('click', () => {
						vscode.postMessage(el.getAttribute('when-checked'));
					});
				});

				let ongoingLayout = undefined;
				const doLayout = () => {
					document.querySelectorAll('vertically-centered').forEach(element => {
						element.style.marginTop = Math.max((document.body.clientHeight - element.scrollHeight) * 3/10, 0) + 'px';
					});
					ongoingLayout = undefined;
				};

				const layout = () => {
					if (ongoingLayout) {
						clearTimeout(ongoingLayout);
					}
					ongoingLayout = setTimeout(doLayout, 0);
				};

				layout();

				document.querySelectorAll('img').forEach(element => {
					element.onload = layout;
				})

				window.addEventListener('message', event => {
					if (event.data.layoutMeNow) {
						layout();
					}
					if (event.data.enabledContextKeys) {
						document.querySelectorAll('.checked').forEach(element => element.classList.remove('checked'))
						for (const key of event.data.enabledContextKeys) {
							document.querySelectorAll('[checked-on="' + key + '"]').forEach(element => element.classList.add('checked'))
						}
					}
				});
		</script>
		</html>`;
    }
    async renderSVG(path) {
        const content = await this.readAndCacheSVGFile(path);
        const nonce = generateUuid();
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}
					${css}
					svg {
						position: fixed;
						height: 100%;
						width: 80%;
						left: 50%;
						top: 50%;
						max-width: 530px;
						min-width: 350px;
						transform: translate(-50%,-50%);
					}
				</style>
			</head>
			<body>
				${content}
			</body>
		</html>`;
    }
    async renderVideo(path, poster, description) {
        const nonce = generateUuid();
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; media-src https:; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					video {
						max-width: 100%;
						max-height: 100%;
						object-fit: cover;
					}
				</style>
			</head>
			<body>
				<video controls autoplay ${poster ? `poster="${poster.toString(true)}"` : ''} muted ${description ? `aria-label="${description}"` : ''}>
					<source src="${path.toString(true)}" type="video/mp4">
				</video>
			</body>
		</html>`;
    }
    async readAndCacheSVGFile(path) {
        if (!this.svgCache.has(path)) {
            const contents = await this.readContentsOfPath(path, false);
            this.svgCache.set(path, contents);
        }
        return assertIsDefined(this.svgCache.get(path));
    }
    async readAndCacheStepMarkdown(path, base) {
        if (!this.mdCache.has(path)) {
            const contents = await this.readContentsOfPath(path);
            const markdownContents = await renderMarkdownDocument(transformUris(contents, base), this.extensionService, this.languageService, { allowUnknownProtocols: true });
            this.mdCache.set(path, markdownContents);
        }
        return assertIsDefined(this.mdCache.get(path));
    }
    async readContentsOfPath(path, useModuleId = true) {
        try {
            const moduleId = JSON.parse(path.query).moduleId;
            if (useModuleId && moduleId) {
                const contents = await new Promise((resolve, reject) => {
                    const provider = gettingStartedContentRegistry.getProvider(moduleId);
                    if (!provider) {
                        reject(`Getting started: no provider registered for ${moduleId}`);
                    }
                    else {
                        resolve(provider());
                    }
                });
                return contents;
            }
        }
        catch { }
        try {
            const localizedPath = path.with({ path: path.path.replace(/\.md$/, `.nls.${language}.md`) });
            const generalizedLocale = language?.replace(/-.*$/, '');
            const generalizedLocalizedPath = path.with({ path: path.path.replace(/\.md$/, `.nls.${generalizedLocale}.md`) });
            const fileExists = (file) => this.fileService
                .stat(file)
                .then((stat) => !!stat.size) // Double check the file actually has content for fileSystemProviders that fake `stat`. #131809
                .catch(() => false);
            const [localizedFileExists, generalizedLocalizedFileExists] = await Promise.all([
                fileExists(localizedPath),
                fileExists(generalizedLocalizedPath),
            ]);
            const bytes = await this.fileService.readFile(localizedFileExists
                ? localizedPath
                : generalizedLocalizedFileExists
                    ? generalizedLocalizedPath
                    : path);
            return bytes.value.toString();
        }
        catch (e) {
            this.notificationService.error('Error reading markdown document at `' + path + '`: ' + e);
            return '';
        }
    }
};
GettingStartedDetailsRenderer = __decorate([
    __param(0, IFileService),
    __param(1, INotificationService),
    __param(2, IExtensionService),
    __param(3, ILanguageService)
], GettingStartedDetailsRenderer);
export { GettingStartedDetailsRenderer };
const transformUri = (src, base) => {
    const path = joinPath(base, src);
    return asWebviewUri(path).toString(true);
};
const transformUris = (content, base) => content
    .replace(/src="([^"]*)"/g, (_, src) => {
    if (src.startsWith('https://')) {
        return `src="${src}"`;
    }
    return `src="${transformUri(src, base)}"`;
})
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (_, title, src) => {
    if (src.startsWith('https://')) {
        return `![${title}](${src})`;
    }
    return `![${title}](${transformUri(src, base)})`;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWREZXRhaWxzUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWREZXRhaWxzUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXJILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFv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