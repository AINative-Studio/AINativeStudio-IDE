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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { checkProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
const chatViewsWelcomeExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatViewsWelcome',
    jsonSchema: {
        description: localize('vscode.extension.contributes.chatViewsWelcome', 'Contributes a welcome message to a chat view'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            properties: {
                icon: {
                    type: 'string',
                    description: localize('chatViewsWelcome.icon', 'The icon for the welcome message.'),
                },
                title: {
                    type: 'string',
                    description: localize('chatViewsWelcome.title', 'The title of the welcome message.'),
                },
                content: {
                    type: 'string',
                    description: localize('chatViewsWelcome.content', 'The content of the welcome message. The first command link will be rendered as a button.'),
                },
                when: {
                    type: 'string',
                    description: localize('chatViewsWelcome.when', 'Condition when the welcome message is shown.'),
                }
            }
        },
        required: ['icon', 'title', 'contents', 'when'],
    }
});
let ChatViewsWelcomeHandler = class ChatViewsWelcomeHandler {
    static { this.ID = 'workbench.contrib.chatViewsWelcomeHandler'; }
    constructor(logService) {
        this.logService = logService;
        chatViewsWelcomeExtensionPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                for (const providerDescriptor of extension.value) {
                    checkProposedApiEnabled(extension.description, 'chatParticipantPrivate');
                    const when = ContextKeyExpr.deserialize(providerDescriptor.when);
                    if (!when) {
                        this.logService.error(`Could not deserialize 'when' clause for chatViewsWelcome contribution: ${providerDescriptor.when}`);
                        continue;
                    }
                    const descriptor = {
                        ...providerDescriptor,
                        when,
                        icon: ThemeIcon.fromString(providerDescriptor.icon),
                        content: new MarkdownString(providerDescriptor.content, { isTrusted: true }), // private API with command links
                    };
                    Registry.as("workbench.registry.chat.viewsWelcome" /* ChatViewsWelcomeExtensions.ChatViewsWelcomeRegistry */).register(descriptor);
                }
            }
        });
    }
};
ChatViewsWelcomeHandler = __decorate([
    __param(0, ILogService)
], ChatViewsWelcomeHandler);
export { ChatViewsWelcomeHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdzV2VsY29tZUhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3ZpZXdzV2VsY29tZS9jaGF0Vmlld3NXZWxjb21lSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUvRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRixPQUFPLEtBQUssa0JBQWtCLE1BQU0sOERBQThELENBQUM7QUFVbkcsTUFBTSw4QkFBOEIsR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBcUM7SUFDdkksY0FBYyxFQUFFLGtCQUFrQjtJQUNsQyxVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsUUFBUSxDQUFDLCtDQUErQyxFQUFFLDhDQUE4QyxDQUFDO1FBQ3RILElBQUksRUFBRSxPQUFPO1FBQ2IsS0FBSyxFQUFFO1lBQ04sb0JBQW9CLEVBQUUsS0FBSztZQUMzQixJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxJQUFJLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxtQ0FBbUMsQ0FBQztpQkFDbkY7Z0JBQ0QsS0FBSyxFQUFFO29CQUNOLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsbUNBQW1DLENBQUM7aUJBQ3BGO2dCQUNELE9BQU8sRUFBRTtvQkFDUixJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLDBGQUEwRixDQUFDO2lCQUM3STtnQkFDRCxJQUFJLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSw4Q0FBOEMsQ0FBQztpQkFDOUY7YUFDRDtTQUNEO1FBQ0QsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDO0tBQy9DO0NBQ0QsQ0FBQyxDQUFDO0FBRUksSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7YUFFbkIsT0FBRSxHQUFHLDJDQUEyQyxBQUE5QyxDQUErQztJQUVqRSxZQUMrQixVQUF1QjtRQUF2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRXJELDhCQUE4QixDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUMvRCxLQUFLLE1BQU0sU0FBUyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckMsS0FBSyxNQUFNLGtCQUFrQixJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDbEQsdUJBQXVCLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO29CQUV6RSxNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNqRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQ1gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsMEVBQTBFLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7d0JBQzNILFNBQVM7b0JBQ1YsQ0FBQztvQkFFRCxNQUFNLFVBQVUsR0FBZ0M7d0JBQy9DLEdBQUcsa0JBQWtCO3dCQUNyQixJQUFJO3dCQUNKLElBQUksRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQzt3QkFDbkQsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLGlDQUFpQztxQkFDL0csQ0FBQztvQkFDRixRQUFRLENBQUMsRUFBRSxrR0FBNEYsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzlILENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDOztBQTVCVyx1QkFBdUI7SUFLakMsV0FBQSxXQUFXLENBQUE7R0FMRCx1QkFBdUIsQ0E2Qm5DIn0=