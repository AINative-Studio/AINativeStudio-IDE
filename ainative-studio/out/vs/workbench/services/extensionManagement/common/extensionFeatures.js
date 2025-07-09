/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export var Extensions;
(function (Extensions) {
    Extensions.ExtensionFeaturesRegistry = 'workbench.registry.extensionFeatures';
})(Extensions || (Extensions = {}));
export const IExtensionFeaturesManagementService = createDecorator('IExtensionFeaturesManagementService');
class ExtensionFeaturesRegistry {
    constructor() {
        this.extensionFeatures = new Map();
    }
    registerExtensionFeature(descriptor) {
        if (this.extensionFeatures.has(descriptor.id)) {
            throw new Error(`Extension feature with id '${descriptor.id}' already exists`);
        }
        this.extensionFeatures.set(descriptor.id, descriptor);
        return {
            dispose: () => this.extensionFeatures.delete(descriptor.id)
        };
    }
    getExtensionFeature(id) {
        return this.extensionFeatures.get(id);
    }
    getExtensionFeatures() {
        return Array.from(this.extensionFeatures.values());
    }
}
Registry.add(Extensions.ExtensionFeaturesRegistry, new ExtensionFeaturesRegistry());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbkZlYXR1cmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFTNUUsTUFBTSxLQUFXLFVBQVUsQ0FFMUI7QUFGRCxXQUFpQixVQUFVO0lBQ2Isb0NBQXlCLEdBQUcsc0NBQXNDLENBQUM7QUFDakYsQ0FBQyxFQUZnQixVQUFVLEtBQVYsVUFBVSxRQUUxQjtBQW9FRCxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyxlQUFlLENBQXNDLHFDQUFxQyxDQUFDLENBQUM7QUFpQi9JLE1BQU0seUJBQXlCO0lBQS9CO1FBRWtCLHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFDO0lBbUJyRixDQUFDO0lBakJBLHdCQUF3QixDQUFDLFVBQXVDO1FBQy9ELElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixVQUFVLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEQsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7U0FDM0QsQ0FBQztJQUNILENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxFQUFVO1FBQzdCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUNwRCxDQUFDO0NBQ0Q7QUFFRCxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLHlCQUF5QixFQUFFLENBQUMsQ0FBQyJ9