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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNGaWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9zbmlwcGV0c0ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssSUFBSSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3pILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBSzNHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFbkYsTUFBTSxtQkFBbUI7SUFheEIsWUFBWSxJQUFZO1FBRXZCLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMscUJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBQ25DLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxLQUFLLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FB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