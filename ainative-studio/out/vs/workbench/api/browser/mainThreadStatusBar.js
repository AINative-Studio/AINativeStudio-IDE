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
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { IExtensionStatusBarItemService } from './statusBarExtensionPoint.js';
let MainThreadStatusBar = class MainThreadStatusBar {
    constructor(extHostContext, statusbarService) {
        this.statusbarService = statusbarService;
        this._store = new DisposableStore();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostStatusBar);
        // once, at startup read existing items and send them over
        const entries = [];
        for (const [entryId, item] of statusbarService.getEntries()) {
            entries.push(asDto(entryId, item));
        }
        this._proxy.$acceptStaticEntries(entries);
        this._store.add(statusbarService.onDidChange(e => {
            if (e.added) {
                this._proxy.$acceptStaticEntries([asDto(e.added[0], e.added[1])]);
            }
        }));
        function asDto(entryId, item) {
            return {
                entryId,
                name: item.entry.name,
                text: item.entry.text,
                tooltip: item.entry.tooltip,
                command: typeof item.entry.command === 'string' ? item.entry.command : typeof item.entry.command === 'object' ? item.entry.command.id : undefined,
                priority: item.priority,
                alignLeft: item.alignment === 0 /* StatusbarAlignment.LEFT */,
                accessibilityInformation: item.entry.ariaLabel ? { label: item.entry.ariaLabel, role: item.entry.role } : undefined
            };
        }
    }
    dispose() {
        this._store.dispose();
    }
    $setEntry(entryId, id, extensionId, name, text, tooltip, hasTooltipProvider, command, color, backgroundColor, alignLeft, priority, accessibilityInformation) {
        const tooltipOrTooltipProvider = hasTooltipProvider
            ? {
                markdown: (cancellation) => {
                    return this._proxy.$provideTooltip(entryId, cancellation);
                },
                markdownNotSupportedFallback: undefined
            }
            : tooltip;
        const kind = this.statusbarService.setOrUpdateEntry(entryId, id, extensionId, name, text, tooltipOrTooltipProvider, command, color, backgroundColor, alignLeft, priority, accessibilityInformation);
        if (kind === 0 /* StatusBarUpdateKind.DidDefine */) {
            this._store.add(toDisposable(() => this.statusbarService.unsetEntry(entryId)));
        }
    }
    $disposeEntry(entryId) {
        this.statusbarService.unsetEntry(entryId);
    }
};
MainThreadStatusBar = __decorate([
    extHostNamedCustomer(MainContext.MainThreadStatusBar),
    __param(1, IExtensionStatusBarItemService)
], MainThreadStatusBar);
export { MainThreadStatusBar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFN0YXR1c0Jhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkU3RhdHVzQmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBNEIsV0FBVyxFQUFFLGNBQWMsRUFBMkMsTUFBTSwrQkFBK0IsQ0FBQztBQUUvSSxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUlsRixPQUFPLEVBQUUsOEJBQThCLEVBQXVCLE1BQU0sOEJBQThCLENBQUM7QUFNNUYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFLL0IsWUFDQyxjQUErQixFQUNDLGdCQUFpRTtRQUFoRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWdDO1FBSmpGLFdBQU0sR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBTS9DLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUV2RSwwREFBMEQ7UUFDMUQsTUFBTSxPQUFPLEdBQXVCLEVBQUUsQ0FBQztRQUN2QyxLQUFLLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUM3RCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUxQyxJQUFJ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