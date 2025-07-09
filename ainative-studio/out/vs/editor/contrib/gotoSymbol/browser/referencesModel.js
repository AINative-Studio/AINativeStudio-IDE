/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { defaultGenerator } from '../../../../base/common/idGenerator.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { basename, extUri } from '../../../../base/common/resources.js';
import * as strings from '../../../../base/common/strings.js';
import { Range } from '../../../common/core/range.js';
import { localize } from '../../../../nls.js';
export class OneReference {
    constructor(isProviderFirst, parent, link, _rangeCallback) {
        this.isProviderFirst = isProviderFirst;
        this.parent = parent;
        this.link = link;
        this._rangeCallback = _rangeCallback;
        this.id = defaultGenerator.nextId();
    }
    get uri() {
        return this.link.uri;
    }
    get range() {
        return this._range ?? this.link.targetSelectionRange ?? this.link.range;
    }
    set range(value) {
        this._range = value;
        this._rangeCallback(this);
    }
    get ariaMessage() {
        const preview = this.parent.getPreview(this)?.preview(this.range);
        if (!preview) {
            return localize('aria.oneReference', "in {0} on line {1} at column {2}", basename(this.uri), this.range.startLineNumber, this.range.startColumn);
        }
        else {
            return localize({ key: 'aria.oneReference.preview', comment: ['Placeholders are: 0: filename, 1:line number, 2: column number, 3: preview snippet of source code'] }, "{0} in {1} on line {2} at column {3}", preview.value, basename(this.uri), this.range.startLineNumber, this.range.startColumn);
        }
    }
}
export class FilePreview {
    constructor(_modelReference) {
        this._modelReference = _modelReference;
    }
    dispose() {
        this._modelReference.dispose();
    }
    preview(range, n = 8) {
        const model = this._modelReference.object.textEditorModel;
        if (!model) {
            return undefined;
        }
        const { startLineNumber, startColumn, endLineNumber, endColumn } = range;
        const word = model.getWordUntilPosition({ lineNumber: startLineNumber, column: startColumn - n });
        const beforeRange = new Range(startLineNumber, word.startColumn, startLineNumber, startColumn);
        const afterRange = new Range(endLineNumber, endColumn, endLineNumber, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
        const before = model.getValueInRange(beforeRange).replace(/^\s+/, '');
        const inside = model.getValueInRange(range);
        const after = model.getValueInRange(afterRange).replace(/\s+$/, '');
        return {
            value: before + inside + after,
            highlight: { start: before.length, end: before.length + inside.length }
        };
    }
}
export class FileReferences {
    constructor(parent, uri) {
        this.parent = parent;
        this.uri = uri;
        this.children = [];
        this._previews = new ResourceMap();
    }
    dispose() {
        dispose(this._previews.values());
        this._previews.clear();
    }
    getPreview(child) {
        return this._previews.get(child.uri);
    }
    get ariaMessage() {
        const len = this.children.length;
        if (len === 1) {
            return localize('aria.fileReferences.1', "1 symbol in {0}, full path {1}", basename(this.uri), this.uri.fsPath);
        }
        else {
            return localize('aria.fileReferences.N', "{0} symbols in {1}, full path {2}", len, basename(this.uri), this.uri.fsPath);
        }
    }
    async resolve(textModelResolverService) {
        if (this._previews.size !== 0) {
            return this;
        }
        for (const child of this.children) {
            if (this._previews.has(child.uri)) {
                continue;
            }
            try {
                const ref = await textModelResolverService.createModelReference(child.uri);
                this._previews.set(child.uri, new FilePreview(ref));
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
        return this;
    }
}
export class ReferencesModel {
    constructor(links, title) {
        this.groups = [];
        this.references = [];
        this._onDidChangeReferenceRange = new Emitter();
        this.onDidChangeReferenceRange = this._onDidChangeReferenceRange.event;
        this._links = links;
        this._title = title;
        // grouping and sorting
        const [providersFirst] = links;
        links.sort(ReferencesModel._compareReferences);
        let current;
        for (const link of links) {
            if (!current || !extUri.isEqual(current.uri, link.uri, true)) {
                // new group
                current = new FileReferences(this, link.uri);
                this.groups.push(current);
            }
            // append, check for equality first!
            if (current.children.length === 0 || ReferencesModel._compareReferences(link, current.children[current.children.length - 1]) !== 0) {
                const oneRef = new OneReference(providersFirst === link, current, link, ref => this._onDidChangeReferenceRange.fire(ref));
                this.references.push(oneRef);
                current.children.push(oneRef);
            }
        }
    }
    dispose() {
        dispose(this.groups);
        this._onDidChangeReferenceRange.dispose();
        this.groups.length = 0;
    }
    clone() {
        return new ReferencesModel(this._links, this._title);
    }
    get title() {
        return this._title;
    }
    get isEmpty() {
        return this.groups.length === 0;
    }
    get ariaMessage() {
        if (this.isEmpty) {
            return localize('aria.result.0', "No results found");
        }
        else if (this.references.length === 1) {
            return localize('aria.result.1', "Found 1 symbol in {0}", this.references[0].uri.fsPath);
        }
        else if (this.groups.length === 1) {
            return localize('aria.result.n1', "Found {0} symbols in {1}", this.references.length, this.groups[0].uri.fsPath);
        }
        else {
            return localize('aria.result.nm', "Found {0} symbols in {1} files", this.references.length, this.groups.length);
        }
    }
    nextOrPreviousReference(reference, next) {
        const { parent } = reference;
        let idx = parent.children.indexOf(reference);
        const childCount = parent.children.length;
        const groupCount = parent.parent.groups.length;
        if (groupCount === 1 || next && idx + 1 < childCount || !next && idx > 0) {
            // cycling within one file
            if (next) {
                idx = (idx + 1) % childCount;
            }
            else {
                idx = (idx + childCount - 1) % childCount;
            }
            return parent.children[idx];
        }
        idx = parent.parent.groups.indexOf(parent);
        if (next) {
            idx = (idx + 1) % groupCount;
            return parent.parent.groups[idx].children[0];
        }
        else {
            idx = (idx + groupCount - 1) % groupCount;
            return parent.parent.groups[idx].children[parent.parent.groups[idx].children.length - 1];
        }
    }
    nearestReference(resource, position) {
        const nearest = this.references.map((ref, idx) => {
            return {
                idx,
                prefixLen: strings.commonPrefixLength(ref.uri.toString(), resource.toString()),
                offsetDist: Math.abs(ref.range.startLineNumber - position.lineNumber) * 100 + Math.abs(ref.range.startColumn - position.column)
            };
        }).sort((a, b) => {
            if (a.prefixLen > b.prefixLen) {
                return -1;
            }
            else if (a.prefixLen < b.prefixLen) {
                return 1;
            }
            else if (a.offsetDist < b.offsetDist) {
                return -1;
            }
            else if (a.offsetDist > b.offsetDist) {
                return 1;
            }
            else {
                return 0;
            }
        })[0];
        if (nearest) {
            return this.references[nearest.idx];
        }
        return undefined;
    }
    referenceAt(resource, position) {
        for (const ref of this.references) {
            if (ref.uri.toString() === resource.toString()) {
                if (Range.containsPosition(ref.range, position)) {
                    return ref;
                }
            }
        }
        return undefined;
    }
    firstReference() {
        for (const ref of this.references) {
            if (ref.isProviderFirst) {
                return ref;
            }
        }
        return this.references[0];
    }
    static _compareReferences(a, b) {
        return extUri.compare(a.uri, b.uri) || Range.compareRangesUsingStarts(a.range, b.range);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9yZWZlcmVuY2VzTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQTJCLE1BQU0sc0NBQXNDLENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUk5RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE1BQU0sT0FBTyxZQUFZO0lBTXhCLFlBQ1UsZUFBd0IsRUFDeEIsTUFBc0IsRUFDdEIsSUFBa0IsRUFDbkIsY0FBMkM7UUFIMUMsb0JBQWUsR0FBZixlQUFlLENBQVM7UUFDeEIsV0FBTSxHQUFOLE1BQU0sQ0FBZ0I7UUFDdEIsU0FBSSxHQUFKLElBQUksQ0FBYztRQUNuQixtQkFBYyxHQUFkLGNBQWMsQ0FBNkI7UUFSM0MsT0FBRSxHQUFXLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO0lBUzVDLENBQUM7SUFFTCxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxJQUFJ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