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
var ChatMarkdownContentPart_1;
import * as dom from '../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { findLast } from '../../../../../base/common/arraysFind.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { equalsIgnoreCase } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { ChatMarkdownDecorationsRenderer } from '../chatMarkdownDecorationsRenderer.js';
import { CodeBlockPart, localFileLanguageId, parseLocalFileData } from '../codeBlockPart.js';
import '../media/chatCodeBlockPill.css';
import { ResourcePool } from './chatCollections.js';
const $ = dom.$;
let ChatMarkdownContentPart = class ChatMarkdownContentPart extends Disposable {
    static { ChatMarkdownContentPart_1 = this; }
    static { this.idPool = 0; }
    constructor(markdown, context, editorPool, fillInIncompleteTokens = false, codeBlockStartIndex = 0, renderer, currentWidth, codeBlockModelCollection, rendererOptions, contextKeyService, textModelService, instantiationService) {
        super();
        this.markdown = markdown;
        this.editorPool = editorPool;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.rendererOptions = rendererOptions;
        this.textModelService = textModelService;
        this.instantiationService = instantiationService;
        this.codeblocksPartId = String(++ChatMarkdownContentPart_1.idPool);
        this.allRefs = [];
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.codeblocks = [];
        const element = context.element;
        const inUndoStop = findLast(context.content, e => e.kind === 'undoStop', context.contentIndex)?.id;
        // We release editors in order so that it's more likely that the same editor will be assigned if this element is re-rendered right away, like it often is during progressive rendering
        const orderedDisposablesList = [];
        // Need to track the index of the codeblock within the response so it can have a unique ID,
        // and within this part to find it within the codeblocks array
        let globalCodeBlockIndexStart = codeBlockStartIndex;
        let thisPartCodeBlockIndexStart = 0;
        // Don't set to 'false' for responses, respect defaults
        const markedOpts = isRequestVM(element) ? {
            gfm: true,
            breaks: true,
        } : undefined;
        const result = this._register(renderer.render(markdown.content, {
            fillInIncompleteTokens,
            codeBlockRendererSync: (languageId, text, raw) => {
                const isCodeBlockComplete = !isResponseVM(context.element) || context.element.isComplete || !raw || codeblockHasClosingBackticks(raw);
                if ((!text || (text.startsWith('<vscode_codeblock_uri') && !text.includes('\n'))) && !isCodeBlockComplete) {
                    const hideEmptyCodeblock = $('div');
                    hideEmptyCodeblock.style.display = 'none';
                    return hideEmptyCodeblock;
                }
                const globalIndex = globalCodeBlockIndexStart++;
                const thisPartIndex = thisPartCodeBlockIndexStart++;
                let textModel;
                let range;
                let vulns;
                let codeblockEntry;
                if (equalsIgnoreCase(languageId, localFileLanguageId)) {
                    try {
                        const parsedBody = parseLocalFileData(text);
                        range = parsedBody.range && Range.lift(parsedBody.range);
                        textModel = this.textModelService.createModelReference(parsedBody.uri).then(ref => ref.object.textEditorModel);
                    }
                    catch (e) {
                        return $('div');
                    }
                }
                else {
                    const sessionId = isResponseVM(element) || isRequestVM(element) ? element.sessionId : '';
                    const modelEntry = this.codeBlockModelCollection.getOrCreate(sessionId, element, globalIndex);
                    const fastUpdateModelEntry = this.codeBlockModelCollection.updateSync(sessionId, element, globalIndex, { text, languageId, isComplete: isCodeBlockComplete });
                    vulns = modelEntry.vulns;
                    codeblockEntry = fastUpdateModelEntry;
                    textModel = modelEntry.model;
                }
                const hideToolbar = isResponseVM(element) && element.errorDetails?.responseIsFiltered;
                const renderOptions = {
                    ...this.rendererOptions.codeBlockRenderOptions,
                };
                if (hideToolbar !== undefined) {
                    renderOptions.hideToolbar = hideToolbar;
                }
                const codeBlockInfo = { languageId, textModel, codeBlockIndex: globalIndex, codeBlockPartIndex: thisPartIndex, element, range, parentContextKeyService: contextKeyService, vulns, codemapperUri: codeblockEntry?.codemapperUri, renderOptions };
                if (element.isCompleteAddedRequest || !codeblockEntry?.codemapperUri || !codeblockEntry.isEdit) {
                    const ref = this.renderCodeBlock(codeBlockInfo, text, isCodeBlockComplete, currentWidth);
                    this.allRefs.push(ref);
                    // Attach this after updating text/layout of the editor, so it should only be fired when the size updates later (horizontal scrollbar, wrapping)
                    // not during a renderElement OR a progressive render (when we will be firing this event anyway at the end of the render)
                    this._register(ref.object.onDidChangeContentHeight(() => this._onDidChangeHeight.fire()));
                    const ownerMarkdownPartId = this.codeblocksPartId;
                    const info = new class {
                        constructor() {
                            this.ownerMarkdownPartId = ownerMarkdownPartId;
                            this.codeBlockIndex = globalIndex;
                            this.elementId = element.id;
                            this.isStreaming = false;
                            this.codemapperUri = undefined; // will be set async
                            this.uriPromise = textModel.then(model => model.uri);
                        }
                        get uri() {
                            // here we must do a getter because the ref.object is rendered
                            // async and the uri might be undefined when it's read immediately
                            return ref.object.uri;
                        }
                        focus() {
                            ref.object.focus();
                        }
                    }();
                    this.codeblocks.push(info);
                    orderedDisposablesList.push(ref);
                    return ref.object.element;
                }
                else {
                    const requestId = isRequestVM(element) ? element.id : element.requestId;
                    const ref = this.renderCodeBlockPill(element.sessionId, requestId, inUndoStop, codeBlockInfo.codemapperUri, !isCodeBlockComplete);
                    if (isResponseVM(codeBlockInfo.element)) {
                        // TODO@joyceerhl: remove this code when we change the codeblockUri API to make the URI available synchronously
                        this.codeBlockModelCollection.update(codeBlockInfo.element.sessionId, codeBlockInfo.element, codeBlockInfo.codeBlockIndex, { text, languageId: codeBlockInfo.languageId, isComplete: isCodeBlockComplete }).then((e) => {
                            // Update the existing object's codemapperUri
                            this.codeblocks[codeBlockInfo.codeBlockPartIndex].codemapperUri = e.codemapperUri;
                            this._onDidChangeHeight.fire();
                        });
                    }
                    this.allRefs.push(ref);
                    const ownerMarkdownPartId = this.codeblocksPartId;
                    const info = new class {
                        constructor() {
                            this.ownerMarkdownPartId = ownerMarkdownPartId;
                            this.codeBlockIndex = globalIndex;
                            this.elementId = element.id;
                            this.isStreaming = !isCodeBlockComplete;
                            this.codemapperUri = codeblockEntry?.codemapperUri;
                            this.uriPromise = Promise.resolve(undefined);
                        }
                        get uri() {
                            return undefined;
                        }
                        focus() {
                            return ref.object.element.focus();
                        }
                    }();
                    this.codeblocks.push(info);
                    orderedDisposablesList.push(ref);
                    return ref.object.element;
                }
            },
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        }, markedOpts));
        const markdownDecorationsRenderer = instantiationService.createInstance(ChatMarkdownDecorationsRenderer);
        this._register(markdownDecorationsRenderer.walkTreeAndAnnotateReferenceLinks(markdown, result.element));
        orderedDisposablesList.reverse().forEach(d => this._register(d));
        this.domNode = result.element;
    }
    renderCodeBlockPill(sessionId, requestId, inUndoStop, codemapperUri, isStreaming) {
        const codeBlock = this.instantiationService.createInstance(CollapsedCodeBlock, sessionId, requestId, inUndoStop);
        if (codemapperUri) {
            codeBlock.render(codemapperUri, isStreaming);
        }
        return {
            object: codeBlock,
            isStale: () => false,
            dispose: () => codeBlock.dispose()
        };
    }
    renderCodeBlock(data, text, isComplete, currentWidth) {
        const ref = this.editorPool.get();
        const editorInfo = ref.object;
        if (isResponseVM(data.element)) {
            this.codeBlockModelCollection.update(data.element.sessionId, data.element, data.codeBlockIndex, { text, languageId: data.languageId, isComplete }).then((e) => {
                // Update the existing object's codemapperUri
                this.codeblocks[data.codeBlockPartIndex].codemapperUri = e.codemapperUri;
                this._onDidChangeHeight.fire();
            });
        }
        editorInfo.render(data, currentWidth);
        return ref;
    }
    hasSameContent(other) {
        return other.kind === 'markdownContent' && !!(other.content.value === this.markdown.content.value
            || this.codeblocks.at(-1)?.isStreaming && this.codeblocks.at(-1)?.codemapperUri !== undefined && other.content.value.lastIndexOf('```') === this.markdown.content.value.lastIndexOf('```'));
    }
    layout(width) {
        this.allRefs.forEach((ref, index) => {
            if (ref.object instanceof CodeBlockPart) {
                ref.object.layout(width);
            }
            else if (ref.object instanceof CollapsedCodeBlock) {
                const codeblockModel = this.codeblocks[index];
                if (codeblockModel.codemapperUri && ref.object.uri?.toString() !== codeblockModel.codemapperUri.toString()) {
                    ref.object.render(codeblockModel.codemapperUri, codeblockModel.isStreaming);
                }
            }
        });
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatMarkdownContentPart = ChatMarkdownContentPart_1 = __decorate([
    __param(9, IContextKeyService),
    __param(10, ITextModelService),
    __param(11, IInstantiationService)
], ChatMarkdownContentPart);
export { ChatMarkdownContentPart };
let EditorPool = class EditorPool extends Disposable {
    inUse() {
        return this._pool.inUse;
    }
    constructor(options, delegate, overflowWidgetsDomNode, instantiationService) {
        super();
        this._pool = this._register(new ResourcePool(() => {
            return instantiationService.createInstance(CodeBlockPart, options, MenuId.ChatCodeBlock, delegate, overflowWidgetsDomNode);
        }));
    }
    get() {
        const codeBlock = this._pool.get();
        let stale = false;
        return {
            object: codeBlock,
            isStale: () => stale,
            dispose: () => {
                codeBlock.reset();
                stale = true;
                this._pool.release(codeBlock);
            }
        };
    }
};
EditorPool = __decorate([
    __param(3, IInstantiationService)
], EditorPool);
export { EditorPool };
function codeblockHasClosingBackticks(str) {
    str = str.trim();
    return !!str.match(/\n```+$/);
}
let CollapsedCodeBlock = class CollapsedCodeBlock extends Disposable {
    get uri() {
        return this._uri;
    }
    constructor(sessionId, requestId, inUndoStop, labelService, editorService, modelService, languageService, contextMenuService, contextKeyService, menuService, hoverService, chatService) {
        super();
        this.sessionId = sessionId;
        this.requestId = requestId;
        this.inUndoStop = inUndoStop;
        this.labelService = labelService;
        this.editorService = editorService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.hoverService = hoverService;
        this.chatService = chatService;
        this.hover = this._register(new MutableDisposable());
        this._progressStore = this._store.add(new DisposableStore());
        this.element = $('.chat-codeblock-pill-widget');
        this.element.classList.add('show-file-icons');
        this._register(dom.addDisposableListener(this.element, 'click', async () => {
            if (this._currentDiff) {
                this.editorService.openEditor({
                    original: { resource: this._currentDiff.originalURI },
                    modified: { resource: this._currentDiff.modifiedURI },
                    options: { transient: true },
                });
            }
            else if (this.uri) {
                this.editorService.openEditor({ resource: this.uri });
            }
        }));
        this._register(dom.addDisposableListener(this.element, dom.EventType.CONTEXT_MENU, domEvent => {
            const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
            dom.EventHelper.stop(domEvent, true);
            this.contextMenuService.showContextMenu({
                contextKeyService: this.contextKeyService,
                getAnchor: () => event,
                getActions: () => {
                    const menu = this.menuService.getMenuActions(MenuId.ChatEditingCodeBlockContext, this.contextKeyService, { arg: { sessionId, requestId, uri: this.uri, stopId: inUndoStop } });
                    return getFlatContextMenuActions(menu);
                },
            });
        }));
    }
    render(uri, isStreaming) {
        this._progressStore.clear();
        this._uri = uri;
        const session = this.chatService.getSession(this.sessionId);
        const iconText = this.labelService.getUriBasenameLabel(uri);
        let editSession = session?.editingSessionObs?.promiseResult.get()?.data;
        let modifiedEntry = editSession?.getEntry(uri);
        let modifiedByResponse = modifiedEntry?.isCurrentlyBeingModifiedBy.get();
        const isComplete = !modifiedByResponse || modifiedByResponse.requestId !== this.requestId;
        let iconClasses = [];
        if (isStreaming || !isComplete) {
            const codicon = ThemeIcon.modify(Codicon.loading, 'spin');
            iconClasses = ThemeIcon.asClassNameArray(codicon);
        }
        else {
            const fileKind = uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
            iconClasses = getIconClasses(this.modelService, this.languageService, uri, fileKind);
        }
        const iconEl = dom.$('span.icon');
        iconEl.classList.add(...iconClasses);
        const children = [dom.$('span.icon-label', {}, iconText)];
        const labelDetail = dom.$('span.label-detail', {}, '');
        children.push(labelDetail);
        if (isStreaming) {
            labelDetail.textContent = localize('chat.codeblock.generating', "Generating edits...");
        }
        this.element.replaceChildren(iconEl, ...children);
        this.updateTooltip(this.labelService.getUriLabel(uri, { relative: false }));
        const renderDiff = (changes) => {
            const labelAdded = this.element.querySelector('.label-added') ?? this.element.appendChild(dom.$('span.label-added'));
            const labelRemoved = this.element.querySelector('.label-removed') ?? this.element.appendChild(dom.$('span.label-removed'));
            if (changes && !changes?.identical && !changes?.quitEarly) {
                this._currentDiff = changes;
                labelAdded.textContent = `+${changes.added}`;
                labelRemoved.textContent = `-${changes.removed}`;
                const insertionsFragment = changes.added === 1 ? localize('chat.codeblock.insertions.one', "1 insertion") : localize('chat.codeblock.insertions', "{0} insertions", changes.added);
                const deletionsFragment = changes.removed === 1 ? localize('chat.codeblock.deletions.one', "1 deletion") : localize('chat.codeblock.deletions', "{0} deletions", changes.removed);
                const summary = localize('summary', 'Edited {0}, {1}, {2}', iconText, insertionsFragment, deletionsFragment);
                this.element.ariaLabel = summary;
                this.updateTooltip(summary);
            }
        };
        let diffBetweenStops;
        // Show a percentage progress that is driven by the rewrite
        this._progressStore.add(autorun(r => {
            if (!editSession) {
                editSession = session?.editingSessionObs?.promiseResult.read(r)?.data;
                modifiedEntry = editSession?.getEntry(uri);
            }
            modifiedByResponse = modifiedEntry?.isCurrentlyBeingModifiedBy.read(r);
            const isComplete = !modifiedByResponse || modifiedByResponse.requestId !== this.requestId;
            const rewriteRatio = modifiedEntry?.rewriteRatio.read(r);
            if (!isStreaming && !isComplete) {
                const value = rewriteRatio;
                labelDetail.textContent = value === 0 || !value ? localize('chat.codeblock.generating', "Generating edits...") : localize('chat.codeblock.applyingPercentage', "Applying edits ({0}%)...", Math.round(value * 100));
            }
            else if (!isStreaming && isComplete) {
                iconEl.classList.remove(...iconClasses);
                const fileKind = uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
                iconEl.classList.add(...getIconClasses(this.modelService, this.languageService, uri, fileKind));
                labelDetail.textContent = '';
            }
            if (!diffBetweenStops) {
                diffBetweenStops = modifiedEntry && editSession
                    ? editSession.getEntryDiffBetweenStops(modifiedEntry.modifiedURI, this.requestId, this.inUndoStop)
                    : undefined;
            }
            if (!isStreaming && isComplete && diffBetweenStops) {
                renderDiff(diffBetweenStops.read(r));
            }
        }));
    }
    updateTooltip(tooltip) {
        this.tooltip = tooltip;
        if (!this.hover.value) {
            this.hover.value = this.hoverService.setupDelayedHover(this.element, () => ({
                content: this.tooltip,
                appearance: { compact: true, showPointer: true },
                position: { hoverPosition: 2 /* HoverPosition.BELOW */ },
                persistence: { hideOnKeyDown: true },
            }));
        }
    }
};
CollapsedCodeBlock = __decorate([
    __param(3, ILabelService),
    __param(4, IEditorService),
    __param(5, IModelService),
    __param(6, ILanguageService),
    __param(7, IContextMenuService),
    __param(8, IContextKeyService),
    __param(9, IMenuService),
    __param(10, IHoverService),
    __param(11, IChatService)
], CollapsedCodeBlock);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdE1hcmtkb3duQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0SCxPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sMENBQTBDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdG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