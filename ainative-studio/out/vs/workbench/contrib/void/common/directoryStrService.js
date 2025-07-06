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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5U3RyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL2RpcmVjdG9yeVN0clNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFHMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBYSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQ0FBZ0MsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRzVILE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQztBQUc3QixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUM7QUFDakMsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsQ0FBQyw4QkFBOEI7QUFFeEUsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUM7QUFDNUIsTUFBTSx5QkFBeUIsR0FBRyxDQUFDLENBQUM7QUFXcEMsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1Qix5QkFBeUIsQ0FBQyxDQUFDO0FBS3JHLGdEQUFnRDtBQUNoRCxNQUFNLHNCQUFzQixHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDL0MsSUFBSSxJQUFJLEtBQUssTUFBTTtRQUNsQixJQUFJLEtBQUssY0FBYztRQUN2QixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FB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