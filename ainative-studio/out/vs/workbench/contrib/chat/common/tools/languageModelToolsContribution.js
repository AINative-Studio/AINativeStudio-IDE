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
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../services/extensionManagement/common/extensionFeatures.js';
import { isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
import { ILanguageModelToolsService } from '../languageModelToolsService.js';
import { toolsParametersSchemaSchemaId } from './languageModelToolsParametersSchema.js';
const languageModelToolsExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModelTools',
    activationEventsGenerator: (contributions, result) => {
        for (const contrib of contributions) {
            result.push(`onLanguageModelTool:${contrib.name}`);
        }
    },
    jsonSchema: {
        description: localize('vscode.extension.contributes.tools', 'Contributes a tool that can be invoked by a language model in a chat session, or from a standalone command. Registered tools can be used by all extensions.'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{
                    body: {
                        name: '${1}',
                        modelDescription: '${2}',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                '${3:name}': {
                                    type: 'string',
                                    description: '${4:description}'
                                }
                            }
                        },
                    }
                }],
            required: ['name', 'displayName', 'modelDescription'],
            properties: {
                name: {
                    description: localize('toolName', "A unique name for this tool. This name must be a globally unique identifier, and is also used as a name when presenting this tool to a language model."),
                    type: 'string',
                    // [\\w-]+ is OpenAI's requirement for tool names
                    pattern: '^(?!copilot_|vscode_)[\\w-]+$'
                },
                toolReferenceName: {
                    markdownDescription: localize('toolName2', "If {0} is enabled for this tool, the user may use '#' with this name to invoke the tool in a query. Otherwise, the name is not required. Name must not contain whitespace.", '`canBeReferencedInPrompt`'),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                displayName: {
                    description: localize('toolDisplayName', "A human-readable name for this tool that may be used to describe it in the UI."),
                    type: 'string'
                },
                userDescription: {
                    description: localize('toolUserDescription', "A description of this tool that may be shown to the user."),
                    type: 'string'
                },
                modelDescription: {
                    description: localize('toolModelDescription', "A description of this tool that may be used by a language model to select it."),
                    type: 'string'
                },
                inputSchema: {
                    description: localize('parametersSchema', "A JSON schema for the input this tool accepts. The input must be an object at the top level. A particular language model may not support all JSON schema features. See the documentation for the language model family you are using for more information."),
                    $ref: toolsParametersSchemaSchemaId
                },
                canBeReferencedInPrompt: {
                    markdownDescription: localize('canBeReferencedInPrompt', "If true, this tool shows up as an attachment that the user can add manually to their request. Chat participants will receive the tool in {0}.", '`ChatRequest#toolReferences`'),
                    type: 'boolean'
                },
                icon: {
                    markdownDescription: localize('icon', "An icon that represents this tool. Either a file path, an object with file paths for dark and light themes, or a theme icon reference, like `$(zap)`"),
                    anyOf: [{
                            type: 'string'
                        },
                        {
                            type: 'object',
                            properties: {
                                light: {
                                    description: localize('icon.light', 'Icon path when a light theme is used'),
                                    type: 'string'
                                },
                                dark: {
                                    description: localize('icon.dark', 'Icon path when a dark theme is used'),
                                    type: 'string'
                                }
                            }
                        }]
                },
                when: {
                    markdownDescription: localize('condition', "Condition which must be true for this tool to be enabled. Note that a tool may still be invoked by another extension even when its `when` condition is false."),
                    type: 'string'
                },
                tags: {
                    description: localize('toolTags', "A set of tags that roughly describe the tool's capabilities. A tool user may use these to filter the set of tools to just ones that are relevant for the task at hand, or they may want to pick a tag that can be used to identify just the tools contributed by this extension."),
                    type: 'array',
                    items: {
                        type: 'string',
                        pattern: '^(?!copilot_|vscode_)'
                    }
                }
            }
        }
    }
});
function toToolKey(extensionIdentifier, toolName) {
    return `${extensionIdentifier.value}/${toolName}`;
}
const CopilotAgentModeTag = 'vscode_editing';
let LanguageModelToolsExtensionPointHandler = class LanguageModelToolsExtensionPointHandler {
    static { this.ID = 'workbench.contrib.toolsExtensionPointHandler'; }
    constructor(languageModelToolsService, logService, productService) {
        this._registrationDisposables = new DisposableMap();
        languageModelToolsExtensionPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                for (const rawTool of extension.value) {
                    if (!rawTool.name || !rawTool.modelDescription || !rawTool.displayName) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool without name, modelDescription, and displayName: ${JSON.stringify(rawTool)}`);
                        continue;
                    }
                    if (!rawTool.name.match(/^[\w-]+$/)) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with invalid id: ${rawTool.name}. The id must match /^[\\w-]+$/.`);
                        continue;
                    }
                    if (rawTool.canBeReferencedInPrompt && !rawTool.toolReferenceName) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with 'canBeReferencedInPrompt' set without a 'toolReferenceName': ${JSON.stringify(rawTool)}`);
                        continue;
                    }
                    if ((rawTool.name.startsWith('copilot_') || rawTool.name.startsWith('vscode_')) && !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with name starting with "vscode_" or "copilot_"`);
                        continue;
                    }
                    if (rawTool.tags?.includes(CopilotAgentModeTag)) {
                        if (!isProposedApiEnabled(extension.description, 'languageModelToolsForAgent') && !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                            logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with tag "${CopilotAgentModeTag}" without enabling 'languageModelToolsForAgent' proposal`);
                            continue;
                        }
                    }
                    if (rawTool.tags?.some(tag => tag !== CopilotAgentModeTag && (tag.startsWith('copilot_') || tag.startsWith('vscode_'))) && !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                        logService.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with tags starting with "vscode_" or "copilot_"`);
                        continue;
                    }
                    const rawIcon = rawTool.icon;
                    let icon;
                    if (typeof rawIcon === 'string') {
                        icon = ThemeIcon.fromString(rawIcon) ?? {
                            dark: joinPath(extension.description.extensionLocation, rawIcon),
                            light: joinPath(extension.description.extensionLocation, rawIcon)
                        };
                    }
                    else if (rawIcon) {
                        icon = {
                            dark: joinPath(extension.description.extensionLocation, rawIcon.dark),
                            light: joinPath(extension.description.extensionLocation, rawIcon.light)
                        };
                    }
                    // If OSS and the product.json is not set up, fall back to checking api proposal
                    const isBuiltinTool = productService.defaultChatAgent?.chatExtensionId ?
                        ExtensionIdentifier.equals(extension.description.identifier, productService.defaultChatAgent.chatExtensionId) :
                        isProposedApiEnabled(extension.description, 'chatParticipantPrivate');
                    const tool = {
                        ...rawTool,
                        source: { type: 'extension', extensionId: extension.description.identifier, isExternalTool: !isBuiltinTool },
                        inputSchema: rawTool.inputSchema,
                        id: rawTool.name,
                        icon,
                        when: rawTool.when ? ContextKeyExpr.deserialize(rawTool.when) : undefined,
                        requiresConfirmation: !isBuiltinTool,
                        alwaysDisplayInputOutput: !isBuiltinTool,
                        supportsToolPicker: isBuiltinTool ?
                            false :
                            rawTool.canBeReferencedInPrompt
                    };
                    const disposable = languageModelToolsService.registerToolData(tool);
                    this._registrationDisposables.set(toToolKey(extension.description.identifier, rawTool.name), disposable);
                }
            }
            for (const extension of delta.removed) {
                for (const tool of extension.value) {
                    this._registrationDisposables.deleteAndDispose(toToolKey(extension.description.identifier, tool.name));
                }
            }
        });
    }
};
LanguageModelToolsExtensionPointHandler = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, ILogService),
    __param(2, IProductService)
], LanguageModelToolsExtensionPointHandler);
export { LanguageModelToolsExtensionPointHandler };
class LanguageModelToolDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.languageModelTools;
    }
    render(manifest) {
        const contribs = manifest.contributes?.languageModelTools ?? [];
        if (!contribs.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('toolTableName', "Name"),
            localize('toolTableDisplayName', "Display Name"),
            localize('toolTableDescription', "Description"),
        ];
        const rows = contribs.map(t => {
            return [
                new MarkdownString(`\`${t.name}\``),
                t.displayName,
                t.userDescription ?? t.modelDescription,
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'languageModelTools',
    label: localize('langModelTools', "Language Model Tools"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(LanguageModelToolDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvbGFuZ3VhZ2VNb2RlbFRvb2xzQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQXNCLE1BQU0seURBQXlELENBQUM7QUFDbEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRS9FLE9BQU8sRUFBRSxVQUFVLEVBQW1HLE1BQU0sc0VBQXNFLENBQUM7QUFDbk0sT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDNUYsT0FBTyxLQUFLLGtCQUFrQixNQUFNLDhEQUE4RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSww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