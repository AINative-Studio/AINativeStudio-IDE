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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9nZXR0aW5nU3RhcnRlZEV4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUUvRixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRW5ELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUFpQjtJQUNuRyxjQUFjLEVBQUUsY0FBYztJQUM5QixVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSw0RUFBNEUsQ0FBQztRQUNuSCxJQUFJLEVBQUUsT0FBTztRQUNiLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxRQUFRO1lBQ2QsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDO1lBQ2pELGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDNUYsVUFBVSxFQUFFO2dCQUNYLEVBQUUsRUFBRTtvQkFDSCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHlDQUF5QyxD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