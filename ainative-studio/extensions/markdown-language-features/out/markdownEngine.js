"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownItEngine = void 0;
const vscode = __importStar(require("vscode"));
const previewConfig_1 = require("./preview/previewConfig");
const schemes_1 = require("./util/schemes");
/**
 * Adds begin line index to the output via the 'data-line' data attribute.
 */
const pluginSourceMap = (md) => {
    // Set the attribute on every possible token.
    md.core.ruler.push('source_map_data_attribute', (state) => {
        for (const token of state.tokens) {
            if (token.map && token.type !== 'inline') {
                token.attrSet('data-line', String(token.map[0]));
                token.attrJoin('class', 'code-line');
                token.attrJoin('dir', 'auto');
            }
        }
    });
    // The 'html_block' renderer doesn't respect `attrs`. We need to insert a marker.
    const originalHtmlBlockRenderer = md.renderer.rules['html_block'];
    if (originalHtmlBlockRenderer) {
        md.renderer.rules['html_block'] = (tokens, idx, options, env, self) => (`<div ${self.renderAttrs(tokens[idx])} ></div>\n` +
            originalHtmlBlockRenderer(tokens, idx, options, env, self));
    }
};
class TokenCache {
    tryGetCached(document, config) {
        if (this._cachedDocument
            && this._cachedDocument.uri.toString() === document.uri.toString()
            && document.version >= 0 && this._cachedDocument.version === document.version
            && this._cachedDocument.config.breaks === config.breaks
            && this._cachedDocument.config.linkify === config.linkify) {
            return this._tokens;
        }
        return undefined;
    }
    update(document, config, tokens) {
        this._cachedDocument = {
            uri: document.uri,
            version: document.version,
            config,
        };
        this._tokens = tokens;
    }
    clean() {
        this._cachedDocument = undefined;
        this._tokens = undefined;
    }
}
class MarkdownItEngine {
    constructor(_contributionProvider, slugifier, _logger) {
        this._contributionProvider = _contributionProvider;
        this._logger = _logger;
        this._slugCount = new Map();
        this._tokenCache = new TokenCache();
        this.slugifier = slugifier;
        _contributionProvider.onContributionsChanged(() => {
            // Markdown plugin contributions may have changed
            this._md = undefined;
            this._tokenCache.clean();
        });
    }
    async getEngine(resource) {
        const config = this._getConfig(resource);
        return this._getEngine(config);
    }
    async _getEngine(config) {
        if (!this._md) {
            this._md = (async () => {
                const markdownIt = await Promise.resolve().then(() => __importStar(require('markdown-it')));
                let md = markdownIt.default(await getMarkdownOptions(() => md));
                md.linkify.set({ fuzzyLink: false });
                for (const plugin of this._contributionProvider.contributions.markdownItPlugins.values()) {
                    try {
                        md = (await plugin)(md);
                    }
                    catch (e) {
                        console.error('Could not load markdown it plugin', e);
                    }
                }
                const frontMatterPlugin = await Promise.resolve().then(() => __importStar(require('markdown-it-front-matter')));
                // Extract rules from front matter plugin and apply at a lower precedence
                let fontMatterRule;
                frontMatterPlugin.default({
                    block: {
                        ruler: {
                            before: (_id, _id2, rule) => { fontMatterRule = rule; }
                        }
                    }
                }, () => { });
                md.block.ruler.before('fence', 'front_matter', fontMatterRule, {
                    alt: ['paragraph', 'reference', 'blockquote', 'list']
                });
                this._addImageRenderer(md);
                this._addFencedRenderer(md);
                this._addLinkNormalizer(md);
                this._addLinkValidator(md);
                this._addNamedHeaders(md);
                this._addLinkRenderer(md);
                md.use(pluginSourceMap);
                return md;
            })();
        }
        const md = await this._md;
        md.set(config);
        return md;
    }
    reloadPlugins() {
        this._md = undefined;
    }
    _tokenizeDocument(document, config, engine) {
        const cached = this._tokenCache.tryGetCached(document, config);
        if (cached) {
            this._resetSlugCount();
            return cached;
        }
        this._logger.trace('MarkdownItEngine', `tokenizeDocument - ${document.uri}`);
        const tokens = this._tokenizeString(document.getText(), engine);
        this._tokenCache.update(document, config, tokens);
        return tokens;
    }
    _tokenizeString(text, engine) {
        this._resetSlugCount();
        return engine.parse(text, {});
    }
    _resetSlugCount() {
        this._slugCount = new Map();
    }
    async render(input, resourceProvider) {
        const config = this._getConfig(typeof input === 'string' ? undefined : input.uri);
        const engine = await this._getEngine(config);
        const tokens = typeof input === 'string'
            ? this._tokenizeString(input, engine)
            : this._tokenizeDocument(input, config, engine);
        const env = {
            containingImages: new Set(),
            currentDocument: typeof input === 'string' ? undefined : input.uri,
            resourceProvider,
        };
        const html = engine.renderer.render(tokens, {
            ...engine.options,
            ...config
        }, env);
        return {
            html,
            containingImages: env.containingImages
        };
    }
    async tokenize(document) {
        const config = this._getConfig(document.uri);
        const engine = await this._getEngine(config);
        return this._tokenizeDocument(document, config, engine);
    }
    cleanCache() {
        this._tokenCache.clean();
    }
    _getConfig(resource) {
        const config = previewConfig_1.MarkdownPreviewConfiguration.getForResource(resource ?? null);
        return {
            breaks: config.previewLineBreaks,
            linkify: config.previewLinkify,
            typographer: config.previewTypographer,
        };
    }
    _addImageRenderer(md) {
        const original = md.renderer.rules.image;
        md.renderer.rules.image = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            const src = token.attrGet('src');
            if (src) {
                env.containingImages?.add(src);
                if (!token.attrGet('data-src')) {
                    token.attrSet('src', this._toResourceUri(src, env.currentDocument, env.resourceProvider));
                    token.attrSet('data-src', src);
                }
            }
            if (original) {
                return original(tokens, idx, options, env, self);
            }
            else {
                return self.renderToken(tokens, idx, options);
            }
        };
    }
    _addFencedRenderer(md) {
        const original = md.renderer.rules['fenced'];
        md.renderer.rules['fenced'] = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            if (token.map?.length) {
                token.attrJoin('class', 'hljs');
            }
            if (original) {
                return original(tokens, idx, options, env, self);
            }
            else {
                return self.renderToken(tokens, idx, options);
            }
        };
    }
    _addLinkNormalizer(md) {
        const normalizeLink = md.normalizeLink;
        md.normalizeLink = (link) => {
            try {
                // Normalize VS Code schemes to target the current version
                if ((0, schemes_1.isOfScheme)(schemes_1.Schemes.vscode, link) || (0, schemes_1.isOfScheme)(schemes_1.Schemes['vscode-insiders'], link)) {
                    return normalizeLink(vscode.Uri.parse(link).with({ scheme: vscode.env.uriScheme }).toString());
                }
            }
            catch (e) {
                // noop
            }
            return normalizeLink(link);
        };
    }
    _addLinkValidator(md) {
        const validateLink = md.validateLink;
        md.validateLink = (link) => {
            return validateLink(link)
                || (0, schemes_1.isOfScheme)(schemes_1.Schemes.vscode, link)
                || (0, schemes_1.isOfScheme)(schemes_1.Schemes['vscode-insiders'], link)
                || /^data:image\/.*?;/.test(link);
        };
    }
    _addNamedHeaders(md) {
        const original = md.renderer.rules.heading_open;
        md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
            const title = this._tokenToPlainText(tokens[idx + 1]);
            let slug = this.slugifier.fromHeading(title);
            if (this._slugCount.has(slug.value)) {
                const count = this._slugCount.get(slug.value);
                this._slugCount.set(slug.value, count + 1);
                slug = this.slugifier.fromHeading(slug.value + '-' + (count + 1));
            }
            else {
                this._slugCount.set(slug.value, 0);
            }
            tokens[idx].attrSet('id', slug.value);
            if (original) {
                return original(tokens, idx, options, env, self);
            }
            else {
                return self.renderToken(tokens, idx, options);
            }
        };
    }
    _tokenToPlainText(token) {
        if (token.children) {
            return token.children.map(x => this._tokenToPlainText(x)).join('');
        }
        switch (token.type) {
            case 'text':
            case 'emoji':
            case 'code_inline':
                return token.content;
            default:
                return '';
        }
    }
    _addLinkRenderer(md) {
        const original = md.renderer.rules.link_open;
        md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            const href = token.attrGet('href');
            // A string, including empty string, may be `href`.
            if (typeof href === 'string') {
                token.attrSet('data-href', href);
            }
            if (original) {
                return original(tokens, idx, options, env, self);
            }
            else {
                return self.renderToken(tokens, idx, options);
            }
        };
    }
    _toResourceUri(href, currentDocument, resourceProvider) {
        try {
            // Support file:// links
            if ((0, schemes_1.isOfScheme)(schemes_1.Schemes.file, href)) {
                const uri = vscode.Uri.parse(href);
                if (resourceProvider) {
                    return resourceProvider.asWebviewUri(uri).toString(true);
                }
                // Not sure how to resolve this
                return href;
            }
            // If original link doesn't look like a url with a scheme, assume it must be a link to a file in workspace
            if (!/^[a-z\-]+:/i.test(href)) {
                // Use a fake scheme for parsing
                let uri = vscode.Uri.parse('markdown-link:' + href);
                // Relative paths should be resolved correctly inside the preview but we need to
                // handle absolute paths specially to resolve them relative to the workspace root
                if (uri.path[0] === '/' && currentDocument) {
                    const root = vscode.workspace.getWorkspaceFolder(currentDocument);
                    if (root) {
                        uri = vscode.Uri.joinPath(root.uri, uri.fsPath).with({
                            fragment: uri.fragment,
                            query: uri.query,
                        });
                        if (resourceProvider) {
                            return resourceProvider.asWebviewUri(uri).toString(true);
                        }
                        else {
                            uri = uri.with({ scheme: 'markdown-link' });
                        }
                    }
                }
                return uri.toString(true).replace(/^markdown-link:/, '');
            }
            return href;
        }
        catch {
            return href;
        }
    }
}
exports.MarkdownItEngine = MarkdownItEngine;
async function getMarkdownOptions(md) {
    const hljs = (await Promise.resolve().then(() => __importStar(require('highlight.js')))).default;
    return {
        html: true,
        highlight: (str, lang) => {
            lang = normalizeHighlightLang(lang);
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(str, {
                        language: lang,
                        ignoreIllegals: true,
                    }).value;
                }
                catch (error) { }
            }
            return md().utils.escapeHtml(str);
        }
    };
}
function normalizeHighlightLang(lang) {
    switch (lang && lang.toLowerCase()) {
        case 'shell':
            return 'sh';
        case 'py3':
            return 'python';
        case 'tsx':
        case 'typescriptreact':
            // Workaround for highlight not supporting tsx: https://github.com/isagalaev/highlight.js/issues/1155
            return 'jsx';
        case 'json5':
        case 'jsonc':
            return 'json';
        case 'c#':
        case 'csharp':
            return 'cs';
        default:
            return lang;
    }
}
//# sourceMappingURL=markdownEngine.js.map