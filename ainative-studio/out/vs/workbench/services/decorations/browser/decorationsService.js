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
import { Emitter, DebounceEmitter } from '../../../../base/common/event.js';
import { IDecorationsService } from '../common/decorations.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isThenable } from '../../../../base/common/async.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { createStyleSheet, createCSSRule, removeCSSRulesContainingSelector } from '../../../../base/browser/domStylesheets.js';
import * as cssValue from '../../../../base/browser/cssValue.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { hash } from '../../../../base/common/hash.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { asArray, distinct } from '../../../../base/common/arrays.js';
import { asCssVariable } from '../../../../platform/theme/common/colorRegistry.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
class DecorationRule {
    static keyOf(data) {
        if (Array.isArray(data)) {
            return data.map(DecorationRule.keyOf).join(',');
        }
        else {
            const { color, letter } = data;
            if (ThemeIcon.isThemeIcon(letter)) {
                return `${color}+${letter.id}`;
            }
            else {
                return `${color}/${letter}`;
            }
        }
    }
    static { this._classNamesPrefix = 'monaco-decoration'; }
    constructor(themeService, data, key) {
        this.themeService = themeService;
        this._refCounter = 0;
        this.data = data;
        const suffix = hash(key).toString(36);
        this.itemColorClassName = `${DecorationRule._classNamesPrefix}-itemColor-${suffix}`;
        this.itemBadgeClassName = `${DecorationRule._classNamesPrefix}-itemBadge-${suffix}`;
        this.bubbleBadgeClassName = `${DecorationRule._classNamesPrefix}-bubbleBadge-${suffix}`;
        this.iconBadgeClassName = `${DecorationRule._classNamesPrefix}-iconBadge-${suffix}`;
    }
    acquire() {
        this._refCounter += 1;
    }
    release() {
        return --this._refCounter === 0;
    }
    appendCSSRules(element) {
        if (!Array.isArray(this.data)) {
            this._appendForOne(this.data, element);
        }
        else {
            this._appendForMany(this.data, element);
        }
    }
    _appendForOne(data, element) {
        const { color, letter } = data;
        // label
        createCSSRule(`.${this.itemColorClassName}`, `color: ${getColor(color)};`, element);
        if (ThemeIcon.isThemeIcon(letter)) {
            this._createIconCSSRule(letter, color, element);
        }
        else if (letter) {
            createCSSRule(`.${this.itemBadgeClassName}::after`, `content: "${letter}"; color: ${getColor(color)};`, element);
        }
    }
    _appendForMany(data, element) {
        // label
        const { color } = data.find(d => !!d.color) ?? data[0];
        createCSSRule(`.${this.itemColorClassName}`, `color: ${getColor(color)};`, element);
        // badge or icon
        const letters = [];
        let icon;
        for (const d of data) {
            if (ThemeIcon.isThemeIcon(d.letter)) {
                icon = d.letter;
                break;
            }
            else if (d.letter) {
                letters.push(d.letter);
            }
        }
        if (icon) {
            this._createIconCSSRule(icon, color, element);
        }
        else {
            if (letters.length) {
                createCSSRule(`.${this.itemBadgeClassName}::after`, `content: "${letters.join(', ')}"; color: ${getColor(color)};`, element);
            }
            // bubble badge
            // TODO @misolori update bubble badge to adopt letter: ThemeIcon instead of unicode
            createCSSRule(`.${this.bubbleBadgeClassName}::after`, `content: "\uea71"; color: ${getColor(color)}; font-family: codicon; font-size: 14px; margin-right: 14px; opacity: 0.4;`, element);
        }
    }
    _createIconCSSRule(icon, color, element) {
        const modifier = ThemeIcon.getModifier(icon);
        if (modifier) {
            icon = ThemeIcon.modify(icon, undefined);
        }
        const iconContribution = getIconRegistry().getIcon(icon.id);
        if (!iconContribution) {
            return;
        }
        const definition = this.themeService.getProductIconTheme().getIcon(iconContribution);
        if (!definition) {
            return;
        }
        createCSSRule(`.${this.iconBadgeClassName}::after`, `content: '${definition.fontCharacter}';
			color: ${icon.color ? getColor(icon.color.id) : getColor(color)};
			font-family: ${cssValue.stringValue(definition.font?.id ?? 'codicon')};
			font-size: 16px;
			margin-right: 14px;
			font-weight: normal;
			${modifier === 'spin' ? 'animation: codicon-spin 1.5s steps(30) infinite; font-style: normal !important;' : ''};
			`, element);
    }
    removeCSSRules(element) {
        removeCSSRulesContainingSelector(this.itemColorClassName, element);
        removeCSSRulesContainingSelector(this.itemBadgeClassName, element);
        removeCSSRulesContainingSelector(this.bubbleBadgeClassName, element);
        removeCSSRulesContainingSelector(this.iconBadgeClassName, element);
    }
}
class DecorationStyles {
    constructor(_themeService) {
        this._themeService = _themeService;
        this._dispoables = new DisposableStore();
        this._styleElement = createStyleSheet(undefined, undefined, this._dispoables);
        this._decorationRules = new Map();
    }
    dispose() {
        this._dispoables.dispose();
    }
    asDecoration(data, onlyChildren) {
        // sort by weight
        data.sort((a, b) => (b.weight || 0) - (a.weight || 0));
        const key = DecorationRule.keyOf(data);
        let rule = this._decorationRules.get(key);
        if (!rule) {
            // new css rule
            rule = new DecorationRule(this._themeService, data, key);
            this._decorationRules.set(key, rule);
            rule.appendCSSRules(this._styleElement);
        }
        rule.acquire();
        const labelClassName = rule.itemColorClassName;
        let badgeClassName = rule.itemBadgeClassName;
        const iconClassName = rule.iconBadgeClassName;
        let tooltip = distinct(data.filter(d => !isFalsyOrWhitespace(d.tooltip)).map(d => d.tooltip)).join(' • ');
        const strikethrough = data.some(d => d.strikethrough);
        if (onlyChildren) {
            // show items from its children only
            badgeClassName = rule.bubbleBadgeClassName;
            tooltip = localize('bubbleTitle', "Contains emphasized items");
        }
        return {
            labelClassName,
            badgeClassName,
            iconClassName,
            strikethrough,
            tooltip,
            dispose: () => {
                if (rule?.release()) {
                    this._decorationRules.delete(key);
                    rule.removeCSSRules(this._styleElement);
                    rule = undefined;
                }
            }
        };
    }
}
class FileDecorationChangeEvent {
    constructor(all) {
        this._data = TernarySearchTree.forUris(_uri => true); // events ignore all path casings
        this._data.fill(true, asArray(all));
    }
    affectsResource(uri) {
        return this._data.hasElementOrSubtree(uri);
    }
}
class DecorationDataRequest {
    constructor(source, thenable) {
        this.source = source;
        this.thenable = thenable;
    }
}
function getColor(color) {
    return color ? asCssVariable(color) : 'inherit';
}
let DecorationsService = class DecorationsService {
    constructor(uriIdentityService, themeService) {
        this._store = new DisposableStore();
        this._onDidChangeDecorationsDelayed = this._store.add(new DebounceEmitter({ merge: all => all.flat() }));
        this._onDidChangeDecorations = this._store.add(new Emitter());
        this.onDidChangeDecorations = this._onDidChangeDecorations.event;
        this._provider = new LinkedList();
        this._decorationStyles = new DecorationStyles(themeService);
        this._data = TernarySearchTree.forUris(key => uriIdentityService.extUri.ignorePathCasing(key));
        this._store.add(this._onDidChangeDecorationsDelayed.event(event => { this._onDidChangeDecorations.fire(new FileDecorationChangeEvent(event)); }));
    }
    dispose() {
        this._store.dispose();
        this._data.clear();
    }
    registerDecorationsProvider(provider) {
        const rm = this._provider.unshift(provider);
        this._onDidChangeDecorations.fire({
            // everything might have changed
            affectsResource() { return true; }
        });
        // remove everything what came from this provider
        const removeAll = () => {
            const uris = [];
            for (const [uri, map] of this._data) {
                if (map.delete(provider)) {
                    uris.push(uri);
                }
            }
            if (uris.length > 0) {
                this._onDidChangeDecorationsDelayed.fire(uris);
            }
        };
        const listener = provider.onDidChange(uris => {
            if (!uris) {
                // flush event -> drop all data, can affect everything
                removeAll();
            }
            else {
                // selective changes -> drop for resource, fetch again, send event
                for (const uri of uris) {
                    const map = this._ensureEntry(uri);
                    this._fetchData(map, uri, provider);
                }
            }
        });
        return toDisposable(() => {
            rm();
            listener.dispose();
            removeAll();
        });
    }
    _ensureEntry(uri) {
        let map = this._data.get(uri);
        if (!map) {
            // nothing known about this uri
            map = new Map();
            this._data.set(uri, map);
        }
        return map;
    }
    getDecoration(uri, includeChildren) {
        const all = [];
        let containsChildren = false;
        const map = this._ensureEntry(uri);
        for (const provider of this._provider) {
            let data = map.get(provider);
            if (data === undefined) {
                // sets data if fetch is sync
                data = this._fetchData(map, uri, provider);
            }
            if (data && !(data instanceof DecorationDataRequest)) {
                // having data
                all.push(data);
            }
        }
        if (includeChildren) {
            // (resolved) children
            const iter = this._data.findSuperstr(uri);
            if (iter) {
                for (const tuple of iter) {
                    for (const data of tuple[1].values()) {
                        if (data && !(data instanceof DecorationDataRequest)) {
                            if (data.bubble) {
                                all.push(data);
                                containsChildren = true;
                            }
                        }
                    }
                }
            }
        }
        return all.length === 0
            ? undefined
            : this._decorationStyles.asDecoration(all, containsChildren);
    }
    _fetchData(map, uri, provider) {
        // check for pending request and cancel it
        const pendingRequest = map.get(provider);
        if (pendingRequest instanceof DecorationDataRequest) {
            pendingRequest.source.cancel();
            map.delete(provider);
        }
        const cts = new CancellationTokenSource();
        const dataOrThenable = provider.provideDecorations(uri, cts.token);
        if (!isThenable(dataOrThenable)) {
            // sync -> we have a result now
            cts.dispose();
            return this._keepItem(map, provider, uri, dataOrThenable);
        }
        else {
            // async -> we have a result soon
            const request = new DecorationDataRequest(cts, Promise.resolve(dataOrThenable).then(data => {
                if (map.get(provider) === request) {
                    this._keepItem(map, provider, uri, data);
                }
            }).catch(err => {
                if (!isCancellationError(err) && map.get(provider) === request) {
                    map.delete(provider);
                }
            }).finally(() => {
                cts.dispose();
            }));
            map.set(provider, request);
            return null;
        }
    }
    _keepItem(map, provider, uri, data) {
        const deco = data ? data : null;
        const old = map.get(provider);
        map.set(provider, deco);
        if (deco || old) {
            // only fire event when something changed
            this._onDidChangeDecorationsDelayed.fire(uri);
        }
        return deco;
    }
};
DecorationsService = __decorate([
    __param(0, IUriIdentityService),
    __param(1, IThemeService)
], DecorationsService);
export { DecorationsService };
registerSingleton(IDecorationsService, DecorationsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kZWNvcmF0aW9ucy9icm93c2VyL2RlY29yYXRpb25zU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBc0YsTUFBTSwwQkFBMEIsQ0FBQztBQUNuSixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNqRixPQUFPLEVBQWUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9ILE9BQU8sS0FBSyxRQUFRLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7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