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
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { Widget } from '../../../../../base/browser/ui/widget.js';
import * as dom from '../../../../../base/browser/dom.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
const $ = dom.$;
let TerminalHover = class TerminalHover extends Disposable {
    constructor(_targetOptions, _text, _actions, _linkHandler, _hoverService, _configurationService) {
        super();
        this._targetOptions = _targetOptions;
        this._text = _text;
        this._actions = _actions;
        this._linkHandler = _linkHandler;
        this._hoverService = _hoverService;
        this._configurationService = _configurationService;
        this.id = 'hover';
    }
    attach(container) {
        const showLinkHover = this._configurationService.getValue("terminal.integrated.showLinkHover" /* TerminalSettingId.ShowLinkHover */);
        if (!showLinkHover) {
            return;
        }
        const target = new CellHoverTarget(container, this._targetOptions);
        const hover = this._hoverService.showInstantHover({
            target,
            content: this._text,
            actions: this._actions,
            linkHandler: this._linkHandler,
            // .xterm-hover lets xterm know that the hover is part of a link
            additionalClasses: ['xterm-hover']
        });
        if (hover) {
            this._register(hover);
        }
    }
};
TerminalHover = __decorate([
    __param(4, IHoverService),
    __param(5, IConfigurationService)
], TerminalHover);
export { TerminalHover };
class CellHoverTarget extends Widget {
    get targetElements() { return this._targetElements; }
    constructor(container, _options) {
        super();
        this._options = _options;
        this._targetElements = [];
        this._domNode = $('div.terminal-hover-targets.xterm-hover');
        const rowCount = this._options.viewportRange.end.y - this._options.viewportRange.start.y + 1;
        // Add top target row
        const width = (this._options.viewportRange.end.y > this._options.viewportRange.start.y ? this._options.terminalDimensions.width - this._options.viewportRange.start.x : this._options.viewportRange.end.x - this._options.viewportRange.start.x + 1) * this._options.cellDimensions.width;
        const topTarget = $('div.terminal-hover-target.hoverHighlight');
        topTarget.style.left = `${this._options.viewportRange.start.x * this._options.cellDimensions.width}px`;
        topTarget.style.bottom = `${(this._options.terminalDimensions.height - this._options.viewportRange.start.y - 1) * this._options.cellDimensions.height}px`;
        topTarget.style.width = `${width}px`;
        topTarget.style.height = `${this._options.cellDimensions.height}px`;
        this._targetElements.push(this._domNode.appendChild(topTarget));
        // Add middle target rows
        if (rowCount > 2) {
            const middleTarget = $('div.terminal-hover-target.hoverHighlight');
            middleTarget.style.left = `0px`;
            middleTarget.style.bottom = `${(this._options.terminalDimensions.height - this._options.viewportRange.start.y - 1 - (rowCount - 2)) * this._options.cellDimensions.height}px`;
            middleTarget.style.width = `${this._options.terminalDimensions.width * this._options.cellDimensions.width}px`;
            middleTarget.style.height = `${(rowCount - 2) * this._options.cellDimensions.height}px`;
            this._targetElements.push(this._domNode.appendChild(middleTarget));
        }
        // Add bottom target row
        if (rowCount > 1) {
            const bottomTarget = $('div.terminal-hover-target.hoverHighlight');
            bottomTarget.style.left = `0px`;
            bottomTarget.style.bottom = `${(this._options.terminalDimensions.height - this._options.viewportRange.end.y - 1) * this._options.cellDimensions.height}px`;
            bottomTarget.style.width = `${(this._options.viewportRange.end.x + 1) * this._options.cellDimensions.width}px`;
            bottomTarget.style.height = `${this._options.cellDimensions.height}px`;
            this._targetElements.push(this._domNode.appendChild(bottomTarget));
        }
        if (this._options.modifierDownCallback && this._options.modifierUpCallback) {
            let down = false;
            this._register(dom.addDisposableListener(container.ownerDocument, 'keydown', e => {
                if (e.ctrlKey && !down) {
                    down = true;
                    this._options.modifierDownCallback();
                }
            }));
            this._register(dom.addDisposableListener(container.ownerDocument, 'keyup', e => {
                if (!e.ctrlKey) {
                    down = false;
                    this._options.modifierUpCallback();
                }
            }));
        }
        container.appendChild(this._domNode);
        this._register(toDisposable(() => this._domNode?.remove()));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxIb3ZlcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3dpZGdldHMvdGVybWluYWxIb3ZlcldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVsRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUl0RyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBVVQsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYyxTQUFRLFVBQVU7SUFHNUMsWUFDa0IsY0FBdUMsRUFDdkMsS0FBc0IsRUFDdEIsUUFBb0MsRUFDcEMsWUFBc0MsRUFDeEMsYUFBNkMsRUFDckMscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBUFMsbUJBQWMsR0FBZCxjQUFjLENBQXlCO1FBQ3ZDLFVBQUssR0FBTCxLQUFLLENBQWlCO1FBQ3RCLGFBQVEsR0FBUixRQUFRLENBQTRCO1FBQ3BDLGlCQUFZLEdBQVosWUFBWSxDQUEwQjtRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUNwQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBUjVFLE9BQUUsR0FBRyxPQUFPLENBQUM7SUFXdEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxTQUFzQjtRQUM1QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSwyRUFBaUMsQ0FBQztRQUMzRixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7WUFDakQsTUFBTTtZQUNOLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSztZQUNuQixPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdEIsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQzlCLGdFQUFnRTtZQUNoRSxpQkFBaUIsRUFBRSxDQUFDLGFBQWEsQ0FBQztTQUNsQyxDQUFDLENBQUM7UUFDSCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFoQ1ksYUFBYTtJQVF2QixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEscUJBQXFCLENBQUE7R0FUWCxhQUFhLENBZ0N6Qjs7QUFFRCxNQUFNLGVBQWdCLFNBQVEsTUFBTTtJQUluQyxJQUFJLGNBQWMsS0FBNkIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUU3RSxZQUNDLFNBQXNCLEVBQ0wsUUFBaUM7UUFFbEQsS0FBSyxFQUFFLENBQUM7UUFGUyxhQUFRLEdBQVIsUUFBUSxDQUF5QjtRQU5sQyxvQkFBZSxHQUFrQixFQUFFLENBQUM7UUFVcEQsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsd0NBQXdDLENBQUMsQ0FBQztRQUM1RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTdGLHFCQUFxQjtRQUNyQixNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQztRQUMxUixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsMENBQTBDLENBQUMsQ0FBQztRQUNoRSxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsS0FBSyxJQUFJLENBQUM7UUFDdkcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxJQUFJLENBQUM7UUFDMUosU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQztRQUNyQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxDQUFDO1FBQ3BFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFaEUseUJBQXlCO1FBQ3pCLElBQUksUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1lBQ25FLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztZQUNoQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLElBQUksQ0FBQztZQUM5SyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEtBQUssSUFBSSxDQUFDO1lBQzlHLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxJQUFJLENBQUM7WUFDeEYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1lBQ25FLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztZQUNoQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLElBQUksQ0FBQztZQUMzSixZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLElBQUksQ0FBQztZQUMvRyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDNUUsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ2pCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUNoRixJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxHQUFHLElBQUksQ0FBQztvQkFDWixJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFxQixFQUFFLENBQUM7Z0JBQ3ZDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQzlFLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2hCLElBQUksR0FBRyxLQUFLLENBQUM7b0JBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBbUIsRUFBRSxDQUFDO2dCQUNyQyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDO0NBQ0QifQ==