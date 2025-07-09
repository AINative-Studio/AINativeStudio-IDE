/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { UILabelProvider } from '../../../common/keybindingLabels.js';
import { Disposable } from '../../../common/lifecycle.js';
import { equals } from '../../../common/objects.js';
import './keybindingLabel.css';
import { localize } from '../../../../nls.js';
const $ = dom.$;
export const unthemedKeybindingLabelOptions = {
    keybindingLabelBackground: undefined,
    keybindingLabelForeground: undefined,
    keybindingLabelBorder: undefined,
    keybindingLabelBottomBorder: undefined,
    keybindingLabelShadow: undefined
};
export class KeybindingLabel extends Disposable {
    constructor(container, os, options) {
        super();
        this.os = os;
        this.keyElements = new Set();
        this.options = options || Object.create(null);
        const labelForeground = this.options.keybindingLabelForeground;
        this.domNode = dom.append(container, $('.monaco-keybinding'));
        if (labelForeground) {
            this.domNode.style.color = labelForeground;
        }
        this.hover = this._register(getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this.domNode, ''));
        this.didEverRender = false;
        container.appendChild(this.domNode);
    }
    get element() {
        return this.domNode;
    }
    set(keybinding, matches) {
        if (this.didEverRender && this.keybinding === keybinding && KeybindingLabel.areSame(this.matches, matches)) {
            return;
        }
        this.keybinding = keybinding;
        this.matches = matches;
        this.render();
    }
    render() {
        this.clear();
        if (this.keybinding) {
            const chords = this.keybinding.getChords();
            if (chords[0]) {
                this.renderChord(this.domNode, chords[0], this.matches ? this.matches.firstPart : null);
            }
            for (let i = 1; i < chords.length; i++) {
                dom.append(this.domNode, $('span.monaco-keybinding-key-chord-separator', undefined, ' '));
                this.renderChord(this.domNode, chords[i], this.matches ? this.matches.chordPart : null);
            }
            const title = (this.options.disableTitle ?? false) ? undefined : this.keybinding.getAriaLabel() || undefined;
            this.hover.update(title);
            this.domNode.setAttribute('aria-label', title || '');
        }
        else if (this.options && this.options.renderUnboundKeybindings) {
            this.renderUnbound(this.domNode);
        }
        this.didEverRender = true;
    }
    clear() {
        dom.clearNode(this.domNode);
        this.keyElements.clear();
    }
    renderChord(parent, chord, match) {
        const modifierLabels = UILabelProvider.modifierLabels[this.os];
        if (chord.ctrlKey) {
            this.renderKey(parent, modifierLabels.ctrlKey, Boolean(match?.ctrlKey), modifierLabels.separator);
        }
        if (chord.shiftKey) {
            this.renderKey(parent, modifierLabels.shiftKey, Boolean(match?.shiftKey), modifierLabels.separator);
        }
        if (chord.altKey) {
            this.renderKey(parent, modifierLabels.altKey, Boolean(match?.altKey), modifierLabels.separator);
        }
        if (chord.metaKey) {
            this.renderKey(parent, modifierLabels.metaKey, Boolean(match?.metaKey), modifierLabels.separator);
        }
        const keyLabel = chord.keyLabel;
        if (keyLabel) {
            this.renderKey(parent, keyLabel, Boolean(match?.keyCode), '');
        }
    }
    renderKey(parent, label, highlight, separator) {
        dom.append(parent, this.createKeyElement(label, highlight ? '.highlight' : ''));
        if (separator) {
            dom.append(parent, $('span.monaco-keybinding-key-separator', undefined, separator));
        }
    }
    renderUnbound(parent) {
        dom.append(parent, this.createKeyElement(localize('unbound', "Unbound")));
    }
    createKeyElement(label, extraClass = '') {
        const keyElement = $('span.monaco-keybinding-key' + extraClass, undefined, label);
        this.keyElements.add(keyElement);
        if (this.options.keybindingLabelBackground) {
            keyElement.style.backgroundColor = this.options.keybindingLabelBackground;
        }
        if (this.options.keybindingLabelBorder) {
            keyElement.style.borderColor = this.options.keybindingLabelBorder;
        }
        if (this.options.keybindingLabelBottomBorder) {
            keyElement.style.borderBottomColor = this.options.keybindingLabelBottomBorder;
        }
        if (this.options.keybindingLabelShadow) {
            keyElement.style.boxShadow = `inset 0 -1px 0 ${this.options.keybindingLabelShadow}`;
        }
        return keyElement;
    }
    static areSame(a, b) {
        if (a === b || (!a && !b)) {
            return true;
        }
        return !!a && !!b && equals(a.firstPart, b.firstPart) && equals(a.chordPart, b.chordPart);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0xhYmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9rZXliaW5kaW5nTGFiZWwva2V5YmluZGluZ0xhYmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBRXBDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRXBELE9BQU8sdUJBQXVCLENBQUM7QUFDL0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUErQmhCLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUEyQjtJQUNyRSx5QkFBeUIsRUFBRSxTQUFTO0lBQ3BDLHlCQUF5QixFQUFFLFNBQVM7SUFDcEMscUJBQXFCLEVBQUUsU0FBUztJQUNoQywyQkFBMkIsRUFBRSxTQUFTO0lBQ3RDLHFCQUFxQixFQUFFLFNBQVM7Q0FDaEMsQ0FBQztBQUVGLE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7SUFZOUMsWUFBWSxTQUFzQixFQUFVLEVBQW1CLEVBQUUsT0FBZ0M7UUFDaEcsS0FBSyxFQUFFLENBQUM7UUFEbUMsT0FBRSxHQUFGLEVBQUUsQ0FBaUI7UUFQOUMsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBbUIs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