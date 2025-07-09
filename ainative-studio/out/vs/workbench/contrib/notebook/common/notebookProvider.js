/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../base/common/glob.js';
import { basename } from '../../../../base/common/path.js';
import { isDocumentExcludePattern } from './notebookCommon.js';
export class NotebookProviderInfo {
    get selectors() {
        return this._selectors;
    }
    get options() {
        return this._options;
    }
    constructor(descriptor) {
        this.extension = descriptor.extension;
        this.id = descriptor.id;
        this.displayName = descriptor.displayName;
        this._selectors = descriptor.selectors?.map(selector => ({
            include: selector.filenamePattern,
            exclude: selector.excludeFileNamePattern || ''
        }))
            || descriptor._selectors
            || [];
        this.priority = descriptor.priority;
        this.providerDisplayName = descriptor.providerDisplayName;
        this._options = {
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            transientOutputs: false,
            cellContentMetadata: {}
        };
    }
    update(args) {
        if (args.selectors) {
            this._selectors = args.selectors;
        }
        if (args.options) {
            this._options = args.options;
        }
    }
    matches(resource) {
        return this.selectors?.some(selector => NotebookProviderInfo.selectorMatches(selector, resource));
    }
    static selectorMatches(selector, resource) {
        if (typeof selector === 'string') {
            // filenamePattern
            if (glob.match(selector.toLowerCase(), basename(resource.fsPath).toLowerCase())) {
                return true;
            }
        }
        if (glob.isRelativePattern(selector)) {
            if (glob.match(selector, basename(resource.fsPath).toLowerCase())) {
                return true;
            }
        }
        if (!isDocumentExcludePattern(selector)) {
            return false;
        }
        const filenamePattern = selector.include;
        const excludeFilenamePattern = selector.exclude;
        if (glob.match(filenamePattern, basename(resource.fsPath).toLowerCase())) {
            if (excludeFilenamePattern) {
                if (glob.match(excludeFilenamePattern, basename(resource.fsPath).toLowerCase())) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    static possibleFileEnding(selectors) {
        for (const selector of selectors) {
            const ending = NotebookProviderInfo._possibleFileEnding(selector);
            if (ending) {
                return ending;
            }
        }
        return undefined;
    }
    static _possibleFileEnding(selector) {
        const pattern = /^.*(\.[a-zA-Z0-9_-]+)$/;
        let candidate;
        if (typeof selector === 'string') {
            candidate = selector;
        }
        else if (glob.isRelativePattern(selector)) {
            candidate = selector.pattern;
        }
        else if (selector.include) {
            return NotebookProviderInfo._possibleFileEnding(selector.include);
        }
        if (candidate) {
            const match = pattern.exec(candidate);
            if (match) {
                return match[1];
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQW9DLHdCQUF3QixFQUFvQixNQUFNLHFCQUFxQixDQUFDO0FBbUJuSCxNQUFNLE9BQU8sb0JBQW9CO0lBU2hDLElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxZQUFZLFVBQW9DO1FBQy9DLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQztRQUN0QyxJQUFJLENBQUMsRUFBRSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1FBQzFDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3hELE9BQU8sRUFBRSxRQUFRLENBQUMsZUFBZTtZQUNqQyxPQUFPLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixJQUFJLEVBQUU7U0FDOUMsQ0FBQyxDQUFDO2VBQ0UsVUFBc0QsQ0FBQyxVQUFVO2VBQ2xFLEVBQUUsQ0FBQztRQUNQLElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FB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