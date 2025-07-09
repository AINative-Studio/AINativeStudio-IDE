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
import { IVoidUpdateService } from '../common/voidUpdateService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
const notifyUpdate = (res, notifService, updateService) => {
    const message = res?.message || 'This is a very old version of AINative Studio, please download the latest version! [AINative Studio](https://voideditor.com/download-beta)!';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3ZvaWRVcGRhdGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUUzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQTZDLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0ksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBMEIsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFPOUUsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFpRCxFQUFFLFlBQWtDLEVBQUUsYUFBNkIsRUFBdUIsRUFBRTtJQUNsSyxNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUUsT0FBTyxJQUFJLDZJQUE2SSxDQUFBO0lBRTdLLElBQUksT0FBeUMsQ0FBQTtJQUU3QyxJQUFJLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUNqQixNQUFNLE9BQU8sR0FBYyxFQUFFLENBQUE7UUFFN0IsSUFBSSxHQUFHLENBQUMs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