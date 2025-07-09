/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from './event.js';
import { Disposable } from './lifecycle.js';
import * as nls from '../../nls.js';
export class Action extends Disposable {
    constructor(id, label = '', cssClass = '', enabled = true, actionCallback) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._enabled = true;
        this._id = id;
        this._label = label;
        this._cssClass = cssClass;
        this._enabled = enabled;
        this._actionCallback = actionCallback;
    }
    get id() {
        return this._id;
    }
    get label() {
        return this._label;
    }
    set label(value) {
        this._setLabel(value);
    }
    _setLabel(value) {
        if (this._label !== value) {
            this._label = value;
            this._onDidChange.fire({ label: value });
        }
    }
    get tooltip() {
        return this._tooltip || '';
    }
    set tooltip(value) {
        this._setTooltip(value);
    }
    _setTooltip(value) {
        if (this._tooltip !== value) {
            this._tooltip = value;
            this._onDidChange.fire({ tooltip: value });
        }
    }
    get class() {
        return this._cssClass;
    }
    set class(value) {
        this._setClass(value);
    }
    _setClass(value) {
        if (this._cssClass !== value) {
            this._cssClass = value;
            this._onDidChange.fire({ class: value });
        }
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._setEnabled(value);
    }
    _setEnabled(value) {
        if (this._enabled !== value) {
            this._enabled = value;
            this._onDidChange.fire({ enabled: value });
        }
    }
    get checked() {
        return this._checked;
    }
    set checked(value) {
        this._setChecked(value);
    }
    _setChecked(value) {
        if (this._checked !== value) {
            this._checked = value;
            this._onDidChange.fire({ checked: value });
        }
    }
    async run(event, data) {
        if (this._actionCallback) {
            await this._actionCallback(event);
        }
    }
}
export class ActionRunner extends Disposable {
    constructor() {
        super(...arguments);
        this._onWillRun = this._register(new Emitter());
        this.onWillRun = this._onWillRun.event;
        this._onDidRun = this._register(new Emitter());
        this.onDidRun = this._onDidRun.event;
    }
    async run(action, context) {
        if (!action.enabled) {
            return;
        }
        this._onWillRun.fire({ action });
        let error = undefined;
        try {
            await this.runAction(action, context);
        }
        catch (e) {
            error = e;
        }
        this._onDidRun.fire({ action, error });
    }
    async runAction(action, context) {
        await action.run(context);
    }
}
export class Separator {
    constructor() {
        this.id = Separator.ID;
        this.label = '';
        this.tooltip = '';
        this.class = 'separator';
        this.enabled = false;
        this.checked = false;
    }
    /**
     * Joins all non-empty lists of actions with separators.
     */
    static join(...actionLists) {
        let out = [];
        for (const list of actionLists) {
            if (!list.length) {
                // skip
            }
            else if (out.length) {
                out = [...out, new Separator(), ...list];
            }
            else {
                out = list;
            }
        }
        return out;
    }
    static { this.ID = 'vs.actions.separator'; }
    async run() { }
}
export class SubmenuAction {
    get actions() { return this._actions; }
    constructor(id, label, actions, cssClass) {
        this.tooltip = '';
        this.enabled = true;
        this.checked = undefined;
        this.id = id;
        this.label = label;
        this.class = cssClass;
        this._actions = actions;
    }
    async run() { }
}
export class EmptySubmenuAction extends Action {
    static { this.ID = 'vs.actions.empty'; }
    constructor() {
        super(EmptySubmenuAction.ID, nls.localize('submenu.empty', '(empty)'), undefined, false);
    }
}
export function toAction(props) {
    return {
        id: props.id,
        label: props.label,
        tooltip: props.tooltip ?? props.label,
        class: props.class,
        enabled: props.enabled ?? true,
        checked: props.checked,
        run: async (...args) => props.run(...args),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9hY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxZQUFZLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLGdCQUFnQixDQUFDO0FBQ3pELE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBK0NwQyxNQUFNLE9BQU8sTUFBTyxTQUFRLFVBQVU7SUFhckMsWUFBWSxFQUFVLEVBQUUsUUFBZ0IsRUFBRSxFQUFFLFdBQW1CLEVBQUUsRUFBRSxVQUFtQixJQUFJLEVBQUUsY0FBNkM7UUFDeEksS0FBSyxFQUFFLENBQUM7UUFaQyxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNCLENBQUMsQ0FBQztRQUNsRSxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBTXJDLGFBQVEsR0FBWSxJQUFJLENBQUM7UUFNbEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDZCxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUMxQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0wsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQWE7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