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
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { mixin } from '../../../base/common/objects.js';
import { isWeb } from '../../../base/common/platform.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { Extensions } from '../../configuration/common/configurationRegistry.js';
import product from '../../product/common/product.js';
import { IProductService } from '../../product/common/productService.js';
import { Registry } from '../../registry/common/platform.js';
import { TELEMETRY_CRASH_REPORTER_SETTING_ID, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SECTION_ID, TELEMETRY_SETTING_ID } from './telemetry.js';
import { cleanData, getTelemetryLevel } from './telemetryUtils.js';
let TelemetryService = class TelemetryService {
    static { this.IDLE_START_EVENT_NAME = 'UserIdleStart'; }
    static { this.IDLE_STOP_EVENT_NAME = 'UserIdleStop'; }
    constructor(config, _configurationService, _productService) {
        this._configurationService = _configurationService;
        this._productService = _productService;
        this._experimentProperties = {};
        this._disposables = new DisposableStore();
        this._cleanupPatterns = [];
        this._appenders = config.appenders;
        this._commonProperties = config.commonProperties ?? Object.create(null);
        this.sessionId = this._commonProperties['sessionID'];
        this.machineId = this._commonProperties['common.machineId'];
        this.sqmId = this._commonProperties['common.sqmId'];
        this.devDeviceId = this._commonProperties['common.devDeviceId'];
        this.firstSessionDate = this._commonProperties['common.firstSessionDate'];
        this.msftInternal = this._commonProperties['common.msftInternal'];
        this._piiPaths = config.piiPaths || [];
        this._telemetryLevel = 3 /* TelemetryLevel.USAGE */;
        this._sendErrorTelemetry = !!config.sendErrorTelemetry;
        // static cleanup pattern for: `vscode-file:///DANGEROUS/PATH/resources/app/Useful/Information`
        this._cleanupPatterns = [/(vscode-)?file:\/\/\/.*?\/resources\/app\//gi];
        for (const piiPath of this._piiPaths) {
            this._cleanupPatterns.push(new RegExp(escapeRegExpCharacters(piiPath), 'gi'));
            if (piiPath.indexOf('\\') >= 0) {
                this._cleanupPatterns.push(new RegExp(escapeRegExpCharacters(piiPath.replace(/\\/g, '/')), 'gi'));
            }
        }
        this._updateTelemetryLevel();
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            // Check on the telemetry settings and update the state if changed
            const affectsTelemetryConfig = e.affectsConfiguration(TELEMETRY_SETTING_ID)
                || e.affectsConfiguration(TELEMETRY_OLD_SETTING_ID)
                || e.affectsConfiguration(TELEMETRY_CRASH_REPORTER_SETTING_ID);
            if (affectsTelemetryConfig) {
                this._updateTelemetryLevel();
            }
        }));
    }
    setExperimentProperty(name, value) {
        this._experimentProperties[name] = value;
    }
    _updateTelemetryLevel() {
        let level = getTelemetryLevel(this._configurationService);
        const collectableTelemetry = this._productService.enabledTelemetryLevels;
        // Also ensure that error telemetry is respecting the product configuration for collectable telemetry
        if (collectableTelemetry) {
            this._sendErrorTelemetry = this.sendErrorTelemetry ? collectableTelemetry.error : false;
            // Make sure the telemetry level from the service is the minimum of the config and product
            const maxCollectableTelemetryLevel = collectableTelemetry.usage ? 3 /* TelemetryLevel.USAGE */ : collectableTelemetry.error ? 2 /* TelemetryLevel.ERROR */ : 0 /* TelemetryLevel.NONE */;
            level = Math.min(level, maxCollectableTelemetryLevel);
        }
        this._telemetryLevel = level;
    }
    get sendErrorTelemetry() {
        return this._sendErrorTelemetry;
    }
    get telemetryLevel() {
        return this._telemetryLevel;
    }
    dispose() {
        this._disposables.dispose();
    }
    _log(eventName, eventLevel, data) {
        // don't send events when the user is optout
        if (this._telemetryLevel < eventLevel) {
            return;
        }
        // add experiment properties
        data = mixin(data, this._experimentProperties);
        // remove all PII from data
        data = cleanData(data, this._cleanupPatterns);
        // add common properties
        data = mixin(data, this._commonProperties);
        // Log to the appenders of sufficient level
        this._appenders.forEach(a => a.log(eventName, data));
    }
    publicLog(eventName, data) {
        this._log(eventName, 3 /* TelemetryLevel.USAGE */, data);
    }
    publicLog2(eventName, data) {
        this.publicLog(eventName, data);
    }
    publicLogError(errorEventName, data) {
        if (!this._sendErrorTelemetry) {
            return;
        }
        // Send error event and anonymize paths
        this._log(errorEventName, 2 /* TelemetryLevel.ERROR */, data);
    }
    publicLogError2(eventName, data) {
        this.publicLogError(eventName, data);
    }
};
TelemetryService = __decorate([
    __param(1, IConfigurationService),
    __param(2, IProductService)
], TelemetryService);
export { TelemetryService };
function getTelemetryLevelSettingDescription() {
    const telemetryText = localize('telemetry.telemetryLevelMd', "The default telemetry setting for VS Code (Microsoft). {0} recommends keeping this off.", product.nameLong);
    // const externalLinksStatement = !product.privacyStatementUrl ?
    // 	localize("telemetry.docsStatement", "Read more about the [data we collect]({0}).", 'https://aka.ms/vscode-telemetry') :
    // 	localize("telemetry.docsAndPrivacyStatement", "Read more about the [data we collect]({0}) and our [privacy statement]({1}).", 'https://aka.ms/vscode-telemetry', product.privacyStatementUrl);
    const restartString = !isWeb ? localize('telemetry.restart', 'Microsoft says \"Some third party extensions might not respect this setting. Consult the specific extension\'s documentation to be sure. A full restart of the application is necessary for crash reporting changes to take effect.\"') : '';
    // Void removed these
    // const crashReportsHeader = localize('telemetry.crashReports', "Crash Reports");
    // const errorsHeader = localize('telemetry.errors', "Error Telemetry");
    // const usageHeader = localize('telemetry.usage', "Usage Data");
    // const telemetryTableDescription = localize('telemetry.telemetryLevel.tableDescription', "The following table outlines the data sent with each setting:");
    // 	const telemetryTable = `
    // |       | ${crashReportsHeader} | ${errorsHeader} | ${usageHeader} |
    // |:------|:-------------:|:---------------:|:----------:|
    // | all   |       ✓       |        ✓        |     ✓      |
    // | error |       ✓       |        ✓        |     -      |
    // | crash |       ✓       |        -        |     -      |
    // | off   |       -       |        -        |     -      |
    // `;
    // const deprecatedSettingNote = localize('telemetry.telemetryLevel.deprecated', "****Note:*** If this setting is 'off', no telemetry will be sent regardless of other telemetry settings. If this setting is set to anything except 'off' and telemetry is disabled with deprecated settings, no telemetry will be sent.*");
    const telemetryDescription = `
${telemetryText}

${restartString}

Void separately records basic usage like the number of messages people are sending. If you'd like to disable Void metrics, you may do so in Void's Settings.
`;
    return telemetryDescription;
}
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration({
    'id': TELEMETRY_SECTION_ID,
    'order': 1,
    'type': 'object',
    'title': localize('telemetryConfigurationTitle', "Telemetry"),
    'properties': {
        [TELEMETRY_SETTING_ID]: {
            'type': 'string',
            'enum': ["all" /* TelemetryConfiguration.ON */, "error" /* TelemetryConfiguration.ERROR */, "crash" /* TelemetryConfiguration.CRASH */, "off" /* TelemetryConfiguration.OFF */],
            'enumDescriptions': [
                localize('telemetry.telemetryLevel.default', "Sends usage data, errors, and crash reports."),
                localize('telemetry.telemetryLevel.error', "Sends general error telemetry and crash reports."),
                localize('telemetry.telemetryLevel.crash', "Sends OS level crash reports."),
                localize('telemetry.telemetryLevel.off', "Disables all product telemetry.")
            ],
            'markdownDescription': getTelemetryLevelSettingDescription(),
            'default': "all" /* TelemetryConfiguration.ON */,
            'restricted': true,
            'scope': 1 /* ConfigurationScope.APPLICATION */,
            'tags': ['usesOnlineServices', 'telemetry'],
            'policy': {
                name: 'TelemetryLevel',
                minimumVersion: '1.99',
                description: localize('telemetry.telemetryLevel.policyDescription', "Controls the level of telemetry."),
            }
        },
        'telemetry.feedback.enabled': {
            type: 'boolean',
            default: true,
            description: localize('telemetry.feedback.enabled', "Enable feedback mechanisms such as the issue reporter, surveys, and feedback options in features like Copilot Chat."),
            policy: {
                name: 'EnableFeedback',
                minimumVersion: '1.99',
            }
        },
        // Deprecated telemetry setting
        [TELEMETRY_OLD_SETTING_ID]: {
            'type': 'boolean',
            'markdownDescription': !product.privacyStatementUrl ?
                localize('telemetry.enableTelemetry', "Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made.", product.nameLong) :
                localize('telemetry.enableTelemetryMd', "Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made. [Read more]({1}) about what we collect and our privacy statement.", product.nameLong, product.privacyStatementUrl),
            'default': true,
            'restricted': true,
            'markdownDeprecationMessage': localize('enableTelemetryDeprecated', "If this setting is false, no telemetry will be sent regardless of the new setting's value. Deprecated in favor of the {0} setting.", `\`#${TELEMETRY_SETTING_ID}#\``),
            'scope': 1 /* ConfigurationScope.APPLICATION */,
            'tags': ['usesOnlineServices', 'telemetry']
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvY29tbW9uL3RlbGVtZXRyeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBc0IsVUFBVSxFQUEwQixNQUFNLHFEQUFxRCxDQUFDO0FBQzdILE9BQU8sT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsT0FBTyxFQUE2RSxtQ0FBbUMsRUFBRSx3QkFBd0IsRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBcUIsTUFBTSxnQkFBZ0IsQ0FBQztBQUN6TyxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFzQixNQUFNLHFCQUFxQixDQUFDO0FBU2hGLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWdCO2FBRVosMEJBQXFCLEdBQUcsZUFBZSxBQUFsQixDQUFtQjthQUN4Qyx5QkFBb0IsR0FBRyxjQUFjLEFBQWpCLENBQWtC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