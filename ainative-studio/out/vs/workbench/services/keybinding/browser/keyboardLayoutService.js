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
import { Emitter, Event } from '../../../../base/common/event.js';
import { FileAccess } from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { KeymapInfo } from '../common/keymapInfo.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { readKeyboardConfig } from '../../../../platform/keyboardLayout/common/keyboardConfig.js';
import { CachedKeyboardMapper } from '../../../../platform/keyboardLayout/common/keyboardMapper.js';
import { OS, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { WindowsKeyboardMapper } from '../common/windowsKeyboardMapper.js';
import { FallbackKeyboardMapper } from '../common/fallbackKeyboardMapper.js';
import { MacLinuxKeyboardMapper } from '../common/macLinuxKeyboardMapper.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { parse, getNodeType } from '../../../../base/common/json.js';
import * as objects from '../../../../base/common/objects.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { getKeyboardLayoutId, IKeyboardLayoutService } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
export class BrowserKeyboardMapperFactoryBase extends Disposable {
    get activeKeymap() {
        return this._activeKeymapInfo;
    }
    get keymapInfos() {
        return this._keymapInfos;
    }
    get activeKeyboardLayout() {
        if (!this._initialized) {
            return null;
        }
        return this._activeKeymapInfo?.layout ?? null;
    }
    get activeKeyMapping() {
        if (!this._initialized) {
            return null;
        }
        return this._activeKeymapInfo?.mapping ?? null;
    }
    get keyboardLayouts() {
        return this._keymapInfos.map(keymapInfo => keymapInfo.layout);
    }
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        this._onDidChangeKeyboardMapper = new Emitter();
        this.onDidChangeKeyboardMapper = this._onDidChangeKeyboardMapper.event;
        this.keyboardLayoutMapAllowed = navigator.keyboard !== undefined;
        this._keyboardMapper = null;
        this._initialized = false;
        this._keymapInfos = [];
        this._mru = [];
        this._activeKeymapInfo = null;
        if (navigator.keyboard && navigator.keyboard.addEventListener) {
            navigator.keyboard.addEventListener('layoutchange', () => {
                // Update user keyboard map settings
                this._getBrowserKeyMapping().then((mapping) => {
                    if (this.isKeyMappingActive(mapping)) {
                        return;
                    }
                    this.setLayoutFromBrowserAPI();
                });
            });
        }
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('keyboard')) {
                this._keyboardMapper = null;
                this._onDidChangeKeyboardMapper.fire();
            }
        }));
    }
    registerKeyboardLayout(layout) {
        this._keymapInfos.push(layout);
        this._mru = this._keymapInfos;
    }
    removeKeyboardLayout(layout) {
        let index = this._mru.indexOf(layout);
        this._mru.splice(index, 1);
        index = this._keymapInfos.indexOf(layout);
        this._keymapInfos.splice(index, 1);
    }
    getMatchedKeymapInfo(keyMapping) {
        if (!keyMapping) {
            return null;
        }
        const usStandard = this.getUSStandardLayout();
        if (usStandard) {
            let maxScore = usStandard.getScore(keyMapping);
            if (maxScore === 0) {
                return {
                    result: usStandard,
                    score: 0
                };
            }
            let result = usStandard;
            for (let i = 0; i < this._mru.length; i++) {
                const score = this._mru[i].getScore(keyMapping);
                if (score > maxScore) {
                    if (score === 0) {
                        return {
                            result: this._mru[i],
                            score: 0
                        };
                    }
                    maxScore = score;
                    result = this._mru[i];
                }
            }
            return {
                result,
                score: maxScore
            };
        }
        for (let i = 0; i < this._mru.length; i++) {
            if (this._mru[i].fuzzyEqual(keyMapping)) {
                return {
                    result: this._mru[i],
                    score: 0
                };
            }
        }
        return null;
    }
    getUSStandardLayout() {
        const usStandardLayouts = this._mru.filter(layout => layout.layout.isUSStandard);
        if (usStandardLayouts.length) {
            return usStandardLayouts[0];
        }
        return null;
    }
    isKeyMappingActive(keymap) {
        return this._activeKeymapInfo && keymap && this._activeKeymapInfo.fuzzyEqual(keymap);
    }
    setUSKeyboardLayout() {
        this._activeKeymapInfo = this.getUSStandardLayout();
    }
    setActiveKeyMapping(keymap) {
        let keymapUpdated = false;
        const matchedKeyboardLayout = this.getMatchedKeymapInfo(keymap);
        if (matchedKeyboardLayout) {
            // let score = matchedKeyboardLayout.score;
            // Due to https://bugs.chromium.org/p/chromium/issues/detail?id=977609, any key after a dead key will generate a wrong mapping,
            // we shoud avoid yielding the false error.
            // if (keymap && score < 0) {
            // const donotAskUpdateKey = 'missing.keyboardlayout.donotask';
            // if (this._storageService.getBoolean(donotAskUpdateKey, StorageScope.APPLICATION)) {
            // 	return;
            // }
            // the keyboard layout doesn't actually match the key event or the keymap from chromium
            // this._notificationService.prompt(
            // 	Severity.Info,
            // 	nls.localize('missing.keyboardlayout', 'Fail to find matching keyboard layout'),
            // 	[{
            // 		label: nls.localize('keyboardLayoutMissing.configure', "Configure"),
            // 		run: () => this._commandService.executeCommand('workbench.action.openKeyboardLayoutPicker')
            // 	}, {
            // 		label: nls.localize('neverAgain', "Don't Show Again"),
            // 		isSecondary: true,
            // 		run: () => this._storageService.store(donotAskUpdateKey, true, StorageScope.APPLICATION)
            // 	}]
            // );
            // console.warn('Active keymap/keyevent does not match current keyboard layout', JSON.stringify(keymap), this._activeKeymapInfo ? JSON.stringify(this._activeKeymapInfo.layout) : '');
            // return;
            // }
            if (!this._activeKeymapInfo) {
                this._activeKeymapInfo = matchedKeyboardLayout.result;
                keymapUpdated = true;
            }
            else if (keymap) {
                if (matchedKeyboardLayout.result.getScore(keymap) > this._activeKeymapInfo.getScore(keymap)) {
                    this._activeKeymapInfo = matchedKeyboardLayout.result;
                    keymapUpdated = true;
                }
            }
        }
        if (!this._activeKeymapInfo) {
            this._activeKeymapInfo = this.getUSStandardLayout();
            keymapUpdated = true;
        }
        if (!this._activeKeymapInfo || !keymapUpdated) {
            return;
        }
        const index = this._mru.indexOf(this._activeKeymapInfo);
        this._mru.splice(index, 1);
        this._mru.unshift(this._activeKeymapInfo);
        this._setKeyboardData(this._activeKeymapInfo);
    }
    setActiveKeymapInfo(keymapInfo) {
        this._activeKeymapInfo = keymapInfo;
        const index = this._mru.indexOf(this._activeKeymapInfo);
        if (index === 0) {
            return;
        }
        this._mru.splice(index, 1);
        this._mru.unshift(this._activeKeymapInfo);
        this._setKeyboardData(this._activeKeymapInfo);
    }
    setLayoutFromBrowserAPI() {
        this._updateKeyboardLayoutAsync(this._initialized);
    }
    _updateKeyboardLayoutAsync(initialized, keyboardEvent) {
        if (!initialized) {
            return;
        }
        this._getBrowserKeyMapping(keyboardEvent).then(keyMap => {
            // might be false positive
            if (this.isKeyMappingActive(keyMap)) {
                return;
            }
            this.setActiveKeyMapping(keyMap);
        });
    }
    getKeyboardMapper() {
        const config = readKeyboardConfig(this._configurationService);
        if (config.dispatch === 1 /* DispatchConfig.KeyCode */ || !this._initialized || !this._activeKeymapInfo) {
            // Forcefully set to use keyCode
            return new FallbackKeyboardMapper(config.mapAltGrToCtrlAlt, OS);
        }
        if (!this._keyboardMapper) {
            this._keyboardMapper = new CachedKeyboardMapper(BrowserKeyboardMapperFactory._createKeyboardMapper(this._activeKeymapInfo, config.mapAltGrToCtrlAlt));
        }
        return this._keyboardMapper;
    }
    validateCurrentKeyboardMapping(keyboardEvent) {
        if (!this._initialized) {
            return;
        }
        const isCurrentKeyboard = this._validateCurrentKeyboardMapping(keyboardEvent);
        if (isCurrentKeyboard) {
            return;
        }
        this._updateKeyboardLayoutAsync(true, keyboardEvent);
    }
    setKeyboardLayout(layoutName) {
        const matchedLayouts = this.keymapInfos.filter(keymapInfo => getKeyboardLayoutId(keymapInfo.layout) === layoutName);
        if (matchedLayouts.length > 0) {
            this.setActiveKeymapInfo(matchedLayouts[0]);
        }
    }
    _setKeyboardData(keymapInfo) {
        this._initialized = true;
        this._keyboardMapper = null;
        this._onDidChangeKeyboardMapper.fire();
    }
    static _createKeyboardMapper(keymapInfo, mapAltGrToCtrlAlt) {
        const rawMapping = keymapInfo.mapping;
        const isUSStandard = !!keymapInfo.layout.isUSStandard;
        if (OS === 1 /* OperatingSystem.Windows */) {
            return new WindowsKeyboardMapper(isUSStandard, rawMapping, mapAltGrToCtrlAlt);
        }
        if (Object.keys(rawMapping).length === 0) {
            // Looks like reading the mappings failed (most likely Mac + Japanese/Chinese keyboard layouts)
            return new FallbackKeyboardMapper(mapAltGrToCtrlAlt, OS);
        }
        return new MacLinuxKeyboardMapper(isUSStandard, rawMapping, mapAltGrToCtrlAlt, OS);
    }
    //#region Browser API
    _validateCurrentKeyboardMapping(keyboardEvent) {
        if (!this._initialized) {
            return true;
        }
        const standardKeyboardEvent = keyboardEvent;
        const currentKeymap = this._activeKeymapInfo;
        if (!currentKeymap) {
            return true;
        }
        if (standardKeyboardEvent.browserEvent.key === 'Dead' || standardKeyboardEvent.browserEvent.isComposing) {
            return true;
        }
        const mapping = currentKeymap.mapping[standardKeyboardEvent.code];
        if (!mapping) {
            return false;
        }
        if (mapping.value === '') {
            // The value is empty when the key is not a printable character, we skip validation.
            if (keyboardEvent.ctrlKey || keyboardEvent.metaKey) {
                setTimeout(() => {
                    this._getBrowserKeyMapping().then((keymap) => {
                        if (this.isKeyMappingActive(keymap)) {
                            return;
                        }
                        this.setLayoutFromBrowserAPI();
                    });
                }, 350);
            }
            return true;
        }
        const expectedValue = standardKeyboardEvent.altKey && standardKeyboardEvent.shiftKey ? mapping.withShiftAltGr :
            standardKeyboardEvent.altKey ? mapping.withAltGr :
                standardKeyboardEvent.shiftKey ? mapping.withShift : mapping.value;
        const isDead = (standardKeyboardEvent.altKey && standardKeyboardEvent.shiftKey && mapping.withShiftAltGrIsDeadKey) ||
            (standardKeyboardEvent.altKey && mapping.withAltGrIsDeadKey) ||
            (standardKeyboardEvent.shiftKey && mapping.withShiftIsDeadKey) ||
            mapping.valueIsDeadKey;
        if (isDead && standardKeyboardEvent.browserEvent.key !== 'Dead') {
            return false;
        }
        // TODO, this assumption is wrong as `browserEvent.key` doesn't necessarily equal expectedValue from real keymap
        if (!isDead && standardKeyboardEvent.browserEvent.key !== expectedValue) {
            return false;
        }
        return true;
    }
    async _getBrowserKeyMapping(keyboardEvent) {
        if (this.keyboardLayoutMapAllowed) {
            try {
                return await navigator.keyboard.getLayoutMap().then((e) => {
                    const ret = {};
                    for (const key of e) {
                        ret[key[0]] = {
                            'value': key[1],
                            'withShift': '',
                            'withAltGr': '',
                            'withShiftAltGr': ''
                        };
                    }
                    return ret;
                    // const matchedKeyboardLayout = this.getMatchedKeymapInfo(ret);
                    // if (matchedKeyboardLayout) {
                    // 	return matchedKeyboardLayout.result.mapping;
                    // }
                    // return null;
                });
            }
            catch {
                // getLayoutMap can throw if invoked from a nested browsing context
                this.keyboardLayoutMapAllowed = false;
            }
        }
        if (keyboardEvent && !keyboardEvent.shiftKey && !keyboardEvent.altKey && !keyboardEvent.metaKey && !keyboardEvent.metaKey) {
            const ret = {};
            const standardKeyboardEvent = keyboardEvent;
            ret[standardKeyboardEvent.browserEvent.code] = {
                'value': standardKeyboardEvent.browserEvent.key,
                'withShift': '',
                'withAltGr': '',
                'withShiftAltGr': ''
            };
            const matchedKeyboardLayout = this.getMatchedKeymapInfo(ret);
            if (matchedKeyboardLayout) {
                return ret;
            }
            return null;
        }
        return null;
    }
}
export class BrowserKeyboardMapperFactory extends BrowserKeyboardMapperFactoryBase {
    constructor(configurationService, notificationService, storageService, commandService) {
        // super(notificationService, storageService, commandService);
        super(configurationService);
        const platform = isWindows ? 'win' : isMacintosh ? 'darwin' : 'linux';
        import(FileAccess.asBrowserUri(`vs/workbench/services/keybinding/browser/keyboardLayouts/layout.contribution.${platform}.js`).path).then((m) => {
            const keymapInfos = m.KeyboardLayoutContribution.INSTANCE.layoutInfos;
            this._keymapInfos.push(...keymapInfos.map(info => (new KeymapInfo(info.layout, info.secondaryLayouts, info.mapping, info.isUserKeyboardLayout))));
            this._mru = this._keymapInfos;
            this._initialized = true;
            this.setLayoutFromBrowserAPI();
        });
    }
}
class UserKeyboardLayout extends Disposable {
    get keyboardLayout() { return this._keyboardLayout; }
    constructor(keyboardLayoutResource, fileService) {
        super();
        this.keyboardLayoutResource = keyboardLayoutResource;
        this.fileService = fileService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._keyboardLayout = null;
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.reload().then(changed => {
            if (changed) {
                this._onDidChange.fire();
            }
        }), 50));
        this._register(Event.filter(this.fileService.onDidFilesChange, e => e.contains(this.keyboardLayoutResource))(() => this.reloadConfigurationScheduler.schedule()));
    }
    async initialize() {
        await this.reload();
    }
    async reload() {
        const existing = this._keyboardLayout;
        try {
            const content = await this.fileService.readFile(this.keyboardLayoutResource);
            const value = parse(content.value.toString());
            if (getNodeType(value) === 'object') {
                const layoutInfo = value.layout;
                const mappings = value.rawMapping;
                this._keyboardLayout = KeymapInfo.createKeyboardLayoutFromDebugInfo(layoutInfo, mappings, true);
            }
            else {
                this._keyboardLayout = null;
            }
        }
        catch (e) {
            this._keyboardLayout = null;
        }
        return existing ? !objects.equals(existing, this._keyboardLayout) : true;
    }
}
let BrowserKeyboardLayoutService = class BrowserKeyboardLayoutService extends Disposable {
    constructor(environmentService, fileService, notificationService, storageService, commandService, configurationService) {
        super();
        this.configurationService = configurationService;
        this._onDidChangeKeyboardLayout = new Emitter();
        this.onDidChangeKeyboardLayout = this._onDidChangeKeyboardLayout.event;
        const keyboardConfig = configurationService.getValue('keyboard');
        const layout = keyboardConfig.layout;
        this._keyboardLayoutMode = layout ?? 'autodetect';
        this._factory = new BrowserKeyboardMapperFactory(configurationService, notificationService, storageService, commandService);
        this._register(this._factory.onDidChangeKeyboardMapper(() => {
            this._onDidChangeKeyboardLayout.fire();
        }));
        if (layout && layout !== 'autodetect') {
            // set keyboard layout
            this._factory.setKeyboardLayout(layout);
        }
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('keyboard.layout')) {
                const keyboardConfig = configurationService.getValue('keyboard');
                const layout = keyboardConfig.layout;
                this._keyboardLayoutMode = layout;
                if (layout === 'autodetect') {
                    this._factory.setLayoutFromBrowserAPI();
                }
                else {
                    this._factory.setKeyboardLayout(layout);
                }
            }
        }));
        this._userKeyboardLayout = new UserKeyboardLayout(environmentService.keyboardLayoutResource, fileService);
        this._userKeyboardLayout.initialize().then(() => {
            if (this._userKeyboardLayout.keyboardLayout) {
                this._factory.registerKeyboardLayout(this._userKeyboardLayout.keyboardLayout);
                this.setUserKeyboardLayoutIfMatched();
            }
        });
        this._register(this._userKeyboardLayout.onDidChange(() => {
            const userKeyboardLayouts = this._factory.keymapInfos.filter(layout => layout.isUserKeyboardLayout);
            if (userKeyboardLayouts.length) {
                if (this._userKeyboardLayout.keyboardLayout) {
                    userKeyboardLayouts[0].update(this._userKeyboardLayout.keyboardLayout);
                }
                else {
                    this._factory.removeKeyboardLayout(userKeyboardLayouts[0]);
                }
            }
            else {
                if (this._userKeyboardLayout.keyboardLayout) {
                    this._factory.registerKeyboardLayout(this._userKeyboardLayout.keyboardLayout);
                }
            }
            this.setUserKeyboardLayoutIfMatched();
        }));
    }
    setUserKeyboardLayoutIfMatched() {
        const keyboardConfig = this.configurationService.getValue('keyboard');
        const layout = keyboardConfig.layout;
        if (layout && this._userKeyboardLayout.keyboardLayout) {
            if (getKeyboardLayoutId(this._userKeyboardLayout.keyboardLayout.layout) === layout && this._factory.activeKeymap) {
                if (!this._userKeyboardLayout.keyboardLayout.equal(this._factory.activeKeymap)) {
                    this._factory.setActiveKeymapInfo(this._userKeyboardLayout.keyboardLayout);
                }
            }
        }
    }
    getKeyboardMapper() {
        return this._factory.getKeyboardMapper();
    }
    getCurrentKeyboardLayout() {
        return this._factory.activeKeyboardLayout;
    }
    getAllKeyboardLayouts() {
        return this._factory.keyboardLayouts;
    }
    getRawKeyboardMapping() {
        return this._factory.activeKeyMapping;
    }
    validateCurrentKeyboardMapping(keyboardEvent) {
        if (this._keyboardLayoutMode !== 'autodetect') {
            return;
        }
        this._factory.validateCurrentKeyboardMapping(keyboardEvent);
    }
};
BrowserKeyboardLayoutService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IFileService),
    __param(2, INotificationService),
    __param(3, IStorageService),
    __param(4, ICommandService),
    __param(5, IConfigurationService)
], BrowserKeyboardLayoutService);
export { BrowserKeyboardLayoutService };
registerSingleton(IKeyboardLayoutService, BrowserKeyboardLayoutService, 1 /* InstantiationType.Delayed */);
// Configuration
const configurationRegistry = Registry.as(ConfigExtensions.Configuration);
const keyboardConfiguration = {
    'id': 'keyboard',
    'order': 15,
    'type': 'object',
    'title': nls.localize('keyboardConfigurationTitle', "Keyboard"),
    'properties': {
        'keyboard.layout': {
            'type': 'string',
            'default': 'autodetect',
            'description': nls.localize('keyboard.layout.config', "Control the keyboard layout used in web.")
        }
    }
};
configurationRegistry.registerConfiguration(keyboardConfiguration);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvYnJvd3Nlci9rZXlib2FyZExheW91dFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBbUIsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQXlDLE1BQU0seUJBQXlCLENBQUM7QUFDNUYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBa0Isa0JBQWtCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNsSCxPQUFPLEVBQW1CLG9CQUFvQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDckgsT0FBTyxFQUFFLEVBQUUsRUFBbUIsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLElBQUksZ0JBQWdCLEVBQThDLE1BQU0sb0VBQW9FLENBQUM7QUFDaEssT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQXVCLHNCQUFzQixFQUF1RSxNQUFNLDhEQUE4RCxDQUFDO0FBRXJOLE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxVQUFVO0lBYS9ELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQy9CLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVELElBQUksb0JBQW9CO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQztJQUMvQyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLElBQUksSUFBSSxDQUFDO0lBQ2hELENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsWUFDa0IscUJBQTRDO1FBSzdELEtBQUssRUFBRSxDQUFDO1FBTFMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQXRDN0MsK0JBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUNsRCw4QkFBeUIsR0FBZ0IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztRQU12Riw2QkFBd0IsR0FBYSxTQUFpQixDQUFDLFFBQVEsS0FBSyxTQUFTLENBQUM7UUFxQ3JGLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO1FBQzFCLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztRQUU5QixJQUE2QixTQUFVLENBQUMsUUFBUSxJQUE2QixTQUFVLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDMUYsU0FBVSxDQUFDLFFBQVEsQ0FBQyxnQkFBaUIsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO2dCQUNuRixvQ0FBb0M7Z0JBQ3BDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQWdDLEVBQUUsRUFBRTtvQkFDdEUsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzt3QkFDdEMsT0FBTztvQkFDUixDQUFDO29CQUVELElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUNoQyxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEUsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7Z0JBQzVCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN4QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxNQUFrQjtRQUN4QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDL0IsQ0FBQztJQUVELG9CQUFvQixDQUFDLE1BQWtCO1FBQ3RDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQixLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxVQUFtQztRQUN2RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFFOUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQy9DLElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwQixPQUFPO29CQUNOLE1BQU0sRUFBRSxVQUFVO29CQUNsQixLQUFLLEVBQUUsQ0FBQztpQkFDUixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQztZQUN4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2hELElBQUksS0FBSyxHQUFHLFFBQVEsRUFBRSxDQUFDO29CQUN0QixJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDakIsT0FBTzs0QkFDTixNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQ3BCLEtBQUssRUFBRSxDQUFDO3lCQUNSLENBQUM7b0JBQ0gsQ0FBQztvQkFFRCxRQUFRLEdBQUcsS0FBSyxDQUFDO29CQUNqQixNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdkIsQ0FBQztZQUNGLENBQUM7WUFFRCxPQUFPO2dCQUNOLE1BQU07Z0JBQ04sS0FBSyxFQUFFLFFBQVE7YUFDZixDQUFDO1FBQ0gsQ0FBQztRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzNDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDekMsT0FBTztvQkFDTixNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ3BCLEtBQUssRUFBRSxDQUFDO2lCQUNSLENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVqRixJQUFJLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlCLE9BQU8saUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELGtCQUFrQixDQUFDLE1BQStCO1FBQ2pELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixJQUFJLE1BQU0sSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxtQkFBbUI7UUFDbEIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQ3JELENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxNQUErQjtRQUNsRCxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEUsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzNCLDJDQUEyQztZQUUzQywrSEFBK0g7WUFDL0gsMkNBQTJDO1lBQzNDLDZCQUE2QjtZQUM3QiwrREFBK0Q7WUFDL0Qsc0ZBQXNGO1lBQ3RGLFdBQVc7WUFDWCxJQUFJO1lBRUosdUZBQXVGO1lBQ3ZGLG9DQUFvQztZQUNwQyxrQkFBa0I7WUFDbEIsb0ZBQW9GO1lBQ3BGLE1BQU07WUFDTix5RUFBeUU7WUFDekUsZ0dBQWdHO1lBQ2hHLFFBQVE7WUFDUiwyREFBMkQ7WUFDM0QsdUJBQXVCO1lBQ3ZCLDZGQUE2RjtZQUM3RixNQUFNO1lBQ04sS0FBSztZQUVMLHNMQUFzTDtZQUV0TCxVQUFVO1lBQ1YsSUFBSTtZQUVKLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLHFCQUFxQixDQUFDLE1BQU0sQ0FBQztnQkFDdEQsYUFBYSxHQUFHLElBQUksQ0FBQztZQUN0QixDQUFDO2lCQUFNLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ25CLElBQUkscUJBQXFCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQzdGLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUM7b0JBQ3RELGFBQWEsR0FBRyxJQUFJLENBQUM7Z0JBQ3RCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDcEQsYUFBYSxHQUFHLElBQUksQ0FBQztRQUN0QixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQy9DLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFeEQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRTFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsVUFBc0I7UUFDekMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFVBQVUsQ0FBQztRQUVwQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV4RCxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUUxQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVNLHVCQUF1QjtRQUM3QixJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTywwQkFBMEIsQ0FBQyxXQUFvQixFQUFFLGFBQThCO1FBQ3RGLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDdkQsMEJBQTBCO1lBQzFCLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM5RCxJQUFJLE1BQU0sQ0FBQyxRQUFRLG1DQUEyQixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ2pHLGdDQUFnQztZQUNoQyxPQUFPLElBQUksc0JBQXNCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUN2SixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQzdCLENBQUM7SUFFTSw4QkFBOEIsQ0FBQyxhQUE2QjtRQUNsRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFOUUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRU0saUJBQWlCLENBQUMsVUFBa0I7UUFDMUMsTUFBTSxjQUFjLEdBQWlCLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsQ0FBQyxDQUFDO1FBRWxJLElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxVQUFzQjtRQUM5QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUV6QixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUM1QixJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDeEMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxVQUFzQixFQUFFLGlCQUEwQjtRQUN0RixNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDO1FBQ3RDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztRQUN0RCxJQUFJLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztZQUNwQyxPQUFPLElBQUkscUJBQXFCLENBQUMsWUFBWSxFQUEyQixVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN4RyxDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQywrRkFBK0Y7WUFDL0YsT0FBTyxJQUFJLHNCQUFzQixDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxPQUFPLElBQUksc0JBQXNCLENBQUMsWUFBWSxFQUE0QixVQUFVLEVBQUUsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDOUcsQ0FBQztJQUVELHFCQUFxQjtJQUNiLCtCQUErQixDQUFDLGFBQTZCO1FBQ3BFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxxQkFBcUIsR0FBRyxhQUFzQyxDQUFDO1FBQ3JFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztRQUM3QyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxLQUFLLE1BQU0sSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDekcsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVsRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDMUIsb0ZBQW9GO1lBQ3BGLElBQUksYUFBYSxDQUFDLE9BQU8sSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3BELFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ2YsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBdUMsRUFBRSxFQUFFO3dCQUM3RSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDOzRCQUNyQyxPQUFPO3dCQUNSLENBQUM7d0JBRUQsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7b0JBQ2hDLENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNULENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLElBQUkscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDOUcscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ2pELHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztRQUVyRSxNQUFNLE1BQU0sR0FBRyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sSUFBSSxxQkFBcUIsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLHVCQUF1QixDQUFDO1lBQ2pILENBQUMscUJBQXFCLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztZQUM1RCxDQUFDLHFCQUFxQixDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsa0JBQWtCLENBQUM7WUFDOUQsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUV4QixJQUFJLE1BQU0sSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ2pFLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELGdIQUFnSDtRQUNoSCxJQUFJLENBQUMsTUFBTSxJQUFJLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxHQUFHLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDekUsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU8sS0FBSyxDQUFDLHFCQUFxQixDQUFDLGFBQThCO1FBQ2pFLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDO2dCQUNKLE9BQU8sTUFBTyxTQUFpQixDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRTtvQkFDdkUsTUFBTSxHQUFHLEdBQXFCLEVBQUUsQ0FBQztvQkFDakMsS0FBSyxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDckIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHOzRCQUNiLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDOzRCQUNmLFdBQVcsRUFBRSxFQUFFOzRCQUNmLFdBQVcsRUFBRSxFQUFFOzRCQUNmLGdCQUFnQixFQUFFLEVBQUU7eUJBQ3BCLENBQUM7b0JBQ0gsQ0FBQztvQkFFRCxPQUFPLEdBQUcsQ0FBQztvQkFFWCxnRUFBZ0U7b0JBRWhFLCtCQUErQjtvQkFDL0IsZ0RBQWdEO29CQUNoRCxJQUFJO29CQUVKLGVBQWU7Z0JBQ2hCLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUFDLE1BQU0sQ0FBQztnQkFDUixtRUFBbUU7Z0JBQ25FLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxLQUFLLENBQUM7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLGFBQWEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMzSCxNQUFNLEdBQUcsR0FBcUIsRUFBRSxDQUFDO1lBQ2pDLE1BQU0scUJBQXFCLEdBQUcsYUFBc0MsQ0FBQztZQUNyRSxHQUFHLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHO2dCQUM5QyxPQUFPLEVBQUUscUJBQXFCLENBQUMsWUFBWSxDQUFDLEdBQUc7Z0JBQy9DLFdBQVcsRUFBRSxFQUFFO2dCQUNmLFdBQVcsRUFBRSxFQUFFO2dCQUNmLGdCQUFnQixFQUFFLEVBQUU7YUFDcEIsQ0FBQztZQUVGLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRTdELElBQUkscUJBQXFCLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxHQUFHLENBQUM7WUFDWixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBR0Q7QUFFRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsZ0NBQWdDO0lBQ2pGLFlBQVksb0JBQTJDLEVBQUUsbUJBQXlDLEVBQUUsY0FBK0IsRUFBRSxjQUErQjtRQUNuSyw4REFBOEQ7UUFDOUQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFNUIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFFdEUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsZ0ZBQWdGLFFBQVEsS0FBK0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hLLE1BQU0sV0FBVyxHQUFrQixDQUFDLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztZQUNyRixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEosSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQzlCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1lBQ3pCLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEO0FBRUQsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBTzFDLElBQUksY0FBYyxLQUF3QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBRXhFLFlBQ2tCLHNCQUEyQixFQUMzQixXQUF5QjtRQUUxQyxLQUFLLEVBQUUsQ0FBQztRQUhTLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBSztRQUMzQixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQVJ4QixpQkFBWSxHQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUM1RSxnQkFBVyxHQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztRQVczRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUU1QixJQUFJLENBQUMsNEJBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDMUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFCLENBQUM7UUFDRixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRVQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuSyxDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVU7UUFDZixNQUFNLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRU8sS0FBSyxDQUFDLE1BQU07UUFDbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztRQUN0QyxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQzdFLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDOUMsSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7Z0JBQ2hDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxlQUFlLEdBQUcsVUFBVSxDQUFDLGlDQUFpQyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakcsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzdCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUMxRSxDQUFDO0NBRUQ7QUFFTSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7SUFXM0QsWUFDc0Isa0JBQXVDLEVBQzlDLFdBQXlCLEVBQ2pCLG1CQUF5QyxFQUM5QyxjQUErQixFQUMvQixjQUErQixFQUN6QixvQkFBbUQ7UUFFMUUsS0FBSyxFQUFFLENBQUM7UUFGdUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQWQxRCwrQkFBMEIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQ2xELDhCQUF5QixHQUFnQixJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDO1FBZ0I5RixNQUFNLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQXFCLFVBQVUsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDckMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLE1BQU0sSUFBSSxZQUFZLENBQUM7UUFDbEQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLDRCQUE0QixDQUFDLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU1SCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFO1lBQzNELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxNQUFNLElBQUksTUFBTSxLQUFLLFlBQVksRUFBRSxDQUFDO1lBQ3ZDLHNCQUFzQjtZQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2hFLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDL0MsTUFBTSxjQUFjLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFxQixVQUFVLENBQUMsQ0FBQztnQkFDckYsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQztnQkFDckMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLE1BQU0sQ0FBQztnQkFFbEMsSUFBSSxNQUFNLEtBQUssWUFBWSxFQUFFLENBQUM7b0JBQzdCLElBQUksQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDekMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQy9DLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFFOUUsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7WUFDdkMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUN4RCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBRXBHLElBQUksbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUM3QyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUN4RSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUM3QyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDL0UsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELDhCQUE4QjtRQUM3QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFxQixVQUFVLENBQUMsQ0FBQztRQUMxRixNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDO1FBRXJDLElBQUksTUFBTSxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN2RCxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBRWxILElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7b0JBQ2hGLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUM1RSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFDLENBQUM7SUFFTSx3QkFBd0I7UUFDOUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDO0lBQzNDLENBQUM7SUFFTSxxQkFBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztJQUN0QyxDQUFDO0lBRU0scUJBQXFCO1FBQzNCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztJQUN2QyxDQUFDO0lBRU0sOEJBQThCLENBQUMsYUFBNkI7UUFDbEUsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDL0MsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLDhCQUE4QixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzdELENBQUM7Q0FDRCxDQUFBO0FBakhZLDRCQUE0QjtJQVl0QyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtHQWpCWCw0QkFBNEIsQ0FpSHhDOztBQUVELGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLDRCQUE0QixvQ0FBNEIsQ0FBQztBQUVuRyxnQkFBZ0I7QUFDaEIsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNsRyxNQUFNLHFCQUFxQixHQUF1QjtJQUNqRCxJQUFJLEVBQUUsVUFBVTtJQUNoQixPQUFPLEVBQUUsRUFBRTtJQUNYLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLFVBQVUsQ0FBQztJQUMvRCxZQUFZLEVBQUU7UUFDYixpQkFBaUIsRUFBRTtZQUNsQixNQUFNLEVBQUUsUUFBUTtZQUNoQixTQUFTLEVBQUUsWUFBWTtZQUN2QixhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwwQ0FBMEMsQ0FBQztTQUNqRztLQUNEO0NBQ0QsQ0FBQztBQUVGLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLENBQUMifQ==