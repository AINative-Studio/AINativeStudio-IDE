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
var HelpQuickAccessProvider_1;
import { localize } from '../../../nls.js';
import { Registry } from '../../registry/common/platform.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { Extensions } from '../common/quickAccess.js';
import { IQuickInputService } from '../common/quickInput.js';
let HelpQuickAccessProvider = class HelpQuickAccessProvider {
    static { HelpQuickAccessProvider_1 = this; }
    static { this.PREFIX = '?'; }
    constructor(quickInputService, keybindingService) {
        this.quickInputService = quickInputService;
        this.keybindingService = keybindingService;
        this.registry = Registry.as(Extensions.Quickaccess);
    }
    provide(picker) {
        const disposables = new DisposableStore();
        // Open a picker with the selected value if picked
        disposables.add(picker.onDidAccept(() => {
            const [item] = picker.selectedItems;
            if (item) {
                this.quickInputService.quickAccess.show(item.prefix, { preserveValue: true });
            }
        }));
        // Also open a picker when we detect the user typed the exact
        // name of a provider (e.g. `?term` for terminals)
        disposables.add(picker.onDidChangeValue(value => {
            const providerDescriptor = this.registry.getQuickAccessProvider(value.substr(HelpQuickAccessProvider_1.PREFIX.length));
            if (providerDescriptor && providerDescriptor.prefix && providerDescriptor.prefix !== HelpQuickAccessProvider_1.PREFIX) {
                this.quickInputService.quickAccess.show(providerDescriptor.prefix, { preserveValue: true });
            }
        }));
        // Fill in all providers
        picker.items = this.getQuickAccessProviders().filter(p => p.prefix !== HelpQuickAccessProvider_1.PREFIX);
        return disposables;
    }
    getQuickAccessProviders() {
        const providers = this.registry
            .getQuickAccessProviders()
            .sort((providerA, providerB) => providerA.prefix.localeCompare(providerB.prefix))
            .flatMap(provider => this.createPicks(provider));
        return providers;
    }
    createPicks(provider) {
        return provider.helpEntries.map(helpEntry => {
            const prefix = helpEntry.prefix || provider.prefix;
            const label = prefix || '\u2026' /* ... */;
            return {
                prefix,
                label,
                keybinding: helpEntry.commandId ? this.keybindingService.lookupKeybinding(helpEntry.commandId) : undefined,
                ariaLabel: localize('helpPickAriaLabel', "{0}, {1}", label, helpEntry.description),
                description: helpEntry.description
            };
        });
    }
};
HelpQuickAccessProvider = HelpQuickAccessProvider_1 = __decorate([
    __param(0, IQuickInputService),
    __param(1, IKeybindingService)
], HelpQuickAccessProvider);
export { HelpQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9oZWxwUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQThFLE1BQU0sMEJBQTBCLENBQUM7QUFDbEksT0FBTyxFQUFFLGtCQUFrQixFQUE4QixNQUFNLHlCQUF5QixDQUFDO0FBTWxGLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCOzthQUU1QixXQUFNLEdBQUcsR0FBRyxBQUFOLENBQU87SUFJcEIsWUFDcUIsaUJBQXNELEVBQ3RELGlCQUFzRDtRQURyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3JDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFKMUQsYUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUtsRixDQUFDO0lBRUwsT0FBTyxDQUFDLE1BQXFFO1FBQzVFLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFMUMsa0RBQWtEO1FBQ2xELFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDdkMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0s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