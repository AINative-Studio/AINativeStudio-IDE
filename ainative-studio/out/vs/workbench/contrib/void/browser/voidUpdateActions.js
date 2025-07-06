/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
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
import Severity from '../../../../base/common/severity.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IMetricsService } from '../common/metricsService.js';
import { IVoidUpdateService } from '../common/voidUpdateService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
const notifyUpdate = (res, notifService, updateService) => {
    const message = res?.message || 'This is a very old version of Void, please download the latest version! [Void Editor](https://voideditor.com/download-beta)!';
    let actions;
    if (res?.action) {
        const primary = [];
        if (res.action === 'reinstall') {
            primary.push({
                label: `Reinstall`,
                id: 'void.updater.reinstall',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    const { window } = dom.getActiveWindow();
                    window.open('https://voideditor.com/download-beta');
                }
            });
        }
        if (res.action === 'download') {
            primary.push({
                label: `Download`,
                id: 'void.updater.download',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    updateService.downloadUpdate();
                }
            });
        }
        if (res.action === 'apply') {
            primary.push({
                label: `Apply`,
                id: 'void.updater.apply',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    updateService.applyUpdate();
                }
            });
        }
        if (res.action === 'restart') {
            primary.push({
                label: `Restart`,
                id: 'void.updater.restart',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    updateService.quitAndInstall();
                }
            });
        }
        primary.push({
            id: 'void.updater.site',
            enabled: true,
            label: `Void Site`,
            tooltip: '',
            class: undefined,
            run: () => {
                const { window } = dom.getActiveWindow();
                window.open('https://voideditor.com/');
            }
        });
        actions = {
            primary: primary,
            secondary: [{
                    id: 'void.updater.close',
                    enabled: true,
                    label: `Keep current version`,
                    tooltip: '',
                    class: undefined,
                    run: () => {
                        notifController.close();
                    }
                }]
        };
    }
    else {
        actions = undefined;
    }
    const notifController = notifService.notify({
        severity: Severity.Info,
        message: message,
        sticky: true,
        progress: actions ? { worked: 0, total: 100 } : undefined,
        actions: actions,
    });
    return notifController;
    // const d = notifController.onDidClose(() => {
    // 	notifyYesUpdate(notifService, res)
    // 	d.dispose()
    // })
};
const notifyErrChecking = (notifService) => {
    const message = `Void Error: There was an error checking for updates. If this persists, please get in touch or reinstall Void [here](https://voideditor.com/download-beta)!`;
    const notifController = notifService.notify({
        severity: Severity.Info,
        message: message,
        sticky: true,
    });
    return notifController;
};
const performVoidCheck = async (explicit, notifService, voidUpdateService, metricsService, updateService) => {
    const metricsTag = explicit ? 'Manual' : 'Auto';
    metricsService.capture(`Void Update ${metricsTag}: Checking...`, {});
    const res = await voidUpdateService.check(explicit);
    if (!res) {
        const notifController = notifyErrChecking(notifService);
        metricsService.capture(`Void Update ${metricsTag}: Error`, { res });
        return notifController;
    }
    else {
        if (res.message) {
            const notifController = notifyUpdate(res, notifService, updateService);
            metricsService.capture(`Void Update ${metricsTag}: Yes`, { res });
            return notifController;
        }
        else {
            metricsService.capture(`Void Update ${metricsTag}: No`, { res });
            return null;
        }
    }
};
// Action
let lastNotifController = null;
registerAction2(class extends Action2 {
    constructor() {
        super({
            f1: true,
            id: 'void.voidCheckUpdate',
            title: localize2('voidCheckUpdate', 'Void: Check for Updates'),
        });
    }
    async run(accessor) {
        const voidUpdateService = accessor.get(IVoidUpdateService);
        const notifService = accessor.get(INotificationService);
        const metricsService = accessor.get(IMetricsService);
        const updateService = accessor.get(IUpdateService);
        const currNotifController = lastNotifController;
        const newController = await performVoidCheck(true, notifService, voidUpdateService, metricsService, updateService);
        if (newController) {
            currNotifController?.close();
            lastNotifController = newController;
        }
    }
});
// on mount
let VoidUpdateWorkbenchContribution = class VoidUpdateWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.void.voidUpdate'; }
    constructor(voidUpdateService, metricsService, notifService, updateService) {
        super();
        const autoCheck = () => {
            performVoidCheck(false, notifService, voidUpdateService, metricsService, updateService);
        };
        // check once 5 seconds after mount
        // check every 3 hours
        const { window } = dom.getActiveWindow();
        const initId = window.setTimeout(() => autoCheck(), 5 * 1000);
        this._register({ dispose: () => window.clearTimeout(initId) });
        const intervalId = window.setInterval(() => autoCheck(), 3 * 60 * 60 * 1000); // every 3 hrs
        this._register({ dispose: () => window.clearInterval(intervalId) });
    }
};
VoidUpdateWorkbenchContribution = __decorate([
    __param(0, IVoidUpdateService),
    __param(1, IMetricsService),
    __param(2, INotificationService),
    __param(3, IUpdateService)
], VoidUpdateWorkbenchContribution);
registerWorkbenchContribution2(VoidUpdateWorkbenchContribution.ID, VoidUpdateWorkbenchContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdm9pZFVwZGF0ZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBNkMsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUEwQiw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQU85RSxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQWlELEVBQUUsWUFBa0MsRUFBRSxhQUE2QixFQUF1QixFQUFFO0lBQ2xLLE1BQU0sT0FBTyxHQUFHLEdBQUcsRUFBRSxPQUFPLElBQUksOEhBQThILENBQUE7SUFFOUosSUFBSSxPQUF5QyxDQUFBO0lBRTdDLElBQUksR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQ2pCLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQTtRQUU3QixJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDWixLQUFLLEVBQUUsV0FBVztnQkFDbEIsRUFBRSxFQUFFLHdCQUF3QjtnQkFDNUIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLEdBQUcsRUFBRSxHQUFHLEVBQUU7b0JBQ1QsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtvQkFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFBO2dCQUNwRCxDQUFDO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUMvQixPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNaLEtBQUssRUFBRSxVQUFVO2dCQUNqQixFQUFFLEVBQUUsdUJBQXVCO2dCQUMzQixPQUFPLEVBQUUsSUFBSTtnQkFDYixPQUFPLEVBQUUsRUFBRTtnQkFDWCxLQUFLLEVBQUUsU0FBUztnQkFDaEIsR0FBRyxFQUFFLEdBQUcsRUFBRTtvQkFDVCxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQy9CLENBQUM7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBR0QsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ1osS0FBSyxFQUFFLE9BQU87Z0JBQ2QsRUFBRSxFQUFFLG9CQUFvQjtnQkFDeEIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLEdBQUcsRUFBRSxHQUFHLEVBQUU7b0JBQ1QsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFBO2dCQUM1QixDQUFDO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNaLEtBQUssRUFBRSxTQUFTO2dCQUNoQixFQUFFLEVBQUUsc0JBQXNCO2dCQUMxQixPQUFPLEVBQUUsSUFBSTtnQkFDYixPQUFPLEVBQUUsRUFBRTtnQkFDWCxLQUFLLEVBQUUsU0FBUztnQkFDaEIsR0FBRyxFQUFFLEdBQUcsRUFBRTtvQkFDVCxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQy9CLENBQUM7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNaLEVBQUUsRUFBRSxtQkFBbUI7WUFDdkIsT0FBTyxFQUFFLElBQUk7WUFDYixLQUFLLEVBQUUsV0FBVztZQUNsQixPQUFPLEVBQUUsRUFBRTtZQUNYLEtBQUssRUFBRSxTQUFTO1lBQ2hCLEdBQUcsRUFBRSxHQUFHLEVBQUU7Z0JBQ1QsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtnQkFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixPQUFPLEdBQUc7WUFDVCxPQUFPLEVBQUUsT0FBTztZQUNoQixTQUFTLEVBQUUsQ0FBQztvQkFDWCxFQUFFLEVBQUUsb0JBQW9CO29CQUN4QixPQUFPLEVBQUUsSUFBSTtvQkFDYixLQUFLLEVBQUUsc0JBQXNCO29CQUM3QixPQUFPLEVBQUUsRUFBRTtvQkFDWCxLQUFLLEVBQUUsU0FBUztvQkFDaEIsR0FBRyxFQUFFLEdBQUcsRUFBRTt3QkFDVCxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQ3hCLENBQUM7aUJBQ0QsQ0FBQztTQUNGLENBQUE7SUFDRixDQUFDO1NBQ0ksQ0FBQztRQUNMLE9BQU8sR0FBRyxTQUFTLENBQUE7SUFDcEIsQ0FBQztJQUVELE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUM7UUFDM0MsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO1FBQ3ZCLE9BQU8sRUFBRSxPQUFPO1FBQ2hCLE1BQU0sRUFBRSxJQUFJO1FBQ1osUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztRQUN6RCxPQUFPLEVBQUUsT0FBTztLQUNoQixDQUFDLENBQUE7SUFFRixPQUFPLGVBQWUsQ0FBQTtJQUN0QiwrQ0FBK0M7SUFDL0Msc0NBQXNDO0lBQ3RDLGVBQWU7SUFDZixLQUFLO0FBQ04sQ0FBQyxDQUFBO0FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLFlBQWtDLEVBQXVCLEVBQUU7SUFDckYsTUFBTSxPQUFPLEdBQUcsNEpBQTRKLENBQUE7SUFDNUssTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUMzQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7UUFDdkIsT0FBTyxFQUFFLE9BQU87UUFDaEIsTUFBTSxFQUFFLElBQUk7S0FDWixDQUFDLENBQUE7SUFDRixPQUFPLGVBQWUsQ0FBQTtBQUN2QixDQUFDLENBQUE7QUFHRCxNQUFNLGdCQUFnQixHQUFHLEtBQUssRUFDN0IsUUFBaUIsRUFDakIsWUFBa0MsRUFDbEMsaUJBQXFDLEVBQ3JDLGNBQStCLEVBQy9CLGFBQTZCLEVBQ1MsRUFBRTtJQUV4QyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO0lBRS9DLGNBQWMsQ0FBQyxPQUFPLENBQUMsZUFBZSxVQUFVLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNwRSxNQUFNLEdBQUcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNuRCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDVixNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN4RCxjQUFjLENBQUMsT0FBTyxDQUFDLGVBQWUsVUFBVSxTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLE9BQU8sZUFBZSxDQUFBO0lBQ3ZCLENBQUM7U0FDSSxDQUFDO1FBQ0wsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakIsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDdEUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxlQUFlLFVBQVUsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtZQUNqRSxPQUFPLGVBQWUsQ0FBQTtRQUN2QixDQUFDO2FBQ0ksQ0FBQztZQUNMLGNBQWMsQ0FBQyxPQUFPLENBQUMsZUFBZSxVQUFVLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDaEUsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUMsQ0FBQTtBQUdELFNBQVM7QUFDVCxJQUFJLG1CQUFtQixHQUErQixJQUFJLENBQUE7QUFHMUQsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLElBQUk7WUFDUixFQUFFLEVBQUUsc0JBQXNCO1lBQzFCLEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUseUJBQXlCLENBQUM7U0FDOUQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDcEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUVsRCxNQUFNLG1CQUFtQixHQUFHLG1CQUFtQixDQUFBO1FBRS9DLE1BQU0sYUFBYSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFFbEgsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixtQkFBbUIsRUFBRSxLQUFLLEVBQUUsQ0FBQTtZQUM1QixtQkFBbUIsR0FBRyxhQUFhLENBQUE7UUFDcEMsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixXQUFXO0FBQ1gsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBZ0MsU0FBUSxVQUFVO2FBQ3ZDLE9BQUUsR0FBRyxtQ0FBbUMsQUFBdEMsQ0FBc0M7SUFDeEQsWUFDcUIsaUJBQXFDLEVBQ3hDLGNBQStCLEVBQzFCLFlBQWtDLEVBQ3hDLGFBQTZCO1FBRTdDLEtBQUssRUFBRSxDQUFBO1FBRVAsTUFBTSxTQUFTLEdBQUcsR0FBRyxFQUFFO1lBQ3RCLGdCQUFnQixDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ3hGLENBQUMsQ0FBQTtRQUVELG1DQUFtQztRQUNuQyxzQkFBc0I7UUFDdEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUV4QyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQTtRQUM3RCxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRzlELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUEsQ0FBQyxjQUFjO1FBQzNGLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7SUFFcEUsQ0FBQzs7QUF6QkksK0JBQStCO0lBR2xDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsY0FBYyxDQUFBO0dBTlgsK0JBQStCLENBMEJwQztBQUNELDhCQUE4QixDQUFDLCtCQUErQixDQUFDLEVBQUUsRUFBRSwrQkFBK0Isc0NBQThCLENBQUMifQ==