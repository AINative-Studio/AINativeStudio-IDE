/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { EventType, Gesture } from '../../touch.js';
import * as arrays from '../../../common/arrays.js';
import { Emitter } from '../../../common/event.js';
import { Disposable } from '../../../common/lifecycle.js';
import { isMacintosh } from '../../../common/platform.js';
export class SelectBoxNative extends Disposable {
    constructor(options, selected, styles, selectBoxOptions) {
        super();
        this.selected = 0;
        this.selectBoxOptions = selectBoxOptions || Object.create(null);
        this.options = [];
        this.selectElement = document.createElement('select');
        this.selectElement.className = 'monaco-select-box';
        if (typeof this.selectBoxOptions.ariaLabel === 'string') {
            this.selectElement.setAttribute('aria-label', this.selectBoxOptions.ariaLabel);
        }
        if (typeof this.selectBoxOptions.ariaDescription === 'string') {
            this.selectElement.setAttribute('aria-description', this.selectBoxOptions.ariaDescription);
        }
        this._onDidSelect = this._register(new Emitter());
        this.styles = styles;
        this.registerListeners();
        this.setOptions(options, selected);
    }
    registerListeners() {
        this._register(Gesture.addTarget(this.selectElement));
        [EventType.Tap].forEach(eventType => {
            this._register(dom.addDisposableListener(this.selectElement, eventType, (e) => {
                this.selectElement.focus();
            }));
        });
        this._register(dom.addStandardDisposableListener(this.selectElement, 'click', (e) => {
            dom.EventHelper.stop(e, true);
        }));
        this._register(dom.addStandardDisposableListener(this.selectElement, 'change', (e) => {
            this.selectElement.title = e.target.value;
            this._onDidSelect.fire({
                index: e.target.selectedIndex,
                selected: e.target.value
            });
        }));
        this._register(dom.addStandardDisposableListener(this.selectElement, 'keydown', (e) => {
            let showSelect = false;
            if (isMacintosh) {
                if (e.keyCode === 18 /* KeyCode.DownArrow */ || e.keyCode === 16 /* KeyCode.UpArrow */ || e.keyCode === 10 /* KeyCode.Space */) {
                    showSelect = true;
                }
            }
            else {
                if (e.keyCode === 18 /* KeyCode.DownArrow */ && e.altKey || e.keyCode === 10 /* KeyCode.Space */ || e.keyCode === 3 /* KeyCode.Enter */) {
                    showSelect = true;
                }
            }
            if (showSelect) {
                // Space, Enter, is used to expand select box, do not propagate it (prevent action bar action run)
                e.stopPropagation();
            }
        }));
    }
    get onDidSelect() {
        return this._onDidSelect.event;
    }
    setOptions(options, selected) {
        if (!this.options || !arrays.equals(this.options, options)) {
            this.options = options;
            this.selectElement.options.length = 0;
            this.options.forEach((option, index) => {
                this.selectElement.add(this.createOption(option.text, index, option.isDisabled));
            });
        }
        if (selected !== undefined) {
            this.select(selected);
        }
    }
    select(index) {
        if (this.options.length === 0) {
            this.selected = 0;
        }
        else if (index >= 0 && index < this.options.length) {
            this.selected = index;
        }
        else if (index > this.options.length - 1) {
            // Adjust index to end of list
            // This could make client out of sync with the select
            this.select(this.options.length - 1);
        }
        else if (this.selected < 0) {
            this.selected = 0;
        }
        this.selectElement.selectedIndex = this.selected;
        if ((this.selected < this.options.length) && typeof this.options[this.selected].text === 'string') {
            this.selectElement.title = this.options[this.selected].text;
        }
        else {
            this.selectElement.title = '';
        }
    }
    setAriaLabel(label) {
        this.selectBoxOptions.ariaLabel = label;
        this.selectElement.setAttribute('aria-label', label);
    }
    focus() {
        if (this.selectElement) {
            this.selectElement.tabIndex = 0;
            this.selectElement.focus();
        }
    }
    blur() {
        if (this.selectElement) {
            this.selectElement.tabIndex = -1;
            this.selectElement.blur();
        }
    }
    setEnabled(enable) {
        this.selectElement.disabled = !enable;
    }
    setFocusable(focusable) {
        this.selectElement.tabIndex = focusable ? 0 : -1;
    }
    render(container) {
        container.classList.add('select-container');
        container.appendChild(this.selectElement);
        this.setOptions(this.options, this.selected);
        this.applyStyles();
    }
    style(styles) {
        this.styles = styles;
        this.applyStyles();
    }
    applyStyles() {
        // Style native select
        if (this.selectElement) {
            this.selectElement.style.backgroundColor = this.styles.selectBackground ?? '';
            this.selectElement.style.color = this.styles.selectForeground ?? '';
            this.selectElement.style.borderColor = this.styles.selectBorder ?? '';
        }
    }
    createOption(value, index, disabled) {
        const option = document.createElement('option');
        option.value = value;
        option.text = value;
        option.disabled = !!disabled;
        return option;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0Qm94TmF0aXZlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9zZWxlY3RCb3gvc2VsZWN0Qm94TmF0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFcEQsT0FBTyxLQUFLLE1BQU0sTUFBTSwyQkFBMkIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sMEJBQTBCLENBQUM7QUFFMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUxRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxVQUFVO0lBUzlDLFlBQVksT0FBNEIsRUFBRSxRQUFnQixFQUFFLE1BQXdCLEVBQUUsZ0JBQW9DO1FBQ3pILEtBQUssRUFBRSxDQUFDO1FBTEQsYUFBUSxHQUFHLENBQUMsQ0FBQztRQU1wQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoRSxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUVsQixJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFdEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEdBQUcsbUJBQW1CLENBQUM7UUFFbkQsSUFBSSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekQsSUFBSSxD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