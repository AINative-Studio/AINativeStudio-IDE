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
import { localize } from '../../../../nls.js';
import { getLocation, parse } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
let ExtensionsCompletionItemsProvider = class ExtensionsCompletionItemsProvider extends Disposable {
    constructor(extensionManagementService, languageFeaturesService) {
        super();
        this.extensionManagementService = extensionManagementService;
        this._register(languageFeaturesService.completionProvider.register({ language: 'jsonc', pattern: '**/settings.json' }, {
            _debugDisplayName: 'extensionsCompletionProvider',
            provideCompletionItems: async (model, position, _context, token) => {
                const getWordRangeAtPosition = (model, position) => {
                    const wordAtPosition = model.getWordAtPosition(position);
                    return wordAtPosition ? new Range(position.lineNumber, wordAtPosition.startColumn, position.lineNumber, wordAtPosition.endColumn) : null;
                };
                const location = getLocation(model.getValue(), model.getOffsetAt(position));
                const range = getWordRangeAtPosition(model, position) ?? Range.fromPositions(position, position);
                // extensions.supportUntrustedWorkspaces
                if (location.path[0] === 'extensions.supportUntrustedWorkspaces' && location.path.length === 2 && location.isAtPropertyKey) {
                    let alreadyConfigured = [];
                    try {
                        alreadyConfigured = Object.keys(parse(model.getValue())['extensions.supportUntrustedWorkspaces']);
                    }
                    catch (e) { /* ignore error */ }
                    return { suggestions: await this.provideSupportUntrustedWorkspacesExtensionProposals(alreadyConfigured, range) };
                }
                return { suggestions: [] };
            }
        }));
    }
    async provideSupportUntrustedWorkspacesExtensionProposals(alreadyConfigured, range) {
        const suggestions = [];
        const installedExtensions = (await this.extensionManagementService.getInstalled()).filter(e => e.manifest.main);
        const proposedExtensions = installedExtensions.filter(e => alreadyConfigured.indexOf(e.identifier.id) === -1);
        if (proposedExtensions.length) {
            suggestions.push(...proposedExtensions.map(e => {
                const text = `"${e.identifier.id}": {\n\t"supported": true,\n\t"version": "${e.manifest.version}"\n},`;
                return { label: e.identifier.id, kind: 13 /* CompletionItemKind.Value */, insertText: text, filterText: text, range };
            }));
        }
        else {
            const text = '"vscode.csharp": {\n\t"supported": true,\n\t"version": "0.0.0"\n},';
            suggestions.push({ label: localize('exampleExtension', "Example"), kind: 13 /* CompletionItemKind.Value */, insertText: text, filterText: text, range });
        }
        return suggestions;
    }
};
ExtensionsCompletionItemsProvider = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, ILanguageFeaturesService)
], ExtensionsCompletionItemsProvider);
export { ExtensionsCompletionItemsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0NvbXBsZXRpb25JdGVtc1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zQ29tcGxldGlvbkl0ZW1zUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBSWxFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBRXJILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUczRixJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFrQyxTQUFRLFVBQVU7SUFDaEUsWUFDK0MsMEJBQXVELEVBQzNFLHVCQUFpRDtRQUUzRSxLQUFLLEVBQUUsQ0FBQztRQUhzQywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBS3JHLElBQUksQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsRUFBRTtZQUN0SCxpQkFBaUIsRUFBRSw4QkFBOEI7WUFDakQsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLEtBQWlCLEVBQUUsUUFBa0IsRUFBRSxRQUEyQixFQUFFLEtBQXdCLEVBQTJCLEVBQUU7Z0JBQ3ZK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