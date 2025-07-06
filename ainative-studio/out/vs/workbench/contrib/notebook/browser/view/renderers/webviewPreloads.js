/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
async function webviewPreloads(ctx) {
    /* eslint-disable no-restricted-globals, no-restricted-syntax */
    // The use of global `window` should be fine in this context, even
    // with aux windows. This code is running from within an `iframe`
    // where there is only one `window` object anyway.
    const userAgent = navigator.userAgent;
    const isChrome = (userAgent.indexOf('Chrome') >= 0);
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    function promiseWithResolvers() {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve: resolve, reject: reject };
    }
    let currentOptions = ctx.options;
    const isWorkspaceTrusted = ctx.isWorkspaceTrusted;
    let currentRenderOptions = ctx.renderOptions;
    const settingChange = createEmitter();
    const acquireVsCodeApi = globalThis.acquireVsCodeApi;
    const vscode = acquireVsCodeApi();
    delete globalThis.acquireVsCodeApi;
    const tokenizationStyle = new CSSStyleSheet();
    tokenizationStyle.replaceSync(ctx.style.tokenizationCss);
    const runWhenIdle = (typeof requestIdleCallback !== 'function' || typeof cancelIdleCallback !== 'function')
        ? (runner) => {
            setTimeout(() => {
                if (disposed) {
                    return;
                }
                const end = Date.now() + 15; // one frame at 64fps
                runner(Object.freeze({
                    didTimeout: true,
                    timeRemaining() {
                        return Math.max(0, end - Date.now());
                    }
                }));
            });
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                }
            };
        }
        : (runner, timeout) => {
            const handle = requestIdleCallback(runner, typeof timeout === 'number' ? { timeout } : undefined);
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                    cancelIdleCallback(handle);
                }
            };
        };
    function getOutputContainer(event) {
        for (const node of event.composedPath()) {
            if (node instanceof HTMLElement && node.classList.contains('output')) {
                return {
                    id: node.id
                };
            }
        }
        return;
    }
    let lastFocusedOutput = undefined;
    const handleOutputFocusOut = (event) => {
        const outputFocus = event && getOutputContainer(event);
        if (!outputFocus) {
            return;
        }
        // Possible we're tabbing through the elements of the same output.
        // Lets see if focus is set back to the same output.
        lastFocusedOutput = undefined;
        setTimeout(() => {
            if (lastFocusedOutput?.id === outputFocus.id) {
                return;
            }
            postNotebookMessage('outputBlur', outputFocus);
        }, 0);
    };
    const isEditableElement = (element) => {
        return element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea'
            || ('editContext' in element && !!element.editContext);
    };
    // check if an input element is focused within the output element
    const checkOutputInputFocus = (e) => {
        lastFocusedOutput = getOutputContainer(e);
        const activeElement = window.document.activeElement;
        if (!activeElement) {
            return;
        }
        const id = lastFocusedOutput?.id;
        if (id && (isEditableElement(activeElement) || activeElement.tagName === 'SELECT')) {
            postNotebookMessage('outputInputFocus', { inputFocused: true, id });
            activeElement.addEventListener('blur', () => {
                postNotebookMessage('outputInputFocus', { inputFocused: false, id });
            }, { once: true });
        }
    };
    const handleInnerClick = (event) => {
        if (!event || !event.view || !event.view.document) {
            return;
        }
        const outputFocus = lastFocusedOutput = getOutputContainer(event);
        for (const node of event.composedPath()) {
            if (node instanceof HTMLAnchorElement && node.href) {
                if (node.href.startsWith('blob:')) {
                    if (outputFocus) {
                        postNotebookMessage('outputFocus', outputFocus);
                    }
                    handleBlobUrlClick(node.href, node.download);
                }
                else if (node.href.startsWith('data:')) {
                    if (outputFocus) {
                        postNotebookMessage('outputFocus', outputFocus);
                    }
                    handleDataUrl(node.href, node.download);
                }
                else if (node.getAttribute('href')?.trim().startsWith('#')) {
                    // Scrolling to location within current doc
                    if (!node.hash) {
                        postNotebookMessage('scroll-to-reveal', { scrollTop: 0 });
                        return;
                    }
                    const targetId = node.hash.substring(1);
                    // Check outer document first
                    let scrollTarget = event.view.document.getElementById(targetId);
                    if (!scrollTarget) {
                        // Fallback to checking preview shadow doms
                        for (const preview of event.view.document.querySelectorAll('.preview')) {
                            scrollTarget = preview.shadowRoot?.getElementById(targetId);
                            if (scrollTarget) {
                                break;
                            }
                        }
                    }
                    if (scrollTarget) {
                        const scrollTop = scrollTarget.getBoundingClientRect().top + event.view.scrollY;
                        postNotebookMessage('scroll-to-reveal', { scrollTop });
                        return;
                    }
                }
                else {
                    const href = node.getAttribute('href');
                    if (href) {
                        if (href.startsWith('command:') && outputFocus) {
                            postNotebookMessage('outputFocus', outputFocus);
                        }
                        postNotebookMessage('clicked-link', { href });
                    }
                }
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }
        if (outputFocus) {
            postNotebookMessage('outputFocus', outputFocus);
        }
    };
    const blurOutput = () => {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        selection.removeAllRanges();
    };
    const selectOutputContents = (cellOrOutputId) => {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        const cellOutputContainer = window.document.getElementById(cellOrOutputId);
        if (!cellOutputContainer) {
            return;
        }
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNode(cellOutputContainer);
        selection.addRange(range);
    };
    const selectInputContents = (cellOrOutputId) => {
        const cellOutputContainer = window.document.getElementById(cellOrOutputId);
        if (!cellOutputContainer) {
            return;
        }
        const activeElement = window.document.activeElement;
        if (activeElement && isEditableElement(activeElement)) {
            activeElement.select();
        }
    };
    const onPageUpDownSelectionHandler = (e) => {
        if (!lastFocusedOutput?.id || !e.shiftKey) {
            return;
        }
        // If we're pressing `Shift+Up/Down` then we want to select a line at a time.
        if (e.shiftKey && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
            e.stopPropagation(); // We don't want the notebook to handle this, default behavior is what we need.
            return;
        }
        // We want to handle just `Shift + PageUp/PageDown` & `Shift + Cmd + ArrowUp/ArrowDown` (for mac)
        if (!(e.code === 'PageUp' || e.code === 'PageDown') && !(e.metaKey && (e.code === 'ArrowDown' || e.code === 'ArrowUp'))) {
            return;
        }
        const outputContainer = window.document.getElementById(lastFocusedOutput.id);
        const selection = window.getSelection();
        if (!outputContainer || !selection?.anchorNode) {
            return;
        }
        const activeElement = window.document.activeElement;
        if (activeElement && isEditableElement(activeElement)) {
            // Leave for default behavior.
            return;
        }
        // These should change the scroll position, not adjust the selected cell in the notebook
        e.stopPropagation(); // We don't want the notebook to handle this.
        e.preventDefault(); // We will handle selection.
        const { anchorNode, anchorOffset } = selection;
        const range = document.createRange();
        if (e.code === 'PageDown' || e.code === 'ArrowDown') {
            range.setStart(anchorNode, anchorOffset);
            range.setEnd(outputContainer, 1);
        }
        else {
            range.setStart(outputContainer, 0);
            range.setEnd(anchorNode, anchorOffset);
        }
        selection.removeAllRanges();
        selection.addRange(range);
    };
    const disableNativeSelectAll = (e) => {
        if (!lastFocusedOutput?.id) {
            return;
        }
        const activeElement = window.document.activeElement;
        if (activeElement && isEditableElement(activeElement)) {
            // The input element will handle this.
            return;
        }
        if ((e.key === 'a' && e.ctrlKey) || (e.metaKey && e.key === 'a')) {
            e.preventDefault(); // We will handle selection in editor code.
            return;
        }
    };
    const handleDataUrl = async (data, downloadName) => {
        postNotebookMessage('clicked-data-url', {
            data,
            downloadName
        });
    };
    const handleBlobUrlClick = async (url, downloadName) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                handleDataUrl(reader.result, downloadName);
            });
            reader.readAsDataURL(blob);
        }
        catch (e) {
            console.error(e.message);
        }
    };
    window.document.body.addEventListener('click', handleInnerClick);
    window.document.body.addEventListener('focusin', checkOutputInputFocus);
    window.document.body.addEventListener('focusout', handleOutputFocusOut);
    window.document.body.addEventListener('keydown', onPageUpDownSelectionHandler);
    window.document.body.addEventListener('keydown', disableNativeSelectAll);
    function createKernelContext() {
        return Object.freeze({
            onDidReceiveKernelMessage: onDidReceiveKernelMessage.event,
            postKernelMessage: (data) => postNotebookMessage('customKernelMessage', { message: data }),
        });
    }
    async function runKernelPreload(url) {
        try {
            return await activateModuleKernelPreload(url);
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    async function activateModuleKernelPreload(url) {
        const module = await __import(url);
        if (!module.activate) {
            console.error(`Notebook preload '${url}' was expected to be a module but it does not export an 'activate' function`);
            return;
        }
        return module.activate(createKernelContext());
    }
    const dimensionUpdater = new class {
        constructor() {
            this.pending = new Map();
        }
        updateHeight(id, height, options) {
            if (!this.pending.size) {
                setTimeout(() => {
                    this.updateImmediately();
                }, 0);
            }
            const update = this.pending.get(id);
            if (update && update.isOutput) {
                this.pending.set(id, {
                    id,
                    height,
                    init: update.init,
                    isOutput: update.isOutput
                });
            }
            else {
                this.pending.set(id, {
                    id,
                    height,
                    ...options,
                });
            }
        }
        updateImmediately() {
            if (!this.pending.size) {
                return;
            }
            postNotebookMessage('dimension', {
                updates: Array.from(this.pending.values())
            });
            this.pending.clear();
        }
    };
    function elementHasContent(height) {
        // we need to account for a potential 1px top and bottom border on a child within the output container
        return height > 2.1;
    }
    const resizeObserver = new class {
        constructor() {
            this._observedElements = new WeakMap();
            this._observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (!window.document.body.contains(entry.target)) {
                        continue;
                    }
                    const observedElementInfo = this._observedElements.get(entry.target);
                    if (!observedElementInfo) {
                        continue;
                    }
                    this.postResizeMessage(observedElementInfo.cellId);
                    if (entry.target.id !== observedElementInfo.id) {
                        continue;
                    }
                    if (!entry.contentRect) {
                        continue;
                    }
                    if (!observedElementInfo.output) {
                        // markup, update directly
                        this.updateHeight(observedElementInfo, entry.target.offsetHeight);
                        continue;
                    }
                    const hasContent = elementHasContent(entry.contentRect.height);
                    const shouldUpdatePadding = (hasContent && observedElementInfo.lastKnownPadding === 0) ||
                        (!hasContent && observedElementInfo.lastKnownPadding !== 0);
                    if (shouldUpdatePadding) {
                        // Do not update dimension in resize observer
                        window.requestAnimationFrame(() => {
                            if (hasContent) {
                                entry.target.style.padding = `${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodeLeftPadding}px`;
                            }
                            else {
                                entry.target.style.padding = `0px`;
                            }
                            this.updateHeight(observedElementInfo, hasContent ? entry.target.offsetHeight : 0);
                        });
                    }
                    else {
                        this.updateHeight(observedElementInfo, hasContent ? entry.target.offsetHeight : 0);
                    }
                }
            });
        }
        updateHeight(observedElementInfo, offsetHeight) {
            if (observedElementInfo.lastKnownHeight !== offsetHeight) {
                observedElementInfo.lastKnownHeight = offsetHeight;
                dimensionUpdater.updateHeight(observedElementInfo.id, offsetHeight, {
                    isOutput: observedElementInfo.output
                });
            }
        }
        observe(container, id, output, cellId) {
            if (this._observedElements.has(container)) {
                return;
            }
            this._observedElements.set(container, { id, output, lastKnownPadding: ctx.style.outputNodePadding, lastKnownHeight: -1, cellId });
            this._observer.observe(container);
        }
        postResizeMessage(cellId) {
            // Debounce this callback to only happen after
            // 250 ms. Don't need resize events that often.
            clearTimeout(this._outputResizeTimer);
            this._outputResizeTimer = setTimeout(() => {
                postNotebookMessage('outputResized', {
                    cellId
                });
            }, 250);
        }
    };
    let previousDelta;
    let scrollTimeout;
    let scrolledElement;
    let lastTimeScrolled;
    function flagRecentlyScrolled(node, deltaY) {
        scrolledElement = node;
        if (deltaY === undefined) {
            lastTimeScrolled = Date.now();
            previousDelta = undefined;
            node.setAttribute('recentlyScrolled', 'true');
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => { scrolledElement?.removeAttribute('recentlyScrolled'); }, 300);
            return true;
        }
        if (node.hasAttribute('recentlyScrolled')) {
            if (lastTimeScrolled && Date.now() - lastTimeScrolled > 400) {
                // it has been a while since we actually scrolled
                // if scroll velocity increases significantly, it's likely a new scroll event
                if (!!previousDelta && deltaY < 0 && deltaY < previousDelta - 8) {
                    clearTimeout(scrollTimeout);
                    scrolledElement?.removeAttribute('recentlyScrolled');
                    return false;
                }
                else if (!!previousDelta && deltaY > 0 && deltaY > previousDelta + 8) {
                    clearTimeout(scrollTimeout);
                    scrolledElement?.removeAttribute('recentlyScrolled');
                    return false;
                }
                // the tail end of a smooth scrolling event (from a trackpad) can go on for a while
                // so keep swallowing it, but we can shorten the timeout since the events occur rapidly
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => { scrolledElement?.removeAttribute('recentlyScrolled'); }, 50);
            }
            else {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => { scrolledElement?.removeAttribute('recentlyScrolled'); }, 300);
            }
            previousDelta = deltaY;
            return true;
        }
        return false;
    }
    function eventTargetShouldHandleScroll(event) {
        for (let node = event.target; node; node = node.parentNode) {
            if (!(node instanceof Element) || node.id === 'container' || node.classList.contains('cell_container') || node.classList.contains('markup') || node.classList.contains('output_container')) {
                return false;
            }
            // scroll up
            if (event.deltaY < 0 && node.scrollTop > 0) {
                // there is still some content to scroll
                flagRecentlyScrolled(node);
                return true;
            }
            // scroll down
            if (event.deltaY > 0 && node.scrollTop + node.clientHeight < node.scrollHeight) {
                // per https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight
                // scrollTop is not rounded but scrollHeight and clientHeight are
                // so we need to check if the difference is less than some threshold
                if (node.scrollHeight - node.scrollTop - node.clientHeight < 2) {
                    continue;
                }
                // if the node is not scrollable, we can continue. We don't check the computed style always as it's expensive
                if (window.getComputedStyle(node).overflowY === 'hidden' || window.getComputedStyle(node).overflowY === 'visible') {
                    continue;
                }
                flagRecentlyScrolled(node);
                return true;
            }
            if (flagRecentlyScrolled(node, event.deltaY)) {
                return true;
            }
        }
        return false;
    }
    const handleWheel = (event) => {
        if (event.defaultPrevented || eventTargetShouldHandleScroll(event)) {
            return;
        }
        postNotebookMessage('did-scroll-wheel', {
            payload: {
                deltaMode: event.deltaMode,
                deltaX: event.deltaX,
                deltaY: event.deltaY,
                deltaZ: event.deltaZ,
                // Refs https://github.com/microsoft/vscode/issues/146403#issuecomment-1854538928
                wheelDelta: event.wheelDelta && isChrome ? (event.wheelDelta / window.devicePixelRatio) : event.wheelDelta,
                wheelDeltaX: event.wheelDeltaX && isChrome ? (event.wheelDeltaX / window.devicePixelRatio) : event.wheelDeltaX,
                wheelDeltaY: event.wheelDeltaY && isChrome ? (event.wheelDeltaY / window.devicePixelRatio) : event.wheelDeltaY,
                detail: event.detail,
                shiftKey: event.shiftKey,
                type: event.type
            }
        });
    };
    function focusFirstFocusableOrContainerInOutput(cellOrOutputId, alternateId) {
        const cellOutputContainer = window.document.getElementById(cellOrOutputId) ??
            (alternateId ? window.document.getElementById(alternateId) : undefined);
        if (cellOutputContainer) {
            if (cellOutputContainer.contains(window.document.activeElement)) {
                return;
            }
            const id = cellOutputContainer.id;
            let focusableElement = cellOutputContainer.querySelector('[tabindex="0"], [href], button, input, option, select, textarea');
            if (!focusableElement) {
                focusableElement = cellOutputContainer;
                focusableElement.tabIndex = -1;
                postNotebookMessage('outputInputFocus', { inputFocused: false, id });
            }
            else {
                const inputFocused = isEditableElement(focusableElement);
                postNotebookMessage('outputInputFocus', { inputFocused, id });
            }
            lastFocusedOutput = cellOutputContainer;
            postNotebookMessage('outputFocus', { id: cellOutputContainer.id });
            focusableElement.focus();
        }
    }
    function createFocusSink(cellId, focusNext) {
        const element = document.createElement('div');
        element.id = `focus-sink-${cellId}`;
        element.tabIndex = 0;
        element.addEventListener('focus', () => {
            postNotebookMessage('focus-editor', {
                cellId: cellId,
                focusNext
            });
        });
        return element;
    }
    function _internalHighlightRange(range, tagName = 'mark', attributes = {}) {
        // derived from https://github.com/Treora/dom-highlight-range/blob/master/highlight-range.js
        // Return an array of the text nodes in the range. Split the start and end nodes if required.
        function _textNodesInRange(range) {
            if (!range.startContainer.ownerDocument) {
                return [];
            }
            // If the start or end node is a text node and only partly in the range, split it.
            if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
                const startContainer = range.startContainer;
                const endOffset = range.endOffset; // (this may get lost when the splitting the node)
                const createdNode = startContainer.splitText(range.startOffset);
                if (range.endContainer === startContainer) {
                    // If the end was in the same container, it will now be in the newly created node.
                    range.setEnd(createdNode, endOffset - range.startOffset);
                }
                range.setStart(createdNode, 0);
            }
            if (range.endContainer.nodeType === Node.TEXT_NODE
                && range.endOffset < range.endContainer.length) {
                range.endContainer.splitText(range.endOffset);
            }
            // Collect the text nodes.
            const walker = range.startContainer.ownerDocument.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, node => range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT);
            walker.currentNode = range.startContainer;
            // // Optimise by skipping nodes that are explicitly outside the range.
            // const NodeTypesWithCharacterOffset = [
            //  Node.TEXT_NODE,
            //  Node.PROCESSING_INSTRUCTION_NODE,
            //  Node.COMMENT_NODE,
            // ];
            // if (!NodeTypesWithCharacterOffset.includes(range.startContainer.nodeType)) {
            //   if (range.startOffset < range.startContainer.childNodes.length) {
            //     walker.currentNode = range.startContainer.childNodes[range.startOffset];
            //   } else {
            //     walker.nextSibling(); // TODO verify this is correct.
            //   }
            // }
            const nodes = [];
            if (walker.currentNode.nodeType === Node.TEXT_NODE) {
                nodes.push(walker.currentNode);
            }
            while (walker.nextNode() && range.comparePoint(walker.currentNode, 0) !== 1) {
                if (walker.currentNode.nodeType === Node.TEXT_NODE) {
                    nodes.push(walker.currentNode);
                }
            }
            return nodes;
        }
        // Replace [node] with <tagName ...attributes>[node]</tagName>
        function wrapNodeInHighlight(node, tagName, attributes) {
            const highlightElement = node.ownerDocument.createElement(tagName);
            Object.keys(attributes).forEach(key => {
                highlightElement.setAttribute(key, attributes[key]);
            });
            const tempRange = node.ownerDocument.createRange();
            tempRange.selectNode(node);
            tempRange.surroundContents(highlightElement);
            return highlightElement;
        }
        if (range.collapsed) {
            return {
                remove: () => { },
                update: () => { }
            };
        }
        // First put all nodes in an array (splits start and end nodes if needed)
        const nodes = _textNodesInRange(range);
        // Highlight each node
        const highlightElements = [];
        for (const nodeIdx in nodes) {
            const highlightElement = wrapNodeInHighlight(nodes[nodeIdx], tagName, attributes);
            highlightElements.push(highlightElement);
        }
        // Remove a highlight element created with wrapNodeInHighlight.
        function _removeHighlight(highlightElement) {
            if (highlightElement.childNodes.length === 1) {
                highlightElement.parentNode?.replaceChild(highlightElement.firstChild, highlightElement);
            }
            else {
                // If the highlight somehow contains multiple nodes now, move them all.
                while (highlightElement.firstChild) {
                    highlightElement.parentNode?.insertBefore(highlightElement.firstChild, highlightElement);
                }
                highlightElement.remove();
            }
        }
        // Return a function that cleans up the highlightElements.
        function _removeHighlights() {
            // Remove each of the created highlightElements.
            for (const highlightIdx in highlightElements) {
                _removeHighlight(highlightElements[highlightIdx]);
            }
        }
        function _updateHighlight(highlightElement, attributes = {}) {
            Object.keys(attributes).forEach(key => {
                highlightElement.setAttribute(key, attributes[key]);
            });
        }
        function updateHighlights(attributes) {
            for (const highlightIdx in highlightElements) {
                _updateHighlight(highlightElements[highlightIdx], attributes);
            }
        }
        return {
            remove: _removeHighlights,
            update: updateHighlights
        };
    }
    function selectRange(_range) {
        const sel = window.getSelection();
        if (sel) {
            try {
                sel.removeAllRanges();
                const r = document.createRange();
                r.setStart(_range.startContainer, _range.startOffset);
                r.setEnd(_range.endContainer, _range.endOffset);
                sel.addRange(r);
            }
            catch (e) {
                console.log(e);
            }
        }
    }
    function highlightRange(range, useCustom, tagName = 'mark', attributes = {}) {
        if (useCustom) {
            const ret = _internalHighlightRange(range, tagName, attributes);
            return {
                range: range,
                dispose: ret.remove,
                update: (color, className) => {
                    if (className === undefined) {
                        ret.update({
                            'style': `background-color: ${color}`
                        });
                    }
                    else {
                        ret.update({
                            'class': className
                        });
                    }
                }
            };
        }
        else {
            window.document.execCommand('hiliteColor', false, matchColor);
            const cloneRange = window.getSelection().getRangeAt(0).cloneRange();
            const _range = {
                collapsed: cloneRange.collapsed,
                commonAncestorContainer: cloneRange.commonAncestorContainer,
                endContainer: cloneRange.endContainer,
                endOffset: cloneRange.endOffset,
                startContainer: cloneRange.startContainer,
                startOffset: cloneRange.startOffset
            };
            return {
                range: _range,
                dispose: () => {
                    selectRange(_range);
                    try {
                        document.designMode = 'On';
                        window.document.execCommand('removeFormat', false, undefined);
                        document.designMode = 'Off';
                        window.getSelection()?.removeAllRanges();
                    }
                    catch (e) {
                        console.log(e);
                    }
                },
                update: (color, className) => {
                    selectRange(_range);
                    try {
                        document.designMode = 'On';
                        window.document.execCommand('removeFormat', false, undefined);
                        window.document.execCommand('hiliteColor', false, color);
                        document.designMode = 'Off';
                        window.getSelection()?.removeAllRanges();
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
            };
        }
    }
    function createEmitter(listenerChange = () => undefined) {
        const listeners = new Set();
        return {
            fire(data) {
                for (const listener of [...listeners]) {
                    listener.fn.call(listener.thisArg, data);
                }
            },
            event(fn, thisArg, disposables) {
                const listenerObj = { fn, thisArg };
                const disposable = {
                    dispose: () => {
                        listeners.delete(listenerObj);
                        listenerChange(listeners);
                    },
                };
                listeners.add(listenerObj);
                listenerChange(listeners);
                if (disposables instanceof Array) {
                    disposables.push(disposable);
                }
                else if (disposables) {
                    disposables.add(disposable);
                }
                return disposable;
            },
        };
    }
    function showRenderError(errorText, outputNode, errors) {
        outputNode.innerText = errorText;
        const errList = document.createElement('ul');
        for (const result of errors) {
            console.error(result);
            const item = document.createElement('li');
            item.innerText = result.message;
            errList.appendChild(item);
        }
        outputNode.appendChild(errList);
    }
    const outputItemRequests = new class {
        constructor() {
            this._requestPool = 0;
            this._requests = new Map();
        }
        getOutputItem(outputId, mime) {
            const requestId = this._requestPool++;
            const { promise, resolve } = promiseWithResolvers();
            this._requests.set(requestId, { resolve });
            postNotebookMessage('getOutputItem', { requestId, outputId, mime });
            return promise;
        }
        resolveOutputItem(requestId, output) {
            const request = this._requests.get(requestId);
            if (!request) {
                return;
            }
            this._requests.delete(requestId);
            request.resolve(output);
        }
    };
    let hasWarnedAboutAllOutputItemsProposal = false;
    function createOutputItem(id, mime, metadata, valueBytes, allOutputItemData, appended) {
        function create(id, mime, metadata, valueBytes, appended) {
            return Object.freeze({
                id,
                mime,
                metadata,
                appendedText() {
                    if (appended) {
                        return textDecoder.decode(appended.valueBytes);
                    }
                    return undefined;
                },
                data() {
                    return valueBytes;
                },
                text() {
                    return textDecoder.decode(valueBytes);
                },
                json() {
                    return JSON.parse(this.text());
                },
                blob() {
                    return new Blob([valueBytes], { type: this.mime });
                },
                get _allOutputItems() {
                    if (!hasWarnedAboutAllOutputItemsProposal) {
                        hasWarnedAboutAllOutputItemsProposal = true;
                        console.warn(`'_allOutputItems' is proposed API. DO NOT ship an extension that depends on it!`);
                    }
                    return allOutputItemList;
                },
            });
        }
        const allOutputItemCache = new Map();
        const allOutputItemList = Object.freeze(allOutputItemData.map(outputItem => {
            const mime = outputItem.mime;
            return Object.freeze({
                mime,
                getItem() {
                    const existingTask = allOutputItemCache.get(mime);
                    if (existingTask) {
                        return existingTask;
                    }
                    const task = outputItemRequests.getOutputItem(id, mime).then(item => {
                        return item ? create(id, item.mime, metadata, item.valueBytes) : undefined;
                    });
                    allOutputItemCache.set(mime, task);
                    return task;
                }
            });
        }));
        const item = create(id, mime, metadata, valueBytes, appended);
        allOutputItemCache.set(mime, Promise.resolve(item));
        return item;
    }
    const onDidReceiveKernelMessage = createEmitter();
    const ttPolicy = window.trustedTypes?.createPolicy('notebookRenderer', {
        createHTML: value => value, // CodeQL [SM03712] The rendered content is provided by renderer extensions, which are responsible for sanitizing their content themselves. The notebook webview is also sandboxed.
        createScript: value => value, // CodeQL [SM03712] The rendered content is provided by renderer extensions, which are responsible for sanitizing their content themselves. The notebook webview is also sandboxed.
    });
    window.addEventListener('wheel', handleWheel);
    const matchColor = window.getComputedStyle(window.document.getElementById('_defaultColorPalatte')).color;
    const currentMatchColor = window.getComputedStyle(window.document.getElementById('_defaultColorPalatte')).backgroundColor;
    class JSHighlighter {
        constructor() {
            this._activeHighlightInfo = new Map();
        }
        addHighlights(matches, ownerID) {
            for (let i = matches.length - 1; i >= 0; i--) {
                const match = matches[i];
                const ret = highlightRange(match.originalRange, true, 'mark', match.isShadow ? {
                    'style': 'background-color: ' + matchColor + ';',
                } : {
                    'class': 'find-match'
                });
                match.highlightResult = ret;
            }
            const highlightInfo = {
                matches,
                currentMatchIndex: -1
            };
            this._activeHighlightInfo.set(ownerID, highlightInfo);
        }
        removeHighlights(ownerID) {
            this._activeHighlightInfo.get(ownerID)?.matches.forEach(match => {
                match.highlightResult?.dispose();
            });
            this._activeHighlightInfo.delete(ownerID);
        }
        highlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                console.error('Modified current highlight match before adding highlight list.');
                return;
            }
            const oldMatch = highlightInfo.matches[highlightInfo.currentMatchIndex];
            oldMatch?.highlightResult?.update(matchColor, oldMatch.isShadow ? undefined : 'find-match');
            const match = highlightInfo.matches[index];
            highlightInfo.currentMatchIndex = index;
            const sel = window.getSelection();
            if (!!match && !!sel && match.highlightResult) {
                let offset = 0;
                try {
                    const outputOffset = window.document.getElementById(match.id).getBoundingClientRect().top;
                    const tempRange = document.createRange();
                    tempRange.selectNode(match.highlightResult.range.startContainer);
                    match.highlightResult.range.startContainer.parentElement?.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
                    const rangeOffset = tempRange.getBoundingClientRect().top;
                    tempRange.detach();
                    offset = rangeOffset - outputOffset;
                }
                catch (e) {
                    console.error(e);
                }
                match.highlightResult?.update(currentMatchColor, match.isShadow ? undefined : 'current-find-match');
                window.document.getSelection()?.removeAllRanges();
                postNotebookMessage('didFindHighlightCurrent', {
                    offset
                });
            }
        }
        unHighlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                return;
            }
            const oldMatch = highlightInfo.matches[index];
            if (oldMatch && oldMatch.highlightResult) {
                oldMatch.highlightResult.update(matchColor, oldMatch.isShadow ? undefined : 'find-match');
            }
        }
        dispose() {
            window.document.getSelection()?.removeAllRanges();
            this._activeHighlightInfo.forEach(highlightInfo => {
                highlightInfo.matches.forEach(match => {
                    match.highlightResult?.dispose();
                });
            });
        }
    }
    class CSSHighlighter {
        constructor() {
            this._activeHighlightInfo = new Map();
            this._matchesHighlight = new Highlight();
            this._matchesHighlight.priority = 1;
            this._currentMatchesHighlight = new Highlight();
            this._currentMatchesHighlight.priority = 2;
            CSS.highlights?.set(`find-highlight`, this._matchesHighlight);
            CSS.highlights?.set(`current-find-highlight`, this._currentMatchesHighlight);
        }
        _refreshRegistry(updateMatchesHighlight = true) {
            // for performance reasons, only update the full list of highlights when we need to
            if (updateMatchesHighlight) {
                this._matchesHighlight.clear();
            }
            this._currentMatchesHighlight.clear();
            this._activeHighlightInfo.forEach((highlightInfo) => {
                if (updateMatchesHighlight) {
                    for (let i = 0; i < highlightInfo.matches.length; i++) {
                        this._matchesHighlight.add(highlightInfo.matches[i].originalRange);
                    }
                }
                if (highlightInfo.currentMatchIndex < highlightInfo.matches.length && highlightInfo.currentMatchIndex >= 0) {
                    this._currentMatchesHighlight.add(highlightInfo.matches[highlightInfo.currentMatchIndex].originalRange);
                }
            });
        }
        addHighlights(matches, ownerID) {
            for (let i = 0; i < matches.length; i++) {
                this._matchesHighlight.add(matches[i].originalRange);
            }
            const newEntry = {
                matches,
                currentMatchIndex: -1,
            };
            this._activeHighlightInfo.set(ownerID, newEntry);
        }
        highlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                console.error('Modified current highlight match before adding highlight list.');
                return;
            }
            highlightInfo.currentMatchIndex = index;
            const match = highlightInfo.matches[index];
            if (match) {
                let offset = 0;
                try {
                    const outputOffset = window.document.getElementById(match.id).getBoundingClientRect().top;
                    match.originalRange.startContainer.parentElement?.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
                    const rangeOffset = match.originalRange.getBoundingClientRect().top;
                    offset = rangeOffset - outputOffset;
                    postNotebookMessage('didFindHighlightCurrent', {
                        offset
                    });
                }
                catch (e) {
                    console.error(e);
                }
            }
            this._refreshRegistry(false);
        }
        unHighlightCurrentMatch(index, ownerID) {
            const highlightInfo = this._activeHighlightInfo.get(ownerID);
            if (!highlightInfo) {
                return;
            }
            highlightInfo.currentMatchIndex = -1;
        }
        removeHighlights(ownerID) {
            this._activeHighlightInfo.delete(ownerID);
            this._refreshRegistry();
        }
        dispose() {
            window.document.getSelection()?.removeAllRanges();
            this._currentMatchesHighlight.clear();
            this._matchesHighlight.clear();
        }
    }
    const _highlighter = (CSS.highlights) ? new CSSHighlighter() : new JSHighlighter();
    function extractSelectionLine(selection) {
        const range = selection.getRangeAt(0);
        // we need to keep a reference to the old selection range to re-apply later
        const oldRange = range.cloneRange();
        const captureLength = selection.toString().length;
        // use selection API to modify selection to get entire line (the first line if multi-select)
        // collapse selection to start so that the cursor position is at beginning of match
        selection.collapseToStart();
        // extend selection in both directions to select the line
        selection.modify('move', 'backward', 'lineboundary');
        selection.modify('extend', 'forward', 'lineboundary');
        const line = selection.toString();
        // using the original range and the new range, we can find the offset of the match from the line start.
        const rangeStart = getStartOffset(selection.getRangeAt(0), oldRange);
        // line range for match
        const lineRange = {
            start: rangeStart,
            end: rangeStart + captureLength,
        };
        // re-add the old range so that the selection is restored
        selection.removeAllRanges();
        selection.addRange(oldRange);
        return { line, range: lineRange };
    }
    function getStartOffset(lineRange, originalRange) {
        // sometimes, the old and new range are in different DOM elements (ie: when the match is inside of <b></b>)
        // so we need to find the first common ancestor DOM element and find the positions of the old and new range relative to that.
        const firstCommonAncestor = findFirstCommonAncestor(lineRange.startContainer, originalRange.startContainer);
        const selectionOffset = getSelectionOffsetRelativeTo(firstCommonAncestor, lineRange.startContainer) + lineRange.startOffset;
        const textOffset = getSelectionOffsetRelativeTo(firstCommonAncestor, originalRange.startContainer) + originalRange.startOffset;
        return textOffset - selectionOffset;
    }
    // modified from https://stackoverflow.com/a/68583466/16253823
    function findFirstCommonAncestor(nodeA, nodeB) {
        const range = new Range();
        range.setStart(nodeA, 0);
        range.setEnd(nodeB, 0);
        return range.commonAncestorContainer;
    }
    function getTextContentLength(node) {
        let length = 0;
        if (node.nodeType === Node.TEXT_NODE) {
            length += node.textContent?.length || 0;
        }
        else {
            for (const childNode of node.childNodes) {
                length += getTextContentLength(childNode);
            }
        }
        return length;
    }
    // modified from https://stackoverflow.com/a/48812529/16253823
    function getSelectionOffsetRelativeTo(parentElement, currentNode) {
        if (!currentNode) {
            return 0;
        }
        let offset = 0;
        if (currentNode === parentElement || !parentElement.contains(currentNode)) {
            return offset;
        }
        // count the number of chars before the current dom elem and the start of the dom
        let prevSibling = currentNode.previousSibling;
        while (prevSibling) {
            offset += getTextContentLength(prevSibling);
            prevSibling = prevSibling.previousSibling;
        }
        return offset + getSelectionOffsetRelativeTo(parentElement, currentNode.parentNode);
    }
    const find = (query, options) => {
        let find = true;
        let matches = [];
        const range = document.createRange();
        range.selectNodeContents(window.document.getElementById('findStart'));
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        viewModel.toggleDragDropEnabled(false);
        try {
            document.designMode = 'On';
            while (find && matches.length < 500) {
                find = window.find(query, /* caseSensitive*/ !!options.caseSensitive, 
                /* backwards*/ false, 
                /* wrapAround*/ false, 
                /* wholeWord */ !!options.wholeWord, 
                /* searchInFrames*/ true, false);
                if (find) {
                    const selection = window.getSelection();
                    if (!selection) {
                        console.log('no selection');
                        break;
                    }
                    // Markdown preview are rendered in a shadow DOM.
                    if (options.includeMarkup && selection.rangeCount > 0 && selection.getRangeAt(0).startContainer.nodeType === 1
                        && selection.getRangeAt(0).startContainer.classList.contains('markup')) {
                        // markdown preview container
                        const preview = selection.anchorNode?.firstChild;
                        const root = preview.shadowRoot;
                        const shadowSelection = root?.getSelection ? root?.getSelection() : null;
                        // find the match in the shadow dom by checking the selection inside the shadow dom
                        if (shadowSelection && shadowSelection.anchorNode) {
                            matches.push({
                                type: 'preview',
                                id: preview.id,
                                cellId: preview.id,
                                container: preview,
                                isShadow: true,
                                originalRange: shadowSelection.getRangeAt(0),
                                searchPreviewInfo: options.shouldGetSearchPreviewInfo ? extractSelectionLine(shadowSelection) : undefined,
                            });
                        }
                    }
                    // Outputs might be rendered inside a shadow DOM.
                    if (options.includeOutput && selection.rangeCount > 0 && selection.getRangeAt(0).startContainer.nodeType === 1
                        && selection.getRangeAt(0).startContainer.classList.contains('output_container')) {
                        // output container
                        const cellId = selection.getRangeAt(0).startContainer.parentElement.id;
                        const outputNode = selection.anchorNode?.firstChild;
                        const root = outputNode.shadowRoot;
                        const shadowSelection = root?.getSelection ? root?.getSelection() : null;
                        if (shadowSelection && shadowSelection.anchorNode) {
                            matches.push({
                                type: 'output',
                                id: outputNode.id,
                                cellId: cellId,
                                container: outputNode,
                                isShadow: true,
                                originalRange: shadowSelection.getRangeAt(0),
                                searchPreviewInfo: options.shouldGetSearchPreviewInfo ? extractSelectionLine(shadowSelection) : undefined,
                            });
                        }
                    }
                    const anchorNode = selection.anchorNode?.parentElement;
                    if (anchorNode) {
                        const lastEl = matches.length ? matches[matches.length - 1] : null;
                        // Optimization: avoid searching for the output container
                        if (lastEl && lastEl.container.contains(anchorNode) && options.includeOutput) {
                            matches.push({
                                type: lastEl.type,
                                id: lastEl.id,
                                cellId: lastEl.cellId,
                                container: lastEl.container,
                                isShadow: false,
                                originalRange: selection.getRangeAt(0),
                                searchPreviewInfo: options.shouldGetSearchPreviewInfo ? extractSelectionLine(selection) : undefined,
                            });
                        }
                        else {
                            // Traverse up the DOM to find the container
                            for (let node = anchorNode; node; node = node.parentElement) {
                                if (!(node instanceof Element)) {
                                    break;
                                }
                                if (node.classList.contains('output') && options.includeOutput) {
                                    // inside output
                                    const cellId = node.parentElement?.parentElement?.id;
                                    if (cellId) {
                                        matches.push({
                                            type: 'output',
                                            id: node.id,
                                            cellId: cellId,
                                            container: node,
                                            isShadow: false,
                                            originalRange: selection.getRangeAt(0),
                                            searchPreviewInfo: options.shouldGetSearchPreviewInfo ? extractSelectionLine(selection) : undefined,
                                        });
                                    }
                                    break;
                                }
                                if (node.id === 'container' || node === window.document.body) {
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        break;
                    }
                }
            }
        }
        catch (e) {
            console.log(e);
        }
        matches = matches.filter(match => options.findIds.length ? options.findIds.includes(match.cellId) : true);
        _highlighter.addHighlights(matches, options.ownerID);
        window.document.getSelection()?.removeAllRanges();
        viewModel.toggleDragDropEnabled(currentOptions.dragAndDropEnabled);
        document.designMode = 'Off';
        postNotebookMessage('didFind', {
            matches: matches.map((match, index) => ({
                type: match.type,
                id: match.id,
                cellId: match.cellId,
                index,
                searchPreviewInfo: match.searchPreviewInfo,
            }))
        });
    };
    const copyOutputImage = async (outputId, altOutputId, retries = 5) => {
        if (!window.document.hasFocus() && retries > 0) {
            // copyImage can be called from outside of the webview, which means this function may be running whilst the webview is gaining focus.
            // Since navigator.clipboard.write requires the document to be focused, we need to wait for focus.
            // We cannot use a listener, as there is a high chance the focus is gained during the setup of the listener resulting in us missing it.
            setTimeout(() => { copyOutputImage(outputId, altOutputId, retries - 1); }, 50);
            return;
        }
        try {
            const outputElement = window.document.getElementById(outputId)
                ?? window.document.getElementById(altOutputId);
            let image = outputElement?.querySelector('img');
            if (!image) {
                const svgImage = outputElement?.querySelector('svg.output-image') ??
                    outputElement?.querySelector('div.svgContainerStyle > svg');
                if (svgImage) {
                    image = new Image();
                    image.src = 'data:image/svg+xml,' + encodeURIComponent(svgImage.outerHTML);
                }
            }
            if (image) {
                const imageToCopy = image;
                await navigator.clipboard.write([new ClipboardItem({
                        'image/png': new Promise((resolve) => {
                            const canvas = document.createElement('canvas');
                            canvas.width = imageToCopy.naturalWidth;
                            canvas.height = imageToCopy.naturalHeight;
                            const context = canvas.getContext('2d');
                            context.drawImage(imageToCopy, 0, 0);
                            canvas.toBlob((blob) => {
                                if (blob) {
                                    resolve(blob);
                                }
                                else {
                                    console.error('No blob data to write to clipboard');
                                }
                                canvas.remove();
                            }, 'image/png');
                        })
                    })]);
            }
            else {
                console.error('Could not find image element to copy for output with id', outputId);
            }
        }
        catch (e) {
            console.error('Could not copy image:', e);
        }
    };
    window.addEventListener('message', async (rawEvent) => {
        const event = rawEvent;
        switch (event.data.type) {
            case 'initializeMarkup': {
                try {
                    await Promise.all(event.data.cells.map(info => viewModel.ensureMarkupCell(info)));
                }
                finally {
                    dimensionUpdater.updateImmediately();
                    postNotebookMessage('initializedMarkup', { requestId: event.data.requestId });
                }
                break;
            }
            case 'createMarkupCell':
                viewModel.ensureMarkupCell(event.data.cell);
                break;
            case 'showMarkupCell':
                viewModel.showMarkupCell(event.data.id, event.data.top, event.data.content, event.data.metadata);
                break;
            case 'hideMarkupCells':
                for (const id of event.data.ids) {
                    viewModel.hideMarkupCell(id);
                }
                break;
            case 'unhideMarkupCells':
                for (const id of event.data.ids) {
                    viewModel.unhideMarkupCell(id);
                }
                break;
            case 'deleteMarkupCell':
                for (const id of event.data.ids) {
                    viewModel.deleteMarkupCell(id);
                }
                break;
            case 'updateSelectedMarkupCells':
                viewModel.updateSelectedCells(event.data.selectedCellIds);
                break;
            case 'html': {
                const data = event.data;
                if (data.createOnIdle) {
                    outputRunner.enqueueIdle(data.outputId, signal => {
                        // cancel the idle callback if it exists
                        return viewModel.renderOutputCell(data, signal);
                    });
                }
                else {
                    outputRunner.enqueue(data.outputId, signal => {
                        // cancel the idle callback if it exists
                        return viewModel.renderOutputCell(data, signal);
                    });
                }
                break;
            }
            case 'view-scroll':
                {
                    // const date = new Date();
                    // console.log('----- will scroll ----  ', date.getMinutes() + ':' + date.getSeconds() + ':' + date.getMilliseconds());
                    event.data.widgets.forEach(widget => {
                        outputRunner.enqueue(widget.outputId, () => {
                            viewModel.updateOutputsScroll([widget]);
                        });
                    });
                    viewModel.updateMarkupScrolls(event.data.markupCells);
                    break;
                }
            case 'clear':
                renderers.clearAll();
                viewModel.clearAll();
                window.document.getElementById('container').innerText = '';
                break;
            case 'clearOutput': {
                const { cellId, rendererId, outputId } = event.data;
                outputRunner.cancelOutput(outputId);
                viewModel.clearOutput(cellId, outputId, rendererId);
                break;
            }
            case 'hideOutput': {
                const { cellId, outputId } = event.data;
                outputRunner.enqueue(outputId, () => {
                    viewModel.hideOutput(cellId);
                });
                break;
            }
            case 'showOutput': {
                const { outputId, cellTop, cellId, content } = event.data;
                outputRunner.enqueue(outputId, () => {
                    viewModel.showOutput(cellId, outputId, cellTop);
                    if (content) {
                        viewModel.updateAndRerender(cellId, outputId, content);
                    }
                });
                break;
            }
            case 'copyImage': {
                await copyOutputImage(event.data.outputId, event.data.altOutputId);
                break;
            }
            case 'ack-dimension': {
                for (const { cellId, outputId, height } of event.data.updates) {
                    viewModel.updateOutputHeight(cellId, outputId, height);
                }
                break;
            }
            case 'preload': {
                const resources = event.data.resources;
                for (const { uri } of resources) {
                    kernelPreloads.load(uri);
                }
                break;
            }
            case 'updateRenderers': {
                const { rendererData } = event.data;
                renderers.updateRendererData(rendererData);
                break;
            }
            case 'focus-output':
                focusFirstFocusableOrContainerInOutput(event.data.cellOrOutputId, event.data.alternateId);
                break;
            case 'blur-output':
                blurOutput();
                break;
            case 'select-output-contents':
                selectOutputContents(event.data.cellOrOutputId);
                break;
            case 'select-input-contents':
                selectInputContents(event.data.cellOrOutputId);
                break;
            case 'decorations': {
                let outputContainer = window.document.getElementById(event.data.cellId);
                if (!outputContainer) {
                    viewModel.ensureOutputCell(event.data.cellId, -100000, true);
                    outputContainer = window.document.getElementById(event.data.cellId);
                }
                outputContainer?.classList.add(...event.data.addedClassNames);
                outputContainer?.classList.remove(...event.data.removedClassNames);
                break;
            }
            case 'markupDecorations': {
                const markupCell = window.document.getElementById(event.data.cellId);
                // The cell may not have been added yet if it is out of view.
                // Decorations will be added when the cell is shown.
                if (markupCell) {
                    markupCell?.classList.add(...event.data.addedClassNames);
                    markupCell?.classList.remove(...event.data.removedClassNames);
                }
                break;
            }
            case 'customKernelMessage':
                onDidReceiveKernelMessage.fire(event.data.message);
                break;
            case 'customRendererMessage':
                renderers.getRenderer(event.data.rendererId)?.receiveMessage(event.data.message);
                break;
            case 'notebookStyles': {
                const documentStyle = window.document.documentElement.style;
                for (let i = documentStyle.length - 1; i >= 0; i--) {
                    const property = documentStyle[i];
                    // Don't remove properties that the webview might have added separately
                    if (property && property.startsWith('--notebook-')) {
                        documentStyle.removeProperty(property);
                    }
                }
                // Re-add new properties
                for (const [name, value] of Object.entries(event.data.styles)) {
                    documentStyle.setProperty(`--${name}`, value);
                }
                break;
            }
            case 'notebookOptions':
                currentOptions = event.data.options;
                viewModel.toggleDragDropEnabled(currentOptions.dragAndDropEnabled);
                currentRenderOptions = event.data.renderOptions;
                settingChange.fire(currentRenderOptions);
                break;
            case 'tokenizedCodeBlock': {
                const { codeBlockId, html } = event.data;
                MarkdownCodeBlock.highlightCodeBlock(codeBlockId, html);
                break;
            }
            case 'tokenizedStylesChanged': {
                tokenizationStyle.replaceSync(event.data.css);
                break;
            }
            case 'find': {
                _highlighter.removeHighlights(event.data.options.ownerID);
                find(event.data.query, event.data.options);
                break;
            }
            case 'findHighlightCurrent': {
                _highlighter?.highlightCurrentMatch(event.data.index, event.data.ownerID);
                break;
            }
            case 'findUnHighlightCurrent': {
                _highlighter?.unHighlightCurrentMatch(event.data.index, event.data.ownerID);
                break;
            }
            case 'findStop': {
                _highlighter.removeHighlights(event.data.ownerID);
                break;
            }
            case 'returnOutputItem': {
                outputItemRequests.resolveOutputItem(event.data.requestId, event.data.output);
            }
        }
    });
    const renderFallbackErrorName = 'vscode.fallbackToNextRenderer';
    class Renderer {
        constructor(data) {
            this.data = data;
            this._onMessageEvent = createEmitter();
        }
        receiveMessage(message) {
            this._onMessageEvent.fire(message);
        }
        async renderOutputItem(item, element, signal) {
            try {
                await this.load();
            }
            catch (e) {
                if (!signal.aborted) {
                    showRenderError(`Error loading renderer '${this.data.id}'`, element, e instanceof Error ? [e] : []);
                }
                return;
            }
            if (!this._api) {
                if (!signal.aborted) {
                    showRenderError(`Renderer '${this.data.id}' does not implement renderOutputItem`, element, []);
                }
                return;
            }
            try {
                const renderStart = performance.now();
                await this._api.renderOutputItem(item, element, signal);
                this.postDebugMessage('Rendered output item', { id: item.id, duration: `${performance.now() - renderStart}ms` });
            }
            catch (e) {
                if (signal.aborted) {
                    return;
                }
                if (e instanceof Error && e.name === renderFallbackErrorName) {
                    throw e;
                }
                showRenderError(`Error rendering output item using '${this.data.id}'`, element, e instanceof Error ? [e] : []);
                this.postDebugMessage('Rendering output item failed', { id: item.id, error: e + '' });
            }
        }
        disposeOutputItem(id) {
            this._api?.disposeOutputItem?.(id);
        }
        createRendererContext() {
            const { id, messaging } = this.data;
            const context = {
                setState: newState => vscode.setState({ ...vscode.getState(), [id]: newState }),
                getState: () => {
                    const state = vscode.getState();
                    return typeof state === 'object' && state ? state[id] : undefined;
                },
                getRenderer: async (id) => {
                    const renderer = renderers.getRenderer(id);
                    if (!renderer) {
                        return undefined;
                    }
                    if (renderer._api) {
                        return renderer._api;
                    }
                    return renderer.load();
                },
                workspace: {
                    get isTrusted() { return isWorkspaceTrusted; }
                },
                settings: {
                    get lineLimit() { return currentRenderOptions.lineLimit; },
                    get outputScrolling() { return currentRenderOptions.outputScrolling; },
                    get outputWordWrap() { return currentRenderOptions.outputWordWrap; },
                    get linkifyFilePaths() { return currentRenderOptions.linkifyFilePaths; },
                    get minimalError() { return currentRenderOptions.minimalError; },
                },
                get onDidChangeSettings() { return settingChange.event; }
            };
            if (messaging) {
                context.onDidReceiveMessage = this._onMessageEvent.event;
                context.postMessage = message => postNotebookMessage('customRendererMessage', { rendererId: id, message });
            }
            return Object.freeze(context);
        }
        load() {
            this._loadPromise ??= this._load();
            return this._loadPromise;
        }
        /** Inner function cached in the _loadPromise(). */
        async _load() {
            this.postDebugMessage('Start loading renderer');
            try {
                // Preloads need to be loaded before loading renderers.
                await kernelPreloads.waitForAllCurrent();
                const importStart = performance.now();
                const module = await __import(this.data.entrypoint.path);
                this.postDebugMessage('Imported renderer', { duration: `${performance.now() - importStart}ms` });
                if (!module) {
                    return;
                }
                this._api = await module.activate(this.createRendererContext());
                this.postDebugMessage('Activated renderer', { duration: `${performance.now() - importStart}ms` });
                const dependantRenderers = ctx.rendererData
                    .filter(d => d.entrypoint.extends === this.data.id);
                if (dependantRenderers.length) {
                    this.postDebugMessage('Activating dependant renderers', { dependents: dependantRenderers.map(x => x.id).join(', ') });
                }
                // Load all renderers that extend this renderer
                await Promise.all(dependantRenderers.map(async (d) => {
                    const renderer = renderers.getRenderer(d.id);
                    if (!renderer) {
                        throw new Error(`Could not find extending renderer: ${d.id}`);
                    }
                    try {
                        return await renderer.load();
                    }
                    catch (e) {
                        // Squash any errors extends errors. They won't prevent the renderer
                        // itself from working, so just log them.
                        console.error(e);
                        this.postDebugMessage('Activating dependant renderer failed', { dependent: d.id, error: e + '' });
                        return undefined;
                    }
                }));
                return this._api;
            }
            catch (e) {
                this.postDebugMessage('Loading renderer failed');
                throw e;
            }
        }
        postDebugMessage(msg, data) {
            postNotebookMessage('logRendererDebugMessage', {
                message: `[renderer ${this.data.id}] - ${msg}`,
                data
            });
        }
    }
    const kernelPreloads = new class {
        constructor() {
            this.preloads = new Map();
        }
        /**
         * Returns a promise that resolves when the given preload is activated.
         */
        waitFor(uri) {
            return this.preloads.get(uri) || Promise.resolve(new Error(`Preload not ready: ${uri}`));
        }
        /**
         * Loads a preload.
         * @param uri URI to load from
         * @param originalUri URI to show in an error message if the preload is invalid.
         */
        load(uri) {
            const promise = Promise.all([
                runKernelPreload(uri),
                this.waitForAllCurrent(),
            ]);
            this.preloads.set(uri, promise);
            return promise;
        }
        /**
         * Returns a promise that waits for all currently-registered preloads to
         * activate before resolving.
         */
        waitForAllCurrent() {
            return Promise.all([...this.preloads.values()].map(p => p.catch(err => err)));
        }
    };
    const outputRunner = new class {
        constructor() {
            this.outputs = new Map();
            this.pendingOutputCreationRequest = new Map();
        }
        /**
         * Pushes the action onto the list of actions for the given output ID,
         * ensuring that it's run in-order.
         */
        enqueue(outputId, action) {
            this.pendingOutputCreationRequest.get(outputId)?.dispose();
            this.pendingOutputCreationRequest.delete(outputId);
            const record = this.outputs.get(outputId);
            if (!record) {
                const controller = new AbortController();
                this.outputs.set(outputId, { abort: controller, queue: new Promise(r => r(action(controller.signal))) });
            }
            else {
                record.queue = record.queue.then(async (r) => {
                    if (!record.abort.signal.aborted) {
                        await action(record.abort.signal);
                    }
                });
            }
        }
        enqueueIdle(outputId, action) {
            this.pendingOutputCreationRequest.get(outputId)?.dispose();
            outputRunner.pendingOutputCreationRequest.set(outputId, runWhenIdle(() => {
                outputRunner.enqueue(outputId, action);
                outputRunner.pendingOutputCreationRequest.delete(outputId);
            }));
        }
        /**
         * Cancels the rendering of all outputs.
         */
        cancelAll() {
            // Delete all pending idle requests
            this.pendingOutputCreationRequest.forEach(r => r.dispose());
            this.pendingOutputCreationRequest.clear();
            for (const { abort } of this.outputs.values()) {
                abort.abort();
            }
            this.outputs.clear();
        }
        /**
         * Cancels any ongoing rendering out an output.
         */
        cancelOutput(outputId) {
            // Delete the pending idle request if it exists
            this.pendingOutputCreationRequest.get(outputId)?.dispose();
            this.pendingOutputCreationRequest.delete(outputId);
            const output = this.outputs.get(outputId);
            if (output) {
                output.abort.abort();
                this.outputs.delete(outputId);
            }
        }
    };
    const renderers = new class {
        constructor() {
            this._renderers = new Map();
            for (const renderer of ctx.rendererData) {
                this.addRenderer(renderer);
            }
        }
        getRenderer(id) {
            return this._renderers.get(id);
        }
        rendererEqual(a, b) {
            if (a.id !== b.id || a.entrypoint.path !== b.entrypoint.path || a.entrypoint.extends !== b.entrypoint.extends || a.messaging !== b.messaging) {
                return false;
            }
            if (a.mimeTypes.length !== b.mimeTypes.length) {
                return false;
            }
            for (let i = 0; i < a.mimeTypes.length; i++) {
                if (a.mimeTypes[i] !== b.mimeTypes[i]) {
                    return false;
                }
            }
            return true;
        }
        updateRendererData(rendererData) {
            const oldKeys = new Set(this._renderers.keys());
            const newKeys = new Set(rendererData.map(d => d.id));
            for (const renderer of rendererData) {
                const existing = this._renderers.get(renderer.id);
                if (existing && this.rendererEqual(existing.data, renderer)) {
                    continue;
                }
                this.addRenderer(renderer);
            }
            for (const key of oldKeys) {
                if (!newKeys.has(key)) {
                    this._renderers.delete(key);
                }
            }
        }
        addRenderer(renderer) {
            this._renderers.set(renderer.id, new Renderer(renderer));
        }
        clearAll() {
            outputRunner.cancelAll();
            for (const renderer of this._renderers.values()) {
                renderer.disposeOutputItem();
            }
        }
        clearOutput(rendererId, outputId) {
            outputRunner.cancelOutput(outputId);
            this._renderers.get(rendererId)?.disposeOutputItem(outputId);
        }
        async render(item, preferredRendererId, element, signal) {
            const primaryRenderer = this.findRenderer(preferredRendererId, item);
            if (!primaryRenderer) {
                const errorMessage = (window.document.documentElement.style.getPropertyValue('--notebook-cell-renderer-not-found-error') || '').replace('$0', () => item.mime);
                this.showRenderError(item, element, errorMessage);
                return;
            }
            // Try primary renderer first
            if (!(await this._doRender(item, element, primaryRenderer, signal)).continue) {
                return;
            }
            // Primary renderer failed in an expected way. Fallback to render the next mime types
            for (const additionalItemData of item._allOutputItems) {
                if (additionalItemData.mime === item.mime) {
                    continue;
                }
                const additionalItem = await additionalItemData.getItem();
                if (signal.aborted) {
                    return;
                }
                if (additionalItem) {
                    const renderer = this.findRenderer(undefined, additionalItem);
                    if (renderer) {
                        if (!(await this._doRender(additionalItem, element, renderer, signal)).continue) {
                            return; // We rendered successfully
                        }
                    }
                }
            }
            // All renderers have failed and there is nothing left to fallback to
            const errorMessage = (window.document.documentElement.style.getPropertyValue('--notebook-cell-renderer-fallbacks-exhausted') || '').replace('$0', () => item.mime);
            this.showRenderError(item, element, errorMessage);
        }
        async _doRender(item, element, renderer, signal) {
            try {
                await renderer.renderOutputItem(item, element, signal);
                return { continue: false }; // We rendered successfully
            }
            catch (e) {
                if (signal.aborted) {
                    return { continue: false };
                }
                if (e instanceof Error && e.name === renderFallbackErrorName) {
                    return { continue: true };
                }
                else {
                    throw e; // Bail and let callers handle unknown errors
                }
            }
        }
        findRenderer(preferredRendererId, info) {
            let renderer;
            if (typeof preferredRendererId === 'string') {
                renderer = Array.from(this._renderers.values())
                    .find((renderer) => renderer.data.id === preferredRendererId);
            }
            else {
                const renderers = Array.from(this._renderers.values())
                    .filter((renderer) => renderer.data.mimeTypes.includes(info.mime) && !renderer.data.entrypoint.extends);
                if (renderers.length) {
                    // De-prioritize built-in renderers
                    renderers.sort((a, b) => +a.data.isBuiltin - +b.data.isBuiltin);
                    // Use first renderer we find in sorted list
                    renderer = renderers[0];
                }
            }
            return renderer;
        }
        showRenderError(info, element, errorMessage) {
            const errorContainer = document.createElement('div');
            const error = document.createElement('div');
            error.className = 'no-renderer-error';
            error.innerText = errorMessage;
            const cellText = document.createElement('div');
            cellText.innerText = info.text();
            errorContainer.appendChild(error);
            errorContainer.appendChild(cellText);
            element.innerText = '';
            element.appendChild(errorContainer);
        }
    }();
    const viewModel = new class ViewModel {
        constructor() {
            this._markupCells = new Map();
            this._outputCells = new Map();
        }
        clearAll() {
            for (const cell of this._markupCells.values()) {
                cell.dispose();
            }
            this._markupCells.clear();
            for (const output of this._outputCells.values()) {
                output.dispose();
            }
            this._outputCells.clear();
        }
        async createMarkupCell(init, top, visible) {
            const existing = this._markupCells.get(init.cellId);
            if (existing) {
                console.error(`Trying to create markup that already exists: ${init.cellId}`);
                return existing;
            }
            const cell = new MarkupCell(init.cellId, init.mime, init.content, top, init.metadata);
            cell.element.style.visibility = visible ? '' : 'hidden';
            this._markupCells.set(init.cellId, cell);
            await cell.ready;
            return cell;
        }
        async ensureMarkupCell(info) {
            let cell = this._markupCells.get(info.cellId);
            if (cell) {
                cell.element.style.visibility = info.visible ? '' : 'hidden';
                await cell.updateContentAndRender(info.content, info.metadata);
            }
            else {
                cell = await this.createMarkupCell(info, info.offset, info.visible);
            }
        }
        deleteMarkupCell(id) {
            const cell = this.getExpectedMarkupCell(id);
            if (cell) {
                cell.remove();
                cell.dispose();
                this._markupCells.delete(id);
            }
        }
        async updateMarkupContent(id, newContent, metadata) {
            const cell = this.getExpectedMarkupCell(id);
            await cell?.updateContentAndRender(newContent, metadata);
        }
        showMarkupCell(id, top, newContent, metadata) {
            const cell = this.getExpectedMarkupCell(id);
            cell?.show(top, newContent, metadata);
        }
        hideMarkupCell(id) {
            const cell = this.getExpectedMarkupCell(id);
            cell?.hide();
        }
        unhideMarkupCell(id) {
            const cell = this.getExpectedMarkupCell(id);
            cell?.unhide();
        }
        getExpectedMarkupCell(id) {
            const cell = this._markupCells.get(id);
            if (!cell) {
                console.log(`Could not find markup cell '${id}'`);
                return undefined;
            }
            return cell;
        }
        updateSelectedCells(selectedCellIds) {
            const selectedCellSet = new Set(selectedCellIds);
            for (const cell of this._markupCells.values()) {
                cell.setSelected(selectedCellSet.has(cell.id));
            }
        }
        toggleDragDropEnabled(dragAndDropEnabled) {
            for (const cell of this._markupCells.values()) {
                cell.toggleDragDropEnabled(dragAndDropEnabled);
            }
        }
        updateMarkupScrolls(markupCells) {
            for (const { id, top } of markupCells) {
                const cell = this._markupCells.get(id);
                if (cell) {
                    cell.element.style.top = `${top}px`;
                }
            }
        }
        async renderOutputCell(data, signal) {
            const preloadErrors = await Promise.all(data.requiredPreloads.map(p => kernelPreloads.waitFor(p.uri).then(() => undefined, err => err)));
            if (signal.aborted) {
                return;
            }
            const cellOutput = this.ensureOutputCell(data.cellId, data.cellTop, false);
            return cellOutput.renderOutputElement(data, preloadErrors, signal);
        }
        ensureOutputCell(cellId, cellTop, skipCellTopUpdateIfExist) {
            let cell = this._outputCells.get(cellId);
            const existed = !!cell;
            if (!cell) {
                cell = new OutputCell(cellId);
                this._outputCells.set(cellId, cell);
            }
            if (existed && skipCellTopUpdateIfExist) {
                return cell;
            }
            cell.element.style.top = cellTop + 'px';
            return cell;
        }
        clearOutput(cellId, outputId, rendererId) {
            const cell = this._outputCells.get(cellId);
            cell?.clearOutput(outputId, rendererId);
        }
        showOutput(cellId, outputId, top) {
            const cell = this._outputCells.get(cellId);
            cell?.show(outputId, top);
        }
        updateAndRerender(cellId, outputId, content) {
            const cell = this._outputCells.get(cellId);
            cell?.updateContentAndRerender(outputId, content);
        }
        hideOutput(cellId) {
            const cell = this._outputCells.get(cellId);
            cell?.hide();
        }
        updateOutputHeight(cellId, outputId, height) {
            const cell = this._outputCells.get(cellId);
            cell?.updateOutputHeight(outputId, height);
        }
        updateOutputsScroll(updates) {
            for (const request of updates) {
                const cell = this._outputCells.get(request.cellId);
                cell?.updateScroll(request);
            }
        }
    }();
    class MarkdownCodeBlock {
        static { this.pendingCodeBlocksToHighlight = new Map(); }
        static highlightCodeBlock(id, html) {
            const el = MarkdownCodeBlock.pendingCodeBlocksToHighlight.get(id);
            if (!el) {
                return;
            }
            const trustedHtml = ttPolicy?.createHTML(html) ?? html;
            el.innerHTML = trustedHtml; // CodeQL [SM03712] The rendered content comes from VS Code's tokenizer and is considered safe
            const root = el.getRootNode();
            if (root instanceof ShadowRoot) {
                if (!root.adoptedStyleSheets.includes(tokenizationStyle)) {
                    root.adoptedStyleSheets.push(tokenizationStyle);
                }
            }
        }
        static requestHighlightCodeBlock(root) {
            const codeBlocks = [];
            let i = 0;
            for (const el of root.querySelectorAll('.vscode-code-block')) {
                const lang = el.getAttribute('data-vscode-code-block-lang');
                if (el.textContent && lang) {
                    const id = `${Date.now()}-${i++}`;
                    codeBlocks.push({ value: el.textContent, lang: lang, id });
                    MarkdownCodeBlock.pendingCodeBlocksToHighlight.set(id, el);
                }
            }
            return codeBlocks;
        }
    }
    class MarkupCell {
        constructor(id, mime, content, top, metadata) {
            this._isDisposed = false;
            const self = this;
            this.id = id;
            this._content = { value: content, version: 0, metadata: metadata };
            const { promise, resolve, reject } = promiseWithResolvers();
            this.ready = promise;
            let cachedData;
            this.outputItem = Object.freeze({
                id,
                mime,
                get metadata() {
                    return self._content.metadata;
                },
                text: () => {
                    return this._content.value;
                },
                json: () => {
                    return undefined;
                },
                data: () => {
                    if (cachedData?.version === this._content.version) {
                        return cachedData.value;
                    }
                    const data = textEncoder.encode(this._content.value);
                    cachedData = { version: this._content.version, value: data };
                    return data;
                },
                blob() {
                    return new Blob([this.data()], { type: this.mime });
                },
                _allOutputItems: [{
                        mime,
                        getItem: async () => this.outputItem,
                    }]
            });
            const root = window.document.getElementById('container');
            const markupCell = document.createElement('div');
            markupCell.className = 'markup';
            markupCell.style.position = 'absolute';
            markupCell.style.width = '100%';
            this.element = document.createElement('div');
            this.element.id = this.id;
            this.element.classList.add('preview');
            this.element.style.position = 'absolute';
            this.element.style.top = top + 'px';
            this.toggleDragDropEnabled(currentOptions.dragAndDropEnabled);
            markupCell.appendChild(this.element);
            root.appendChild(markupCell);
            this.addEventListeners();
            this.updateContentAndRender(this._content.value, this._content.metadata).then(() => {
                if (!this._isDisposed) {
                    resizeObserver.observe(this.element, this.id, false, this.id);
                }
                resolve();
            }, () => reject());
        }
        dispose() {
            this._isDisposed = true;
            this.renderTaskAbort?.abort();
            this.renderTaskAbort = undefined;
        }
        addEventListeners() {
            this.element.addEventListener('dblclick', () => {
                postNotebookMessage('toggleMarkupPreview', { cellId: this.id });
            });
            this.element.addEventListener('click', e => {
                postNotebookMessage('clickMarkupCell', {
                    cellId: this.id,
                    altKey: e.altKey,
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                    shiftKey: e.shiftKey,
                });
            });
            this.element.addEventListener('contextmenu', e => {
                postNotebookMessage('contextMenuMarkupCell', {
                    cellId: this.id,
                    clientX: e.clientX,
                    clientY: e.clientY,
                });
            });
            this.element.addEventListener('mouseenter', () => {
                postNotebookMessage('mouseEnterMarkupCell', { cellId: this.id });
            });
            this.element.addEventListener('mouseleave', () => {
                postNotebookMessage('mouseLeaveMarkupCell', { cellId: this.id });
            });
            this.element.addEventListener('dragstart', e => {
                markupCellDragManager.startDrag(e, this.id);
            });
            this.element.addEventListener('drag', e => {
                markupCellDragManager.updateDrag(e, this.id);
            });
            this.element.addEventListener('dragend', e => {
                markupCellDragManager.endDrag(e, this.id);
            });
        }
        async updateContentAndRender(newContent, metadata) {
            this._content = { value: newContent, version: this._content.version + 1, metadata };
            this.renderTaskAbort?.abort();
            const controller = new AbortController();
            this.renderTaskAbort = controller;
            try {
                await renderers.render(this.outputItem, undefined, this.element, this.renderTaskAbort.signal);
            }
            finally {
                if (this.renderTaskAbort === controller) {
                    this.renderTaskAbort = undefined;
                }
            }
            const root = (this.element.shadowRoot ?? this.element);
            const html = [];
            for (const child of root.children) {
                switch (child.tagName) {
                    case 'LINK':
                    case 'SCRIPT':
                    case 'STYLE':
                        // not worth sending over since it will be stripped before rendering
                        break;
                    default:
                        html.push(child.outerHTML);
                        break;
                }
            }
            const codeBlocks = MarkdownCodeBlock.requestHighlightCodeBlock(root);
            postNotebookMessage('renderedMarkup', {
                cellId: this.id,
                html: html.join(''),
                codeBlocks
            });
            dimensionUpdater.updateHeight(this.id, this.element.offsetHeight, {
                isOutput: false
            });
        }
        show(top, newContent, metadata) {
            this.element.style.visibility = '';
            this.element.style.top = `${top}px`;
            if (typeof newContent === 'string' || metadata) {
                this.updateContentAndRender(newContent ?? this._content.value, metadata ?? this._content.metadata);
            }
            else {
                this.updateMarkupDimensions();
            }
        }
        hide() {
            this.element.style.visibility = 'hidden';
        }
        unhide() {
            this.element.style.visibility = '';
            this.updateMarkupDimensions();
        }
        remove() {
            this.element.remove();
        }
        async updateMarkupDimensions() {
            dimensionUpdater.updateHeight(this.id, this.element.offsetHeight, {
                isOutput: false
            });
        }
        setSelected(selected) {
            this.element.classList.toggle('selected', selected);
        }
        toggleDragDropEnabled(enabled) {
            if (enabled) {
                this.element.classList.add('draggable');
                this.element.setAttribute('draggable', 'true');
            }
            else {
                this.element.classList.remove('draggable');
                this.element.removeAttribute('draggable');
            }
        }
    }
    class OutputCell {
        constructor(cellId) {
            this.outputElements = new Map();
            const container = window.document.getElementById('container');
            const upperWrapperElement = createFocusSink(cellId);
            container.appendChild(upperWrapperElement);
            this.element = document.createElement('div');
            this.element.style.position = 'absolute';
            this.element.style.outline = '0';
            this.element.id = cellId;
            this.element.classList.add('cell_container');
            container.appendChild(this.element);
            this.element = this.element;
            const lowerWrapperElement = createFocusSink(cellId, true);
            container.appendChild(lowerWrapperElement);
        }
        dispose() {
            for (const output of this.outputElements.values()) {
                output.dispose();
            }
            this.outputElements.clear();
        }
        createOutputElement(data) {
            let outputContainer = this.outputElements.get(data.outputId);
            if (!outputContainer) {
                outputContainer = new OutputContainer(data.outputId);
                this.element.appendChild(outputContainer.element);
                this.outputElements.set(data.outputId, outputContainer);
            }
            return outputContainer.createOutputElement(data.outputId, data.outputOffset, data.left, data.cellId);
        }
        async renderOutputElement(data, preloadErrors, signal) {
            const startTime = Date.now();
            const outputElement /** outputNode */ = this.createOutputElement(data);
            await outputElement.render(data.content, data.rendererId, preloadErrors, signal);
            // don't hide until after this step so that the height is right
            outputElement /** outputNode */.element.style.visibility = data.initiallyHidden ? 'hidden' : '';
            if (!!data.executionId && !!data.rendererId) {
                let outputSize = undefined;
                if (data.content.type === 1 /* extension */) {
                    outputSize = data.content.output.valueBytes.length;
                }
                // Only send performance messages for non-empty outputs up to a certain size
                if (outputSize !== undefined && outputSize > 0 && outputSize < 100 * 1024) {
                    postNotebookMessage('notebookPerformanceMessage', {
                        cellId: data.cellId,
                        executionId: data.executionId,
                        duration: Date.now() - startTime,
                        rendererId: data.rendererId,
                        outputSize
                    });
                }
            }
        }
        clearOutput(outputId, rendererId) {
            const output = this.outputElements.get(outputId);
            output?.clear(rendererId);
            output?.dispose();
            this.outputElements.delete(outputId);
        }
        show(outputId, top) {
            const outputContainer = this.outputElements.get(outputId);
            if (!outputContainer) {
                return;
            }
            this.element.style.visibility = '';
            this.element.style.top = `${top}px`;
        }
        hide() {
            this.element.style.visibility = 'hidden';
        }
        updateContentAndRerender(outputId, content) {
            this.outputElements.get(outputId)?.updateContentAndRender(content);
        }
        updateOutputHeight(outputId, height) {
            this.outputElements.get(outputId)?.updateHeight(height);
        }
        updateScroll(request) {
            this.element.style.top = `${request.cellTop}px`;
            const outputElement = this.outputElements.get(request.outputId);
            if (outputElement) {
                outputElement.updateScroll(request.outputOffset);
                if (request.forceDisplay && outputElement.outputNode) {
                    // TODO @rebornix @mjbvz, there is a misalignment here.
                    // We set output visibility on cell container, other than output container or output node itself.
                    outputElement.outputNode.element.style.visibility = '';
                }
            }
            if (request.forceDisplay) {
                this.element.style.visibility = '';
            }
        }
    }
    class OutputContainer {
        get outputNode() {
            return this._outputNode;
        }
        constructor(outputId) {
            this.outputId = outputId;
            this.element = document.createElement('div');
            this.element.classList.add('output_container');
            this.element.setAttribute('data-vscode-context', JSON.stringify({ 'preventDefaultContextMenuItems': true }));
            this.element.style.position = 'absolute';
            this.element.style.overflow = 'hidden';
        }
        dispose() {
            this._outputNode?.dispose();
        }
        clear(rendererId) {
            if (rendererId) {
                renderers.clearOutput(rendererId, this.outputId);
            }
            this.element.remove();
        }
        updateHeight(height) {
            this.element.style.maxHeight = `${height}px`;
            this.element.style.height = `${height}px`;
        }
        updateScroll(outputOffset) {
            this.element.style.top = `${outputOffset}px`;
        }
        createOutputElement(outputId, outputOffset, left, cellId) {
            this.element.innerText = '';
            this.element.style.maxHeight = '0px';
            this.element.style.top = `${outputOffset}px`;
            this._outputNode?.dispose();
            this._outputNode = new OutputElement(outputId, left, cellId);
            this.element.appendChild(this._outputNode.element);
            return this._outputNode;
        }
        updateContentAndRender(content) {
            this._outputNode?.updateAndRerender(content);
        }
    }
    vscode.postMessage({
        __vscode_notebook_message: true,
        type: 'initialized'
    });
    for (const preload of ctx.staticPreloadsData) {
        kernelPreloads.load(preload.entrypoint);
    }
    function postNotebookMessage(type, properties) {
        vscode.postMessage({
            __vscode_notebook_message: true,
            type,
            ...properties
        });
    }
    class OutputElement {
        constructor(outputId, left, cellId) {
            this.outputId = outputId;
            this.cellId = cellId;
            this.hasResizeObserver = false;
            this.element = document.createElement('div');
            this.element.id = outputId;
            this.element.classList.add('output');
            this.element.style.position = 'absolute';
            this.element.style.top = `0px`;
            this.element.style.left = left + 'px';
            this.element.style.padding = `${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodeLeftPadding}`;
            this.element.addEventListener('mouseenter', () => {
                postNotebookMessage('mouseenter', { id: outputId });
            });
            this.element.addEventListener('mouseleave', () => {
                postNotebookMessage('mouseleave', { id: outputId });
            });
        }
        dispose() {
            this.renderTaskAbort?.abort();
            this.renderTaskAbort = undefined;
        }
        async render(content, preferredRendererId, preloadErrors, signal) {
            this.renderTaskAbort?.abort();
            this.renderTaskAbort = undefined;
            this._content = { preferredRendererId, preloadErrors };
            if (content.type === 0 /* RenderOutputType.Html */) {
                const trustedHtml = ttPolicy?.createHTML(content.htmlContent) ?? content.htmlContent;
                this.element.innerHTML = trustedHtml; // CodeQL [SM03712] The content comes from renderer extensions, not from direct user input.
            }
            else if (preloadErrors.some(e => e instanceof Error)) {
                const errors = preloadErrors.filter((e) => e instanceof Error);
                showRenderError(`Error loading preloads`, this.element, errors);
            }
            else {
                const item = createOutputItem(this.outputId, content.output.mime, content.metadata, content.output.valueBytes, content.allOutputs, content.output.appended);
                const controller = new AbortController();
                this.renderTaskAbort = controller;
                // Abort rendering if caller aborts
                signal?.addEventListener('abort', () => controller.abort());
                try {
                    await renderers.render(item, preferredRendererId, this.element, controller.signal);
                }
                finally {
                    if (this.renderTaskAbort === controller) {
                        this.renderTaskAbort = undefined;
                    }
                }
            }
            if (!this.hasResizeObserver) {
                this.hasResizeObserver = true;
                resizeObserver.observe(this.element, this.outputId, true, this.cellId);
            }
            const offsetHeight = this.element.offsetHeight;
            const cps = document.defaultView.getComputedStyle(this.element);
            const verticalPadding = parseFloat(cps.paddingTop) + parseFloat(cps.paddingBottom);
            const contentHeight = offsetHeight - verticalPadding;
            if (elementHasContent(contentHeight) && cps.padding === '0px') {
                // we set padding to zero if the output has no content (then we can have a zero-height output DOM node)
                // thus we need to ensure the padding is accounted when updating the init height of the output
                dimensionUpdater.updateHeight(this.outputId, offsetHeight + ctx.style.outputNodePadding * 2, {
                    isOutput: true,
                    init: true
                });
                this.element.style.padding = `${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodePadding}px ${ctx.style.outputNodeLeftPadding}`;
            }
            else if (elementHasContent(contentHeight)) {
                dimensionUpdater.updateHeight(this.outputId, this.element.offsetHeight, {
                    isOutput: true,
                    init: true
                });
                this.element.style.padding = `0 ${ctx.style.outputNodePadding}px 0 ${ctx.style.outputNodeLeftPadding}`;
            }
            else {
                // we have a zero-height output DOM node
                dimensionUpdater.updateHeight(this.outputId, 0, {
                    isOutput: true,
                    init: true,
                });
            }
            const root = this.element.shadowRoot ?? this.element;
            const codeBlocks = MarkdownCodeBlock.requestHighlightCodeBlock(root);
            if (codeBlocks.length > 0) {
                postNotebookMessage('renderedCellOutput', {
                    codeBlocks
                });
            }
        }
        updateAndRerender(content) {
            if (this._content) {
                this.render(content, this._content.preferredRendererId, this._content.preloadErrors);
            }
        }
    }
    const markupCellDragManager = new class MarkupCellDragManager {
        constructor() {
            window.document.addEventListener('dragover', e => {
                // Allow dropping dragged markup cells
                e.preventDefault();
            });
            window.document.addEventListener('drop', e => {
                e.preventDefault();
                const drag = this.currentDrag;
                if (!drag) {
                    return;
                }
                this.currentDrag = undefined;
                postNotebookMessage('cell-drop', {
                    cellId: drag.cellId,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    dragOffsetY: e.clientY,
                });
            });
        }
        startDrag(e, cellId) {
            if (!e.dataTransfer) {
                return;
            }
            if (!currentOptions.dragAndDropEnabled) {
                return;
            }
            this.currentDrag = { cellId, clientY: e.clientY };
            const overlayZIndex = 9999;
            if (!this.dragOverlay) {
                this.dragOverlay = document.createElement('div');
                this.dragOverlay.style.position = 'absolute';
                this.dragOverlay.style.top = '0';
                this.dragOverlay.style.left = '0';
                this.dragOverlay.style.zIndex = `${overlayZIndex}`;
                this.dragOverlay.style.width = '100%';
                this.dragOverlay.style.height = '100%';
                this.dragOverlay.style.background = 'transparent';
                window.document.body.appendChild(this.dragOverlay);
            }
            e.target.style.zIndex = `${overlayZIndex + 1}`;
            e.target.classList.add('dragging');
            postNotebookMessage('cell-drag-start', {
                cellId: cellId,
                dragOffsetY: e.clientY,
            });
            // Continuously send updates while dragging instead of relying on `updateDrag`.
            // This lets us scroll the list based on drag position.
            const trySendDragUpdate = () => {
                if (this.currentDrag?.cellId !== cellId) {
                    return;
                }
                postNotebookMessage('cell-drag', {
                    cellId: cellId,
                    dragOffsetY: this.currentDrag.clientY,
                });
                window.requestAnimationFrame(trySendDragUpdate);
            };
            window.requestAnimationFrame(trySendDragUpdate);
        }
        updateDrag(e, cellId) {
            if (cellId !== this.currentDrag?.cellId) {
                this.currentDrag = undefined;
            }
            else {
                this.currentDrag = { cellId, clientY: e.clientY };
            }
        }
        endDrag(e, cellId) {
            this.currentDrag = undefined;
            e.target.classList.remove('dragging');
            postNotebookMessage('cell-drag-end', {
                cellId: cellId
            });
            if (this.dragOverlay) {
                this.dragOverlay.remove();
                this.dragOverlay = undefined;
            }
            e.target.style.zIndex = '';
        }
    }();
}
export function preloadsScriptStr(styleValues, options, renderOptions, renderers, preloads, isWorkspaceTrusted, nonce) {
    const ctx = {
        style: styleValues,
        options,
        renderOptions,
        rendererData: renderers,
        staticPreloadsData: preloads,
        isWorkspaceTrusted,
        nonce,
    };
    // TS will try compiling `import()` in webviewPreloads, so use a helper function instead
    // of using `import(...)` directly
    return `
		const __import = (x) => import(x);
		(${webviewPreloads})(
			JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(ctx))}"))
		)\n//# sourceURL=notebookWebviewPreloads.js\n`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1ByZWxvYWRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L3JlbmRlcmVycy93ZWJ2aWV3UHJlbG9hZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUF1RmhHLEtBQUssVUFBVSxlQUFlLENBQUMsR0FBbUI7SUFFakQsZ0VBQWdFO0lBRWhFLGtFQUFrRTtJQUNsRSxpRUFBaUU7SUFDakUsa0RBQWtEO0lBRWxELE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7SUFDdEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7SUFDdEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztJQUV0QyxTQUFTLG9CQUFvQjtRQUM1QixJQUFJLE9BQTRDLENBQUM7UUFDakQsSUFBSSxNQUE4QixDQUFDO1FBQ25DLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzNDLE9BQU8sR0FBRyxHQUFHLENBQUM7WUFDZCxNQUFNLEdBQUcsR0FBRyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU8sRUFBRSxDQUFDO0lBQ3hELENBQUM7SUFFRCxJQUFJLGNBQWMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO0lBQ2pDLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLGtCQUFrQixDQUFDO0lBQ2xELElB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