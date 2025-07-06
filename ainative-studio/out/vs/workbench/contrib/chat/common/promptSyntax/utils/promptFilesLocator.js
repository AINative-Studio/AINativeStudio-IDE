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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvdXRpbHMvcHJvbXB0RmlsZXNMb2NhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsWUFBWSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFN0c7O0dBRUc7QUFDSSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFrQjtJQUM5QixZQUNnQyxXQUF5QixFQUNoQixhQUFvQyxFQUNqQyxnQkFBMEM7UUFGdEQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDaEIsa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBQ2pDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBMEI7SUFDbEYsQ0FBQztJQUVMOzs7O09BSUc7SUFDSSxLQUFLLENBQUMsU0FBUztRQUNyQixNQUFNLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDbEYsTUFBTSxpQkFBaUIsR0FBRyxtQkFBbUIsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUUxRixPQUFPLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksS0FBSyxDQUFDLFdBQVcsQ0FDdkIsT0FBdUI7UUFFdkIsT0FBTyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSSwyQkFBMkI7UUFDakMsTUFBTSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0saUJBQWlCLEdBQUcsbUJBQW1CLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFMUYsaUVBQWlFO1FBQ2pFLGlFQUFpRTtRQUNqRSxtRUFBbUU7UUFDbkUsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQyxLQUFLLE1BQU0sZ0JBQWdCLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUNsRCxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsZ0JBQWdCLENBQUM7WUFDaEMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFFNUMsOERBQThEO1lBQzlELDBEQUEwRDtZQUMxRCxNQUFNLFlBQVksR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLHFCQUFxQixFQUFFLENBQUMsQ0FBQztZQUMzRCxLQUFLLE1BQU0sV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUN4QyxJQUFJLFFBQVEsS0FBSyxXQUFXLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUVqRCxTQUFTO2dCQUNWLENBQUM7WUFDRixDQUFDO1lBRUQsZ0VBQWdFO1lBQ2hFLHlEQUF5RDtZQUN6RCxJQUFJLFFBQVEsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ2xELENBQUM7WUFFRCw0REFBNEQ7WUFDNUQsc0RBQXNEO1lBQ3RELElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNoQyxTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFFRCxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNLLEtBQUssQ0FBQyxvQkFBb0IsQ0FDakMsaUJBQWlDO1FBRWpDLDhEQUE4RDtRQUM5RCx3REFBd0Q7UUFDeEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNoQyxLQUFLLE1BQU0sZ0JBQWdCLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUNsRCxNQUFNLENBQ0wsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUNqQyxvREFBb0QsZ0JBQWdCLENBQUMsSUFBSSxJQUFJLENBQzdFLENBQUM7WUFFRiwwRUFBMEU7WUFDMUUsNkVBQTZFO1lBQzdFLGlGQUFpRjtZQUNqRixxRUFBcUU7WUFDckUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ2xILENBQUMsQ0FBQyxnQkFBZ0I7Z0JBQ2xCLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLElBQUkscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1lBRWxFLDJEQUEyRDtZQUMzRCw2REFBNkQ7WUFDN0QsTUFBTSxXQUFXLEdBQUcsTUFBTSxrQkFBa0IsQ0FDM0Msa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQzVCLElBQUksQ0FBQyxXQUFXLENBQ2hCLENBQUM7WUFFRixpRUFBaUU7WUFDakUsK0RBQStEO1lBQy9ELEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2hDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ3JDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQ25CLENBQUM7Q0FDRCxDQUFBO0FBcElZLGtCQUFrQjtJQUU1QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtHQUpkLGtCQUFrQixDQW9JOUI7O0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxPQUFlLEVBQVcsRUFBRTtJQUN2RCxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7SUFDM0IsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUM7SUFFNUIsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBQzFCLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO0lBRTNCLElBQUksaUJBQXFDLENBQUM7SUFDMUMsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM1Qiw4QkFBOEI7UUFDOUIsSUFBSSxpQkFBaUIsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNoQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDekIsU0FBUztRQUNWLENBQUM7UUFFRCxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNsQixjQUFjLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLG1CQUFtQixFQUFFLENBQUM7WUFFdEIsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBQ3pCLFNBQVM7UUFDVixDQUFDO1FBRUQsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDbEIsY0FBYyxHQUFHLElBQUksQ0FBQztZQUN0QixtQkFBbUIsRUFBRSxDQUFDO1lBQ3RCLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUN6QixTQUFTO1FBQ1YsQ0FBQztRQUVELElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ2xCLGFBQWEsR0FBRyxJQUFJLENBQUM7WUFDckIsa0JBQWtCLEVBQUUsQ0FBQztZQUNyQixTQUFTO1FBQ1YsQ0FBQztRQUVELElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ2xCLGFBQWEsR0FBRyxJQUFJLENBQUM7WUFDckIsa0JBQWtCLEVBQUUsQ0FBQztZQUNyQixpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDekIsU0FBUztRQUNWLENBQUM7UUFFRCxpQkFBaUIsR0FBRyxJQUFJLENBQUM7SUFDMUIsQ0FBQztJQUVELG9FQUFvRTtJQUNwRSxJQUFJLGNBQWMsSUFBSSxDQUFDLG1CQUFtQixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbkQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsbUVBQW1FO0lBQ25FLElBQUksYUFBYSxJQUFJLENBQUMsa0JBQWtCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNqRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUMsQ0FBQztBQUVGOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsQ0FDakMsUUFBYSxFQUNQLEVBQUU7SUFDUix3Q0FBd0M7SUFDeEMsTUFBTSxDQUNMLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQ3pCLG9EQUFvRCxRQUFRLENBQUMsSUFBSSxJQUFJLENBQ3JFLENBQUM7SUFFRixnRkFBZ0Y7SUFDaEYsaUZBQWlGO0lBQ2pGLHlFQUF5RTtJQUN6RSxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7UUFDMUMsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVELHlEQUF5RDtJQUN6RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3RDLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFRCx1REFBdUQ7SUFDdkQsT0FBTyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUM7QUFFRjs7R0FFRztBQUNILE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxFQUMvQixRQUFhLEVBQ2IsV0FBeUIsRUFDQyxFQUFFO0lBQzVCLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztJQUV6QixJQUFJLENBQUM7UUFDSixNQUFNLElBQUksR0FBRyxNQUFNLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFakQsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUzQixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3ZDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUNsRCxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFFNUIsU0FBUztnQkFDVixDQUFDO2dCQUVELElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUN2QixNQUFNLFdBQVcsR0FBRyxNQUFNLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7b0JBQzFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQztvQkFFNUIsU0FBUztnQkFDVixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQztJQUNGLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE9BQU87SUFDUixDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBQ0gsTUFBTSxtQkFBbUIsR0FBRyxDQUMzQixtQkFBc0MsRUFDdEMsZ0JBQTBDLEVBQ3pCLEVBQUU7SUFDbkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztJQUNqQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7SUFFcEQsS0FBSyxNQUFNLGtCQUFrQixJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFDdEQsSUFBSSxVQUFVLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7WUFFekMsU0FBUztRQUNWLENBQUM7UUFFRCxLQUFLLE1BQU0sZUFBZSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBRWpGLHFFQUFxRTtZQUNyRSxNQUFNLENBQ0wsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFDN0Isb0RBQW9ELFlBQVksQ0FBQyxJQUFJLElBQUksQ0FDekUsQ0FBQztZQUVGLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMxQixDQUFDO1lBRUQsb0RBQW9EO1lBQ3BELElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDekIsU0FBUztZQUNWLENBQUM7WUFFRCxpRkFBaUY7WUFDakYsa0ZBQWtGO1lBQ2xGLGdEQUFnRDtZQUNoRCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEQsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDcEYsc0RBQXNEO1lBQ3RELElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUM3QyxTQUFTO1lBQ1YsQ0FBQztZQUVELGlGQUFpRjtZQUNqRixpRkFBaUY7WUFDakYscURBQXFEO1lBQ3JELElBQUksa0JBQWtCLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3RFLE1BQU0sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUNoQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMifQ==