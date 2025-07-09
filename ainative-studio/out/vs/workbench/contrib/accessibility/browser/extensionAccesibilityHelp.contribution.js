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
import { DisposableMap, DisposableStore, Disposable } from '../../../../base/common/lifecycle.js';
import { ExtensionContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { Extensions } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
let ExtensionAccessibilityHelpDialogContribution = class ExtensionAccessibilityHelpDialogContribution extends Disposable {
    static { this.ID = 'extensionAccessibilityHelpDialogContribution'; }
    constructor(keybindingService) {
        super();
        this._viewHelpDialogMap = this._register(new DisposableMap());
        this._register(Registry.as(Extensions.ViewsRegistry).onViewsRegistered(e => {
            for (const view of e) {
                for (const viewDescriptor of view.views) {
                    if (viewDescriptor.accessibilityHelpContent) {
                        this._viewHelpDialogMap.set(viewDescriptor.id, registerAccessibilityHelpAction(keybindingService, viewDescriptor));
                    }
                }
            }
        }));
        this._register(Registry.as(Extensions.ViewsRegistry).onViewsDeregistered(e => {
            for (const viewDescriptor of e.views) {
                if (viewDescriptor.accessibilityHelpContent) {
                    this._viewHelpDialogMap.get(viewDescriptor.id)?.dispose();
                }
            }
        }));
    }
};
ExtensionAccessibilityHelpDialogContribution = __decorate([
    __param(0, IKeybindingService)
], ExtensionAccessibilityHelpDialogContribution);
export { ExtensionAccessibilityHelpDialogContribution };
function registerAccessibilityHelpAction(keybindingService, viewDescriptor) {
    const disposableStore = new DisposableStore();
    const content = viewDescriptor.accessibilityHelpContent?.value;
    if (!content) {
        throw new Error('No content provided for the accessibility help dialog');
    }
    disposableStore.add(AccessibleViewRegistry.register({
        priority: 95,
        name: viewDescriptor.id,
        type: "help" /* AccessibleViewType.Help */,
        when: FocusedViewContext.isEqualTo(viewDescriptor.id),
        getProvider: (accessor) => {
            const viewsService = accessor.get(IViewsService);
            return new ExtensionContentProvider(viewDescriptor.id, { type: "help" /* AccessibleViewType.Help */ }, () => content, () => viewsService.openView(viewDescriptor.id, true));
        },
    }));
    disposableStore.add(keybindingService.onDidUpdateKeybindings(() => {
        disposableStore.clear();
        disposableStore.add(registerAccessibilityHelpAction(keybindingService, viewDescriptor));
    }));
    return disposableStore;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uQWNjZXNpYmlsaXR5SGVscC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2V4dGVuc2lvbkFjY2VzaWJpbGl0eUhlbHAuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQWUsZUFBZSxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRS9HLE9BQU8sRUFBc0Isd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUM1SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUM5RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFrQixVQUFVLEVBQW1CLE1BQU0sMEJBQTBCLENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXhFLElBQU0sNENBQTRDLEdBQWxELE1BQU0sNENBQTZDLFNBQVEsVUFBVTthQUNwRSxPQUFFLEdBQUcsOENBQThDLEFBQWpELENBQWtEO0lBRTNELFlBQWdDLGlCQUFxQztRQUNwRSxLQUFLLEVBQUUsQ0FBQztRQUZELHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQXVCLENBQUMsQ0FBQztRQUdyRixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQWlCLFVBQVUs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