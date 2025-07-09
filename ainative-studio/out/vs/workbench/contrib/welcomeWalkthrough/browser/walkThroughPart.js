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
var WalkThroughPart_1;
import '../common/walkThroughUtils.js';
import './media/walkThroughPart.css';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { EventType as TouchEventType, Gesture } from '../../../../base/browser/touch.js';
import * as strings from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { dispose, toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { WalkThroughInput } from './walkThroughInput.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { localize } from '../../../../nls.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { RawContextKey, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isObject } from '../../../../base/common/types.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { UILabelProvider } from '../../../../base/common/keybindingLabels.js';
import { OS } from '../../../../base/common/platform.js';
import { deepClone } from '../../../../base/common/objects.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { addDisposableListener, isHTMLAnchorElement, isHTMLButtonElement, isHTMLElement, safeInnerHtml, size } from '../../../../base/browser/dom.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
export const WALK_THROUGH_FOCUS = new RawContextKey('interactivePlaygroundFocus', false);
const UNBOUND_COMMAND = localize('walkThrough.unboundCommand', "unbound");
const WALK_THROUGH_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'walkThroughEditorViewState';
let WalkThroughPart = class WalkThroughPart extends EditorPane {
    static { WalkThroughPart_1 = this; }
    static { this.ID = 'workbench.editor.walkThroughPart'; }
    constructor(group, telemetryService, themeService, textResourceConfigurationService, instantiationService, openerService, keybindingService, storageService, contextKeyService, configurationService, notificationService, extensionService, editorGroupService) {
        super(WalkThroughPart_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.keybindingService = keybindingService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.disposables = new DisposableStore();
        this.contentDisposables = [];
        this.editorFocus = WALK_THROUGH_FOCUS.bindTo(this.contextKeyService);
        this.editorMemento = this.getEditorMemento(editorGroupService, textResourceConfigurationService, WALK_THROUGH_EDITOR_VIEW_STATE_PREFERENCE_KEY);
    }
    createEditor(container) {
        this.content = document.createElement('div');
        this.content.classList.add('welcomePageFocusElement');
        this.content.tabIndex = 0;
        this.content.style.outlineStyle = 'none';
        this.scrollbar = new DomScrollableElement(this.content, {
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            vertical: 1 /* ScrollbarVisibility.Auto */
        });
        this.disposables.add(this.scrollbar);
        container.appendChild(this.scrollbar.getDomNode());
        this.registerFocusHandlers();
        this.registerClickHandler();
        this.disposables.add(this.scrollbar.onScroll(e => this.updatedScrollPosition()));
    }
    updatedScrollPosition() {
        const scrollDimensions = this.scrollbar.getScrollDimensions();
        const scrollPosition = this.scrollbar.getScrollPosition();
        const scrollHeight = scrollDimensions.scrollHeight;
        if (scrollHeight && this.input instanceof WalkThroughInput) {
            const scrollTop = scrollPosition.scrollTop;
            const height = scrollDimensions.height;
            this.input.relativeScrollPosition(scrollTop / scrollHeight, (scrollTop + height) / scrollHeight);
        }
    }
    onTouchChange(event) {
        event.preventDefault();
        event.stopPropagation();
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - event.translationY });
    }
    addEventListener(element, type, listener, useCapture) {
        element.addEventListener(type, listener, useCapture);
        return toDisposable(() => { element.removeEventListener(type, listener, useCapture); });
    }
    registerFocusHandlers() {
        this.disposables.add(this.addEventListener(this.content, 'mousedown', e => {
            this.focus();
        }));
        this.disposables.add(this.addEventListener(this.content, 'focus', e => {
            this.editorFocus.set(true);
        }));
        this.disposables.add(this.addEventListener(this.content, 'blur', e => {
            this.editorFocus.reset();
        }));
        this.disposables.add(this.addEventListener(this.content, 'focusin', (e) => {
            // Work around scrolling as side-effect of setting focus on the offscreen zone widget (#18929)
            if (isHTMLElement(e.target) && e.target.classList.contains('zone-widget-container')) {
                const scrollPosition = this.scrollbar.getScrollPosition();
                this.content.scrollTop = scrollPosition.scrollTop;
                this.content.scrollLeft = scrollPosition.scrollLeft;
            }
            if (isHTMLElement(e.target)) {
                this.lastFocus = e.target;
            }
        }));
    }
    registerClickHandler() {
        this.content.addEventListener('click', event => {
            for (let node = event.target; node; node = node.parentNode) {
                if (isHTMLAnchorElement(node) && node.href) {
                    const baseElement = node.ownerDocument.getElementsByTagName('base')[0] || this.window.location;
                    if (baseElement && node.href.indexOf(baseElement.href) >= 0 && node.hash) {
                        const scrollTarget = this.content.querySelector(node.hash);
                        const innerContent = this.content.firstElementChild;
                        if (scrollTarget && innerContent) {
                            const targetTop = scrollTarget.getBoundingClientRect().top - 20;
                            const containerTop = innerContent.getBoundingClientRect().top;
                            this.scrollbar.setScrollPosition({ scrollTop: targetTop - containerTop });
                        }
                    }
                    else {
                        this.open(URI.parse(node.href));
                    }
                    event.preventDefault();
                    break;
                }
                else if (isHTMLButtonElement(node)) {
                    const href = node.getAttribute('data-href');
                    if (href) {
                        this.open(URI.parse(href));
                    }
                    break;
                }
                else if (node === event.currentTarget) {
                    break;
                }
            }
        });
    }
    open(uri) {
        if (uri.scheme === 'command' && uri.path === 'git.clone' && !CommandsRegistry.getCommand('git.clone')) {
            this.notificationService.info(localize('walkThrough.gitNotFound', "It looks like Git is not installed on your system."));
            return;
        }
        this.openerService.open(this.addFrom(uri), { allowCommands: true });
    }
    addFrom(uri) {
        if (uri.scheme !== 'command' || !(this.input instanceof WalkThroughInput)) {
            return uri;
        }
        const query = uri.query ? JSON.parse(uri.query) : {};
        query.from = this.input.getTelemetryFrom();
        return uri.with({ query: JSON.stringify(query) });
    }
    layout(dimension) {
        this.size = dimension;
        size(this.content, dimension.width, dimension.height);
        this.updateSizeClasses();
        this.contentDisposables.forEach(disposable => {
            if (disposable instanceof CodeEditorWidget) {
                disposable.layout();
            }
        });
        const walkthroughInput = this.input instanceof WalkThroughInput && this.input;
        if (walkthroughInput && walkthroughInput.layout) {
            walkthroughInput.layout(dimension);
        }
        this.scrollbar.scanDomNode();
    }
    updateSizeClasses() {
        const innerContent = this.content.firstElementChild;
        if (this.size && innerContent) {
            innerContent.classList.toggle('max-height-685px', this.size.height <= 685);
        }
    }
    focus() {
        super.focus();
        let active = this.content.ownerDocument.activeElement;
        while (active && active !== this.content) {
            active = active.parentElement;
        }
        if (!active) {
            (this.lastFocus || this.content).focus();
        }
        this.editorFocus.set(true);
    }
    arrowUp() {
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - this.getArrowScrollHeight() });
    }
    arrowDown() {
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop + this.getArrowScrollHeight() });
    }
    getArrowScrollHeight() {
        let fontSize = this.configurationService.getValue('editor.fontSize');
        if (typeof fontSize !== 'number' || fontSize < 1) {
            fontSize = 12;
        }
        return 3 * fontSize;
    }
    pageUp() {
        const scrollDimensions = this.scrollbar.getScrollDimensions();
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - scrollDimensions.height });
    }
    pageDown() {
        const scrollDimensions = this.scrollbar.getScrollDimensions();
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop + scrollDimensions.height });
    }
    setInput(input, options, context, token) {
        const store = new DisposableStore();
        this.contentDisposables.push(store);
        this.content.innerText = '';
        return super.setInput(input, options, context, token)
            .then(async () => {
            if (input.resource.path.endsWith('.md')) {
                await this.extensionService.whenInstalledExtensionsRegistered();
            }
            return input.resolve();
        })
            .then(model => {
            if (token.isCancellationRequested) {
                return;
            }
            const content = model.main;
            if (!input.resource.path.endsWith('.md')) {
                safeInnerHtml(this.content, content, { ALLOW_UNKNOWN_PROTOCOLS: true });
                this.updateSizeClasses();
                this.decorateContent();
                this.contentDisposables.push(this.keybindingService.onDidUpdateKeybindings(() => this.decorateContent()));
                input.onReady?.(this.content.firstElementChild, store);
                this.scrollbar.scanDomNode();
                this.loadTextEditorViewState(input);
                this.updatedScrollPosition();
                return;
            }
            const innerContent = document.createElement('div');
            innerContent.classList.add('walkThroughContent'); // only for markdown files
            const markdown = this.expandMacros(content);
            safeInnerHtml(innerContent, markdown, { ALLOW_UNKNOWN_PROTOCOLS: true });
            this.content.appendChild(innerContent);
            model.snippets.forEach((snippet, i) => {
                const model = snippet.textEditorModel;
                if (!model) {
                    return;
                }
                const id = `snippet-${model.uri.fragment}`;
                const div = innerContent.querySelector(`#${id.replace(/[\\.]/g, '\\$&')}`);
                const options = this.getEditorOptions(model.getLanguageId());
                const telemetryData = {
                    target: this.input instanceof WalkThroughInput ? this.input.getTelemetryFrom() : undefined,
                    snippet: i
                };
                const editor = this.instantiationService.createInstance(CodeEditorWidget, div, options, {
                    telemetryData: telemetryData
                });
                editor.setModel(model);
                this.contentDisposables.push(editor);
                const updateHeight = (initial) => {
                    const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                    const height = `${Math.max(model.getLineCount() + 1, 4) * lineHeight}px`;
                    if (div.style.height !== height) {
                        div.style.height = height;
                        editor.layout();
                        if (!initial) {
                            this.scrollbar.scanDomNode();
                        }
                    }
                };
                updateHeight(true);
                this.contentDisposables.push(editor.onDidChangeModelContent(() => updateHeight(false)));
                this.contentDisposables.push(editor.onDidChangeCursorPosition(e => {
                    const innerContent = this.content.firstElementChild;
                    if (innerContent) {
                        const targetTop = div.getBoundingClientRect().top;
                        const containerTop = innerContent.getBoundingClientRect().top;
                        const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                        const lineTop = (targetTop + (e.position.lineNumber - 1) * lineHeight) - containerTop;
                        const lineBottom = lineTop + lineHeight;
                        const scrollDimensions = this.scrollbar.getScrollDimensions();
                        const scrollPosition = this.scrollbar.getScrollPosition();
                        const scrollTop = scrollPosition.scrollTop;
                        const height = scrollDimensions.height;
                        if (scrollTop > lineTop) {
                            this.scrollbar.setScrollPosition({ scrollTop: lineTop });
                        }
                        else if (scrollTop < lineBottom - height) {
                            this.scrollbar.setScrollPosition({ scrollTop: lineBottom - height });
                        }
                    }
                }));
                this.contentDisposables.push(this.configurationService.onDidChangeConfiguration(e => {
                    if (e.affectsConfiguration('editor') && snippet.textEditorModel) {
                        editor.updateOptions(this.getEditorOptions(snippet.textEditorModel.getLanguageId()));
                    }
                }));
            });
            this.updateSizeClasses();
            this.multiCursorModifier();
            this.contentDisposables.push(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('editor.multiCursorModifier')) {
                    this.multiCursorModifier();
                }
            }));
            input.onReady?.(innerContent, store);
            this.scrollbar.scanDomNode();
            this.loadTextEditorViewState(input);
            this.updatedScrollPosition();
            this.contentDisposables.push(Gesture.addTarget(innerContent));
            this.contentDisposables.push(addDisposableListener(innerContent, TouchEventType.Change, e => this.onTouchChange(e)));
        });
    }
    getEditorOptions(language) {
        const config = deepClone(this.configurationService.getValue('editor', { overrideIdentifier: language }));
        return {
            ...isObject(config) ? config : Object.create(null),
            scrollBeyondLastLine: false,
            scrollbar: {
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: false
            },
            overviewRulerLanes: 3,
            fixedOverflowWidgets: false,
            lineNumbersMinChars: 1,
            minimap: { enabled: false },
        };
    }
    expandMacros(input) {
        return input.replace(/kb\(([a-z.\d\-]+)\)/gi, (match, kb) => {
            const keybinding = this.keybindingService.lookupKeybinding(kb);
            const shortcut = keybinding ? keybinding.getLabel() || '' : UNBOUND_COMMAND;
            return `<span class="shortcut">${strings.escape(shortcut)}</span>`;
        });
    }
    decorateContent() {
        const keys = this.content.querySelectorAll('.shortcut[data-command]');
        Array.prototype.forEach.call(keys, (key) => {
            const command = key.getAttribute('data-command');
            const keybinding = command && this.keybindingService.lookupKeybinding(command);
            const label = keybinding ? keybinding.getLabel() || '' : UNBOUND_COMMAND;
            while (key.firstChild) {
                key.firstChild.remove();
            }
            key.appendChild(document.createTextNode(label));
        });
        const ifkeys = this.content.querySelectorAll('.if_shortcut[data-command]');
        Array.prototype.forEach.call(ifkeys, (key) => {
            const command = key.getAttribute('data-command');
            const keybinding = command && this.keybindingService.lookupKeybinding(command);
            key.style.display = !keybinding ? 'none' : '';
        });
    }
    multiCursorModifier() {
        const labels = UILabelProvider.modifierLabels[OS];
        const value = this.configurationService.getValue('editor.multiCursorModifier');
        const modifier = labels[value === 'ctrlCmd' ? (OS === 2 /* OperatingSystem.Macintosh */ ? 'metaKey' : 'ctrlKey') : 'altKey'];
        const keys = this.content.querySelectorAll('.multi-cursor-modifier');
        Array.prototype.forEach.call(keys, (key) => {
            while (key.firstChild) {
                key.firstChild.remove();
            }
            key.appendChild(document.createTextNode(modifier));
        });
    }
    saveTextEditorViewState(input) {
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.editorMemento.saveEditorState(this.group, input, {
            viewState: {
                scrollTop: scrollPosition.scrollTop,
                scrollLeft: scrollPosition.scrollLeft
            }
        });
    }
    loadTextEditorViewState(input) {
        const state = this.editorMemento.loadEditorState(this.group, input);
        if (state) {
            this.scrollbar.setScrollPosition(state.viewState);
        }
    }
    clearInput() {
        if (this.input instanceof WalkThroughInput) {
            this.saveTextEditorViewState(this.input);
        }
        this.contentDisposables = dispose(this.contentDisposables);
        super.clearInput();
    }
    saveState() {
        if (this.input instanceof WalkThroughInput) {
            this.saveTextEditorViewState(this.input);
        }
        super.saveState();
    }
    dispose() {
        this.editorFocus.reset();
        this.contentDisposables = dispose(this.contentDisposables);
        this.disposables.dispose();
        super.dispose();
    }
};
WalkThroughPart = WalkThroughPart_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, ITextResourceConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IOpenerService),
    __param(6, IKeybindingService),
    __param(7, IStorageService),
    __param(8, IContextKeyService),
    __param(9, IConfigurationService),
    __param(10, INotificationService),
    __param(11, IExtensionService),
    __param(12, IEditorGroupsService)
], WalkThroughPart);
export { WalkThroughPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVXYWxrdGhyb3VnaC9icm93c2VyL3dhbGtUaHJvdWdoUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywrQkFBK0IsQ0FBQztBQUN2QyxPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFnQixPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV2RyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQWUsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUzRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxD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