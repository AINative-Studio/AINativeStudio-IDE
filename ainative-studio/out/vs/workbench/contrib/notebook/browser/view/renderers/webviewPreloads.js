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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1ByZWxvYWRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9yZW5kZXJlcnMvd2Vidmlld1ByZWxvYWRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBdUZoRyxLQUFLLFVBQVUsZUFBZSxDQUFDLEdBQW1CO0lBRWpELGdFQUFnRTtJQUVoRSxrRUFBa0U7SUFDbEUsaUVBQWlFO0lBQ2pFLGtEQUFrRDtJQUVsRCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO0lBQ3RDLE1BQU0sUUFBUSxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwRCxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO0lBQ3RDLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7SUFFdEMsU0FBUyxvQkFBb0I7UUFDNUIsSUFBSSxPQUE0QyxDQUFDO1FBQ2pELElBQUksTUFBOEIsQ0FBQztRQUNuQyxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUMzQyxPQUFPLEdBQUcsR0FBRyxDQUFDO1lBQ2QsTUFBTSxHQUFHLEdBQUcsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBUSxFQUFFLE1BQU0sRUFBRSxNQUFPLEVBQUUsQ0FBQztJQUN4RCxDQUFDO0lBRUQsSUFBSSxjQUFjLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQztJQUNqQyxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztJQUNsRCxJ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