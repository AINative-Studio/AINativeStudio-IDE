/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
export var ChatViewsWelcomeExtensions;
(function (ChatViewsWelcomeExtensions) {
    ChatViewsWelcomeExtensions["ChatViewsWelcomeRegistry"] = "workbench.registry.chat.viewsWelcome";
})(ChatViewsWelcomeExtensions || (ChatViewsWelcomeExtensions = {}));
class ChatViewsWelcomeContributionRegistry {
    constructor() {
        this.descriptors = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    register(descriptor) {
        this.descriptors.push(descriptor);
        this._onDidChange.fire();
    }
    get() {
        return this.descriptors;
    }
}
export const chatViewsWelcomeRegistry = new ChatViewsWelcomeContributionRegistry();
Registry.add("workbench.registry.chat.viewsWelcome" /* ChatViewsWelcomeExtensions.ChatViewsWelcomeRegistry */, chatViewsWelcomeRegistry);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdzV2VsY29tZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvdmlld3NXZWxjb21lL2NoYXRWaWV3c1dlbGNvbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBS3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUvRSxNQUFNLENBQU4sSUFBa0IsMEJBRWpCO0FBRkQsV0FBa0IsMEJBQTBCO0lBQzNDLCtGQUFpRSxDQUFBO0FBQ2xFLENBQUMsRUFGaUIsMEJBQTBCLEtBQTFCLDBCQUEwQixRQUUzQztBQWVELE1BQU0sb0NBQW9DO0lBQTFDO1FBQ2tCLGdCQUFXLEdBQWtDLEVBQUUsQ0FBQztRQUNoRCxpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDcEMsZ0JBQVcsR0FBZ0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7SUFVcEUsQ0FBQztJQVJPLFFBQVEsQ0FBQyxVQUF1QztRQUN0RCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTSxHQUFHO1FBQ1QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLElBQUksb0NBQW9DLEVBQUUsQ0FBQztBQUNuRixRQUFRLENBQUMsR0FBRyxtR0FBc0Qsd0JBQXdCLENBQUMsQ0FBQyJ9