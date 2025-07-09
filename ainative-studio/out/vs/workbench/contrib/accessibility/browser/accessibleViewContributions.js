/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { accessibleViewIsShown } from './accessibilityConfiguration.js';
import { AccessibilityHelpAction, AccessibleViewAction } from './accessibleViewActions.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
export class AccesibleViewHelpContribution extends Disposable {
    constructor() {
        super();
        this._register(AccessibilityHelpAction.addImplementation(115, 'accessible-view-help', accessor => {
            accessor.get(IAccessibleViewService).showAccessibleViewHelp();
            return true;
        }, accessibleViewIsShown));
    }
}
export class AccesibleViewContributions extends Disposable {
    constructor() {
        super();
        AccessibleViewRegistry.getImplementations().forEach(impl => {
            const implementation = (accessor) => {
                const provider = impl.getProvider(accessor);
                if (!provider) {
                    return false;
                }
                try {
                    accessor.get(IAccessibleViewService).show(provider);
                    return true;
                }
                catch {
                    provider.dispose();
                    return false;
                }
            };
            if (impl.type === "view" /* AccessibleViewType.View */) {
                this._register(AccessibleViewAction.addImplementation(impl.priority, impl.name, implementation, impl.when));
            }
            else {
                this._register(AccessibilityHelpAction.addImplementation(impl.priority, impl.name, implementation, impl.when));
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdDb250cmlidXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmxlVmlld0NvbnRyaWJ1dGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzNGLE9BQU8sRUFBMkUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMvSyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUc5RyxNQUFNLE9BQU8sNkJBQThCLFNBQVEsVUFBVTtJQUU1RDtRQUNDLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLEVBQUU7WUFDaEcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDOUQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDO0lBQzVCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxVQUFVO0lBRXpEO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFDUixzQkFBc0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMxRCxNQUFNLGNBQWMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsRUFBRTtnQkFDckQsTUFBTSxRQUFRLEdBQXFFLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzlHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDZixPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO2dCQUNELElBQUksQ0FBQztvQkFDSixRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNwRCxPQUFPLElBQUksQ0FBQztnQkFDYixDQUFDO2dCQUFDLE1BQU0sQ0FBQztvQkFDUixRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ25CLE9BQU8sS0FBSyxDQUFDO2dCQUNkLENBQUM7WUFDRixDQUFDLENBQUM7WUFDRixJQUFJLElBQUksQ0FBQyxJQUFJLHlDQUE0QixFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUM3RyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2hILENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9