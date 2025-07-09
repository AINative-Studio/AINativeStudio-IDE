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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IRemoteExplorerService } from '../../../services/remote/common/remoteExplorerService.js';
let ShowCandidateContribution = class ShowCandidateContribution extends Disposable {
    static { this.ID = 'workbench.contrib.showPortCandidate'; }
    constructor(remoteExplorerService, environmentService) {
        super();
        const showPortCandidate = environmentService.options?.tunnelProvider?.showPortCandidate;
        if (showPortCandidate) {
            this._register(remoteExplorerService.setCandidateFilter(async (candidates) => {
                const filters = await Promise.all(candidates.map(candidate => showPortCandidate(candidate.host, candidate.port, candidate.detail ?? '')));
                const filteredCandidates = [];
                if (filters.length !== candidates.length) {
                    return candidates;
                }
                for (let i = 0; i < candidates.length; i++) {
                    if (filters[i]) {
                        filteredCandidates.push(candidates[i]);
                    }
                }
                return filteredCandidates;
            }));
        }
    }
};
ShowCandidateContribution = __decorate([
    __param(0, IRemoteExplorerService),
    __param(1, IBrowserWorkbenchEnvironmentService)
], ShowCandidateContribution);
export { ShowCandidateContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hvd0NhbmRpZGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci9zaG93Q2FuZGlkYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUczRixJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7YUFFeEMsT0FBRSxHQUFHLHFDQUFxQyxBQUF4QyxDQUF5QztJQUUzRCxZQUN5QixxQkFBNkMsRUFDaEMsa0JBQXVEO1FBRTVGLEtBQUssRUFBRSxDQUFDO1FBQ1IsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixDQUFDO1FBQ3hGLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxVQUEyQixFQUE0QixFQUFFO2dCQUN2SCxNQUFNLE9BQU8sR0FBYyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckosTUFBTSxrQkFBa0IsR0FBb0IsRUFBRSxDQUFDO2dCQUMvQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUMxQyxPQUFPLFVBQVUsQ0FBQztnQkFDbkIsQ0FBQztnQkFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM1QyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUNoQixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3hDLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLGtCQUFrQixDQUFDO1lBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0YsQ0FBQzs7QUF6QlcseUJBQXlCO0lBS25DLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxtQ0FBbUMsQ0FBQTtHQU56Qix5QkFBeUIsQ0EwQnJDIn0=