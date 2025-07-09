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
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { SimpleIconLabel } from '../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isTooltipWithCommands, ShowTooltipCommand, StatusbarEntryKinds } from '../../../services/statusbar/browser/statusbar.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { isThemeColor } from '../../../../editor/common/editorCommon.js';
import { addDisposableListener, EventType, hide, show, append, EventHelper, $ } from '../../../../base/browser/dom.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { renderIcon, renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { spinningLoading, syncing } from '../../../../platform/theme/common/iconRegistry.js';
import { isMarkdownString, markdownStringEqual } from '../../../../base/common/htmlContent.js';
import { Gesture, EventType as TouchEventType } from '../../../../base/browser/touch.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let StatusbarEntryItem = class StatusbarEntryItem extends Disposable {
    get name() {
        return assertIsDefined(this.entry).name;
    }
    get hasCommand() {
        return typeof this.entry?.command !== 'undefined';
    }
    constructor(container, entry, hoverDelegate, commandService, hoverService, notificationService, telemetryService, themeService) {
        super();
        this.container = container;
        this.hoverDelegate = hoverDelegate;
        this.commandService = commandService;
        this.hoverService = hoverService;
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.themeService = themeService;
        this.entry = undefined;
        this.foregroundListener = this._register(new MutableDisposable());
        this.backgroundListener = this._register(new MutableDisposable());
        this.commandMouseListener = this._register(new MutableDisposable());
        this.commandTouchListener = this._register(new MutableDisposable());
        this.commandKeyboardListener = this._register(new MutableDisposable());
        this.hover = undefined;
        // Label Container
        this.labelContainer = $('a.statusbar-item-label', {
            role: 'button',
            tabIndex: -1 // allows screen readers to read title, but still prevents tab focus.
        });
        this._register(Gesture.addTarget(this.labelContainer)); // enable touch
        // Label (with support for progress)
        this.label = this._register(new StatusBarCodiconLabel(this.labelContainer));
        this.container.appendChild(this.labelContainer);
        // Beak Container
        this.beakContainer = $('.status-bar-item-beak-container');
        this.container.appendChild(this.beakContainer);
        this.update(entry);
    }
    update(entry) {
        // Update: Progress
        this.label.showProgress = entry.showProgress ?? false;
        // Update: Text
        if (!this.entry || entry.text !== this.entry.text) {
            this.label.text = entry.text;
            if (entry.text) {
                show(this.labelContainer);
            }
            else {
                hide(this.labelContainer);
            }
        }
        // Update: ARIA label
        //
        // Set the aria label on both elements so screen readers would read
        // the correct thing without duplication #96210
        if (!this.entry || entry.ariaLabel !== this.entry.ariaLabel) {
            this.container.setAttribute('aria-label', entry.ariaLabel);
            this.labelContainer.setAttribute('aria-label', entry.ariaLabel);
        }
        if (!this.entry || entry.role !== this.entry.role) {
            this.labelContainer.setAttribute('role', entry.role || 'button');
        }
        // Update: Hover
        if (!this.entry || !this.isEqualTooltip(this.entry, entry)) {
            let hoverOptions;
            let hoverTooltip;
            if (isTooltipWithCommands(entry.tooltip)) {
                hoverTooltip = entry.tooltip.content;
                hoverOptions = {
                    actions: entry.tooltip.commands.map(command => ({
                        commandId: command.id,
                        label: command.title,
                        run: () => this.executeCommand(command)
                    }))
                };
            }
            else {
                hoverTooltip = entry.tooltip;
            }
            const hoverContents = isMarkdownString(hoverTooltip) ? { markdown: hoverTooltip, markdownNotSupportedFallback: undefined } : hoverTooltip;
            if (this.hover) {
                this.hover.update(hoverContents, hoverOptions);
            }
            else {
                this.hover = this._register(this.hoverService.setupManagedHover(this.hoverDelegate, this.container, hoverContents, hoverOptions));
            }
        }
        // Update: Command
        if (!this.entry || entry.command !== this.entry.command) {
            this.commandMouseListener.clear();
            this.commandTouchListener.clear();
            this.commandKeyboardListener.clear();
            const command = entry.command;
            if (command && (command !== ShowTooltipCommand || this.hover) /* "Show Hover" is only valid when we have a hover */) {
                this.commandMouseListener.value = addDisposableListener(this.labelContainer, EventType.CLICK, () => this.executeCommand(command));
                this.commandTouchListener.value = addDisposableListener(this.labelContainer, TouchEventType.Tap, () => this.executeCommand(command));
                this.commandKeyboardListener.value = addDisposableListener(this.labelContainer, EventType.KEY_DOWN, e => {
                    const event = new StandardKeyboardEvent(e);
                    if (event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */)) {
                        EventHelper.stop(e);
                        this.executeCommand(command);
                    }
                    else if (event.equals(9 /* KeyCode.Escape */) || event.equals(15 /* KeyCode.LeftArrow */) || event.equals(17 /* KeyCode.RightArrow */)) {
                        EventHelper.stop(e);
                        this.hover?.hide();
                    }
                });
                this.labelContainer.classList.remove('disabled');
            }
            else {
                this.labelContainer.classList.add('disabled');
            }
        }
        // Update: Beak
        if (!this.entry || entry.showBeak !== this.entry.showBeak) {
            if (entry.showBeak) {
                this.container.classList.add('has-beak');
            }
            else {
                this.container.classList.remove('has-beak');
            }
        }
        const hasBackgroundColor = !!entry.backgroundColor || (entry.kind && entry.kind !== 'standard');
        // Update: Kind
        if (!this.entry || entry.kind !== this.entry.kind) {
            for (const kind of StatusbarEntryKinds) {
                this.container.classList.remove(`${kind}-kind`);
            }
            if (entry.kind && entry.kind !== 'standard') {
                this.container.classList.add(`${entry.kind}-kind`);
            }
            this.container.classList.toggle('has-background-color', hasBackgroundColor);
        }
        // Update: Foreground
        if (!this.entry || entry.color !== this.entry.color) {
            this.applyColor(this.labelContainer, entry.color);
        }
        // Update: Background
        if (!this.entry || entry.backgroundColor !== this.entry.backgroundColor) {
            this.container.classList.toggle('has-background-color', hasBackgroundColor);
            this.applyColor(this.container, entry.backgroundColor, true);
        }
        // Remember for next round
        this.entry = entry;
    }
    isEqualTooltip({ tooltip }, { tooltip: otherTooltip }) {
        if (tooltip === undefined) {
            return otherTooltip === undefined;
        }
        if (isMarkdownString(tooltip)) {
            return isMarkdownString(otherTooltip) && markdownStringEqual(tooltip, otherTooltip);
        }
        return tooltip === otherTooltip;
    }
    async executeCommand(command) {
        // Custom command from us: Show tooltip
        if (command === ShowTooltipCommand) {
            this.hover?.show(true /* focus */);
        }
        // Any other command is going through command service
        else {
            const id = typeof command === 'string' ? command : command.id;
            const args = typeof command === 'string' ? [] : command.arguments ?? [];
            this.telemetryService.publicLog2('workbenchActionExecuted', { id, from: 'status bar' });
            try {
                await this.commandService.executeCommand(id, ...args);
            }
            catch (error) {
                this.notificationService.error(toErrorMessage(error));
            }
        }
    }
    applyColor(container, color, isBackground) {
        let colorResult = undefined;
        if (isBackground) {
            this.backgroundListener.clear();
        }
        else {
            this.foregroundListener.clear();
        }
        if (color) {
            if (isThemeColor(color)) {
                colorResult = this.themeService.getColorTheme().getColor(color.id)?.toString();
                const listener = this.themeService.onDidColorThemeChange(theme => {
                    const colorValue = theme.getColor(color.id)?.toString();
                    if (isBackground) {
                        container.style.backgroundColor = colorValue ?? '';
                    }
                    else {
                        container.style.color = colorValue ?? '';
                    }
                });
                if (isBackground) {
                    this.backgroundListener.value = listener;
                }
                else {
                    this.foregroundListener.value = listener;
                }
            }
            else {
                colorResult = color;
            }
        }
        if (isBackground) {
            container.style.backgroundColor = colorResult ?? '';
        }
        else {
            container.style.color = colorResult ?? '';
        }
    }
};
StatusbarEntryItem = __decorate([
    __param(3, ICommandService),
    __param(4, IHoverService),
    __param(5, INotificationService),
    __param(6, ITelemetryService),
    __param(7, IThemeService)
], StatusbarEntryItem);
export { StatusbarEntryItem };
class StatusBarCodiconLabel extends SimpleIconLabel {
    constructor(container) {
        super(container);
        this.container = container;
        this.progressCodicon = renderIcon(syncing);
        this.currentText = '';
        this.currentShowProgress = false;
    }
    set showProgress(showProgress) {
        if (this.currentShowProgress !== showProgress) {
            this.currentShowProgress = showProgress;
            this.progressCodicon = renderIcon(showProgress === 'syncing' ? syncing : spinningLoading);
            this.text = this.currentText;
        }
    }
    set text(text) {
        // Progress: insert progress codicon as first element as needed
        // but keep it stable so that the animation does not reset
        if (this.currentShowProgress) {
            // Append as needed
            if (this.container.firstChild !== this.progressCodicon) {
                this.container.appendChild(this.progressCodicon);
            }
            // Remove others
            for (const node of Array.from(this.container.childNodes)) {
                if (node !== this.progressCodicon) {
                    node.remove();
                }
            }
            // If we have text to show, add a space to separate from progress
            let textContent = text ?? '';
            if (textContent) {
                textContent = `\u00A0${textContent}`; // prepend non-breaking space
            }
            // Append new elements
            append(this.container, ...renderLabelWithIcons(textContent));
        }
        // No Progress: no special handling
        else {
            super.text = text;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFySXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9zdGF0dXNiYXIvc3RhdHVzYmFySXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBa0IsTUFBTSxrREFBa0QsQ0FBQztBQUVuSyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVsRixPQUFPLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFFLE1BQU0s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