/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export var ExplorerExtensions;
(function (ExplorerExtensions) {
    ExplorerExtensions["FileContributionRegistry"] = "workbench.registry.explorer.fileContributions";
})(ExplorerExtensions || (ExplorerExtensions = {}));
class ExplorerFileContributionRegistry {
    constructor() {
        this._onDidRegisterDescriptor = new Emitter();
        this.onDidRegisterDescriptor = this._onDidRegisterDescriptor.event;
        this.descriptors = [];
    }
    /** @inheritdoc */
    register(descriptor) {
        this.descriptors.push(descriptor);
        this._onDidRegisterDescriptor.fire(descriptor);
    }
    /**
     * Creates a new instance of all registered contributions.
     */
    create(insta, container, store) {
        return this.descriptors.map(d => {
            const i = d.create(insta, container);
            store.add(i);
            return i;
        });
    }
}
export const explorerFileContribRegistry = new ExplorerFileContributionRegistry();
Registry.add("workbench.registry.explorer.fileContributions" /* ExplorerExtensions.FileContributionRegistry */, explorerFileContribRegistry);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZXhwbG9yZXJGaWxlQ29udHJpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLE1BQU0sQ0FBTixJQUFrQixrQkFFakI7QUFGRCxXQUFrQixrQkFBa0I7SUFDbkMsZ0dBQTBFLENBQUE7QUFDM0UsQ0FBQyxFQUZpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBRW5DO0FBeUJELE1BQU0sZ0NBQWdDO0lBQXRDO1FBQ2tCLDZCQUF3QixHQUFHLElBQUksT0FBTyxFQUF1QyxDQUFDO1FBQy9FLDRCQUF1QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUM7UUFFN0QsZ0JBQVcsR0FBMEMsRUFBRSxDQUFDO0lBa0IxRSxDQUFDO0lBaEJBLGtCQUFrQjtJQUNYLFFBQVEsQ0FBQyxVQUErQztRQUM5RCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxLQUE0QixFQUFFLFNBQXNCLEVBQUUsS0FBc0I7UUFDekYsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMvQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNyQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2IsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLElBQUksZ0NBQWdDLEVBQUUsQ0FBQztBQUNsRixRQUFRLENBQUMsR0FBRyxvR0FBOEMsMkJBQTJCLENBQUMsQ0FBQyJ9