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
import { binarySearch, coalesceInPlace, equals } from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LRUCache } from '../../../../base/common/map.js';
import { commonPrefixLength } from '../../../../base/common/strings.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IModelService } from '../../../common/services/model.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
export class TreeElement {
    remove() {
        this.parent?.children.delete(this.id);
    }
    static findId(candidate, container) {
        // complex id-computation which contains the origin/extension,
        // the parent path, and some dedupe logic when names collide
        let candidateId;
        if (typeof candidate === 'string') {
            candidateId = `${container.id}/${candidate}`;
        }
        else {
            candidateId = `${container.id}/${candidate.name}`;
            if (container.children.get(candidateId) !== undefined) {
                candidateId = `${container.id}/${candidate.name}_${candidate.range.startLineNumber}_${candidate.range.startColumn}`;
            }
        }
        let id = candidateId;
        for (let i = 0; container.children.get(id) !== undefined; i++) {
            id = `${candidateId}_${i}`;
        }
        return id;
    }
    static getElementById(id, element) {
        if (!id) {
            return undefined;
        }
        const len = commonPrefixLength(id, element.id);
        if (len === id.length) {
            return element;
        }
        if (len < element.id.length) {
            return undefined;
        }
        for (const [, child] of element.children) {
            const candidate = TreeElement.getElementById(id, child);
            if (candidate) {
                return candidate;
            }
        }
        return undefined;
    }
    static size(element) {
        let res = 1;
        for (const [, child] of element.children) {
            res += TreeElement.size(child);
        }
        return res;
    }
    static empty(element) {
        return element.children.size === 0;
    }
}
export class OutlineElement extends TreeElement {
    constructor(id, parent, symbol) {
        super();
        this.id = id;
        this.parent = parent;
        this.symbol = symbol;
        this.children = new Map();
    }
}
export class OutlineGroup extends TreeElement {
    constructor(id, parent, label, order) {
        super();
        this.id = id;
        this.parent = parent;
        this.label = label;
        this.order = order;
        this.children = new Map();
    }
    getItemEnclosingPosition(position) {
        return position ? this._getItemEnclosingPosition(position, this.children) : undefined;
    }
    _getItemEnclosingPosition(position, children) {
        for (const [, item] of children) {
            if (!item.symbol.range || !Range.containsPosition(item.symbol.range, position)) {
                continue;
            }
            return this._getItemEnclosingPosition(position, item.children) || item;
        }
        return undefined;
    }
    updateMarker(marker) {
        for (const [, child] of this.children) {
            this._updateMarker(marker, child);
        }
    }
    _updateMarker(markers, item) {
        item.marker = undefined;
        // find the proper start index to check for item/marker overlap.
        const idx = binarySearch(markers, item.symbol.range, Range.compareRangesUsingStarts);
        let start;
        if (idx < 0) {
            start = ~idx;
            if (start > 0 && Range.areIntersecting(markers[start - 1], item.symbol.range)) {
                start -= 1;
            }
        }
        else {
            start = idx;
        }
        const myMarkers = [];
        let myTopSev;
        for (; start < markers.length && Range.areIntersecting(item.symbol.range, markers[start]); start++) {
            // remove markers intersecting with this outline element
            // and store them in a 'private' array.
            const marker = markers[start];
            myMarkers.push(marker);
            markers[start] = undefined;
            if (!myTopSev || marker.severity > myTopSev) {
                myTopSev = marker.severity;
            }
        }
        // Recurse into children and let them match markers that have matched
        // this outline element. This might remove markers from this element and
        // therefore we remember that we have had markers. That allows us to render
        // the dot, saying 'this element has children with markers'
        for (const [, child] of item.children) {
            this._updateMarker(myMarkers, child);
        }
        if (myTopSev) {
            item.marker = {
                count: myMarkers.length,
                topSev: myTopSev
            };
        }
        coalesceInPlace(markers);
    }
}
export class OutlineModel extends TreeElement {
    static create(registry, textModel, token) {
        const cts = new CancellationTokenSource(token);
        const result = new OutlineModel(textModel.uri);
        const provider = registry.ordered(textModel);
        const promises = provider.map((provider, index) => {
            const id = TreeElement.findId(`provider_${index}`, result);
            const group = new OutlineGroup(id, result, provider.displayName ?? 'Unknown Outline Provider', index);
            return Promise.resolve(provider.provideDocumentSymbols(textModel, cts.token)).then(result => {
                for (const info of result || []) {
                    OutlineModel._makeOutlineElement(info, group);
                }
                return group;
            }, err => {
                onUnexpectedExternalError(err);
                return group;
            }).then(group => {
                if (!TreeElement.empty(group)) {
                    result._groups.set(id, group);
                }
                else {
                    group.remove();
                }
            });
        });
        const listener = registry.onDidChange(() => {
            const newProvider = registry.ordered(textModel);
            if (!equals(newProvider, provider)) {
                cts.cancel();
            }
        });
        return Promise.all(promises).then(() => {
            if (cts.token.isCancellationRequested && !token.isCancellationRequested) {
                return OutlineModel.create(registry, textModel, token);
            }
            else {
                return result._compact();
            }
        }).finally(() => {
            cts.dispose();
            listener.dispose();
            cts.dispose();
        });
    }
    static _makeOutlineElement(info, container) {
        const id = TreeElement.findId(info, container);
        const res = new OutlineElement(id, container, info);
        if (info.children) {
            for (const childInfo of info.children) {
                OutlineModel._makeOutlineElement(childInfo, res);
            }
        }
        container.children.set(res.id, res);
    }
    static get(element) {
        while (element) {
            if (element instanceof OutlineModel) {
                return element;
            }
            element = element.parent;
        }
        return undefined;
    }
    constructor(uri) {
        super();
        this.uri = uri;
        this.id = 'root';
        this.parent = undefined;
        this._groups = new Map();
        this.children = new Map();
        this.id = 'root';
        this.parent = undefined;
    }
    _compact() {
        let count = 0;
        for (const [key, group] of this._groups) {
            if (group.children.size === 0) { // empty
                this._groups.delete(key);
            }
            else {
                count += 1;
            }
        }
        if (count !== 1) {
            //
            this.children = this._groups;
        }
        else {
            // adopt all elements of the first group
            const group = Iterable.first(this._groups.values());
            for (const [, child] of group.children) {
                child.parent = this;
                this.children.set(child.id, child);
            }
        }
        return this;
    }
    merge(other) {
        if (this.uri.toString() !== other.uri.toString()) {
            return false;
        }
        if (this._groups.size !== other._groups.size) {
            return false;
        }
        this._groups = other._groups;
        this.children = other.children;
        return true;
    }
    getItemEnclosingPosition(position, context) {
        let preferredGroup;
        if (context) {
            let candidate = context.parent;
            while (candidate && !preferredGroup) {
                if (candidate instanceof OutlineGroup) {
                    preferredGroup = candidate;
                }
                candidate = candidate.parent;
            }
        }
        let result = undefined;
        for (const [, group] of this._groups) {
            result = group.getItemEnclosingPosition(position);
            if (result && (!preferredGroup || preferredGroup === group)) {
                break;
            }
        }
        return result;
    }
    getItemById(id) {
        return TreeElement.getElementById(id, this);
    }
    updateMarker(marker) {
        // sort markers by start range so that we can use
        // outline element starts for quicker look up
        marker.sort(Range.compareRangesUsingStarts);
        for (const [, group] of this._groups) {
            group.updateMarker(marker.slice(0));
        }
    }
    getTopLevelSymbols() {
        const roots = [];
        for (const child of this.children.values()) {
            if (child instanceof OutlineElement) {
                roots.push(child.symbol);
            }
            else {
                roots.push(...Iterable.map(child.children.values(), child => child.symbol));
            }
        }
        return roots.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
    }
    asListOfDocumentSymbols() {
        const roots = this.getTopLevelSymbols();
        const bucket = [];
        OutlineModel._flattenDocumentSymbols(bucket, roots, '');
        return bucket.sort((a, b) => Position.compare(Range.getStartPosition(a.range), Range.getStartPosition(b.range)) || Position.compare(Range.getEndPosition(b.range), Range.getEndPosition(a.range)));
    }
    static _flattenDocumentSymbols(bucket, entries, overrideContainerLabel) {
        for (const entry of entries) {
            bucket.push({
                kind: entry.kind,
                tags: entry.tags,
                name: entry.name,
                detail: entry.detail,
                containerName: entry.containerName || overrideContainerLabel,
                range: entry.range,
                selectionRange: entry.selectionRange,
                children: undefined, // we flatten it...
            });
            // Recurse over children
            if (entry.children) {
                OutlineModel._flattenDocumentSymbols(bucket, entry.children, entry.name);
            }
        }
    }
}
export const IOutlineModelService = createDecorator('IOutlineModelService');
let OutlineModelService = class OutlineModelService {
    constructor(_languageFeaturesService, debounces, modelService) {
        this._languageFeaturesService = _languageFeaturesService;
        this._disposables = new DisposableStore();
        this._cache = new LRUCache(15, 0.7);
        this._debounceInformation = debounces.for(_languageFeaturesService.documentSymbolProvider, 'DocumentSymbols', { min: 350 });
        // don't cache outline models longer than their text model
        this._disposables.add(modelService.onModelRemoved(textModel => {
            this._cache.delete(textModel.id);
        }));
    }
    dispose() {
        this._disposables.dispose();
    }
    async getOrCreate(textModel, token) {
        const registry = this._languageFeaturesService.documentSymbolProvider;
        const provider = registry.ordered(textModel);
        let data = this._cache.get(textModel.id);
        if (!data || data.versionId !== textModel.getVersionId() || !equals(data.provider, provider)) {
            const source = new CancellationTokenSource();
            data = {
                versionId: textModel.getVersionId(),
                provider,
                promiseCnt: 0,
                source,
                promise: OutlineModel.create(registry, textModel, source.token),
                model: undefined,
            };
            this._cache.set(textModel.id, data);
            const now = Date.now();
            data.promise.then(outlineModel => {
                data.model = outlineModel;
                this._debounceInformation.update(textModel, Date.now() - now);
            }).catch(_err => {
                this._cache.delete(textModel.id);
            });
        }
        if (data.model) {
            // resolved -> return data
            return data.model;
        }
        // increase usage counter
        data.promiseCnt += 1;
        const listener = token.onCancellationRequested(() => {
            // last -> cancel provider request, remove cached promise
            if (--data.promiseCnt === 0) {
                data.source.cancel();
                this._cache.delete(textModel.id);
            }
        });
        try {
            return await data.promise;
        }
        finally {
            listener.dispose();
        }
    }
    getDebounceValue(textModel) {
        return this._debounceInformation.get(textModel);
    }
    getCachedModels() {
        return Iterable.filter(Iterable.map(this._cache.values(), entry => entry.model), model => model !== undefined);
    }
};
OutlineModelService = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, ILanguageFeatureDebounceService),
    __param(2, IModelService)
], OutlineModelService);
export { OutlineModelService };
registerSingleton(IOutlineModelService, OutlineModelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZU1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2RvY3VtZW50U3ltYm9scy9icm93c2VyL291dGxpbmVNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV4RSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdkUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBSTlELE9BQU8sRUFBK0IsK0JBQStCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFeEYsTUFBTSxPQUFnQixXQUFXO0lBTWhD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