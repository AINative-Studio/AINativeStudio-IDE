/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basicMarkupHtmlTags, hookDomPurifyHrefAndSrcSanitizer } from '../../../../base/browser/dom.js';
import dompurify from '../../../../base/browser/dompurify/dompurify.js';
import { allowedMarkdownAttr } from '../../../../base/browser/markdownRenderer.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { Schemas } from '../../../../base/common/network.js';
import { escape } from '../../../../base/common/strings.js';
import { tokenizeToString } from '../../../../editor/common/languages/textToHtmlTokenizer.js';
import { markedGfmHeadingIdPlugin } from './markedGfmHeadingIdPlugin.js';
export const DEFAULT_MARKDOWN_STYLES = `
body {
	padding: 10px 20px;
	line-height: 22px;
	max-width: 882px;
	margin: 0 auto;
}

body *:last-child {
	margin-bottom: 0;
}

img {
	max-width: 100%;
	max-height: 100%;
}

a {
	text-decoration: var(--text-link-decoration);
}

a:hover {
	text-decoration: underline;
}

a:focus,
input:focus,
select:focus,
textarea:focus {
	outline: 1px solid -webkit-focus-ring-color;
	outline-offset: -1px;
}

hr {
	border: 0;
	height: 2px;
	border-bottom: 2px solid;
}

h1 {
	padding-bottom: 0.3em;
	line-height: 1.2;
	border-bottom-width: 1px;
	border-bottom-style: solid;
}

h1, h2, h3 {
	font-weight: normal;
}

table {
	border-collapse: collapse;
}

th {
	text-align: left;
	border-bottom: 1px solid;
}

th,
td {
	padding: 5px 10px;
}

table > tbody > tr + tr > td {
	border-top-width: 1px;
	border-top-style: solid;
}

blockquote {
	margin: 0 7px 0 5px;
	padding: 0 16px 0 10px;
	border-left-width: 5px;
	border-left-style: solid;
}

code {
	font-family: "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace;
}

pre {
	padding: 16px;
	border-radius: 3px;
	overflow: auto;
}

pre code {
	font-family: var(--vscode-editor-font-family);
	font-weight: var(--vscode-editor-font-weight);
	font-size: var(--vscode-editor-font-size);
	line-height: 1.5;
	color: var(--vscode-editor-foreground);
	tab-size: 4;
}

.monaco-tokenized-source {
	white-space: pre;
}

/** Theming */

.pre {
	background-color: var(--vscode-textCodeBlock-background);
}

.vscode-high-contrast h1 {
	border-color: rgb(0, 0, 0);
}

.vscode-light th {
	border-color: rgba(0, 0, 0, 0.69);
}

.vscode-dark th {
	border-color: rgba(255, 255, 255, 0.69);
}

.vscode-light h1,
.vscode-light hr,
.vscode-light td {
	border-color: rgba(0, 0, 0, 0.18);
}

.vscode-dark h1,
.vscode-dark hr,
.vscode-dark td {
	border-color: rgba(255, 255, 255, 0.18);
}

@media (forced-colors: active) and (prefers-color-scheme: light){
	body {
		forced-color-adjust: none;
	}
}

@media (forced-colors: active) and (prefers-color-scheme: dark){
	body {
		forced-color-adjust: none;
	}
}
`;
const allowedProtocols = [Schemas.http, Schemas.https, Schemas.command];
function sanitize(documentContent, allowUnknownProtocols) {
    const hook = hookDomPurifyHrefAndSrcSanitizer(allowedProtocols, true);
    try {
        return dompurify.sanitize(documentContent, {
            ...{
                ALLOWED_TAGS: [
                    ...basicMarkupHtmlTags,
                    'checkbox',
                    'checklist',
                ],
                ALLOWED_ATTR: [
                    ...allowedMarkdownAttr,
                    'data-command', 'name', 'id', 'role', 'tabindex',
                    'x-dispatch',
                    'required', 'checked', 'placeholder', 'when-checked', 'checked-on',
                ],
            },
            ...(allowUnknownProtocols ? { ALLOW_UNKNOWN_PROTOCOLS: true } : {}),
        });
    }
    finally {
        hook.dispose();
    }
}
/**
 * Renders a string of markdown as a document.
 *
 * Uses VS Code's syntax highlighting code blocks.
 */
export async function renderMarkdownDocument(text, extensionService, languageService, options) {
    const m = new marked.Marked(MarkedHighlight.markedHighlight({
        async: true,
        async highlight(code, lang) {
            if (typeof lang !== 'string') {
                return escape(code);
            }
            await extensionService.whenInstalledExtensionsRegistered();
            if (options?.token?.isCancellationRequested) {
                return '';
            }
            const languageId = languageService.getLanguageIdByLanguageName(lang) ?? languageService.getLanguageIdByLanguageName(lang.split(/\s+|:|,|(?!^)\{|\?]/, 1)[0]);
            return tokenizeToString(languageService, code, languageId);
        }
    }), markedGfmHeadingIdPlugin(), ...(options?.markedExtensions ?? []));
    const raw = await m.parse(text, { async: true });
    if (options?.shouldSanitize ?? true) {
        return sanitize(raw, options?.allowUnknownProtocols ?? false);
    }
    else {
        return raw;
    }
}
var MarkedHighlight;
(function (MarkedHighlight) {
    // Copied from https://github.com/markedjs/marked-highlight/blob/main/src/index.js
    function markedHighlight(options) {
        if (typeof options === 'function') {
            options = {
                highlight: options,
            };
        }
        if (!options || typeof options.highlight !== 'function') {
            throw new Error('Must provide highlight function');
        }
        return {
            async: !!options.async,
            walkTokens(token) {
                if (token.type !== 'code') {
                    return;
                }
                if (options.async) {
                    return Promise.resolve(options.highlight(token.text, token.lang)).then(updateToken(token));
                }
                const code = options.highlight(token.text, token.lang);
                if (code instanceof Promise) {
                    throw new Error('markedHighlight is not set to async but the highlight function is async. Set the async option to true on markedHighlight to await the async highlight function.');
                }
                updateToken(token)(code);
            },
            renderer: {
                code({ text, lang, escaped }) {
                    const classAttr = lang
                        ? ` class="language-${escape(lang)}"`
                        : '';
                    text = text.replace(/\n$/, '');
                    return `<pre><code${classAttr}>${escaped ? text : escape(text, true)}\n</code></pre>`;
                },
            },
        };
    }
    MarkedHighlight.markedHighlight = markedHighlight;
    function updateToken(token) {
        return (code) => {
            if (typeof code === 'string' && code !== token.text) {
                token.escaped = true;
                token.text = code;
            }
        };
    }
    // copied from marked helpers
    const escapeTest = /[&<>"']/;
    const escapeReplace = new RegExp(escapeTest.source, 'g');
    const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
    const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, 'g');
    const escapeReplacement = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        [`'`]: '&#39;',
    };
    const getEscapeReplacement = (ch) => escapeReplacement[ch];
    function escape(html, encode) {
        if (encode) {
            if (escapeTest.test(html)) {
                return html.replace(escapeReplace, getEscapeReplacement);
            }
        }
        else {
            if (escapeTestNoEncode.test(html)) {
                return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
            }
        }
        return html;
    }
})(MarkedHighlight || (MarkedHighlight = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Eb2N1bWVudFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtkb3duL2Jyb3dzZXIvbWFya2Rvd25Eb2N1bWVudFJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hHLE9BQU8sU0FBUyxNQUFNLGlEQUFpRCxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRW5GLE9BQU8sS0FBSyxNQUFNLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU5RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6RSxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E0SXRDLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4RSxTQUFTLFFBQVEsQ0FBQyxlQUF1QixF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