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
import { getZoomLevel } from '../../../../base/browser/browser.js';
import * as dom from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { userAgent } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { normalizeGitHubUrl } from '../common/issueReporterUtil.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { buttonBackground, buttonForeground, buttonHoverBackground, foreground, inputActiveOptionBorder, inputBackground, inputBorder, inputForeground, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground, scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground, textLinkActiveForeground, textLinkForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { IIssueFormService, IWorkbenchIssueService } from '../common/issue.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IIntegrityService } from '../../../services/integrity/common/integrity.js';
let BrowserIssueService = class BrowserIssueService {
    constructor(extensionService, productService, issueFormService, themeService, experimentService, workspaceTrustManagementService, integrityService, extensionManagementService, extensionEnablementService, authenticationService, configurationService) {
        this.extensionService = extensionService;
        this.productService = productService;
        this.issueFormService = issueFormService;
        this.themeService = themeService;
        this.experimentService = experimentService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.integrityService = integrityService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.authenticationService = authenticationService;
        this.configurationService = configurationService;
    }
    async openReporter(options) {
        // If web reporter setting is false open the old GitHub issue reporter
        if (!this.configurationService.getValue('issueReporter.experimental.webReporter')) {
            const extensionId = options.extensionId;
            // If we don't have a extensionId, treat this as a Core issue
            if (!extensionId) {
                if (this.productService.reportIssueUrl) {
                    const uri = this.getIssueUriFromStaticContent(this.productService.reportIssueUrl);
                    dom.windowOpenNoOpener(uri);
                    return;
                }
                throw new Error(`No issue reporting URL configured for ${this.productService.nameLong}.`);
            }
            const selectedExtension = this.extensionService.extensions.filter(ext => ext.identifier.value === options.extensionId)[0];
            const extensionGitHubUrl = this.getExtensionGitHubUrl(selectedExtension);
            if (!extensionGitHubUrl) {
                throw new Error(`Unable to find issue reporting url for ${extensionId}`);
            }
            const uri = this.getIssueUriFromStaticContent(`${extensionGitHubUrl}/issues/new`, selectedExtension);
            dom.windowOpenNoOpener(uri);
        }
        if (this.productService.reportIssueUrl) {
            const theme = this.themeService.getColorTheme();
            const experiments = await this.experimentService.getCurrentExperiments();
            let githubAccessToken = '';
            try {
                const githubSessions = await this.authenticationService.getSessions('github');
                const potentialSessions = githubSessions.filter(session => session.scopes.includes('repo'));
                githubAccessToken = potentialSessions[0]?.accessToken;
            }
            catch (e) {
                // Ignore
            }
            // air on the side of caution and have false be the default
            let isUnsupported = false;
            try {
                isUnsupported = !(await this.integrityService.isPure()).isPure;
            }
            catch (e) {
                // Ignore
            }
            const extensionData = [];
            try {
                const extensions = await this.extensionManagementService.getInstalled();
                const enabledExtensions = extensions.filter(extension => this.extensionEnablementService.isEnabled(extension) || (options.extensionId && extension.identifier.id === options.extensionId));
                extensionData.push(...enabledExtensions.map((extension) => {
                    const { manifest } = extension;
                    const manifestKeys = manifest.contributes ? Object.keys(manifest.contributes) : [];
                    const isTheme = !manifest.main && !manifest.browser && manifestKeys.length === 1 && manifestKeys[0] === 'themes';
                    const isBuiltin = extension.type === 0 /* ExtensionType.System */;
                    return {
                        name: manifest.name,
                        publisher: manifest.publisher,
                        version: manifest.version,
                        repositoryUrl: manifest.repository && manifest.repository.url,
                        bugsUrl: manifest.bugs && manifest.bugs.url,
                        displayName: manifest.displayName,
                        id: extension.identifier.id,
                        data: options.data,
                        uri: options.uri,
                        isTheme,
                        isBuiltin,
                        extensionData: 'Extensions data loading',
                    };
                }));
            }
            catch (e) {
                extensionData.push({
                    name: 'Workbench Issue Service',
                    publisher: 'Unknown',
                    version: 'Unknown',
                    repositoryUrl: undefined,
                    bugsUrl: undefined,
                    extensionData: `Extensions not loaded: ${e}`,
                    displayName: `Extensions not loaded: ${e}`,
                    id: 'workbench.issue',
                    isTheme: false,
                    isBuiltin: true
                });
            }
            const issueReporterData = Object.assign({
                styles: getIssueReporterStyles(theme),
                zoomLevel: getZoomLevel(mainWindow),
                enabledExtensions: extensionData,
                experiments: experiments?.join('\n'),
                restrictedMode: !this.workspaceTrustManagementService.isWorkspaceTrusted(),
                isUnsupported,
                githubAccessToken
            }, options);
            return this.issueFormService.openReporter(issueReporterData);
        }
        throw new Error(`No issue reporting URL configured for ${this.productService.nameLong}.`);
    }
    getExtensionGitHubUrl(extension) {
        if (extension.isBuiltin && this.productService.reportIssueUrl) {
            return normalizeGitHubUrl(this.productService.reportIssueUrl);
        }
        let repositoryUrl = '';
        const bugsUrl = extension?.bugs?.url;
        const extensionUrl = extension?.repository?.url;
        // If given, try to match the extension's bug url
        if (bugsUrl && bugsUrl.match(/^https?:\/\/github\.com\/(.*)/)) {
            repositoryUrl = normalizeGitHubUrl(bugsUrl);
        }
        else if (extensionUrl && extensionUrl.match(/^https?:\/\/github\.com\/(.*)/)) {
            repositoryUrl = normalizeGitHubUrl(extensionUrl);
        }
        return repositoryUrl;
    }
    getIssueUriFromStaticContent(baseUri, extension) {
        const issueDescription = `ADD ISSUE DESCRIPTION HERE

Version: ${this.productService.version}
Commit: ${this.productService.commit ?? 'unknown'}
User Agent: ${userAgent ?? 'unknown'}
Embedder: ${this.productService.embedderIdentifier ?? 'unknown'}
${extension?.version ? `\nExtension version: ${extension.version}` : ''}
<!-- generated by web issue reporter -->`;
        return `${baseUri}?body=${encodeURIComponent(issueDescription)}&labels=web`;
    }
};
BrowserIssueService = __decorate([
    __param(0, IExtensionService),
    __param(1, IProductService),
    __param(2, IIssueFormService),
    __param(3, IThemeService),
    __param(4, IWorkbenchAssignmentService),
    __param(5, IWorkspaceTrustManagementService),
    __param(6, IIntegrityService),
    __param(7, IExtensionManagementService),
    __param(8, IWorkbenchExtensionEnablementService),
    __param(9, IAuthenticationService),
    __param(10, IConfigurationService)
], BrowserIssueService);
export { BrowserIssueService };
export function getIssueReporterStyles(theme) {
    return {
        backgroundColor: getColor(theme, SIDE_BAR_BACKGROUND),
        color: getColor(theme, foreground),
        textLinkColor: getColor(theme, textLinkForeground),
        textLinkActiveForeground: getColor(theme, textLinkActiveForeground),
        inputBackground: getColor(theme, inputBackground),
        inputForeground: getColor(theme, inputForeground),
        inputBorder: getColor(theme, inputBorder),
        inputActiveBorder: getColor(theme, inputActiveOptionBorder),
        inputErrorBorder: getColor(theme, inputValidationErrorBorder),
        inputErrorBackground: getColor(theme, inputValidationErrorBackground),
        inputErrorForeground: getColor(theme, inputValidationErrorForeground),
        buttonBackground: getColor(theme, buttonBackground),
        buttonForeground: getColor(theme, buttonForeground),
        buttonHoverBackground: getColor(theme, buttonHoverBackground),
        sliderActiveColor: getColor(theme, scrollbarSliderActiveBackground),
        sliderBackgroundColor: getColor(theme, scrollbarSliderBackground),
        sliderHoverColor: getColor(theme, scrollbarSliderHoverBackground),
    };
}
function getColor(theme, key) {
    const color = theme.getColor(key);
    return color ? color.toString() : undefined;
}
registerSingleton(IWorkbenchIssueService, BrowserIssueService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2Jyb3dzZXIvaXNzdWVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFFckgsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxFQUFFLHVCQUF1QixFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLDhCQUE4QixFQUFFLDBCQUEwQixFQUFFLDhCQUE4QixFQUFFLCtCQUErQixFQUFFLHlCQUF5QixFQUFFLDhCQUE4QixFQUFFLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDemIsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxnQ0FB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