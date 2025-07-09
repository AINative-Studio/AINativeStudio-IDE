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
var TelemetryContribution_1;
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { language } from '../../../../base/common/platform.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import ErrorTelemetry from '../../../../platform/telemetry/browser/errorTelemetry.js';
import { supportsTelemetry, TelemetryLogGroup, telemetryLogId, TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { ConfigurationTargetToString, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { extname, basename, isEqual, isEqualOrParent } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { getMimeTypes } from '../../../../editor/common/services/languagesAssociations.js';
import { hash } from '../../../../base/common/hash.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { isBoolean, isNumber, isString } from '../../../../base/common/types.js';
import { AutoRestartConfigurationKey, AutoUpdateConfigurationKey } from '../../extensions/common/extensions.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ILoggerService, LogLevel } from '../../../../platform/log/common/log.js';
let TelemetryContribution = class TelemetryContribution extends Disposable {
    static { TelemetryContribution_1 = this; }
    static { this.ALLOWLIST_JSON = ['package.json', 'package-lock.json', 'tsconfig.json', 'jsconfig.json', 'bower.json', '.eslintrc.json', 'tslint.json', 'composer.json']; }
    static { this.ALLOWLIST_WORKSPACE_JSON = ['settings.json', 'extensions.json', 'tasks.json', 'launch.json']; }
    constructor(telemetryService, contextService, lifecycleService, editorService, keybindingsService, themeService, environmentService, userDataProfileService, paneCompositeService, productService, loggerService, outputService, textFileService) {
        super();
        this.telemetryService = telemetryService;
        this.contextService = contextService;
        this.userDataProfileService = userDataProfileService;
        this.loggerService = loggerService;
        this.outputService = outputService;
        const { filesToOpenOrCreate, filesToDiff, filesToMerge } = environmentService;
        const activeViewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        telemetryService.publicLog2('workspaceLoad', {
            windowSize: { innerHeight: mainWindow.innerHeight, innerWidth: mainWindow.innerWidth, outerHeight: mainWindow.outerHeight, outerWidth: mainWindow.outerWidth },
            emptyWorkbench: contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */,
            'workbench.filesToOpenOrCreate': filesToOpenOrCreate && filesToOpenOrCreate.length || 0,
            'workbench.filesToDiff': filesToDiff && filesToDiff.length || 0,
            'workbench.filesToMerge': filesToMerge && filesToMerge.length || 0,
            customKeybindingsCount: keybindingsService.customKeybindingsCount(),
            theme: themeService.getColorTheme().id,
            language,
            pinnedViewlets: paneCompositeService.getPinnedPaneCompositeIds(0 /* ViewContainerLocation.Sidebar */),
            restoredViewlet: activeViewlet ? activeViewlet.getId() : undefined,
            restoredEditors: editorService.visibleEditors.length,
            startupKind: lifecycleService.startupKind
        });
        // Error Telemetry
        this._register(new ErrorTelemetry(telemetryService));
        //  Files Telemetry
        this._register(textFileService.files.onDidResolve(e => this.onTextFileModelResolved(e)));
        this._register(textFileService.files.onDidSave(e => this.onTextFileModelSaved(e)));
        // Lifecycle
        this._register(lifecycleService.onDidShutdown(() => this.dispose()));
        if (supportsTelemetry(productService, environmentService)) {
            this.handleTelemetryOutputVisibility();
        }
    }
    onTextFileModelResolved(e) {
        const settingsType = this.getTypeIfSettings(e.model.resource);
        if (!settingsType) {
            this.telemetryService.publicLog2('fileGet', this.getTelemetryData(e.model.resource, e.reason));
        }
    }
    onTextFileModelSaved(e) {
        const settingsType = this.getTypeIfSettings(e.model.resource);
        if (!settingsType) {
            this.telemetryService.publicLog2('filePUT', this.getTelemetryData(e.model.resource, e.reason));
        }
    }
    getTypeIfSettings(resource) {
        if (extname(resource) !== '.json') {
            return '';
        }
        // Check for global settings file
        if (isEqual(resource, this.userDataProfileService.currentProfile.settingsResource)) {
            return 'global-settings';
        }
        // Check for keybindings file
        if (isEqual(resource, this.userDataProfileService.currentProfile.keybindingsResource)) {
            return 'keybindings';
        }
        // Check for snippets
        if (isEqualOrParent(resource, this.userDataProfileService.currentProfile.snippetsHome)) {
            return 'snippets';
        }
        // Check for workspace settings file
        const folders = this.contextService.getWorkspace().folders;
        for (const folder of folders) {
            if (isEqualOrParent(resource, folder.toResource('.vscode'))) {
                const filename = basename(resource);
                if (TelemetryContribution_1.ALLOWLIST_WORKSPACE_JSON.indexOf(filename) > -1) {
                    return `.vscode/${filename}`;
                }
            }
        }
        return '';
    }
    getTelemetryData(resource, reason) {
        let ext = extname(resource);
        // Remove query parameters from the resource extension
        const queryStringLocation = ext.indexOf('?');
        ext = queryStringLocation !== -1 ? ext.substr(0, queryStringLocation) : ext;
        const fileName = basename(resource);
        const path = resource.scheme === Schemas.file ? resource.fsPath : resource.path;
        const telemetryData = {
            mimeType: new TelemetryTrustedValue(getMimeTypes(resource).join(', ')),
            ext,
            path: hash(path),
            reason,
            allowlistedjson: undefined
        };
        if (ext === '.json' && TelemetryContribution_1.ALLOWLIST_JSON.indexOf(fileName) > -1) {
            telemetryData['allowlistedjson'] = fileName;
        }
        return telemetryData;
    }
    async handleTelemetryOutputVisibility() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.showTelemetry',
                    title: localize2('showTelemetry', "Show Telemetry"),
                    category: Categories.Developer,
                    f1: true
                });
            }
            async run() {
                for (const logger of that.loggerService.getRegisteredLoggers()) {
                    if (logger.group?.id === TelemetryLogGroup.id) {
                        that.loggerService.setLogLevel(logger.resource, LogLevel.Trace);
                        that.loggerService.setVisibility(logger.resource, true);
                    }
                }
                that.outputService.showChannel(TelemetryLogGroup.id);
            }
        }));
        if (![...this.loggerService.getRegisteredLoggers()].find(logger => logger.id === telemetryLogId)) {
            await Event.toPromise(Event.filter(this.loggerService.onDidChangeLoggers, e => [...e.added].some(logger => logger.id === telemetryLogId)));
        }
        let showTelemetry = false;
        for (const logger of this.loggerService.getRegisteredLoggers()) {
            if (logger.id === telemetryLogId) {
                showTelemetry = this.loggerService.getLogLevel() === LogLevel.Trace || !logger.hidden;
                if (showTelemetry) {
                    this.loggerService.setVisibility(logger.id, true);
                }
                break;
            }
        }
        if (showTelemetry) {
            const showExtensionTelemetry = (loggers) => {
                for (const logger of loggers) {
                    if (logger.group?.id === TelemetryLogGroup.id) {
                        that.loggerService.setLogLevel(logger.resource, LogLevel.Trace);
                        this.loggerService.setVisibility(logger.id, true);
                    }
                }
            };
            showExtensionTelemetry(this.loggerService.getRegisteredLoggers());
            this._register(this.loggerService.onDidChangeLoggers(e => showExtensionTelemetry(e.added)));
        }
    }
};
TelemetryContribution = TelemetryContribution_1 = __decorate([
    __param(0, ITelemetryService),
    __param(1, IWorkspaceContextService),
    __param(2, ILifecycleService),
    __param(3, IEditorService),
    __param(4, IKeybindingService),
    __param(5, IWorkbenchThemeService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, IUserDataProfileService),
    __param(8, IPaneCompositePartService),
    __param(9, IProductService),
    __param(10, ILoggerService),
    __param(11, IOutputService),
    __param(12, ITextFileService)
], TelemetryContribution);
export { TelemetryContribution };
let ConfigurationTelemetryContribution = class ConfigurationTelemetryContribution extends Disposable {
    constructor(configurationService, userDataProfilesService, telemetryService) {
        super();
        this.configurationService = configurationService;
        this.userDataProfilesService = userDataProfilesService;
        this.telemetryService = telemetryService;
        this.configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        const { user, workspace } = configurationService.keys();
        for (const setting of user) {
            this.reportTelemetry(setting, 3 /* ConfigurationTarget.USER_LOCAL */);
        }
        for (const setting of workspace) {
            this.reportTelemetry(setting, 5 /* ConfigurationTarget.WORKSPACE */);
        }
    }
    /**
     * Report value of a setting only if it is an enum, boolean, or number or an array of those.
     */
    getValueToReport(key, target) {
        const inpsectData = this.configurationService.inspect(key);
        const value = target === 3 /* ConfigurationTarget.USER_LOCAL */ ? inpsectData.user?.value : inpsectData.workspace?.value;
        if (isNumber(value) || isBoolean(value)) {
            return value.toString();
        }
        const schema = this.configurationRegistry.getConfigurationProperties()[key];
        if (isString(value)) {
            if (schema?.enum?.includes(value)) {
                return value;
            }
            return undefined;
        }
        if (Array.isArray(value)) {
            if (value.every(v => isNumber(v) || isBoolean(v) || (isString(v) && schema?.enum?.includes(v)))) {
                return JSON.stringify(value);
            }
        }
        return undefined;
    }
    reportTelemetry(key, target) {
        const source = ConfigurationTargetToString(target);
        switch (key) {
            case "workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */:
                this.telemetryService.publicLog2('workbench.activityBar.location', { settingValue: this.getValueToReport(key, target), source });
                return;
            case AutoUpdateConfigurationKey:
                this.telemetryService.publicLog2('extensions.autoUpdate', { settingValue: this.getValueToReport(key, target), source });
                return;
            case 'editor.stickyScroll.enabled':
                this.telemetryService.publicLog2('editor.stickyScroll.enabled', { settingValue: this.getValueToReport(key, target), source });
                return;
            case 'typescript.experimental.expandableHover':
                this.telemetryService.publicLog2('typescript.experimental.expandableHover', { settingValue: this.getValueToReport(key, target), source });
                return;
            case 'window.titleBarStyle':
                this.telemetryService.publicLog2('window.titleBarStyle', { settingValue: this.getValueToReport(key, target), source });
                return;
            case 'extensions.verifySignature':
                this.telemetryService.publicLog2('extensions.verifySignature', { settingValue: this.getValueToReport(key, target), source });
                return;
            case 'window.newWindowProfile':
                {
                    const valueToReport = this.getValueToReport(key, target);
                    const settingValue = valueToReport === null ? 'null'
                        : valueToReport === this.userDataProfilesService.defaultProfile.name
                            ? 'default'
                            : 'custom';
                    this.telemetryService.publicLog2('window.newWindowProfile', { settingValue, source });
                    return;
                }
            case AutoRestartConfigurationKey:
                this.telemetryService.publicLog2('extensions.autoRestart', { settingValue: this.getValueToReport(key, target), source });
                return;
        }
    }
};
ConfigurationTelemetryContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IUserDataProfilesService),
    __param(2, ITelemetryService)
], ConfigurationTelemetryContribution);
const workbenchContributionRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContributionRegistry.registerWorkbenchContribution(TelemetryContribution, 3 /* LifecyclePhase.Restored */);
workbenchContributionRegistry.registerWorkbenchContribution(ConfigurationTelemetryContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZWxlbWV0cnkvYnJvd3Nlci90ZWxlbWV0cnkuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBMkQsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5SSxPQUFPLEVBQWtCLGlCQUFpQixFQUFlLE1BQU0saURBQWlELENBQUM7QUFDakgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFrQixNQUFNLG9EQUFvRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLGNBQWMsTUFBTSwwREFBMEQsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURB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