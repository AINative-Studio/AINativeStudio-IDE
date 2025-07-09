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
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IDecorationsService } from '../../../services/decorations/common/decorations.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { listErrorForeground, listWarningForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
class MarkersDecorationsProvider {
    constructor(_markerService) {
        this._markerService = _markerService;
        this.label = localize('label', "Problems");
        this.onDidChange = _markerService.onMarkerChanged;
    }
    provideDecorations(resource) {
        const markers = this._markerService.read({
            resource,
            severities: MarkerSeverity.Error | MarkerSeverity.Warning
        });
        let first;
        for (const marker of markers) {
            if (!first || marker.severity > first.severity) {
                first = marker;
            }
        }
        if (!first) {
            return undefined;
        }
        return {
            weight: 100 * first.severity,
            bubble: true,
            tooltip: markers.length === 1 ? localize('tooltip.1', "1 problem in this file") : localize('tooltip.N', "{0} problems in this file", markers.length),
            letter: markers.length < 10 ? markers.length.toString() : '9+',
            color: first.severity === MarkerSeverity.Error ? listErrorForeground : listWarningForeground,
        };
    }
}
let MarkersFileDecorations = class MarkersFileDecorations {
    constructor(_markerService, _decorationsService, _configurationService) {
        this._markerService = _markerService;
        this._decorationsService = _decorationsService;
        this._configurationService = _configurationService;
        this._disposables = [
            this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('problems.visibility')) {
                    this._updateEnablement();
                }
            }),
        ];
        this._updateEnablement();
    }
    dispose() {
        dispose(this._provider);
        dispose(this._disposables);
    }
    _updateEnablement() {
        const problem = this._configurationService.getValue('problems.visibility');
        if (problem === undefined) {
            return;
        }
        const value = this._configurationService.getValue('problems');
        const shouldEnable = (problem && value.decorations.enabled);
        if (shouldEnable === this._enabled) {
            if (!problem || !value.decorations.enabled) {
                this._provider?.dispose();
                this._provider = undefined;
            }
            return;
        }
        this._enabled = shouldEnable;
        if (this._enabled) {
            const provider = new MarkersDecorationsProvider(this._markerService);
            this._provider = this._decorationsService.registerDecorationsProvider(provider);
        }
        else if (this._provider) {
            this._provider.dispose();
        }
    }
};
MarkersFileDecorations = __decorate([
    __param(0, IMarkerService),
    __param(1, IDecorationsService),
    __param(2, IConfigurationService)
], MarkersFileDecorations);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    'id': 'problems',
    'order': 101,
    'type': 'object',
    'properties': {
        'problems.decorations.enabled': {
            'markdownDescription': localize('markers.showOnFile', "Show Errors & Warnings on files and folder. Overwritten by {0} when it is off.", '`#problems.visibility#`'),
            'type': 'boolean',
            'default': true
        }
    }
});
// register file decorations
Registry.as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(MarkersFileDecorations, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc0ZpbGVEZWNvcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL2Jyb3dzZXIvbWFya2Vyc0ZpbGVEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQTJELFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlJLE9BQU8sRUFBRSxjQUFjLEVBQVcsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUFFLG1CQUFtQixFQUF5QyxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pJLE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUc1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFHbkosTUFBTSwwQkFBMEI7SUFLL0IsWUFDa0IsY0FBOEI7UUFBOUIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBSnZDLFVBQUssR0FBVyxRQUFRLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBTXRELElBQUksQ0FBQyxXQUFXLEdBQUcsY0FBYyxDQUFDLGVBQWUsQ0FBQztJQUNuRCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBYTtRQUMvQixNQUFNLE9B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