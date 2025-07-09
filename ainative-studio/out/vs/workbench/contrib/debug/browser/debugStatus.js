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
import * as nls from '../../../../nls.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { IDebugService } from '../common/debug.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
let DebugStatusContribution = class DebugStatusContribution {
    constructor(statusBarService, debugService, configurationService) {
        this.statusBarService = statusBarService;
        this.debugService = debugService;
        this.toDispose = [];
        const addStatusBarEntry = () => {
            this.entryAccessor = this.statusBarService.addEntry(this.entry, 'status.debug', 0 /* StatusbarAlignment.LEFT */, 30 /* Low Priority */);
        };
        const setShowInStatusBar = () => {
            this.showInStatusBar = configurationService.getValue('debug').showInStatusBar;
            if (this.showInStatusBar === 'always' && !this.entryAccessor) {
                addStatusBarEntry();
            }
        };
        setShowInStatusBar();
        this.toDispose.push(this.debugService.onDidChangeState(state => {
            if (state !== 0 /* State.Inactive */ && this.showInStatusBar === 'onFirstSessionStart' && !this.entryAccessor) {
                addStatusBarEntry();
            }
        }));
        this.toDispose.push(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('debug.showInStatusBar')) {
                setShowInStatusBar();
                if (this.entryAccessor && this.showInStatusBar === 'never') {
                    this.entryAccessor.dispose();
                    this.entryAccessor = undefined;
                }
            }
        }));
        this.toDispose.push(this.debugService.getConfigurationManager().onDidSelectConfiguration(e => {
            this.entryAccessor?.update(this.entry);
        }));
    }
    get entry() {
        let text = '';
        const manager = this.debugService.getConfigurationManager();
        const name = manager.selectedConfiguration.name || '';
        const nameAndLaunchPresent = name && manager.selectedConfiguration.launch;
        if (nameAndLaunchPresent) {
            text = (manager.getLaunches().length > 1 ? `${name} (${manager.selectedConfiguration.launch.name})` : name);
        }
        return {
            name: nls.localize('status.debug', "Debug"),
            text: '$(debug-alt-small) ' + text,
            ariaLabel: nls.localize('debugTarget', "Debug: {0}", text),
            tooltip: nls.localize('selectAndStartDebug', "Select and Start Debug Configuration"),
            command: 'workbench.action.debug.selectandstart'
        };
    }
    dispose() {
        this.entryAccessor?.dispose();
        dispose(this.toDispose);
    }
};
DebugStatusContribution = __decorate([
    __param(0, IStatusbarService),
    __param(1, IDebugService),
    __param(2, IConfigurationService)
], DebugStatusContribution);
export { DebugStatusContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1N0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsYUFBYSxFQUE4QixNQUFNLG9CQUFvQixDQUFDO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBbUIsaUJBQWlCLEVBQStDLE1BQU0sa0RBQWtELENBQUM7QUFHNUksSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFNbkMsWUFDb0IsZ0JBQW9ELEVBQ3hELFlBQTRDLEVBQ3BDLG9CQUEyQztRQUY5QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3ZDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBTHBELGNBQVMsR0FBa0IsRUFBRSxDQUFDO1FBU3JDLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO1lBQzlCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLGNBQWMsbUNBQTJCLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2pJLENBQUMsQ0FBQztRQUVGLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO1lBQy9CLElBQUksQ0FBQyxlQUFlLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFzQixPQUFPLENBQUMsQ0FBQyxlQUFlLENBQUM7WUFDbkcsSUFBSSxJQUFJLENB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