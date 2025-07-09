/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5U3RyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9kaXJlY3RvcnlTdHJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQWEsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUU5RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0NBQWdDLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUc1SCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUM7QUFHN0IsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDO0FBQ2pDLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLENBQUMsOEJBQThCO0FBRXhFLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxDQUFDO0FBV3BDLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIseUJBQXlCLENBQUMsQ0FBQztBQUtyRyxnREFBZ0Q7QUFDaEQsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO0lBQy9DLElBQUksSUFBSSxLQUFLLE1BQU07UUFDbEIsSUFBSSxLQUFLLGNBQWM7UUFDdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENB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