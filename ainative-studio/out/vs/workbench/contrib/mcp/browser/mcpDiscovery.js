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
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { mcpDiscoveryRegistry } from '../common/discovery/mcpDiscovery.js';
import { mcpEnabledSection } from '../common/mcpConfiguration.js';
let McpDiscovery = class McpDiscovery extends Disposable {
    static { this.ID = 'workbench.contrib.mcp.discovery'; }
    constructor(instantiationService, configurationService) {
        super();
        const enabled = observableConfigValue(mcpEnabledSection, true, configurationService);
        const store = this._register(new DisposableStore());
        this._register(autorun(reader => {
            if (enabled.read(reader)) {
                for (const discovery of mcpDiscoveryRegistry.getAll()) {
                    const inst = store.add(instantiationService.createInstance(discovery));
                    inst.start();
                }
            }
            else {
                store.clear();
            }
        }));
    }
};
McpDiscovery = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService)
], McpDiscovery);
export { McpDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcERpc2NvdmVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUUxRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUzRCxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFhLFNBQVEsVUFBVTthQUNwQixPQUFFLEdBQUcsaUNBQWlDLEFBQXBDLENBQXFDO0lBRTlELFlBQ3dCLG9CQUEyQyxFQUMzQyxvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUM7UUFFUixNQUFNLE9BQU8sR0FBRyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNyRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUVwRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsS0FBSyxNQUFNLFNBQVMsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO29CQUN2RCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUN2RSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2QsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDZixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7O0FBdEJXLFlBQVk7SUFJdEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBTFgsWUFBWSxDQXVCeEIifQ==