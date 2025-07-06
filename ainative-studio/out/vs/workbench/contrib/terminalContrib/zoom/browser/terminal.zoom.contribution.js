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
var TerminalMouseWheelZoomContribution_1;
import { Event } from '../../../../../base/common/event.js';
import { MouseWheelClassifier } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../../base/common/platform.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { localize2 } from '../../../../../nls.js';
import { isNumber } from '../../../../../base/common/types.js';
import { defaultTerminalFontSize } from '../../../terminal/common/terminalConfiguration.js';
let TerminalMouseWheelZoomContribution = class TerminalMouseWheelZoomContribution extends Disposable {
    static { TerminalMouseWheelZoomContribution_1 = this; }
    static { this.ID = 'terminal.mouseWheelZoom'; }
    static get(instance) {
        return instance.getContribution(TerminalMouseWheelZoomContribution_1.ID);
    }
    constructor(_ctx, _configurationService) {
        super();
        this._configurationService = _configurationService;
        this._listener = this._register(new MutableDisposable());
    }
    xtermOpen(xterm) {
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration("terminal.integrated.mouseWheelZoom" /* TerminalZoomSettingId.MouseWheelZoom */)) {
                if (!!this._configurationService.getValue("terminal.integrated.mouseWheelZoom" /* TerminalZoomSettingId.MouseWheelZoom */)) {
                    this._setupMouseWheelZoomListener(xterm.raw);
                }
                else {
                    this._listener.clear();
                }
            }
        }));
    }
    _getConfigFontSize() {
        return this._configurationService.getValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */);
    }
    _setupMouseWheelZoomListener(raw) {
        // This is essentially a copy of what we do in the editor, just we modify font size directly
        // as there is no separate zoom level concept in the terminal
        const classifier = MouseWheelClassifier.INSTANCE;
        let prevMouseWheelTime = 0;
        let gestureStartFontSize = this._getConfigFontSize();
        let gestureHasZoomModifiers = false;
        let gestureAccumulatedDelta = 0;
        raw.attachCustomWheelEventHandler((e) => {
            const browserEvent = e;
            if (classifier.isPhysicalMouseWheel()) {
                if (this._hasMouseWheelZoomModifiers(browserEvent)) {
                    const delta = browserEvent.deltaY > 0 ? -1 : 1;
                    this._configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, this._getConfigFontSize() + delta);
                    // EditorZoom.setZoomLevel(zoomLevel + delta);
                    browserEvent.preventDefault();
                    browserEvent.stopPropagation();
                    return false;
                }
            }
            else {
                // we consider mousewheel events that occur within 50ms of each other to be part of the same gesture
                // we don't want to consider mouse wheel events where ctrl/cmd is pressed during the inertia phase
                // we also want to accumulate deltaY values from the same gesture and use that to set the zoom level
                if (Date.now() - prevMouseWheelTime > 50) {
                    // reset if more than 50ms have passed
                    gestureStartFontSize = this._getConfigFontSize();
                    gestureHasZoomModifiers = this._hasMouseWheelZoomModifiers(browserEvent);
                    gestureAccumulatedDelta = 0;
                }
                prevMouseWheelTime = Date.now();
                gestureAccumulatedDelta += browserEvent.deltaY;
                if (gestureHasZoomModifiers) {
                    const deltaAbs = Math.ceil(Math.abs(gestureAccumulatedDelta / 5));
                    const deltaDirection = gestureAccumulatedDelta > 0 ? -1 : 1;
                    const delta = deltaAbs * deltaDirection;
                    this._configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, gestureStartFontSize + delta);
                    gestureAccumulatedDelta += browserEvent.deltaY;
                    browserEvent.preventDefault();
                    browserEvent.stopPropagation();
                    return false;
                }
            }
            return true;
        });
        this._listener.value = toDisposable(() => raw.attachCustomWheelEventHandler(() => true));
    }
    _hasMouseWheelZoomModifiers(browserEvent) {
        return (isMacintosh
            // on macOS we support cmd + two fingers scroll (`metaKey` set)
            // and also the two fingers pinch gesture (`ctrKey` set)
            ? ((browserEvent.metaKey || browserEvent.ctrlKey) && !browserEvent.shiftKey && !browserEvent.altKey)
            : (browserEvent.ctrlKey && !browserEvent.metaKey && !browserEvent.shiftKey && !browserEvent.altKey));
    }
};
TerminalMouseWheelZoomContribution = TerminalMouseWheelZoomContribution_1 = __decorate([
    __param(1, IConfigurationService)
], TerminalMouseWheelZoomContribution);
registerTerminalContribution(TerminalMouseWheelZoomContribution.ID, TerminalMouseWheelZoomContribution, true);
registerTerminalAction({
    id: "workbench.action.terminal.fontZoomIn" /* TerminalZoomCommandId.FontZoomIn */,
    title: localize2('fontZoomIn', 'Increase Font Size'),
    run: async (c, accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        const value = configurationService.getValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */);
        if (isNumber(value)) {
            await configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, value + 1);
        }
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.fontZoomOut" /* TerminalZoomCommandId.FontZoomOut */,
    title: localize2('fontZoomOut', 'Decrease Font Size'),
    run: async (c, accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        const value = configurationService.getValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */);
        if (isNumber(value)) {
            await configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, value - 1);
        }
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.fontZoomReset" /* TerminalZoomCommandId.FontZoomReset */,
    title: localize2('fontZoomReset', 'Reset Font Size'),
    run: async (c, accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        await configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, defaultTerminalFontSize);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuem9vbS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvem9vbS9icm93c2VyL3Rlcm1pbmFsLnpvb20uY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDckcsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHckUsT0FBTyxFQUFFLDRCQUE0QixFQUEwRixNQUFNLGlEQUFpRCxDQUFDO0FBQ3ZMLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFHNUYsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBbUMsU0FBUSxVQUFVOzthQUMxQyxPQUFFLEdBQUcseUJBQXlCLEFBQTVCLENBQTZCO0lBUS9DLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBdUQ7UUFDakUsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUFxQyxvQ0FBa0MsQ0FBQyxFQUFFLENB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