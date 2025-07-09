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
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
let ExternalUriResolverContribution = class ExternalUriResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.externalUriResolver'; }
    constructor(_openerService, _workbenchEnvironmentService) {
        super();
        if (_workbenchEnvironmentService.options?.resolveExternalUri) {
            this._register(_openerService.registerExternalUriResolver({
                resolveExternalUri: async (resource) => {
                    return {
                        resolved: await _workbenchEnvironmentService.options.resolveExternalUri(resource),
                        dispose: () => {
                            // TODO@mjbvz - do we need to do anything here?
                        }
                    };
                }
            }));
        }
    }
};
ExternalUriResolverContribution = __decorate([
    __param(0, IOpenerService),
    __param(1, IBrowserWorkbenchEnvironmentService)
], ExternalUriResolverContribution);
export { ExternalUriResolverContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxVcmlSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvYnJvd3Nlci9leHRlcm5hbFVyaVJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFOUUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFM0csSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBZ0MsU0FBUSxVQUFVO2FBRTlDLE9BQUUsR0FBRyx1Q0FBdUMsQUFBMUMsQ0FBMkM7SUFFN0QsWUFDaUIsY0FBOEIsRUFDVCw0QkFBaUU7UUFFdEcsS0FBSyxFQUFFLENBQUM7UUFFUixJQUFJLDRCQUE0QixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxDQUFDO1lBQzlELElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLDJCQUEyQixDQUFDO2dCQUN6RCxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7b0JBQ3RDLE9BQU87d0JBQ04sUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUMsT0FBUSxDQUFDLGtCQUFtQixDQUFDLFFBQVEsQ0FBQzt3QkFDbkYsT0FBTyxFQUFFLEdBQUcsRUFBRTs0QkFDYiwrQ0FBK0M7d0JBQ2hELENBQUM7cUJBQ0QsQ0FBQztnQkFDSCxDQUFDO2FBQ0QsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0YsQ0FBQzs7QUF0QlcsK0JBQStCO0lBS3pDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxtQ0FBbUMsQ0FBQTtHQU56QiwrQkFBK0IsQ0F1QjNDIn0=