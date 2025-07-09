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
import { getErrorMessage } from '../../../base/common/errors.js';
import { isDefined } from '../../../base/common/types.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService, LogLevel } from '../../log/common/log.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { ExtensionSignatureVerificationCode } from '../common/extensionManagement.js';
export const IExtensionSignatureVerificationService = createDecorator('IExtensionSignatureVerificationService');
let ExtensionSignatureVerificationService = class ExtensionSignatureVerificationService {
    constructor(logService, telemetryService) {
        this.logService = logService;
        this.telemetryService = telemetryService;
    }
    vsceSign() {
        if (!this.moduleLoadingPromise) {
            this.moduleLoadingPromise = this.resolveVsceSign();
        }
        return this.moduleLoadingPromise;
    }
    async resolveVsceSign() {
        const mod = '@vscode/vsce-sign';
        return import(mod);
    }
    async verify(extensionId, version, vsixFilePath, signatureArchiveFilePath, clientTargetPlatform) {
        let module;
        try {
            module = await this.vsceSign();
        }
        catch (error) {
            this.logService.error('Could not load vsce-sign module', getErrorMessage(error));
            this.logService.info(`Extension signature verification is not done: ${extensionId}`);
            return undefined;
        }
        const startTime = new Date().getTime();
        let result;
        try {
            this.logService.trace(`Verifying extension signature for ${extensionId}...`);
            result = await module.verify(vsixFilePath, signatureArchiveFilePath, this.logService.getLevel() === LogLevel.Trace);
        }
        catch (e) {
            result = {
                code: ExtensionSignatureVerificationCode.UnknownError,
                didExecute: false,
                output: getErrorMessage(e)
            };
        }
        const duration = new Date().getTime() - startTime;
        this.logService.info(`Extension signature verification result for ${extensionId}: ${result.code}. ${isDefined(result.internalCode) ? `Internal Code: ${result.internalCode}. ` : ''}Executed: ${result.didExecute}. Duration: ${duration}ms.`);
        this.logService.trace(`Extension signature verification output for ${extensionId}:\n${result.output}`);
        this.telemetryService.publicLog2('extensionsignature:verification', {
            extensionId,
            extensionVersion: version,
            code: result.code,
            internalCode: result.internalCode,
            duration,
            didExecute: result.didExecute,
            clientTargetPlatform,
        });
        return { code: result.code };
    }
};
ExtensionSignatureVerificationService = __decorate([
    __param(0, ILogService),
    __param(1, ITelemetryService)
], ExtensionSignatureVerificationService);
export { ExtensionSignatureVerificationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2lnbmF0dXJlVmVyaWZpY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L25vZGUvZXh0ZW5zaW9uU2lnbmF0dXJlVmVyaWZpY2F0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXRGLE1BQU0sQ0FBQyxNQUFNLHNDQUFzQyxHQUFHLGVBQWUsQ0FBeUMsd0NBQXdDLENBQUMsQ0FBQztBQXFDakosSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBcUM7SUFLakQsWUFDK0IsVUFBdUIsRUFDakIsZ0JBQW1DO1FBRHpDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDakIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtJQUNwRSxDQUFDO0lBRUcsUUFBUTtRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3BELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztJ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