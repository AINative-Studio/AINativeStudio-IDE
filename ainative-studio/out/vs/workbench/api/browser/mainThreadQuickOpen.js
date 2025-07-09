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
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { URI } from '../../../base/common/uri.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
function reviveIconPathUris(iconPath) {
    iconPath.dark = URI.revive(iconPath.dark);
    if (iconPath.light) {
        iconPath.light = URI.revive(iconPath.light);
    }
}
let MainThreadQuickOpen = class MainThreadQuickOpen {
    constructor(extHostContext, quickInputService) {
        this._items = {};
        // ---- QuickInput
        this.sessions = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostQuickOpen);
        this._quickInputService = quickInputService;
    }
    dispose() {
        for (const [_id, session] of this.sessions) {
            session.store.dispose();
        }
    }
    $show(instance, options, token) {
        const contents = new Promise((resolve, reject) => {
            this._items[instance] = { resolve, reject };
        });
        options = {
            ...options,
            onDidFocus: el => {
                if (el) {
                    this._proxy.$onItemSelected(el.handle);
                }
            }
        };
        if (options.canPickMany) {
            return this._quickInputService.pick(contents, options, token).then(items => {
                if (items) {
                    return items.map(item => item.handle);
                }
                return undefined;
            });
        }
        else {
            return this._quickInputService.pick(contents, options, token).then(item => {
                if (item) {
                    return item.handle;
                }
                return undefined;
            });
        }
    }
    $setItems(instance, items) {
        if (this._items[instance]) {
            this._items[instance].resolve(items);
            delete this._items[instance];
        }
        return Promise.resolve();
    }
    $setError(instance, error) {
        if (this._items[instance]) {
            this._items[instance].reject(error);
            delete this._items[instance];
        }
        return Promise.resolve();
    }
    // ---- input
    $input(options, validateInput, token) {
        const inputOptions = Object.create(null);
        if (options) {
            inputOptions.title = options.title;
            inputOptions.password = options.password;
            inputOptions.placeHolder = options.placeHolder;
            inputOptions.valueSelection = options.valueSelection;
            inputOptions.prompt = options.prompt;
            inputOptions.value = options.value;
            inputOptions.ignoreFocusLost = options.ignoreFocusOut;
        }
        if (validateInput) {
            inputOptions.validateInput = (value) => {
                return this._proxy.$validateInput(value);
            };
        }
        return this._quickInputService.input(inputOptions, token);
    }
    $createOrUpdate(params) {
        const sessionId = params.id;
        let session = this.sessions.get(sessionId);
        if (!session) {
            const store = new DisposableStore();
            const input = params.type === 'quickPick' ? this._quickInputService.createQuickPick() : this._quickInputService.createInputBox();
            store.add(input);
            store.add(input.onDidAccept(() => {
                this._proxy.$onDidAccept(sessionId);
            }));
            store.add(input.onDidTriggerButton(button => {
                this._proxy.$onDidTriggerButton(sessionId, button.handle);
            }));
            store.add(input.onDidChangeValue(value => {
                this._proxy.$onDidChangeValue(sessionId, value);
            }));
            store.add(input.onDidHide(() => {
                this._proxy.$onDidHide(sessionId);
            }));
            if (params.type === 'quickPick') {
                // Add extra events specific for quickpick
                const quickpick = input;
                store.add(quickpick.onDidChangeActive(items => {
                    this._proxy.$onDidChangeActive(sessionId, items.map(item => item.handle));
                }));
                store.add(quickpick.onDidChangeSelection(items => {
                    this._proxy.$onDidChangeSelection(sessionId, items.map(item => item.handle));
                }));
                store.add(quickpick.onDidTriggerItemButton((e) => {
                    this._proxy.$onDidTriggerItemButton(sessionId, e.item.handle, e.button.handle);
                }));
            }
            session = {
                input,
                handlesToItems: new Map(),
                store
            };
            this.sessions.set(sessionId, session);
        }
        const { input, handlesToItems } = session;
        for (const param in params) {
            if (param === 'id' || param === 'type') {
                continue;
            }
            if (param === 'visible') {
                if (params.visible) {
                    input.show();
                }
                else {
                    input.hide();
                }
            }
            else if (param === 'items') {
                handlesToItems.clear();
                params[param].forEach((item) => {
                    if (item.type === 'separator') {
                        return;
                    }
                    if (item.buttons) {
                        item.buttons = item.buttons.map((button) => {
                            if (button.iconPath) {
                                reviveIconPathUris(button.iconPath);
                            }
                            return button;
                        });
                    }
                    handlesToItems.set(item.handle, item);
                });
                input[param] = params[param];
            }
            else if (param === 'activeItems' || param === 'selectedItems') {
                input[param] = params[param]
                    .filter((handle) => handlesToItems.has(handle))
                    .map((handle) => handlesToItems.get(handle));
            }
            else if (param === 'buttons') {
                input[param] = params.buttons.map(button => {
                    if (button.handle === -1) {
                        return this._quickInputService.backButton;
                    }
                    if (button.iconPath) {
                        reviveIconPathUris(button.iconPath);
                    }
                    return button;
                });
            }
            else {
                input[param] = params[param];
            }
        }
        return Promise.resolve(undefined);
    }
    $dispose(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.store.dispose();
            this.sessions.delete(sessionId);
        }
        return Promise.resolve(undefined);
    }
};
MainThreadQuickOpen = __decorate([
    extHostNamedCustomer(MainContext.MainThreadQuickOpen),
    __param(1, IQuickInputService)
], MainThreadQuickOpen);
export { MainThreadQuickOpen };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFF1aWNrT3Blbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFF1aWNrT3Blbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQStCLGtCQUFrQixFQUEyQyxNQUFNLG1EQUFtRCxDQUFDO0FBQzdKLE9BQU8sRUFBRSxjQUFjLEVBQTBFLFdBQVcsRUFBb0csTUFBTSwrQkFBK0IsQ0FBQztBQUN0UCxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQVFwRSxTQUFTLGtCQUFrQixDQUFDLFFBQWdEO0lBQzNFLFFBQVEsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsUUFBUSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QyxDQUFDO0FBQ0YsQ0FBQztBQUdNLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO0lBUy9CLFlBQ0MsY0FBK0IsRUFDWCxpQkFBcUM7UUFQekMsV0FBTSxHQUdsQixFQUFFLENBQUM7UUF1RlIsa0JBQWtCO1FBRVYsYUFBUSxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFDO1FBbkZ2RCxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGdCQUFnQixD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