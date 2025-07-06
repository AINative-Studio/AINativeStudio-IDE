/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
const titleTranslated = localize('title', "Title");
export const walkthroughsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'walkthroughs',
    jsonSchema: {
        description: localize('walkthroughs', "Contribute walkthroughs to help users getting started with your extension."),
        type: 'array',
        items: {
            type: 'object',
            required: ['id', 'title', 'description', 'steps'],
            defaultSnippets: [{ body: { 'id': '$1', 'title': '$2', 'description': '$3', 'steps': [] } }],
            properties: {
                id: {
                    type: 'string',
                    description: localize('walkthroughs.id', "Unique identifier for this walkthrough."),
                },
                title: {
                    type: 'string',
                    description: localize('walkthroughs.title', "Title of walkthrough.")
                },
                icon: {
                    type: 'string',
                    description: localize('walkthroughs.icon', "Relative path to the icon of the walkthrough. The path is relative to the extension location. If not specified, the icon defaults to the extension icon if available."),
                },
                description: {
                    type: 'string',
                    description: localize('walkthroughs.description', "Description of walkthrough.")
                },
                featuredFor: {
                    type: 'array',
                    description: localize('walkthroughs.featuredFor', "Walkthroughs that match one of these glob patterns appear as 'featured' in workspaces with the specified files. For example, a walkthrough for TypeScript projects might specify `tsconfig.json` here."),
                    items: {
                        type: 'string'
                    },
                },
                when: {
                    type: 'string',
                    description: localize('walkthroughs.when', "Context key expression to control the visibility of this walkthrough.")
                },
                steps: {
                    type: 'array',
                    description: localize('walkthroughs.steps', "Steps to complete as part of this walkthrough."),
                    items: {
                        type: 'object',
                        required: ['id', 'title', 'media'],
                        defaultSnippets: [{
                                body: {
                                    'id': '$1', 'title': '$2', 'description': '$3',
                                    'completionEvents': ['$5'],
                                    'media': {},
                                }
                            }],
                        properties: {
                            id: {
                                type: 'string',
                                description: localize('walkthroughs.steps.id', "Unique identifier for this step. This is used to keep track of which steps have been completed."),
                            },
                            title: {
                                type: 'string',
                                description: localize('walkthroughs.steps.title', "Title of step.")
                            },
                            description: {
                                type: 'string',
                                description: localize('walkthroughs.steps.description.interpolated', "Description of step. Supports ``preformatted``, __italic__, and **bold** text. Use markdown-style links for commands or external links: {0}, {1}, or {2}. Links on their own line will be rendered as buttons.", `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`)
                            },
                            button: {
                                deprecationMessage: localize('walkthroughs.steps.button.deprecated.interpolated', "Deprecated. Use markdown links in the description instead, i.e. {0}, {1}, or {2}", `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`),
                            },
                            media: {
                                type: 'object',
                                description: localize('walkthroughs.steps.media', "Media to show alongside this step, either an image or markdown content."),
                                oneOf: [
                                    {
                                        required: ['image', 'altText'],
                                        additionalProperties: false,
                                        properties: {
                                            path: {
                                                deprecationMessage: localize('pathDeprecated', "Deprecated. Please use `image` or `markdown` instead")
                                            },
                                            image: {
                                                description: localize('walkthroughs.steps.media.image.path.string', "Path to an image - or object consisting of paths to light, dark, and hc images - relative to extension directory. Depending on context, the image will be displayed from 400px to 800px wide, with similar bounds on height. To support HIDPI displays, the image will be rendered at 1.5x scaling, for example a 900 physical pixels wide image will be displayed as 600 logical pixels wide."),
                                                oneOf: [
                                                    {
                                                        type: 'string',
                                                    },
                                                    {
                                                        type: 'object',
                                                        required: ['dark', 'light', 'hc', 'hcLight'],
                                                        properties: {
                                                            dark: {
                                                                description: localize('walkthroughs.steps.media.image.path.dark.string', "Path to the image for dark themes, relative to extension directory."),
                                                                type: 'string',
                                                            },
                                                            light: {
                                                                description: localize('walkthroughs.steps.media.image.path.light.string', "Path to the image for light themes, relative to extension directory."),
                                                                type: 'string',
                                                            },
                                                            hc: {
                                                                description: localize('walkthroughs.steps.media.image.path.hc.string', "Path to the image for hc themes, relative to extension directory."),
                                                                type: 'string',
                                                            },
                                                            hcLight: {
                                                                description: localize('walkthroughs.steps.media.image.path.hcLight.string', "Path to the image for hc light themes, relative to extension directory."),
                                                                type: 'string',
                                                            }
                                                        }
                                                    }
                                                ]
                                            },
                                            altText: {
                                                type: 'string',
                                                description: localize('walkthroughs.steps.media.altText', "Alternate text to display when the image cannot be loaded or in screen readers.")
                                            }
                                        }
                                    },
                                    {
                                        required: ['svg', 'altText'],
                                        additionalProperties: false,
                                        properties: {
                                            svg: {
                                                description: localize('walkthroughs.steps.media.image.path.svg', "Path to an svg, color tokens are supported in variables to support theming to match the workbench."),
                                                type: 'string',
                                            },
                                            altText: {
                                                type: 'string',
                                                description: localize('walkthroughs.steps.media.altText', "Alternate text to display when the image cannot be loaded or in screen readers.")
                                            },
                                        }
                                    },
                                    {
                                        required: ['markdown'],
                                        additionalProperties: false,
                                        properties: {
                                            path: {
                                                deprecationMessage: localize('pathDeprecated', "Deprecated. Please use `image` or `markdown` instead")
                                            },
                                            markdown: {
                                                description: localize('walkthroughs.steps.media.markdown.path', "Path to the markdown document, relative to extension directory."),
                                                type: 'string',
                                            }
                                        }
                                    }
                                ]
                            },
                            completionEvents: {
                                description: localize('walkthroughs.steps.completionEvents', "Events that should trigger this step to become checked off. If empty or not defined, the step will check off when any of the step's buttons or links are clicked; if the step has no buttons or links it will check on when it is selected."),
                                type: 'array',
                                items: {
                                    type: 'string',
                                    defaultSnippets: [
                                        {
                                            label: 'onCommand',
                                            description: localize('walkthroughs.steps.completionEvents.onCommand', 'Check off step when a given command is executed anywhere in VS Code.'),
                                            body: 'onCommand:${1:commandId}'
                                        },
                                        {
                                            label: 'onLink',
                                            description: localize('walkthroughs.steps.completionEvents.onLink', 'Check off step when a given link is opened via a walkthrough step.'),
                                            body: 'onLink:${2:linkId}'
                                        },
                                        {
                                            label: 'onView',
                                            description: localize('walkthroughs.steps.completionEvents.onView', 'Check off step when a given view is opened'),
                                            body: 'onView:${2:viewId}'
                                        },
                                        {
                                            label: 'onSettingChanged',
                                            description: localize('walkthroughs.steps.completionEvents.onSettingChanged', 'Check off step when a given setting is changed'),
                                            body: 'onSettingChanged:${2:settingName}'
                                        },
                                        {
                                            label: 'onContext',
                                            description: localize('walkthroughs.steps.completionEvents.onContext', 'Check off step when a context key expression is true.'),
                                            body: 'onContext:${2:key}'
                                        },
                                        {
                                            label: 'onExtensionInstalled',
                                            description: localize('walkthroughs.steps.completionEvents.extensionInstalled', 'Check off step when an extension with the given id is installed. If the extension is already installed, the step will start off checked.'),
                                            body: 'onExtensionInstalled:${3:extensionId}'
                                        },
                                        {
                                            label: 'onStepSelected',
                                            description: localize('walkthroughs.steps.completionEvents.stepSelected', 'Check off step as soon as it is selected.'),
                                            body: 'onStepSelected'
                                        },
                                    ]
                                }
                            },
                            doneOn: {
                                description: localize('walkthroughs.steps.doneOn', "Signal to mark step as complete."),
                                deprecationMessage: localize('walkthroughs.steps.doneOn.deprecation', "doneOn is deprecated. By default steps will be checked off when their buttons are clicked, to configure further use completionEvents"),
                                type: 'object',
                                required: ['command'],
                                defaultSnippets: [{ 'body': { command: '$1' } }],
                                properties: {
                                    'command': {
                                        description: localize('walkthroughs.steps.oneOn.command', "Mark step done when the specified command is executed."),
                                        type: 'string'
                                    }
                                },
                            },
                            when: {
                                type: 'string',
                                description: localize('walkthroughs.steps.when', "Context key expression to control the visibility of this step.")
                            }
                        }
                    }
                }
            }
        }
    },
    activationEventsGenerator: (walkthroughContributions, result) => {
        for (const walkthroughContribution of walkthroughContributions) {
            if (walkthroughContribution.id) {
                result.push(`onWalkthrough:${walkthroughContribution.id}`);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWRFeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFL0YsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVuRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBaUI7SUFDbkcsY0FBYyxFQUFFLGNBQWM7SUFDOUIsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsNEVBQTRFLENBQUM7UUFDbkgsSUFBSSxFQUFFLE9BQU87UUFDYixLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQztZQUNqRCxlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQzVGLFVBQVUsRUFBRTtnQkFDWCxFQUFFLEVBQUU7b0JBQ0gsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSx5Q0FBeUMsQ0FBQztpQkFDbkY7Z0JBQ0QsS0FBSyxFQUFFO29CQUNOLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsdUJBQXVCLENBQUM7aUJBQ3BFO2dCQUNELElBQUksRUFBRTtvQkFDTCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHVLQUF1SyxDQUFDO2lCQUNuTjtnQkFDRCxXQUFXLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSw2QkFBNkIsQ0FBQztpQkFDaEY7Z0JBQ0QsV0FBVyxFQUFFO29CQUNaLElBQUksRUFBRSxPQUFPO29CQUNiLFdBQVcsRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsd01BQXdNLENBQUM7b0JBQzNQLEtBQUssRUFBRTt3QkFDTixJQUFJLEVBQUUsUUFBUTtxQkFDZDtpQkFDRDtnQkFDRCxJQUFJLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSx1RUFBdUUsQ0FBQztpQkFDbkg7Z0JBQ0QsS0FBSyxFQUFFO29CQUNOLElBQUksRUFBRSxPQUFPO29CQUNiLFdBQVcsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsZ0RBQWdELENBQUM7b0JBQzdGLEtBQUssRUFBRTt3QkFDTixJQUFJLEVBQUUsUUFBUTt3QkFDZCxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQzt3QkFDbEMsZUFBZSxFQUFFLENBQUM7Z0NBQ2pCLElBQUksRUFBRTtvQ0FDTCxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUk7b0NBQzlDLGtCQUFrQixFQUFFLENBQUMsSUFBSSxDQUFDO29DQUMxQixPQUFPLEVBQUUsRUFBRTtpQ0FDWDs2QkFDRCxDQUFDO3dCQUNGLFVBQVUsRUFBRTs0QkFDWCxFQUFFLEVBQUU7Z0NBQ0gsSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxpR0FBaUcsQ0FBQzs2QkFDako7NEJBQ0QsS0FBSyxFQUFFO2dDQUNOLElBQUksRUFBRSxRQUFRO2dDQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsZ0JBQWdCLENBQUM7NkJBQ25FOzRCQUNELFdBQVcsRUFBRTtnQ0FDWixJQUFJLEVBQUUsUUFBUTtnQ0FDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLDZDQUE2QyxFQUFFLGdOQUFnTixFQUFFLElBQUksZUFBZSwwQkFBMEIsRUFBRSxJQUFJLGVBQWUsaUNBQWlDLEVBQUUsSUFBSSxlQUFlLG1CQUFtQixDQUFDOzZCQUNuYTs0QkFDRCxNQUFNLEVBQUU7Z0NBQ1Asa0JBQWtCLEVBQUUsUUFBUSxDQUFDLG1EQUFtRCxFQUFFLGtGQUFrRixFQUFFLElBQUksZUFBZSwwQkFBMEIsRUFBRSxJQUFJLGVBQWUsaUNBQWlDLEVBQUUsSUFBSSxlQUFlLG1CQUFtQixDQUFDOzZCQUNsVDs0QkFDRCxLQUFLLEVBQUU7Z0NBQ04sSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx5RUFBeUUsQ0FBQztnQ0FDNUgsS0FBSyxFQUFFO29DQUNOO3dDQUNDLFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7d0NBQzlCLG9CQUFvQixFQUFFLEtBQUs7d0NBQzNCLFVBQVUsRUFBRTs0Q0FDWCxJQUFJLEVBQUU7Z0RBQ0wsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHNEQUFzRCxDQUFDOzZDQUN0Rzs0Q0FDRCxLQUFLLEVBQUU7Z0RBQ04sV0FBVyxFQUFFLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSxnWUFBZ1ksQ0FBQztnREFDcmMsS0FBSyxFQUFFO29EQUNOO3dEQUNDLElBQUksRUFBRSxRQUFRO3FEQUNkO29EQUNEO3dEQUNDLElBQUksRUFBRSxRQUFRO3dEQUNkLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQzt3REFDNUMsVUFBVSxFQUFFOzREQUNYLElBQUksRUFBRTtnRUFDTCxXQUFXLEVBQUUsUUFBUSxDQUFDLGlEQUFpRCxFQUFFLHFFQUFxRSxDQUFDO2dFQUMvSSxJQUFJLEVBQUUsUUFBUTs2REFDZDs0REFDRCxLQUFLLEVBQUU7Z0VBQ04sV0FBVyxFQUFFLFFBQVEsQ0FBQyxrREFBa0QsRUFBRSxzRUFBc0UsQ0FBQztnRUFDakosSUFBSSxFQUFFLFFBQVE7NkRBQ2Q7NERBQ0QsRUFBRSxFQUFFO2dFQUNILFdBQVcsRUFBRSxRQUFRLENBQUMsK0NBQStDLEVBQUUsbUVBQW1FLENBQUM7Z0VBQzNJLElBQUksRUFBRSxRQUFROzZEQUNkOzREQUNELE9BQU8sRUFBRTtnRUFDUixXQUFXLEVBQUUsUUFBUSxDQUFDLG9EQUFvRCxFQUFFLHlFQUF5RSxDQUFDO2dFQUN0SixJQUFJLEVBQUUsUUFBUTs2REFDZDt5REFDRDtxREFDRDtpREFDRDs2Q0FDRDs0Q0FDRCxPQUFPLEVBQUU7Z0RBQ1IsSUFBSSxFQUFFLFFBQVE7Z0RBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxpRkFBaUYsQ0FBQzs2Q0FDNUk7eUNBQ0Q7cUNBQ0Q7b0NBQ0Q7d0NBQ0MsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQzt3Q0FDNUIsb0JBQW9CLEVBQUUsS0FBSzt3Q0FDM0IsVUFBVSxFQUFFOzRDQUNYLEdBQUcsRUFBRTtnREFDSixXQUFXLEVBQUUsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLG9HQUFvRyxDQUFDO2dEQUN0SyxJQUFJLEVBQUUsUUFBUTs2Q0FDZDs0Q0FDRCxPQUFPLEVBQUU7Z0RBQ1IsSUFBSSxFQUFFLFFBQVE7Z0RBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxpRkFBaUYsQ0FBQzs2Q0FDNUk7eUNBQ0Q7cUNBQ0Q7b0NBQ0Q7d0NBQ0MsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDO3dDQUN0QixvQkFBb0IsRUFBRSxLQUFLO3dDQUMzQixVQUFVLEVBQUU7NENBQ1gsSUFBSSxFQUFFO2dEQUNMLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxzREFBc0QsQ0FBQzs2Q0FDdEc7NENBQ0QsUUFBUSxFQUFFO2dEQUNULFdBQVcsRUFBRSxRQUFRLENBQUMsd0NBQXdDLEVBQUUsaUVBQWlFLENBQUM7Z0RBQ2xJLElBQUksRUFBRSxRQUFROzZDQUNkO3lDQUNEO3FDQUNEO2lDQUNEOzZCQUNEOzRCQUNELGdCQUFnQixFQUFFO2dDQUNqQixXQUFXLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLDZPQUE2TyxDQUFDO2dDQUMzUyxJQUFJLEVBQUUsT0FBTztnQ0FDYixLQUFLLEVBQUU7b0NBQ04sSUFBSSxFQUFFLFFBQVE7b0NBQ2QsZUFBZSxFQUFFO3dDQUNoQjs0Q0FDQyxLQUFLLEVBQUUsV0FBVzs0Q0FDbEIsV0FBVyxFQUFFLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSxzRUFBc0UsQ0FBQzs0Q0FDOUksSUFBSSxFQUFFLDBCQUEwQjt5Q0FDaEM7d0NBQ0Q7NENBQ0MsS0FBSyxFQUFFLFFBQVE7NENBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSxvRUFBb0UsQ0FBQzs0Q0FDekksSUFBSSxFQUFFLG9CQUFvQjt5Q0FDMUI7d0NBQ0Q7NENBQ0MsS0FBSyxFQUFFLFFBQVE7NENBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSw0Q0FBNEMsQ0FBQzs0Q0FDakgsSUFBSSxFQUFFLG9CQUFvQjt5Q0FDMUI7d0NBQ0Q7NENBQ0MsS0FBSyxFQUFFLGtCQUFrQjs0Q0FDekIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxzREFBc0QsRUFBRSxnREFBZ0QsQ0FBQzs0Q0FDL0gsSUFBSSxFQUFFLG1DQUFtQzt5Q0FDekM7d0NBQ0Q7NENBQ0MsS0FBSyxFQUFFLFdBQVc7NENBQ2xCLFdBQVcsRUFBRSxRQUFRLENBQUMsK0NBQStDLEVBQUUsdURBQXVELENBQUM7NENBQy9ILElBQUksRUFBRSxvQkFBb0I7eUNBQzFCO3dDQUNEOzRDQUNDLEtBQUssRUFBRSxzQkFBc0I7NENBQzdCLFdBQVcsRUFBRSxRQUFRLENBQUMsd0RBQXdELEVBQUUsMElBQTBJLENBQUM7NENBQzNOLElBQUksRUFBRSx1Q0FBdUM7eUNBQzdDO3dDQUNEOzRDQUNDLEtBQUssRUFBRSxnQkFBZ0I7NENBQ3ZCLFdBQVcsRUFBRSxRQUFRLENBQUMsa0RBQWtELEVBQUUsMkNBQTJDLENBQUM7NENBQ3RILElBQUksRUFBRSxnQkFBZ0I7eUNBQ3RCO3FDQUNEO2lDQUNEOzZCQUNEOzRCQUNELE1BQU0sRUFBRTtnQ0FDUCxXQUFXLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGtDQUFrQyxDQUFDO2dDQUN0RixrQkFBa0IsRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsc0lBQXNJLENBQUM7Z0NBQzdNLElBQUksRUFBRSxRQUFRO2dDQUNkLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQztnQ0FDckIsZUFBZSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQ0FDaEQsVUFBVSxFQUFFO29DQUNYLFNBQVMsRUFBRTt3Q0FDVixXQUFXLEVBQUUsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLHdEQUF3RCxDQUFDO3dDQUNuSCxJQUFJLEVBQUUsUUFBUTtxQ0FDZDtpQ0FDRDs2QkFDRDs0QkFDRCxJQUFJLEVBQUU7Z0NBQ0wsSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxnRUFBZ0UsQ0FBQzs2QkFDbEg7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRDtTQUNEO0tBQ0Q7SUFDRCx5QkFBeUIsRUFBRSxDQUFDLHdCQUF3QixFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQy9ELEtBQUssTUFBTSx1QkFBdUIsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1lBQ2hFLElBQUksdUJBQXVCLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDNUQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDIn0=