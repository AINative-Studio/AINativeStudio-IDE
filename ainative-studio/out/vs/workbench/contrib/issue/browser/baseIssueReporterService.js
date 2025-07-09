var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, isHTMLInputElement, isHTMLTextAreaElement, reset, windowOpenNoOpener } from '../../../../base/browser/dom.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { Button, unthemedButtonStyles } from '../../../../base/browser/ui/button/button.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Delayer, RunOnceScheduler } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { groupBy } from '../../../../base/common/collections.js';
import { debounce } from '../../../../base/common/decorators.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isLinuxSnap, isMacintosh } from '../../../../base/common/platform.js';
import { joinPath } from '../../../../base/common/resources.js';
import { escape } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { getIconsStyleSheet } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IIssueFormService } from '../common/issue.js';
import { normalizeGitHubUrl } from '../common/issueReporterUtil.js';
import { IssueReporterModel } from './issueReporterModel.js';
const MAX_URL_LENGTH = 7500;
// Github API and issues on web has a limit of 65536. If extension data is too large, we will allow users to downlaod and attach it as a file.
// We round down to be safe.
// ref https://github.com/github/issues/issues/12858
const MAX_EXTENSION_DATA_LENGTH = 60000;
var IssueSource;
(function (IssueSource) {
    IssueSource["VSCode"] = "vscode";
    IssueSource["Extension"] = "extension";
    IssueSource["Marketplace"] = "marketplace";
    IssueSource["Unknown"] = "unknown";
})(IssueSource || (IssueSource = {}));
let BaseIssueReporterService = class BaseIssueReporterService extends Disposable {
    constructor(disableExtensions, data, os, product, window, isWeb, issueFormService, themeService, fileService, fileDialogService) {
        super();
        this.disableExtensions = disableExtensions;
        this.data = data;
        this.os = os;
        this.product = product;
        this.window = window;
        this.isWeb = isWeb;
        this.issueFormService = issueFormService;
        this.themeService = themeService;
        this.fileService = fileService;
        this.fileDialogService = fileDialogService;
        this.receivedSystemInfo = false;
        this.numberOfSearchResultsDisplayed = 0;
        this.receivedPerformanceInfo = false;
        this.shouldQueueSearch = false;
        this.hasBeenSubmitted = false;
        this.openReporter = false;
        this.loadingExtensionData = false;
        this.selectedExtension = '';
        this.delayedSubmit = new Delayer(300);
        this.nonGitHubIssueUrl = false;
        this.needsUpdate = false;
        this.acknowledged = false;
        const targetExtension = data.extensionId ? data.enabledExtensions.find(extension => extension.id.toLocaleLowerCase() === data.extensionId?.toLocaleLowerCase()) : undefined;
        this.issueReporterModel = new IssueReporterModel({
            ...data,
            issueType: data.issueType || 0 /* IssueType.Bug */,
            versionInfo: {
                vscodeVersion: `${product.nameShort} ${!!product.darwinUniversalAssetId ? `${product.version} (Universal)` : product.version} (${product.commit || 'Commit unknown'}, ${product.date || 'Date unknown'})`,
                os: `${this.os.type} ${this.os.arch} ${this.os.release}${isLinuxSnap ? ' snap' : ''}`
            },
            extensionsDisabled: !!this.disableExtensions,
            fileOnExtension: data.extensionId ? !targetExtension?.isBuiltin : undefined,
            selectedExtension: targetExtension
        });
        const fileOnMarketplace = data.issueSource === IssueSource.Marketplace;
        const fileOnProduct = data.issueSource === IssueSource.VSCode;
        this.issueReporterModel.update({ fileOnMarketplace, fileOnProduct });
        //TODO: Handle case where extension is not activated
        const issueReporterElement = this.getElementById('issue-reporter');
        if (issueReporterElement) {
            this.previewButton = this._register(new Button(issueReporterElement, unthemedButtonStyles));
            const issueRepoName = document.createElement('a');
            issueReporterElement.appendChild(issueRepoName);
            issueRepoName.id = 'show-repo-name';
            issueRepoName.classList.add('hidden');
            this.updatePreviewButtonState();
        }
        const issueTitle = data.issueTitle;
        if (issueTitle) {
            const issueTitleElement = this.getElementById('issue-title');
            if (issueTitleElement) {
                issueTitleElement.value = issueTitle;
            }
        }
        const issueBody = data.issueBody;
        if (issueBody) {
            const description = this.getElementById('description');
            if (description) {
                description.value = issueBody;
                this.issueReporterModel.update({ issueDescription: issueBody });
            }
        }
        if (this.window.document.documentElement.lang !== 'en') {
            show(this.getElementById('english'));
        }
        const codiconStyleSheet = createStyleSheet();
        codiconStyleSheet.id = 'codiconStyles';
        const iconsStyleSheet = this._register(getIconsStyleSheet(this.themeService));
        function updateAll() {
            codiconStyleSheet.textContent = iconsStyleSheet.getCSS();
        }
        const delayer = new RunOnceScheduler(updateAll, 0);
        this._register(iconsStyleSheet.onDidChange(() => delayer.schedule()));
        delayer.schedule();
        this.handleExtensionData(data.enabledExtensions);
        this.setUpTypes();
        this.applyStyles(data.styles);
        // Handle case where extension is pre-selected through the command
        if ((data.data || data.uri) && targetExtension) {
            this.updateExtensionStatus(targetExtension);
        }
    }
    render() {
        this.renderBlocks();
    }
    setInitialFocus() {
        const { fileOnExtension } = this.issueReporterModel.getData();
        if (fileOnExtension) {
            const issueTitle = this.window.document.getElementById('issue-title');
            issueTitle?.focus();
        }
        else {
            const issueType = this.window.document.getElementById('issue-type');
            issueType?.focus();
        }
    }
    // TODO @justschen: After migration to Aux Window, switch to dedicated css.
    applyStyles(styles) {
        const styleTag = document.createElement('style');
        const content = [];
        if (styles.inputBackground) {
            content.push(`input[type="text"], textarea, select, .issues-container > .issue > .issue-state, .block-info { background-color: ${styles.inputBackground} !important; }`);
        }
        if (styles.backgroundColor) {
            content.push(`.monaco-workbench { background-color: ${styles.backgroundColor} !important; }`);
            content.push(`.issue-reporter-body::-webkit-scrollbar-track { background-color: ${styles.backgroundColor}; }`);
        }
        if (styles.inputBorder) {
            content.push(`input[type="text"], textarea, select { border: 1px solid ${styles.inputBorder}; }`);
        }
        else {
            content.push(`input[type="text"], textarea, select { border: 1px solid transparent; }`);
        }
        if (styles.inputForeground) {
            content.push(`input[type="text"], textarea, select, .issues-container > .issue > .issue-state, .block-info { color: ${styles.inputForeground} !important; }`);
        }
        if (styles.inputErrorBorder) {
            content.push(`.invalid-input, .invalid-input:focus, .validation-error { border: 1px solid ${styles.inputErrorBorder} !important; }`);
            content.push(`.required-input { color: ${styles.inputErrorBorder}; }`);
        }
        if (styles.inputErrorBackground) {
            content.push(`.validation-error { background: ${styles.inputErrorBackground}; }`);
        }
        if (styles.inputErrorForeground) {
            content.push(`.validation-error { color: ${styles.inputErrorForeground}; }`);
        }
        if (styles.inputActiveBorder) {
            content.push(`input[type='text']:focus, textarea:focus, select:focus, summary:focus, button:focus, a:focus, .workbenchCommand:focus  { border: 1px solid ${styles.inputActiveBorder}; outline-style: none; }`);
        }
        if (styles.textLinkColor) {
            content.push(`a, .workbenchCommand { color: ${styles.textLinkColor}; }`);
        }
        if (styles.textLinkColor) {
            content.push(`a { color: ${styles.textLinkColor}; }`);
        }
        if (styles.textLinkActiveForeground) {
            content.push(`a:hover, .workbenchCommand:hover { color: ${styles.textLinkActiveForeground}; }`);
        }
        if (styles.sliderActiveColor) {
            content.push(`.issue-reporter-body::-webkit-scrollbar-thumb:active { background-color: ${styles.sliderActiveColor}; }`);
        }
        if (styles.sliderHoverColor) {
            content.push(`.issue-reporter-body::-webkit-scrollbar-thumb { background-color: ${styles.sliderHoverColor}; }`);
            content.push(`.issue-reporter-body::--webkit-scrollbar-thumb:hover { background-color: ${styles.sliderHoverColor}; }`);
        }
        if (styles.buttonBackground) {
            content.push(`.monaco-text-button { background-color: ${styles.buttonBackground} !important; }`);
        }
        if (styles.buttonForeground) {
            content.push(`.monaco-text-button { color: ${styles.buttonForeground} !important; }`);
        }
        if (styles.buttonHoverBackground) {
            content.push(`.monaco-text-button:not(.disabled):hover, .monaco-text-button:focus { background-color: ${styles.buttonHoverBackground} !important; }`);
        }
        styleTag.textContent = content.join('\n');
        this.window.document.head.appendChild(styleTag);
        this.window.document.body.style.color = styles.color || '';
    }
    async updateIssueReporterUri(extension) {
        try {
            if (extension.uri) {
                const uri = URI.revive(extension.uri);
                extension.bugsUrl = uri.toString();
            }
        }
        catch (e) {
            this.renderBlocks();
        }
    }
    handleExtensionData(extensions) {
        const installedExtensions = extensions.filter(x => !x.isBuiltin);
        const { nonThemes, themes } = groupBy(installedExtensions, ext => {
            return ext.isTheme ? 'themes' : 'nonThemes';
        });
        const numberOfThemeExtesions = themes && themes.length;
        this.issueReporterModel.update({ numberOfThemeExtesions, enabledNonThemeExtesions: nonThemes, allExtensions: installedExtensions });
        this.updateExtensionTable(nonThemes, numberOfThemeExtesions);
        if (this.disableExtensions || installedExtensions.length === 0) {
            this.getElementById('disableExtensions').disabled = true;
        }
        this.updateExtensionSelector(installedExtensions);
    }
    updateExtensionSelector(extensions) {
        const extensionOptions = extensions.map(extension => {
            return {
                name: extension.displayName || extension.name || '',
                id: extension.id
            };
        });
        // Sort extensions by name
        extensionOptions.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            if (aName > bName) {
                return 1;
            }
            if (aName < bName) {
                return -1;
            }
            return 0;
        });
        const makeOption = (extension, selectedExtension) => {
            const selected = selectedExtension && extension.id === selectedExtension.id;
            return $('option', {
                'value': extension.id,
                'selected': selected || ''
            }, extension.name);
        };
        const extensionsSelector = this.getElementById('extension-selector');
        if (extensionsSelector) {
            const { selectedExtension } = this.issueReporterModel.getData();
            reset(extensionsSelector, this.makeOption('', localize('selectExtension', "Select extension"), true), ...extensionOptions.map(extension => makeOption(extension, selectedExtension)));
            if (!selectedExtension) {
                extensionsSelector.selectedIndex = 0;
            }
            this.addEventListener('extension-selector', 'change', async (e) => {
                this.clearExtensionData();
                const selectedExtensionId = e.target.value;
                this.selectedExtension = selectedExtensionId;
                const extensions = this.issueReporterModel.getData().allExtensions;
                const matches = extensions.filter(extension => extension.id === selectedExtensionId);
                if (matches.length) {
                    this.issueReporterModel.update({ selectedExtension: matches[0] });
                    const selectedExtension = this.issueReporterModel.getData().selectedExtension;
                    if (selectedExtension) {
                        const iconElement = document.createElement('span');
                        iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.loading), 'codicon-modifier-spin');
                        this.setLoading(iconElement);
                        const openReporterData = await this.sendReporterMenu(selectedExtension);
                        if (openReporterData) {
                            if (this.selectedExtension === selectedExtensionId) {
                                this.removeLoading(iconElement, true);
                                // this.configuration.data = openReporterData;
                                this.data = openReporterData;
                            }
                            // else if (this.selectedExtension !== selectedExtensionId) {
                            // }
                        }
                        else {
                            if (!this.loadingExtensionData) {
                                iconElement.classList.remove(...ThemeIcon.asClassNameArray(Codicon.loading), 'codicon-modifier-spin');
                            }
                            this.removeLoading(iconElement);
                            // if not using command, should have no configuration data in fields we care about and check later.
                            this.clearExtensionData();
                            // case when previous extension was opened from normal openIssueReporter command
                            selectedExtension.data = undefined;
                            selectedExtension.uri = undefined;
                        }
                        if (this.selectedExtension === selectedExtensionId) {
                            // repopulates the fields with the new data given the selected extension.
                            this.updateExtensionStatus(matches[0]);
                            this.openReporter = false;
                        }
                    }
                    else {
                        this.issueReporterModel.update({ selectedExtension: undefined });
                        this.clearSearchResults();
                        this.clearExtensionData();
                        this.validateSelectedExtension();
                        this.updateExtensionStatus(matches[0]);
                    }
                }
            });
        }
        this.addEventListener('problem-source', 'change', (_) => {
            this.clearExtensionData();
            this.validateSelectedExtension();
        });
    }
    async sendReporterMenu(extension) {
        try {
            const data = await this.issueFormService.sendReporterMenu(extension.id);
            return data;
        }
        catch (e) {
            console.error(e);
            return undefined;
        }
    }
    updateAcknowledgementState() {
        const acknowledgementCheckbox = this.getElementById('includeAcknowledgement');
        if (acknowledgementCheckbox) {
            this.acknowledged = acknowledgementCheckbox.checked;
            this.updatePreviewButtonState();
        }
    }
    setEventHandlers() {
        ['includeSystemInfo', 'includeProcessInfo', 'includeWorkspaceInfo', 'includeExtensions', 'includeExperiments', 'includeExtensionData'].forEach(elementId => {
            this.addEventListener(elementId, 'click', (event) => {
                event.stopPropagation();
                this.issueReporterModel.update({ [elementId]: !this.issueReporterModel.getData()[elementId] });
            });
        });
        this.addEventListener('includeAcknowledgement', 'click', (event) => {
            event.stopPropagation();
            this.updateAcknowledgementState();
        });
        const showInfoElements = this.window.document.getElementsByClassName('showInfo');
        for (let i = 0; i < showInfoElements.length; i++) {
            const showInfo = showInfoElements.item(i);
            showInfo.addEventListener('click', (e) => {
                e.preventDefault();
                const label = e.target;
                if (label) {
                    const containingElement = label.parentElement && label.parentElement.parentElement;
                    const info = containingElement && containingElement.lastElementChild;
                    if (info && info.classList.contains('hidden')) {
                        show(info);
                        label.textContent = localize('hide', "hide");
                    }
                    else {
                        hide(info);
                        label.textContent = localize('show', "show");
                    }
                }
            });
        }
        this.addEventListener('issue-source', 'change', (e) => {
            const value = e.target.value;
            const problemSourceHelpText = this.getElementById('problem-source-help-text');
            if (value === '') {
                this.issueReporterModel.update({ fileOnExtension: undefined });
                show(problemSourceHelpText);
                this.clearSearchResults();
                this.render();
                return;
            }
            else {
                hide(problemSourceHelpText);
            }
            const descriptionTextArea = this.getElementById('issue-title');
            if (value === IssueSource.VSCode) {
                descriptionTextArea.placeholder = localize('vscodePlaceholder', "E.g Workbench is missing problems panel");
            }
            else if (value === IssueSource.Extension) {
                descriptionTextArea.placeholder = localize('extensionPlaceholder', "E.g. Missing alt text on extension readme image");
            }
            else if (value === IssueSource.Marketplace) {
                descriptionTextArea.placeholder = localize('marketplacePlaceholder', "E.g Cannot disable installed extension");
            }
            else {
                descriptionTextArea.placeholder = localize('undefinedPlaceholder', "Please enter a title");
            }
            let fileOnExtension, fileOnMarketplace = false;
            if (value === IssueSource.Extension) {
                fileOnExtension = true;
            }
            else if (value === IssueSource.Marketplace) {
                fileOnMarketplace = true;
            }
            this.issueReporterModel.update({ fileOnExtension, fileOnMarketplace });
            this.render();
            const title = this.getElementById('issue-title').value;
            this.searchIssues(title, fileOnExtension, fileOnMarketplace);
        });
        this.addEventListener('description', 'input', (e) => {
            const issueDescription = e.target.value;
            this.issueReporterModel.update({ issueDescription });
            // Only search for extension issues on title change
            if (this.issueReporterModel.fileOnExtension() === false) {
                const title = this.getElementById('issue-title').value;
                this.searchVSCodeIssues(title, issueDescription);
            }
        });
        this.addEventListener('issue-title', 'input', _ => {
            const titleElement = this.getElementById('issue-title');
            if (titleElement) {
                const title = titleElement.value;
                this.issueReporterModel.update({ issueTitle: title });
            }
        });
        this.addEventListener('issue-title', 'input', (e) => {
            const title = e.target.value;
            const lengthValidationMessage = this.getElementById('issue-title-length-validation-error');
            const issueUrl = this.getIssueUrl();
            if (title && this.getIssueUrlWithTitle(title, issueUrl).length > MAX_URL_LENGTH) {
                show(lengthValidationMessage);
            }
            else {
                hide(lengthValidationMessage);
            }
            const issueSource = this.getElementById('issue-source');
            if (!issueSource || issueSource.value === '') {
                return;
            }
            const { fileOnExtension, fileOnMarketplace } = this.issueReporterModel.getData();
            this.searchIssues(title, fileOnExtension, fileOnMarketplace);
        });
        this._register(this.previewButton.onDidClick(async () => {
            this.delayedSubmit.trigger(async () => {
                this.createIssue();
            });
        }));
        this.addEventListener('disableExtensions', 'click', () => {
            this.issueFormService.reloadWithExtensionsDisabled();
        });
        this.addEventListener('extensionBugsLink', 'click', (e) => {
            const url = e.target.innerText;
            windowOpenNoOpener(url);
        });
        this.addEventListener('disableExtensions', 'keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' || e.key === ' ') {
                this.issueFormService.reloadWithExtensionsDisabled();
            }
        });
        this.window.document.onkeydown = async (e) => {
            const cmdOrCtrlKey = isMacintosh ? e.metaKey : e.ctrlKey;
            // Cmd/Ctrl+Enter previews issue and closes window
            if (cmdOrCtrlKey && e.key === 'Enter') {
                this.delayedSubmit.trigger(async () => {
                    if (await this.createIssue()) {
                        this.close();
                    }
                });
            }
            // Cmd/Ctrl + w closes issue window
            if (cmdOrCtrlKey && e.key === 'w') {
                e.stopPropagation();
                e.preventDefault();
                const issueTitle = this.getElementById('issue-title').value;
                const { issueDescription } = this.issueReporterModel.getData();
                if (!this.hasBeenSubmitted && (issueTitle || issueDescription)) {
                    // fire and forget
                    this.issueFormService.showConfirmCloseDialog();
                }
                else {
                    this.close();
                }
            }
            // With latest electron upgrade, cmd+a is no longer propagating correctly for inputs in this window on mac
            // Manually perform the selection
            if (isMacintosh) {
                if (cmdOrCtrlKey && e.key === 'a' && e.target) {
                    if (isHTMLInputElement(e.target) || isHTMLTextAreaElement(e.target)) {
                        e.target.select();
                    }
                }
            }
        };
    }
    updatePerformanceInfo(info) {
        this.issueReporterModel.update(info);
        this.receivedPerformanceInfo = true;
        const state = this.issueReporterModel.getData();
        this.updateProcessInfo(state);
        this.updateWorkspaceInfo(state);
        this.updatePreviewButtonState();
    }
    updatePreviewButtonState() {
        if (!this.acknowledged && this.needsUpdate) {
            this.previewButton.label = localize('acknowledge', "Confirm Version Acknowledgement");
            this.previewButton.enabled = false;
        }
        else if (this.isPreviewEnabled()) {
            if (this.data.githubAccessToken) {
                this.previewButton.label = localize('createOnGitHub', "Create on GitHub");
            }
            else {
                this.previewButton.label = localize('previewOnGitHub', "Preview on GitHub");
            }
            this.previewButton.enabled = true;
        }
        else {
            this.previewButton.enabled = false;
            this.previewButton.label = localize('loadingData', "Loading data...");
        }
        const issueRepoName = this.getElementById('show-repo-name');
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        if (selectedExtension && selectedExtension.uri) {
            const urlString = URI.revive(selectedExtension.uri).toString();
            issueRepoName.href = urlString;
            issueRepoName.addEventListener('click', (e) => this.openLink(e));
            issueRepoName.addEventListener('auxclick', (e) => this.openLink(e));
            const gitHubInfo = this.parseGitHubUrl(urlString);
            issueRepoName.textContent = gitHubInfo ? gitHubInfo.owner + '/' + gitHubInfo.repositoryName : urlString;
            Object.assign(issueRepoName.style, {
                alignSelf: 'flex-end',
                display: 'block',
                fontSize: '13px',
                marginBottom: '10px',
                padding: '4px 0px',
                textDecoration: 'none',
                width: 'auto'
            });
            show(issueRepoName);
        }
        else {
            // clear styles
            issueRepoName.removeAttribute('style');
            hide(issueRepoName);
        }
        // Initial check when first opened.
        this.getExtensionGitHubUrl();
    }
    isPreviewEnabled() {
        const issueType = this.issueReporterModel.getData().issueType;
        if (this.loadingExtensionData) {
            return false;
        }
        if (this.isWeb) {
            if (issueType === 2 /* IssueType.FeatureRequest */ || issueType === 1 /* IssueType.PerformanceIssue */ || issueType === 0 /* IssueType.Bug */) {
                return true;
            }
        }
        else {
            if (issueType === 0 /* IssueType.Bug */ && this.receivedSystemInfo) {
                return true;
            }
            if (issueType === 1 /* IssueType.PerformanceIssue */ && this.receivedSystemInfo && this.receivedPerformanceInfo) {
                return true;
            }
            if (issueType === 2 /* IssueType.FeatureRequest */) {
                return true;
            }
        }
        return false;
    }
    getExtensionRepositoryUrl() {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        return selectedExtension && selectedExtension.repositoryUrl;
    }
    getExtensionBugsUrl() {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        return selectedExtension && selectedExtension.bugsUrl;
    }
    searchVSCodeIssues(title, issueDescription) {
        if (title) {
            this.searchDuplicates(title, issueDescription);
        }
        else {
            this.clearSearchResults();
        }
    }
    searchIssues(title, fileOnExtension, fileOnMarketplace) {
        if (fileOnExtension) {
            return this.searchExtensionIssues(title);
        }
        if (fileOnMarketplace) {
            return this.searchMarketplaceIssues(title);
        }
        const description = this.issueReporterModel.getData().issueDescription;
        this.searchVSCodeIssues(title, description);
    }
    searchExtensionIssues(title) {
        const url = this.getExtensionGitHubUrl();
        if (title) {
            const matches = /^https?:\/\/github\.com\/(.*)/.exec(url);
            if (matches && matches.length) {
                const repo = matches[1];
                return this.searchGitHub(repo, title);
            }
            // If the extension has no repository, display empty search results
            if (this.issueReporterModel.getData().selectedExtension) {
                this.clearSearchResults();
                return this.displaySearchResults([]);
            }
        }
        this.clearSearchResults();
    }
    searchMarketplaceIssues(title) {
        if (title) {
            const gitHubInfo = this.parseGitHubUrl(this.product.reportMarketplaceIssueUrl);
            if (gitHubInfo) {
                return this.searchGitHub(`${gitHubInfo.owner}/${gitHubInfo.repositoryName}`, title);
            }
        }
    }
    async close() {
        await this.issueFormService.closeReporter();
    }
    clearSearchResults() {
        const similarIssues = this.getElementById('similar-issues');
        similarIssues.innerText = '';
        this.numberOfSearchResultsDisplayed = 0;
    }
    searchGitHub(repo, title) {
        const query = `is:issue+repo:${repo}+${title}`;
        const similarIssues = this.getElementById('similar-issues');
        fetch(`https://api.github.com/search/issues?q=${query}`).then((response) => {
            response.json().then(result => {
                similarIssues.innerText = '';
                if (result && result.items) {
                    this.displaySearchResults(result.items);
                }
                else {
                    // If the items property isn't present, the rate limit has been hit
                    const message = $('div.list-title');
                    message.textContent = localize('rateLimited', "GitHub query limit exceeded. Please wait.");
                    similarIssues.appendChild(message);
                    const resetTime = response.headers.get('X-RateLimit-Reset');
                    const timeToWait = resetTime ? parseInt(resetTime) - Math.floor(Date.now() / 1000) : 1;
                    if (this.shouldQueueSearch) {
                        this.shouldQueueSearch = false;
                        setTimeout(() => {
                            this.searchGitHub(repo, title);
                            this.shouldQueueSearch = true;
                        }, timeToWait * 1000);
                    }
                }
            }).catch(_ => {
                console.warn('Timeout or query limit exceeded');
            });
        }).catch(_ => {
            console.warn('Error fetching GitHub issues');
        });
    }
    searchDuplicates(title, body) {
        const url = 'https://vscode-probot.westus.cloudapp.azure.com:7890/duplicate_candidates';
        const init = {
            method: 'POST',
            body: JSON.stringify({
                title,
                body
            }),
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        };
        fetch(url, init).then((response) => {
            response.json().then(result => {
                this.clearSearchResults();
                if (result && result.candidates) {
                    this.displaySearchResults(result.candidates);
                }
                else {
                    throw new Error('Unexpected response, no candidates property');
                }
            }).catch(_ => {
                // Ignore
            });
        }).catch(_ => {
            // Ignore
        });
    }
    displaySearchResults(results) {
        const similarIssues = this.getElementById('similar-issues');
        if (results.length) {
            const issues = $('div.issues-container');
            const issuesText = $('div.list-title');
            issuesText.textContent = localize('similarIssues', "Similar issues");
            this.numberOfSearchResultsDisplayed = results.length < 5 ? results.length : 5;
            for (let i = 0; i < this.numberOfSearchResultsDisplayed; i++) {
                const issue = results[i];
                const link = $('a.issue-link', { href: issue.html_url });
                link.textContent = issue.title;
                link.title = issue.title;
                link.addEventListener('click', (e) => this.openLink(e));
                link.addEventListener('auxclick', (e) => this.openLink(e));
                let issueState;
                let item;
                if (issue.state) {
                    issueState = $('span.issue-state');
                    const issueIcon = $('span.issue-icon');
                    issueIcon.appendChild(renderIcon(issue.state === 'open' ? Codicon.issueOpened : Codicon.issueClosed));
                    const issueStateLabel = $('span.issue-state.label');
                    issueStateLabel.textContent = issue.state === 'open' ? localize('open', "Open") : localize('closed', "Closed");
                    issueState.title = issue.state === 'open' ? localize('open', "Open") : localize('closed', "Closed");
                    issueState.appendChild(issueIcon);
                    issueState.appendChild(issueStateLabel);
                    item = $('div.issue', undefined, issueState, link);
                }
                else {
                    item = $('div.issue', undefined, link);
                }
                issues.appendChild(item);
            }
            similarIssues.appendChild(issuesText);
            similarIssues.appendChild(issues);
        }
        else {
            const message = $('div.list-title');
            message.textContent = localize('noSimilarIssues', "No similar issues found");
            similarIssues.appendChild(message);
        }
    }
    setUpTypes() {
        const makeOption = (issueType, description) => $('option', { 'value': issueType.valueOf() }, escape(description));
        const typeSelect = this.getElementById('issue-type');
        const { issueType } = this.issueReporterModel.getData();
        reset(typeSelect, makeOption(0 /* IssueType.Bug */, localize('bugReporter', "Bug Report")), makeOption(2 /* IssueType.FeatureRequest */, localize('featureRequest', "Feature Request")), makeOption(1 /* IssueType.PerformanceIssue */, localize('performanceIssue', "Performance Issue (freeze, slow, crash)")));
        typeSelect.value = issueType.toString();
        this.setSourceOptions();
    }
    makeOption(value, description, disabled) {
        const option = document.createElement('option');
        option.disabled = disabled;
        option.value = value;
        option.textContent = description;
        return option;
    }
    setSourceOptions() {
        const sourceSelect = this.getElementById('issue-source');
        const { issueType, fileOnExtension, selectedExtension, fileOnMarketplace, fileOnProduct } = this.issueReporterModel.getData();
        let selected = sourceSelect.selectedIndex;
        if (selected === -1) {
            if (fileOnExtension !== undefined) {
                selected = fileOnExtension ? 2 : 1;
            }
            else if (selectedExtension?.isBuiltin) {
                selected = 1;
            }
            else if (fileOnMarketplace) {
                selected = 3;
            }
            else if (fileOnProduct) {
                selected = 1;
            }
        }
        sourceSelect.innerText = '';
        sourceSelect.append(this.makeOption('', localize('selectSource', "Select source"), true));
        sourceSelect.append(this.makeOption(IssueSource.VSCode, localize('vscode', "Visual Studio Code"), false));
        sourceSelect.append(this.makeOption(IssueSource.Extension, localize('extension', "A VS Code extension"), false));
        if (this.product.reportMarketplaceIssueUrl) {
            sourceSelect.append(this.makeOption(IssueSource.Marketplace, localize('marketplace', "Extensions Marketplace"), false));
        }
        if (issueType !== 2 /* IssueType.FeatureRequest */) {
            sourceSelect.append(this.makeOption(IssueSource.Unknown, localize('unknown', "Don't know"), false));
        }
        if (selected !== -1 && selected < sourceSelect.options.length) {
            sourceSelect.selectedIndex = selected;
        }
        else {
            sourceSelect.selectedIndex = 0;
            hide(this.getElementById('problem-source-help-text'));
        }
    }
    async renderBlocks() {
        // Depending on Issue Type, we render different blocks and text
        const { issueType, fileOnExtension, fileOnMarketplace, selectedExtension } = this.issueReporterModel.getData();
        const blockContainer = this.getElementById('block-container');
        const systemBlock = this.window.document.querySelector('.block-system');
        const processBlock = this.window.document.querySelector('.block-process');
        const workspaceBlock = this.window.document.querySelector('.block-workspace');
        const extensionsBlock = this.window.document.querySelector('.block-extensions');
        const experimentsBlock = this.window.document.querySelector('.block-experiments');
        const extensionDataBlock = this.window.document.querySelector('.block-extension-data');
        const problemSource = this.getElementById('problem-source');
        const descriptionTitle = this.getElementById('issue-description-label');
        const descriptionSubtitle = this.getElementById('issue-description-subtitle');
        const extensionSelector = this.getElementById('extension-selection');
        const downloadExtensionDataLink = this.getElementById('extension-data-download');
        const titleTextArea = this.getElementById('issue-title-container');
        const descriptionTextArea = this.getElementById('description');
        const extensionDataTextArea = this.getElementById('extension-data');
        // Hide all by default
        hide(blockContainer);
        hide(systemBlock);
        hide(processBlock);
        hide(workspaceBlock);
        hide(extensionsBlock);
        hide(experimentsBlock);
        hide(extensionSelector);
        hide(extensionDataTextArea);
        hide(extensionDataBlock);
        hide(downloadExtensionDataLink);
        show(problemSource);
        show(titleTextArea);
        show(descriptionTextArea);
        if (fileOnExtension) {
            show(extensionSelector);
        }
        const extensionData = this.issueReporterModel.getData().extensionData;
        if (extensionData && extensionData.length > MAX_EXTENSION_DATA_LENGTH) {
            show(downloadExtensionDataLink);
            const date = new Date();
            const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
            const fileName = `extensionData_${formattedDate}_${formattedTime}.md`;
            const handleLinkClick = async () => {
                const downloadPath = await this.fileDialogService.showSaveDialog({
                    title: localize('saveExtensionData', "Save Extension Data"),
                    availableFileSystems: [Schemas.file],
                    defaultUri: joinPath(await this.fileDialogService.defaultFilePath(Schemas.file), fileName),
                });
                if (downloadPath) {
                    await this.fileService.writeFile(downloadPath, VSBuffer.fromString(extensionData));
                }
            };
            downloadExtensionDataLink.addEventListener('click', handleLinkClick);
            this._register({
                dispose: () => downloadExtensionDataLink.removeEventListener('click', handleLinkClick)
            });
        }
        if (selectedExtension && this.nonGitHubIssueUrl) {
            hide(titleTextArea);
            hide(descriptionTextArea);
            reset(descriptionTitle, localize('handlesIssuesElsewhere', "This extension handles issues outside of VS Code"));
            reset(descriptionSubtitle, localize('elsewhereDescription', "The '{0}' extension prefers to use an external issue reporter. To be taken to that issue reporting experience, click the button below.", selectedExtension.displayName));
            this.previewButton.label = localize('openIssueReporter', "Open External Issue Reporter");
            return;
        }
        if (fileOnExtension && selectedExtension?.data) {
            const data = selectedExtension?.data;
            extensionDataTextArea.innerText = data.toString();
            extensionDataTextArea.readOnly = true;
            show(extensionDataBlock);
        }
        // only if we know comes from the open reporter command
        if (fileOnExtension && this.openReporter) {
            extensionDataTextArea.readOnly = true;
            setTimeout(() => {
                // delay to make sure from command or not
                if (this.openReporter) {
                    show(extensionDataBlock);
                }
            }, 100);
            show(extensionDataBlock);
        }
        if (issueType === 0 /* IssueType.Bug */) {
            if (!fileOnMarketplace) {
                show(blockContainer);
                show(systemBlock);
                show(experimentsBlock);
                if (!fileOnExtension) {
                    show(extensionsBlock);
                }
            }
            reset(descriptionTitle, localize('stepsToReproduce', "Steps to Reproduce") + ' ', $('span.required-input', undefined, '*'));
            reset(descriptionSubtitle, localize('bugDescription', "Share the steps needed to reliably reproduce the problem. Please include actual and expected results. We support GitHub-flavored Markdown. You will be able to edit your issue and add screenshots when we preview it on GitHub."));
        }
        else if (issueType === 1 /* IssueType.PerformanceIssue */) {
            if (!fileOnMarketplace) {
                show(blockContainer);
                show(systemBlock);
                show(processBlock);
                show(workspaceBlock);
                show(experimentsBlock);
            }
            if (fileOnExtension) {
                show(extensionSelector);
            }
            else if (!fileOnMarketplace) {
                show(extensionsBlock);
            }
            reset(descriptionTitle, localize('stepsToReproduce', "Steps to Reproduce") + ' ', $('span.required-input', undefined, '*'));
            reset(descriptionSubtitle, localize('performanceIssueDesciption', "When did this performance issue happen? Does it occur on startup or after a specific series of actions? We support GitHub-flavored Markdown. You will be able to edit your issue and add screenshots when we preview it on GitHub."));
        }
        else if (issueType === 2 /* IssueType.FeatureRequest */) {
            reset(descriptionTitle, localize('description', "Description") + ' ', $('span.required-input', undefined, '*'));
            reset(descriptionSubtitle, localize('featureRequestDescription', "Please describe the feature you would like to see. We support GitHub-flavored Markdown. You will be able to edit your issue and add screenshots when we preview it on GitHub."));
        }
    }
    validateInput(inputId) {
        const inputElement = this.getElementById(inputId);
        const inputValidationMessage = this.getElementById(`${inputId}-empty-error`);
        const descriptionShortMessage = this.getElementById(`description-short-error`);
        if (inputId === 'description' && this.nonGitHubIssueUrl && this.data.extensionId) {
            return true;
        }
        else if (!inputElement.value) {
            inputElement.classList.add('invalid-input');
            inputValidationMessage?.classList.remove('hidden');
            descriptionShortMessage?.classList.add('hidden');
            return false;
        }
        else if (inputId === 'description' && inputElement.value.length < 10) {
            inputElement.classList.add('invalid-input');
            descriptionShortMessage?.classList.remove('hidden');
            inputValidationMessage?.classList.add('hidden');
            return false;
        }
        else {
            inputElement.classList.remove('invalid-input');
            inputValidationMessage?.classList.add('hidden');
            if (inputId === 'description') {
                descriptionShortMessage?.classList.add('hidden');
            }
            return true;
        }
    }
    validateInputs() {
        let isValid = true;
        ['issue-title', 'description', 'issue-source'].forEach(elementId => {
            isValid = this.validateInput(elementId) && isValid;
        });
        if (this.issueReporterModel.fileOnExtension()) {
            isValid = this.validateInput('extension-selector') && isValid;
        }
        return isValid;
    }
    async submitToGitHub(issueTitle, issueBody, gitHubDetails) {
        const url = `https://api.github.com/repos/${gitHubDetails.owner}/${gitHubDetails.repositoryName}/issues`;
        const init = {
            method: 'POST',
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody
            }),
            headers: new Headers({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.data.githubAccessToken}`,
                'User-Agent': 'request'
            })
        };
        const response = await fetch(url, init);
        if (!response.ok) {
            console.error('Invalid GitHub URL provided.');
            return false;
        }
        const result = await response.json();
        mainWindow.open(result.html_url, '_blank');
        this.close();
        return true;
    }
    async createIssue() {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        const hasUri = this.nonGitHubIssueUrl;
        // Short circuit if the extension provides a custom issue handler
        if (hasUri) {
            const url = this.getExtensionBugsUrl();
            if (url) {
                this.hasBeenSubmitted = true;
                return true;
            }
        }
        if (!this.validateInputs()) {
            // If inputs are invalid, set focus to the first one and add listeners on them
            // to detect further changes
            const invalidInput = this.window.document.getElementsByClassName('invalid-input');
            if (invalidInput.length) {
                invalidInput[0].focus();
            }
            this.addEventListener('issue-title', 'input', _ => {
                this.validateInput('issue-title');
            });
            this.addEventListener('description', 'input', _ => {
                this.validateInput('description');
            });
            this.addEventListener('issue-source', 'change', _ => {
                this.validateInput('issue-source');
            });
            if (this.issueReporterModel.fileOnExtension()) {
                this.addEventListener('extension-selector', 'change', _ => {
                    this.validateInput('extension-selector');
                });
            }
            return false;
        }
        this.hasBeenSubmitted = true;
        const issueTitle = this.getElementById('issue-title').value;
        const issueBody = this.issueReporterModel.serialize();
        let issueUrl = this.getIssueUrl();
        if (!issueUrl) {
            console.error('No issue url found');
            return false;
        }
        if (selectedExtension?.uri) {
            const uri = URI.revive(selectedExtension.uri);
            issueUrl = uri.toString();
        }
        const gitHubDetails = this.parseGitHubUrl(issueUrl);
        if (this.data.githubAccessToken && gitHubDetails) {
            return this.submitToGitHub(issueTitle, issueBody, gitHubDetails);
        }
        const baseUrl = this.getIssueUrlWithTitle(this.getElementById('issue-title').value, issueUrl);
        let url = baseUrl + `&body=${encodeURIComponent(issueBody)}`;
        if (url.length > MAX_URL_LENGTH) {
            try {
                url = await this.writeToClipboard(baseUrl, issueBody);
            }
            catch (_) {
                console.error('Writing to clipboard failed');
                return false;
            }
        }
        this.window.open(url, '_blank');
        return true;
    }
    async writeToClipboard(baseUrl, issueBody) {
        const shouldWrite = await this.issueFormService.showClipboardDialog();
        if (!shouldWrite) {
            throw new CancellationError();
        }
        return baseUrl + `&body=${encodeURIComponent(localize('pasteData', "We have written the needed data into your clipboard because it was too large to send. Please paste."))}`;
    }
    getIssueUrl() {
        return this.issueReporterModel.fileOnExtension()
            ? this.getExtensionGitHubUrl()
            : this.issueReporterModel.getData().fileOnMarketplace
                ? this.product.reportMarketplaceIssueUrl
                : this.product.reportIssueUrl;
    }
    parseGitHubUrl(url) {
        // Assumes a GitHub url to a particular repo, https://github.com/repositoryName/owner.
        // Repository name and owner cannot contain '/'
        const match = /^https?:\/\/github\.com\/([^\/]*)\/([^\/]*).*/.exec(url);
        if (match && match.length) {
            return {
                owner: match[1],
                repositoryName: match[2]
            };
        }
        else {
            console.error('No GitHub issues match');
        }
        return undefined;
    }
    getExtensionGitHubUrl() {
        let repositoryUrl = '';
        const bugsUrl = this.getExtensionBugsUrl();
        const extensionUrl = this.getExtensionRepositoryUrl();
        // If given, try to match the extension's bug url
        if (bugsUrl && bugsUrl.match(/^https?:\/\/github\.com\/([^\/]*)\/([^\/]*)\/?(\/issues)?$/)) {
            // matches exactly: https://github.com/owner/repo/issues
            repositoryUrl = normalizeGitHubUrl(bugsUrl);
        }
        else if (extensionUrl && extensionUrl.match(/^https?:\/\/github\.com\/([^\/]*)\/([^\/]*)$/)) {
            // matches exactly: https://github.com/owner/repo
            repositoryUrl = normalizeGitHubUrl(extensionUrl);
        }
        else {
            this.nonGitHubIssueUrl = true;
            repositoryUrl = bugsUrl || extensionUrl || '';
        }
        return repositoryUrl;
    }
    getIssueUrlWithTitle(issueTitle, repositoryUrl) {
        if (this.issueReporterModel.fileOnExtension()) {
            repositoryUrl = repositoryUrl + '/issues/new';
        }
        const queryStringPrefix = repositoryUrl.indexOf('?') === -1 ? '?' : '&';
        return `${repositoryUrl}${queryStringPrefix}title=${encodeURIComponent(issueTitle)}`;
    }
    clearExtensionData() {
        this.nonGitHubIssueUrl = false;
        this.issueReporterModel.update({ extensionData: undefined });
        this.data.issueBody = this.data.issueBody || '';
        this.data.data = undefined;
        this.data.uri = undefined;
    }
    async updateExtensionStatus(extension) {
        this.issueReporterModel.update({ selectedExtension: extension });
        // uses this.configuuration.data to ensure that data is coming from `openReporter` command.
        const template = this.data.issueBody;
        if (template) {
            const descriptionTextArea = this.getElementById('description');
            const descriptionText = descriptionTextArea.value;
            if (descriptionText === '' || !descriptionText.includes(template.toString())) {
                const fullTextArea = descriptionText + (descriptionText === '' ? '' : '\n') + template.toString();
                descriptionTextArea.value = fullTextArea;
                this.issueReporterModel.update({ issueDescription: fullTextArea });
            }
        }
        const data = this.data.data;
        if (data) {
            this.issueReporterModel.update({ extensionData: data });
            extension.data = data;
            const extensionDataBlock = this.window.document.querySelector('.block-extension-data');
            show(extensionDataBlock);
            this.renderBlocks();
        }
        const uri = this.data.uri;
        if (uri) {
            extension.uri = uri;
            this.updateIssueReporterUri(extension);
        }
        this.validateSelectedExtension();
        const title = this.getElementById('issue-title').value;
        this.searchExtensionIssues(title);
        this.updatePreviewButtonState();
        this.renderBlocks();
    }
    validateSelectedExtension() {
        const extensionValidationMessage = this.getElementById('extension-selection-validation-error');
        const extensionValidationNoUrlsMessage = this.getElementById('extension-selection-validation-error-no-url');
        hide(extensionValidationMessage);
        hide(extensionValidationNoUrlsMessage);
        const extension = this.issueReporterModel.getData().selectedExtension;
        if (!extension) {
            this.previewButton.enabled = true;
            return;
        }
        if (this.loadingExtensionData) {
            return;
        }
        const hasValidGitHubUrl = this.getExtensionGitHubUrl();
        if (hasValidGitHubUrl) {
            this.previewButton.enabled = true;
        }
        else {
            this.setExtensionValidationMessage();
            this.previewButton.enabled = false;
        }
    }
    setLoading(element) {
        // Show loading
        this.openReporter = true;
        this.loadingExtensionData = true;
        this.updatePreviewButtonState();
        const extensionDataCaption = this.getElementById('extension-id');
        hide(extensionDataCaption);
        const extensionDataCaption2 = Array.from(this.window.document.querySelectorAll('.ext-parens'));
        extensionDataCaption2.forEach(extensionDataCaption2 => hide(extensionDataCaption2));
        const showLoading = this.getElementById('ext-loading');
        show(showLoading);
        while (showLoading.firstChild) {
            showLoading.firstChild.remove();
        }
        showLoading.append(element);
        this.renderBlocks();
    }
    removeLoading(element, fromReporter = false) {
        this.openReporter = fromReporter;
        this.loadingExtensionData = false;
        this.updatePreviewButtonState();
        const extensionDataCaption = this.getElementById('extension-id');
        show(extensionDataCaption);
        const extensionDataCaption2 = Array.from(this.window.document.querySelectorAll('.ext-parens'));
        extensionDataCaption2.forEach(extensionDataCaption2 => show(extensionDataCaption2));
        const hideLoading = this.getElementById('ext-loading');
        hide(hideLoading);
        if (hideLoading.firstChild) {
            element.remove();
        }
        this.renderBlocks();
    }
    setExtensionValidationMessage() {
        const extensionValidationMessage = this.getElementById('extension-selection-validation-error');
        const extensionValidationNoUrlsMessage = this.getElementById('extension-selection-validation-error-no-url');
        const bugsUrl = this.getExtensionBugsUrl();
        if (bugsUrl) {
            show(extensionValidationMessage);
            const link = this.getElementById('extensionBugsLink');
            link.textContent = bugsUrl;
            return;
        }
        const extensionUrl = this.getExtensionRepositoryUrl();
        if (extensionUrl) {
            show(extensionValidationMessage);
            const link = this.getElementById('extensionBugsLink');
            link.textContent = extensionUrl;
            return;
        }
        show(extensionValidationNoUrlsMessage);
    }
    updateProcessInfo(state) {
        const target = this.window.document.querySelector('.block-process .block-info');
        if (target) {
            reset(target, $('code', undefined, state.processInfo ?? ''));
        }
    }
    updateWorkspaceInfo(state) {
        this.window.document.querySelector('.block-workspace .block-info code').textContent = '\n' + state.workspaceInfo;
    }
    updateExtensionTable(extensions, numThemeExtensions) {
        const target = this.window.document.querySelector('.block-extensions .block-info');
        if (target) {
            if (this.disableExtensions) {
                reset(target, localize('disabledExtensions', "Extensions are disabled"));
                return;
            }
            const themeExclusionStr = numThemeExtensions ? `\n(${numThemeExtensions} theme extensions excluded)` : '';
            extensions = extensions || [];
            if (!extensions.length) {
                target.innerText = 'Extensions: none' + themeExclusionStr;
                return;
            }
            reset(target, this.getExtensionTableHtml(extensions), document.createTextNode(themeExclusionStr));
        }
    }
    getExtensionTableHtml(extensions) {
        return $('table', undefined, $('tr', undefined, $('th', undefined, 'Extension'), $('th', undefined, 'Author (truncated)'), $('th', undefined, 'Version')), ...extensions.map(extension => $('tr', undefined, $('td', undefined, extension.name), $('td', undefined, extension.publisher?.substr(0, 3) ?? 'N/A'), $('td', undefined, extension.version))));
    }
    openLink(event) {
        event.preventDefault();
        event.stopPropagation();
        // Exclude right click
        if (event.which < 3) {
            windowOpenNoOpener(event.target.href);
        }
    }
    getElementById(elementId) {
        const element = this.window.document.getElementById(elementId);
        if (element) {
            return element;
        }
        else {
            return undefined;
        }
    }
    addEventListener(elementId, eventType, handler) {
        const element = this.getElementById(elementId);
        element?.addEventListener(eventType, handler);
    }
};
__decorate([
    debounce(300)
], BaseIssueReporterService.prototype, "searchGitHub", null);
__decorate([
    debounce(300)
], BaseIssueReporterService.prototype, "searchDuplicates", null);
BaseIssueReporterService = __decorate([
    __param(6, IIssueFormService),
    __param(7, IThemeService),
    __param(8, IFileService),
    __param(9, IFileDialogService)
], BaseIssueReporterService);
export { BaseIssueReporterService };
// helper functions
export function hide(el) {
    el?.classList.add('hidden');
}
export function show(el) {
    el?.classList.remove('hidden');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUlzc3VlUmVwb3J0ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2Jyb3dzZXIvYmFzZUlzc3VlUmVwb3J0ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxDQUFDLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFB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