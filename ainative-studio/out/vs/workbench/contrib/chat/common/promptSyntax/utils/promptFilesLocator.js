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
import { URI } from '../../../../../../base/common/uri.js';
import { match } from '../../../../../../base/common/glob.js';
import { assert } from '../../../../../../base/common/assert.js';
import { isAbsolute } from '../../../../../../base/common/path.js';
import { ResourceSet } from '../../../../../../base/common/map.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { PromptsConfig } from '../../../../../../platform/prompts/common/config.js';
import { basename, dirname, extUri } from '../../../../../../base/common/resources.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { isPromptFile, PROMPT_FILE_EXTENSION } from '../../../../../../platform/prompts/common/constants.js';
/**
 * Utility class to locate prompt files.
 */
let PromptFilesLocator = class PromptFilesLocator {
    constructor(fileService, configService, workspaceService) {
        this.fileService = fileService;
        this.configService = configService;
        this.workspaceService = workspaceService;
    }
    /**
     * List all prompt files from the filesystem.
     *
     * @returns List of prompt files found in the workspace.
     */
    async listFiles() {
        const configuredLocations = PromptsConfig.promptSourceFolders(this.configService);
        const absoluteLocations = toAbsoluteLocations(configuredLocations, this.workspaceService);
        return await this.listFilesIn(absoluteLocations);
    }
    /**
     * Lists all prompt files in the provided folders.
     *
     * @throws if any of the provided folder paths is not an `absolute path`.
     *
     * @param absoluteLocations List of prompt file source folders to search for prompt files in. Must be absolute paths.
     * @returns List of prompt files found in the provided folders.
     */
    async listFilesIn(folders) {
        return await this.findInstructionFiles(folders);
    }
    /**
     * Get all possible unambiguous prompt file source folders based on
     * the current workspace folder structure.
     *
     * This method is currently primarily used by the `> Create Prompt`
     * command that providers users with the list of destination folders
     * for a newly created prompt file. Because such a list cannot contain
     * paths that include `glob pattern` in them, we need to process config
     * values and try to create a list of clear and unambiguous locations.
     *
     * @returns List of possible unambiguous prompt file folders.
     */
    getConfigBasedSourceFolders() {
        const configuredLocations = PromptsConfig.promptSourceFolders(this.configService);
        const absoluteLocations = toAbsoluteLocations(configuredLocations, this.workspaceService);
        // locations in the settings can contain glob patterns so we need
        // to process them to get "clean" paths; the goal here is to have
        // a list of unambiguous folder paths where prompt files are stored
        const result = new ResourceSet();
        for (const absoluteLocation of absoluteLocations) {
            let { path } = absoluteLocation;
            const baseName = basename(absoluteLocation);
            // if a path ends with a well-known "any file" pattern, remove
            // it so we can get the dirname path of that setting value
            const filePatterns = ['*.md', `*${PROMPT_FILE_EXTENSION}`];
            for (const filePattern of filePatterns) {
                if (baseName === filePattern) {
                    path = URI.joinPath(absoluteLocation, '..').path;
                    continue;
                }
            }
            // likewise, if the pattern ends with single `*` (any file name)
            // remove it to get the dirname path of the setting value
            if (baseName === '*') {
                path = URI.joinPath(absoluteLocation, '..').path;
            }
            // if after replacing the "file name" glob pattern, the path
            // still contains a glob pattern, then ignore the path
            if (isValidGlob(path) === true) {
                continue;
            }
            result.add(URI.file(path));
        }
        return [...result];
    }
    /**
     * Finds all existent prompt files in the provided source folders.
     *
     * @throws if any of the provided folder paths is not an `absolute path`.
     *
     * @param absoluteLocations List of prompt file source folders to search for prompt files in. Must be absolute paths.
     * @returns List of prompt files found in the provided source folders.
     */
    async findInstructionFiles(absoluteLocations) {
        // find all prompt files in the provided locations, then match
        // the found file paths against (possible) glob patterns
        const paths = new ResourceSet();
        for (const absoluteLocation of absoluteLocations) {
            assert(isAbsolute(absoluteLocation.path), `Provided location must be an absolute path, got '${absoluteLocation.path}'.`);
            // normalize the glob pattern to always end with "any prompt file" pattern
            // unless the last part of the path is already a glob pattern itself; this is
            // to handle the case when a user specifies a file glob pattern at the end, e.g.,
            // "my-folder/*.md" or "my-folder/*" already include the prompt files
            const location = (isValidGlob(basename(absoluteLocation)) || absoluteLocation.path.endsWith(PROMPT_FILE_EXTENSION))
                ? absoluteLocation
                : extUri.joinPath(absoluteLocation, `*${PROMPT_FILE_EXTENSION}`);
            // find all prompt files in entire file tree, starting from
            // a first parent folder that does not contain a glob pattern
            const promptFiles = await findAllPromptFiles(firstNonGlobParent(location), this.fileService);
            // filter out found prompt files to only include those that match
            // the original glob pattern specified in the settings (if any)
            for (const file of promptFiles) {
                if (match(location.path, file.path)) {
                    paths.add(file);
                }
            }
        }
        return [...paths];
    }
};
PromptFilesLocator = __decorate([
    __param(0, IFileService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService)
], PromptFilesLocator);
export { PromptFilesLocator };
/**
 * Checks if the provided `pattern` could be a valid glob pattern.
 */
export const isValidGlob = (pattern) => {
    let squareBrackets = false;
    let squareBracketsCount = 0;
    let curlyBrackets = false;
    let curlyBracketsCount = 0;
    let previousCharacter;
    for (const char of pattern) {
        // skip all escaped characters
        if (previousCharacter === '\\') {
            previousCharacter = char;
            continue;
        }
        if (char === '*') {
            return true;
        }
        if (char === '?') {
            return true;
        }
        if (char === '[') {
            squareBrackets = true;
            squareBracketsCount++;
            previousCharacter = char;
            continue;
        }
        if (char === ']') {
            squareBrackets = true;
            squareBracketsCount--;
            previousCharacter = char;
            continue;
        }
        if (char === '{') {
            curlyBrackets = true;
            curlyBracketsCount++;
            continue;
        }
        if (char === '}') {
            curlyBrackets = true;
            curlyBracketsCount--;
            previousCharacter = char;
            continue;
        }
        previousCharacter = char;
    }
    // if square brackets exist and are in pairs, this is a `valid glob`
    if (squareBrackets && (squareBracketsCount === 0)) {
        return true;
    }
    // if curly brackets exist and are in pairs, this is a `valid glob`
    if (curlyBrackets && (curlyBracketsCount === 0)) {
        return true;
    }
    return false;
};
/**
 * Finds the first parent of the provided location that does not contain a `glob pattern`.
 *
 * @throws if the provided location is not an `absolute path`.
 *
 * ## Examples
 *
 * ```typescript
 * assert.strictEqual(
 *     firstNonGlobParent(URI.file('/home/user/{folder1,folder2}/file.md')).path,
 *     URI.file('/home/user').path,
 *     'Must find correct non-glob parent dirname.',
 * );
 * ```
 */
export const firstNonGlobParent = (location) => {
    // sanity check of the provided location
    assert(isAbsolute(location.path), `Provided location must be an absolute path, got '${location.path}'.`);
    // note! if though the folder name can be `invalid glob` here, it is still OK to
    //       use it as we don't really known if that is a glob pattern, or the folder
    //       name contains characters that can also be used in a glob pattern
    if (isValidGlob(location.path) === false) {
        return location;
    }
    // if location is the root of the filesystem, we are done
    const parent = dirname(location);
    if (extUri.isEqual(parent, location)) {
        return location;
    }
    // otherwise, try again starting with the parent folder
    return firstNonGlobParent(parent);
};
/**
 * Finds all `prompt files` in the provided location and all of its subfolders.
 */
const findAllPromptFiles = async (location, fileService) => {
    const result = [];
    try {
        const info = await fileService.resolve(location);
        if (info.isFile && isPromptFile(info.resource)) {
            result.push(info.resource);
            return result;
        }
        if (info.isDirectory && info.children) {
            for (const child of info.children) {
                if (child.isFile && isPromptFile(child.resource)) {
                    result.push(child.resource);
                    continue;
                }
                if (child.isDirectory) {
                    const promptFiles = await findAllPromptFiles(child.resource, fileService);
                    result.push(...promptFiles);
                    continue;
                }
            }
            return result;
        }
    }
    catch (error) {
        // noop
    }
    return result;
};
/**
 * Converts locations defined in `settings` to absolute filesystem path URIs.
 * This conversion is needed because locations in settings can be relative,
 * hence we need to resolve them based on the current workspace folders.
 */
const toAbsoluteLocations = (configuredLocations, workspaceService) => {
    const result = new ResourceSet();
    const { folders } = workspaceService.getWorkspace();
    for (const configuredLocation of configuredLocations) {
        if (isAbsolute(configuredLocation)) {
            result.add(URI.file(configuredLocation));
            continue;
        }
        for (const workspaceFolder of folders) {
            const absolutePath = extUri.resolvePath(workspaceFolder.uri, configuredLocation);
            // a sanity check on the expected outcome of the `resolvePath()` call
            assert(isAbsolute(absolutePath.path), `Provided location must be an absolute path, got '${absolutePath.path}'.`);
            if (result.has(absolutePath) === false) {
                result.add(absolutePath);
            }
            // if not inside a multi-root workspace, we are done
            if (folders.length <= 1) {
                continue;
            }
            // if inside a multi-root workspace, consider the specified prompts source folder
            // inside the workspace root, to allow users to use some (e.g., `.github/prompts`)
            // folder as a top-level folder in the workspace
            const workspaceRootUri = dirname(workspaceFolder.uri);
            const workspaceFolderUri = extUri.resolvePath(workspaceRootUri, configuredLocation);
            // if we already have this folder in the list, skip it
            if (result.has(workspaceFolderUri) === true) {
                continue;
            }
            // otherwise, if the prompt source folder is inside a top-level workspace folder,
            // add it to the list of paths too; this helps to handle the case when a relative
            // path must be resolved from `root` of the workspace
            if (workspaceFolderUri.fsPath.startsWith(workspaceFolder.uri.fsPath)) {
                result.add(workspaceFolderUri);
            }
        }
    }
    return [...result];
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3V0aWxzL3Byb21wdEZpbGVzTG9jYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdHOztHQUVHO0FBQ0ksSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7SUFDOUIsWUFDZ0MsV0FBeUIsRUFDaEIsYUFBb0MsRUFDakMsZ0JBQTBDO1FBRnRELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ2hCLGtCQUFhLEdBQWIs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