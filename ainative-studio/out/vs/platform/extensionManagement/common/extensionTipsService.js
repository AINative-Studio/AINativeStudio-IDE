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
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { Disposable, MutableDisposable } from '../../../base/common/lifecycle.js';
import { joinPath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { IFileService } from '../../files/common/files.js';
import { IProductService } from '../../product/common/productService.js';
import { disposableTimeout } from '../../../base/common/async.js';
import { Event } from '../../../base/common/event.js';
import { join } from '../../../base/common/path.js';
import { isWindows } from '../../../base/common/platform.js';
import { env } from '../../../base/common/process.js';
import { areSameExtensions } from './extensionManagementUtil.js';
//#region Base Extension Tips Service
let ExtensionTipsService = class ExtensionTipsService extends Disposable {
    constructor(fileService, productService) {
        super();
        this.fileService = fileService;
        this.productService = productService;
        this.allConfigBasedTips = new Map();
        if (this.productService.configBasedExtensionTips) {
            Object.entries(this.productService.configBasedExtensionTips).forEach(([, value]) => this.allConfigBasedTips.set(value.configPath, value));
        }
    }
    getConfigBasedTips(folder) {
        return this.getValidConfigBasedTips(folder);
    }
    async getImportantExecutableBasedTips() {
        return [];
    }
    async getOtherExecutableBasedTips() {
        return [];
    }
    async getValidConfigBasedTips(folder) {
        const result = [];
        for (const [configPath, tip] of this.allConfigBasedTips) {
            if (tip.configScheme && tip.configScheme !== folder.scheme) {
                continue;
            }
            try {
                const content = (await this.fileService.readFile(joinPath(folder, configPath))).value.toString();
                for (const [key, value] of Object.entries(tip.recommendations)) {
                    if (!value.contentPattern || new RegExp(value.contentPattern, 'mig').test(content)) {
                        result.push({
                            extensionId: key,
                            extensionName: value.name,
                            configName: tip.configName,
                            important: !!value.important,
                            isExtensionPack: !!value.isExtensionPack,
                            whenNotInstalled: value.whenNotInstalled
                        });
                    }
                }
            }
            catch (error) { /* Ignore */ }
        }
        return result;
    }
};
ExtensionTipsService = __decorate([
    __param(0, IFileService),
    __param(1, IProductService)
], ExtensionTipsService);
export { ExtensionTipsService };
const promptedExecutableTipsStorageKey = 'extensionTips/promptedExecutableTips';
const lastPromptedMediumImpExeTimeStorageKey = 'extensionTips/lastPromptedMediumImpExeTime';
export class AbstractNativeExtensionTipsService extends ExtensionTipsService {
    constructor(userHome, windowEvents, telemetryService, extensionManagementService, storageService, extensionRecommendationNotificationService, fileService, productService) {
        super(fileService, productService);
        this.userHome = userHome;
        this.windowEvents = windowEvents;
        this.telemetryService = telemetryService;
        this.extensionManagementService = extensionManagementService;
        this.storageService = storageService;
        this.extensionRecommendationNotificationService = extensionRecommendationNotificationService;
        this.highImportanceExecutableTips = new Map();
        this.mediumImportanceExecutableTips = new Map();
        this.allOtherExecutableTips = new Map();
        this.highImportanceTipsByExe = new Map();
        this.mediumImportanceTipsByExe = new Map();
        if (productService.exeBasedExtensionTips) {
            Object.entries(productService.exeBasedExtensionTips).forEach(([key, exeBasedExtensionTip]) => {
                const highImportanceRecommendations = [];
                const mediumImportanceRecommendations = [];
                const otherRecommendations = [];
                Object.entries(exeBasedExtensionTip.recommendations).forEach(([extensionId, value]) => {
                    if (value.important) {
                        if (exeBasedExtensionTip.important) {
                            highImportanceRecommendations.push({ extensionId, extensionName: value.name, isExtensionPack: !!value.isExtensionPack });
                        }
                        else {
                            mediumImportanceRecommendations.push({ extensionId, extensionName: value.name, isExtensionPack: !!value.isExtensionPack });
                        }
                    }
                    else {
                        otherRecommendations.push({ extensionId, extensionName: value.name, isExtensionPack: !!value.isExtensionPack });
                    }
                });
                if (highImportanceRecommendations.length) {
                    this.highImportanceExecutableTips.set(key, { exeFriendlyName: exeBasedExtensionTip.friendlyName, windowsPath: exeBasedExtensionTip.windowsPath, recommendations: highImportanceRecommendations });
                }
                if (mediumImportanceRecommendations.length) {
                    this.mediumImportanceExecutableTips.set(key, { exeFriendlyName: exeBasedExtensionTip.friendlyName, windowsPath: exeBasedExtensionTip.windowsPath, recommendations: mediumImportanceRecommendations });
                }
                if (otherRecommendations.length) {
                    this.allOtherExecutableTips.set(key, { exeFriendlyName: exeBasedExtensionTip.friendlyName, windowsPath: exeBasedExtensionTip.windowsPath, recommendations: otherRecommendations });
                }
            });
        }
        /*
            3s has come out to be the good number to fetch and prompt important exe based recommendations
            Also fetch important exe based recommendations for reporting telemetry
        */
        disposableTimeout(async () => {
            await this.collectTips();
            this.promptHighImportanceExeBasedTip();
            this.promptMediumImportanceExeBasedTip();
        }, 3000, this._store);
    }
    async getImportantExecutableBasedTips() {
        const highImportanceExeTips = await this.getValidExecutableBasedExtensionTips(this.highImportanceExecutableTips);
        const mediumImportanceExeTips = await this.getValidExecutableBasedExtensionTips(this.mediumImportanceExecutableTips);
        return [...highImportanceExeTips, ...mediumImportanceExeTips];
    }
    getOtherExecutableBasedTips() {
        return this.getValidExecutableBasedExtensionTips(this.allOtherExecutableTips);
    }
    async collectTips() {
        const highImportanceExeTips = await this.getValidExecutableBasedExtensionTips(this.highImportanceExecutableTips);
        const mediumImportanceExeTips = await this.getValidExecutableBasedExtensionTips(this.mediumImportanceExecutableTips);
        const local = await this.extensionManagementService.getInstalled();
        this.highImportanceTipsByExe = this.groupImportantTipsByExe(highImportanceExeTips, local);
        this.mediumImportanceTipsByExe = this.groupImportantTipsByExe(mediumImportanceExeTips, local);
    }
    groupImportantTipsByExe(importantExeBasedTips, local) {
        const importantExeBasedRecommendations = new Map();
        importantExeBasedTips.forEach(tip => importantExeBasedRecommendations.set(tip.extensionId.toLowerCase(), tip));
        const { installed, uninstalled: recommendations } = this.groupByInstalled([...importantExeBasedRecommendations.keys()], local);
        /* Log installed and uninstalled exe based recommendations */
        for (const extensionId of installed) {
            const tip = importantExeBasedRecommendations.get(extensionId);
            if (tip) {
                this.telemetryService.publicLog2('exeExtensionRecommendations:alreadyInstalled', { extensionId, exeName: tip.exeName });
            }
        }
        for (const extensionId of recommendations) {
            const tip = importantExeBasedRecommendations.get(extensionId);
            if (tip) {
                this.telemetryService.publicLog2('exeExtensionRecommendations:notInstalled', { extensionId, exeName: tip.exeName });
            }
        }
        const promptedExecutableTips = this.getPromptedExecutableTips();
        const tipsByExe = new Map();
        for (const extensionId of recommendations) {
            const tip = importantExeBasedRecommendations.get(extensionId);
            if (tip && (!promptedExecutableTips[tip.exeName] || !promptedExecutableTips[tip.exeName].includes(tip.extensionId))) {
                let tips = tipsByExe.get(tip.exeName);
                if (!tips) {
                    tips = [];
                    tipsByExe.set(tip.exeName, tips);
                }
                tips.push(tip);
            }
        }
        return tipsByExe;
    }
    /**
     * High importance tips are prompted once per restart session
     */
    promptHighImportanceExeBasedTip() {
        if (this.highImportanceTipsByExe.size === 0) {
            return;
        }
        const [exeName, tips] = [...this.highImportanceTipsByExe.entries()][0];
        this.promptExeRecommendations(tips)
            .then(result => {
            switch (result) {
                case "reacted" /* RecommendationsNotificationResult.Accepted */:
                    this.addToRecommendedExecutables(tips[0].exeName, tips);
                    break;
                case "ignored" /* RecommendationsNotificationResult.Ignored */:
                    this.highImportanceTipsByExe.delete(exeName);
                    break;
                case "incompatibleWindow" /* RecommendationsNotificationResult.IncompatibleWindow */: {
                    // Recommended in incompatible window. Schedule the prompt after active window change
                    const onActiveWindowChange = Event.once(Event.latch(Event.any(this.windowEvents.onDidOpenMainWindow, this.windowEvents.onDidFocusMainWindow)));
                    this._register(onActiveWindowChange(() => this.promptHighImportanceExeBasedTip()));
                    break;
                }
                case "toomany" /* RecommendationsNotificationResult.TooMany */: {
                    // Too many notifications. Schedule the prompt after one hour
                    const disposable = this._register(new MutableDisposable());
                    disposable.value = disposableTimeout(() => { disposable.dispose(); this.promptHighImportanceExeBasedTip(); }, 60 * 60 * 1000 /* 1 hour */);
                    break;
                }
            }
        });
    }
    /**
     * Medium importance tips are prompted once per 7 days
     */
    promptMediumImportanceExeBasedTip() {
        if (this.mediumImportanceTipsByExe.size === 0) {
            return;
        }
        const lastPromptedMediumExeTime = this.getLastPromptedMediumExeTime();
        const timeSinceLastPrompt = Date.now() - lastPromptedMediumExeTime;
        const promptInterval = 7 * 24 * 60 * 60 * 1000; // 7 Days
        if (timeSinceLastPrompt < promptInterval) {
            // Wait until interval and prompt
            const disposable = this._register(new MutableDisposable());
            disposable.value = disposableTimeout(() => { disposable.dispose(); this.promptMediumImportanceExeBasedTip(); }, promptInterval - timeSinceLastPrompt);
            return;
        }
        const [exeName, tips] = [...this.mediumImportanceTipsByExe.entries()][0];
        this.promptExeRecommendations(tips)
            .then(result => {
            switch (result) {
                case "reacted" /* RecommendationsNotificationResult.Accepted */: {
                    // Accepted: Update the last prompted time and caches.
                    this.updateLastPromptedMediumExeTime(Date.now());
                    this.mediumImportanceTipsByExe.delete(exeName);
                    this.addToRecommendedExecutables(tips[0].exeName, tips);
                    // Schedule the next recommendation for next internval
                    const disposable1 = this._register(new MutableDisposable());
                    disposable1.value = disposableTimeout(() => { disposable1.dispose(); this.promptMediumImportanceExeBasedTip(); }, promptInterval);
                    break;
                }
                case "ignored" /* RecommendationsNotificationResult.Ignored */:
                    // Ignored: Remove from the cache and prompt next recommendation
                    this.mediumImportanceTipsByExe.delete(exeName);
                    this.promptMediumImportanceExeBasedTip();
                    break;
                case "incompatibleWindow" /* RecommendationsNotificationResult.IncompatibleWindow */: {
                    // Recommended in incompatible window. Schedule the prompt after active window change
                    const onActiveWindowChange = Event.once(Event.latch(Event.any(this.windowEvents.onDidOpenMainWindow, this.windowEvents.onDidFocusMainWindow)));
                    this._register(onActiveWindowChange(() => this.promptMediumImportanceExeBasedTip()));
                    break;
                }
                case "toomany" /* RecommendationsNotificationResult.TooMany */: {
                    // Too many notifications. Schedule the prompt after one hour
                    const disposable2 = this._register(new MutableDisposable());
                    disposable2.value = disposableTimeout(() => { disposable2.dispose(); this.promptMediumImportanceExeBasedTip(); }, 60 * 60 * 1000 /* 1 hour */);
                    break;
                }
            }
        });
    }
    async promptExeRecommendations(tips) {
        const installed = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */);
        const extensions = tips
            .filter(tip => !tip.whenNotInstalled || tip.whenNotInstalled.every(id => installed.every(local => !areSameExtensions(local.identifier, { id }))))
            .map(({ extensionId }) => extensionId.toLowerCase());
        return this.extensionRecommendationNotificationService.promptImportantExtensionsInstallNotification({ extensions, source: 3 /* RecommendationSource.EXE */, name: tips[0].exeFriendlyName, searchValue: `@exe:"${tips[0].exeName}"` });
    }
    getLastPromptedMediumExeTime() {
        let value = this.storageService.getNumber(lastPromptedMediumImpExeTimeStorageKey, -1 /* StorageScope.APPLICATION */);
        if (!value) {
            value = Date.now();
            this.updateLastPromptedMediumExeTime(value);
        }
        return value;
    }
    updateLastPromptedMediumExeTime(value) {
        this.storageService.store(lastPromptedMediumImpExeTimeStorageKey, value, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getPromptedExecutableTips() {
        return JSON.parse(this.storageService.get(promptedExecutableTipsStorageKey, -1 /* StorageScope.APPLICATION */, '{}'));
    }
    addToRecommendedExecutables(exeName, tips) {
        const promptedExecutableTips = this.getPromptedExecutableTips();
        promptedExecutableTips[exeName] = tips.map(({ extensionId }) => extensionId.toLowerCase());
        this.storageService.store(promptedExecutableTipsStorageKey, JSON.stringify(promptedExecutableTips), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    groupByInstalled(recommendationsToSuggest, local) {
        const installed = [], uninstalled = [];
        const installedExtensionsIds = local.reduce((result, i) => { result.add(i.identifier.id.toLowerCase()); return result; }, new Set());
        recommendationsToSuggest.forEach(id => {
            if (installedExtensionsIds.has(id.toLowerCase())) {
                installed.push(id);
            }
            else {
                uninstalled.push(id);
            }
        });
        return { installed, uninstalled };
    }
    async getValidExecutableBasedExtensionTips(executableTips) {
        const result = [];
        const checkedExecutables = new Map();
        for (const exeName of executableTips.keys()) {
            const extensionTip = executableTips.get(exeName);
            if (!extensionTip || !isNonEmptyArray(extensionTip.recommendations)) {
                continue;
            }
            const exePaths = [];
            if (isWindows) {
                if (extensionTip.windowsPath) {
                    exePaths.push(extensionTip.windowsPath.replace('%USERPROFILE%', () => env['USERPROFILE'])
                        .replace('%ProgramFiles(x86)%', () => env['ProgramFiles(x86)'])
                        .replace('%ProgramFiles%', () => env['ProgramFiles'])
                        .replace('%APPDATA%', () => env['APPDATA'])
                        .replace('%WINDIR%', () => env['WINDIR']));
                }
            }
            else {
                exePaths.push(join('/usr/local/bin', exeName));
                exePaths.push(join('/usr/bin', exeName));
                exePaths.push(join(this.userHome.fsPath, exeName));
            }
            for (const exePath of exePaths) {
                let exists = checkedExecutables.get(exePath);
                if (exists === undefined) {
                    exists = await this.fileService.exists(URI.file(exePath));
                    checkedExecutables.set(exePath, exists);
                }
                if (exists) {
                    for (const { extensionId, extensionName, isExtensionPack, whenNotInstalled } of extensionTip.recommendations) {
                        result.push({
                            extensionId,
                            extensionName,
                            isExtensionPack,
                            exeName,
                            exeFriendlyName: extensionTip.exeFriendlyName,
                            windowsPath: extensionTip.windowsPath,
                            whenNotInstalled: whenNotInstalled
                        });
                    }
                }
            }
        }
        return result;
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVGlwc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uVGlwc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBTWpFLHFDQUFxQztBQUU5QixJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFNbkQsWUFDZSxXQUE0QyxFQUN6QyxjQUFnRDtRQUVqRSxLQUFLLEVBQUUsQ0FBQztRQUh5QixnQkFB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