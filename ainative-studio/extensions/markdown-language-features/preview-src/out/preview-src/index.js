"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const activeLineMarker_1 = require("./activeLineMarker");
const events_1 = require("./events");
const messaging_1 = require("./messaging");
const scroll_sync_1 = require("./scroll-sync");
const settings_1 = require("./settings");
const throttle = require("lodash.throttle");
const morphdom_1 = __importDefault(require("morphdom"));
const schemes_1 = require("../src/util/schemes");
let scrollDisabledCount = 0;
const marker = new activeLineMarker_1.ActiveLineMarker();
const settings = new settings_1.SettingsManager();
let documentVersion = 0;
let documentResource = settings.settings.source;
const vscode = acquireVsCodeApi();
const originalState = vscode.getState() ?? {};
const state = {
    ...originalState,
    ...(0, settings_1.getData)('data-state')
};
if (typeof originalState.scrollProgress !== 'undefined' && originalState?.resource !== state.resource) {
    state.scrollProgress = 0;
}
// Make sure to sync VS Code state here
vscode.setState(state);
const messaging = (0, messaging_1.createPosterForVsCode)(vscode, settings);
window.cspAlerter.setPoster(messaging);
window.styleLoadingMonitor.setPoster(messaging);
function doAfterImagesLoaded(cb) {
    const imgElements = document.getElementsByTagName('img');
    if (imgElements.length > 0) {
        const ps = Array.from(imgElements, e => {
            if (e.complete) {
                return Promise.resolve();
            }
            else {
                return new Promise((resolve) => {
                    e.addEventListener('load', () => resolve());
                    e.addEventListener('error', () => resolve());
                });
            }
        });
        Promise.all(ps).then(() => setTimeout(cb, 0));
    }
    else {
        setTimeout(cb, 0);
    }
}
(0, events_1.onceDocumentLoaded)(() => {
    // Load initial html
    const htmlParser = new DOMParser();
    const markDownHtml = htmlParser.parseFromString((0, settings_1.getRawData)('data-initial-md-content'), 'text/html');
    const newElements = [...markDownHtml.body.children];
    document.body.append(...newElements);
    for (const el of newElements) {
        if (el instanceof HTMLElement) {
            domEval(el);
        }
    }
    // Restore
    const scrollProgress = state.scrollProgress;
    addImageContexts();
    if (typeof scrollProgress === 'number' && !settings.settings.fragment) {
        doAfterImagesLoaded(() => {
            scrollDisabledCount += 1;
            // Always set scroll of at least 1 to prevent VS Code's webview code from auto scrolling us
            const scrollToY = Math.max(1, scrollProgress * document.body.clientHeight);
            window.scrollTo(0, scrollToY);
        });
        return;
    }
    if (settings.settings.scrollPreviewWithEditor) {
        doAfterImagesLoaded(() => {
            // Try to scroll to fragment if available
            if (settings.settings.fragment) {
                let fragment;
                try {
                    fragment = encodeURIComponent(settings.settings.fragment);
                }
                catch {
                    fragment = settings.settings.fragment;
                }
                state.fragment = undefined;
                vscode.setState(state);
                const element = (0, scroll_sync_1.getLineElementForFragment)(fragment, documentVersion);
                if (element) {
                    scrollDisabledCount += 1;
                    (0, scroll_sync_1.scrollToRevealSourceLine)(element.line, documentVersion, settings);
                }
            }
            else {
                if (!isNaN(settings.settings.line)) {
                    scrollDisabledCount += 1;
                    (0, scroll_sync_1.scrollToRevealSourceLine)(settings.settings.line, documentVersion, settings);
                }
            }
        });
    }
    if (typeof settings.settings.selectedLine === 'number') {
        marker.onDidChangeTextEditorSelection(settings.settings.selectedLine, documentVersion);
    }
});
const onUpdateView = (() => {
    const doScroll = throttle((line) => {
        scrollDisabledCount += 1;
        doAfterImagesLoaded(() => (0, scroll_sync_1.scrollToRevealSourceLine)(line, documentVersion, settings));
    }, 50);
    return (line) => {
        if (!isNaN(line)) {
            state.line = line;
            doScroll(line);
        }
    };
})();
window.addEventListener('resize', () => {
    scrollDisabledCount += 1;
    updateScrollProgress();
}, true);
function addImageContexts() {
    const images = document.getElementsByTagName('img');
    let idNumber = 0;
    for (const img of images) {
        img.id = 'image-' + idNumber;
        idNumber += 1;
        const imageSource = img.getAttribute('data-src');
        const isLocalFile = imageSource && !((0, schemes_1.isOfScheme)(schemes_1.Schemes.http, imageSource) || (0, schemes_1.isOfScheme)(schemes_1.Schemes.https, imageSource));
        const webviewSection = isLocalFile ? 'localImage' : 'image';
        img.setAttribute('data-vscode-context', JSON.stringify({ webviewSection, id: img.id, 'preventDefaultContextMenuItems': true, resource: documentResource, imageSource }));
    }
}
async function copyImage(image, retries = 5) {
    if (!document.hasFocus() && retries > 0) {
        // copyImage is called at the same time as webview.reveal, which means this function is running whilst the webview is gaining focus.
        // Since navigator.clipboard.write requires the document to be focused, we need to wait for focus.
        // We cannot use a listener, as there is a high chance the focus is gained during the setup of the listener resulting in us missing it.
        setTimeout(() => { copyImage(image, retries - 1); }, 20);
        return;
    }
    try {
        await navigator.clipboard.write([new ClipboardItem({
                'image/png': new Promise((resolve) => {
                    const canvas = document.createElement('canvas');
                    if (canvas !== null) {
                        canvas.width = image.naturalWidth;
                        canvas.height = image.naturalHeight;
                        const context = canvas.getContext('2d');
                        context?.drawImage(image, 0, 0);
                    }
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        }
                        canvas.remove();
                    }, 'image/png');
                })
            })]);
    }
    catch (e) {
        console.error(e);
        const selection = window.getSelection();
        if (!selection) {
            await navigator.clipboard.writeText(image.getAttribute('data-src') ?? image.src);
            return;
        }
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNode(image);
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
    }
}
window.addEventListener('message', async (event) => {
    const data = event.data;
    switch (data.type) {
        case 'copyImage': {
            const img = document.getElementById(data.id);
            if (img instanceof HTMLImageElement) {
                copyImage(img);
            }
            return;
        }
        case 'onDidChangeTextEditorSelection':
            if (data.source === documentResource) {
                marker.onDidChangeTextEditorSelection(data.line, documentVersion);
            }
            return;
        case 'updateView':
            if (data.source === documentResource) {
                onUpdateView(data.line);
            }
            return;
        case 'updateContent': {
            const root = document.querySelector('.markdown-body');
            const parser = new DOMParser();
            const newContent = parser.parseFromString(data.content, 'text/html'); // CodeQL [SM03712] This renderers content from the workspace into the Markdown preview. Webviews (and the markdown preview) have many other security measures in place to make this safe
            // Strip out meta http-equiv tags
            for (const metaElement of Array.from(newContent.querySelectorAll('meta'))) {
                if (metaElement.hasAttribute('http-equiv')) {
                    metaElement.remove();
                }
            }
            if (data.source !== documentResource) {
                documentResource = data.source;
                const newBody = newContent.querySelector('.markdown-body');
                root.replaceWith(newBody);
                domEval(newBody);
            }
            else {
                const newRoot = newContent.querySelector('.markdown-body');
                // Move styles to head
                // This prevents an ugly flash of unstyled content
                const styles = newRoot.querySelectorAll('link');
                for (const style of styles) {
                    style.remove();
                }
                newRoot.prepend(...styles);
                (0, morphdom_1.default)(root, newRoot, {
                    childrenOnly: true,
                    onBeforeElUpdated: (fromEl, toEl) => {
                        if (areNodesEqual(fromEl, toEl)) {
                            // areEqual doesn't look at `data-line` so copy those over manually
                            const fromLines = fromEl.querySelectorAll('[data-line]');
                            const toLines = toEl.querySelectorAll('[data-line]');
                            if (fromLines.length !== toLines.length) {
                                console.log('unexpected line number change');
                            }
                            for (let i = 0; i < fromLines.length; ++i) {
                                const fromChild = fromLines[i];
                                const toChild = toLines[i];
                                if (toChild) {
                                    fromChild.setAttribute('data-line', toChild.getAttribute('data-line'));
                                }
                            }
                            return false;
                        }
                        if (fromEl.tagName === 'DETAILS' && toEl.tagName === 'DETAILS') {
                            if (fromEl.hasAttribute('open')) {
                                toEl.setAttribute('open', '');
                            }
                        }
                        return true;
                    },
                    addChild: (parentNode, childNode) => {
                        parentNode.appendChild(childNode);
                        if (childNode instanceof HTMLElement) {
                            domEval(childNode);
                        }
                    }
                });
            }
            ++documentVersion;
            window.dispatchEvent(new CustomEvent('vscode.markdown.updateContent'));
            addImageContexts();
            break;
        }
    }
}, false);
document.addEventListener('dblclick', event => {
    if (!settings.settings.doubleClickToSwitchToEditor) {
        return;
    }
    // Ignore clicks on links
    for (let node = event.target; node; node = node.parentNode) {
        if (node.tagName === 'A') {
            return;
        }
    }
    const offset = event.pageY;
    const line = (0, scroll_sync_1.getEditorLineNumberForPageOffset)(offset, documentVersion);
    if (typeof line === 'number' && !isNaN(line)) {
        messaging.postMessage('didClick', { line: Math.floor(line) });
    }
});
const passThroughLinkSchemes = ['http:', 'https:', 'mailto:', 'vscode:', 'vscode-insiders:'];
document.addEventListener('click', event => {
    if (!event) {
        return;
    }
    let node = event.target;
    while (node) {
        if (node.tagName && node.tagName === 'A' && node.href) {
            if (node.getAttribute('href').startsWith('#')) {
                return;
            }
            let hrefText = node.getAttribute('data-href');
            if (!hrefText) {
                hrefText = node.getAttribute('href');
                // Pass through known schemes
                if (passThroughLinkSchemes.some(scheme => hrefText.startsWith(scheme))) {
                    return;
                }
            }
            // If original link doesn't look like a url, delegate back to VS Code to resolve
            if (!/^[a-z\-]+:/i.test(hrefText)) {
                messaging.postMessage('openLink', { href: hrefText });
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            return;
        }
        node = node.parentNode;
    }
}, true);
window.addEventListener('scroll', throttle(() => {
    updateScrollProgress();
    if (scrollDisabledCount > 0) {
        scrollDisabledCount -= 1;
    }
    else {
        const line = (0, scroll_sync_1.getEditorLineNumberForPageOffset)(window.scrollY, documentVersion);
        if (typeof line === 'number' && !isNaN(line)) {
            messaging.postMessage('revealLine', { line });
        }
    }
}, 50));
function updateScrollProgress() {
    state.scrollProgress = window.scrollY / document.body.clientHeight;
    vscode.setState(state);
}
/**
 * Compares two nodes for morphdom to see if they are equal.
 *
 * This skips some attributes that should not cause equality to fail.
 */
function areNodesEqual(a, b) {
    const skippedAttrs = [
        'open', // for details
    ];
    if (a.isEqualNode(b)) {
        return true;
    }
    if (a.tagName !== b.tagName || a.textContent !== b.textContent) {
        return false;
    }
    const aAttrs = [...a.attributes].filter(attr => !skippedAttrs.includes(attr.name));
    const bAttrs = [...b.attributes].filter(attr => !skippedAttrs.includes(attr.name));
    if (aAttrs.length !== bAttrs.length) {
        return false;
    }
    for (let i = 0; i < aAttrs.length; ++i) {
        const aAttr = aAttrs[i];
        const bAttr = bAttrs[i];
        if (aAttr.name !== bAttr.name) {
            return false;
        }
        if (aAttr.value !== bAttr.value && aAttr.name !== 'data-line') {
            return false;
        }
    }
    const aChildren = Array.from(a.children);
    const bChildren = Array.from(b.children);
    return aChildren.length === bChildren.length && aChildren.every((x, i) => areNodesEqual(x, bChildren[i]));
}
function domEval(el) {
    const preservedScriptAttributes = [
        'type', 'src', 'nonce', 'noModule', 'async',
    ];
    const scriptNodes = el.tagName === 'SCRIPT' ? [el] : Array.from(el.getElementsByTagName('script'));
    for (const node of scriptNodes) {
        if (!(node instanceof HTMLElement)) {
            continue;
        }
        const scriptTag = document.createElement('script');
        const trustedScript = node.innerText;
        scriptTag.text = trustedScript;
        for (const key of preservedScriptAttributes) {
            const val = node.getAttribute && node.getAttribute(key);
            if (val) {
                scriptTag.setAttribute(key, val);
            }
        }
        node.insertAdjacentElement('afterend', scriptTag);
        node.remove();
    }
}
//# sourceMappingURL=index.js.map