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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vdGVsZW1ldHJ5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFzQixVQUFVLEVBQTBCLE1BQU0scURBQXFELENBQUM7QUFDN0gsT0FBTyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxPQUFPLEVBQTZFLG1DQUFtQyxFQUFFLHdCQUF3QixFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFxQixNQUFNLGdCQUFnQixDQUFDO0FBQ3pPLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQXNCLE1BQU0scUJBQXFCLENBQUM7QUFTaEYsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBZ0I7YUFFWiwwQkFBcUIsR0FBRyxlQUFlLEFBQWxCLENBQW1CO2FBQ3hDLHlCQUFvQixHQUFHLGNBQWMsQUFBakIsQ0FBa0I7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