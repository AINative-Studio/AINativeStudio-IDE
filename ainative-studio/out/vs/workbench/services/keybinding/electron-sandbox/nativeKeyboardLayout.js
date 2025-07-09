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
import { IKeyboardLayoutService } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
import { Emitter } from '../../../../base/common/event.js';
import { OS } from '../../../../base/common/platform.js';
import { CachedKeyboardMapper } from '../../../../platform/keyboardLayout/common/keyboardMapper.js';
import { WindowsKeyboardMapper } from '../common/windowsKeyboardMapper.js';
import { FallbackKeyboardMapper } from '../common/fallbackKeyboardMapper.js';
import { MacLinuxKeyboardMapper } from '../common/macLinuxKeyboardMapper.js';
import { readKeyboardConfig } from '../../../../platform/keyboardLayout/common/keyboardConfig.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INativeKeyboardLayoutService } from './nativeKeyboardLayoutService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
let KeyboardLayoutService = class KeyboardLayoutService extends Disposable {
    constructor(_nativeKeyboardLayoutService, _configurationService) {
        super();
        this._nativeKeyboardLayoutService = _nativeKeyboardLayoutService;
        this._configurationService = _configurationService;
        this._onDidChangeKeyboardLayout = this._register(new Emitter());
        this.onDidChangeKeyboardLayout = this._onDidChangeKeyboardLayout.event;
        this._keyboardMapper = null;
        this._register(this._nativeKeyboardLayoutService.onDidChangeKeyboardLayout(async () => {
            this._keyboardMapper = null;
            this._onDidChangeKeyboardLayout.fire();
        }));
        this._register(_configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('keyboard')) {
                this._keyboardMapper = null;
                this._onDidChangeKeyboardLayout.fire();
            }
        }));
    }
    getRawKeyboardMapping() {
        return this._nativeKeyboardLayoutService.getRawKeyboardMapping();
    }
    getCurrentKeyboardLayout() {
        return this._nativeKeyboardLayoutService.getCurrentKeyboardLayout();
    }
    getAllKeyboardLayouts() {
        return [];
    }
    getKeyboardMapper() {
        const config = readKeyboardConfig(this._configurationService);
        if (config.dispatch === 1 /* DispatchConfig.KeyCode */) {
            // Forcefully set to use keyCode
            return new FallbackKeyboardMapper(config.mapAltGrToCtrlAlt, OS);
        }
        if (!this._keyboardMapper) {
            this._keyboardMapper = new CachedKeyboardMapper(createKeyboardMapper(this.getCurrentKeyboardLayout(), this.getRawKeyboardMapping(), config.mapAltGrToCtrlAlt));
        }
        return this._keyboardMapper;
    }
    validateCurrentKeyboardMapping(keyboardEvent) {
        return;
    }
};
KeyboardLayoutService = __decorate([
    __param(0, INativeKeyboardLayoutService),
    __param(1, IConfigurationService)
], KeyboardLayoutService);
export { KeyboardLayoutService };
function createKeyboardMapper(layoutInfo, rawMapping, mapAltGrToCtrlAlt) {
    const _isUSStandard = isUSStandard(layoutInfo);
    if (OS === 1 /* OperatingSystem.Windows */) {
        return new WindowsKeyboardMapper(_isUSStandard, rawMapping, mapAltGrToCtrlAlt);
    }
    if (!rawMapping || Object.keys(rawMapping).length === 0) {
        // Looks like reading the mappings failed (most likely Mac + Japanese/Chinese keyboard layouts)
        return new FallbackKeyboardMapper(mapAltGrToCtrlAlt, OS);
    }
    if (OS === 2 /* OperatingSystem.Macintosh */) {
        const kbInfo = layoutInfo;
        if (kbInfo.id === 'com.apple.keylayout.DVORAK-QWERTYCMD') {
            // Use keyCode based dispatching for DVORAK - QWERTY ⌘
            return new FallbackKeyboardMapper(mapAltGrToCtrlAlt, OS);
        }
    }
    return new MacLinuxKeyboardMapper(_isUSStandard, rawMapping, mapAltGrToCtrlAlt, OS);
}
function isUSStandard(_kbInfo) {
    if (!_kbInfo) {
        return false;
    }
    if (OS === 3 /* OperatingSystem.Linux */) {
        const kbInfo = _kbInfo;
        const layouts = kbInfo.layout.split(/,/g);
        return (layouts[kbInfo.group] === 'us');
    }
    if (OS === 2 /* OperatingSystem.Macintosh */) {
        const kbInfo = _kbInfo;
        return (kbInfo.id === 'com.apple.keylayout.US');
    }
    if (OS === 1 /* OperatingSystem.Windows */) {
        const kbInfo = _kbInfo;
        return (kbInfo.name === '00000409');
    }
    return false;
}
registerSingleton(IKeyboardLayoutService, KeyboardLayoutService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlS2V5Ym9hcmRMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvZWxlY3Ryb24tc2FuZGJveC9uYXRpdmVLZXlib2FyZExheW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUF1QixzQkFBc0IsRUFBcUosTUFBTSw4REFBOEQsQ0FBQztBQUM5USxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sOERBQThELENBQUM7QUFDckgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0UsT0FBTyxFQUFrQixrQkFBa0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRWxILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUV4RyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFTcEQsWUFDK0IsNEJBQTJFLEVBQ2xGLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztR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