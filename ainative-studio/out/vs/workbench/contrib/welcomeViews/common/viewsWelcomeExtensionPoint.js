/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
export var ViewsWelcomeExtensionPointFields;
(function (ViewsWelcomeExtensionPointFields) {
    ViewsWelcomeExtensionPointFields["view"] = "view";
    ViewsWelcomeExtensionPointFields["contents"] = "contents";
    ViewsWelcomeExtensionPointFields["when"] = "when";
    ViewsWelcomeExtensionPointFields["group"] = "group";
    ViewsWelcomeExtensionPointFields["enablement"] = "enablement";
})(ViewsWelcomeExtensionPointFields || (ViewsWelcomeExtensionPointFields = {}));
export const ViewIdentifierMap = {
    'explorer': 'workbench.explorer.emptyView',
    'debug': 'workbench.debug.welcome',
    'scm': 'workbench.scm',
    'testing': 'workbench.view.testing'
};
const viewsWelcomeExtensionPointSchema = Object.freeze({
    type: 'array',
    description: nls.localize('contributes.viewsWelcome', "Contributed views welcome content. Welcome content will be rendered in tree based views whenever they have no meaningful content to display, ie. the File Explorer when no folder is open. Such content is useful as in-product documentation to drive users to use certain features before they are available. A good example would be a `Clone Repository` button in the File Explorer welcome view."),
    items: {
        type: 'object',
        description: nls.localize('contributes.viewsWelcome.view', "Contributed welcome content for a specific view."),
        required: [
            ViewsWelcomeExtensionPointFields.view,
            ViewsWelcomeExtensionPointFields.contents
        ],
        properties: {
            [ViewsWelcomeExtensionPointFields.view]: {
                anyOf: [
                    {
                        type: 'string',
                        description: nls.localize('contributes.viewsWelcome.view.view', "Target view identifier for this welcome content. Only tree based views are supported.")
                    },
                    {
                        type: 'string',
                        description: nls.localize('contributes.viewsWelcome.view.view', "Target view identifier for this welcome content. Only tree based views are supported."),
                        enum: Object.keys(ViewIdentifierMap)
                    }
                ]
            },
            [ViewsWelcomeExtensionPointFields.contents]: {
                type: 'string',
                description: nls.localize('contributes.viewsWelcome.view.contents', "Welcome content to be displayed. The format of the contents is a subset of Markdown, with support for links only."),
            },
            [ViewsWelcomeExtensionPointFields.when]: {
                type: 'string',
                description: nls.localize('contributes.viewsWelcome.view.when', "Condition when the welcome content should be displayed."),
            },
            [ViewsWelcomeExtensionPointFields.group]: {
                type: 'string',
                description: nls.localize('contributes.viewsWelcome.view.group', "Group to which this welcome content belongs. Proposed API."),
            },
            [ViewsWelcomeExtensionPointFields.enablement]: {
                type: 'string',
                description: nls.localize('contributes.viewsWelcome.view.enablement', "Condition when the welcome content buttons and command links should be enabled."),
            },
        }
    }
});
export const viewsWelcomeExtensionPointDescriptor = {
    extensionPoint: 'viewsWelcome',
    jsonSchema: viewsWelcomeExtensionPointSchema
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lRXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZVZpZXdzL2NvbW1vbi92aWV3c1dlbGNvbWVFeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRzFDLE1BQU0sQ0FBTixJQUFZLGdDQU1YO0FBTkQsV0FBWSxnQ0FBZ0M7SUFDM0MsaURBQWEsQ0FBQTtJQUNiLHlEQUFxQixDQUFBO0lBQ3JCLGlEQUFhLENBQUE7SUFDYixtREFBZSxDQUFBO0lBQ2YsNkRBQXlCLENBQUE7QUFDMUIsQ0FBQyxFQU5XLGdDQUFnQyxLQUFoQyxnQ0FBZ0MsUUFNM0M7QUFZRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBOEI7SUFDM0QsVUFBVSxFQUFFLDhCQUE4QjtJQUMxQyxPQUFPLEVBQUUseUJBQXlCO0lBQ2xDLEtBQUssRUFBRSxlQUFlO0lBQ3RCLFNBQVMsRUFBRSx3QkFBd0I7Q0FDbkMsQ0FBQztBQUVGLE1BQU0sZ0NBQWdDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBK0I7SUFDcEYsSUFBSSxFQUFFLE9BQU87SUFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx3WUFBd1ksQ0FBQztJQUMvYixLQUFLLEVBQUU7UUFDTixJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLGtEQUFrRCxDQUFDO1FBQzlHLFFBQVEsRUFBRTtZQUNULGdDQUFnQyxDQUFDLElBQUk7WUFDckMsZ0NBQWdDLENBQUMsUUFBUTtTQUN6QztRQUNELFVBQVUsRUFBRTtZQUNYLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3hDLEtBQUssRUFBRTtvQkFDTjt3QkFDQyxJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSx1RkFBdUYsQ0FBQztxQkFDeEo7b0JBQ0Q7d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsdUZBQXVGLENBQUM7d0JBQ3hKLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO3FCQUNwQztpQkFDRDthQUNEO1lBQ0QsQ0FBQyxnQ0FBZ0MsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0NBQXdDLEVBQUUsbUhBQW1ILENBQUM7YUFDeEw7WUFDRCxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN4QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSx5REFBeUQsQ0FBQzthQUMxSDtZQUNELENBQUMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3pDLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLDREQUE0RCxDQUFDO2FBQzlIO1lBQ0QsQ0FBQyxnQ0FBZ0MsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMENBQTBDLEVBQUUsaUZBQWlGLENBQUM7YUFDeEo7U0FDRDtLQUNEO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUc7SUFDbkQsY0FBYyxFQUFFLGNBQWM7SUFDOUIsVUFBVSxFQUFFLGdDQUFnQztDQUM1QyxDQUFDIn0=