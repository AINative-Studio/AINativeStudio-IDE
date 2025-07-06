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
import './media/timelinePane.css';
import { localize, localize2 } from '../../../../nls.js';
import * as DOM from '../../../../base/browser/dom.js';
import * as css from '../../../../base/browser/cssValue.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { fromNow } from '../../../../base/common/date.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITimelineService } from '../common/timeline.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { SideBySideEditor, EditorResourceAccessor } from '../../../common/editor.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getContextMenuActions, createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, registerAction2, Action2, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { isString } from '../../../../base/common/types.js';
import { renderMarkdownAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
const ItemHeight = 22;
function isLoadMoreCommand(item) {
    return item instanceof LoadMoreCommand;
}
function isTimelineItem(item) {
    return !!item && !item.handle.startsWith('vscode-command:');
}
function updateRelativeTime(item, lastRelativeTime) {
    item.relativeTime = isTimelineItem(item) ? fromNow(item.timestamp) : undefined;
    item.relativeTimeFullWord = isTimelineItem(item) ? fromNow(item.timestamp, false, true) : undefined;
    if (lastRelativeTime === undefined || item.relativeTime !== lastRelativeTime) {
        lastRelativeTime = item.relativeTime;
        item.hideRelativeTime = false;
    }
    else {
        item.hideRelativeTime = true;
    }
    return lastRelativeTime;
}
class TimelineAggregate {
    constructor(timeline) {
        this._stale = false;
        this._requiresReset = false;
        this.source = timeline.source;
        this.items = timeline.items;
        this._cursor = timeline.paging?.cursor;
        this.lastRenderedIndex = -1;
    }
    get cursor() {
        return this._cursor;
    }
    get more() {
        return this._cursor !== undefined;
    }
    get newest() {
        return this.items[0];
    }
    get oldest() {
        return this.items[this.items.length - 1];
    }
    add(timeline, options) {
        let updated = false;
        if (timeline.items.length !== 0 && this.items.length !== 0) {
            updated = true;
            const ids = new Set();
            const timestamps = new Set();
            for (const item of timeline.items) {
                if (item.id === undefined) {
                    timestamps.add(item.timestamp);
                }
                else {
                    ids.add(item.id);
                }
            }
            // Remove any duplicate items
            let i = this.items.length;
            let item;
            while (i--) {
                item = this.items[i];
                if ((item.id !== undefined && ids.has(item.id)) || timestamps.has(item.timestamp)) {
                    this.items.splice(i, 1);
                }
            }
            if ((timeline.items[timeline.items.length - 1]?.timestamp ?? 0) >= (this.newest?.timestamp ?? 0)) {
                this.items.splice(0, 0, ...timeline.items);
            }
            else {
                this.items.push(...timeline.items);
            }
        }
        else if (timeline.items.length !== 0) {
            updated = true;
            this.items.push(...timeline.items);
        }
        // If we are not requesting more recent items than we have, then update the cursor
        if (options.cursor !== undefined || typeof options.limit !== 'object') {
            this._cursor = timeline.paging?.cursor;
        }
        if (updated) {
            this.items.sort((a, b) => (b.timestamp - a.timestamp) ||
                (a.source === undefined
                    ? b.source === undefined ? 0 : 1
                    : b.source === undefined ? -1 : b.source.localeCompare(a.source, undefined, { numeric: true, sensitivity: 'base' })));
        }
        return updated;
    }
    get stale() {
        return this._stale;
    }
    get requiresReset() {
        return this._requiresReset;
    }
    invalidate(requiresReset) {
        this._stale = true;
        this._requiresReset = requiresReset;
    }
}
class LoadMoreCommand {
    constructor(loading) {
        this.handle = 'vscode-command:loadMore';
        this.timestamp = 0;
        this.description = undefined;
        this.tooltip = undefined;
        this.contextValue = undefined;
        // Make things easier for duck typing
        this.id = undefined;
        this.icon = undefined;
        this.iconDark = undefined;
        this.source = undefined;
        this.relativeTime = undefined;
        this.relativeTimeFullWord = undefined;
        this.hideRelativeTime = undefined;
        this._loading = false;
        this._loading = loading;
    }
    get loading() {
        return this._loading;
    }
    set loading(value) {
        this._loading = value;
    }
    get ariaLabel() {
        return this.label;
    }
    get label() {
        return this.loading ? localize('timeline.loadingMore', "Loading...") : localize('timeline.loadMore', "Load more");
    }
    get themeIcon() {
        return undefined;
    }
}
export const TimelineFollowActiveEditorContext = new RawContextKey('timelineFollowActiveEditor', true, true);
export const TimelineExcludeSources = new RawContextKey('timelineExcludeSources', '[]', true);
export const TimelineViewFocusedContext = new RawContextKey('timelineFocused', true);
let TimelinePane = class TimelinePane extends ViewPane {
    static { this.TITLE = localize2('timeline', "Timeline"); }
    constructor(options, keybindingService, contextMenuService, contextKeyService, configurationService, storageService, viewDescriptorService, instantiationService, editorService, commandService, progressService, timelineService, openerService, themeService, hoverService, labelService, uriIdentityService, extensionService) {
        super({ ...options, titleMenuId: MenuId.TimelineTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.storageService = storageService;
        this.editorService = editorService;
        this.commandService = commandService;
        this.progressService = progressService;
        this.timelineService = timelineService;
        this.labelService = labelService;
        this.uriIdentityService = uriIdentityService;
        this.extensionService = extensionService;
        this.pendingRequests = new Map();
        this.timelinesBySource = new Map();
        this._followActiveEditor = true;
        this._isEmpty = true;
        this._maxItemCount = 0;
        this._visibleItemCount = 0;
        this._pendingRefresh = false;
        this.commands = this._register(this.instantiationService.createInstance(TimelinePaneCommands, this));
        this.followActiveEditorContext = TimelineFollowActiveEditorContext.bindTo(this.contextKeyService);
        this.timelineExcludeSourcesContext = TimelineExcludeSources.bindTo(this.contextKeyService);
        const excludedSourcesString = storageService.get('timeline.excludeSources', 0 /* StorageScope.PROFILE */, '[]');
        this.timelineExcludeSourcesContext.set(excludedSourcesString);
        this.excludedSources = new Set(JSON.parse(excludedSourcesString));
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, 'timeline.excludeSources', this._store)(this.onStorageServiceChanged, this));
        this._register(configurationService.onDidChangeConfiguration(this.onConfigurationChanged, this));
        this._register(timelineService.onDidChangeProviders(this.onProvidersChanged, this));
        this._register(timelineService.onDidChangeTimeline(this.onTimelineChanged, this));
        this._register(timelineService.onDidChangeUri(uri => this.setUri(uri), this));
    }
    get followActiveEditor() {
        return this._followActiveEditor;
    }
    set followActiveEditor(value) {
        if (this._followActiveEditor === value) {
            return;
        }
        this._followActiveEditor = value;
        this.followActiveEditorContext.set(value);
        this.updateFilename(this._filename);
        if (value) {
            this.onActiveEditorChanged();
        }
    }
    get pageOnScroll() {
        if (this._pageOnScroll === undefined) {
            this._pageOnScroll = this.configurationService.getValue('timeline.pageOnScroll') ?? false;
        }
        return this._pageOnScroll;
    }
    get pageSize() {
        let pageSize = this.configurationService.getValue('timeline.pageSize');
        if (pageSize === undefined || pageSize === null) {
            // If we are paging when scrolling, then add an extra item to the end to make sure the "Load more" item is out of view
            pageSize = Math.max(20, Math.floor((this.tree?.renderHeight ?? 0 / ItemHeight) + (this.pageOnScroll ? 1 : -1)));
        }
        return pageSize;
    }
    reset() {
        this.loadTimeline(true);
    }
    setUri(uri) {
        this.setUriCore(uri, true);
    }
    setUriCore(uri, disableFollowing) {
        if (disableFollowing) {
            this.followActiveEditor = false;
        }
        this.uri = uri;
        this.updateFilename(uri ? this.labelService.getUriBasenameLabel(uri) : undefined);
        this.treeRenderer?.setUri(uri);
        this.loadTimeline(true);
    }
    onStorageServiceChanged() {
        const excludedSourcesString = this.storageService.get('timeline.excludeSources', 0 /* StorageScope.PROFILE */, '[]');
        this.timelineExcludeSourcesContext.set(excludedSourcesString);
        this.excludedSources = new Set(JSON.parse(excludedSourcesString));
        const missing = this.timelineService.getSources()
            .filter(({ id }) => !this.excludedSources.has(id) && !this.timelinesBySource.has(id));
        if (missing.length !== 0) {
            this.loadTimeline(true, missing.map(({ id }) => id));
        }
        else {
            this.refresh();
        }
    }
    onConfigurationChanged(e) {
        if (e.affectsConfiguration('timeline.pageOnScroll')) {
            this._pageOnScroll = undefined;
        }
    }
    onActiveEditorChanged() {
        if (!this.followActiveEditor || !this.isExpanded()) {
            return;
        }
        const uri = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if ((this.uriIdentityService.extUri.isEqual(uri, this.uri) && uri !== undefined) ||
            // Fallback to match on fsPath if we are dealing with files or git schemes
            (uri?.fsPath === this.uri?.fsPath && (uri?.scheme === Schemas.file || uri?.scheme === 'git') && (this.uri?.scheme === Schemas.file || this.uri?.scheme === 'git'))) {
            // If the uri hasn't changed, make sure we have valid caches
            for (const source of this.timelineService.getSources()) {
                if (this.excludedSources.has(source.id)) {
                    continue;
                }
                const timeline = this.timelinesBySource.get(source.id);
                if (timeline !== undefined && !timeline.stale) {
                    continue;
                }
                if (timeline !== undefined) {
                    this.updateTimeline(timeline, timeline.requiresReset);
                }
                else {
                    this.loadTimelineForSource(source.id, uri, true);
                }
            }
            return;
        }
        this.setUriCore(uri, false);
    }
    onProvidersChanged(e) {
        if (e.removed) {
            for (const source of e.removed) {
                this.timelinesBySource.delete(source);
            }
            this.refresh();
        }
        if (e.added) {
            this.loadTimeline(true, e.added);
        }
    }
    onTimelineChanged(e) {
        if (e?.uri === undefined || this.uriIdentityService.extUri.isEqual(URI.revive(e.uri), this.uri)) {
            const timeline = this.timelinesBySource.get(e.id);
            if (timeline === undefined) {
                return;
            }
            if (this.isBodyVisible()) {
                this.updateTimeline(timeline, e.reset);
            }
            else {
                timeline.invalidate(e.reset);
            }
        }
    }
    updateFilename(filename) {
        this._filename = filename;
        if (this.followActiveEditor || !filename) {
            this.updateTitleDescription(filename);
        }
        else {
            this.updateTitleDescription(`${filename} (pinned)`);
        }
    }
    get message() {
        return this._message;
    }
    set message(message) {
        this._message = message;
        this.updateMessage();
    }
    updateMessage() {
        if (this._message !== undefined) {
            this.showMessage(this._message);
        }
        else {
            this.hideMessage();
        }
    }
    showMessage(message) {
        if (!this.$message) {
            return;
        }
        this.$message.classList.remove('hide');
        this.resetMessageElement();
        this.$message.textContent = message;
    }
    hideMessage() {
        this.resetMessageElement();
        this.$message.classList.add('hide');
    }
    resetMessageElement() {
        DOM.clearNode(this.$message);
    }
    get hasVisibleItems() {
        return this._visibleItemCount > 0;
    }
    clear(cancelPending) {
        this._visibleItemCount = 0;
        this._maxItemCount = this.pageSize;
        this.timelinesBySource.clear();
        if (cancelPending) {
            for (const pendingRequest of this.pendingRequests.values()) {
                pendingRequest.request.tokenSource.cancel();
                pendingRequest.dispose();
            }
            this.pendingRequests.clear();
            if (!this.isBodyVisible() && this.tree) {
                this.tree.setChildren(null, undefined);
                this._isEmpty = true;
            }
        }
    }
    async loadTimeline(reset, sources) {
        // If we have no source, we are resetting all sources, so cancel everything in flight and reset caches
        if (sources === undefined) {
            if (reset) {
                this.clear(true);
            }
            // TODO@eamodio: Are these the right the list of schemes to exclude? Is there a better way?
            if (this.uri?.scheme === Schemas.vscodeSettings || this.uri?.scheme === Schemas.webviewPanel || this.uri?.scheme === Schemas.walkThrough) {
                this.uri = undefined;
                this.clear(false);
                this.refresh();
                return;
            }
            if (this._isEmpty && this.uri !== undefined) {
                this.setLoadingUriMessage();
            }
        }
        if (this.uri === undefined) {
            this.clear(false);
            this.refresh();
            return;
        }
        if (!this.isBodyVisible()) {
            return;
        }
        let hasPendingRequests = false;
        for (const source of sources ?? this.timelineService.getSources().map(s => s.id)) {
            const requested = this.loadTimelineForSource(source, this.uri, reset);
            if (requested) {
                hasPendingRequests = true;
            }
        }
        if (!hasPendingRequests) {
            this.refresh();
        }
        else if (this._isEmpty) {
            this.setLoadingUriMessage();
        }
    }
    loadTimelineForSource(source, uri, reset, options) {
        if (this.excludedSources.has(source)) {
            return false;
        }
        const timeline = this.timelinesBySource.get(source);
        // If we are paging, and there are no more items or we have enough cached items to cover the next page,
        // don't bother querying for more
        if (!reset &&
            options?.cursor !== undefined &&
            timeline !== undefined &&
            (!timeline?.more || timeline.items.length > timeline.lastRenderedIndex + this.pageSize)) {
            return false;
        }
        if (options === undefined) {
            if (!reset &&
                timeline !== undefined &&
                timeline.items.length > 0 &&
                !timeline.more) {
                // If we are not resetting, have item(s), and already know there are no more to fetch, we're done here
                return false;
            }
            options = { cursor: reset ? undefined : timeline?.cursor, limit: this.pageSize };
        }
        const pendingRequest = this.pendingRequests.get(source);
        if (pendingRequest !== undefined) {
            options.cursor = pendingRequest.request.options.cursor;
            // TODO@eamodio deal with concurrent requests better
            if (typeof options.limit === 'number') {
                if (typeof pendingRequest.request.options.limit === 'number') {
                    options.limit += pendingRequest.request.options.limit;
                }
                else {
                    options.limit = pendingRequest.request.options.limit;
                }
            }
        }
        pendingRequest?.request?.tokenSource.cancel();
        pendingRequest?.dispose();
        options.cacheResults = true;
        options.resetCache = reset;
        const tokenSource = new CancellationTokenSource();
        const newRequest = this.timelineService.getTimeline(source, uri, options, tokenSource);
        if (newRequest === undefined) {
            tokenSource.dispose();
            return false;
        }
        const disposables = new DisposableStore();
        this.pendingRequests.set(source, { request: newRequest, dispose: () => disposables.dispose() });
        disposables.add(tokenSource);
        disposables.add(tokenSource.token.onCancellationRequested(() => this.pendingRequests.delete(source)));
        this.handleRequest(newRequest);
        return true;
    }
    updateTimeline(timeline, reset) {
        if (reset) {
            this.timelinesBySource.delete(timeline.source);
            // Override the limit, to re-query for all our existing cached (possibly visible) items to keep visual continuity
            const { oldest } = timeline;
            this.loadTimelineForSource(timeline.source, this.uri, true, oldest !== undefined ? { limit: { timestamp: oldest.timestamp, id: oldest.id } } : undefined);
        }
        else {
            // Override the limit, to query for any newer items
            const { newest } = timeline;
            this.loadTimelineForSource(timeline.source, this.uri, false, newest !== undefined ? { limit: { timestamp: newest.timestamp, id: newest.id } } : { limit: this.pageSize });
        }
    }
    async handleRequest(request) {
        let response;
        try {
            response = await this.progressService.withProgress({ location: this.id }, () => request.result);
        }
        finally {
            this.pendingRequests.get(request.source)?.dispose();
            this.pendingRequests.delete(request.source);
        }
        if (response === undefined ||
            request.tokenSource.token.isCancellationRequested ||
            request.uri !== this.uri) {
            if (this.pendingRequests.size === 0 && this._pendingRefresh) {
                this.refresh();
            }
            return;
        }
        const source = request.source;
        let updated = false;
        const timeline = this.timelinesBySource.get(source);
        if (timeline === undefined) {
            this.timelinesBySource.set(source, new TimelineAggregate(response));
            updated = true;
        }
        else {
            updated = timeline.add(response, request.options);
        }
        if (updated) {
            this._pendingRefresh = true;
            // If we have visible items already and there are other pending requests, debounce for a bit to wait for other requests
            if (this.hasVisibleItems && this.pendingRequests.size !== 0) {
                this.refreshDebounced();
            }
            else {
                this.refresh();
            }
        }
        else if (this.pendingRequests.size === 0) {
            if (this._pendingRefresh) {
                this.refresh();
            }
            else {
                this.tree.rerender();
            }
        }
    }
    *getItems() {
        let more = false;
        if (this.uri === undefined || this.timelinesBySource.size === 0) {
            this._visibleItemCount = 0;
            return;
        }
        const maxCount = this._maxItemCount;
        let count = 0;
        if (this.timelinesBySource.size === 1) {
            const [source, timeline] = Iterable.first(this.timelinesBySource);
            timeline.lastRenderedIndex = -1;
            if (this.excludedSources.has(source)) {
                this._visibleItemCount = 0;
                return;
            }
            if (timeline.items.length !== 0) {
                // If we have any items, just say we have one for now -- the real count will be updated below
                this._visibleItemCount = 1;
            }
            more = timeline.more;
            let lastRelativeTime;
            for (const item of timeline.items) {
                item.relativeTime = undefined;
                item.hideRelativeTime = undefined;
                count++;
                if (count > maxCount) {
                    more = true;
                    break;
                }
                lastRelativeTime = updateRelativeTime(item, lastRelativeTime);
                yield { element: item };
            }
            timeline.lastRenderedIndex = count - 1;
        }
        else {
            const sources = [];
            let hasAnyItems = false;
            let mostRecentEnd = 0;
            for (const [source, timeline] of this.timelinesBySource) {
                timeline.lastRenderedIndex = -1;
                if (this.excludedSources.has(source) || timeline.stale) {
                    continue;
                }
                if (timeline.items.length !== 0) {
                    hasAnyItems = true;
                }
                if (timeline.more) {
                    more = true;
                    const last = timeline.items[Math.min(maxCount, timeline.items.length - 1)];
                    if (last.timestamp > mostRecentEnd) {
                        mostRecentEnd = last.timestamp;
                    }
                }
                const iterator = timeline.items[Symbol.iterator]();
                sources.push({ timeline, iterator, nextItem: iterator.next() });
            }
            this._visibleItemCount = hasAnyItems ? 1 : 0;
            function getNextMostRecentSource() {
                return sources
                    .filter(source => !source.nextItem.done)
                    .reduce((previous, current) => (previous === undefined || current.nextItem.value.timestamp >= previous.nextItem.value.timestamp) ? current : previous, undefined);
            }
            let lastRelativeTime;
            let nextSource;
            while (nextSource = getNextMostRecentSource()) {
                nextSource.timeline.lastRenderedIndex++;
                const item = nextSource.nextItem.value;
                item.relativeTime = undefined;
                item.hideRelativeTime = undefined;
                if (item.timestamp >= mostRecentEnd) {
                    count++;
                    if (count > maxCount) {
                        more = true;
                        break;
                    }
                    lastRelativeTime = updateRelativeTime(item, lastRelativeTime);
                    yield { element: item };
                }
                nextSource.nextItem = nextSource.iterator.next();
            }
        }
        this._visibleItemCount = count;
        if (count > 0) {
            if (more) {
                yield {
                    element: new LoadMoreCommand(this.pendingRequests.size !== 0)
                };
            }
            else if (this.pendingRequests.size !== 0) {
                yield {
                    element: new LoadMoreCommand(true)
                };
            }
        }
    }
    refresh() {
        if (!this.isBodyVisible()) {
            return;
        }
        this.tree.setChildren(null, this.getItems());
        this._isEmpty = !this.hasVisibleItems;
        if (this.uri === undefined) {
            this.updateFilename(undefined);
            this.message = localize('timeline.editorCannotProvideTimeline', "The active editor cannot provide timeline information.");
        }
        else if (this._isEmpty) {
            if (this.pendingRequests.size !== 0) {
                this.setLoadingUriMessage();
            }
            else {
                this.updateFilename(this.labelService.getUriBasenameLabel(this.uri));
                const scmProviderCount = this.contextKeyService.getContextKeyValue('scm.providerCount');
                if (this.timelineService.getSources().filter(({ id }) => !this.excludedSources.has(id)).length === 0) {
                    this.message = localize('timeline.noTimelineSourcesEnabled', "All timeline sources have been filtered out.");
                }
                else {
                    if (this.configurationService.getValue('workbench.localHistory.enabled') && !this.excludedSources.has('timeline.localHistory')) {
                        this.message = localize('timeline.noLocalHistoryYet', "Local History will track recent changes as you save them unless the file has been excluded or is too large.");
                    }
                    else if (this.excludedSources.size > 0) {
                        this.message = localize('timeline.noTimelineInfoFromEnabledSources', "No filtered timeline information was provided.");
                    }
                    else {
                        this.message = localize('timeline.noTimelineInfo', "No timeline information was provided.");
                    }
                }
                if (!scmProviderCount || scmProviderCount === 0) {
                    this.message += ' ' + localize('timeline.noSCM', "Source Control has not been configured.");
                }
            }
        }
        else {
            this.updateFilename(this.labelService.getUriBasenameLabel(this.uri));
            this.message = undefined;
        }
        this._pendingRefresh = false;
    }
    refreshDebounced() {
        this.refresh();
    }
    focus() {
        super.focus();
        this.tree.domFocus();
    }
    setExpanded(expanded) {
        const changed = super.setExpanded(expanded);
        if (changed && this.isBodyVisible()) {
            if (!this.followActiveEditor) {
                this.setUriCore(this.uri, true);
            }
            else {
                this.onActiveEditorChanged();
            }
        }
        return changed;
    }
    setVisible(visible) {
        if (visible) {
            this.extensionService.activateByEvent('onView:timeline');
            this.visibilityDisposables = new DisposableStore();
            this.editorService.onDidActiveEditorChange(this.onActiveEditorChanged, this, this.visibilityDisposables);
            // Refresh the view on focus to update the relative timestamps
            this.onDidFocus(() => this.refreshDebounced(), this, this.visibilityDisposables);
            super.setVisible(visible);
            this.onActiveEditorChanged();
        }
        else {
            this.visibilityDisposables?.dispose();
            super.setVisible(visible);
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    renderHeaderTitle(container) {
        super.renderHeaderTitle(container, this.title);
        container.classList.add('timeline-view');
    }
    renderBody(container) {
        super.renderBody(container);
        this.$container = container;
        container.classList.add('tree-explorer-viewlet-tree-view', 'timeline-tree-view');
        this.$message = DOM.append(this.$container, DOM.$('.message'));
        this.$message.classList.add('timeline-subtle');
        this.message = localize('timeline.editorCannotProvideTimeline', "The active editor cannot provide timeline information.");
        this.$tree = document.createElement('div');
        this.$tree.classList.add('customview-tree', 'file-icon-themable-tree', 'hide-arrows');
        // this.treeElement.classList.add('show-file-icons');
        container.appendChild(this.$tree);
        this.treeRenderer = this.instantiationService.createInstance(TimelineTreeRenderer, this.commands);
        this._register(this.treeRenderer.onDidScrollToEnd(item => {
            if (this.pageOnScroll) {
                this.loadMore(item);
            }
        }));
        this.tree = this.instantiationService.createInstance((WorkbenchObjectTree), 'TimelinePane', this.$tree, new TimelineListVirtualDelegate(), [this.treeRenderer], {
            identityProvider: new TimelineIdentityProvider(),
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (isLoadMoreCommand(element)) {
                        return element.ariaLabel;
                    }
                    return element.accessibilityInformation ? element.accessibilityInformation.label : localize('timeline.aria.item', "{0}: {1}", element.relativeTimeFullWord ?? '', element.label);
                },
                getRole(element) {
                    if (isLoadMoreCommand(element)) {
                        return 'treeitem';
                    }
                    return element.accessibilityInformation && element.accessibilityInformation.role ? element.accessibilityInformation.role : 'treeitem';
                },
                getWidgetAriaLabel() {
                    return localize('timeline', "Timeline");
                }
            },
            keyboardNavigationLabelProvider: new TimelineKeyboardNavigationLabelProvider(),
            multipleSelectionSupport: false,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
        });
        TimelineViewFocusedContext.bindTo(this.tree.contextKeyService);
        this._register(this.tree.onContextMenu(e => this.onContextMenu(this.commands, e)));
        this._register(this.tree.onDidChangeSelection(e => this.ensureValidItems()));
        this._register(this.tree.onDidOpen(e => {
            if (!e.browserEvent || !this.ensureValidItems()) {
                return;
            }
            const selection = this.tree.getSelection();
            let item;
            if (selection.length === 1) {
                item = selection[0];
            }
            if (item === null) {
                return;
            }
            if (isTimelineItem(item)) {
                if (item.command) {
                    let args = item.command.arguments ?? [];
                    if (item.command.id === API_OPEN_EDITOR_COMMAND_ID || item.command.id === API_OPEN_DIFF_EDITOR_COMMAND_ID) {
                        // Some commands owned by us should receive the
                        // `IOpenEvent` as context to open properly
                        args = [...args, e];
                    }
                    this.commandService.executeCommand(item.command.id, ...args);
                }
            }
            else if (isLoadMoreCommand(item)) {
                this.loadMore(item);
            }
        }));
    }
    loadMore(item) {
        if (item.loading) {
            return;
        }
        item.loading = true;
        this.tree.rerender(item);
        if (this.pendingRequests.size !== 0) {
            return;
        }
        this._maxItemCount = this._visibleItemCount + this.pageSize;
        this.loadTimeline(false);
    }
    ensureValidItems() {
        // If we don't have any non-excluded timelines, clear the tree and show the loading message
        if (!this.hasVisibleItems || !this.timelineService.getSources().some(({ id }) => !this.excludedSources.has(id) && this.timelinesBySource.has(id))) {
            this.tree.setChildren(null, undefined);
            this._isEmpty = true;
            this.setLoadingUriMessage();
            return false;
        }
        return true;
    }
    setLoadingUriMessage() {
        const file = this.uri && this.labelService.getUriBasenameLabel(this.uri);
        this.updateFilename(file);
        this.message = file ? localize('timeline.loading', "Loading timeline for {0}...", file) : '';
    }
    onContextMenu(commands, treeEvent) {
        const item = treeEvent.element;
        if (item === null) {
            return;
        }
        const event = treeEvent.browserEvent;
        event.preventDefault();
        event.stopPropagation();
        if (!this.ensureValidItems()) {
            return;
        }
        this.tree.setFocus([item]);
        const actions = commands.getItemContextActions(item);
        if (!actions.length) {
            return;
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => treeEvent.anchor,
            getActions: () => actions,
            getActionViewItem: (action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                if (keybinding) {
                    return new ActionViewItem(action, action, { label: true, keybinding: keybinding.getLabel() });
                }
                return undefined;
            },
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.tree.domFocus();
                }
            },
            getActionsContext: () => ({ uri: this.uri, item }),
            actionRunner: new TimelineActionRunner()
        });
    }
};
__decorate([
    debounce(500)
], TimelinePane.prototype, "refreshDebounced", null);
TimelinePane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IStorageService),
    __param(6, IViewDescriptorService),
    __param(7, IInstantiationService),
    __param(8, IEditorService),
    __param(9, ICommandService),
    __param(10, IProgressService),
    __param(11, ITimelineService),
    __param(12, IOpenerService),
    __param(13, IThemeService),
    __param(14, IHoverService),
    __param(15, ILabelService),
    __param(16, IUriIdentityService),
    __param(17, IExtensionService)
], TimelinePane);
export { TimelinePane };
class TimelineElementTemplate {
    static { this.id = 'TimelineElementTemplate'; }
    constructor(container, actionViewItemProvider, hoverDelegate) {
        container.classList.add('custom-view-tree-node-item');
        this.icon = DOM.append(container, DOM.$('.custom-view-tree-node-item-icon'));
        this.iconLabel = new IconLabel(container, { supportHighlights: true, supportIcons: true, hoverDelegate });
        const timestampContainer = DOM.append(this.iconLabel.element, DOM.$('.timeline-timestamp-container'));
        this.timestamp = DOM.append(timestampContainer, DOM.$('span.timeline-timestamp'));
        const actionsContainer = DOM.append(this.iconLabel.element, DOM.$('.actions'));
        this.actionBar = new ActionBar(actionsContainer, { actionViewItemProvider });
    }
    dispose() {
        this.iconLabel.dispose();
        this.actionBar.dispose();
    }
    reset() {
        this.icon.className = '';
        this.icon.style.backgroundImage = '';
        this.actionBar.clear();
    }
}
export class TimelineIdentityProvider {
    getId(item) {
        return item.handle;
    }
}
class TimelineActionRunner extends ActionRunner {
    async runAction(action, { uri, item }) {
        if (!isTimelineItem(item)) {
            // TODO@eamodio do we need to do anything else?
            await action.run();
            return;
        }
        await action.run({
            $mid: 12 /* MarshalledId.TimelineActionContext */,
            handle: item.handle,
            source: item.source,
            uri
        }, uri, item.source);
    }
}
export class TimelineKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element.label;
    }
}
export class TimelineListVirtualDelegate {
    getHeight(_element) {
        return ItemHeight;
    }
    getTemplateId(element) {
        return TimelineElementTemplate.id;
    }
}
let TimelineTreeRenderer = class TimelineTreeRenderer {
    constructor(commands, instantiationService, themeService) {
        this.commands = commands;
        this.instantiationService = instantiationService;
        this.themeService = themeService;
        this._onDidScrollToEnd = new Emitter();
        this.onDidScrollToEnd = this._onDidScrollToEnd.event;
        this.templateId = TimelineElementTemplate.id;
        this.actionViewItemProvider = createActionViewItem.bind(undefined, this.instantiationService);
        this._hoverDelegate = this.instantiationService.createInstance(WorkbenchHoverDelegate, 'element', { instantHover: true }, {
            position: {
                hoverPosition: 1 /* HoverPosition.RIGHT */ // Will flip when there's no space
            }
        });
    }
    setUri(uri) {
        this.uri = uri;
    }
    renderTemplate(container) {
        return new TimelineElementTemplate(container, this.actionViewItemProvider, this._hoverDelegate);
    }
    renderElement(node, index, template, height) {
        template.reset();
        const { element: item } = node;
        const theme = this.themeService.getColorTheme();
        const icon = theme.type === ColorScheme.LIGHT ? item.icon : item.iconDark;
        const iconUrl = icon ? URI.revive(icon) : null;
        if (iconUrl) {
            template.icon.className = 'custom-view-tree-node-item-icon';
            template.icon.style.backgroundImage = css.asCSSUrl(iconUrl);
            template.icon.style.color = '';
        }
        else if (item.themeIcon) {
            template.icon.className = `custom-view-tree-node-item-icon ${ThemeIcon.asClassName(item.themeIcon)}`;
            if (item.themeIcon.color) {
                template.icon.style.color = theme.getColor(item.themeIcon.color.id)?.toString() ?? '';
            }
            else {
                template.icon.style.color = '';
            }
            template.icon.style.backgroundImage = '';
        }
        else {
            template.icon.className = 'custom-view-tree-node-item-icon';
            template.icon.style.backgroundImage = '';
            template.icon.style.color = '';
        }
        const tooltip = item.tooltip
            ? isString(item.tooltip)
                ? item.tooltip
                : { markdown: item.tooltip, markdownNotSupportedFallback: renderMarkdownAsPlaintext(item.tooltip) }
            : undefined;
        template.iconLabel.setLabel(item.label, item.description, {
            title: tooltip,
            matches: createMatches(node.filterData)
        });
        template.timestamp.textContent = item.relativeTime ?? '';
        template.timestamp.ariaLabel = item.relativeTimeFullWord ?? '';
        template.timestamp.parentElement.classList.toggle('timeline-timestamp--duplicate', isTimelineItem(item) && item.hideRelativeTime);
        template.actionBar.context = { uri: this.uri, item };
        template.actionBar.actionRunner = new TimelineActionRunner();
        template.actionBar.push(this.commands.getItemActions(item), { icon: true, label: false });
        // If we are rendering the load more item, we've scrolled to the end, so trigger an event
        if (isLoadMoreCommand(item)) {
            setTimeout(() => this._onDidScrollToEnd.fire(item), 0);
        }
    }
    disposeElement(element, index, templateData, height) {
        templateData.actionBar.actionRunner.dispose();
    }
    disposeTemplate(template) {
        template.dispose();
    }
};
TimelineTreeRenderer = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService)
], TimelineTreeRenderer);
const timelineRefresh = registerIcon('timeline-refresh', Codicon.refresh, localize('timelineRefresh', 'Icon for the refresh timeline action.'));
const timelinePin = registerIcon('timeline-pin', Codicon.pin, localize('timelinePin', 'Icon for the pin timeline action.'));
const timelineUnpin = registerIcon('timeline-unpin', Codicon.pinned, localize('timelineUnpin', 'Icon for the unpin timeline action.'));
let TimelinePaneCommands = class TimelinePaneCommands extends Disposable {
    constructor(pane, timelineService, storageService, contextKeyService, menuService) {
        super();
        this.pane = pane;
        this.timelineService = timelineService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this._register(this.sourceDisposables = new DisposableStore());
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'timeline.refresh',
                    title: localize2('refresh', "Refresh"),
                    icon: timelineRefresh,
                    category: localize2('timeline', "Timeline"),
                    menu: {
                        id: MenuId.TimelineTitle,
                        group: 'navigation',
                        order: 99,
                    }
                });
            }
            run(accessor, ...args) {
                pane.reset();
            }
        }));
        this._register(CommandsRegistry.registerCommand('timeline.toggleFollowActiveEditor', (accessor, ...args) => pane.followActiveEditor = !pane.followActiveEditor));
        this._register(MenuRegistry.appendMenuItem(MenuId.TimelineTitle, ({
            command: {
                id: 'timeline.toggleFollowActiveEditor',
                title: localize2('timeline.toggleFollowActiveEditorCommand.follow', 'Pin the Current Timeline'),
                icon: timelinePin,
                category: localize2('timeline', "Timeline"),
            },
            group: 'navigation',
            order: 98,
            when: TimelineFollowActiveEditorContext
        })));
        this._register(MenuRegistry.appendMenuItem(MenuId.TimelineTitle, ({
            command: {
                id: 'timeline.toggleFollowActiveEditor',
                title: localize2('timeline.toggleFollowActiveEditorCommand.unfollow', 'Unpin the Current Timeline'),
                icon: timelineUnpin,
                category: localize2('timeline', "Timeline"),
            },
            group: 'navigation',
            order: 98,
            when: TimelineFollowActiveEditorContext.toNegated()
        })));
        this._register(timelineService.onDidChangeProviders(() => this.updateTimelineSourceFilters()));
        this.updateTimelineSourceFilters();
    }
    getItemActions(element) {
        return this.getActions(MenuId.TimelineItemContext, { key: 'timelineItem', value: element.contextValue }).primary;
    }
    getItemContextActions(element) {
        return this.getActions(MenuId.TimelineItemContext, { key: 'timelineItem', value: element.contextValue }).secondary;
    }
    getActions(menuId, context) {
        const contextKeyService = this.contextKeyService.createOverlay([
            ['view', this.pane.id],
            [context.key, context.value],
        ]);
        const menu = this.menuService.getMenuActions(menuId, contextKeyService, { shouldForwardArgs: true });
        return getContextMenuActions(menu, 'inline');
    }
    updateTimelineSourceFilters() {
        this.sourceDisposables.clear();
        const excluded = new Set(JSON.parse(this.storageService.get('timeline.excludeSources', 0 /* StorageScope.PROFILE */, '[]')));
        for (const source of this.timelineService.getSources()) {
            this.sourceDisposables.add(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: `timeline.toggleExcludeSource:${source.id}`,
                        title: source.label,
                        menu: {
                            id: MenuId.TimelineFilterSubMenu,
                            group: 'navigation',
                        },
                        toggled: ContextKeyExpr.regex(`timelineExcludeSources`, new RegExp(`\\b${escapeRegExpCharacters(source.id)}\\b`)).negate()
                    });
                }
                run(accessor, ...args) {
                    if (excluded.has(source.id)) {
                        excluded.delete(source.id);
                    }
                    else {
                        excluded.add(source.id);
                    }
                    const storageService = accessor.get(IStorageService);
                    storageService.store('timeline.excludeSources', JSON.stringify([...excluded.keys()]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                }
            }));
        }
    }
};
TimelinePaneCommands = __decorate([
    __param(1, ITimelineService),
    __param(2, IStorageService),
    __param(3, IContextKeyService),
    __param(4, IMenuService)
], TimelinePaneCommands);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmVQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGltZWxpbmUvYnJvd3Nlci90aW1lbGluZVBhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLEdBQUcsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQVcsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFlLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFN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