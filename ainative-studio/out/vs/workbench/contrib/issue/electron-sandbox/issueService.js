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
import { mainWindow } from '../../../../base/browser/window.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { buttonBackground, buttonForeground, buttonHoverBackground, foreground, inputActiveOptionBorder, inputBackground, inputBorder, inputForeground, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground, scrollbarSliderActiveBackground, scrollbarSliderHoverBackground, textLinkActiveForeground, textLinkForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { IIssueFormService, IWorkbenchIssueService } from '../common/issue.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IIntegrityService } from '../../../services/integrity/common/integrity.js';
let NativeIssueService = class NativeIssueService {
    constructor(issueFormService, themeService, extensionManagementService, extensionEnablementService, workspaceTrustManagementService, experimentService, authenticationService, integrityService) {
        this.issueFormService = issueFormService;
        this.themeService = themeService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.experimentService = experimentService;
        this.authenticationService = authenticationService;
        this.integrityService = integrityService;
    }
    async openReporter(dataOverrides = {}) {
        const extensionData = [];
        try {
            const extensions = await this.extensionManagementService.getInstalled();
            const enabledExtensions = extensions.filter(extension => this.extensionEnablementService.isEnabled(extension) || (dataOverrides.extensionId && extension.identifier.id === dataOverrides.extensionId));
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
                    data: dataOverrides.data,
                    uri: dataOverrides.uri,
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
                version: '0.0.0',
                repositoryUrl: undefined,
                bugsUrl: undefined,
                extensionData: 'Extensions data loading',
                displayName: `Extensions not loaded: ${e}`,
                id: 'workbench.issue',
                isTheme: false,
                isBuiltin: true
            });
        }
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
        const theme = this.themeService.getColorTheme();
        const issueReporterData = Object.assign({
            styles: getIssueReporterStyles(theme),
            zoomLevel: getZoomLevel(mainWindow),
            enabledExtensions: extensionData,
            experiments: experiments?.join('\n'),
            restrictedMode: !this.workspaceTrustManagementService.isWorkspaceTrusted(),
            isUnsupported,
            githubAccessToken
        }, dataOverrides);
        return this.issueFormService.openReporter(issueReporterData);
    }
};
NativeIssueService = __decorate([
    __param(0, IIssueFormService),
    __param(1, IThemeService),
    __param(2, IExtensionManagementService),
    __param(3, IWorkbenchExtensionEnablementService),
    __param(4, IWorkspaceTrustManagementService),
    __param(5, IWorkbenchAssignmentService),
    __param(6, IAuthenticationService),
    __param(7, IIntegrityService)
], NativeIssueService);
export { NativeIssueService };
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
        sliderBackgroundColor: getColor(theme, SIDE_BAR_BACKGROUND),
        sliderHoverColor: getColor(theme, scrollbarSliderHoverBackground),
    };
}
function getColor(theme, key) {
    const color = theme.getColor(key);
    return color ? color.toString() : undefined;
}
registerSingleton(IWorkbenchIssueService, NativeIssueService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2VsZWN0cm9uLXNhbmRib3gvaXNzdWVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFFckgsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxxQkFBcUIsRUFBRSxVQUFVLEVBQUUsdUJBQXVCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsOEJBQThCLEVBQUUsMEJBQTBCLEVBQUUsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUsOEJBQThCLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5WixPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0YsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDM0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFzRSxzQkFBc0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25KLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFD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