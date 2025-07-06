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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lRXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVWaWV3cy9jb21tb24vdmlld3NXZWxjb21lRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUcxQyxNQUFNLENBQU4sSUFBWSxnQ0FNWDtBQU5ELFdBQVksZ0NBQWdDO0lBQzNDLGlEQUFhLENBQUE7SUFDYix5REFBcUIsQ0FBQTtJQUNyQixpREFBYSxDQUFBO0lBQ2IsbURBQWUsQ0FBQTtJQUNmLDZEQUF5QixDQUFBO0FBQzFCLENBQUMsRUFOVyxnQ0FBZ0MsS0FBaEMsZ0NBQWdDLFFBTTNDO0FBWUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQThCO0lBQzNELFVBQVUsRUFBRSw4QkFBOEI7SUFDMUMsT0FBTyxFQUFFLHlCQUF5QjtJQUNsQyxLQUFLLEVBQUUsZUFBZTtJQUN0QixTQUFTLEVBQUUsd0JBQXdCO0NBQ25DLENBQUM7QUFFRixNQUFNLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQStCO0lBQ3BGLElBQUksRUFBRSxPQUFPO0lBQ2IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsd1lBQXdZLENBQUM7SUFDL2IsS0FBSyxFQUFFO1FBQ04sSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxrREFBa0QsQ0FBQztRQUM5RyxRQUFRLEVBQUU7WUFDVCxnQ0FBZ0MsQ0FBQyxJQUFJO1lBQ3JDLGdDQUFnQyxDQUFDLFFBQVE7U0FDekM7UUFDRCxVQUFVLEVBQUU7WUFDWCxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN4QyxLQUFLLEVBQUU7b0JBQ047d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsdUZBQXVGLENBQUM7cUJBQ3hKO29CQUNEO3dCQUNDLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLHVGQUF1RixDQUFDO3dCQUN4SixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztxQkFDcEM7aUJBQ0Q7YUFDRDtZQUNELENBQUMsZ0NBQWdDLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzVDLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLG1IQUFtSCxDQUFDO2FBQ3hMO1lBQ0QsQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDeEMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLEVBQUUseURBQXlELENBQUM7YUFDMUg7WUFDRCxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN6QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSw0REFBNEQsQ0FBQzthQUM5SDtZQUNELENBQUMsZ0NBQWdDLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQzlDLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLGlGQUFpRixDQUFDO2FBQ3hKO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQztBQUVILE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHO0lBQ25ELGNBQWMsRUFBRSxjQUFjO0lBQzlCLFVBQVUsRUFBRSxnQ0FBZ0M7Q0FDNUMsQ0FBQyJ9