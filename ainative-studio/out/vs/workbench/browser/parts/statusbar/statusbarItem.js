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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFySXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3N0YXR1c2Jhci9zdGF0dXNiYXJJdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQW1CLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFrQixNQUFNLGtEQUFrRCxDQUFDO0FBRW5LLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRWxGLE9BQU8sRUFBRSxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxx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