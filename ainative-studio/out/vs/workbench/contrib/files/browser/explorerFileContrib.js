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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2V4cGxvcmVyRmlsZUNvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBSTNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxNQUFNLENBQU4sSUFBa0Isa0JBRWpCO0FBRkQsV0FBa0Isa0JBQWtCO0lBQ25DLGdHQUEwRSxDQUFBO0FBQzNFLENBQUMsRUFGaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUVuQztBQXlCRCxNQUFNLGdDQUFnQztJQUF0QztRQUNrQiw2QkFBd0IsR0FBRyxJQUFJLE9BQU8sRUFBdUMsQ0FBQztRQUMvRSw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDO1FBRTdELGdCQUFXLEdBQTBDLEVBQUUsQ0FBQztJQWtCMUUsQ0FBQztJQWhCQSxrQkFBa0I7SUFDWCxRQUFRLENBQUMsVUFBK0M7UUFDOUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsS0FBNEIsRUFBRSxTQUFzQixFQUFFLEtBQXNCO1FBQ3pGLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDL0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDckMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNiLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLGdDQUFnQyxFQUFFLENBQUM7QUFDbEYsUUFBUSxDQUFDLEdBQUcsb0dBQThDLDJCQUEyQixDQUFDLENBQUMifQ==