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
import { $, reset } from '../../../../base/browser/dom.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { isRemoteDiagnosticError } from '../../../../platform/diagnostics/common/diagnostics.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProcessMainService } from '../../../../platform/process/common/process.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { applyZoom } from '../../../../platform/window/electron-sandbox/window.js';
import { BaseIssueReporterService } from '../browser/baseIssueReporterService.js';
import { IIssueFormService } from '../common/issue.js';
// GitHub has let us know that we could up our limit here to 8k. We chose 7500 to play it safe.
// ref https://github.com/microsoft/vscode/issues/159191
const MAX_URL_LENGTH = 7500;
// Github API and issues on web has a limit of 65536. We chose 65500 to play it safe.
// ref https://github.com/github/issues/issues/12858
const MAX_GITHUB_API_LENGTH = 65500;
let IssueReporter = class IssueReporter extends BaseIssueReporterService {
    constructor(disableExtensions, data, os, product, window, nativeHostService, issueFormService, processMainService, themeService, fileService, fileDialogService, updateService) {
        super(disableExtensions, data, os, product, window, false, issueFormService, themeService, fileService, fileDialogService);
        this.nativeHostService = nativeHostService;
        this.updateService = updateService;
        this.processMainService = processMainService;
        this.processMainService.$getSystemInfo().then(info => {
            this.issueReporterModel.update({ systemInfo: info });
            this.receivedSystemInfo = true;
            this.updateSystemInfo(this.issueReporterModel.getData());
            this.updatePreviewButtonState();
        });
        if (this.data.issueType === 1 /* IssueType.PerformanceIssue */) {
            this.processMainService.$getPerformanceInfo().then(info => {
                this.updatePerformanceInfo(info);
            });
        }
        this.checkForUpdates();
        this.setEventHandlers();
        applyZoom(this.data.zoomLevel, this.window);
        this.updateExperimentsInfo(this.data.experiments);
        this.updateRestrictedMode(this.data.restrictedMode);
        this.updateUnsupportedMode(this.data.isUnsupported);
    }
    async checkForUpdates() {
        const updateState = this.updateService.state;
        if (updateState.type === "ready" /* StateType.Ready */ || updateState.type === "downloaded" /* StateType.Downloaded */) {
            this.needsUpdate = true;
            const includeAcknowledgement = this.getElementById('version-acknowledgements');
            const updateBanner = this.getElementById('update-banner');
            if (updateBanner && includeAcknowledgement) {
                includeAcknowledgement.classList.remove('hidden');
                updateBanner.classList.remove('hidden');
                updateBanner.textContent = localize('updateAvailable', "A new version of {0} is available.", this.product.nameLong);
            }
        }
    }
    setEventHandlers() {
        super.setEventHandlers();
        this.addEventListener('issue-type', 'change', (event) => {
            const issueType = parseInt(event.target.value);
            this.issueReporterModel.update({ issueType: issueType });
            if (issueType === 1 /* IssueType.PerformanceIssue */ && !this.receivedPerformanceInfo) {
                this.processMainService.$getPerformanceInfo().then(info => {
                    this.updatePerformanceInfo(info);
                });
            }
            // Resets placeholder
            const descriptionTextArea = this.getElementById('issue-title');
            if (descriptionTextArea) {
                descriptionTextArea.placeholder = localize('undefinedPlaceholder', "Please enter a title");
            }
            this.updatePreviewButtonState();
            this.setSourceOptions();
            this.render();
        });
    }
    async submitToGitHub(issueTitle, issueBody, gitHubDetails) {
        if (issueBody.length > MAX_GITHUB_API_LENGTH) {
            const extensionData = this.issueReporterModel.getData().extensionData;
            if (extensionData) {
                issueBody = issueBody.replace(extensionData, '');
                const date = new Date();
                const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
                const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
                const fileName = `extensionData_${formattedDate}_${formattedTime}.md`;
                try {
                    const downloadPath = await this.fileDialogService.showSaveDialog({
                        title: localize('saveExtensionData', "Save Extension Data"),
                        availableFileSystems: [Schemas.file],
                        defaultUri: joinPath(await this.fileDialogService.defaultFilePath(Schemas.file), fileName),
                    });
                    if (downloadPath) {
                        await this.fileService.writeFile(downloadPath, VSBuffer.fromString(extensionData));
                    }
                }
                catch (e) {
                    console.error('Writing extension data to file failed');
                    return false;
                }
            }
            else {
                console.error('Issue body too large to submit to GitHub');
                return false;
            }
        }
        const url = `https://api.github.com/repos/${gitHubDetails.owner}/${gitHubDetails.repositoryName}/issues`;
        const init = {
            method: 'POST',
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody
            }),
            headers: new Headers({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.data.githubAccessToken}`
            })
        };
        const response = await fetch(url, init);
        if (!response.ok) {
            console.error('Invalid GitHub URL provided.');
            return false;
        }
        const result = await response.json();
        await this.nativeHostService.openExternal(result.html_url);
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
                await this.nativeHostService.openExternal(url);
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
                    this.validateInput('description');
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
        const baseUrl = this.getIssueUrlWithTitle(this.getElementById('issue-title').value, issueUrl);
        let url = baseUrl + `&body=${encodeURIComponent(issueBody)}`;
        if (this.data.githubAccessToken && gitHubDetails) {
            if (await this.submitToGitHub(issueTitle, issueBody, gitHubDetails)) {
                return true;
            }
        }
        try {
            if (url.length > MAX_URL_LENGTH || issueBody.length > MAX_GITHUB_API_LENGTH) {
                url = await this.writeToClipboard(baseUrl, issueBody);
            }
        }
        catch (_) {
            console.error('Writing to clipboard failed');
            return false;
        }
        await this.nativeHostService.openExternal(url);
        return true;
    }
    async writeToClipboard(baseUrl, issueBody) {
        const shouldWrite = await this.issueFormService.showClipboardDialog();
        if (!shouldWrite) {
            throw new CancellationError();
        }
        await this.nativeHostService.writeClipboardText(issueBody);
        return baseUrl + `&body=${encodeURIComponent(localize('pasteData', "We have written the needed data into your clipboard because it was too large to send. Please paste."))}`;
    }
    updateSystemInfo(state) {
        const target = this.window.document.querySelector('.block-system .block-info');
        if (target) {
            const systemInfo = state.systemInfo;
            const renderedDataTable = $('table', undefined, $('tr', undefined, $('td', undefined, 'CPUs'), $('td', undefined, systemInfo.cpus || '')), $('tr', undefined, $('td', undefined, 'GPU Status'), $('td', undefined, Object.keys(systemInfo.gpuStatus).map(key => `${key}: ${systemInfo.gpuStatus[key]}`).join('\n'))), $('tr', undefined, $('td', undefined, 'Load (avg)'), $('td', undefined, systemInfo.load || '')), $('tr', undefined, $('td', undefined, 'Memory (System)'), $('td', undefined, systemInfo.memory)), $('tr', undefined, $('td', undefined, 'Process Argv'), $('td', undefined, systemInfo.processArgs)), $('tr', undefined, $('td', undefined, 'Screen Reader'), $('td', undefined, systemInfo.screenReader)), $('tr', undefined, $('td', undefined, 'VM'), $('td', undefined, systemInfo.vmHint)));
            reset(target, renderedDataTable);
            systemInfo.remoteData.forEach(remote => {
                target.appendChild($('hr'));
                if (isRemoteDiagnosticError(remote)) {
                    const remoteDataTable = $('table', undefined, $('tr', undefined, $('td', undefined, 'Remote'), $('td', undefined, remote.hostName)), $('tr', undefined, $('td', undefined, ''), $('td', undefined, remote.errorMessage)));
                    target.appendChild(remoteDataTable);
                }
                else {
                    const remoteDataTable = $('table', undefined, $('tr', undefined, $('td', undefined, 'Remote'), $('td', undefined, remote.latency ? `${remote.hostName} (latency: ${remote.latency.current.toFixed(2)}ms last, ${remote.latency.average.toFixed(2)}ms average)` : remote.hostName)), $('tr', undefined, $('td', undefined, 'OS'), $('td', undefined, remote.machineInfo.os)), $('tr', undefined, $('td', undefined, 'CPUs'), $('td', undefined, remote.machineInfo.cpus || '')), $('tr', undefined, $('td', undefined, 'Memory (System)'), $('td', undefined, remote.machineInfo.memory)), $('tr', undefined, $('td', undefined, 'VM'), $('td', undefined, remote.machineInfo.vmHint)));
                    target.appendChild(remoteDataTable);
                }
            });
        }
    }
    updateRestrictedMode(restrictedMode) {
        this.issueReporterModel.update({ restrictedMode });
    }
    updateUnsupportedMode(isUnsupported) {
        this.issueReporterModel.update({ isUnsupported });
    }
    updateExperimentsInfo(experimentInfo) {
        this.issueReporterModel.update({ experimentInfo });
        const target = this.window.document.querySelector('.block-experiments .block-info');
        if (target) {
            target.textContent = experimentInfo ? experimentInfo : localize('noCurrentExperiments', "No current experiments.");
        }
    }
};
IssueReporter = __decorate([
    __param(5, INativeHostService),
    __param(6, IIssueFormService),
    __param(7, IProcessMainService),
    __param(8, IThemeService),
    __param(9, IFileService),
    __param(10, IFileDialogService),
    __param(11, IUpdateService)
], IssueReporter);
export { IssueReporter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVSZXBvcnRlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvZWxlY3Ryb24tc2FuZGJveC9pc3N1ZVJlcG9ydGVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDakcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFhLE1BQU0sOENBQThDLENBQUM7QUFDekYsT0FBTyxFQUFFLFNBQVMsRUFB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