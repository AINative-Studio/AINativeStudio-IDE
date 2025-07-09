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
import './media/releasenoteseditor.css';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { escapeMarkdownSyntaxTokens } from '../../../../base/common/htmlContent.js';
import { KeybindingParser } from '../../../../base/common/keybindingParser.js';
import { escape } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import * as nls from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asTextOrError, IRequestService } from '../../../../platform/request/common/request.js';
import { DEFAULT_MARKDOWN_STYLES, renderMarkdownDocument } from '../../markdown/browser/markdownDocumentRenderer.js';
import { IWebviewWorkbenchService } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { getTelemetryLevel, supportsTelemetry } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { SimpleSettingRenderer } from '../../markdown/browser/markdownSettingRenderer.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Schemas } from '../../../../base/common/network.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { dirname } from '../../../../base/common/resources.js';
import { asWebviewUri } from '../../webview/common/webview.js';
let ReleaseNotesManager = class ReleaseNotesManager {
    constructor(_environmentService, _keybindingService, _languageService, _openerService, _requestService, _configurationService, _editorService, _editorGroupService, _codeEditorService, _webviewWorkbenchService, _extensionService, _productService, _instantiationService) {
        this._environmentService = _environmentService;
        this._keybindingService = _keybindingService;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._requestService = _requestService;
        this._configurationService = _configurationService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._codeEditorService = _codeEditorService;
        this._webviewWorkbenchService = _webviewWorkbenchService;
        this._extensionService = _extensionService;
        this._productService = _productService;
        this._instantiationService = _instantiationService;
        this._releaseNotesCache = new Map();
        this._currentReleaseNotes = undefined;
        this.disposables = new DisposableStore();
        TokenizationRegistry.onDidChange(() => {
            return this.updateHtml();
        });
        _configurationService.onDidChangeConfiguration(this.onDidChangeConfiguration, this, this.disposables);
        _webviewWorkbenchService.onDidChangeActiveWebviewEditor(this.onDidChangeActiveWebviewEditor, this, this.disposables);
        this._simpleSettingRenderer = this._instantiationService.createInstance(SimpleSettingRenderer);
    }
    async updateHtml() {
        if (!this._currentReleaseNotes || !this._lastMeta) {
            return;
        }
        const html = await this.renderBody(this._lastMeta);
        if (this._currentReleaseNotes) {
            this._currentReleaseNotes.webview.setHtml(html);
        }
    }
    async getBase(useCurrentFile) {
        if (useCurrentFile) {
            const currentFileUri = this._codeEditorService.getActiveCodeEditor()?.getModel()?.uri;
            if (currentFileUri) {
                return dirname(currentFileUri);
            }
        }
        return URI.parse('https://code.visualstudio.com/raw');
    }
    async show(version, useCurrentFile) {
        const releaseNoteText = await this.loadReleaseNotes(version, useCurrentFile);
        const base = await this.getBase(useCurrentFile);
        this._lastMeta = { text: releaseNoteText, base };
        const html = await this.renderBody(this._lastMeta);
        const title = nls.localize('releaseNotesInputName', "Release Notes: {0}", version);
        const activeEditorPane = this._editorService.activeEditorPane;
        if (this._currentReleaseNotes) {
            this._currentReleaseNotes.setName(title);
            this._currentReleaseNotes.webview.setHtml(html);
            this._webviewWorkbenchService.revealWebview(this._currentReleaseNotes, activeEditorPane ? activeEditorPane.group : this._editorGroupService.activeGroup, false);
        }
        else {
            this._currentReleaseNotes = this._webviewWorkbenchService.openWebview({
                title,
                options: {
                    tryRestoreScrollPosition: true,
                    enableFindWidget: true,
                    disableServiceWorker: useCurrentFile ? false : true,
                },
                contentOptions: {
                    localResourceRoots: useCurrentFile ? [base] : [],
                    allowScripts: true
                },
                extension: undefined
            }, 'releaseNotes', title, { group: ACTIVE_GROUP, preserveFocus: false });
            this._currentReleaseNotes.webview.onDidClickLink(uri => this.onDidClickLink(URI.parse(uri)));
            const disposables = new DisposableStore();
            disposables.add(this._currentReleaseNotes.webview.onMessage(e => {
                if (e.message.type === 'showReleaseNotes') {
                    this._configurationService.updateValue('update.showReleaseNotes', e.message.value);
                }
                else if (e.message.type === 'clickSetting') {
                    const x = this._currentReleaseNotes?.webview.container.offsetLeft + e.message.value.x;
                    const y = this._currentReleaseNotes?.webview.container.offsetTop + e.message.value.y;
                    this._simpleSettingRenderer.updateSetting(URI.parse(e.message.value.uri), x, y);
                }
            }));
            disposables.add(this._currentReleaseNotes.onWillDispose(() => {
                disposables.dispose();
                this._currentReleaseNotes = undefined;
            }));
            this._currentReleaseNotes.webview.setHtml(html);
        }
        return true;
    }
    async loadReleaseNotes(version, useCurrentFile) {
        const match = /^(\d+\.\d+)\./.exec(version);
        if (!match) {
            throw new Error('not found');
        }
        const versionLabel = match[1].replace(/\./g, '_');
        const baseUrl = 'https://code.visualstudio.com/raw';
        const url = `${baseUrl}/v${versionLabel}.md`;
        const unassigned = nls.localize('unassigned', "unassigned");
        const escapeMdHtml = (text) => {
            return escape(text).replace(/\\/g, '\\\\');
        };
        const patchKeybindings = (text) => {
            const kb = (match, kb) => {
                const keybinding = this._keybindingService.lookupKeybinding(kb);
                if (!keybinding) {
                    return unassigned;
                }
                return keybinding.getLabel() || unassigned;
            };
            const kbstyle = (match, kb) => {
                const keybinding = KeybindingParser.parseKeybinding(kb);
                if (!keybinding) {
                    return unassigned;
                }
                const resolvedKeybindings = this._keybindingService.resolveKeybinding(keybinding);
                if (resolvedKeybindings.length === 0) {
                    return unassigned;
                }
                return resolvedKeybindings[0].getLabel() || unassigned;
            };
            const kbCode = (match, binding) => {
                const resolved = kb(match, binding);
                return resolved ? `<code title="${binding}">${escapeMdHtml(resolved)}</code>` : resolved;
            };
            const kbstyleCode = (match, binding) => {
                const resolved = kbstyle(match, binding);
                return resolved ? `<code title="${binding}">${escapeMdHtml(resolved)}</code>` : resolved;
            };
            return text
                .replace(/`kb\(([a-z.\d\-]+)\)`/gi, kbCode)
                .replace(/`kbstyle\(([^\)]+)\)`/gi, kbstyleCode)
                .replace(/kb\(([a-z.\d\-]+)\)/gi, (match, binding) => escapeMarkdownSyntaxTokens(kb(match, binding)))
                .replace(/kbstyle\(([^\)]+)\)/gi, (match, binding) => escapeMarkdownSyntaxTokens(kbstyle(match, binding)));
        };
        const fetchReleaseNotes = async () => {
            let text;
            try {
                if (useCurrentFile) {
                    const file = this._codeEditorService.getActiveCodeEditor()?.getModel()?.getValue();
                    text = file ? file.substring(file.indexOf('#')) : undefined;
                }
                else {
                    text = await asTextOrError(await this._requestService.request({ url }, CancellationToken.None));
                }
            }
            catch {
                throw new Error('Failed to fetch release notes');
            }
            if (!text || (!/^#\s/.test(text) && !useCurrentFile)) { // release notes always starts with `#` followed by whitespace, except when using the current file
                throw new Error('Invalid release notes');
            }
            return patchKeybindings(text);
        };
        // Don't cache the current file
        if (useCurrentFile) {
            return fetchReleaseNotes();
        }
        if (!this._releaseNotesCache.has(version)) {
            this._releaseNotesCache.set(version, (async () => {
                try {
                    return await fetchReleaseNotes();
                }
                catch (err) {
                    this._releaseNotesCache.delete(version);
                    throw err;
                }
            })());
        }
        return this._releaseNotesCache.get(version);
    }
    async onDidClickLink(uri) {
        if (uri.scheme === Schemas.codeSetting) {
            // handled in receive message
        }
        else {
            this.addGAParameters(uri, 'ReleaseNotes')
                .then(updated => this._openerService.open(updated, { allowCommands: ['workbench.action.openSettings'] }))
                .then(undefined, onUnexpectedError);
        }
    }
    async addGAParameters(uri, origin, experiment = '1') {
        if (supportsTelemetry(this._productService, this._environmentService) && getTelemetryLevel(this._configurationService) === 3 /* TelemetryLevel.USAGE */) {
            if (uri.scheme === 'https' && uri.authority === 'code.visualstudio.com') {
                return uri.with({ query: `${uri.query ? uri.query + '&' : ''}utm_source=VsCode&utm_medium=${encodeURIComponent(origin)}&utm_content=${encodeURIComponent(experiment)}` });
            }
        }
        return uri;
    }
    async renderBody(fileContent) {
        const nonce = generateUuid();
        const content = await renderMarkdownDocument(fileContent.text, this._extensionService, this._languageService, {
            shouldSanitize: false,
            markedExtensions: [{
                    renderer: {
                        html: this._simpleSettingRenderer.getHtmlRenderer(),
                        codespan: this._simpleSettingRenderer.getCodeSpanRenderer(),
                    }
                }]
        });
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        const showReleaseNotes = Boolean(this._configurationService.getValue('update.showReleaseNotes'));
        return `<!DOCTYPE html>
		<html>
			<head>
				<base href="${asWebviewUri(fileContent.base).toString(true)}/" >
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; style-src 'nonce-${nonce}' https://code.visualstudio.com; script-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}
					${css}

					/* codesetting */

					code:has(.codesetting) {
						background-color: var(--vscode-textPreformat-background);
						color: var(--vscode-textPreformat-foreground);
						padding-left: 1px;
						margin-right: 3px;
						padding-right: 0px;
					}

					code:has(.codesetting):focus {
						border: 1px solid var(--vscode-button-border, transparent);
					}

					.codesetting {
						color: var(--vscode-textPreformat-foreground);
						padding: 0px 1px 1px 0px;
						font-size: 0px;
						overflow: hidden;
						text-overflow: ellipsis;
						outline-offset: 2px !important;
						box-sizing: border-box;
						text-align: center;
						cursor: pointer;
						display: inline;
						margin-right: 3px;
					}
					.codesetting svg {
						font-size: 12px;
						text-align: center;
						cursor: pointer;
						border: 1px solid var(--vscode-button-secondaryBorder, transparent);
						outline: 1px solid transparent;
						line-height: 9px;
						margin-bottom: -5px;
						padding-left: 0px;
						padding-top: 2px;
						padding-bottom: 2px;
						padding-right: 2px;
						display: inline-block;
						text-decoration: none;
						text-rendering: auto;
						text-transform: none;
						-webkit-font-smoothing: antialiased;
						-moz-osx-font-smoothing: grayscale;
						user-select: none;
						-webkit-user-select: none;
					}
					.codesetting .setting-name {
						font-size: 13px;
						padding-left: 2px;
						padding-right: 3px;
						padding-top: 1px;
						padding-bottom: 1px;
						margin-top: -3px;
					}
					.codesetting:hover {
						color: var(--vscode-textPreformat-foreground) !important;
						text-decoration: none !important;
					}
					code:has(.codesetting):hover {
						filter: brightness(140%);
						text-decoration: none !important;
					}
					.codesetting:focus {
						outline: 0 !important;
						text-decoration: none !important;
						color: var(--vscode-button-hoverForeground) !important;
					}
					.codesetting .separator {
						width: 1px;
						height: 14px;
						margin-bottom: -3px;
						display: inline-block;
						background-color: var(--vscode-editor-background);
						font-size: 12px;
						margin-right: 4px;
					}

					header { display: flex; align-items: center; padding-top: 1em; }
				</style>
			</head>
			<body>
				${content}
				<script nonce="${nonce}">
					const vscode = acquireVsCodeApi();
					const container = document.createElement('p');
					container.style.display = 'flex';
					container.style.alignItems = 'center';

					const input = document.createElement('input');
					input.type = 'checkbox';
					input.id = 'showReleaseNotes';
					input.checked = ${showReleaseNotes};
					container.appendChild(input);

					const label = document.createElement('label');
					label.htmlFor = 'showReleaseNotes';
					label.textContent = '${nls.localize('showOnUpdate', "Show release notes after an update")}';
					container.appendChild(label);

					const beforeElement = document.querySelector("body > h1")?.nextElementSibling;
					if (beforeElement) {
						document.body.insertBefore(container, beforeElement);
					} else {
						document.body.appendChild(container);
					}

					window.addEventListener('message', event => {
						if (event.data.type === 'showReleaseNotes') {
							input.checked = event.data.value;
						}
					});

					window.addEventListener('click', event => {
						const href = event.target.href ?? event.target.parentElement?.href ?? event.target.parentElement?.parentElement?.href;
						if (href && (href.startsWith('${Schemas.codeSetting}'))) {
							vscode.postMessage({ type: 'clickSetting', value: { uri: href, x: event.clientX, y: event.clientY }});
						}
					});

					window.addEventListener('keypress', event => {
						if (event.keyCode === 13) {
							if (event.target.children.length > 0 && event.target.children[0].href) {
								const clientRect = event.target.getBoundingClientRect();
								vscode.postMessage({ type: 'clickSetting', value: { uri: event.target.children[0].href, x: clientRect.right , y: clientRect.bottom }});
							}
						}
					});

					input.addEventListener('change', event => {
						vscode.postMessage({ type: 'showReleaseNotes', value: input.checked }, '*');
					});
				</script>
			</body>
		</html>`;
    }
    onDidChangeConfiguration(e) {
        if (e.affectsConfiguration('update.showReleaseNotes')) {
            this.updateCheckboxWebview();
        }
    }
    onDidChangeActiveWebviewEditor(input) {
        if (input && input === this._currentReleaseNotes) {
            this.updateCheckboxWebview();
        }
    }
    updateCheckboxWebview() {
        if (this._currentReleaseNotes) {
            this._currentReleaseNotes.webview.postMessage({
                type: 'showReleaseNotes',
                value: this._configurationService.getValue('update.showReleaseNotes')
            });
        }
    }
};
ReleaseNotesManager = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IKeybindingService),
    __param(2, ILanguageService),
    __param(3, IOpenerService),
    __param(4, IRequestService),
    __param(5, IConfigurationService),
    __param(6, IEditorService),
    __param(7, IEditorGroupsService),
    __param(8, ICodeEditorService),
    __param(9, IWebviewWorkbenchService),
    __param(10, IExtensionService),
    __param(11, IProductService),
    __param(12, IInstantiationService)
], ReleaseNotesManager);
export { ReleaseNotesManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVsZWFzZU5vdGVzRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VwZGF0ZS9icm93c2VyL3JlbGVhc2VOb3Rlc0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxlQUFl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