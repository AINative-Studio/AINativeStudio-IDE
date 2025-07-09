/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { DomScrollableElement } from '../scrollbar/scrollableElement.js';
import { Disposable } from '../../../common/lifecycle.js';
import './hoverWidget.css';
import { localize } from '../../../../nls.js';
const $ = dom.$;
export var HoverPosition;
(function (HoverPosition) {
    HoverPosition[HoverPosition["LEFT"] = 0] = "LEFT";
    HoverPosition[HoverPosition["RIGHT"] = 1] = "RIGHT";
    HoverPosition[HoverPosition["BELOW"] = 2] = "BELOW";
    HoverPosition[HoverPosition["ABOVE"] = 3] = "ABOVE";
})(HoverPosition || (HoverPosition = {}));
export class HoverWidget extends Disposable {
    constructor(fadeIn) {
        super();
        this.containerDomNode = document.createElement('div');
        this.containerDomNode.className = 'monaco-hover';
        this.containerDomNode.classList.toggle('fade-in', !!fadeIn);
        this.containerDomNode.tabIndex = 0;
        this.containerDomNode.setAttribute('role', 'tooltip');
        this.contentsDomNode = document.createElement('div');
        this.contentsDomNode.className = 'monaco-hover-content';
        this.scrollbar = this._register(new DomScrollableElement(this.contentsDomNode, {
            consumeMouseWheelIfScrollbarIsNeeded: true
        }));
        this.containerDomNode.appendChild(this.scrollbar.getDomNode());
    }
    onContentsChanged() {
        this.scrollbar.scanDomNode();
    }
}
export class HoverAction extends Disposable {
    static render(parent, actionOptions, keybindingLabel) {
        return new HoverAction(parent, actionOptions, keybindingLabel);
    }
    constructor(parent, actionOptions, keybindingLabel) {
        super();
        this.actionLabel = actionOptions.label;
        this.actionKeybindingLabel = keybindingLabel;
        this.actionContainer = dom.append(parent, $('div.action-container'));
        this.actionContainer.setAttribute('tabindex', '0');
        this.action = dom.append(this.actionContainer, $('a.action'));
        this.action.setAttribute('role', 'button');
        if (actionOptions.iconClass) {
            dom.append(this.action, $(`span.icon.${actionOptions.iconClass}`));
        }
        this.actionRenderedLabel = keybindingLabel ? `${actionOptions.label} (${keybindingLabel})` : actionOptions.label;
        const label = dom.append(this.action, $('span'));
        label.textContent = this.actionRenderedLabel;
        this._store.add(new ClickAction(this.actionContainer, actionOptions.run));
        this._store.add(new KeyDownAction(this.actionContainer, actionOptions.run, [3 /* KeyCode.Enter */, 10 /* KeyCode.Space */]));
        this.setEnabled(true);
    }
    setEnabled(enabled) {
        if (enabled) {
            this.actionContainer.classList.remove('disabled');
            this.actionContainer.removeAttribute('aria-disabled');
        }
        else {
            this.actionContainer.classList.add('disabled');
            this.actionContainer.setAttribute('aria-disabled', 'true');
        }
    }
}
export function getHoverAccessibleViewHint(shouldHaveHint, keybinding) {
    return shouldHaveHint && keybinding ? localize('acessibleViewHint', "Inspect this in the accessible view with {0}.", keybinding) : shouldHaveHint ? localize('acessibleViewHintNoKbOpen', "Inspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.") : '';
}
export class ClickAction extends Disposable {
    constructor(container, run) {
        super();
        this._register(dom.addDisposableListener(container, dom.EventType.CLICK, e => {
            e.stopPropagation();
            e.preventDefault();
            run(container);
        }));
    }
}
export class KeyDownAction extends Disposable {
    constructor(container, run, keyCodes) {
        super();
        this._register(dom.addDisposableListener(container, dom.EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (keyCodes.some(keyCode => event.equals(keyCode))) {
                e.stopPropagation();
                e.preventDefault();
                run(container);
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2hvdmVyL2hvdmVyV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRCxPQUFPLG1CQUFtQixDQUFDO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRWhCLE1BQU0sQ0FBTixJQUFrQixhQUtqQjtBQUxELFdBQWtCLGFBQWE7SUFDOUIsaURBQUksQ0FBQTtJQUNKLG1EQUFLLENBQUE7SUFDTCxtREFBSyxDQUFBO0lBQ0wsbURBQUssQ0FBQTtBQUNOLENBQUMsRUFMaUIsYUFBYSxLQUFiLGFBQWEsUUFLOUI7QUFFRCxNQUFNLE9BQU8sV0FBWSxTQUFRLFVBQVU7SUFNMUMsWUFBWSxNQUFlO1FBQzFCLEtBQUssRUFBRSxDQUFDO1FBRVIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUM7UUFDakQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1RCxJQUFJ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