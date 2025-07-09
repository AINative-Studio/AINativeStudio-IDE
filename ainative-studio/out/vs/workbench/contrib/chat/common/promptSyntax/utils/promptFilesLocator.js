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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC91dGlscy9wcm9tcHRGaWxlc0xvY2F0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxZQUFZLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU3Rzs7R0FFRztBQUNJLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBQzlCLFlBQ2dDLFdBQXlCLEVBQ2hCLGFBQW9DLEVBQ2pDLGdCQUEwQztRQUZ0RCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNoQixrQkFBYSxHQUFi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