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
/**
 * Notes on what to implement next:
 *   - re-trigger suggestions dialog on `folder` selection because the `#file:` references take
 *     `file` paths, therefore a "folder" completion is never final
 *   - provide the same suggestions that the `#file:` variables in the chat input have, e.g.,
 *     recently used files, related files, etc.
 *   - support markdown links; markdown extension does sometimes provide the paths completions, but
 *     the prompt completions give more options (e.g., recently used files, related files, etc.)
 *   - add `Windows` support
 */
import { LANGUAGE_SELECTOR } from '../constants.js';
import { IPromptsService } from '../service/types.js';
import { assertOneOf } from '../../../../../../base/common/types.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { dirname, extUri } from '../../../../../../base/common/resources.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { Extensions as WorkbenchExtensions } from '../../../../../common/contributions.js';
/**
 * Finds a file reference that suites the provided `position`.
 */
const findFileReference = (references, position) => {
    for (const reference of references) {
        const { range } = reference;
        // ignore any other types of references
        if (reference.type !== 'file') {
            return undefined;
        }
        // this ensures that we handle only the `#file:` references for now
        if (reference.subtype !== 'prompt') {
            return undefined;
        }
        // reference must match the provided position
        const { startLineNumber, endColumn } = range;
        if ((startLineNumber !== position.lineNumber) || (endColumn !== position.column)) {
            continue;
        }
        return reference;
    }
    return undefined;
};
/**
 * Provides reference paths autocompletion for the `#file:` variables inside prompts.
 */
let PromptPathAutocompletion = class PromptPathAutocompletion extends Disposable {
    constructor(fileService, promptSyntaxService, languageService) {
        super();
        this.fileService = fileService;
        this.promptSyntaxService = promptSyntaxService;
        this.languageService = languageService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptPathAutocompletion';
        /**
         * List of trigger characters handled by this provider.
         */
        this.triggerCharacters = [':', '.', '/'];
        this._register(this.languageService.completionProvider.register(LANGUAGE_SELECTOR, this));
    }
    /**
     * The main function of this provider that calculates
     * completion items based on the provided arguments.
     */
    async provideCompletionItems(model, position, context, token) {
        assert(!token.isCancellationRequested, new CancellationError());
        const { triggerCharacter } = context;
        // it must always have been triggered by a character
        if (!triggerCharacter) {
            return undefined;
        }
        assertOneOf(triggerCharacter, this.triggerCharacters, `Prompt path autocompletion provider`);
        const parser = this.promptSyntaxService.getSyntaxParserFor(model);
        assert(!parser.disposed, 'Prompt parser must not be disposed.');
        // start the parser in case it was not started yet,
        // and wait for it to settle to a final result
        const { references } = await parser
            .start()
            .settled();
        // validate that the cancellation was not yet requested
        assert(!token.isCancellationRequested, new CancellationError());
        const fileReference = findFileReference(references, position);
        if (!fileReference) {
            return undefined;
        }
        const modelDirname = dirname(model.uri);
        // in the case of the '.' trigger character, we must check if this is the first
        // dot in the link path, otherwise the dot could be a part of a folder name
        if (triggerCharacter === ':' || (triggerCharacter === '.' && fileReference.path === '.')) {
            return {
                suggestions: await this.getFirstFolderSuggestions(triggerCharacter, modelDirname, fileReference),
            };
        }
        if (triggerCharacter === '/' || triggerCharacter === '.') {
            return {
                suggestions: await this.getNonFirstFolderSuggestions(triggerCharacter, modelDirname, fileReference),
            };
        }
        assertNever(triggerCharacter, `Unexpected trigger character '${triggerCharacter}'.`);
    }
    /**
     * Gets "raw" folder suggestions. Unlike the full completion items,
     * these ones do not have `insertText` and `range` properties which
     * are meant to be added by the caller later on.
     */
    async getFolderSuggestions(uri) {
        const { children } = await this.fileService.resolve(uri);
        const suggestions = [];
        // no `children` - no suggestions
        if (!children) {
            return suggestions;
        }
        for (const child of children) {
            const kind = child.isDirectory
                ? 23 /* CompletionItemKind.Folder */
                : 20 /* CompletionItemKind.File */;
            const sortText = child.isDirectory
                ? '1'
                : '2';
            suggestions.push({
                label: child.name,
                kind,
                sortText,
            });
        }
        return suggestions;
    }
    /**
     * Gets suggestions for a first folder/file name in the path. E.g., the one
     * that follows immediately after the `:` character of the `#file:` variable.
     *
     * The main difference between this and "subsequent" folder cases is that in
     * the beginning of the path the suggestions also contain the `..` item and
     * the `./` normalization prefix for relative paths.
     *
     * See also {@link getNonFirstFolderSuggestions}.
     */
    async getFirstFolderSuggestions(character, fileFolderUri, fileReference) {
        const { linkRange } = fileReference;
        // when character is `:`, there must be no link present yet
        // otherwise the `:` was used in the middle of the link hence
        // we don't want to provide suggestions for that
        if ((character === ':') && (linkRange !== undefined)) {
            return [];
        }
        // otherwise when the `.` character is present, it is inside the link part
        // of the reference, hence we always expect the link range to be present
        if ((character === '.') && (linkRange === undefined)) {
            return [];
        }
        const suggestions = await this.getFolderSuggestions(fileFolderUri);
        // replacement range for suggestions; when character is `.`, we want to also
        // replace it, because we add `./` at the beginning of all the relative paths
        const startColumnOffset = (character === '.') ? 1 : 0;
        const range = {
            ...fileReference.range,
            endColumn: fileReference.range.endColumn,
            startColumn: fileReference.range.endColumn - startColumnOffset,
        };
        return [
            {
                label: '..',
                kind: 23 /* CompletionItemKind.Folder */,
                insertText: '..',
                range,
                sortText: '0',
            },
            ...suggestions
                .map((suggestion) => {
                // add space at the end of file names since no completions
                // that follow the file name are expected anymore
                const suffix = (suggestion.kind === 20 /* CompletionItemKind.File */)
                    ? ' '
                    : '';
                return {
                    ...suggestion,
                    range,
                    label: `./${suggestion.label}${suffix}`,
                    // we use the `./` prefix for consistency
                    insertText: `./${suggestion.label}${suffix}`,
                };
            }),
        ];
    }
    /**
     * Gets suggestions for a folder/file name that follows after the first one.
     * See also {@link getFirstFolderSuggestions}.
     */
    async getNonFirstFolderSuggestions(character, fileFolderUri, fileReference) {
        const { linkRange, path } = fileReference;
        if (linkRange === undefined) {
            return [];
        }
        const currenFolder = extUri.resolvePath(fileFolderUri, path);
        let suggestions = await this.getFolderSuggestions(currenFolder);
        // when trigger character was a `.`, which is we know is inside
        // the folder/file name in the path, filter out to only items
        // that start with the dot instead of showing all of them
        if (character === '.') {
            suggestions = suggestions.filter((suggestion) => {
                return suggestion.label.startsWith('.');
            });
        }
        // replacement range of the suggestions
        // when character is `.` we want to also replace it too
        const startColumnOffset = (character === '.') ? 1 : 0;
        const range = {
            ...fileReference.range,
            endColumn: fileReference.range.endColumn,
            startColumn: fileReference.range.endColumn - startColumnOffset,
        };
        return suggestions
            .map((suggestion) => {
            // add space at the end of file names since no completions
            // that follow the file name are expected anymore
            const suffix = (suggestion.kind === 20 /* CompletionItemKind.File */)
                ? ' '
                : '';
            return {
                ...suggestion,
                insertText: `${suggestion.label}${suffix}`,
                range,
            };
        });
    }
};
PromptPathAutocompletion = __decorate([
    __param(0, IFileService),
    __param(1, IPromptsService),
    __param(2, ILanguageFeaturesService)
], PromptPathAutocompletion);
export { PromptPathAutocompletion };
/**
 * We restrict this provider to `Unix` machines for now because of
 * the filesystem paths differences on `Windows` operating system.
 *
 * Notes on `Windows` support:
 * 	- we add the `./` for the first path component, which may not work on `Windows`
 * 	- the first path component of the absolute paths must be a drive letter
 */
if (!isWindows) {
    // register the provider as a workbench contribution
    Registry.as(WorkbenchExtensions.Workbench)
        .registerWorkbenchContribution(PromptPathAutocompletion, 4 /* LifecyclePhase.Eventually */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0UGF0aEF1dG9jb21wbGV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlRmVhdHVyZXMvcHJvbXB0UGF0aEF1dG9jb21wbGV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHOzs7Ozs7Ozs7R0FTRztBQUVILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUc1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUVsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN4RyxPQUFPLEVBQW1DLFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBcUI1SDs7R0FFRztBQUNILE1BQU0saUJBQWlCLEdBQUcsQ0FDekIsVUFBdUMsRUFDdkMsUUFBa0IsRUFDaUIsRUFBRTtJQUNyQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxTQUFTLENBQUM7UUFFNUIsdUNBQXVDO1FBQ3ZDLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUMvQixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLElBQUksU0FBUyxDQUFDLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsNkNBQTZDO1FBQzdDLE1BQU0sRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQzdDLElBQUksQ0FBQyxlQUFlLEtBQUssUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2xGLFNBQVM7UUFDVixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUMsQ0FBQztBQUVGOztHQUVHO0FBQ0ksSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBV3ZELFlBQ2UsV0FBMEMsRUFDdkMsbUJBQXFELEVBQzVDLGVBQTBEO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBSnVCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3RCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBaUI7UUFDM0Isb0JBQWUsR0FBZixlQUFlLENBQTBCO1FBYnJGOztXQUVHO1FBQ2Esc0JBQWlCLEdBQVcsMEJBQTBCLENBQUM7UUFFdkU7O1dBRUc7UUFDYSxzQkFBaUIsR0FBd0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBU3hFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzRixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksS0FBSyxDQUFDLHNCQUFzQixDQUNsQyxLQUFpQixFQUNqQixRQUFrQixFQUNsQixPQUEwQixFQUMxQixLQUF3QjtRQUV4QixNQUFNLENBQ0wsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQzlCLElBQUksaUJBQWlCLEVBQUUsQ0FDdkIsQ0FBQztRQUVGLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUVyQyxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELFdBQVcsQ0FDVixnQkFBZ0IsRUFDaEIsSUFBSSxDQUFDLGlCQUFpQixFQUN0QixxQ0FBcUMsQ0FDckMsQ0FBQztRQUVGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQ0wsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUNoQixxQ0FBcUMsQ0FDckMsQ0FBQztRQUVGLG1EQUFtRDtRQUNuRCw4Q0FBOEM7UUFDOUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLE1BQU0sTUFBTTthQUNqQyxLQUFLLEVBQUU7YUFDUCxPQUFPLEVBQUUsQ0FBQztRQUVaLHVEQUF1RDtRQUN2RCxNQUFNLENBQ0wsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQzlCLElBQUksaUJBQWlCLEVBQUUsQ0FDdkIsQ0FBQztRQUVGLE1BQU0sYUFBYSxHQUFHLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFeEMsK0VBQStFO1FBQy9FLDJFQUEyRTtRQUMzRSxJQUFJLGdCQUFnQixLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixLQUFLLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUYsT0FBTztnQkFDTixXQUFXLEVBQUUsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQ2hELGdCQUFnQixFQUNoQixZQUFZLEVBQ1osYUFBYSxDQUNiO2FBQ0QsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLGdCQUFnQixLQUFLLEdBQUcsSUFBSSxnQkFBZ0IsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUMxRCxPQUFPO2dCQUNOLFdBQVcsRUFBRSxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FDbkQsZ0JBQWdCLEVBQ2hCLFlBQVksRUFDWixhQUFhLENBQ2I7YUFDRCxDQUFDO1FBQ0gsQ0FBQztRQUVELFdBQVcsQ0FDVixnQkFBZ0IsRUFDaEIsaUNBQWlDLGdCQUFnQixJQUFJLENBQ3JELENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLEtBQUssQ0FBQyxvQkFBb0IsQ0FDakMsR0FBUTtRQUVSLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sV0FBVyxHQUF3QixFQUFFLENBQUM7UUFFNUMsaUNBQWlDO1FBQ2pDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU8sV0FBVyxDQUFDO1FBQ3BCLENBQUM7UUFFRCxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQzlCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxXQUFXO2dCQUM3QixDQUFDO2dCQUNELENBQUMsaUNBQXdCLENBQUM7WUFFM0IsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFdBQVc7Z0JBQ2pDLENBQUMsQ0FBQyxHQUFHO2dCQUNMLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFFUCxXQUFXLENBQUMsSUFBSSxDQUFDO2dCQUNoQixLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUk7Z0JBQ2pCLElBQUk7Z0JBQ0osUUFBUTthQUNSLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBRUQ7Ozs7Ozs7OztPQVNHO0lBQ0ssS0FBSyxDQUFDLHlCQUF5QixDQUN0QyxTQUFvQixFQUNwQixhQUFrQixFQUNsQixhQUFtQztRQUVuQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsYUFBYSxDQUFDO1FBRXBDLDJEQUEyRDtRQUMzRCw2REFBNkQ7UUFDN0QsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxTQUFTLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN0RCxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCwwRUFBMEU7UUFDMUUsd0VBQXdFO1FBQ3hFLElBQUksQ0FBQyxTQUFTLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN0RCxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUVuRSw0RUFBNEU7UUFDNUUsNkVBQTZFO1FBQzdFLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxTQUFTLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxHQUFHO1lBQ2IsR0FBRyxhQUFhLENBQUMsS0FBSztZQUN0QixTQUFTLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxTQUFTO1lBQ3hDLFdBQVcsRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxpQkFBaUI7U0FDOUQsQ0FBQztRQUVGLE9BQU87WUFDTjtnQkFDQyxLQUFLLEVBQUUsSUFBSTtnQkFDWCxJQUFJLG9DQUEyQjtnQkFDL0IsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLEtBQUs7Z0JBQ0wsUUFBUSxFQUFFLEdBQUc7YUFDYjtZQUNELEdBQUcsV0FBVztpQkFDWixHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtnQkFDbkIsMERBQTBEO2dCQUMxRCxpREFBaUQ7Z0JBQ2pELE1BQU0sTUFBTSxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUkscUNBQTRCLENBQUM7b0JBQzNELENBQUMsQ0FBQyxHQUFHO29CQUNMLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBRU4sT0FBTztvQkFDTixHQUFHLFVBQVU7b0JBQ2IsS0FBSztvQkFDTCxLQUFLLEVBQUUsS0FBSyxVQUFVLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRTtvQkFDdkMseUNBQXlDO29CQUN6QyxVQUFVLEVBQUUsS0FBSyxVQUFVLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRTtpQkFDNUMsQ0FBQztZQUNILENBQUMsQ0FBQztTQUNILENBQUM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssS0FBSyxDQUFDLDRCQUE0QixDQUN6QyxTQUFvQixFQUNwQixhQUFrQixFQUNsQixhQUFtQztRQUVuQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLGFBQWEsQ0FBQztRQUUxQyxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM3QixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3RCxJQUFJLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVoRSwrREFBK0Q7UUFDL0QsNkRBQTZEO1FBQzdELHlEQUF5RDtRQUN6RCxJQUFJLFNBQVMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUN2QixXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO2dCQUMvQyxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELHVDQUF1QztRQUN2Qyx1REFBdUQ7UUFDdkQsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLFNBQVMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxLQUFLLEdBQUc7WUFDYixHQUFHLGFBQWEsQ0FBQyxLQUFLO1lBQ3RCLFNBQVMsRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLFNBQVM7WUFDeEMsV0FBVyxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLGlCQUFpQjtTQUM5RCxDQUFDO1FBRUYsT0FBTyxXQUFXO2FBQ2hCLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ25CLDBEQUEwRDtZQUMxRCxpREFBaUQ7WUFDakQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxxQ0FBNEIsQ0FBQztnQkFDM0QsQ0FBQyxDQUFDLEdBQUc7Z0JBQ0wsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUVOLE9BQU87Z0JBQ04sR0FBRyxVQUFVO2dCQUNiLFVBQVUsRUFBRSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEdBQUcsTUFBTSxFQUFFO2dCQUMxQyxLQUFLO2FBQ0wsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNELENBQUE7QUFoUVksd0JBQXdCO0lBWWxDLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHdCQUF3QixDQUFBO0dBZGQsd0JBQXdCLENBZ1FwQzs7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hCLG9EQUFvRDtJQUNwRCxRQUFRLENBQUMsRUFBRSxDQUFrQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7U0FDekUsNkJBQTZCLENBQUMsd0JBQXdCLG9DQUE0QixDQUFDO0FBQ3RGLENBQUMifQ==