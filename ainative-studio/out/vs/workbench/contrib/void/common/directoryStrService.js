/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { MAX_CHILDREN_URIs_PAGE, MAX_DIRSTR_CHARS_TOTAL_BEGINNING, MAX_DIRSTR_CHARS_TOTAL_TOOL } from './prompt/prompts.js';
const MAX_FILES_TOTAL = 1000;
const START_MAX_DEPTH = Infinity;
const START_MAX_ITEMS_PER_DIR = Infinity; // Add start value as Infinity
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_ITEMS_PER_DIR = 3;
export const IDirectoryStrService = createDecorator('voidDirectoryStrService');
// Check if it's a known filtered type like .git
const shouldExcludeDirectory = (name) => {
    if (name === '.git' ||
        name === 'node_modules' ||
        name.startsWith('.') ||
        name === 'dist' ||
        name === 'build' ||
        name === 'out' ||
        name === 'bin' ||
        name === 'coverage' ||
        name === '__pycache__' ||
        name === 'env' ||
        name === 'venv' ||
        name === 'tmp' ||
        name === 'temp' ||
        name === 'artifacts' ||
        name === 'target' ||
        name === 'obj' ||
        name === 'vendor' ||
        name === 'logs' ||
        name === 'cache' ||
        name === 'resource' ||
        name === 'resources') {
        return true;
    }
    if (name.match(/\bout\b/))
        return true;
    if (name.match(/\bbuild\b/))
        return true;
    return false;
};
// ---------- ONE LAYER DEEP ----------
export const computeDirectoryTree1Deep = async (fileService, rootURI, pageNumber = 1) => {
    const stat = await fileService.resolve(rootURI, { resolveMetadata: false });
    if (!stat.isDirectory) {
        return { children: null, hasNextPage: false, hasPrevPage: false, itemsRemaining: 0 };
    }
    const nChildren = stat.children?.length ?? 0;
    const fromChildIdx = MAX_CHILDREN_URIs_PAGE * (pageNumber - 1);
    const toChildIdx = MAX_CHILDREN_URIs_PAGE * pageNumber - 1; // INCLUSIVE
    const listChildren = stat.children?.slice(fromChildIdx, toChildIdx + 1);
    const children = listChildren?.map(child => ({
        name: child.name,
        uri: child.resource,
        isDirectory: child.isDirectory,
        isSymbolicLink: child.isSymbolicLink
    })) ?? [];
    const hasNextPage = (nChildren - 1) > toChildIdx;
    const hasPrevPage = pageNumber > 1;
    const itemsRemaining = Math.max(0, nChildren - (toChildIdx + 1));
    return {
        children,
        hasNextPage,
        hasPrevPage,
        itemsRemaining
    };
};
export const stringifyDirectoryTree1Deep = (params, result) => {
    if (!result.children) {
        return `Error: ${params.uri} is not a directory`;
    }
    let output = '';
    const entries = result.children;
    if (!result.hasPrevPage) { // is first page
        output += `${params.uri.fsPath}\n`;
    }
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isLast = i === entries.length - 1 && !result.hasNextPage;
        const prefix = isLast ? '└── ' : '├── ';
        output += `${prefix}${entry.name}${entry.isDirectory ? '/' : ''}${entry.isSymbolicLink ? ' (symbolic link)' : ''}\n`;
    }
    if (result.hasNextPage) {
        output += `└── (${result.itemsRemaining} results remaining...)\n`;
    }
    return output;
};
// ---------- IN GENERAL ----------
const resolveChildren = async (children, fileService) => {
    const res = await fileService.resolveAll(children ?? []);
    const stats = res.map(s => s.success ? s.stat : null).filter(s => !!s);
    return stats;
};
// Remove the old computeDirectoryTree function and replace with a combined version that handles both computation and rendering
const computeAndStringifyDirectoryTree = async (eItem, fileService, MAX_CHARS, fileCount = { count: 0 }, options = {}) => {
    // Set default values for options
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const currentDepth = options.currentDepth ?? 0;
    const maxItemsPerDir = options.maxItemsPerDir ?? DEFAULT_MAX_ITEMS_PER_DIR;
    // Check if we've reached the max depth
    if (currentDepth > maxDepth) {
        return { content: '', wasCutOff: true };
    }
    // Check if we've reached the file limit
    if (fileCount.count >= MAX_FILES_TOTAL) {
        return { content: '', wasCutOff: true };
    }
    // If we're already exceeding the max characters, return immediately
    if (MAX_CHARS <= 0) {
        return { content: '', wasCutOff: true };
    }
    // Increment file count
    fileCount.count++;
    // Add the root node first (without tree characters)
    const nodeLine = `${eItem.name}${eItem.isDirectory ? '/' : ''}${eItem.isSymbolicLink ? ' (symbolic link)' : ''}\n`;
    if (nodeLine.length > MAX_CHARS) {
        return { content: '', wasCutOff: true };
    }
    let content = nodeLine;
    let wasCutOff = false;
    let remainingChars = MAX_CHARS - nodeLine.length;
    // Check if it's a directory we should skip
    const isGitIgnoredDirectory = eItem.isDirectory && shouldExcludeDirectory(eItem.name);
    // Fetch and process children if not a filtered directory
    if (eItem.isDirectory && !isGitIgnoredDirectory) {
        // Fetch children with Modified sort order to show recently modified first
        const eChildren = await resolveChildren(eItem.children, fileService);
        // Then recursively add all children with proper tree formatting
        if (eChildren && eChildren.length > 0) {
            const { childrenContent, childrenCutOff } = await renderChildrenCombined(eChildren, remainingChars, '', fileService, fileCount, { maxDepth, currentDepth, maxItemsPerDir } // Pass maxItemsPerDir to the render function
            );
            content += childrenContent;
            wasCutOff = childrenCutOff;
        }
    }
    return { content, wasCutOff };
};
// Helper function to render children with proper tree formatting
const renderChildrenCombined = async (children, maxChars, parentPrefix, fileService, fileCount, options) => {
    const { maxDepth, currentDepth } = options; // Remove maxItemsPerDir from destructuring
    // Get maxItemsPerDir separately and make sure we use it
    // For first level (currentDepth = 0), always use Infinity regardless of what was passed
    const maxItemsPerDir = currentDepth === 0 ?
        Infinity :
        (options.maxItemsPerDir ?? DEFAULT_MAX_ITEMS_PER_DIR);
    const nextDepth = currentDepth + 1;
    let childrenContent = '';
    let childrenCutOff = false;
    let remainingChars = maxChars;
    // Check if we've reached max depth
    if (nextDepth > maxDepth) {
        return { childrenContent: '', childrenCutOff: true };
    }
    // Apply maxItemsPerDir limit - only process the specified number of items
    const itemsToProcess = maxItemsPerDir === Infinity ? children : children.slice(0, maxItemsPerDir);
    const hasMoreItems = children.length > itemsToProcess.length;
    for (let i = 0; i < itemsToProcess.length; i++) {
        // Check if we've reached the file limit
        if (fileCount.count >= MAX_FILES_TOTAL) {
            childrenCutOff = true;
            break;
        }
        const child = itemsToProcess[i];
        const isLast = (i === itemsToProcess.length - 1) && !hasMoreItems;
        // Create the tree branch symbols
        const branchSymbol = isLast ? '└── ' : '├── ';
        const childLine = `${parentPrefix}${branchSymbol}${child.name}${child.isDirectory ? '/' : ''}${child.isSymbolicLink ? ' (symbolic link)' : ''}\n`;
        // Check if adding this line would exceed the limit
        if (childLine.length > remainingChars) {
            childrenCutOff = true;
            break;
        }
        childrenContent += childLine;
        remainingChars -= childLine.length;
        fileCount.count++;
        const nextLevelPrefix = parentPrefix + (isLast ? '    ' : '│   ');
        // Skip processing children for git ignored directories
        const isGitIgnoredDirectory = child.isDirectory && shouldExcludeDirectory(child.name);
        // Create the prefix for the next level (continuation line or space)
        if (child.isDirectory && !isGitIgnoredDirectory) {
            // Fetch children with Modified sort order to show recently modified first
            const eChildren = await resolveChildren(child.children, fileService);
            if (eChildren && eChildren.length > 0) {
                const { childrenContent: grandChildrenContent, childrenCutOff: grandChildrenCutOff } = await renderChildrenCombined(eChildren, remainingChars, nextLevelPrefix, fileService, fileCount, { maxDepth, currentDepth: nextDepth, maxItemsPerDir });
                if (grandChildrenContent.length > 0) {
                    childrenContent += grandChildrenContent;
                    remainingChars -= grandChildrenContent.length;
                }
                if (grandChildrenCutOff) {
                    childrenCutOff = true;
                }
            }
        }
    }
    // Add a message if we truncated the items due to maxItemsPerDir
    if (hasMoreItems) {
        const remainingCount = children.length - itemsToProcess.length;
        const truncatedLine = `${parentPrefix}└── (${remainingCount} more items not shown...)\n`;
        if (truncatedLine.length <= remainingChars) {
            childrenContent += truncatedLine;
            remainingChars -= truncatedLine.length;
        }
        childrenCutOff = true;
    }
    return { childrenContent, childrenCutOff };
};
// ------------------------- FOLDERS -------------------------
export async function getAllUrisInDirectory(directoryUri, maxResults, fileService) {
    const result = [];
    // Helper function to recursively collect URIs
    async function visitAll(folderStat) {
        // Stop if we've reached the limit
        if (result.length >= maxResults) {
            return false;
        }
        try {
            if (!folderStat.isDirectory || !folderStat.children) {
                return true;
            }
            const eChildren = await resolveChildren(folderStat.children, fileService);
            // Process files first (common convention to list files before directories)
            for (const child of eChildren) {
                if (!child.isDirectory) {
                    result.push(child.resource);
                    // Check if we've hit the limit
                    if (result.length >= maxResults) {
                        return false;
                    }
                }
            }
            // Then process directories recursively
            for (const child of eChildren) {
                const isGitIgnored = shouldExcludeDirectory(child.name);
                if (child.isDirectory && !isGitIgnored) {
                    const shouldContinue = await visitAll(child);
                    if (!shouldContinue) {
                        return false;
                    }
                }
            }
            return true;
        }
        catch (error) {
            console.error(`Error processing directory ${folderStat.resource.fsPath}: ${error}`);
            return true; // Continue despite errors in a specific directory
        }
    }
    const rootStat = await fileService.resolve(directoryUri);
    await visitAll(rootStat);
    return result;
}
// --------------------------------------------------
let DirectoryStrService = class DirectoryStrService extends Disposable {
    constructor(workspaceContextService, fileService) {
        super();
        this.workspaceContextService = workspaceContextService;
        this.fileService = fileService;
    }
    async getAllURIsInDirectory(uri, opts) {
        return getAllUrisInDirectory(uri, opts.maxResults, this.fileService);
    }
    async getDirectoryStrTool(uri) {
        const eRoot = await this.fileService.resolve(uri);
        if (!eRoot)
            throw new Error(`The folder ${uri.fsPath} does not exist.`);
        const maxItemsPerDir = START_MAX_ITEMS_PER_DIR; // Use START_MAX_ITEMS_PER_DIR
        // First try with START_MAX_DEPTH
        const { content: initialContent, wasCutOff: initialCutOff } = await computeAndStringifyDirectoryTree(eRoot, this.fileService, MAX_DIRSTR_CHARS_TOTAL_TOOL, { count: 0 }, { maxDepth: START_MAX_DEPTH, currentDepth: 0, maxItemsPerDir });
        // If cut off, try again with DEFAULT_MAX_DEPTH and DEFAULT_MAX_ITEMS_PER_DIR
        let content, wasCutOff;
        if (initialCutOff) {
            const result = await computeAndStringifyDirectoryTree(eRoot, this.fileService, MAX_DIRSTR_CHARS_TOTAL_TOOL, { count: 0 }, { maxDepth: DEFAULT_MAX_DEPTH, currentDepth: 0, maxItemsPerDir: DEFAULT_MAX_ITEMS_PER_DIR });
            content = result.content;
            wasCutOff = result.wasCutOff;
        }
        else {
            content = initialContent;
            wasCutOff = initialCutOff;
        }
        let c = content.substring(0, MAX_DIRSTR_CHARS_TOTAL_TOOL);
        c = `Directory of ${uri.fsPath}:\n${content}`;
        if (wasCutOff)
            c = `${c}\n...Result was truncated...`;
        return c;
    }
    async getAllDirectoriesStr({ cutOffMessage, }) {
        let str = '';
        let cutOff = false;
        const folders = this.workspaceContextService.getWorkspace().folders;
        if (folders.length === 0)
            return '(NO WORKSPACE OPEN)';
        // Use START_MAX_ITEMS_PER_DIR if not specified
        const startMaxItemsPerDir = START_MAX_ITEMS_PER_DIR;
        for (let i = 0; i < folders.length; i += 1) {
            if (i > 0)
                str += '\n';
            // this prioritizes filling 1st workspace before any other, etc
            const f = folders[i];
            str += `Directory of ${f.uri.fsPath}:\n`;
            const rootURI = f.uri;
            const eRoot = await this.fileService.resolve(rootURI);
            if (!eRoot)
                continue;
            // First try with START_MAX_DEPTH and startMaxItemsPerDir
            const { content: initialContent, wasCutOff: initialCutOff } = await computeAndStringifyDirectoryTree(eRoot, this.fileService, MAX_DIRSTR_CHARS_TOTAL_BEGINNING - str.length, { count: 0 }, { maxDepth: START_MAX_DEPTH, currentDepth: 0, maxItemsPerDir: startMaxItemsPerDir });
            // If cut off, try again with DEFAULT_MAX_DEPTH and DEFAULT_MAX_ITEMS_PER_DIR
            let content, wasCutOff;
            if (initialCutOff) {
                const result = await computeAndStringifyDirectoryTree(eRoot, this.fileService, MAX_DIRSTR_CHARS_TOTAL_BEGINNING - str.length, { count: 0 }, { maxDepth: DEFAULT_MAX_DEPTH, currentDepth: 0, maxItemsPerDir: DEFAULT_MAX_ITEMS_PER_DIR });
                content = result.content;
                wasCutOff = result.wasCutOff;
            }
            else {
                content = initialContent;
                wasCutOff = initialCutOff;
            }
            str += content;
            if (wasCutOff) {
                cutOff = true;
                break;
            }
        }
        const ans = cutOff ? `${str.trimEnd()}\n${cutOffMessage}` : str;
        return ans;
    }
};
DirectoryStrService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IFileService)
], DirectoryStrService);
registerSingleton(IDirectoryStrService, DirectoryStrService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5U3RyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vZGlyZWN0b3J5U3RyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUcxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFhLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFOUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdDQUFnQyxFQUFFLDJCQUEyQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHNUgsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDO0FBRzdCLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQztBQUNqQyxNQUFNLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxDQUFDLDhCQUE4QjtBQUV4RSxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQztBQUM1QixNQUFNLHlCQUF5QixHQUFHLENBQUMsQ0FBQztBQVdwQyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHlCQUF5QixDQUFDLENBQUM7QUFLckcsZ0RBQWdEO0FBQ2hELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUMvQyxJQUFJLElBQUksS0FBSyxNQUFNO1FBQ2xCLElBQUksS0FBSyxjQUFjO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FB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