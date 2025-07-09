/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalArgument } from './errors.js';
import { escapeIcons } from './iconLabels.js';
import { Schemas } from './network.js';
import { isEqual } from './resources.js';
import { escapeRegExpCharacters } from './strings.js';
import { URI } from './uri.js';
export var MarkdownStringTextNewlineStyle;
(function (MarkdownStringTextNewlineStyle) {
    MarkdownStringTextNewlineStyle[MarkdownStringTextNewlineStyle["Paragraph"] = 0] = "Paragraph";
    MarkdownStringTextNewlineStyle[MarkdownStringTextNewlineStyle["Break"] = 1] = "Break";
})(MarkdownStringTextNewlineStyle || (MarkdownStringTextNewlineStyle = {}));
export class MarkdownString {
    static lift(dto) {
        const markdownString = new MarkdownString(dto.value, dto);
        markdownString.uris = dto.uris;
        markdownString.baseUri = dto.baseUri ? URI.revive(dto.baseUri) : undefined;
        return markdownString;
    }
    constructor(value = '', isTrustedOrOptions = false) {
        this.value = value;
        if (typeof this.value !== 'string') {
            throw illegalArgument('value');
        }
        if (typeof isTrustedOrOptions === 'boolean') {
            this.isTrusted = isTrustedOrOptions;
            this.supportThemeIcons = false;
            this.supportHtml = false;
        }
        else {
            this.isTrusted = isTrustedOrOptions.isTrusted ?? undefined;
            this.supportThemeIcons = isTrustedOrOptions.supportThemeIcons ?? false;
            this.supportHtml = isTrustedOrOptions.supportHtml ?? false;
        }
    }
    appendText(value, newlineStyle = 0 /* MarkdownStringTextNewlineStyle.Paragraph */) {
        this.value += escapeMarkdownSyntaxTokens(this.supportThemeIcons ? escapeIcons(value) : value) // CodeQL [SM02383] The Markdown is fully sanitized after being rendered.
            .replace(/([ \t]+)/g, (_match, g1) => '&nbsp;'.repeat(g1.length)) // CodeQL [SM02383] The Markdown is fully sanitized after being rendered.
            .replace(/\>/gm, '\\>') // CodeQL [SM02383] The Markdown is fully sanitized after being rendered.
            .replace(/\n/g, newlineStyle === 1 /* MarkdownStringTextNewlineStyle.Break */ ? '\\\n' : '\n\n'); // CodeQL [SM02383] The Markdown is fully sanitized after being rendered.
        return this;
    }
    appendMarkdown(value) {
        this.value += value;
        return this;
    }
    appendCodeblock(langId, code) {
        this.value += `\n${appendEscapedMarkdownCodeBlockFence(code, langId)}\n`;
        return this;
    }
    appendLink(target, label, title) {
        this.value += '[';
        this.value += this._escape(label, ']');
        this.value += '](';
        this.value += this._escape(String(target), ')');
        if (title) {
            this.value += ` "${this._escape(this._escape(title, '"'), ')')}"`;
        }
        this.value += ')';
        return this;
    }
    _escape(value, ch) {
        const r = new RegExp(escapeRegExpCharacters(ch), 'g');
        return value.replace(r, (match, offset) => {
            if (value.charAt(offset - 1) !== '\\') {
                return `\\${match}`;
            }
            else {
                return match;
            }
        });
    }
}
export function isEmptyMarkdownString(oneOrMany) {
    if (isMarkdownString(oneOrMany)) {
        return !oneOrMany.value;
    }
    else if (Array.isArray(oneOrMany)) {
        return oneOrMany.every(isEmptyMarkdownString);
    }
    else {
        return true;
    }
}
export function isMarkdownString(thing) {
    if (thing instanceof MarkdownString) {
        return true;
    }
    else if (thing && typeof thing === 'object') {
        return typeof thing.value === 'string'
            && (typeof thing.isTrusted === 'boolean' || typeof thing.isTrusted === 'object' || thing.isTrusted === undefined)
            && (typeof thing.supportThemeIcons === 'boolean' || thing.supportThemeIcons === undefined);
    }
    return false;
}
export function markdownStringEqual(a, b) {
    if (a === b) {
        return true;
    }
    else if (!a || !b) {
        return false;
    }
    else {
        return a.value === b.value
            && a.isTrusted === b.isTrusted
            && a.supportThemeIcons === b.supportThemeIcons
            && a.supportHtml === b.supportHtml
            && (a.baseUri === b.baseUri || !!a.baseUri && !!b.baseUri && isEqual(URI.from(a.baseUri), URI.from(b.baseUri)));
    }
}
export function escapeMarkdownSyntaxTokens(text) {
    // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
    return text.replace(/[\\`*_{}[\]()#+\-!~]/g, '\\$&'); // CodeQL [SM02383] Backslash is escaped in the character class
}
/**
 * @see https://github.com/microsoft/vscode/issues/193746
 */
export function appendEscapedMarkdownCodeBlockFence(code, langId) {
    const longestFenceLength = code.match(/^`+/gm)?.reduce((a, b) => (a.length > b.length ? a : b)).length ??
        0;
    const desiredFenceLength = longestFenceLength >= 3 ? longestFenceLength + 1 : 3;
    // the markdown result
    return [
        `${'`'.repeat(desiredFenceLength)}${langId}`,
        code,
        `${'`'.repeat(desiredFenceLength)}`,
    ].join('\n');
}
export function escapeDoubleQuotes(input) {
    return input.replace(/"/g, '&quot;');
}
export function removeMarkdownEscapes(text) {
    if (!text) {
        return text;
    }
    return text.replace(/\\([\\`*_{}[\]()#+\-.!~])/g, '$1');
}
export function parseHrefAndDimensions(href) {
    const dimensions = [];
    const splitted = href.split('|').map(s => s.trim());
    href = splitted[0];
    const parameters = splitted[1];
    if (parameters) {
        const heightFromParams = /height=(\d+)/.exec(parameters);
        const widthFromParams = /width=(\d+)/.exec(parameters);
        const height = heightFromParams ? heightFromParams[1] : '';
        const width = widthFromParams ? widthFromParams[1] : '';
        const widthIsFinite = isFinite(parseInt(width));
        const heightIsFinite = isFinite(parseInt(height));
        if (widthIsFinite) {
            dimensions.push(`width="${width}"`);
        }
        if (heightIsFinite) {
            dimensions.push(`height="${height}"`);
        }
    }
    return { href, dimensions };
}
export function markdownCommandLink(command) {
    const uri = URI.from({
        scheme: Schemas.command,
        path: command.id,
        query: command.arguments?.length ? encodeURIComponent(JSON.stringify(command.arguments)) : undefined,
    }).toString();
    return `[${escapeMarkdownSyntaxTokens(command.title)}](${uri})`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbENvbnRlbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vaHRtbENvbnRlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM5QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDekMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3RELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sVUFBVSxDQUFDO0FBZTlDLE1BQU0sQ0FBTixJQUFrQiw4QkFHakI7QUFIRCxXQUFrQiw4QkFBOEI7SUFDL0MsNkZBQWEsQ0FBQTtJQUNiLHFGQUFTLENBQUE7QUFDVixDQUFDLEVBSGlCLDhCQUE4QixLQUE5Qiw4QkFBOEIsUUFHL0M7QUFFRCxNQUFNLE9BQU8sY0FBYztJQVNuQixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQW9CO1FBQ3RDLE1BQU0sY0FBYyxHQUFHLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUQsY0FBYyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQy9CLGNBQWMsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUMzRSxPQUFPLGNBQWMsQ0FBQztJQUN2QixDQUFDO0lBRUQs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