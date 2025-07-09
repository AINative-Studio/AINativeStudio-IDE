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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0UGF0aEF1dG9jb21wbGV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZUZlYXR1cmVzL3Byb21wdFBhdGhBdXRvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRzs7Ozs7Ozs7O0dBU0c7QUFFSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFdEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFbEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDeEcsT0FBTyxFQUFtQyxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQXFCNUg7O0dBRUc7QUFDSCxNQUFNLGlCQUFpQixHQUFHLENBQ3pCLFVBQXVD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