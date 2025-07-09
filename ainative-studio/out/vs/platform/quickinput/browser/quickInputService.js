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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { IContextKeyService, RawContextKey } from '../../contextkey/common/contextkey.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
import { IOpenerService } from '../../opener/common/opener.js';
import { QuickAccessController } from './quickAccess.js';
import { defaultButtonStyles, defaultCountBadgeStyles, defaultInputBoxStyles, defaultKeybindingLabelStyles, defaultProgressBarStyles, defaultToggleStyles, getListStyles } from '../../theme/browser/defaultStyles.js';
import { activeContrastBorder, asCssVariable, pickerGroupBorder, pickerGroupForeground, quickInputBackground, quickInputForeground, quickInputListFocusBackground, quickInputListFocusForeground, quickInputListFocusIconForeground, quickInputTitleBackground, widgetBorder, widgetShadow } from '../../theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../theme/common/themeService.js';
import { QuickInputHoverDelegate } from './quickInput.js';
import { QuickInputController } from './quickInputController.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { getWindow } from '../../../base/browser/dom.js';
let QuickInputService = class QuickInputService extends Themable {
    get backButton() { return this.controller.backButton; }
    get controller() {
        if (!this._controller) {
            this._controller = this._register(this.createController());
        }
        return this._controller;
    }
    get hasController() { return !!this._controller; }
    get currentQuickInput() { return this.controller.currentQuickInput; }
    get quickAccess() {
        if (!this._quickAccess) {
            this._quickAccess = this._register(this.instantiationService.createInstance(QuickAccessController));
        }
        return this._quickAccess;
    }
    constructor(instantiationService, contextKeyService, themeService, layoutService, configurationService) {
        super(themeService);
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this._onShow = this._register(new Emitter());
        this.onShow = this._onShow.event;
        this._onHide = this._register(new Emitter());
        this.onHide = this._onHide.event;
        this.contexts = new Map();
    }
    createController(host = this.layoutService, options) {
        const defaultOptions = {
            idPrefix: 'quickInput_',
            container: host.activeContainer,
            ignoreFocusOut: () => false,
            backKeybindingLabel: () => undefined,
            setContextKey: (id) => this.setContextKey(id),
            linkOpenerDelegate: (content) => {
                // HACK: https://github.com/microsoft/vscode/issues/173691
                this.instantiationService.invokeFunction(accessor => {
                    const openerService = accessor.get(IOpenerService);
                    openerService.open(content, { allowCommands: true, fromUserGesture: true });
                });
            },
            returnFocus: () => host.focus(),
            styles: this.computeStyles(),
            hoverDelegate: this._register(this.instantiationService.createInstance(QuickInputHoverDelegate))
        };
        const controller = this._register(this.instantiationService.createInstance(QuickInputController, {
            ...defaultOptions,
            ...options
        }));
        controller.layout(host.activeContainerDimension, host.activeContainerOffset.quickPickTop);
        // Layout changes
        this._register(host.onDidLayoutActiveContainer(dimension => {
            if (getWindow(host.activeContainer) === getWindow(controller.container)) {
                controller.layout(dimension, host.activeContainerOffset.quickPickTop);
            }
        }));
        this._register(host.onDidChangeActiveContainer(() => {
            if (controller.isVisible()) {
                return;
            }
            controller.layout(host.activeContainerDimension, host.activeContainerOffset.quickPickTop);
        }));
        // Context keys
        this._register(controller.onShow(() => {
            this.resetContextKeys();
            this._onShow.fire();
        }));
        this._register(controller.onHide(() => {
            this.resetContextKeys();
            this._onHide.fire();
        }));
        return controller;
    }
    setContextKey(id) {
        let key;
        if (id) {
            key = this.contexts.get(id);
            if (!key) {
                key = new RawContextKey(id, false)
                    .bindTo(this.contextKeyService);
                this.contexts.set(id, key);
            }
        }
        if (key && key.get()) {
            return; // already active context
        }
        this.resetContextKeys();
        key?.set(true);
    }
    resetContextKeys() {
        this.contexts.forEach(context => {
            if (context.get()) {
                context.reset();
            }
        });
    }
    pick(picks, options, token = CancellationToken.None) {
        return this.controller.pick(picks, options, token);
    }
    input(options = {}, token = CancellationToken.None) {
        return this.controller.input(options, token);
    }
    createQuickPick(options = { useSeparators: false }) {
        return this.controller.createQuickPick(options);
    }
    createInputBox() {
        return this.controller.createInputBox();
    }
    createQuickWidget() {
        return this.controller.createQuickWidget();
    }
    focus() {
        this.controller.focus();
    }
    toggle() {
        this.controller.toggle();
    }
    navigate(next, quickNavigate) {
        this.controller.navigate(next, quickNavigate);
    }
    accept(keyMods) {
        return this.controller.accept(keyMods);
    }
    back() {
        return this.controller.back();
    }
    cancel() {
        return this.controller.cancel();
    }
    setAlignment(alignment) {
        this.controller.setAlignment(alignment);
    }
    toggleHover() {
        if (this.hasController) {
            this.controller.toggleHover();
        }
    }
    updateStyles() {
        if (this.hasController) {
            this.controller.applyStyles(this.computeStyles());
        }
    }
    computeStyles() {
        return {
            widget: {
                quickInputBackground: asCssVariable(quickInputBackground),
                quickInputForeground: asCssVariable(quickInputForeground),
                quickInputTitleBackground: asCssVariable(quickInputTitleBackground),
                widgetBorder: asCssVariable(widgetBorder),
                widgetShadow: asCssVariable(widgetShadow),
            },
            inputBox: defaultInputBoxStyles,
            toggle: defaultToggleStyles,
            countBadge: defaultCountBadgeStyles,
            button: defaultButtonStyles,
            progressBar: defaultProgressBarStyles,
            keybindingLabel: defaultKeybindingLabelStyles,
            list: getListStyles({
                listBackground: quickInputBackground,
                listFocusBackground: quickInputListFocusBackground,
                listFocusForeground: quickInputListFocusForeground,
                // Look like focused when inactive.
                listInactiveFocusForeground: quickInputListFocusForeground,
                listInactiveSelectionIconForeground: quickInputListFocusIconForeground,
                listInactiveFocusBackground: quickInputListFocusBackground,
                listFocusOutline: activeContrastBorder,
                listInactiveFocusOutline: activeContrastBorder,
            }),
            pickerGroup: {
                pickerGroupBorder: asCssVariable(pickerGroupBorder),
                pickerGroupForeground: asCssVariable(pickerGroupForeground),
            }
        };
    }
};
QuickInputService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IThemeService),
    __param(3, ILayoutService),
    __param(4, IConfigurationService)
], QuickInputService);
export { QuickInputService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL3F1aWNrSW5wdXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUd6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLEVBQUUscUJBQXFCLEVBQUUsNEJBQTRCLEVBQUUsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdk4sT0FBTyxFQUFFLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSxpQ0FBaUMsRUFBRSx5QkFBeUIsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeFUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RSxPQUFPLEVBQXlDLHVCQUF1QixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDakcsT0FBTyxFQUFFLG9CQUFvQixFQUE2QixNQUFNLDJCQUEyQixDQUFDO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVsRCxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFFBQVE7SUFJOUMsSUFBSSxVQUFVLEtBQXdCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBUzFFLElBQVksVUFBVTtRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVELElBQVksYUFBYSxLQUFLLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQzFELElBQUksaUJBQWlCLEtBQUssT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztJQUdyRSxJQUFJLFdBQVc7UUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUNyRyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7SUFJRCxZQUN3QixvQkFBNEQsRUFDL0QsaUJBQXdELEVBQzdELFlBQTJCLEVBQzFCLGFBQWdELEVBQ3pDLG9CQUE4RDtRQUVyRixLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7UUFOb0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM1QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBRXpDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN0Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBbENyRSxZQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDdEQsV0FBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBRXBCLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUN0RCxXQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUF1QnBCLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQztJQVVwRSxDQUFDO0lBRVMsZ0JBQWdCLENBQUMsT0FBa0MsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFxQztRQUNySCxNQUFNLGNBQWMsR0FBdUI7WUFDMUMsUUFBUSxFQUFFLGFBQWE7WUFDdkIsU0FBUyxFQUFFLElBQUksQ0FBQyxlQUFlO1lBQy9CLGNBQWMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO1lBQzNCLG1CQUFtQixFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7WUFDcEMsYUFBYSxFQUFFLENBQUMsRUFBVyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztZQUN0RCxrQkFBa0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUMvQiwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ25ELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ25ELGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDN0UsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDO1lBQ0QsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDL0IsTUFBTSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDNUIsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1NBQ2hHLENBQUM7UUFFRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pFLG9CQUFvQixFQUNwQjtZQUNDLEdBQUcsY0FBYztZQUNqQixHQUFHLE9BQU87U0FDVixDQUNELENBQUMsQ0FBQztRQUVILFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUxRixpQkFBaUI7UUFDakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDMUQsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDekUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxFQUFFO1lBQ25ELElBQUksVUFBVSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7Z0JBQzVCLE9BQU87WUFDUixDQUFDO1lBRUQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixlQUFlO1FBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNyQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFFTyxhQUFhLENBQUMsRUFBVztRQUNoQyxJQUFJLEdBQXFDLENBQUM7UUFDMUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ1YsR0FBRyxHQUFHLElBQUksYUFBYSxDQUFVLEVBQUUsRUFBRSxLQUFLLENBQUM7cUJBQ3pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDdEIsT0FBTyxDQUFDLHlCQUF5QjtRQUNsQyxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFFeEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQy9CLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBSSxDQUFzRCxLQUF5RCxFQUFFLE9BQVcsRUFBRSxRQUEyQixpQkFBaUIsQ0FBQyxJQUFJO1FBQ2xMLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQXlCLEVBQUUsRUFBRSxRQUEyQixpQkFBaUIsQ0FBQyxJQUFJO1FBQ25GLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFJRCxlQUFlLENBQTJCLFVBQXNDLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRTtRQUN2RyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDNUMsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsUUFBUSxDQUFDLElBQWEsRUFBRSxhQUEyQztRQUNsRSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUFrQjtRQUN4QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxJQUFJO1FBQ0gsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxZQUFZLENBQUMsU0FBMkQ7UUFDdkUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVELFdBQVc7UUFDVixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRVEsWUFBWTtRQUNwQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGFBQWE7UUFDcEIsT0FBTztZQUNOLE1BQU0sRUFBRTtnQkFDUCxvQkFBb0IsRUFBRSxhQUFhLENBQUMsb0JBQW9CLENBQUM7Z0JBQ3pELG9CQUFvQixFQUFFLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQztnQkFDekQseUJBQXlCLEVBQUUsYUFBYSxDQUFDLHlCQUF5QixDQUFDO2dCQUNuRSxZQUFZLEVBQUUsYUFBYSxDQUFDLFlBQVksQ0FBQztnQkFDekMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxZQUFZLENBQUM7YUFDekM7WUFDRCxRQUFRLEVBQUUscUJBQXFCO1lBQy9CLE1BQU0sRUFBRSxtQkFBbUI7WUFDM0IsVUFBVSxFQUFFLHVCQUF1QjtZQUNuQyxNQUFNLEVBQUUsbUJBQW1CO1lBQzNCLFdBQVcsRUFBRSx3QkFBd0I7WUFDckMsZUFBZSxFQUFFLDRCQUE0QjtZQUM3QyxJQUFJLEVBQUUsYUFBYSxDQUFDO2dCQUNuQixjQUFjLEVBQUUsb0JBQW9CO2dCQUNwQyxtQkFBbUIsRUFBRSw2QkFBNkI7Z0JBQ2xELG1CQUFtQixFQUFFLDZCQUE2QjtnQkFDbEQsbUNBQW1DO2dCQUNuQywyQkFBMkIsRUFBRSw2QkFBNkI7Z0JBQzFELG1DQUFtQyxFQUFFLGlDQUFpQztnQkFDdEUsMkJBQTJCLEVBQUUsNkJBQTZCO2dCQUMxRCxnQkFBZ0IsRUFBRSxvQkFBb0I7Z0JBQ3RDLHdCQUF3QixFQUFFLG9CQUFvQjthQUM5QyxDQUFDO1lBQ0YsV0FBVyxFQUFFO2dCQUNaLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDbkQscUJBQXFCLEVBQUUsYUFBYSxDQUFDLHFCQUFxQixDQUFDO2FBQzNEO1NBQ0QsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBL05ZLGlCQUFpQjtJQW9DM0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHFCQUFxQixDQUFBO0dBeENYLGlCQUFpQixDQStON0IifQ==