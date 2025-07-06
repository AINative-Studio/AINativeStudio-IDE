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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvYnJvd3Nlci9pc3N1ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUVySCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxxQkFBcUIsRUFBRSxVQUFVLEVBQUUsdUJBQXVCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsOEJBQThCLEVBQUUsMEJBQTBCLEVBQUUsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUseUJBQXlCLEVBQUUsOEJBQThCLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN6YixPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0YsT0FBTyxFQUFFLGdDQUFn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