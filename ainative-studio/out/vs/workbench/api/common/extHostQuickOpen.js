/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { dispose } from '../../../base/common/lifecycle.js';
import { MainContext } from './extHost.protocol.js';
import { URI } from '../../../base/common/uri.js';
import { ThemeIcon, QuickInputButtons, QuickPickItemKind, InputBoxValidationSeverity } from './extHostTypes.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { coalesce } from '../../../base/common/arrays.js';
import Severity from '../../../base/common/severity.js';
import { ThemeIcon as ThemeIconUtils } from '../../../base/common/themables.js';
import { isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MarkdownString } from './extHostTypeConverters.js';
export function createExtHostQuickOpen(mainContext, workspace, commands) {
    const proxy = mainContext.getProxy(MainContext.MainThreadQuickOpen);
    class ExtHostQuickOpenImpl {
        constructor(workspace, commands) {
            this._sessions = new Map();
            this._instances = 0;
            this._workspace = workspace;
            this._commands = commands;
        }
        showQuickPick(extension, itemsOrItemsPromise, options, token = CancellationToken.None) {
            // clear state from last invocation
            this._onDidSelectItem = undefined;
            const itemsPromise = Promise.resolve(itemsOrItemsPromise);
            const instance = ++this._instances;
            const quickPickWidget = proxy.$show(instance, {
                title: options?.title,
                placeHolder: options?.placeHolder,
                matchOnDescription: options?.matchOnDescription,
                matchOnDetail: options?.matchOnDetail,
                ignoreFocusLost: options?.ignoreFocusOut,
                canPickMany: options?.canPickMany,
            }, token);
            const widgetClosedMarker = {};
            const widgetClosedPromise = quickPickWidget.then(() => widgetClosedMarker);
            return Promise.race([widgetClosedPromise, itemsPromise]).then(result => {
                if (result === widgetClosedMarker) {
                    return undefined;
                }
                const allowedTooltips = isProposedApiEnabled(extension, 'quickPickItemTooltip');
                return itemsPromise.then(items => {
                    const pickItems = [];
                    for (let handle = 0; handle < items.length; handle++) {
                        const item = items[handle];
                        if (typeof item === 'string') {
                            pickItems.push({ label: item, handle });
                        }
                        else if (item.kind === QuickPickItemKind.Separator) {
                            pickItems.push({ type: 'separator', label: item.label });
                        }
                        else {
                            if (item.tooltip && !allowedTooltips) {
                                console.warn(`Extension '${extension.identifier.value}' uses a tooltip which is proposed API that is only available when running out of dev or with the following command line switch: --enable-proposed-api ${extension.identifier.value}`);
                            }
                            const icon = (item.iconPath) ? getIconPathOrClass(item.iconPath) : undefined;
                            pickItems.push({
                                label: item.label,
                                iconPath: icon?.iconPath,
                                iconClass: icon?.iconClass,
                                description: item.description,
                                detail: item.detail,
                                picked: item.picked,
                                alwaysShow: item.alwaysShow,
                                tooltip: allowedTooltips ? MarkdownString.fromStrict(item.tooltip) : undefined,
                                handle
                            });
                        }
                    }
                    // handle selection changes
                    if (options && typeof options.onDidSelectItem === 'function') {
                        this._onDidSelectItem = (handle) => {
                            options.onDidSelectItem(items[handle]);
                        };
                    }
                    // show items
                    proxy.$setItems(instance, pickItems);
                    return quickPickWidget.then(handle => {
                        if (typeof handle === 'number') {
                            return items[handle];
                        }
                        else if (Array.isArray(handle)) {
                            return handle.map(h => items[h]);
                        }
                        return undefined;
                    });
                });
            }).then(undefined, err => {
                if (isCancellationError(err)) {
                    return undefined;
                }
                proxy.$setError(instance, err);
                return Promise.reject(err);
            });
        }
        $onItemSelected(handle) {
            this._onDidSelectItem?.(handle);
        }
        // ---- input
        showInput(options, token = CancellationToken.None) {
            // global validate fn used in callback below
            this._validateInput = options?.validateInput;
            return proxy.$input(options, typeof this._validateInput === 'function', token)
                .then(undefined, err => {
                if (isCancellationError(err)) {
                    return undefined;
                }
                return Promise.reject(err);
            });
        }
        async $validateInput(input) {
            if (!this._validateInput) {
                return;
            }
            const result = await this._validateInput(input);
            if (!result || typeof result === 'string') {
                return result;
            }
            let severity;
            switch (result.severity) {
                case InputBoxValidationSeverity.Info:
                    severity = Severity.Info;
                    break;
                case InputBoxValidationSeverity.Warning:
                    severity = Severity.Warning;
                    break;
                case InputBoxValidationSeverity.Error:
                    severity = Severity.Error;
                    break;
                default:
                    severity = result.message ? Severity.Error : Severity.Ignore;
                    break;
            }
            return {
                content: result.message,
                severity
            };
        }
        // ---- workspace folder picker
        async showWorkspaceFolderPick(options, token = CancellationToken.None) {
            const selectedFolder = await this._commands.executeCommand('_workbench.pickWorkspaceFolder', [options]);
            if (!selectedFolder) {
                return undefined;
            }
            const workspaceFolders = await this._workspace.getWorkspaceFolders2();
            if (!workspaceFolders) {
                return undefined;
            }
            return workspaceFolders.find(folder => folder.uri.toString() === selectedFolder.uri.toString());
        }
        // ---- QuickInput
        createQuickPick(extension) {
            const session = new ExtHostQuickPick(extension, () => this._sessions.delete(session._id));
            this._sessions.set(session._id, session);
            return session;
        }
        createInputBox(extension) {
            const session = new ExtHostInputBox(extension, () => this._sessions.delete(session._id));
            this._sessions.set(session._id, session);
            return session;
        }
        $onDidChangeValue(sessionId, value) {
            const session = this._sessions.get(sessionId);
            session?._fireDidChangeValue(value);
        }
        $onDidAccept(sessionId) {
            const session = this._sessions.get(sessionId);
            session?._fireDidAccept();
        }
        $onDidChangeActive(sessionId, handles) {
            const session = this._sessions.get(sessionId);
            if (session instanceof ExtHostQuickPick) {
                session._fireDidChangeActive(handles);
            }
        }
        $onDidChangeSelection(sessionId, handles) {
            const session = this._sessions.get(sessionId);
            if (session instanceof ExtHostQuickPick) {
                session._fireDidChangeSelection(handles);
            }
        }
        $onDidTriggerButton(sessionId, handle) {
            const session = this._sessions.get(sessionId);
            session?._fireDidTriggerButton(handle);
        }
        $onDidTriggerItemButton(sessionId, itemHandle, buttonHandle) {
            const session = this._sessions.get(sessionId);
            if (session instanceof ExtHostQuickPick) {
                session._fireDidTriggerItemButton(itemHandle, buttonHandle);
            }
        }
        $onDidHide(sessionId) {
            const session = this._sessions.get(sessionId);
            session?._fireDidHide();
        }
    }
    class ExtHostQuickInput {
        static { this._nextId = 1; }
        constructor(_extension, _onDidDispose) {
            this._extension = _extension;
            this._onDidDispose = _onDidDispose;
            this._id = ExtHostQuickPick._nextId++;
            this._visible = false;
            this._expectingHide = false;
            this._enabled = true;
            this._busy = false;
            this._ignoreFocusOut = true;
            this._value = '';
            this._valueSelection = undefined;
            this._buttons = [];
            this._handlesToButtons = new Map();
            this._onDidAcceptEmitter = new Emitter();
            this._onDidChangeValueEmitter = new Emitter();
            this._onDidTriggerButtonEmitter = new Emitter();
            this._onDidHideEmitter = new Emitter();
            this._pendingUpdate = { id: this._id };
            this._disposed = false;
            this._disposables = [
                this._onDidTriggerButtonEmitter,
                this._onDidHideEmitter,
                this._onDidAcceptEmitter,
                this._onDidChangeValueEmitter
            ];
            this.onDidChangeValue = this._onDidChangeValueEmitter.event;
            this.onDidAccept = this._onDidAcceptEmitter.event;
            this.onDidTriggerButton = this._onDidTriggerButtonEmitter.event;
            this.onDidHide = this._onDidHideEmitter.event;
        }
        get title() {
            return this._title;
        }
        set title(title) {
            this._title = title;
            this.update({ title });
        }
        get step() {
            return this._steps;
        }
        set step(step) {
            this._steps = step;
            this.update({ step });
        }
        get totalSteps() {
            return this._totalSteps;
        }
        set totalSteps(totalSteps) {
            this._totalSteps = totalSteps;
            this.update({ totalSteps });
        }
        get enabled() {
            return this._enabled;
        }
        set enabled(enabled) {
            this._enabled = enabled;
            this.update({ enabled });
        }
        get busy() {
            return this._busy;
        }
        set busy(busy) {
            this._busy = busy;
            this.update({ busy });
        }
        get ignoreFocusOut() {
            return this._ignoreFocusOut;
        }
        set ignoreFocusOut(ignoreFocusOut) {
            this._ignoreFocusOut = ignoreFocusOut;
            this.update({ ignoreFocusOut });
        }
        get value() {
            return this._value;
        }
        set value(value) {
            this._value = value;
            this.update({ value });
        }
        get valueSelection() {
            return this._valueSelection;
        }
        set valueSelection(valueSelection) {
            this._valueSelection = valueSelection;
            this.update({ valueSelection });
        }
        get placeholder() {
            return this._placeholder;
        }
        set placeholder(placeholder) {
            this._placeholder = placeholder;
            this.update({ placeholder });
        }
        get buttons() {
            return this._buttons;
        }
        set buttons(buttons) {
            const allowedButtonLocation = isProposedApiEnabled(this._extension, 'quickInputButtonLocation');
            if (!allowedButtonLocation && buttons.some(button => button.location)) {
                console.warn(`Extension '${this._extension.identifier.value}' uses a button location which is proposed API that is only available when running out of dev or with the following command line switch: --enable-proposed-api ${this._extension.identifier.value}`);
            }
            this._buttons = buttons.slice();
            this._handlesToButtons.clear();
            buttons.forEach((button, i) => {
                const handle = button === QuickInputButtons.Back ? -1 : i;
                this._handlesToButtons.set(handle, button);
            });
            this.update({
                buttons: buttons.map((button, i) => {
                    return {
                        ...getIconPathOrClass(button.iconPath),
                        tooltip: button.tooltip,
                        handle: button === QuickInputButtons.Back ? -1 : i,
                        location: allowedButtonLocation ? button.location : undefined
                    };
                })
            });
        }
        show() {
            this._visible = true;
            this._expectingHide = true;
            this.update({ visible: true });
        }
        hide() {
            this._visible = false;
            this.update({ visible: false });
        }
        _fireDidAccept() {
            this._onDidAcceptEmitter.fire();
        }
        _fireDidChangeValue(value) {
            this._value = value;
            this._onDidChangeValueEmitter.fire(value);
        }
        _fireDidTriggerButton(handle) {
            const button = this._handlesToButtons.get(handle);
            if (button) {
                this._onDidTriggerButtonEmitter.fire(button);
            }
        }
        _fireDidHide() {
            if (this._expectingHide) {
                // if this._visible is true, it means that .show() was called between
                // .hide() and .onDidHide. To ensure the correct number of onDidHide events
                // are emitted, we set this._expectingHide to this value so that
                // the next time .hide() is called, we can emit the event again.
                // Example:
                // .show() -> .hide() -> .show() -> .hide() should emit 2 onDidHide events.
                // .show() -> .hide() -> .hide() should emit 1 onDidHide event.
                // Fixes #135747
                this._expectingHide = this._visible;
                this._onDidHideEmitter.fire();
            }
        }
        dispose() {
            if (this._disposed) {
                return;
            }
            this._disposed = true;
            this._fireDidHide();
            this._disposables = dispose(this._disposables);
            if (this._updateTimeout) {
                clearTimeout(this._updateTimeout);
                this._updateTimeout = undefined;
            }
            this._onDidDispose();
            proxy.$dispose(this._id);
        }
        update(properties) {
            if (this._disposed) {
                return;
            }
            for (const key of Object.keys(properties)) {
                const value = properties[key];
                this._pendingUpdate[key] = value === undefined ? null : value;
            }
            if ('visible' in this._pendingUpdate) {
                if (this._updateTimeout) {
                    clearTimeout(this._updateTimeout);
                    this._updateTimeout = undefined;
                }
                this.dispatchUpdate();
            }
            else if (this._visible && !this._updateTimeout) {
                // Defer the update so that multiple changes to setters dont cause a redraw each
                this._updateTimeout = setTimeout(() => {
                    this._updateTimeout = undefined;
                    this.dispatchUpdate();
                }, 0);
            }
        }
        dispatchUpdate() {
            proxy.$createOrUpdate(this._pendingUpdate);
            this._pendingUpdate = { id: this._id };
        }
    }
    function getIconUris(iconPath) {
        if (iconPath instanceof ThemeIcon) {
            return { id: iconPath.id };
        }
        const dark = getDarkIconUri(iconPath);
        const light = getLightIconUri(iconPath);
        // Tolerate strings: https://github.com/microsoft/vscode/issues/110432#issuecomment-726144556
        return {
            dark: typeof dark === 'string' ? URI.file(dark) : dark,
            light: typeof light === 'string' ? URI.file(light) : light
        };
    }
    function getLightIconUri(iconPath) {
        return typeof iconPath === 'object' && 'light' in iconPath ? iconPath.light : iconPath;
    }
    function getDarkIconUri(iconPath) {
        return typeof iconPath === 'object' && 'dark' in iconPath ? iconPath.dark : iconPath;
    }
    function getIconPathOrClass(icon) {
        const iconPathOrIconClass = getIconUris(icon);
        let iconPath;
        let iconClass;
        if ('id' in iconPathOrIconClass) {
            iconClass = ThemeIconUtils.asClassName(iconPathOrIconClass);
        }
        else {
            iconPath = iconPathOrIconClass;
        }
        return {
            iconPath,
            iconClass
        };
    }
    class ExtHostQuickPick extends ExtHostQuickInput {
        constructor(extension, onDispose) {
            super(extension, onDispose);
            this._items = [];
            this._handlesToItems = new Map();
            this._itemsToHandles = new Map();
            this._canSelectMany = false;
            this._matchOnDescription = true;
            this._matchOnDetail = true;
            this._sortByLabel = true;
            this._keepScrollPosition = false;
            this._activeItems = [];
            this._onDidChangeActiveEmitter = new Emitter();
            this._selectedItems = [];
            this._onDidChangeSelectionEmitter = new Emitter();
            this._onDidTriggerItemButtonEmitter = new Emitter();
            this.onDidChangeActive = this._onDidChangeActiveEmitter.event;
            this.onDidChangeSelection = this._onDidChangeSelectionEmitter.event;
            this.onDidTriggerItemButton = this._onDidTriggerItemButtonEmitter.event;
            this._disposables.push(this._onDidChangeActiveEmitter, this._onDidChangeSelectionEmitter, this._onDidTriggerItemButtonEmitter);
            this.update({ type: 'quickPick' });
        }
        get items() {
            return this._items;
        }
        set items(items) {
            this._items = items.slice();
            this._handlesToItems.clear();
            this._itemsToHandles.clear();
            items.forEach((item, i) => {
                this._handlesToItems.set(i, item);
                this._itemsToHandles.set(item, i);
            });
            const allowedTooltips = isProposedApiEnabled(this._extension, 'quickPickItemTooltip');
            const pickItems = [];
            for (let handle = 0; handle < items.length; handle++) {
                const item = items[handle];
                if (item.kind === QuickPickItemKind.Separator) {
                    pickItems.push({ type: 'separator', label: item.label });
                }
                else {
                    if (item.tooltip && !allowedTooltips) {
                        console.warn(`Extension '${this._extension.identifier.value}' uses a tooltip which is proposed API that is only available when running out of dev or with the following command line switch: --enable-proposed-api ${this._extension.identifier.value}`);
                    }
                    const icon = (item.iconPath) ? getIconPathOrClass(item.iconPath) : undefined;
                    pickItems.push({
                        handle,
                        label: item.label,
                        iconPath: icon?.iconPath,
                        iconClass: icon?.iconClass,
                        description: item.description,
                        detail: item.detail,
                        picked: item.picked,
                        alwaysShow: item.alwaysShow,
                        tooltip: allowedTooltips ? MarkdownString.fromStrict(item.tooltip) : undefined,
                        buttons: item.buttons?.map((button, i) => {
                            return {
                                ...getIconPathOrClass(button.iconPath),
                                tooltip: button.tooltip,
                                handle: i
                            };
                        }),
                    });
                }
            }
            this.update({
                items: pickItems,
            });
        }
        get canSelectMany() {
            return this._canSelectMany;
        }
        set canSelectMany(canSelectMany) {
            this._canSelectMany = canSelectMany;
            this.update({ canSelectMany });
        }
        get matchOnDescription() {
            return this._matchOnDescription;
        }
        set matchOnDescription(matchOnDescription) {
            this._matchOnDescription = matchOnDescription;
            this.update({ matchOnDescription });
        }
        get matchOnDetail() {
            return this._matchOnDetail;
        }
        set matchOnDetail(matchOnDetail) {
            this._matchOnDetail = matchOnDetail;
            this.update({ matchOnDetail });
        }
        get sortByLabel() {
            return this._sortByLabel;
        }
        set sortByLabel(sortByLabel) {
            this._sortByLabel = sortByLabel;
            this.update({ sortByLabel });
        }
        get keepScrollPosition() {
            return this._keepScrollPosition;
        }
        set keepScrollPosition(keepScrollPosition) {
            this._keepScrollPosition = keepScrollPosition;
            this.update({ keepScrollPosition });
        }
        get activeItems() {
            return this._activeItems;
        }
        set activeItems(activeItems) {
            this._activeItems = activeItems.filter(item => this._itemsToHandles.has(item));
            this.update({ activeItems: this._activeItems.map(item => this._itemsToHandles.get(item)) });
        }
        get selectedItems() {
            return this._selectedItems;
        }
        set selectedItems(selectedItems) {
            this._selectedItems = selectedItems.filter(item => this._itemsToHandles.has(item));
            this.update({ selectedItems: this._selectedItems.map(item => this._itemsToHandles.get(item)) });
        }
        _fireDidChangeActive(handles) {
            const items = coalesce(handles.map(handle => this._handlesToItems.get(handle)));
            this._activeItems = items;
            this._onDidChangeActiveEmitter.fire(items);
        }
        _fireDidChangeSelection(handles) {
            const items = coalesce(handles.map(handle => this._handlesToItems.get(handle)));
            this._selectedItems = items;
            this._onDidChangeSelectionEmitter.fire(items);
        }
        _fireDidTriggerItemButton(itemHandle, buttonHandle) {
            const item = this._handlesToItems.get(itemHandle);
            if (!item || !item.buttons || !item.buttons.length) {
                return;
            }
            const button = item.buttons[buttonHandle];
            if (button) {
                this._onDidTriggerItemButtonEmitter.fire({
                    button,
                    item
                });
            }
        }
    }
    class ExtHostInputBox extends ExtHostQuickInput {
        constructor(extension, onDispose) {
            super(extension, onDispose);
            this._password = false;
            this.update({ type: 'inputBox' });
        }
        get password() {
            return this._password;
        }
        set password(password) {
            this._password = password;
            this.update({ password });
        }
        get prompt() {
            return this._prompt;
        }
        set prompt(prompt) {
            this._prompt = prompt;
            this.update({ prompt });
        }
        get validationMessage() {
            return this._validationMessage;
        }
        set validationMessage(validationMessage) {
            this._validationMessage = validationMessage;
            if (!validationMessage) {
                this.update({ validationMessage: undefined, severity: Severity.Ignore });
            }
            else if (typeof validationMessage === 'string') {
                this.update({ validationMessage, severity: Severity.Error });
            }
            else {
                this.update({ validationMessage: validationMessage.message, severity: validationMessage.severity ?? Severity.Error });
            }
        }
    }
    return new ExtHostQuickOpenImpl(workspace, commands);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFF1aWNrT3Blbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0UXVpY2tPcGVuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFJekUsT0FBTyxFQUF1QyxXQUFXLEVBQWtGLE1BQU0sdUJBQXVCLENBQUM7QUFDekssT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFtQjVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxXQUF5QixFQUFFLFNBQW9DLEVBQUUsUUFBeUI7SUFDaEksTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FB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