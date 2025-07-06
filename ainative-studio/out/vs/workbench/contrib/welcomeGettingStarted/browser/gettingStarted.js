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
var GettingStartedPage_1;
import { $, addDisposableListener, append, clearNode, reset } from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { coalesce, equals } from '../../../../base/common/arrays.js';
import { Delayer, Throttler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { splitRecentLabel } from '../../../../base/common/labels.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { isMacintosh, OS } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import './media/gettingStarted.css';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService, firstSessionDateStorageKey } from '../../../../platform/telemetry/common/telemetry.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { defaultButtonStyles, defaultKeybindingLabelStyles, defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspacesService, isRecentFolder, isRecentWorkspace } from '../../../../platform/workspaces/common/workspaces.js';
import { OpenRecentAction } from '../../../browser/actions/windowActions.js';
import { OpenFileFolderAction, OpenFolderAction, OpenFolderViaWorkspaceAction } from '../../../browser/actions/workspaceActions.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import './gettingStartedColors.js';
import { GettingStartedDetailsRenderer } from './gettingStartedDetailsRenderer.js';
import { gettingStartedCheckedCodicon, gettingStartedUncheckedCodicon } from './gettingStartedIcons.js';
import { GettingStartedInput } from './gettingStartedInput.js';
import { IWalkthroughsService, hiddenEntriesConfigurationKey, parseDescription } from './gettingStartedService.js';
import { restoreWalkthroughsConfigurationKey } from './startupPage.js';
import { startEntries } from '../common/gettingStartedContent.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { GettingStartedIndexList } from './gettingStartedList.js';
import { AccessibleViewAction } from '../../accessibility/browser/accessibleViewActions.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
const SLIDE_TRANSITION_TIME_MS = 250;
const configurationKey = 'workbench.startupEditor';
export const allWalkthroughsHiddenContext = new RawContextKey('allWalkthroughsHidden', false);
export const inWelcomeContext = new RawContextKey('inWelcome', false);
const parsedStartEntries = startEntries.map((e, i) => ({
    command: e.content.command,
    description: e.description,
    icon: { type: 'icon', icon: e.icon },
    id: e.id,
    order: i,
    title: e.title,
    when: ContextKeyExpr.deserialize(e.when) ?? ContextKeyExpr.true()
}));
const REDUCED_MOTION_KEY = 'workbench.welcomePage.preferReducedMotion';
let GettingStartedPage = class GettingStartedPage extends EditorPane {
    static { GettingStartedPage_1 = this; }
    static { this.ID = 'gettingStartedPage'; }
    constructor(group, commandService, productService, keybindingService, gettingStartedService, configurationService, telemetryService, languageService, fileService, openerService, themeService, storageService, extensionService, instantiationService, notificationService, groupsService, contextService, quickInputService, workspacesService, labelService, hostService, webviewService, workspaceContextService, accessibilityService) {
        super(GettingStartedPage_1.ID, group, telemetryService, themeService, storageService);
        this.commandService = commandService;
        this.productService = productService;
        this.keybindingService = keybindingService;
        this.gettingStartedService = gettingStartedService;
        this.configurationService = configurationService;
        this.languageService = languageService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.themeService = themeService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.groupsService = groupsService;
        this.quickInputService = quickInputService;
        this.workspacesService = workspacesService;
        this.labelService = labelService;
        this.hostService = hostService;
        this.webviewService = webviewService;
        this.workspaceContextService = workspaceContextService;
        this.accessibilityService = accessibilityService;
        this.inProgressScroll = Promise.resolve();
        this.dispatchListeners = new DisposableStore();
        this.stepDisposables = new DisposableStore();
        this.detailsPageDisposables = new DisposableStore();
        this.mediaDisposables = new DisposableStore();
        this.buildSlideThrottle = new Throttler();
        this.hasScrolledToFirstCategory = false;
        this.showFeaturedWalkthrough = true;
        this.currentMediaComponent = undefined;
        this.currentMediaType = undefined;
        this.container = $('.gettingStartedContainer', {
            role: 'document',
            tabindex: 0,
            'aria-label': localize('welcomeAriaLabel', "Overview of how to get up to speed with your editor.")
        });
        this.stepMediaComponent = $('.getting-started-media');
        this.stepMediaComponent.id = generateUuid();
        this.categoriesSlideDisposables = this._register(new DisposableStore());
        this.detailsRenderer = new GettingStartedDetailsRenderer(this.fileService, this.notificationService, this.extensionService, this.languageService);
        this.contextService = this._register(contextService.createScoped(this.container));
        inWelcomeContext.bindTo(this.contextService).set(true);
        this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
        this._register(this.dispatchListeners);
        this.buildSlideThrottle = new Throttler();
        const rerender = () => {
            this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
            if (this.currentWalkthrough) {
                const existingSteps = this.currentWalkthrough.steps.map(step => step.id);
                const newCategory = this.gettingStartedCategories.find(category => this.currentWalkthrough?.id === category.id);
                if (newCategory) {
                    const newSteps = newCategory.steps.map(step => step.id);
                    if (!equals(newSteps, existingSteps)) {
                        this.buildSlideThrottle.queue(() => this.buildCategoriesSlide());
                    }
                }
            }
            else {
                this.buildSlideThrottle.queue(() => this.buildCategoriesSlide());
            }
        };
        this._register(this.gettingStartedService.onDidAddWalkthrough(rerender));
        this._register(this.gettingStartedService.onDidRemoveWalkthrough(rerender));
        this.recentlyOpened = this.workspacesService.getRecentlyOpened();
        this._register(workspacesService.onDidChangeRecentlyOpened(() => {
            this.recentlyOpened = workspacesService.getRecentlyOpened();
            rerender();
        }));
        this._register(this.gettingStartedService.onDidChangeWalkthrough(category => {
            const ourCategory = this.gettingStartedCategories.find(c => c.id === category.id);
            if (!ourCategory) {
                return;
            }
            ourCategory.title = category.title;
            ourCategory.description = category.description;
            this.container.querySelectorAll(`[x-category-title-for="${category.id}"]`).forEach(step => step.innerText = ourCategory.title);
            this.container.querySelectorAll(`[x-category-description-for="${category.id}"]`).forEach(step => step.innerText = ourCategory.description);
        }));
        this._register(this.gettingStartedService.onDidProgressStep(step => {
            const category = this.gettingStartedCategories.find(category => category.id === step.category);
            if (!category) {
                throw Error('Could not find category with ID: ' + step.category);
            }
            const ourStep = category.steps.find(_step => _step.id === step.id);
            if (!ourStep) {
                throw Error('Could not find step with ID: ' + step.id);
            }
            const stats = this.getWalkthroughCompletionStats(category);
            if (!ourStep.done && stats.stepsComplete === stats.stepsTotal - 1) {
                this.hideCategory(category.id);
            }
            this._register(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(REDUCED_MOTION_KEY)) {
                    this.container.classList.toggle('animatable', this.shouldAnimate());
                }
            }));
            ourStep.done = step.done;
            if (category.id === this.currentWalkthrough?.id) {
                const badgeelements = assertIsDefined(this.window.document.querySelectorAll(`[data-done-step-id="${step.id}"]`));
                badgeelements.forEach(badgeelement => {
                    if (step.done) {
                        badgeelement.setAttribute('aria-checked', 'true');
                        badgeelement.parentElement?.setAttribute('aria-checked', 'true');
                        badgeelement.classList.remove(...ThemeIcon.asClassNameArray(gettingStartedUncheckedCodicon));
                        badgeelement.classList.add('complete', ...ThemeIcon.asClassNameArray(gettingStartedCheckedCodicon));
                        badgeelement.setAttribute('aria-label', localize('stepDone', "Checkbox for Step {0}: Completed", step.title));
                    }
                    else {
                        badgeelement.setAttribute('aria-checked', 'false');
                        badgeelement.parentElement?.setAttribute('aria-checked', 'false');
                        badgeelement.classList.remove('complete', ...ThemeIcon.asClassNameArray(gettingStartedCheckedCodicon));
                        badgeelement.classList.add(...ThemeIcon.asClassNameArray(gettingStartedUncheckedCodicon));
                        badgeelement.setAttribute('aria-label', localize('stepNotDone', "Checkbox for Step {0}: Not completed", step.title));
                    }
                });
            }
            this.updateCategoryProgress();
        }));
        this._register(this.storageService.onWillSaveState((e) => {
            if (e.reason !== WillSaveStateReason.SHUTDOWN) {
                return;
            }
            if (this.workspaceContextService.getWorkspace().folders.length !== 0) {
                return;
            }
            if (!this.editorInput || !this.currentWalkthrough || !this.editorInput.selectedCategory || !this.editorInput.selectedStep) {
                return;
            }
            const editorPane = this.groupsService.activeGroup.activeEditorPane;
            if (!(editorPane instanceof GettingStartedPage_1)) {
                return;
            }
            // Save the state of the walkthrough so we can restore it on reload
            const restoreData = { folder: UNKNOWN_EMPTY_WINDOW_WORKSPACE.id, category: this.editorInput.selectedCategory, step: this.editorInput.selectedStep };
            this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }));
    }
    // remove when 'workbench.welcomePage.preferReducedMotion' deprecated
    shouldAnimate() {
        if (this.configurationService.getValue(REDUCED_MOTION_KEY)) {
            return false;
        }
        if (this.accessibilityService.isMotionReduced()) {
            return false;
        }
        return true;
    }
    getWalkthroughCompletionStats(walkthrough) {
        const activeSteps = walkthrough.steps.filter(s => this.contextService.contextMatchesRules(s.when));
        return {
            stepsComplete: activeSteps.filter(s => s.done).length,
            stepsTotal: activeSteps.length,
        };
    }
    async setInput(newInput, options, context, token) {
        this.container.classList.remove('animatable');
        this.editorInput = newInput;
        await super.setInput(newInput, options, context, token);
        await this.buildCategoriesSlide();
        if (this.shouldAnimate()) {
            setTimeout(() => this.container.classList.add('animatable'), 0);
        }
    }
    async makeCategoryVisibleWhenAvailable(categoryID, stepId) {
        this.scrollToCategory(categoryID, stepId);
    }
    registerDispatchListeners() {
        this.dispatchListeners.clear();
        this.container.querySelectorAll('[x-dispatch]').forEach(element => {
            const dispatch = element.getAttribute('x-dispatch') ?? '';
            let command, argument;
            if (dispatch.startsWith('openLink:https')) {
                [command, argument] = ['openLink', dispatch.replace('openLink:', '')];
            }
            else {
                [command, argument] = dispatch.split(':');
            }
            if (command) {
                this.dispatchListeners.add(addDisposableListener(element, 'click', (e) => {
                    e.stopPropagation();
                    this.runDispatchCommand(command, argument);
                }));
                this.dispatchListeners.add(addDisposableListener(element, 'keyup', (e) => {
                    const keyboardEvent = new StandardKeyboardEvent(e);
                    e.stopPropagation();
                    switch (keyboardEvent.keyCode) {
                        case 3 /* KeyCode.Enter */:
                        case 10 /* KeyCode.Space */:
                            this.runDispatchCommand(command, argument);
                            return;
                    }
                }));
            }
        });
    }
    async runDispatchCommand(command, argument) {
        this.commandService.executeCommand('workbench.action.keepEditor');
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command, argument, walkthroughId: this.currentWalkthrough?.id });
        switch (command) {
            case 'scrollPrev': {
                this.scrollPrev();
                break;
            }
            case 'skip': {
                this.runSkip();
                break;
            }
            case 'showMoreRecents': {
                this.commandService.executeCommand(OpenRecentAction.ID);
                break;
            }
            case 'seeAllWalkthroughs': {
                await this.openWalkthroughSelector();
                break;
            }
            case 'openFolder': {
                if (this.contextService.contextMatchesRules(ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace')))) {
                    this.commandService.executeCommand(OpenFolderViaWorkspaceAction.ID);
                }
                else {
                    this.commandService.executeCommand(isMacintosh ? 'workbench.action.files.openFileFolder' : 'workbench.action.files.openFolder');
                }
                break;
            }
            case 'selectCategory': {
                this.scrollToCategory(argument);
                this.gettingStartedService.markWalkthroughOpened(argument);
                break;
            }
            case 'selectStartEntry': {
                const selected = startEntries.find(e => e.id === argument);
                if (selected) {
                    this.runStepCommand(selected.content.command);
                }
                else {
                    throw Error('could not find start entry with id: ' + argument);
                }
                break;
            }
            case 'hideCategory': {
                this.hideCategory(argument);
                break;
            }
            // Use selectTask over selectStep to keep telemetry consistant:https://github.com/microsoft/vscode/issues/122256
            case 'selectTask': {
                this.selectStep(argument);
                break;
            }
            case 'toggleStepCompletion': {
                this.toggleStepCompletion(argument);
                break;
            }
            case 'allDone': {
                this.markAllStepsComplete();
                break;
            }
            case 'nextSection': {
                const next = this.currentWalkthrough?.next;
                if (next) {
                    this.prevWalkthrough = this.currentWalkthrough;
                    this.scrollToCategory(next);
                }
                else {
                    console.error('Error scrolling to next section of', this.currentWalkthrough);
                }
                break;
            }
            case 'openLink': {
                this.openerService.open(argument);
                break;
            }
            default: {
                console.error('Dispatch to', command, argument, 'not defined');
                break;
            }
        }
    }
    hideCategory(categoryId) {
        const selectedCategory = this.gettingStartedCategories.find(category => category.id === categoryId);
        if (!selectedCategory) {
            throw Error('Could not find category with ID ' + categoryId);
        }
        this.setHiddenCategories([...this.getHiddenCategories().add(categoryId)]);
        this.gettingStartedList?.rerender();
    }
    markAllStepsComplete() {
        if (this.currentWalkthrough) {
            this.currentWalkthrough?.steps.forEach(step => {
                if (!step.done) {
                    this.gettingStartedService.progressStep(step.id);
                }
            });
            this.hideCategory(this.currentWalkthrough?.id);
            this.scrollPrev();
        }
        else {
            throw Error('No walkthrough opened');
        }
    }
    toggleStepCompletion(argument) {
        const stepToggle = assertIsDefined(this.currentWalkthrough?.steps.find(step => step.id === argument));
        if (stepToggle.done) {
            this.gettingStartedService.deprogressStep(argument);
        }
        else {
            this.gettingStartedService.progressStep(argument);
        }
    }
    async openWalkthroughSelector() {
        const selection = await this.quickInputService.pick(this.gettingStartedCategories
            .filter(c => this.contextService.contextMatchesRules(c.when))
            .map(x => ({
            id: x.id,
            label: x.title,
            detail: x.description,
            description: x.source,
        })), { canPickMany: false, matchOnDescription: true, matchOnDetail: true, title: localize('pickWalkthroughs', "Open Walkthrough...") });
        if (selection) {
            this.runDispatchCommand('selectCategory', selection.id);
        }
    }
    getHiddenCategories() {
        return new Set(JSON.parse(this.storageService.get(hiddenEntriesConfigurationKey, 0 /* StorageScope.PROFILE */, '[]')));
    }
    setHiddenCategories(hidden) {
        this.storageService.store(hiddenEntriesConfigurationKey, JSON.stringify(hidden), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async buildMediaComponent(stepId, forceRebuild = false) {
        if (!this.currentWalkthrough) {
            throw Error('no walkthrough selected');
        }
        const stepToExpand = assertIsDefined(this.currentWalkthrough.steps.find(step => step.id === stepId));
        if (!forceRebuild && this.currentMediaComponent === stepId) {
            return;
        }
        this.currentMediaComponent = stepId;
        this.stepDisposables.clear();
        this.stepDisposables.add({
            dispose: () => {
                this.currentMediaComponent = undefined;
            }
        });
        if (this.currentMediaType !== stepToExpand.media.type) {
            this.currentMediaType = stepToExpand.media.type;
            this.mediaDisposables.add(toDisposable(() => {
                this.currentMediaType = undefined;
            }));
            clearNode(this.stepMediaComponent);
            if (stepToExpand.media.type === 'svg') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({ title: undefined, options: { disableServiceWorker: true }, contentOptions: {}, extension: undefined }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
            else if (stepToExpand.media.type === 'markdown') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({ options: {}, contentOptions: { localResourceRoots: [stepToExpand.media.root], allowScripts: true }, title: '', extension: undefined }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
            else if (stepToExpand.media.type === 'video') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({ options: {}, contentOptions: { localResourceRoots: [stepToExpand.media.root], allowScripts: true }, title: '', extension: undefined }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
        }
        if (stepToExpand.media.type === 'image') {
            this.stepsContent.classList.add('image');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            const mediaElement = $('img');
            clearNode(this.stepMediaComponent);
            this.stepMediaComponent.appendChild(mediaElement);
            mediaElement.setAttribute('alt', media.altText);
            this.updateMediaSourceForColorMode(mediaElement, media.path);
            this.stepDisposables.add(addDisposableListener(this.stepMediaComponent, 'click', () => {
                const hrefs = stepToExpand.description.map(lt => lt.nodes.filter((node) => typeof node !== 'string').map(node => node.href)).flat();
                if (hrefs.length === 1) {
                    const href = hrefs[0];
                    if (href.startsWith('http')) {
                        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
                        this.openerService.open(href);
                    }
                }
            }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(() => this.updateMediaSourceForColorMode(mediaElement, media.path)));
        }
        else if (stepToExpand.media.type === 'svg') {
            this.stepsContent.classList.add('image');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            this.webview.setHtml(await this.detailsRenderer.renderSVG(media.path));
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since color vars change
                const body = await this.detailsRenderer.renderSVG(media.path);
                if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                    this.webview.setHtml(body);
                }
            }));
            this.stepDisposables.add(addDisposableListener(this.stepMediaComponent, 'click', () => {
                const hrefs = stepToExpand.description.map(lt => lt.nodes.filter((node) => typeof node !== 'string').map(node => node.href)).flat();
                if (hrefs.length === 1) {
                    const href = hrefs[0];
                    if (href.startsWith('http')) {
                        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
                        this.openerService.open(href);
                    }
                }
            }));
            this.stepDisposables.add(this.webview.onDidClickLink(link => {
                if (matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.http) || (matchesScheme(link, Schemas.command))) {
                    this.openerService.open(link, { allowCommands: true });
                }
            }));
        }
        else if (stepToExpand.media.type === 'markdown') {
            this.stepsContent.classList.remove('image');
            this.stepsContent.classList.add('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            const rawHTML = await this.detailsRenderer.renderMarkdown(media.path, media.base);
            this.webview.setHtml(rawHTML);
            const serializedContextKeyExprs = rawHTML.match(/checked-on=\"([^'][^"]*)\"/g)?.map(attr => attr.slice('checked-on="'.length, -1)
                .replace(/&#39;/g, '\'')
                .replace(/&amp;/g, '&'));
            const postTrueKeysMessage = () => {
                const enabledContextKeys = serializedContextKeyExprs?.filter(expr => this.contextService.contextMatchesRules(ContextKeyExpr.deserialize(expr)));
                if (enabledContextKeys) {
                    this.webview.postMessage({
                        enabledContextKeys
                    });
                }
            };
            if (serializedContextKeyExprs) {
                const contextKeyExprs = coalesce(serializedContextKeyExprs.map(expr => ContextKeyExpr.deserialize(expr)));
                const watchingKeys = new Set(contextKeyExprs.flatMap(expr => expr.keys()));
                this.stepDisposables.add(this.contextService.onDidChangeContext(e => {
                    if (e.affectsSome(watchingKeys)) {
                        postTrueKeysMessage();
                    }
                }));
            }
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.stepDisposables.add(this.webview.onDidClickLink(link => {
                if (matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.http) || (matchesScheme(link, Schemas.command))) {
                    const toSide = link.startsWith('command:toSide:');
                    if (toSide) {
                        link = link.replace('command:toSide:', 'command:');
                        this.focusSideEditorGroup();
                    }
                    this.openerService.open(link, { allowCommands: true, openToSide: toSide });
                }
            }));
            if (rawHTML.indexOf('<code>') >= 0) {
                // Render again when Theme changes since syntax highlighting of code blocks may have changed
                this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                    const body = await this.detailsRenderer.renderMarkdown(media.path, media.base);
                    if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                        this.webview.setHtml(body);
                        postTrueKeysMessage();
                    }
                }));
            }
            const layoutDelayer = new Delayer(50);
            this.layoutMarkdown = () => {
                layoutDelayer.trigger(() => {
                    this.webview.postMessage({ layoutMeNow: true });
                });
            };
            this.stepDisposables.add(layoutDelayer);
            this.stepDisposables.add({ dispose: () => this.layoutMarkdown = undefined });
            postTrueKeysMessage();
            this.stepDisposables.add(this.webview.onMessage(async (e) => {
                const message = e.message;
                if (message.startsWith('command:')) {
                    this.openerService.open(message, { allowCommands: true });
                }
                else if (message.startsWith('setTheme:')) {
                    const themeId = message.slice('setTheme:'.length);
                    const theme = (await this.themeService.getColorThemes()).find(theme => theme.settingsId === themeId);
                    if (theme) {
                        this.themeService.setColorTheme(theme.id, 2 /* ConfigurationTarget.USER */);
                    }
                }
                else {
                    console.error('Unexpected message', message);
                }
            }));
        }
        else if (stepToExpand.media.type === 'video') {
            this.stepsContent.classList.add('video');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('image');
            const media = stepToExpand.media;
            const themeType = this.themeService.getColorTheme().type;
            const videoPath = media.path[themeType];
            const videoPoster = media.poster ? media.poster[themeType] : undefined;
            const altText = media.altText ? media.altText : localize('videoAltText', "Video for {0}", stepToExpand.title);
            const rawHTML = await this.detailsRenderer.renderVideo(videoPath, videoPoster, altText);
            this.webview.setHtml(rawHTML);
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since color vars change
                const themeType = this.themeService.getColorTheme().type;
                const videoPath = media.path[themeType];
                const videoPoster = media.poster ? media.poster[themeType] : undefined;
                const body = await this.detailsRenderer.renderVideo(videoPath, videoPoster, altText);
                if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                    this.webview.setHtml(body);
                }
            }));
        }
    }
    async selectStepLoose(id) {
        // Allow passing in id with a category appended or with just the id of the step
        if (id.startsWith(`${this.editorInput.selectedCategory}#`)) {
            this.selectStep(id);
        }
        else {
            const toSelect = this.editorInput.selectedCategory + '#' + id;
            this.selectStep(toSelect);
        }
    }
    provideScreenReaderUpdate() {
        if (this.configurationService.getValue("accessibility.verbosity.walkthrough" /* AccessibilityVerbositySettingId.Walkthrough */)) {
            const kbLabel = this.keybindingService.lookupKeybinding(AccessibleViewAction.id)?.getAriaLabel();
            return kbLabel ? localize('acessibleViewHint', "Inspect this in the accessible view ({0}).\n", kbLabel) : localize('acessibleViewHintNoKbOpen', "Inspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.\n");
        }
        return '';
    }
    async selectStep(id, delayFocus = true) {
        if (id) {
            let stepElement = this.container.querySelector(`[data-step-id="${id}"]`);
            if (!stepElement) {
                // Selected an element that is not in-context, just fallback to whatever.
                stepElement = this.container.querySelector(`[data-step-id]`);
                if (!stepElement) {
                    // No steps around... just ignore.
                    return;
                }
                id = assertIsDefined(stepElement.getAttribute('data-step-id'));
            }
            stepElement.parentElement?.querySelectorAll('.expanded').forEach(node => {
                if (node.getAttribute('data-step-id') !== id) {
                    node.classList.remove('expanded');
                    node.setAttribute('aria-expanded', 'false');
                    const codiconElement = node.querySelector('.codicon');
                    if (codiconElement) {
                        codiconElement.removeAttribute('tabindex');
                    }
                }
            });
            setTimeout(() => stepElement.focus(), delayFocus && this.shouldAnimate() ? SLIDE_TRANSITION_TIME_MS : 0);
            this.editorInput.selectedStep = id;
            stepElement.classList.add('expanded');
            stepElement.setAttribute('aria-expanded', 'true');
            this.buildMediaComponent(id, true);
            const codiconElement = stepElement.querySelector('.codicon');
            if (codiconElement) {
                codiconElement.setAttribute('tabindex', '0');
            }
            this.gettingStartedService.progressByEvent('stepSelected:' + id);
            const step = this.currentWalkthrough?.steps?.find(step => step.id === id);
            if (step) {
                stepElement.setAttribute('aria-label', `${this.provideScreenReaderUpdate()} ${step.title}`);
            }
        }
        else {
            this.editorInput.selectedStep = undefined;
        }
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    updateMediaSourceForColorMode(element, sources) {
        const themeType = this.themeService.getColorTheme().type;
        const src = sources[themeType].toString(true).replace(/ /g, '%20');
        element.srcset = src.toLowerCase().endsWith('.svg') ? src : (src + ' 1.5x');
    }
    createEditor(parent) {
        if (this.detailsPageScrollbar) {
            this.detailsPageScrollbar.dispose();
        }
        if (this.categoriesPageScrollbar) {
            this.categoriesPageScrollbar.dispose();
        }
        this.categoriesSlide = $('.gettingStartedSlideCategories.gettingStartedSlide');
        const prevButton = $('button.prev-button.button-link', { 'x-dispatch': 'scrollPrev' }, $('span.scroll-button.codicon.codicon-chevron-left'), $('span.moreText', {}, localize('goBack', "Go Back")));
        this.stepsSlide = $('.gettingStartedSlideDetails.gettingStartedSlide', {}, prevButton);
        this.stepsContent = $('.gettingStartedDetailsContent', {});
        this.detailsPageScrollbar = this._register(new DomScrollableElement(this.stepsContent, { className: 'full-height-scrollable', vertical: 2 /* ScrollbarVisibility.Hidden */ }));
        this.categoriesPageScrollbar = this._register(new DomScrollableElement(this.categoriesSlide, { className: 'full-height-scrollable categoriesScrollbar', vertical: 2 /* ScrollbarVisibility.Hidden */ }));
        this.stepsSlide.appendChild(this.detailsPageScrollbar.getDomNode());
        const gettingStartedPage = $('.gettingStarted', {}, this.categoriesPageScrollbar.getDomNode(), this.stepsSlide);
        this.container.appendChild(gettingStartedPage);
        this.categoriesPageScrollbar.scanDomNode();
        this.detailsPageScrollbar.scanDomNode();
        parent.appendChild(this.container);
    }
    async buildCategoriesSlide() {
        this.categoriesSlideDisposables.clear();
        const showOnStartupCheckbox = new Toggle({
            icon: Codicon.check,
            actionClassName: 'getting-started-checkbox',
            isChecked: this.configurationService.getValue(configurationKey) === 'welcomePage',
            title: localize('checkboxTitle', "When checked, this page will be shown on startup."),
            ...defaultToggleStyles
        });
        showOnStartupCheckbox.domNode.id = 'showOnStartup';
        const showOnStartupLabel = $('label.caption', { for: 'showOnStartup' }, localize('welcomePage.showOnStartup', "Show welcome page on startup"));
        const onShowOnStartupChanged = () => {
            if (showOnStartupCheckbox.checked) {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'showOnStartupChecked', argument: undefined, walkthroughId: this.currentWalkthrough?.id });
                this.configurationService.updateValue(configurationKey, 'welcomePage');
            }
            else {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'showOnStartupUnchecked', argument: undefined, walkthroughId: this.currentWalkthrough?.id });
                this.configurationService.updateValue(configurationKey, 'none');
            }
        };
        this.categoriesSlideDisposables.add(showOnStartupCheckbox);
        this.categoriesSlideDisposables.add(showOnStartupCheckbox.onChange(() => {
            onShowOnStartupChanged();
        }));
        this.categoriesSlideDisposables.add(addDisposableListener(showOnStartupLabel, 'click', () => {
            showOnStartupCheckbox.checked = !showOnStartupCheckbox.checked;
            onShowOnStartupChanged();
        }));
        const header = $('.header', {}, $('h1.product-name.caption', {}, this.productService.nameLong), $('p.subtitle.description', {}, localize({ key: 'gettingStarted.editingEvolved', comment: ['Shown as subtitle on the Welcome page.'] }, "Editing evolved")));
        const leftColumn = $('.categories-column.categories-column-left', {});
        const rightColumn = $('.categories-column.categories-column-right', {});
        const startList = this.buildStartList();
        const recentList = this.buildRecentlyOpenedList();
        const gettingStartedList = this.buildGettingStartedWalkthroughsList();
        const footer = $('.footer', {}, $('p.showOnStartup', {}, showOnStartupCheckbox.domNode, showOnStartupLabel));
        const layoutLists = () => {
            if (gettingStartedList.itemCount) {
                this.container.classList.remove('noWalkthroughs');
                reset(rightColumn, gettingStartedList.getDomElement());
            }
            else {
                this.container.classList.add('noWalkthroughs');
                reset(rightColumn);
            }
            setTimeout(() => this.categoriesPageScrollbar?.scanDomNode(), 50);
            layoutRecentList();
        };
        const layoutRecentList = () => {
            if (this.container.classList.contains('noWalkthroughs')) {
                recentList.setLimit(10);
                reset(leftColumn, startList.getDomElement());
                reset(rightColumn, recentList.getDomElement());
            }
            else {
                recentList.setLimit(5);
                reset(leftColumn, startList.getDomElement(), recentList.getDomElement());
            }
        };
        gettingStartedList.onDidChange(layoutLists);
        layoutLists();
        reset(this.categoriesSlide, $('.gettingStartedCategoriesContainer', {}, header, leftColumn, rightColumn, footer));
        this.categoriesPageScrollbar?.scanDomNode();
        this.updateCategoryProgress();
        this.registerDispatchListeners();
        if (this.editorInput.selectedCategory) {
            this.currentWalkthrough = this.gettingStartedCategories.find(category => category.id === this.editorInput.selectedCategory);
            if (!this.currentWalkthrough) {
                this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
                this.currentWalkthrough = this.gettingStartedCategories.find(category => category.id === this.editorInput.selectedCategory);
                if (this.currentWalkthrough) {
                    this.buildCategorySlide(this.editorInput.selectedCategory, this.editorInput.selectedStep);
                    this.setSlide('details');
                    return;
                }
            }
            else {
                this.buildCategorySlide(this.editorInput.selectedCategory, this.editorInput.selectedStep);
                this.setSlide('details');
                return;
            }
        }
        const someStepsComplete = this.gettingStartedCategories.some(category => category.steps.find(s => s.done));
        if (this.editorInput.showTelemetryNotice && this.productService.openToWelcomeMainPage) {
            const telemetryNotice = $('p.telemetry-notice');
            this.buildTelemetryFooter(telemetryNotice);
            footer.appendChild(telemetryNotice);
        }
        else if (!this.productService.openToWelcomeMainPage && !someStepsComplete && !this.hasScrolledToFirstCategory && this.showFeaturedWalkthrough) {
            const firstSessionDateString = this.storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */) || new Date().toUTCString();
            const daysSinceFirstSession = ((+new Date()) - (+new Date(firstSessionDateString))) / 1000 / 60 / 60 / 24;
            const fistContentBehaviour = daysSinceFirstSession < 1 ? 'openToFirstCategory' : 'index';
            if (fistContentBehaviour === 'openToFirstCategory') {
                const first = this.gettingStartedCategories.filter(c => !c.when || this.contextService.contextMatchesRules(c.when))[0];
                if (first) {
                    this.hasScrolledToFirstCategory = true;
                    this.currentWalkthrough = first;
                    this.editorInput.selectedCategory = this.currentWalkthrough?.id;
                    this.editorInput.walkthroughPageTitle = this.currentWalkthrough.walkthroughPageTitle;
                    this.buildCategorySlide(this.editorInput.selectedCategory, undefined);
                    this.setSlide('details', true /* firstLaunch */);
                    return;
                }
            }
        }
        this.setSlide('categories');
    }
    buildRecentlyOpenedList() {
        const renderRecent = (recent) => {
            let fullPath;
            let windowOpenable;
            if (isRecentFolder(recent)) {
                windowOpenable = { folderUri: recent.folderUri };
                fullPath = recent.label || this.labelService.getWorkspaceLabel(recent.folderUri, { verbose: 2 /* Verbosity.LONG */ });
            }
            else {
                fullPath = recent.label || this.labelService.getWorkspaceLabel(recent.workspace, { verbose: 2 /* Verbosity.LONG */ });
                windowOpenable = { workspaceUri: recent.workspace.configPath };
            }
            const { name, parentPath } = splitRecentLabel(fullPath);
            const li = $('li');
            const link = $('button.button-link');
            link.innerText = name;
            link.title = fullPath;
            link.setAttribute('aria-label', localize('welcomePage.openFolderWithPath', "Open folder {0} with path {1}", name, parentPath));
            link.addEventListener('click', e => {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'openRecent', argument: undefined, walkthroughId: this.currentWalkthrough?.id });
                this.hostService.openWindow([windowOpenable], {
                    forceNewWindow: e.ctrlKey || e.metaKey,
                    remoteAuthority: recent.remoteAuthority || null // local window if remoteAuthority is not set or can not be deducted from the openable
                });
                e.preventDefault();
                e.stopPropagation();
            });
            li.appendChild(link);
            const span = $('span');
            span.classList.add('path');
            span.classList.add('detail');
            span.innerText = parentPath;
            span.title = fullPath;
            li.appendChild(span);
            return li;
        };
        if (this.recentlyOpenedList) {
            this.recentlyOpenedList.dispose();
        }
        const recentlyOpenedList = this.recentlyOpenedList = new GettingStartedIndexList({
            title: localize('recent', "Recent"),
            klass: 'recently-opened',
            limit: 5,
            empty: $('.empty-recent', {}, localize('noRecents', "You have no recent folders,"), $('button.button-link', { 'x-dispatch': 'openFolder' }, localize('openFolder', "open a folder")), localize('toStart', "to start.")),
            more: $('.more', {}, $('button.button-link', {
                'x-dispatch': 'showMoreRecents',
                title: localize('show more recents', "Show All Recent Folders {0}", this.getKeybindingLabel(OpenRecentAction.ID))
            }, localize('showAll', "More..."))),
            renderElement: renderRecent,
            contextService: this.contextService
        });
        recentlyOpenedList.onDidChange(() => this.registerDispatchListeners());
        this.recentlyOpened.then(({ workspaces }) => {
            // Filter out the current workspace
            const workspacesWithID = workspaces
                .filter(recent => !this.workspaceContextService.isCurrentWorkspace(isRecentWorkspace(recent) ? recent.workspace : recent.folderUri))
                .map(recent => ({ ...recent, id: isRecentWorkspace(recent) ? recent.workspace.id : recent.folderUri.toString() }));
            const updateEntries = () => {
                recentlyOpenedList.setEntries(workspacesWithID);
            };
            updateEntries();
            recentlyOpenedList.register(this.labelService.onDidChangeFormatters(() => updateEntries()));
        }).catch(onUnexpectedError);
        return recentlyOpenedList;
    }
    buildStartList() {
        const renderStartEntry = (entry) => $('li', {}, $('button.button-link', {
            'x-dispatch': 'selectStartEntry:' + entry.id,
            title: entry.description + ' ' + this.getKeybindingLabel(entry.command),
        }, this.iconWidgetFor(entry), $('span', {}, entry.title)));
        if (this.startList) {
            this.startList.dispose();
        }
        const startList = this.startList = new GettingStartedIndexList({
            title: localize('start', "Start"),
            klass: 'start-container',
            limit: 10,
            renderElement: renderStartEntry,
            rankElement: e => -e.order,
            contextService: this.contextService
        });
        startList.setEntries(parsedStartEntries);
        startList.onDidChange(() => this.registerDispatchListeners());
        return startList;
    }
    buildGettingStartedWalkthroughsList() {
        const renderGetttingStaredWalkthrough = (category) => {
            const renderNewBadge = (category.newItems || category.newEntry) && !category.isFeatured;
            const newBadge = $('.new-badge', {});
            if (category.newEntry) {
                reset(newBadge, $('.new-category', {}, localize('new', "New")));
            }
            else if (category.newItems) {
                reset(newBadge, $('.new-items', {}, localize({ key: 'newItems', comment: ['Shown when a list of items has changed based on an update from a remote source'] }, "Updated")));
            }
            const featuredBadge = $('.featured-badge', {});
            const descriptionContent = $('.description-content', {});
            if (category.isFeatured && this.showFeaturedWalkthrough) {
                reset(featuredBadge, $('.featured', {}, $('span.featured-icon.codicon.codicon-star-full')));
                reset(descriptionContent, ...renderLabelWithIcons(category.description));
            }
            const titleContent = $('h3.category-title.max-lines-3', { 'x-category-title-for': category.id });
            reset(titleContent, ...renderLabelWithIcons(category.title));
            return $('button.getting-started-category' + (category.isFeatured && this.showFeaturedWalkthrough ? '.featured' : ''), {
                'x-dispatch': 'selectCategory:' + category.id,
                'title': category.description
            }, featuredBadge, $('.main-content', {}, this.iconWidgetFor(category), titleContent, renderNewBadge ? newBadge : $('.no-badge'), $('a.codicon.codicon-close.hide-category-button', {
                'tabindex': 0,
                'x-dispatch': 'hideCategory:' + category.id,
                'title': localize('close', "Hide"),
                'role': 'button',
                'aria-label': localize('closeAriaLabel', "Hide"),
            })), descriptionContent, $('.category-progress', { 'x-data-category-id': category.id, }, $('.progress-bar-outer', { 'role': 'progressbar' }, $('.progress-bar-inner'))));
        };
        if (this.gettingStartedList) {
            this.gettingStartedList.dispose();
        }
        const rankWalkthrough = (e) => {
            let rank = e.order;
            if (e.isFeatured) {
                rank += 7;
            }
            if (e.newEntry) {
                rank += 3;
            }
            if (e.newItems) {
                rank += 2;
            }
            if (e.recencyBonus) {
                rank += 4 * e.recencyBonus;
            }
            if (this.getHiddenCategories().has(e.id)) {
                rank = null;
            }
            return rank;
        };
        const gettingStartedList = this.gettingStartedList = new GettingStartedIndexList({
            title: localize('walkthroughs', "Walkthroughs"),
            klass: 'getting-started',
            limit: 5,
            footer: $('span.button-link.see-all-walkthroughs', { 'x-dispatch': 'seeAllWalkthroughs', 'tabindex': 0 }, localize('showAll', "More...")),
            renderElement: renderGetttingStaredWalkthrough,
            rankElement: rankWalkthrough,
            contextService: this.contextService,
        });
        gettingStartedList.onDidChange(() => {
            const hidden = this.getHiddenCategories();
            const someWalkthroughsHidden = hidden.size || gettingStartedList.itemCount < this.gettingStartedCategories.filter(c => this.contextService.contextMatchesRules(c.when)).length;
            this.container.classList.toggle('someWalkthroughsHidden', !!someWalkthroughsHidden);
            this.registerDispatchListeners();
            allWalkthroughsHiddenContext.bindTo(this.contextService).set(gettingStartedList.itemCount === 0);
            this.updateCategoryProgress();
        });
        gettingStartedList.setEntries(this.gettingStartedCategories);
        allWalkthroughsHiddenContext.bindTo(this.contextService).set(gettingStartedList.itemCount === 0);
        return gettingStartedList;
    }
    layout(size) {
        this.detailsScrollbar?.scanDomNode();
        this.categoriesPageScrollbar?.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.startList?.layout(size);
        this.gettingStartedList?.layout(size);
        this.recentlyOpenedList?.layout(size);
        if (this.editorInput?.selectedStep && this.currentMediaType) {
            this.mediaDisposables.clear();
            this.stepDisposables.clear();
            this.buildMediaComponent(this.editorInput.selectedStep);
        }
        this.layoutMarkdown?.();
        this.container.classList.toggle('height-constrained', size.height <= 600);
        this.container.classList.toggle('width-constrained', size.width <= 400);
        this.container.classList.toggle('width-semi-constrained', size.width <= 950);
        this.categoriesPageScrollbar?.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    updateCategoryProgress() {
        this.window.document.querySelectorAll('.category-progress').forEach(element => {
            const categoryID = element.getAttribute('x-data-category-id');
            const category = this.gettingStartedCategories.find(category => category.id === categoryID);
            if (!category) {
                throw Error('Could not find category with ID ' + categoryID);
            }
            const stats = this.getWalkthroughCompletionStats(category);
            const bar = assertIsDefined(element.querySelector('.progress-bar-inner'));
            bar.setAttribute('aria-valuemin', '0');
            bar.setAttribute('aria-valuenow', '' + stats.stepsComplete);
            bar.setAttribute('aria-valuemax', '' + stats.stepsTotal);
            const progress = (stats.stepsComplete / stats.stepsTotal) * 100;
            bar.style.width = `${progress}%`;
            element.parentElement.classList.toggle('no-progress', stats.stepsComplete === 0);
            if (stats.stepsTotal === stats.stepsComplete) {
                bar.title = localize('gettingStarted.allStepsComplete', "All {0} steps complete!", stats.stepsComplete);
            }
            else {
                bar.title = localize('gettingStarted.someStepsComplete', "{0} of {1} steps complete", stats.stepsComplete, stats.stepsTotal);
            }
        });
    }
    async scrollToCategory(categoryID, stepId) {
        if (!this.gettingStartedCategories.some(c => c.id === categoryID)) {
            this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
        }
        const ourCategory = this.gettingStartedCategories.find(c => c.id === categoryID);
        if (!ourCategory) {
            throw Error('Could not find category with ID: ' + categoryID);
        }
        this.inProgressScroll = this.inProgressScroll.then(async () => {
            reset(this.stepsContent);
            this.editorInput.selectedCategory = categoryID;
            this.editorInput.selectedStep = stepId;
            this.editorInput.walkthroughPageTitle = ourCategory.walkthroughPageTitle;
            this.currentWalkthrough = ourCategory;
            this.buildCategorySlide(categoryID, stepId);
            this.setSlide('details');
        });
    }
    iconWidgetFor(category) {
        const widget = category.icon.type === 'icon' ? $(ThemeIcon.asCSSSelector(category.icon.icon)) : $('img.category-icon', { src: category.icon.path });
        widget.classList.add('icon-widget');
        return widget;
    }
    focusSideEditorGroup() {
        const fullSize = this.groupsService.getPart(this.group).contentDimension;
        if (!fullSize || fullSize.width <= 700) {
            return;
        }
        if (this.groupsService.count === 1) {
            const sideGroup = this.groupsService.addGroup(this.groupsService.groups[0], 3 /* GroupDirection.RIGHT */);
            this.groupsService.activateGroup(sideGroup);
            const gettingStartedSize = Math.floor(fullSize.width / 2);
            const gettingStartedGroup = this.groupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).find(group => (group.activeEditor instanceof GettingStartedInput));
            this.groupsService.setSize(assertIsDefined(gettingStartedGroup), { width: gettingStartedSize, height: fullSize.height });
        }
        const nonGettingStartedGroup = this.groupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).find(group => !(group.activeEditor instanceof GettingStartedInput));
        if (nonGettingStartedGroup) {
            this.groupsService.activateGroup(nonGettingStartedGroup);
            nonGettingStartedGroup.focus();
        }
    }
    runStepCommand(href) {
        const isCommand = href.startsWith('command:');
        const toSide = href.startsWith('command:toSide:');
        const command = href.replace(/command:(toSide:)?/, 'command:');
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
        if (toSide) {
            this.focusSideEditorGroup();
        }
        if (isCommand) {
            const commandURI = URI.parse(command);
            // execute as command
            let args = [];
            try {
                args = parse(decodeURIComponent(commandURI.query));
            }
            catch {
                // ignore and retry
                try {
                    args = parse(commandURI.query);
                }
                catch {
                    // ignore error
                }
            }
            if (!Array.isArray(args)) {
                args = [args];
            }
            // If a step is requesting the OpenFolder action to be executed in an empty workspace...
            if ((commandURI.path === OpenFileFolderAction.ID.toString() ||
                commandURI.path === OpenFolderAction.ID.toString()) &&
                this.workspaceContextService.getWorkspace().folders.length === 0) {
                const selectedStepIndex = this.currentWalkthrough?.steps.findIndex(step => step.id === this.editorInput.selectedStep);
                // and there are a few more steps after this step which are yet to be completed...
                if (selectedStepIndex !== undefined &&
                    selectedStepIndex > -1 &&
                    this.currentWalkthrough?.steps.slice(selectedStepIndex + 1).some(step => !step.done)) {
                    const restoreData = { folder: UNKNOWN_EMPTY_WINDOW_WORKSPACE.id, category: this.editorInput.selectedCategory, step: this.editorInput.selectedStep };
                    // save state to restore after reload
                    this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                }
            }
            this.commandService.executeCommand(commandURI.path, ...args).then(result => {
                const toOpen = result?.openFolder;
                if (toOpen) {
                    if (!URI.isUri(toOpen)) {
                        console.warn('Warn: Running walkthrough command', href, 'yielded non-URI `openFolder` result', toOpen, '. It will be disregarded.');
                        return;
                    }
                    const restoreData = { folder: toOpen.toString(), category: this.editorInput.selectedCategory, step: this.editorInput.selectedStep };
                    this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                    this.hostService.openWindow([{ folderUri: toOpen }]);
                }
            });
        }
        else {
            this.openerService.open(command, { allowCommands: true });
        }
        if (!isCommand && (href.startsWith('https://') || href.startsWith('http://'))) {
            this.gettingStartedService.progressByEvent('onLink:' + href);
        }
    }
    buildMarkdownDescription(container, text) {
        while (container.firstChild) {
            container.firstChild.remove();
        }
        for (const linkedText of text) {
            if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
                const node = linkedText.nodes[0];
                const buttonContainer = append(container, $('.button-container'));
                const button = new Button(buttonContainer, { title: node.title, supportIcons: true, ...defaultButtonStyles });
                const isCommand = node.href.startsWith('command:');
                const command = node.href.replace(/command:(toSide:)?/, 'command:');
                button.label = node.label;
                button.onDidClick(e => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.runStepCommand(node.href);
                }, null, this.detailsPageDisposables);
                if (isCommand) {
                    const keybinding = this.getKeyBinding(command);
                    if (keybinding) {
                        const shortcutMessage = $('span.shortcut-message', {}, localize('gettingStarted.keyboardTip', 'Tip: Use keyboard shortcut '));
                        container.appendChild(shortcutMessage);
                        const label = new KeybindingLabel(shortcutMessage, OS, { ...defaultKeybindingLabelStyles });
                        label.set(keybinding);
                        this.detailsPageDisposables.add(label);
                    }
                }
                this.detailsPageDisposables.add(button);
            }
            else {
                const p = append(container, $('p'));
                for (const node of linkedText.nodes) {
                    if (typeof node === 'string') {
                        const labelWithIcon = renderLabelWithIcons(node);
                        for (const element of labelWithIcon) {
                            if (typeof element === 'string') {
                                p.appendChild(renderFormattedText(element, { inline: true, renderCodeSegments: true }));
                            }
                            else {
                                p.appendChild(element);
                            }
                        }
                    }
                    else {
                        const nodeWithTitle = matchesScheme(node.href, Schemas.http) || matchesScheme(node.href, Schemas.https) ? { ...node, title: node.href } : node;
                        const link = this.instantiationService.createInstance(Link, p, nodeWithTitle, { opener: (href) => this.runStepCommand(href) });
                        this.detailsPageDisposables.add(link);
                    }
                }
            }
        }
        return container;
    }
    clearInput() {
        this.stepDisposables.clear();
        super.clearInput();
    }
    buildCategorySlide(categoryID, selectedStep) {
        if (this.detailsScrollbar) {
            this.detailsScrollbar.dispose();
        }
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            // Remove internal extension id specifier from exposed id's
            this.extensionService.activateByEvent(`onWalkthrough:${categoryID.replace(/[^#]+#/, '')}`);
        });
        this.detailsPageDisposables.clear();
        this.mediaDisposables.clear();
        const category = this.gettingStartedCategories.find(category => category.id === categoryID);
        if (!category) {
            throw Error('could not find category with ID ' + categoryID);
        }
        const descriptionContainer = $('.category-description.description.max-lines-3', { 'x-category-description-for': category.id });
        this.buildMarkdownDescription(descriptionContainer, parseDescription(category.description));
        const categoryDescriptorComponent = $('.getting-started-category', {}, $('.category-description-container', {}, $('h2.category-title.max-lines-3', { 'x-category-title-for': category.id }, ...renderLabelWithIcons(category.title)), descriptionContainer));
        const stepListContainer = $('.step-list-container');
        this.detailsPageDisposables.add(addDisposableListener(stepListContainer, 'keydown', (e) => {
            const event = new StandardKeyboardEvent(e);
            const currentStepIndex = () => category.steps.findIndex(e => e.id === this.editorInput.selectedStep);
            if (event.keyCode === 16 /* KeyCode.UpArrow */) {
                const toExpand = category.steps.filter((step, index) => index < currentStepIndex() && this.contextService.contextMatchesRules(step.when));
                if (toExpand.length) {
                    this.selectStep(toExpand[toExpand.length - 1].id, false);
                }
            }
            if (event.keyCode === 18 /* KeyCode.DownArrow */) {
                const toExpand = category.steps.find((step, index) => index > currentStepIndex() && this.contextService.contextMatchesRules(step.when));
                if (toExpand) {
                    this.selectStep(toExpand.id, false);
                }
            }
        }));
        let renderedSteps = undefined;
        const contextKeysToWatch = new Set(category.steps.flatMap(step => step.when.keys()));
        const buildStepList = () => {
            category.steps.sort((a, b) => a.order - b.order);
            const toRender = category.steps
                .filter(step => this.contextService.contextMatchesRules(step.when));
            if (equals(renderedSteps, toRender, (a, b) => a.id === b.id)) {
                return;
            }
            renderedSteps = toRender;
            reset(stepListContainer, ...renderedSteps
                .map(step => {
                const codicon = $('.codicon' + (step.done ? '.complete' + ThemeIcon.asCSSSelector(gettingStartedCheckedCodicon) : ThemeIcon.asCSSSelector(gettingStartedUncheckedCodicon)), {
                    'data-done-step-id': step.id,
                    'x-dispatch': 'toggleStepCompletion:' + step.id,
                    'role': 'checkbox',
                    'aria-checked': step.done ? 'true' : 'false',
                    'aria-label': step.done
                        ? localize('stepDone', "Checkbox for Step {0}: Completed", step.title)
                        : localize('stepNotDone', "Checkbox for Step {0}: Not completed", step.title),
                });
                const container = $('.step-description-container', { 'x-step-description-for': step.id });
                this.buildMarkdownDescription(container, step.description);
                const stepTitle = $('h3.step-title.max-lines-3', { 'x-step-title-for': step.id });
                reset(stepTitle, ...renderLabelWithIcons(step.title));
                const stepDescription = $('.step-container', {}, stepTitle, container);
                if (step.media.type === 'image') {
                    stepDescription.appendChild($('.image-description', { 'aria-label': localize('imageShowing', "Image showing {0}", step.media.altText) }));
                }
                else if (step.media.type === 'video') {
                    stepDescription.appendChild($('.video-description', { 'aria-label': localize('videoShowing', "Video showing {0}", step.media.altText) }));
                }
                return $('button.getting-started-step', {
                    'x-dispatch': 'selectTask:' + step.id,
                    'data-step-id': step.id,
                    'aria-expanded': 'false',
                    'aria-checked': step.done ? 'true' : 'false',
                    'role': 'button',
                }, codicon, stepDescription);
            }));
        };
        buildStepList();
        this.detailsPageDisposables.add(this.contextService.onDidChangeContext(e => {
            if (e.affectsSome(contextKeysToWatch) && this.currentWalkthrough) {
                buildStepList();
                this.registerDispatchListeners();
                this.selectStep(this.editorInput.selectedStep, false);
            }
        }));
        const showNextCategory = this.gettingStartedCategories.find(_category => _category.id === category.next);
        const stepsContainer = $('.getting-started-detail-container', { 'role': 'list' }, stepListContainer, $('.done-next-container', {}, $('button.button-link.all-done', { 'x-dispatch': 'allDone' }, $('span.codicon.codicon-check-all'), localize('allDone', "Mark Done")), ...(showNextCategory
            ? [$('button.button-link.next', { 'x-dispatch': 'nextSection' }, localize('nextOne', "Next Section"), $('span.codicon.codicon-arrow-right'))]
            : [])));
        this.detailsScrollbar = this._register(new DomScrollableElement(stepsContainer, { className: 'steps-container' }));
        const stepListComponent = this.detailsScrollbar.getDomNode();
        const categoryFooter = $('.getting-started-footer');
        if (this.editorInput.showTelemetryNotice && getTelemetryLevel(this.configurationService) !== 0 /* TelemetryLevel.NONE */ && this.productService.enableTelemetry) {
            this.buildTelemetryFooter(categoryFooter);
        }
        reset(this.stepsContent, categoryDescriptorComponent, stepListComponent, this.stepMediaComponent, categoryFooter);
        const toExpand = category.steps.find(step => this.contextService.contextMatchesRules(step.when) && !step.done) ?? category.steps[0];
        this.selectStep(selectedStep ?? toExpand.id, !selectedStep);
        this.detailsScrollbar.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.registerDispatchListeners();
    }
    buildTelemetryFooter(parent) {
        const mdRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        const privacyStatementCopy = localize('privacy statement', "privacy statement");
        const privacyStatementButton = `[${privacyStatementCopy}](command:workbench.action.openPrivacyStatementUrl)`;
        const optOutCopy = localize('optOut', "opt out");
        const optOutButton = `[${optOutCopy}](command:settings.filterByTelemetry)`;
        const text = localize({ key: 'footer', comment: ['fist substitution is "vs code", second is "privacy statement", third is "opt out".'] }, "{0} collects usage data. Read our {1} and learn how to {2}.", this.productService.nameShort, privacyStatementButton, optOutButton);
        parent.append(mdRenderer.render({ value: text, isTrusted: true }).element);
    }
    getKeybindingLabel(command) {
        command = command.replace(/^command:/, '');
        const label = this.keybindingService.lookupKeybinding(command)?.getLabel();
        if (!label) {
            return '';
        }
        else {
            return `(${label})`;
        }
    }
    getKeyBinding(command) {
        command = command.replace(/^command:/, '');
        return this.keybindingService.lookupKeybinding(command);
    }
    async scrollPrev() {
        this.inProgressScroll = this.inProgressScroll.then(async () => {
            if (this.prevWalkthrough && this.prevWalkthrough !== this.currentWalkthrough) {
                this.currentWalkthrough = this.prevWalkthrough;
                this.prevWalkthrough = undefined;
                this.makeCategoryVisibleWhenAvailable(this.currentWalkthrough.id);
            }
            else {
                this.currentWalkthrough = undefined;
                this.editorInput.selectedCategory = undefined;
                this.editorInput.selectedStep = undefined;
                this.editorInput.showTelemetryNotice = false;
                this.editorInput.walkthroughPageTitle = undefined;
                if (this.gettingStartedCategories.length !== this.gettingStartedList?.itemCount) {
                    // extensions may have changed in the time since we last displayed the walkthrough list
                    // rebuild the list
                    this.buildCategoriesSlide();
                }
                this.selectStep(undefined);
                this.setSlide('categories');
                this.container.focus();
            }
        });
    }
    runSkip() {
        this.commandService.executeCommand('workbench.action.closeActiveEditor');
    }
    escape() {
        if (this.editorInput.selectedCategory) {
            this.scrollPrev();
        }
        else {
            this.runSkip();
        }
    }
    setSlide(toEnable, firstLaunch = false) {
        const slideManager = assertIsDefined(this.container.querySelector('.gettingStarted'));
        if (toEnable === 'categories') {
            slideManager.classList.remove('showDetails');
            slideManager.classList.add('showCategories');
            this.container.querySelector('.prev-button.button-link').style.display = 'none';
            this.container.querySelector('.gettingStartedSlideDetails').querySelectorAll('button').forEach(button => button.disabled = true);
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('button').forEach(button => button.disabled = false);
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('input').forEach(button => button.disabled = false);
        }
        else {
            slideManager.classList.add('showDetails');
            slideManager.classList.remove('showCategories');
            const prevButton = this.container.querySelector('.prev-button.button-link');
            prevButton.style.display = this.editorInput.showWelcome || this.prevWalkthrough ? 'block' : 'none';
            const moreTextElement = prevButton.querySelector('.moreText');
            moreTextElement.textContent = firstLaunch ? localize('welcome', "Welcome") : localize('goBack', "Go Back");
            this.container.querySelector('.gettingStartedSlideDetails').querySelectorAll('button').forEach(button => button.disabled = false);
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('button').forEach(button => button.disabled = true);
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('input').forEach(button => button.disabled = true);
        }
    }
    focus() {
        super.focus();
        const active = this.container.ownerDocument.activeElement;
        let parent = this.container.parentElement;
        while (parent && parent !== active) {
            parent = parent.parentElement;
        }
        if (parent) {
            // Only set focus if there is no other focued element outside this chain.
            // This prevents us from stealing back focus from other focused elements such as quick pick due to delayed load.
            this.container.focus();
        }
    }
};
GettingStartedPage = GettingStartedPage_1 = __decorate([
    __param(1, ICommandService),
    __param(2, IProductService),
    __param(3, IKeybindingService),
    __param(4, IWalkthroughsService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, ILanguageService),
    __param(8, IFileService),
    __param(9, IOpenerService),
    __param(10, IWorkbenchThemeService),
    __param(11, IStorageService),
    __param(12, IExtensionService),
    __param(13, IInstantiationService),
    __param(14, INotificationService),
    __param(15, IEditorGroupsService),
    __param(16, IContextKeyService),
    __param(17, IQuickInputService),
    __param(18, IWorkspacesService),
    __param(19, ILabelService),
    __param(20, IHostService),
    __param(21, IWebviewService),
    __param(22, IWorkspaceContextService),
    __param(23, IAccessibilityService)
], GettingStartedPage);
export { GettingStartedPage };
export class GettingStartedInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return JSON.stringify({ selectedCategory: editorInput.selectedCategory, selectedStep: editorInput.selectedStep });
    }
    deserialize(instantiationService, serializedEditorInput) {
        return instantiationService.invokeFunction(accessor => {
            try {
                const { selectedCategory, selectedStep } = JSON.parse(serializedEditorInput);
                return new GettingStartedInput({ selectedCategory, selectedStep });
            }
            catch { }
            return new GettingStartedInput({});
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9nZXR0aW5nU3RhcnRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBYSxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXJGLE9B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