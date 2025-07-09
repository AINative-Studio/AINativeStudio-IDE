/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { DisposableStore, isDisposable } from '../../../../base/common/lifecycle.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../common/core/range.js';
import { IModelService } from '../../../common/services/model.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
export class Link {
    constructor(link, provider) {
        this._link = link;
        this._provider = provider;
    }
    toJSON() {
        return {
            range: this.range,
            url: this.url,
            tooltip: this.tooltip
        };
    }
    get range() {
        return this._link.range;
    }
    get url() {
        return this._link.url;
    }
    get tooltip() {
        return this._link.tooltip;
    }
    async resolve(token) {
        if (this._link.url) {
            return this._link.url;
        }
        if (typeof this._provider.resolveLink === 'function') {
            return Promise.resolve(this._provider.resolveLink(this._link, token)).then(value => {
                this._link = value || this._link;
                if (this._link.url) {
                    // recurse
                    return this.resolve(token);
                }
                return Promise.reject(new Error('missing'));
            });
        }
        return Promise.reject(new Error('missing'));
    }
}
export class LinksList {
    static { this.Empty = new LinksList([]); }
    constructor(tuples) {
        this._disposables = new DisposableStore();
        let links = [];
        for (const [list, provider] of tuples) {
            // merge all links
            const newLinks = list.links.map(link => new Link(link, provider));
            links = LinksList._union(links, newLinks);
            // register disposables
            if (isDisposable(list)) {
                this._disposables ??= new DisposableStore();
                this._disposables.add(list);
            }
        }
        this.links = links;
    }
    dispose() {
        this._disposables?.dispose();
        this.links.length = 0;
    }
    static _union(oldLinks, newLinks) {
        // reunite oldLinks with newLinks and remove duplicates
        const result = [];
        let oldIndex;
        let oldLen;
        let newIndex;
        let newLen;
        for (oldIndex = 0, newIndex = 0, oldLen = oldLinks.length, newLen = newLinks.length; oldIndex < oldLen && newIndex < newLen;) {
            const oldLink = oldLinks[oldIndex];
            const newLink = newLinks[newIndex];
            if (Range.areIntersectingOrTouching(oldLink.range, newLink.range)) {
                // Remove the oldLink
                oldIndex++;
                continue;
            }
            const comparisonResult = Range.compareRangesUsingStarts(oldLink.range, newLink.range);
            if (comparisonResult < 0) {
                // oldLink is before
                result.push(oldLink);
                oldIndex++;
            }
            else {
                // newLink is before
                result.push(newLink);
                newIndex++;
            }
        }
        for (; oldIndex < oldLen; oldIndex++) {
            result.push(oldLinks[oldIndex]);
        }
        for (; newIndex < newLen; newIndex++) {
            result.push(newLinks[newIndex]);
        }
        return result;
    }
}
export async function getLinks(providers, model, token) {
    const lists = [];
    // ask all providers for links in parallel
    const promises = providers.ordered(model).reverse().map(async (provider, i) => {
        try {
            const result = await provider.provideLinks(model, token);
            if (result) {
                lists[i] = [result, provider];
            }
        }
        catch (err) {
            onUnexpectedExternalError(err);
        }
    });
    await Promise.all(promises);
    let res = new LinksList(coalesce(lists));
    if (token.isCancellationRequested) {
        res.dispose();
        res = LinksList.Empty;
    }
    return res;
}
CommandsRegistry.registerCommand('_executeLinkProvider', async (accessor, ...args) => {
    let [uri, resolveCount] = args;
    assertType(uri instanceof URI);
    if (typeof resolveCount !== 'number') {
        resolveCount = 0;
    }
    const { linkProvider } = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return [];
    }
    const list = await getLinks(linkProvider, model, CancellationToken.None);
    if (!list) {
        return [];
    }
    // resolve links
    for (let i = 0; i < Math.min(resolveCount, list.links.length); i++) {
        await list.links[i].resolve(CancellationToken.None);
    }
    const result = list.links.slice(0);
    list.dispose();
    return result;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0TGlua3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbGlua3MvYnJvd3Nlci9nZXRMaW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUc5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFcEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFeEYsTUFBTSxPQUFPLElBQUk7SUFLaEIsWUFBWSxJQUFXLEVBQUUsUUFBc0I7UUFDOUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7SUFDM0IsQ0FBQztJQUVELE1BQU07UUFDTCxPQUFPO1lBQ04sS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNiLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztT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