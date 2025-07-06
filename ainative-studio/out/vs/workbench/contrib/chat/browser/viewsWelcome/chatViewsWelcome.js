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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdzV2VsY29tZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci92aWV3c1dlbGNvbWUvY2hhdFZpZXdzV2VsY29tZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFLckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRS9FLE1BQU0sQ0FBTixJQUFrQiwwQkFFakI7QUFGRCxXQUFrQiwwQkFBMEI7SUFDM0MsK0ZBQWlFLENBQUE7QUFDbEUsQ0FBQyxFQUZpQiwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBRTNDO0FBZUQsTUFBTSxvQ0FBb0M7SUFBMUM7UUFDa0IsZ0JBQVcsR0FBa0MsRUFBRSxDQUFDO1FBQ2hELGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUNwQyxnQkFBVyxHQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztJQVVwRSxDQUFDO0lBUk8sUUFBUSxDQUFDLFVBQXVDO1FBQ3RELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVNLEdBQUc7UUFDVCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxvQ0FBb0MsRUFBRSxDQUFDO0FBQ25GLFFBQVEsQ0FBQyxHQUFHLG1HQUFzRCx3QkFBd0IsQ0FBQyxDQUFDIn0=