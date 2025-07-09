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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Rvb2xzL2xhbmd1YWdlTW9kZWxUb29sc0NvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFzQixNQUFNLHlEQUF5RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUvRSxPQUFPLEVBQUUsVUFBVSxFQUFtRyxNQUFNLHNFQUFzRSxDQUFDO0FBQ25NLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVGLE9BQU8sS0FBSyxrQkFBa0IsTUFBTSw4REFBOEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUs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