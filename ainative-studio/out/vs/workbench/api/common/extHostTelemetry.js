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
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../base/common/event.js';
import { ILoggerService } from '../../../platform/log/common/log.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { UIKind } from '../../services/extensions/common/extensionHostProtocol.js';
import { getRemoteName } from '../../../platform/remote/common/remoteHosts.js';
import { cleanData, cleanRemoteAuthority, TelemetryLogGroup } from '../../../platform/telemetry/common/telemetryUtils.js';
import { mixin } from '../../../base/common/objects.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
let ExtHostTelemetry = class ExtHostTelemetry extends Disposable {
    constructor(isWorker, initData, loggerService) {
        super();
        this.initData = initData;
        this._onDidChangeTelemetryEnabled = this._register(new Emitter());
        this.onDidChangeTelemetryEnabled = this._onDidChangeTelemetryEnabled.event;
        this._onDidChangeTelemetryConfiguration = this._register(new Emitter());
        this.onDidChangeTelemetryConfiguration = this._onDidChangeTelemetryConfiguration.event;
        this._productConfig = { usage: true, error: true };
        this._level = 0 /* TelemetryLevel.NONE */;
        this._inLoggingOnlyMode = false;
        this._telemetryLoggers = new Map();
        this._inLoggingOnlyMode = this.initData.environment.isExtensionTelemetryLoggingOnly;
        const id = initData.remote.isRemote ? 'remoteExtHostTelemetry' : isWorker ? 'workerExtHostTelemetry' : 'extHostTelemetry';
        this._outputLogger = this._register(loggerService.createLogger(id, {
            name: localize('extensionTelemetryLog', "Extension Telemetry{0}", this._inLoggingOnlyMode ? ' (Not Sent)' : ''),
            hidden: true,
            group: TelemetryLogGroup,
        }));
    }
    getTelemetryConfiguration() {
        return this._level === 3 /* TelemetryLevel.USAGE */;
    }
    getTelemetryDetails() {
        return {
            isCrashEnabled: this._level >= 1 /* TelemetryLevel.CRASH */,
            isErrorsEnabled: this._productConfig.error ? this._level >= 2 /* TelemetryLevel.ERROR */ : false,
            isUsageEnabled: this._productConfig.usage ? this._level >= 3 /* TelemetryLevel.USAGE */ : false
        };
    }
    instantiateLogger(extension, sender, options) {
        const telemetryDetails = this.getTelemetryDetails();
        const logger = new ExtHostTelemetryLogger(sender, options, extension, this._outputLogger, this._inLoggingOnlyMode, this.getBuiltInCommonProperties(extension), { isUsageEnabled: telemetryDetails.isUsageEnabled, isErrorsEnabled: telemetryDetails.isErrorsEnabled });
        const loggers = this._telemetryLoggers.get(extension.identifier.value) ?? [];
        this._telemetryLoggers.set(extension.identifier.value, [...loggers, logger]);
        return logger.apiTelemetryLogger;
    }
    $initializeTelemetryLevel(level, supportsTelemetry, productConfig) {
        this._level = level;
        this._productConfig = productConfig ?? { usage: true, error: true };
    }
    getBuiltInCommonProperties(extension) {
        const commonProperties = Object.create(null);
        // TODO @lramos15, does os info like node arch, platform version, etc exist here.
        // Or will first party extensions just mix this in
        commonProperties['common.extname'] = `${extension.publisher}.${extension.name}`;
        commonProperties['common.extversion'] = extension.version;
        commonProperties['common.vscodemachineid'] = this.initData.telemetryInfo.machineId;
        commonProperties['common.vscodesessionid'] = this.initData.telemetryInfo.sessionId;
        commonProperties['common.vscodecommithash'] = this.initData.commit;
        commonProperties['common.sqmid'] = this.initData.telemetryInfo.sqmId;
        commonProperties['common.devDeviceId'] = this.initData.telemetryInfo.devDeviceId;
        commonProperties['common.vscodeversion'] = this.initData.version;
        commonProperties['common.isnewappinstall'] = isNewAppInstall(this.initData.telemetryInfo.firstSessionDate);
        commonProperties['common.product'] = this.initData.environment.appHost;
        switch (this.initData.uiKind) {
            case UIKind.Web:
                commonProperties['common.uikind'] = 'web';
                break;
            case UIKind.Desktop:
                commonProperties['common.uikind'] = 'desktop';
                break;
            default:
                commonProperties['common.uikind'] = 'unknown';
        }
        commonProperties['common.remotename'] = getRemoteName(cleanRemoteAuthority(this.initData.remote.authority));
        return commonProperties;
    }
    $onDidChangeTelemetryLevel(level) {
        this._oldTelemetryEnablement = this.getTelemetryConfiguration();
        this._level = level;
        const telemetryDetails = this.getTelemetryDetails();
        // Remove all disposed loggers
        this._telemetryLoggers.forEach((loggers, key) => {
            const newLoggers = loggers.filter(l => !l.isDisposed);
            if (newLoggers.length === 0) {
                this._telemetryLoggers.delete(key);
            }
            else {
                this._telemetryLoggers.set(key, newLoggers);
            }
        });
        // Loop through all loggers and update their level
        this._telemetryLoggers.forEach(loggers => {
            for (const logger of loggers) {
                logger.updateTelemetryEnablements(telemetryDetails.isUsageEnabled, telemetryDetails.isErrorsEnabled);
            }
        });
        if (this._oldTelemetryEnablement !== this.getTelemetryConfiguration()) {
            this._onDidChangeTelemetryEnabled.fire(this.getTelemetryConfiguration());
        }
        this._onDidChangeTelemetryConfiguration.fire(this.getTelemetryDetails());
    }
    onExtensionError(extension, error) {
        const loggers = this._telemetryLoggers.get(extension.value);
        const nonDisposedLoggers = loggers?.filter(l => !l.isDisposed);
        if (!nonDisposedLoggers) {
            this._telemetryLoggers.delete(extension.value);
            return false;
        }
        let errorEmitted = false;
        for (const logger of nonDisposedLoggers) {
            if (logger.ignoreUnhandledExtHostErrors) {
                continue;
            }
            logger.logError(error);
            errorEmitted = true;
        }
        return errorEmitted;
    }
};
ExtHostTelemetry = __decorate([
    __param(1, IExtHostInitDataService),
    __param(2, ILoggerService)
], ExtHostTelemetry);
export { ExtHostTelemetry };
export class ExtHostTelemetryLogger {
    static validateSender(sender) {
        if (typeof sender !== 'object') {
            throw new TypeError('TelemetrySender argument is invalid');
        }
        if (typeof sender.sendEventData !== 'function') {
            throw new TypeError('TelemetrySender.sendEventData must be a function');
        }
        if (typeof sender.sendErrorData !== 'function') {
            throw new TypeError('TelemetrySender.sendErrorData must be a function');
        }
        if (typeof sender.flush !== 'undefined' && typeof sender.flush !== 'function') {
            throw new TypeError('TelemetrySender.flush must be a function or undefined');
        }
    }
    constructor(sender, options, _extension, _logger, _inLoggingOnlyMode, _commonProperties, telemetryEnablements) {
        this._extension = _extension;
        this._logger = _logger;
        this._inLoggingOnlyMode = _inLoggingOnlyMode;
        this._commonProperties = _commonProperties;
        this._onDidChangeEnableStates = new Emitter();
        this.ignoreUnhandledExtHostErrors = options?.ignoreUnhandledErrors ?? false;
        this._ignoreBuiltinCommonProperties = options?.ignoreBuiltInCommonProperties ?? false;
        this._additionalCommonProperties = options?.additionalCommonProperties;
        this._sender = sender;
        this._telemetryEnablements = { isUsageEnabled: telemetryEnablements.isUsageEnabled, isErrorsEnabled: telemetryEnablements.isErrorsEnabled };
    }
    updateTelemetryEnablements(isUsageEnabled, isErrorsEnabled) {
        if (this._apiObject) {
            this._telemetryEnablements = { isUsageEnabled, isErrorsEnabled };
            this._onDidChangeEnableStates.fire(this._apiObject);
        }
    }
    mixInCommonPropsAndCleanData(data) {
        // Some telemetry modules prefer to break properties and measurmements up
        // We mix common properties into the properties tab.
        let updatedData = 'properties' in data ? (data.properties ?? {}) : data;
        // We don't clean measurements since they are just numbers
        updatedData = cleanData(updatedData, []);
        if (this._additionalCommonProperties) {
            updatedData = mixin(updatedData, this._additionalCommonProperties);
        }
        if (!this._ignoreBuiltinCommonProperties) {
            updatedData = mixin(updatedData, this._commonProperties);
        }
        if ('properties' in data) {
            data.properties = updatedData;
        }
        else {
            data = updatedData;
        }
        return data;
    }
    logEvent(eventName, data) {
        // No sender means likely disposed of, we should no-op
        if (!this._sender) {
            return;
        }
        // If it's a built-in extension (vscode publisher) we don't prefix the publisher and only the ext name
        if (this._extension.publisher === 'vscode') {
            eventName = this._extension.name + '/' + eventName;
        }
        else {
            eventName = this._extension.identifier.value + '/' + eventName;
        }
        data = this.mixInCommonPropsAndCleanData(data || {});
        if (!this._inLoggingOnlyMode) {
            this._sender?.sendEventData(eventName, data);
        }
        this._logger.trace(eventName, data);
    }
    logUsage(eventName, data) {
        if (!this._telemetryEnablements.isUsageEnabled) {
            return;
        }
        this.logEvent(eventName, data);
    }
    logError(eventNameOrException, data) {
        if (!this._telemetryEnablements.isErrorsEnabled || !this._sender) {
            return;
        }
        if (typeof eventNameOrException === 'string') {
            this.logEvent(eventNameOrException, data);
        }
        else {
            const errorData = {
                name: eventNameOrException.name,
                message: eventNameOrException.message,
                stack: eventNameOrException.stack,
                cause: eventNameOrException.cause
            };
            const cleanedErrorData = cleanData(errorData, []);
            // Reconstruct the error object with the cleaned data
            const cleanedError = new Error(cleanedErrorData.message, {
                cause: cleanedErrorData.cause
            });
            cleanedError.stack = cleanedErrorData.stack;
            cleanedError.name = cleanedErrorData.name;
            data = this.mixInCommonPropsAndCleanData(data || {});
            if (!this._inLoggingOnlyMode) {
                this._sender.sendErrorData(cleanedError, data);
            }
            this._logger.trace('exception', data);
        }
    }
    get apiTelemetryLogger() {
        if (!this._apiObject) {
            const that = this;
            const obj = {
                logUsage: that.logUsage.bind(that),
                get isUsageEnabled() {
                    return that._telemetryEnablements.isUsageEnabled;
                },
                get isErrorsEnabled() {
                    return that._telemetryEnablements.isErrorsEnabled;
                },
                logError: that.logError.bind(that),
                dispose: that.dispose.bind(that),
                onDidChangeEnableStates: that._onDidChangeEnableStates.event.bind(that)
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    get isDisposed() {
        return !this._sender;
    }
    dispose() {
        if (this._sender?.flush) {
            let tempSender = this._sender;
            this._sender = undefined;
            Promise.resolve(tempSender.flush()).then(tempSender = undefined);
            this._apiObject = undefined;
        }
        else {
            this._sender = undefined;
        }
    }
}
export function isNewAppInstall(firstSessionDate) {
    const installAge = Date.now() - new Date(firstSessionDate).getTime();
    return isNaN(installAge) ? false : installAge < 1000 * 60 * 60 * 24; // install age is less than a day
}
export const IExtHostTelemetry = createDecorator('IExtHostTelemetry');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlbGVtZXRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHL0QsT0FBTyxFQUFXLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXRFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRXBDLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTtJQWlCL0MsWUFDQyxRQUFpQixFQUNRLFFBQWtELEVBQzNELGFBQTZCO1FBRTdDLEtBQUssRUFBRSxDQUFDO1FBSGtDLGFBQVEsR0FBUixRQUFRLENBQXlCO1FBZjNELGlDQUE0QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFDO1FBQzlFLGdDQUEyQixHQUFtQixJ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