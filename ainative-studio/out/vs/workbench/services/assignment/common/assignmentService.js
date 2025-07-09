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
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Memento } from '../../../common/memento.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { BaseAssignmentService } from '../../../../platform/assignment/common/assignmentService.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
export const IWorkbenchAssignmentService = createDecorator('WorkbenchAssignmentService');
class MementoKeyValueStorage {
    constructor(memento) {
        this.memento = memento;
        this.mementoObj = memento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    async getValue(key, defaultValue) {
        const value = await this.mementoObj[key];
        return value || defaultValue;
    }
    setValue(key, value) {
        this.mementoObj[key] = value;
        this.memento.saveMemento();
    }
}
class WorkbenchAssignmentServiceTelemetry {
    constructor(telemetryService, productService) {
        this.telemetryService = telemetryService;
        this.productService = productService;
    }
    get assignmentContext() {
        return this._lastAssignmentContext?.split(';');
    }
    // __GDPR__COMMON__ "abexp.assignmentcontext" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    setSharedProperty(name, value) {
        if (name === this.productService.tasConfig?.assignmentContextTelemetryPropertyName) {
            this._lastAssignmentContext = value;
        }
        this.telemetryService.setExperimentProperty(name, value);
    }
    postEvent(eventName, props) {
        const data = {};
        for (const [key, value] of props.entries()) {
            data[key] = value;
        }
        /* __GDPR__
            "query-expfeature" : {
                "owner": "sbatten",
                "comment": "Logs queries to the experiment service by feature for metric calculations",
                "ABExp.queriedFeature": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The experimental feature being queried" }
            }
        */
        this.telemetryService.publicLog(eventName, data);
    }
}
let WorkbenchAssignmentService = class WorkbenchAssignmentService extends BaseAssignmentService {
    constructor(telemetryService, storageService, configurationService, productService, environmentService) {
        super(telemetryService.machineId, configurationService, productService, environmentService, new WorkbenchAssignmentServiceTelemetry(telemetryService, productService), new MementoKeyValueStorage(new Memento('experiment.service.memento', storageService)));
        this.telemetryService = telemetryService;
    }
    get experimentsEnabled() {
        return this.configurationService.getValue('workbench.enableExperiments') === true;
    }
    async getTreatment(name) {
        const result = await super.getTreatment(name);
        this.telemetryService.publicLog2('tasClientReadTreatmentComplete', { treatmentName: name, treatmentValue: JSON.stringify(result) });
        return result;
    }
    async getCurrentExperiments() {
        if (!this.tasClient) {
            return undefined;
        }
        if (!this.experimentsEnabled) {
            return undefined;
        }
        await this.tasClient;
        return this.telemetry?.assignmentContext;
    }
};
WorkbenchAssignmentService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, IProductService),
    __param(4, IEnvironmentService)
], WorkbenchAssignmentService);
export { WorkbenchAssignmentService };
registerSingleton(IWorkbenchAssignmentService, WorkbenchAssignmentService, 1 /* InstantiationType.Delayed */);
const registry = Registry.as(ConfigurationExtensions.Configuration);
registry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    'properties': {
        'workbench.enableExperiments': {
            'type': 'boolean',
            'description': localize('workbench.enableExperiments', "Fetches experiments to run from a Microsoft online service."),
            'default': true,
            'scope': 1 /* ConfigurationScope.APPLICATION */,
            'restricted': true,
            'tags': ['usesOnlineServices']
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2Fzc2lnbm1lbnQvY29tbW9uL2Fzc2lnbm1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0YsT0FBTyxFQUFpQixPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRTlHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xGLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFzQixNQUFNLG9FQUFvRSxDQUFDO0FBQ3ZLLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FBOEIsNEJBQTRCLENBQUMsQ0FBQztBQU10SCxN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