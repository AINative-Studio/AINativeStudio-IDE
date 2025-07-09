/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parse as jsonParse, getNodeType } from '../../../../base/common/json.js';
import { localize } from '../../../../nls.js';
import { extname, basename } from '../../../../base/common/path.js';
import { SnippetParser, Variable, Placeholder, Text } from '../../../../editor/contrib/snippet/browser/snippetParser.js';
import { KnownSnippetVariableNames } from '../../../../editor/contrib/snippet/browser/snippetVariables.js';
import { relativePath } from '../../../../base/common/resources.js';
import { isObject } from '../../../../base/common/types.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { WindowIdleValue, getActiveWindow } from '../../../../base/browser/dom.js';
class SnippetBodyInsights {
    constructor(body) {
        // init with defaults
        this.isBogous = false;
        this.isTrivial = false;
        this.usesClipboardVariable = false;
        this.usesSelectionVariable = false;
        this.codeSnippet = body;
        // check snippet...
        const textmateSnippet = new SnippetParser().parse(body, false);
        const placeholders = new Map();
        let placeholderMax = 0;
        for (const placeholder of textmateSnippet.placeholders) {
            placeholderMax = Math.max(placeholderMax, placeholder.index);
        }
        // mark snippet as trivial when there is no placeholders or when the only
        // placeholder is the final tabstop and it is at the very end.
        if (textmateSnippet.placeholders.length === 0) {
            this.isTrivial = true;
        }
        else if (placeholderMax === 0) {
            const last = textmateSnippet.children.at(-1);
            this.isTrivial = last instanceof Placeholder && last.isFinalTabstop;
        }
        const stack = [...textmateSnippet.children];
        while (stack.length > 0) {
            const marker = stack.shift();
            if (marker instanceof Variable) {
                if (marker.children.length === 0 && !KnownSnippetVariableNames[marker.name]) {
                    // a 'variable' without a default value and not being one of our supported
                    // variables is automatically turned into a placeholder. This is to restore
                    // a bug we had before. So `${foo}` becomes `${N:foo}`
                    const index = placeholders.has(marker.name) ? placeholders.get(marker.name) : ++placeholderMax;
                    placeholders.set(marker.name, index);
                    const synthetic = new Placeholder(index).appendChild(new Text(marker.name));
                    textmateSnippet.replace(marker, [synthetic]);
                    this.isBogous = true;
                }
                switch (marker.name) {
                    case 'CLIPBOARD':
                        this.usesClipboardVariable = true;
                        break;
                    case 'SELECTION':
                    case 'TM_SELECTED_TEXT':
                        this.usesSelectionVariable = true;
                        break;
                }
            }
            else {
                // recurse
                stack.push(...marker.children);
            }
        }
        if (this.isBogous) {
            this.codeSnippet = textmateSnippet.toTextmateString();
        }
    }
}
export class Snippet {
    constructor(isFileTemplate, scopes, name, prefix, description, body, source, snippetSource, snippetIdentifier, extensionId) {
        this.isFileTemplate = isFileTemplate;
        this.scopes = scopes;
        this.name = name;
        this.prefix = prefix;
        this.description = description;
        this.body = body;
        this.source = source;
        this.snippetSource = snippetSource;
        this.snippetIdentifier = snippetIdentifier;
        this.extensionId = extensionId;
        this.prefixLow = prefix.toLowerCase();
        this._bodyInsights = new WindowIdleValue(getActiveWindow(), () => new SnippetBodyInsights(this.body));
    }
    get codeSnippet() {
        return this._bodyInsights.value.codeSnippet;
    }
    get isBogous() {
        return this._bodyInsights.value.isBogous;
    }
    get isTrivial() {
        return this._bodyInsights.value.isTrivial;
    }
    get needsClipboard() {
        return this._bodyInsights.value.usesClipboardVariable;
    }
    get usesSelection() {
        return this._bodyInsights.value.usesSelectionVariable;
    }
}
function isJsonSerializedSnippet(thing) {
    return isObject(thing) && Boolean(thing.body);
}
export var SnippetSource;
(function (SnippetSource) {
    SnippetSource[SnippetSource["User"] = 1] = "User";
    SnippetSource[SnippetSource["Workspace"] = 2] = "Workspace";
    SnippetSource[SnippetSource["Extension"] = 3] = "Extension";
})(SnippetSource || (SnippetSource = {}));
export class SnippetFile {
    constructor(source, location, defaultScopes, _extension, _fileService, _extensionResourceLoaderService) {
        this.source = source;
        this.location = location;
        this.defaultScopes = defaultScopes;
        this._extension = _extension;
        this._fileService = _fileService;
        this._extensionResourceLoaderService = _extensionResourceLoaderService;
        this.data = [];
        this.isGlobalSnippets = extname(location.path) === '.code-snippets';
        this.isUserSnippets = !this._extension;
    }
    select(selector, bucket) {
        if (this.isGlobalSnippets || !this.isUserSnippets) {
            this._scopeSelect(selector, bucket);
        }
        else {
            this._filepathSelect(selector, bucket);
        }
    }
    _filepathSelect(selector, bucket) {
        // for `fooLang.json` files all snippets are accepted
        if (selector + '.json' === basename(this.location.path)) {
            bucket.push(...this.data);
        }
    }
    _scopeSelect(selector, bucket) {
        // for `my.code-snippets` files we need to look at each snippet
        for (const snippet of this.data) {
            const len = snippet.scopes.length;
            if (len === 0) {
                // always accept
                bucket.push(snippet);
            }
            else {
                for (let i = 0; i < len; i++) {
                    // match
                    if (snippet.scopes[i] === selector) {
                        bucket.push(snippet);
                        break; // match only once!
                    }
                }
            }
        }
        const idx = selector.lastIndexOf('.');
        if (idx >= 0) {
            this._scopeSelect(selector.substring(0, idx), bucket);
        }
    }
    async _load() {
        if (this._extension) {
            return this._extensionResourceLoaderService.readExtensionResource(this.location);
        }
        else {
            const content = await this._fileService.readFile(this.location);
            return content.value.toString();
        }
    }
    load() {
        if (!this._loadPromise) {
            this._loadPromise = Promise.resolve(this._load()).then(content => {
                const data = jsonParse(content);
                if (getNodeType(data) === 'object') {
                    for (const [name, scopeOrTemplate] of Object.entries(data)) {
                        if (isJsonSerializedSnippet(scopeOrTemplate)) {
                            this._parseSnippet(name, scopeOrTemplate, this.data);
                        }
                        else {
                            for (const [name, template] of Object.entries(scopeOrTemplate)) {
                                this._parseSnippet(name, template, this.data);
                            }
                        }
                    }
                }
                return this;
            });
        }
        return this._loadPromise;
    }
    reset() {
        this._loadPromise = undefined;
        this.data.length = 0;
    }
    _parseSnippet(name, snippet, bucket) {
        let { isFileTemplate, prefix, body, description } = snippet;
        if (!prefix) {
            prefix = '';
        }
        if (Array.isArray(body)) {
            body = body.join('\n');
        }
        if (typeof body !== 'string') {
            return;
        }
        if (Array.isArray(description)) {
            description = description.join('\n');
        }
        let scopes;
        if (this.defaultScopes) {
            scopes = this.defaultScopes;
        }
        else if (typeof snippet.scope === 'string') {
            scopes = snippet.scope.split(',').map(s => s.trim()).filter(Boolean);
        }
        else {
            scopes = [];
        }
        let source;
        if (this._extension) {
            // extension snippet -> show the name of the extension
            source = this._extension.displayName || this._extension.name;
        }
        else if (this.source === 2 /* SnippetSource.Workspace */) {
            // workspace -> only *.code-snippets files
            source = localize('source.workspaceSnippetGlobal', "Workspace Snippet");
        }
        else {
            // user -> global (*.code-snippets) and language snippets
            if (this.isGlobalSnippets) {
                source = localize('source.userSnippetGlobal', "Global User Snippet");
            }
            else {
                source = localize('source.userSnippet', "User Snippet");
            }
        }
        for (const _prefix of Iterable.wrap(prefix)) {
            bucket.push(new Snippet(Boolean(isFileTemplate), scopes, name, _prefix, description, body, source, this.source, this._extension ? `${relativePath(this._extension.extensionLocation, this.location)}/${name}` : `${basename(this.location.path)}/${name}`, this._extension?.identifier));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNGaWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvc25pcHBldHNGaWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLElBQUksU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN6SCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUszRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRW5GLE1BQU0sbUJBQW1CO0lBYXhCLFlBQVksSUFBWTtRQUV2QixxQkFBcUI7UUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdkIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEtBQUssQ0FBQztRQUNuQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBQ25DLElBQUksQ0FBQyxXQUFXLEdB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