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
var TerminalCommandGuideContribution_1;
import { addDisposableListener } from '../../../../../base/browser/dom.js';
import { combinedDisposable, Disposable, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { listInactiveSelectionBackground } from '../../../../../platform/theme/common/colorRegistry.js';
import { registerColor, transparent } from '../../../../../platform/theme/common/colorUtils.js';
import { PANEL_BORDER } from '../../../../common/theme.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { terminalCommandGuideConfigSection } from '../common/terminalCommandGuideConfiguration.js';
// #region Terminal Contributions
let TerminalCommandGuideContribution = class TerminalCommandGuideContribution extends Disposable {
    static { TerminalCommandGuideContribution_1 = this; }
    static { this.ID = 'terminal.commandGuide'; }
    static get(instance) {
        return instance.getContribution(TerminalCommandGuideContribution_1.ID);
    }
    constructor(_ctx, _configurationService) {
        super();
        this._ctx = _ctx;
        this._configurationService = _configurationService;
        this._activeCommandGuide = this._register(new MutableDisposable());
    }
    xtermOpen(xterm) {
        this._xterm = xterm;
        this._refreshActivatedState();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.shellIntegration.showCommandGuide" /* TerminalCommandGuideSettingId.ShowCommandGuide */)) {
                this._refreshActivatedState();
            }
        }));
    }
    _refreshActivatedState() {
        const xterm = this._xterm;
        if (!xterm) {
            return;
        }
        const showCommandGuide = this._configurationService.getValue(terminalCommandGuideConfigSection).showCommandGuide;
        if (!!this._activeCommandGuide.value === showCommandGuide) {
            return;
        }
        if (!showCommandGuide) {
            this._activeCommandGuide.clear();
        }
        else {
            const screenElement = xterm.raw.element.querySelector('.xterm-screen');
            const viewportElement = xterm.raw.element.querySelector('.xterm-viewport');
            this._activeCommandGuide.value = combinedDisposable(addDisposableListener(screenElement, 'mousemove', (e) => this._tryShowHighlight(screenElement, xterm, e)), addDisposableListener(viewportElement, 'mousemove', (e) => this._tryShowHighlight(screenElement, xterm, e)), addDisposableListener(xterm.raw.element, 'mouseleave', () => xterm.markTracker.showCommandGuide(undefined)), xterm.raw.onData(() => xterm.markTracker.showCommandGuide(undefined)), toDisposable(() => xterm.markTracker.showCommandGuide(undefined)));
        }
    }
    _tryShowHighlight(element, xterm, e) {
        const rect = element.getBoundingClientRect();
        if (!rect) {
            return;
        }
        const mouseCursorY = Math.floor((e.clientY - rect.top) / (rect.height / xterm.raw.rows));
        const command = this._ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.getCommandForLine(xterm.raw.buffer.active.viewportY + mouseCursorY);
        if (command && 'getOutput' in command) {
            xterm.markTracker.showCommandGuide(command);
        }
        else {
            xterm.markTracker.showCommandGuide(undefined);
        }
    }
};
TerminalCommandGuideContribution = TerminalCommandGuideContribution_1 = __decorate([
    __param(1, IConfigurationService)
], TerminalCommandGuideContribution);
registerTerminalContribution(TerminalCommandGuideContribution.ID, TerminalCommandGuideContribution, false);
export const TERMINAL_COMMAND_GUIDE_COLOR = registerColor('terminalCommandGuide.foreground', {
    dark: transparent(listInactiveSelectionBackground, 1),
    light: transparent(listInactiveSelectionBackground, 1),
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER
}, localize('terminalCommandGuide.foreground', 'The foreground color of the terminal command guide that appears to the left of a command and its output on hover.'));
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY29tbWFuZEd1aWRlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY29tbWFuZEd1aWRlL2Jyb3dzZXIvdGVybWluYWwuY29tbWFuZEd1aWRlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFM0QsT0FBTyxFQUFFLDRCQUE0QixFQUEwRixNQUFNLGlEQUFpRCxDQUFDO0FBQ3ZMLE9BQU8sRUFBRSxpQ0FBaUMsRUFBMEUsTUFBTSxnREFBZ0QsQ0FBQztBQUUzSyxpQ0FBaUM7QUFFakMsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVOzthQUN4QyxPQUFFLEdBQUcsdUJBQXVCLEFBQTFCLENBQTJCO0lBRTdDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBdUQ7UUFDakUsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUFtQyxr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