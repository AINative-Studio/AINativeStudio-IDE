/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-native-private */
import { StatusBarAlignment as ExtHostStatusBarAlignment, Disposable, ThemeColor, asStatusBarItemIdentifier } from './extHostTypes.js';
import { MainContext } from './extHost.protocol.js';
import { localize } from '../../../nls.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { MarkdownString } from './extHostTypeConverters.js';
import { isNumber } from '../../../base/common/types.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
export class ExtHostStatusBarEntry {
    static { this.ID_GEN = 0; }
    static { this.ALLOWED_BACKGROUND_COLORS = new Map([
        ['statusBarItem.errorBackground', new ThemeColor('statusBarItem.errorForeground')],
        ['statusBarItem.warningBackground', new ThemeColor('statusBarItem.warningForeground')]
    ]); }
    #proxy;
    #commands;
    constructor(proxy, commands, staticItems, extension, id, alignment = ExtHostStatusBarAlignment.Left, priority, _onDispose) {
        this._onDispose = _onDispose;
        this._disposed = false;
        this._text = '';
        this._staleCommandRegistrations = new DisposableStore();
        this.#proxy = proxy;
        this.#commands = commands;
        if (id && extension) {
            this._entryId = asStatusBarItemIdentifier(extension.identifier, id);
            // if new item already exists mark it as visible and copy properties
            // this can only happen when an item was contributed by an extension
            const item = staticItems.get(this._entryId);
            if (item) {
                alignment = item.alignLeft ? ExtHostStatusBarAlignment.Left : ExtHostStatusBarAlignment.Right;
                priority = item.priority;
                this._visible = true;
                this.name = item.name;
                this.text = item.text;
                this.tooltip = item.tooltip;
                this.command = item.command;
                this.accessibilityInformation = item.accessibilityInformation;
            }
        }
        else {
            this._entryId = String(ExtHostStatusBarEntry.ID_GEN++);
        }
        this._extension = extension;
        this._id = id;
        this._alignment = alignment;
        this._priority = this.validatePriority(priority);
    }
    validatePriority(priority) {
        if (!isNumber(priority)) {
            return undefined; // using this method to catch `NaN` too!
        }
        // Our RPC mechanism use JSON to serialize data which does
        // not support `Infinity` so we need to fill in the number
        // equivalent as close as possible.
        // https://github.com/microsoft/vscode/issues/133317
        if (priority === Number.POSITIVE_INFINITY) {
            return Number.MAX_VALUE;
        }
        if (priority === Number.NEGATIVE_INFINITY) {
            return -Number.MAX_VALUE;
        }
        return priority;
    }
    get id() {
        return this._id ?? this._extension.identifier.value;
    }
    get entryId() {
        return this._entryId;
    }
    get alignment() {
        return this._alignment;
    }
    get priority() {
        return this._priority;
    }
    get text() {
        return this._text;
    }
    get name() {
        return this._name;
    }
    get tooltip() {
        return this._tooltip;
    }
    get tooltip2() {
        if (this._extension) {
            checkProposedApiEnabled(this._extension, 'statusBarItemTooltip');
        }
        return this._tooltip2;
    }
    get color() {
        return this._color;
    }
    get backgroundColor() {
        return this._backgroundColor;
    }
    get command() {
        return this._command?.fromApi;
    }
    get accessibilityInformation() {
        return this._accessibilityInformation;
    }
    set text(text) {
        this._text = text;
        this.update();
    }
    set name(name) {
        this._name = name;
        this.update();
    }
    set tooltip(tooltip) {
        this._tooltip = tooltip;
        this.update();
    }
    set tooltip2(tooltip) {
        if (this._extension) {
            checkProposedApiEnabled(this._extension, 'statusBarItemTooltip');
        }
        this._tooltip2 = tooltip;
        this.update();
    }
    set color(color) {
        this._color = color;
        this.update();
    }
    set backgroundColor(color) {
        if (color && !ExtHostStatusBarEntry.ALLOWED_BACKGROUND_COLORS.has(color.id)) {
            color = undefined;
        }
        this._backgroundColor = color;
        this.update();
    }
    set command(command) {
        if (this._command?.fromApi === command) {
            return;
        }
        if (this._latestCommandRegistration) {
            this._staleCommandRegistrations.add(this._latestCommandRegistration);
        }
        this._latestCommandRegistration = new DisposableStore();
        if (typeof command === 'string') {
            this._command = {
                fromApi: command,
                internal: this.#commands.toInternal({ title: '', command }, this._latestCommandRegistration),
            };
        }
        else if (command) {
            this._command = {
                fromApi: command,
                internal: this.#commands.toInternal(command, this._latestCommandRegistration),
            };
        }
        else {
            this._command = undefined;
        }
        this.update();
    }
    set accessibilityInformation(accessibilityInformation) {
        this._accessibilityInformation = accessibilityInformation;
        this.update();
    }
    show() {
        this._visible = true;
        this.update();
    }
    hide() {
        clearTimeout(this._timeoutHandle);
        this._visible = false;
        this.#proxy.$disposeEntry(this._entryId);
    }
    update() {
        if (this._disposed || !this._visible) {
            return;
        }
        clearTimeout(this._timeoutHandle);
        // Defer the update so that multiple changes to setters dont cause a redraw each
        this._timeoutHandle = setTimeout(() => {
            this._timeoutHandle = undefined;
            // If the id is not set, derive it from the extension identifier,
            // otherwise make sure to prefix it with the extension identifier
            // to get a more unique value across extensions.
            let id;
            if (this._extension) {
                if (this._id) {
                    id = `${this._extension.identifier.value}.${this._id}`;
                }
                else {
                    id = this._extension.identifier.value;
                }
            }
            else {
                id = this._id;
            }
            // If the name is not set, derive it from the extension descriptor
            let name;
            if (this._name) {
                name = this._name;
            }
            else {
                name = localize('extensionLabel', "{0} (Extension)", this._extension.displayName || this._extension.name);
            }
            // If a background color is set, the foreground is determined
            let color = this._color;
            if (this._backgroundColor) {
                color = ExtHostStatusBarEntry.ALLOWED_BACKGROUND_COLORS.get(this._backgroundColor.id);
            }
            let tooltip;
            let hasTooltipProvider;
            if (typeof this._tooltip2 === 'function') {
                tooltip = MarkdownString.fromStrict(this._tooltip);
                hasTooltipProvider = true;
            }
            else {
                tooltip = MarkdownString.fromStrict(this._tooltip2 ?? this._tooltip);
                hasTooltipProvider = false;
            }
            // Set to status bar
            this.#proxy.$setEntry(this._entryId, id, this._extension?.identifier.value, name, this._text, tooltip, hasTooltipProvider, this._command?.internal, color, this._backgroundColor, this._alignment === ExtHostStatusBarAlignment.Left, this._priority, this._accessibilityInformation);
            // clean-up state commands _after_ updating the UI
            this._staleCommandRegistrations.clear();
        }, 0);
    }
    dispose() {
        this.hide();
        this._onDispose?.();
        this._disposed = true;
    }
}
class StatusBarMessage {
    constructor(statusBar) {
        this._messages = [];
        this._item = statusBar.createStatusBarEntry(undefined, 'status.extensionMessage', ExtHostStatusBarAlignment.Left, Number.MIN_VALUE);
        this._item.name = localize('status.extensionMessage', "Extension Status");
    }
    dispose() {
        this._messages.length = 0;
        this._item.dispose();
    }
    setMessage(message) {
        const data = { message }; // use object to not confuse equal strings
        this._messages.unshift(data);
        this._update();
        return new Disposable(() => {
            const idx = this._messages.indexOf(data);
            if (idx >= 0) {
                this._messages.splice(idx, 1);
                this._update();
            }
        });
    }
    _update() {
        if (this._messages.length > 0) {
            this._item.text = this._messages[0].message;
            this._item.show();
        }
        else {
            this._item.hide();
        }
    }
}
export class ExtHostStatusBar {
    constructor(mainContext, commands) {
        this._entries = new Map();
        this._existingItems = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadStatusBar);
        this._commands = commands;
        this._statusMessage = new StatusBarMessage(this);
    }
    $acceptStaticEntries(added) {
        for (const item of added) {
            this._existingItems.set(item.entryId, item);
        }
    }
    async $provideTooltip(entryId, cancellation) {
        const entry = this._entries.get(entryId);
        if (!entry) {
            return undefined;
        }
        const tooltip = typeof entry.tooltip2 === 'function' ? await entry.tooltip2(cancellation) : entry.tooltip2;
        return !cancellation.isCancellationRequested ? MarkdownString.fromStrict(tooltip) : undefined;
    }
    createStatusBarEntry(extension, id, alignment, priority) {
        const entry = new ExtHostStatusBarEntry(this._proxy, this._commands, this._existingItems, extension, id, alignment, priority, () => this._entries.delete(entry.entryId));
        this._entries.set(entry.entryId, entry);
        return entry;
    }
    setStatusBarMessage(text, timeoutOrThenable) {
        const d = this._statusMessage.setMessage(text);
        let handle;
        if (typeof timeoutOrThenable === 'number') {
            handle = setTimeout(() => d.dispose(), timeoutOrThenable);
        }
        else if (typeof timeoutOrThenable !== 'undefined') {
            timeoutOrThenable.then(() => d.dispose(), () => d.dispose());
        }
        return new Disposable(() => {
            d.dispose();
            clearTimeout(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0YXR1c0Jhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0U3RhdHVzQmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLGlEQUFpRDtBQUVqRCxPQUFPLEVBQUUsa0JBQWtCLElBQUkseUJBQXlCLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXZJLE9BQU8sRUFBRSxXQUFXLEVBQWdHLE1BQU0sdUJBQXVCLENBQUM7QUFDbEosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTNDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXpELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR3pGLE1BQU0sT0FBTyxxQkFBcUI7YUFFbEIsV0FBTSxHQUFHLENBQUMsQUFBSixDQUFLO2FBRVgsOEJBQXlCLEdBQUcsSUFBSSxHQUFHLENBQ2pEO1FBQ0MsQ0FBQywrQkFBK0IsRUFBRSxJQUFJLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ2xGLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxVQUFVLENBQUMsaUNBQWlDLENBQUMsQ0FBQztLQUN0RixDQUNELEFBTHVDLENBS3RDO0lBRUYsTUFBTSxDQUEyQjtJQUNqQyxTQUFTLENBQW9CO0lBZ0M3QixZQUFZLEtBQStCLEVBQUUsUUFBMkIsRUFBRSxXQUFrRCxFQUFFLFNBQWlDLEVBQUUsRUFBVyxFQUFFLFlB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