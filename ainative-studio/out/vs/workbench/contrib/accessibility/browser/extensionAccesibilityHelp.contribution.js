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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uQWNjZXNpYmlsaXR5SGVscC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9leHRlbnNpb25BY2Nlc2liaWxpdHlIZWxwLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFlLGVBQWUsRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUvRyxPQUFPLEVBQXNCLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDNUgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDOUcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBa0IsVUFBVSxFQUFtQixNQUFNLDBCQUEwQixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV4RSxJQUFNLDRDQUE0QyxHQUFsRCxNQUFNLDRDQUE2QyxTQUFRLFVBQVU7YUFDcEUsT0FBRSxHQUFHLDhDQUE4QyxBQUFqRCxDQUFrRDtJQUUzRCxZQUFnQyxpQkFBcUM7UUFDcEUsS0FBSyxFQUFFLENBQUM7UUFGRCx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUF1QixDQUFDLENBQUM7UUFHckYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFpQixV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