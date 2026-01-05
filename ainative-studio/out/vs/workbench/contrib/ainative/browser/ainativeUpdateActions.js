/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
import { IAINativeUpdateService } from '../common/ainativeUpdateService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
const notifyUpdate = (res, notifService, updateService) => {
    const message = res?.message || 'This is a very old version of AINative Studio, please download the latest version! [AINative Studio](https://ainative.studio/download)';
    let actions;
    if (res?.action) {
        const primary = [];
        if (res.action === 'reinstall') {
            primary.push({
                label: `Reinstall`,
                id: 'ainative.updater.reinstall',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    const { window } = dom.getActiveWindow();
                    window.open('https://ainative.studio/download');
                }
            });
        }
        if (res.action === 'download') {
            primary.push({
                label: `Download`,
                id: 'ainative.updater.download',
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
                id: 'ainative.updater.apply',
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
                id: 'ainative.updater.restart',
                enabled: true,
                tooltip: '',
                class: undefined,
                run: () => {
                    updateService.quitAndInstall();
                }
            });
        }
        primary.push({
            id: 'ainative.updater.site',
            enabled: true,
            label: `AINative Studio Site`,
            tooltip: '',
            class: undefined,
            run: () => {
                const { window } = dom.getActiveWindow();
                window.open('https://ainative.studio/');
            }
        });
        actions = {
            primary: primary,
            secondary: [{
                    id: 'ainative.updater.close',
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
    const message = `AINative Studio Error: There was an error checking for updates. If this persists, please get in touch or reinstall AINative Studio [here](https://ainative.studio/download)!`;
    const notifController = notifService.notify({
        severity: Severity.Info,
        message: message,
        sticky: true,
    });
    return notifController;
};
const performAINativeCheck = async (explicit, notifService, ainativeUpdateService, metricsService, updateService) => {
    const metricsTag = explicit ? 'Manual' : 'Auto';
    metricsService.capture(`AINative Update ${metricsTag}: Checking...`, {});
    const res = await ainativeUpdateService.check(explicit);
    if (!res) {
        const notifController = notifyErrChecking(notifService);
        metricsService.capture(`AINative Update ${metricsTag}: Error`, { res });
        return notifController;
    }
    else {
        if (res.message) {
            const notifController = notifyUpdate(res, notifService, updateService);
            metricsService.capture(`AINative Update ${metricsTag}: Yes`, { res });
            return notifController;
        }
        else {
            metricsService.capture(`AINative Update ${metricsTag}: No`, { res });
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
            id: 'ainative.ainativeCheckUpdate',
            title: localize2('ainativeCheckUpdate', 'AINative Studio: Check for Updates'),
        });
    }
    async run(accessor) {
        const ainativeUpdateService = accessor.get(IAINativeUpdateService);
        const notifService = accessor.get(INotificationService);
        const metricsService = accessor.get(IMetricsService);
        const updateService = accessor.get(IUpdateService);
        const currNotifController = lastNotifController;
        const newController = await performAINativeCheck(true, notifService, ainativeUpdateService, metricsService, updateService);
        if (newController) {
            currNotifController?.close();
            lastNotifController = newController;
        }
    }
});
// on mount
let AINativeUpdateWorkbenchContribution = class AINativeUpdateWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.ainative.ainativeUpdate'; }
    constructor(ainativeUpdateService, metricsService, notifService, updateService) {
        super();
        const autoCheck = () => {
            performAINativeCheck(false, notifService, ainativeUpdateService, metricsService, updateService);
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
AINativeUpdateWorkbenchContribution = __decorate([
    __param(0, IAINativeUpdateService),
    __param(1, IMetricsService),
    __param(2, INotificationService),
    __param(3, IUpdateService)
], AINativeUpdateWorkbenchContribution);
registerWorkbenchContribution2(AINativeUpdateWorkbenchContribution.ID, AINativeUpdateWorkbenchContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVVcGRhdGVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL2FpbmF0aXZlVXBkYXRlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFFM0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUE2QyxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQTBCLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBQzFILE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBTzlFLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBc0QsRUFBRSxZQUFrQyxFQUFFLGFBQTZCLEVBQXVCLEVBQUU7SUFDdkssTUFBTSxPQUFPLEdBQUcsR0FBRyxFQUFFLE9BQU8sSUFBSSx3SUFBd0ksQ0FBQTtJQUV4SyxJQUFJLE9BQXlDLENBQUE7SUFFN0MsSUFBSSxHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDakIsTUFBTSxPQUFPLEdBQWMsRUFBRSxDQUFBO1FBRTdCLElB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