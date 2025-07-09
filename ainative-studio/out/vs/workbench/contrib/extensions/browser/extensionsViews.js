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
var ExtensionsListView_1;
import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore, isDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { isCancellationError, getErrorMessage, CancellationError } from '../../../../base/common/errors.js';
import { createErrorWithActions } from '../../../../base/common/errorMessage.js';
import { PagedModel, DelayedPagedModel } from '../../../../base/common/paging.js';
import { ExtensionGalleryError } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionManagementServerService, IWorkbenchExtensionManagementService, IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { areSameExtensions, getExtensionDependencies } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { append, $ } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Delegate, Renderer } from './extensionsList.js';
import { ExtensionResultsListFocused, IExtensionsWorkbenchService } from '../common/extensions.js';
import { Query } from '../common/extensionQuery.js';
import { IExtensionService, toExtension } from '../../../services/extensions/common/extensions.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { ManageExtensionAction, getContextMenuActions, ExtensionAction } from './extensionsActions.js';
import { WorkbenchPagedList } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { ViewPane, ViewPaneShowActions } from '../../../browser/parts/views/viewPane.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { coalesce, distinct, range } from '../../../../base/common/arrays.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Action, Separator, ActionRunner } from '../../../../base/common/actions.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, isLanguagePackExtension } from '../../../../platform/extensions/common/extensions.js';
import { createCancelablePromise, ThrottledDelayer } from '../../../../base/common/async.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isOfflineError } from '../../../../base/parts/request/common/request.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { isString } from '../../../../base/common/types.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
export const NONE_CATEGORY = 'none';
class ExtensionsViewState extends Disposable {
    constructor() {
        super(...arguments);
        this._onFocus = this._register(new Emitter());
        this.onFocus = this._onFocus.event;
        this._onBlur = this._register(new Emitter());
        this.onBlur = this._onBlur.event;
        this.currentlyFocusedItems = [];
        this.filters = {};
    }
    onFocusChange(extensions) {
        this.currentlyFocusedItems.forEach(extension => this._onBlur.fire(extension));
        this.currentlyFocusedItems = extensions;
        this.currentlyFocusedItems.forEach(extension => this._onFocus.fire(extension));
    }
}
var LocalSortBy;
(function (LocalSortBy) {
    LocalSortBy["UpdateDate"] = "UpdateDate";
})(LocalSortBy || (LocalSortBy = {}));
function isLocalSortBy(value) {
    switch (value) {
        case "UpdateDate" /* LocalSortBy.UpdateDate */: return true;
    }
}
let ExtensionsListView = class ExtensionsListView extends ViewPane {
    static { ExtensionsListView_1 = this; }
    static { this.RECENT_UPDATE_DURATION = 7 * 24 * 60 * 60 * 1000; } // 7 days
    constructor(options, viewletViewOptions, notificationService, keybindingService, contextMenuService, instantiationService, themeService, extensionService, extensionsWorkbenchService, extensionRecommendationsService, telemetryService, hoverService, configurationService, contextService, extensionManagementServerService, extensionManifestPropertiesService, extensionManagementService, workspaceService, productService, contextKeyService, viewDescriptorService, openerService, preferencesService, storageService, workspaceTrustManagementService, extensionEnablementService, layoutService, extensionFeaturesManagementService, uriIdentityService, logService) {
        super({
            ...viewletViewOptions,
            showActions: ViewPaneShowActions.Always,
            maximumBodySize: options.flexibleHeight ? (storageService.getNumber(`${viewletViewOptions.id}.size`, 0 /* StorageScope.PROFILE */, 0) ? undefined : 0) : undefined
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.options = options;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionRecommendationsService = extensionRecommendationsService;
        this.telemetryService = telemetryService;
        this.contextService = contextService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.extensionManagementService = extensionManagementService;
        this.workspaceService = workspaceService;
        this.productService = productService;
        this.preferencesService = preferencesService;
        this.storageService = storageService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.layoutService = layoutService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.list = null;
        this.queryRequest = null;
        this.contextMenuActionRunner = this._register(new ActionRunner());
        if (this.options.onDidChangeTitle) {
            this._register(this.options.onDidChangeTitle(title => this.updateTitle(title)));
        }
        this._register(this.contextMenuActionRunner.onDidRun(({ error }) => error && this.notificationService.error(error)));
        this.registerActions();
    }
    registerActions() { }
    renderHeader(container) {
        container.classList.add('extension-view-header');
        super.renderHeader(container);
        if (!this.options.hideBadge) {
            this.badge = this._register(new CountBadge(append(container, $('.count-badge-wrapper')), {}, defaultCountBadgeStyles));
        }
    }
    renderBody(container) {
        super.renderBody(container);
        const messageContainer = append(container, $('.message-container'));
        const messageSeverityIcon = append(messageContainer, $(''));
        const messageBox = append(messageContainer, $('.message'));
        const extensionsList = append(container, $('.extensions-list'));
        const delegate = new Delegate();
        this.extensionsViewState = new ExtensionsViewState();
        const renderer = this.instantiationService.createInstance(Renderer, this.extensionsViewState, {
            hoverOptions: {
                position: () => {
                    const viewLocation = this.viewDescriptorService.getViewLocationById(this.id);
                    if (viewLocation === 0 /* ViewContainerLocation.Sidebar */) {
                        return this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */ ? 1 /* HoverPosition.RIGHT */ : 0 /* HoverPosition.LEFT */;
                    }
                    if (viewLocation === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                        return this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */ ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */;
                    }
                    return 1 /* HoverPosition.RIGHT */;
                }
            }
        });
        this.list = this.instantiationService.createInstance(WorkbenchPagedList, 'Extensions', extensionsList, delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(extension) {
                    return getAriaLabelForExtension(extension);
                },
                getWidgetAriaLabel() {
                    return localize('extensions', "Extensions");
                }
            },
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            openOnSingleClick: true
        });
        ExtensionResultsListFocused.bindTo(this.list.contextKeyService);
        this._register(this.list.onContextMenu(e => this.onContextMenu(e), this));
        this._register(this.list.onDidChangeFocus(e => this.extensionsViewState?.onFocusChange(coalesce(e.elements)), this));
        this._register(this.list);
        this._register(this.extensionsViewState);
        this._register(Event.debounce(Event.filter(this.list.onDidOpen, e => e.element !== null), (_, event) => event, 75, true)(options => {
            this.openExtension(options.element, { sideByside: options.sideBySide, ...options.editorOptions });
        }));
        this.bodyTemplate = {
            extensionsList,
            messageBox,
            messageContainer,
            messageSeverityIcon
        };
        if (this.queryResult) {
            this.setModel(this.queryResult.model);
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        if (this.bodyTemplate) {
            this.bodyTemplate.extensionsList.style.height = height + 'px';
        }
        this.list?.layout(height, width);
    }
    async show(query, refresh) {
        if (this.queryRequest) {
            if (!refresh && this.queryRequest.query === query) {
                return this.queryRequest.request;
            }
            this.queryRequest.request.cancel();
            this.queryRequest = null;
        }
        if (this.queryResult) {
            this.queryResult.disposables.dispose();
            this.queryResult = undefined;
            if (this.extensionsViewState) {
                this.extensionsViewState.filters = {};
            }
        }
        const parsedQuery = Query.parse(query);
        const options = {
            sortOrder: 0 /* SortOrder.Default */
        };
        switch (parsedQuery.sortBy) {
            case 'installs':
                options.sortBy = "InstallCount" /* GallerySortBy.InstallCount */;
                break;
            case 'rating':
                options.sortBy = "WeightedRating" /* GallerySortBy.WeightedRating */;
                break;
            case 'name':
                options.sortBy = "Title" /* GallerySortBy.Title */;
                break;
            case 'publishedDate':
                options.sortBy = "PublishedDate" /* GallerySortBy.PublishedDate */;
                break;
            case 'updateDate':
                options.sortBy = "UpdateDate" /* LocalSortBy.UpdateDate */;
                break;
        }
        const request = createCancelablePromise(async (token) => {
            try {
                this.queryResult = await this.query(parsedQuery, options, token);
                const model = this.queryResult.model;
                this.setModel(model, this.queryResult.description ? { text: this.queryResult.description, severity: Severity.Info } : undefined);
                if (this.queryResult.onDidChangeModel) {
                    this.queryResult.disposables.add(this.queryResult.onDidChangeModel(model => {
                        if (this.queryResult) {
                            this.queryResult.model = model;
                            this.updateModel(model);
                        }
                    }));
                }
                return model;
            }
            catch (e) {
                const model = new PagedModel([]);
                if (!isCancellationError(e)) {
                    this.logService.error(e);
                    this.setModel(model, this.getMessage(e));
                }
                return this.list ? this.list.model : model;
            }
        });
        request.finally(() => this.queryRequest = null);
        this.queryRequest = { query, request };
        return request;
    }
    count() {
        return this.queryResult?.model.length ?? 0;
    }
    showEmptyModel() {
        const emptyModel = new PagedModel([]);
        this.setModel(emptyModel);
        return Promise.resolve(emptyModel);
    }
    async onContextMenu(e) {
        if (e.element) {
            const disposables = new DisposableStore();
            const manageExtensionAction = disposables.add(this.instantiationService.createInstance(ManageExtensionAction));
            const extension = e.element ? this.extensionsWorkbenchService.local.find(local => areSameExtensions(local.identifier, e.element.identifier) && (!e.element.server || e.element.server === local.server)) || e.element
                : e.element;
            manageExtensionAction.extension = extension;
            let groups = [];
            if (manageExtensionAction.enabled) {
                groups = await manageExtensionAction.getActionGroups();
            }
            else if (extension) {
                groups = await getContextMenuActions(extension, this.contextKeyService, this.instantiationService);
                groups.forEach(group => group.forEach(extensionAction => {
                    if (extensionAction instanceof ExtensionAction) {
                        extensionAction.extension = extension;
                    }
                }));
            }
            const actions = [];
            for (const menuActions of groups) {
                for (const menuAction of menuActions) {
                    actions.push(menuAction);
                    if (isDisposable(menuAction)) {
                        disposables.add(menuAction);
                    }
                }
                actions.push(new Separator());
            }
            actions.pop();
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions,
                actionRunner: this.contextMenuActionRunner,
                onHide: () => disposables.dispose()
            });
        }
    }
    async query(query, options, token) {
        const idRegex = /@id:(([a-z0-9A-Z][a-z0-9\-A-Z]*)\.([a-z0-9A-Z][a-z0-9\-A-Z]*))/g;
        const ids = [];
        let idMatch;
        while ((idMatch = idRegex.exec(query.value)) !== null) {
            const name = idMatch[1];
            ids.push(name);
        }
        if (ids.length) {
            const model = await this.queryByIds(ids, options, token);
            return { model, disposables: new DisposableStore() };
        }
        if (ExtensionsListView_1.isLocalExtensionsQuery(query.value, query.sortBy)) {
            return this.queryLocal(query, options);
        }
        if (ExtensionsListView_1.isSearchPopularQuery(query.value)) {
            query.value = query.value.replace('@popular', '');
            options.sortBy = !options.sortBy ? "InstallCount" /* GallerySortBy.InstallCount */ : options.sortBy;
        }
        else if (ExtensionsListView_1.isSearchRecentlyPublishedQuery(query.value)) {
            query.value = query.value.replace('@recentlyPublished', '');
            options.sortBy = !options.sortBy ? "PublishedDate" /* GallerySortBy.PublishedDate */ : options.sortBy;
        }
        const galleryQueryOptions = { ...options, sortBy: isLocalSortBy(options.sortBy) ? undefined : options.sortBy };
        const model = await this.queryGallery(query, galleryQueryOptions, token);
        return { model, disposables: new DisposableStore() };
    }
    async queryByIds(ids, options, token) {
        const idsSet = ids.reduce((result, id) => { result.add(id.toLowerCase()); return result; }, new Set());
        const result = (await this.extensionsWorkbenchService.queryLocal(this.options.server))
            .filter(e => idsSet.has(e.identifier.id.toLowerCase()));
        const galleryIds = result.length ? ids.filter(id => result.every(r => !areSameExtensions(r.identifier, { id }))) : ids;
        if (galleryIds.length) {
            const galleryResult = await this.extensionsWorkbenchService.getExtensions(galleryIds.map(id => ({ id })), { source: 'queryById' }, token);
            result.push(...galleryResult);
        }
        return new PagedModel(result);
    }
    async queryLocal(query, options) {
        const local = await this.extensionsWorkbenchService.queryLocal(this.options.server);
        let { extensions, canIncludeInstalledExtensions, description } = await this.filterLocal(local, this.extensionService.extensions, query, options);
        const disposables = new DisposableStore();
        const onDidChangeModel = disposables.add(new Emitter());
        if (canIncludeInstalledExtensions) {
            let isDisposed = false;
            disposables.add(toDisposable(() => isDisposed = true));
            disposables.add(Event.debounce(Event.any(Event.filter(this.extensionsWorkbenchService.onChange, e => e?.state === 1 /* ExtensionState.Installed */), this.extensionService.onDidChangeExtensions), () => undefined)(async () => {
                const local = this.options.server ? this.extensionsWorkbenchService.installed.filter(e => e.server === this.options.server) : this.extensionsWorkbenchService.local;
                const { extensions: newExtensions } = await this.filterLocal(local, this.extensionService.extensions, query, options);
                if (!isDisposed) {
                    const mergedExtensions = this.mergeAddedExtensions(extensions, newExtensions);
                    if (mergedExtensions) {
                        extensions = mergedExtensions;
                        onDidChangeModel.fire(new PagedModel(extensions));
                    }
                }
            }));
        }
        return {
            model: new PagedModel(extensions),
            description,
            onDidChangeModel: onDidChangeModel.event,
            disposables
        };
    }
    async filterLocal(local, runningExtensions, query, options) {
        const value = query.value;
        let extensions = [];
        let canIncludeInstalledExtensions = true;
        let description;
        if (/@builtin/i.test(value)) {
            extensions = this.filterBuiltinExtensions(local, query, options);
            canIncludeInstalledExtensions = false;
        }
        else if (/@installed/i.test(value)) {
            extensions = this.filterInstalledExtensions(local, runningExtensions, query, options);
        }
        else if (/@outdated/i.test(value)) {
            extensions = this.filterOutdatedExtensions(local, query, options);
        }
        else if (/@disabled/i.test(value)) {
            extensions = this.filterDisabledExtensions(local, runningExtensions, query, options);
        }
        else if (/@enabled/i.test(value)) {
            extensions = this.filterEnabledExtensions(local, runningExtensions, query, options);
        }
        else if (/@workspaceUnsupported/i.test(value)) {
            extensions = this.filterWorkspaceUnsupportedExtensions(local, query, options);
        }
        else if (/@deprecated/i.test(query.value)) {
            extensions = await this.filterDeprecatedExtensions(local, query, options);
        }
        else if (/@recentlyUpdated/i.test(query.value)) {
            extensions = this.filterRecentlyUpdatedExtensions(local, query, options);
        }
        else if (/@feature:/i.test(query.value)) {
            const result = this.filterExtensionsByFeature(local, query);
            if (result) {
                extensions = result.extensions;
                description = result.description;
            }
        }
        return { extensions, canIncludeInstalledExtensions, description };
    }
    filterBuiltinExtensions(local, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value.replace(/@builtin/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const result = local
            .filter(e => e.isBuiltin && (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterExtensionByCategory(e, includedCategories, excludedCategories) {
        if (!includedCategories.length && !excludedCategories.length) {
            return true;
        }
        if (e.categories.length) {
            if (excludedCategories.length && e.categories.some(category => excludedCategories.includes(category.toLowerCase()))) {
                return false;
            }
            return e.categories.some(category => includedCategories.includes(category.toLowerCase()));
        }
        else {
            return includedCategories.includes(NONE_CATEGORY);
        }
    }
    parseCategories(value) {
        const includedCategories = [];
        const excludedCategories = [];
        value = value.replace(/\bcategory:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedCategory, category) => {
            const entry = (category || quotedCategory || '').toLowerCase();
            if (entry.startsWith('-')) {
                if (excludedCategories.indexOf(entry) === -1) {
                    excludedCategories.push(entry);
                }
            }
            else {
                if (includedCategories.indexOf(entry) === -1) {
                    includedCategories.push(entry);
                }
            }
            return '';
        });
        return { value, includedCategories, excludedCategories };
    }
    filterInstalledExtensions(local, runningExtensions, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value.replace(/@installed/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const matchingText = (e) => (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1 || e.description.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories);
        let result;
        if (options.sortBy !== undefined) {
            result = local.filter(e => !e.isBuiltin && matchingText(e));
            result = this.sortExtensions(result, options);
        }
        else {
            result = local.filter(e => (!e.isBuiltin || e.outdated || e.runtimeState !== undefined) && matchingText(e));
            const runningExtensionsById = runningExtensions.reduce((result, e) => { result.set(e.identifier.value, e); return result; }, new ExtensionIdentifierMap());
            const defaultSort = (e1, e2) => {
                const running1 = runningExtensionsById.get(e1.identifier.id);
                const isE1Running = !!running1 && this.extensionManagementServerService.getExtensionManagementServer(toExtension(running1)) === e1.server;
                const running2 = runningExtensionsById.get(e2.identifier.id);
                const isE2Running = running2 && this.extensionManagementServerService.getExtensionManagementServer(toExtension(running2)) === e2.server;
                if ((isE1Running && isE2Running)) {
                    return e1.displayName.localeCompare(e2.displayName);
                }
                const isE1LanguagePackExtension = e1.local && isLanguagePackExtension(e1.local.manifest);
                const isE2LanguagePackExtension = e2.local && isLanguagePackExtension(e2.local.manifest);
                if (!isE1Running && !isE2Running) {
                    if (isE1LanguagePackExtension) {
                        return -1;
                    }
                    if (isE2LanguagePackExtension) {
                        return 1;
                    }
                    return e1.displayName.localeCompare(e2.displayName);
                }
                if ((isE1Running && isE2LanguagePackExtension) || (isE2Running && isE1LanguagePackExtension)) {
                    return e1.displayName.localeCompare(e2.displayName);
                }
                return isE1Running ? -1 : 1;
            };
            const incompatible = [];
            const deprecated = [];
            const outdated = [];
            const actionRequired = [];
            const noActionRequired = [];
            for (const e of result) {
                if (e.enablementState === 6 /* EnablementState.DisabledByInvalidExtension */) {
                    incompatible.push(e);
                }
                else if (e.deprecationInfo) {
                    deprecated.push(e);
                }
                else if (e.outdated && this.extensionEnablementService.isEnabledEnablementState(e.enablementState)) {
                    outdated.push(e);
                }
                else if (e.runtimeState) {
                    actionRequired.push(e);
                }
                else {
                    noActionRequired.push(e);
                }
            }
            result = [
                ...incompatible.sort(defaultSort),
                ...deprecated.sort(defaultSort),
                ...outdated.sort(defaultSort),
                ...actionRequired.sort(defaultSort),
                ...noActionRequired.sort(defaultSort)
            ];
        }
        return result;
    }
    filterOutdatedExtensions(local, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value.replace(/@outdated/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const result = local
            .sort((e1, e2) => e1.displayName.localeCompare(e2.displayName))
            .filter(extension => extension.outdated
            && (extension.name.toLowerCase().indexOf(value) > -1 || extension.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(extension, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterDisabledExtensions(local, runningExtensions, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value.replace(/@disabled/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const result = local
            .sort((e1, e2) => e1.displayName.localeCompare(e2.displayName))
            .filter(e => runningExtensions.every(r => !areSameExtensions({ id: r.identifier.value, uuid: r.uuid }, e.identifier))
            && (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterEnabledExtensions(local, runningExtensions, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value ? value.replace(/@enabled/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase() : '';
        local = local.filter(e => !e.isBuiltin);
        const result = local
            .sort((e1, e2) => e1.displayName.localeCompare(e2.displayName))
            .filter(e => runningExtensions.some(r => areSameExtensions({ id: r.identifier.value, uuid: r.uuid }, e.identifier))
            && (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterWorkspaceUnsupportedExtensions(local, query, options) {
        // shows local extensions which are restricted or disabled in the current workspace because of the extension's capability
        const queryString = query.value; // @sortby is already filtered out
        const match = queryString.match(/^\s*@workspaceUnsupported(?::(untrusted|virtual)(Partial)?)?(?:\s+([^\s]*))?/i);
        if (!match) {
            return [];
        }
        const type = match[1]?.toLowerCase();
        const partial = !!match[2];
        const nameFilter = match[3]?.toLowerCase();
        if (nameFilter) {
            local = local.filter(extension => extension.name.toLowerCase().indexOf(nameFilter) > -1 || extension.displayName.toLowerCase().indexOf(nameFilter) > -1);
        }
        const hasVirtualSupportType = (extension, supportType) => {
            return extension.local && this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(extension.local.manifest) === supportType;
        };
        const hasRestrictedSupportType = (extension, supportType) => {
            if (!extension.local) {
                return false;
            }
            const enablementState = this.extensionEnablementService.getEnablementState(extension.local);
            if (enablementState !== 11 /* EnablementState.EnabledGlobally */ && enablementState !== 12 /* EnablementState.EnabledWorkspace */ &&
                enablementState !== 0 /* EnablementState.DisabledByTrustRequirement */ && enablementState !== 8 /* EnablementState.DisabledByExtensionDependency */) {
                return false;
            }
            if (this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(extension.local.manifest) === supportType) {
                return true;
            }
            if (supportType === false) {
                const dependencies = getExtensionDependencies(local.map(ext => ext.local), extension.local);
                return dependencies.some(ext => this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(ext.manifest) === supportType);
            }
            return false;
        };
        const inVirtualWorkspace = isVirtualWorkspace(this.workspaceService.getWorkspace());
        const inRestrictedWorkspace = !this.workspaceTrustManagementService.isWorkspaceTrusted();
        if (type === 'virtual') {
            // show limited and disabled extensions unless disabled because of a untrusted workspace
            local = local.filter(extension => inVirtualWorkspace && hasVirtualSupportType(extension, partial ? 'limited' : false) && !(inRestrictedWorkspace && hasRestrictedSupportType(extension, false)));
        }
        else if (type === 'untrusted') {
            // show limited and disabled extensions unless disabled because of a virtual workspace
            local = local.filter(extension => hasRestrictedSupportType(extension, partial ? 'limited' : false) && !(inVirtualWorkspace && hasVirtualSupportType(extension, false)));
        }
        else {
            // show extensions that are restricted or disabled in the current workspace
            local = local.filter(extension => inVirtualWorkspace && !hasVirtualSupportType(extension, true) || inRestrictedWorkspace && !hasRestrictedSupportType(extension, true));
        }
        return this.sortExtensions(local, options);
    }
    async filterDeprecatedExtensions(local, query, options) {
        const value = query.value.replace(/@deprecated/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const extensionsControlManifest = await this.extensionManagementService.getExtensionsControlManifest();
        const deprecatedExtensionIds = Object.keys(extensionsControlManifest.deprecated);
        local = local.filter(e => deprecatedExtensionIds.includes(e.identifier.id) && (!value || e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1));
        return this.sortExtensions(local, options);
    }
    filterRecentlyUpdatedExtensions(local, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        const currentTime = Date.now();
        local = local.filter(e => !e.isBuiltin && !e.outdated && e.local?.updated && e.local?.installedTimestamp !== undefined && currentTime - e.local.installedTimestamp < ExtensionsListView_1.RECENT_UPDATE_DURATION);
        value = value.replace(/@recentlyUpdated/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const result = local.filter(e => (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        options.sortBy = options.sortBy ?? "UpdateDate" /* LocalSortBy.UpdateDate */;
        return this.sortExtensions(result, options);
    }
    filterExtensionsByFeature(local, query) {
        const value = query.value.replace(/@feature:/g, '').trim();
        const featureId = value.split(' ')[0];
        const feature = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeature(featureId);
        if (!feature) {
            return undefined;
        }
        if (this.extensionsViewState) {
            this.extensionsViewState.filters.featureId = featureId;
        }
        const renderer = feature.renderer ? this.instantiationService.createInstance(feature.renderer) : undefined;
        try {
            const result = [];
            for (const e of local) {
                if (!e.local) {
                    continue;
                }
                const accessData = this.extensionFeaturesManagementService.getAccessData(new ExtensionIdentifier(e.identifier.id), featureId);
                const shouldRender = renderer?.shouldRender(e.local.manifest);
                if (accessData || shouldRender) {
                    result.push([e, accessData?.accessTimes.length ?? 0]);
                }
            }
            return {
                extensions: result.sort(([, a], [, b]) => b - a).map(([e]) => e),
                description: localize('showingExtensionsForFeature', "Extensions using {0} in the last 30 days", feature.label)
            };
        }
        finally {
            renderer?.dispose();
        }
    }
    mergeAddedExtensions(extensions, newExtensions) {
        const oldExtensions = [...extensions];
        const findPreviousExtensionIndex = (from) => {
            let index = -1;
            const previousExtensionInNew = newExtensions[from];
            if (previousExtensionInNew) {
                index = oldExtensions.findIndex(e => areSameExtensions(e.identifier, previousExtensionInNew.identifier));
                if (index === -1) {
                    return findPreviousExtensionIndex(from - 1);
                }
            }
            return index;
        };
        let hasChanged = false;
        for (let index = 0; index < newExtensions.length; index++) {
            const extension = newExtensions[index];
            if (extensions.every(r => !areSameExtensions(r.identifier, extension.identifier))) {
                hasChanged = true;
                extensions.splice(findPreviousExtensionIndex(index - 1) + 1, 0, extension);
            }
        }
        return hasChanged ? extensions : undefined;
    }
    async queryGallery(query, options, token) {
        const hasUserDefinedSortOrder = options.sortBy !== undefined;
        if (!hasUserDefinedSortOrder && !query.value.trim()) {
            options.sortBy = "InstallCount" /* GallerySortBy.InstallCount */;
        }
        if (this.isRecommendationsQuery(query)) {
            return this.queryRecommendations(query, options, token);
        }
        const text = query.value;
        if (!text) {
            options.source = 'viewlet';
            const pager = await this.extensionsWorkbenchService.queryGallery(options, token);
            return new PagedModel(pager);
        }
        if (/\bext:([^\s]+)\b/g.test(text)) {
            options.text = text;
            options.source = 'file-extension-tags';
            const pager = await this.extensionsWorkbenchService.queryGallery(options, token);
            return new PagedModel(pager);
        }
        options.text = text.substring(0, 350);
        options.source = 'searchText';
        if (hasUserDefinedSortOrder || /\b(category|tag):([^\s]+)\b/gi.test(text) || /\bfeatured(\s+|\b|$)/gi.test(text)) {
            const pager = await this.extensionsWorkbenchService.queryGallery(options, token);
            return new PagedModel(pager);
        }
        const [pager, preferredExtensions] = await Promise.all([
            this.extensionsWorkbenchService.queryGallery(options, token),
            this.getPreferredExtensions(options.text.toLowerCase(), token).catch(() => [])
        ]);
        return preferredExtensions.length ? new PreferredExtensionsPagedModel(preferredExtensions, pager) : new PagedModel(pager);
    }
    async getPreferredExtensions(searchText, token) {
        const preferredExtensions = this.extensionsWorkbenchService.local.filter(e => !e.isBuiltin && (e.name.toLowerCase().indexOf(searchText) > -1 || e.displayName.toLowerCase().indexOf(searchText) > -1 || e.description.toLowerCase().indexOf(searchText) > -1));
        const preferredExtensionUUIDs = new Set();
        if (preferredExtensions.length) {
            // Update gallery data for preferred extensions if they are not yet fetched
            const extesionsToFetch = [];
            for (const extension of preferredExtensions) {
                if (extension.identifier.uuid) {
                    preferredExtensionUUIDs.add(extension.identifier.uuid);
                }
                if (!extension.gallery && extension.identifier.uuid) {
                    extesionsToFetch.push(extension.identifier);
                }
            }
            if (extesionsToFetch.length) {
                this.extensionsWorkbenchService.getExtensions(extesionsToFetch, CancellationToken.None).catch(e => null /*ignore error*/);
            }
        }
        const preferredResults = [];
        try {
            const manifest = await this.extensionManagementService.getExtensionsControlManifest();
            if (Array.isArray(manifest.search)) {
                for (const s of manifest.search) {
                    if (s.query && s.query.toLowerCase() === searchText && Array.isArray(s.preferredResults)) {
                        preferredResults.push(...s.preferredResults);
                        break;
                    }
                }
            }
            if (preferredResults.length) {
                const result = await this.extensionsWorkbenchService.getExtensions(preferredResults.map(id => ({ id })), token);
                for (const extension of result) {
                    if (extension.identifier.uuid && !preferredExtensionUUIDs.has(extension.identifier.uuid)) {
                        preferredExtensions.push(extension);
                    }
                }
            }
        }
        catch (e) {
            this.logService.warn('Failed to get preferred results from the extensions control manifest.', e);
        }
        return preferredExtensions;
    }
    sortExtensions(extensions, options) {
        switch (options.sortBy) {
            case "InstallCount" /* GallerySortBy.InstallCount */:
                extensions = extensions.sort((e1, e2) => typeof e2.installCount === 'number' && typeof e1.installCount === 'number' ? e2.installCount - e1.installCount : NaN);
                break;
            case "UpdateDate" /* LocalSortBy.UpdateDate */:
                extensions = extensions.sort((e1, e2) => typeof e2.local?.installedTimestamp === 'number' && typeof e1.local?.installedTimestamp === 'number' ? e2.local.installedTimestamp - e1.local.installedTimestamp :
                    typeof e2.local?.installedTimestamp === 'number' ? 1 :
                        typeof e1.local?.installedTimestamp === 'number' ? -1 : NaN);
                break;
            case "AverageRating" /* GallerySortBy.AverageRating */:
            case "WeightedRating" /* GallerySortBy.WeightedRating */:
                extensions = extensions.sort((e1, e2) => typeof e2.rating === 'number' && typeof e1.rating === 'number' ? e2.rating - e1.rating : NaN);
                break;
            default:
                extensions = extensions.sort((e1, e2) => e1.displayName.localeCompare(e2.displayName));
                break;
        }
        if (options.sortOrder === 2 /* SortOrder.Descending */) {
            extensions = extensions.reverse();
        }
        return extensions;
    }
    isRecommendationsQuery(query) {
        return ExtensionsListView_1.isWorkspaceRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isKeymapsRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isLanguageRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isExeRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isRemoteRecommendedExtensionsQuery(query.value)
            || /@recommended:all/i.test(query.value)
            || ExtensionsListView_1.isSearchRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isRecommendedExtensionsQuery(query.value);
    }
    async queryRecommendations(query, options, token) {
        // Workspace recommendations
        if (ExtensionsListView_1.isWorkspaceRecommendedExtensionsQuery(query.value)) {
            return this.getWorkspaceRecommendationsModel(query, options, token);
        }
        // Keymap recommendations
        if (ExtensionsListView_1.isKeymapsRecommendedExtensionsQuery(query.value)) {
            return this.getKeymapRecommendationsModel(query, options, token);
        }
        // Language recommendations
        if (ExtensionsListView_1.isLanguageRecommendedExtensionsQuery(query.value)) {
            return this.getLanguageRecommendationsModel(query, options, token);
        }
        // Exe recommendations
        if (ExtensionsListView_1.isExeRecommendedExtensionsQuery(query.value)) {
            return this.getExeRecommendationsModel(query, options, token);
        }
        // Remote recommendations
        if (ExtensionsListView_1.isRemoteRecommendedExtensionsQuery(query.value)) {
            return this.getRemoteRecommendationsModel(query, options, token);
        }
        // All recommendations
        if (/@recommended:all/i.test(query.value)) {
            return this.getAllRecommendationsModel(options, token);
        }
        // Search recommendations
        if (ExtensionsListView_1.isSearchRecommendedExtensionsQuery(query.value) ||
            (ExtensionsListView_1.isRecommendedExtensionsQuery(query.value) && options.sortBy !== undefined)) {
            return this.searchRecommendations(query, options, token);
        }
        // Other recommendations
        if (ExtensionsListView_1.isRecommendedExtensionsQuery(query.value)) {
            return this.getOtherRecommendationsModel(query, options, token);
        }
        return new PagedModel([]);
    }
    async getInstallableRecommendations(recommendations, options, token) {
        const result = [];
        if (recommendations.length) {
            const galleryExtensions = [];
            const resourceExtensions = [];
            for (const recommendation of recommendations) {
                if (typeof recommendation === 'string') {
                    galleryExtensions.push(recommendation);
                }
                else {
                    resourceExtensions.push(recommendation);
                }
            }
            if (galleryExtensions.length) {
                try {
                    const extensions = await this.extensionsWorkbenchService.getExtensions(galleryExtensions.map(id => ({ id })), { source: options.source }, token);
                    for (const extension of extensions) {
                        if (extension.gallery && !extension.deprecationInfo
                            && await this.extensionManagementService.canInstall(extension.gallery) === true) {
                            result.push(extension);
                        }
                    }
                }
                catch (error) {
                    if (!resourceExtensions.length || !this.isOfflineError(error)) {
                        throw error;
                    }
                }
            }
            if (resourceExtensions.length) {
                const extensions = await this.extensionsWorkbenchService.getResourceExtensions(resourceExtensions, true);
                for (const extension of extensions) {
                    if (await this.extensionsWorkbenchService.canInstall(extension) === true) {
                        result.push(extension);
                    }
                }
            }
        }
        return result;
    }
    async getWorkspaceRecommendations() {
        const recommendations = await this.extensionRecommendationsService.getWorkspaceRecommendations();
        const { important } = await this.extensionRecommendationsService.getConfigBasedRecommendations();
        for (const configBasedRecommendation of important) {
            if (!recommendations.find(extensionId => extensionId === configBasedRecommendation)) {
                recommendations.push(configBasedRecommendation);
            }
        }
        return recommendations;
    }
    async getWorkspaceRecommendationsModel(query, options, token) {
        const recommendations = await this.getWorkspaceRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-workspace' }, token));
        return new PagedModel(installableRecommendations);
    }
    async getKeymapRecommendationsModel(query, options, token) {
        const value = query.value.replace(/@recommended:keymaps/g, '').trim().toLowerCase();
        const recommendations = this.extensionRecommendationsService.getKeymapRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-keymaps' }, token))
            .filter(extension => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(installableRecommendations);
    }
    async getLanguageRecommendationsModel(query, options, token) {
        const value = query.value.replace(/@recommended:languages/g, '').trim().toLowerCase();
        const recommendations = this.extensionRecommendationsService.getLanguageRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-languages' }, token))
            .filter(extension => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(installableRecommendations);
    }
    async getRemoteRecommendationsModel(query, options, token) {
        const value = query.value.replace(/@recommended:remotes/g, '').trim().toLowerCase();
        const recommendations = this.extensionRecommendationsService.getRemoteRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-remotes' }, token))
            .filter(extension => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(installableRecommendations);
    }
    async getExeRecommendationsModel(query, options, token) {
        const exe = query.value.replace(/@exe:/g, '').trim().toLowerCase();
        const { important, others } = await this.extensionRecommendationsService.getExeBasedRecommendations(exe.startsWith('"') ? exe.substring(1, exe.length - 1) : exe);
        const installableRecommendations = await this.getInstallableRecommendations([...important, ...others], { ...options, source: 'recommendations-exe' }, token);
        return new PagedModel(installableRecommendations);
    }
    async getOtherRecommendationsModel(query, options, token) {
        const otherRecommendations = await this.getOtherRecommendations();
        const installableRecommendations = await this.getInstallableRecommendations(otherRecommendations, { ...options, source: 'recommendations-other', sortBy: undefined }, token);
        const result = coalesce(otherRecommendations.map(id => installableRecommendations.find(i => areSameExtensions(i.identifier, { id }))));
        return new PagedModel(result);
    }
    async getOtherRecommendations() {
        const local = (await this.extensionsWorkbenchService.queryLocal(this.options.server))
            .map(e => e.identifier.id.toLowerCase());
        const workspaceRecommendations = (await this.getWorkspaceRecommendations())
            .map(extensionId => isString(extensionId) ? extensionId.toLowerCase() : extensionId);
        return distinct((await Promise.all([
            // Order is important
            this.extensionRecommendationsService.getImportantRecommendations(),
            this.extensionRecommendationsService.getFileBasedRecommendations(),
            this.extensionRecommendationsService.getOtherRecommendations()
        ])).flat().filter(extensionId => !local.includes(extensionId.toLowerCase()) && !workspaceRecommendations.includes(extensionId.toLowerCase())), extensionId => extensionId.toLowerCase());
    }
    // Get All types of recommendations, trimmed to show a max of 8 at any given time
    async getAllRecommendationsModel(options, token) {
        const localExtensions = await this.extensionsWorkbenchService.queryLocal(this.options.server);
        const localExtensionIds = localExtensions.map(e => e.identifier.id.toLowerCase());
        const allRecommendations = distinct((await Promise.all([
            // Order is important
            this.getWorkspaceRecommendations(),
            this.extensionRecommendationsService.getImportantRecommendations(),
            this.extensionRecommendationsService.getFileBasedRecommendations(),
            this.extensionRecommendationsService.getOtherRecommendations()
        ])).flat().filter(extensionId => {
            if (isString(extensionId)) {
                return !localExtensionIds.includes(extensionId.toLowerCase());
            }
            return !localExtensions.some(localExtension => localExtension.local && this.uriIdentityService.extUri.isEqual(localExtension.local.location, extensionId));
        }));
        const installableRecommendations = await this.getInstallableRecommendations(allRecommendations, { ...options, source: 'recommendations-all', sortBy: undefined }, token);
        const result = [];
        for (let i = 0; i < installableRecommendations.length && result.length < 8; i++) {
            const recommendation = allRecommendations[i];
            if (isString(recommendation)) {
                const extension = installableRecommendations.find(extension => areSameExtensions(extension.identifier, { id: recommendation }));
                if (extension) {
                    result.push(extension);
                }
            }
            else {
                const extension = installableRecommendations.find(extension => extension.resourceExtension && this.uriIdentityService.extUri.isEqual(extension.resourceExtension.location, recommendation));
                if (extension) {
                    result.push(extension);
                }
            }
        }
        return new PagedModel(result);
    }
    async searchRecommendations(query, options, token) {
        const value = query.value.replace(/@recommended/g, '').trim().toLowerCase();
        const recommendations = distinct([...await this.getWorkspaceRecommendations(), ...await this.getOtherRecommendations()]);
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations', sortBy: undefined }, token))
            .filter(extension => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(this.sortExtensions(installableRecommendations, options));
    }
    setModel(model, message, donotResetScrollTop) {
        if (this.list) {
            this.list.model = new DelayedPagedModel(model);
            this.updateBody(message);
            if (!donotResetScrollTop) {
                this.list.scrollTop = 0;
            }
        }
        if (this.badge) {
            this.badge.setCount(this.count());
        }
    }
    updateModel(model) {
        if (this.list) {
            this.list.model = new DelayedPagedModel(model);
            this.updateBody();
        }
        if (this.badge) {
            this.badge.setCount(this.count());
        }
    }
    updateBody(message) {
        if (this.bodyTemplate) {
            const count = this.count();
            this.bodyTemplate.extensionsList.classList.toggle('hidden', count === 0);
            this.bodyTemplate.messageContainer.classList.toggle('hidden', !message && count > 0);
            if (this.isBodyVisible()) {
                if (message) {
                    this.bodyTemplate.messageSeverityIcon.className = SeverityIcon.className(message.severity);
                    this.bodyTemplate.messageBox.textContent = message.text;
                }
                else if (this.count() === 0) {
                    this.bodyTemplate.messageSeverityIcon.className = '';
                    this.bodyTemplate.messageBox.textContent = localize('no extensions found', "No extensions found.");
                }
                if (this.bodyTemplate.messageBox.textContent) {
                    alert(this.bodyTemplate.messageBox.textContent);
                }
            }
        }
        this.updateSize();
    }
    getMessage(error) {
        if (this.isOfflineError(error)) {
            return { text: localize('offline error', "Unable to search the Marketplace when offline, please check your network connection."), severity: Severity.Warning };
        }
        else {
            return { text: localize('error', "Error while fetching extensions. {0}", getErrorMessage(error)), severity: Severity.Error };
        }
    }
    isOfflineError(error) {
        if (error instanceof ExtensionGalleryError) {
            return error.code === "Offline" /* ExtensionGalleryErrorCode.Offline */;
        }
        return isOfflineError(error);
    }
    updateSize() {
        if (this.options.flexibleHeight) {
            this.maximumBodySize = this.list?.model.length ? Number.POSITIVE_INFINITY : 0;
            this.storageService.store(`${this.id}.size`, this.list?.model.length || 0, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    openExtension(extension, options) {
        extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, extension.identifier))[0] || extension;
        this.extensionsWorkbenchService.open(extension, options).then(undefined, err => this.onError(err));
    }
    onError(err) {
        if (isCancellationError(err)) {
            return;
        }
        const message = err && err.message || '';
        if (/ECONNREFUSED/.test(message)) {
            const error = createErrorWithActions(localize('suggestProxyError', "Marketplace returned 'ECONNREFUSED'. Please check the 'http.proxy' setting."), [
                new Action('open user settings', localize('open user settings', "Open User Settings"), undefined, true, () => this.preferencesService.openUserSettings())
            ]);
            this.notificationService.error(error);
            return;
        }
        this.notificationService.error(err);
    }
    dispose() {
        super.dispose();
        if (this.queryRequest) {
            this.queryRequest.request.cancel();
            this.queryRequest = null;
        }
        if (this.queryResult) {
            this.queryResult.disposables.dispose();
            this.queryResult = undefined;
        }
        this.list = null;
    }
    static isLocalExtensionsQuery(query, sortBy) {
        return this.isInstalledExtensionsQuery(query)
            || this.isSearchInstalledExtensionsQuery(query)
            || this.isOutdatedExtensionsQuery(query)
            || this.isEnabledExtensionsQuery(query)
            || this.isDisabledExtensionsQuery(query)
            || this.isBuiltInExtensionsQuery(query)
            || this.isSearchBuiltInExtensionsQuery(query)
            || this.isBuiltInGroupExtensionsQuery(query)
            || this.isSearchDeprecatedExtensionsQuery(query)
            || this.isSearchWorkspaceUnsupportedExtensionsQuery(query)
            || this.isSearchRecentlyUpdatedQuery(query)
            || this.isSearchExtensionUpdatesQuery(query)
            || this.isSortInstalledExtensionsQuery(query, sortBy)
            || this.isFeatureExtensionsQuery(query);
    }
    static isSearchBuiltInExtensionsQuery(query) {
        return /@builtin\s.+/i.test(query);
    }
    static isBuiltInExtensionsQuery(query) {
        return /^\s*@builtin$/i.test(query.trim());
    }
    static isBuiltInGroupExtensionsQuery(query) {
        return /^\s*@builtin:.+$/i.test(query.trim());
    }
    static isSearchWorkspaceUnsupportedExtensionsQuery(query) {
        return /^\s*@workspaceUnsupported(:(untrusted|virtual)(Partial)?)?(\s|$)/i.test(query);
    }
    static isInstalledExtensionsQuery(query) {
        return /@installed$/i.test(query);
    }
    static isSearchInstalledExtensionsQuery(query) {
        return /@installed\s./i.test(query) || this.isFeatureExtensionsQuery(query);
    }
    static isOutdatedExtensionsQuery(query) {
        return /@outdated/i.test(query);
    }
    static isEnabledExtensionsQuery(query) {
        return /@enabled/i.test(query);
    }
    static isDisabledExtensionsQuery(query) {
        return /@disabled/i.test(query);
    }
    static isSearchDeprecatedExtensionsQuery(query) {
        return /@deprecated\s?.*/i.test(query);
    }
    static isRecommendedExtensionsQuery(query) {
        return /^@recommended$/i.test(query.trim());
    }
    static isSearchRecommendedExtensionsQuery(query) {
        return /@recommended\s.+/i.test(query);
    }
    static isWorkspaceRecommendedExtensionsQuery(query) {
        return /@recommended:workspace/i.test(query);
    }
    static isExeRecommendedExtensionsQuery(query) {
        return /@exe:.+/i.test(query);
    }
    static isRemoteRecommendedExtensionsQuery(query) {
        return /@recommended:remotes/i.test(query);
    }
    static isKeymapsRecommendedExtensionsQuery(query) {
        return /@recommended:keymaps/i.test(query);
    }
    static isLanguageRecommendedExtensionsQuery(query) {
        return /@recommended:languages/i.test(query);
    }
    static isSortInstalledExtensionsQuery(query, sortBy) {
        return (sortBy !== undefined && sortBy !== '' && query === '') || (!sortBy && /^@sort:\S*$/i.test(query));
    }
    static isSearchPopularQuery(query) {
        return /@popular/i.test(query);
    }
    static isSearchRecentlyPublishedQuery(query) {
        return /@recentlyPublished/i.test(query);
    }
    static isSearchRecentlyUpdatedQuery(query) {
        return /@recentlyUpdated/i.test(query);
    }
    static isSearchExtensionUpdatesQuery(query) {
        return /@updates/i.test(query);
    }
    static isSortUpdateDateQuery(query) {
        return /@sort:updateDate/i.test(query);
    }
    static isFeatureExtensionsQuery(query) {
        return /@feature:/i.test(query);
    }
    focus() {
        super.focus();
        if (!this.list) {
            return;
        }
        if (!(this.list.getFocus().length || this.list.getSelection().length)) {
            this.list.focusNext();
        }
        this.list.domFocus();
    }
};
ExtensionsListView = ExtensionsListView_1 = __decorate([
    __param(2, INotificationService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, IExtensionService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IExtensionRecommendationsService),
    __param(10, ITelemetryService),
    __param(11, IHoverService),
    __param(12, IConfigurationService),
    __param(13, IWorkspaceContextService),
    __param(14, IExtensionManagementServerService),
    __param(15, IExtensionManifestPropertiesService),
    __param(16, IWorkbenchExtensionManagementService),
    __param(17, IWorkspaceContextService),
    __param(18, IProductService),
    __param(19, IContextKeyService),
    __param(20, IViewDescriptorService),
    __param(21, IOpenerService),
    __param(22, IPreferencesService),
    __param(23, IStorageService),
    __param(24, IWorkspaceTrustManagementService),
    __param(25, IWorkbenchExtensionEnablementService),
    __param(26, IWorkbenchLayoutService),
    __param(27, IExtensionFeaturesManagementService),
    __param(28, IUriIdentityService),
    __param(29, ILogService)
], ExtensionsListView);
export { ExtensionsListView };
export class DefaultPopularExtensionsView extends ExtensionsListView {
    async show() {
        const query = this.extensionManagementServerService.webExtensionManagementServer && !this.extensionManagementServerService.localExtensionManagementServer && !this.extensionManagementServerService.remoteExtensionManagementServer ? '@web' : '';
        return super.show(query);
    }
}
export class ServerInstalledExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query ? query : '@installed';
        if (!ExtensionsListView.isLocalExtensionsQuery(query) || ExtensionsListView.isSortInstalledExtensionsQuery(query)) {
            query = query += ' @installed';
        }
        return super.show(query.trim());
    }
}
export class EnabledExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query || '@enabled';
        return ExtensionsListView.isEnabledExtensionsQuery(query) ? super.show(query) :
            ExtensionsListView.isSortInstalledExtensionsQuery(query) ? super.show('@enabled ' + query) : this.showEmptyModel();
    }
}
export class DisabledExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query || '@disabled';
        return ExtensionsListView.isDisabledExtensionsQuery(query) ? super.show(query) :
            ExtensionsListView.isSortInstalledExtensionsQuery(query) ? super.show('@disabled ' + query) : this.showEmptyModel();
    }
}
export class OutdatedExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query ? query : '@outdated';
        if (ExtensionsListView.isSearchExtensionUpdatesQuery(query)) {
            query = query.replace('@updates', '@outdated');
        }
        return super.show(query.trim());
    }
    updateSize() {
        super.updateSize();
        this.setExpanded(this.count() > 0);
    }
}
export class RecentlyUpdatedExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query ? query : '@recentlyUpdated';
        if (ExtensionsListView.isSearchExtensionUpdatesQuery(query)) {
            query = query.replace('@updates', '@recentlyUpdated');
        }
        return super.show(query.trim());
    }
}
let StaticQueryExtensionsView = class StaticQueryExtensionsView extends ExtensionsListView {
    constructor(options, viewletViewOptions, notificationService, keybindingService, contextMenuService, instantiationService, themeService, extensionService, extensionsWorkbenchService, extensionRecommendationsService, telemetryService, hoverService, configurationService, contextService, extensionManagementServerService, extensionManifestPropertiesService, extensionManagementService, workspaceService, productService, contextKeyService, viewDescriptorService, openerService, preferencesService, storageService, workspaceTrustManagementService, extensionEnablementService, layoutService, extensionFeaturesManagementService, uriIdentityService, logService) {
        super(options, viewletViewOptions, notificationService, keybindingService, contextMenuService, instantiationService, themeService, extensionService, extensionsWorkbenchService, extensionRecommendationsService, telemetryService, hoverService, configurationService, contextService, extensionManagementServerService, extensionManifestPropertiesService, extensionManagementService, workspaceService, productService, contextKeyService, viewDescriptorService, openerService, preferencesService, storageService, workspaceTrustManagementService, extensionEnablementService, layoutService, extensionFeaturesManagementService, uriIdentityService, logService);
        this.options = options;
    }
    show() {
        return super.show(this.options.query);
    }
};
StaticQueryExtensionsView = __decorate([
    __param(2, INotificationService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, IExtensionService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IExtensionRecommendationsService),
    __param(10, ITelemetryService),
    __param(11, IHoverService),
    __param(12, IConfigurationService),
    __param(13, IWorkspaceContextService),
    __param(14, IExtensionManagementServerService),
    __param(15, IExtensionManifestPropertiesService),
    __param(16, IWorkbenchExtensionManagementService),
    __param(17, IWorkspaceContextService),
    __param(18, IProductService),
    __param(19, IContextKeyService),
    __param(20, IViewDescriptorService),
    __param(21, IOpenerService),
    __param(22, IPreferencesService),
    __param(23, IStorageService),
    __param(24, IWorkspaceTrustManagementService),
    __param(25, IWorkbenchExtensionEnablementService),
    __param(26, IWorkbenchLayoutService),
    __param(27, IExtensionFeaturesManagementService),
    __param(28, IUriIdentityService),
    __param(29, ILogService)
], StaticQueryExtensionsView);
export { StaticQueryExtensionsView };
function toSpecificWorkspaceUnsupportedQuery(query, qualifier) {
    if (!query) {
        return '@workspaceUnsupported:' + qualifier;
    }
    const match = query.match(new RegExp(`@workspaceUnsupported(:${qualifier})?(\\s|$)`, 'i'));
    if (match) {
        if (!match[1]) {
            return query.replace(/@workspaceUnsupported/gi, '@workspaceUnsupported:' + qualifier);
        }
        return query;
    }
    return undefined;
}
export class UntrustedWorkspaceUnsupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'untrusted');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class UntrustedWorkspacePartiallySupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'untrustedPartial');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class VirtualWorkspaceUnsupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'virtual');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class VirtualWorkspacePartiallySupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'virtualPartial');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class DeprecatedExtensionsView extends ExtensionsListView {
    async show(query) {
        return ExtensionsListView.isSearchDeprecatedExtensionsQuery(query) ? super.show(query) : this.showEmptyModel();
    }
}
export class SearchMarketplaceExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.reportSearchFinishedDelayer = this._register(new ThrottledDelayer(2000));
        this.searchWaitPromise = Promise.resolve();
    }
    async show(query) {
        const queryPromise = super.show(query);
        this.reportSearchFinishedDelayer.trigger(() => this.reportSearchFinished());
        this.searchWaitPromise = queryPromise.then(null, null);
        return queryPromise;
    }
    async reportSearchFinished() {
        await this.searchWaitPromise;
        this.telemetryService.publicLog2('extensionsView:MarketplaceSearchFinished');
    }
}
export class DefaultRecommendedExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.recommendedExtensionsQuery = '@recommended:all';
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => {
            this.show('');
        }));
    }
    async show(query) {
        if (query && query.trim() !== this.recommendedExtensionsQuery) {
            return this.showEmptyModel();
        }
        const model = await super.show(this.recommendedExtensionsQuery);
        if (!this.extensionsWorkbenchService.local.some(e => !e.isBuiltin)) {
            // This is part of popular extensions view. Collapse if no installed extensions.
            this.setExpanded(model.length > 0);
        }
        return model;
    }
}
export class RecommendedExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.recommendedExtensionsQuery = '@recommended';
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => {
            this.show('');
        }));
    }
    async show(query) {
        return (query && query.trim() !== this.recommendedExtensionsQuery) ? this.showEmptyModel() : super.show(this.recommendedExtensionsQuery);
    }
}
export class WorkspaceRecommendedExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.recommendedExtensionsQuery = '@recommended:workspace';
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => this.show(this.recommendedExtensionsQuery)));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.show(this.recommendedExtensionsQuery)));
    }
    async show(query) {
        const shouldShowEmptyView = query && query.trim() !== '@recommended' && query.trim() !== '@recommended:workspace';
        const model = await (shouldShowEmptyView ? this.showEmptyModel() : super.show(this.recommendedExtensionsQuery));
        this.setExpanded(model.length > 0);
        return model;
    }
    async getInstallableWorkspaceRecommendations() {
        const installed = (await this.extensionsWorkbenchService.queryLocal())
            .filter(l => l.enablementState !== 1 /* EnablementState.DisabledByExtensionKind */); // Filter extensions disabled by kind
        const recommendations = (await this.getWorkspaceRecommendations())
            .filter(recommendation => installed.every(local => isString(recommendation) ? !areSameExtensions({ id: recommendation }, local.identifier) : !this.uriIdentityService.extUri.isEqual(recommendation, local.local?.location)));
        return this.getInstallableRecommendations(recommendations, { source: 'install-all-workspace-recommendations' }, CancellationToken.None);
    }
    async installWorkspaceRecommendations() {
        const installableRecommendations = await this.getInstallableWorkspaceRecommendations();
        if (installableRecommendations.length) {
            const galleryExtensions = [];
            const resourceExtensions = [];
            for (const recommendation of installableRecommendations) {
                if (recommendation.gallery) {
                    galleryExtensions.push({ extension: recommendation.gallery, options: {} });
                }
                else {
                    resourceExtensions.push(recommendation);
                }
            }
            await Promise.all([
                this.extensionManagementService.installGalleryExtensions(galleryExtensions),
                ...resourceExtensions.map(extension => this.extensionsWorkbenchService.install(extension))
            ]);
        }
        else {
            this.notificationService.notify({
                severity: Severity.Info,
                message: localize('no local extensions', "There are no extensions to install.")
            });
        }
    }
}
export function getAriaLabelForExtension(extension) {
    if (!extension) {
        return '';
    }
    const publisher = extension.publisherDomain?.verified ? localize('extension.arialabel.verifiedPublisher', "Verified Publisher {0}", extension.publisherDisplayName) : localize('extension.arialabel.publisher', "Publisher {0}", extension.publisherDisplayName);
    const deprecated = extension?.deprecationInfo ? localize('extension.arialabel.deprecated', "Deprecated") : '';
    const rating = extension?.rating ? localize('extension.arialabel.rating', "Rated {0} out of 5 stars by {1} users", extension.rating.toFixed(2), extension.ratingCount) : '';
    return `${extension.displayName}, ${deprecated ? `${deprecated}, ` : ''}${extension.version}, ${publisher}, ${extension.description} ${rating ? `, ${rating}` : ''}`;
}
export class PreferredExtensionsPagedModel {
    constructor(preferredExtensions, pager) {
        this.preferredExtensions = preferredExtensions;
        this.pager = pager;
        this.resolved = new Map();
        this.preferredGalleryExtensions = new Set();
        this.resolvedGalleryExtensionsFromQuery = [];
        for (let i = 0; i < this.preferredExtensions.length; i++) {
            this.resolved.set(i, this.preferredExtensions[i]);
        }
        for (const e of preferredExtensions) {
            if (e.identifier.uuid) {
                this.preferredGalleryExtensions.add(e.identifier.uuid);
            }
        }
        // expected that all preferred gallery extensions will be part of the query results
        this.length = (preferredExtensions.length - this.preferredGalleryExtensions.size) + this.pager.total;
        const totalPages = Math.ceil(this.pager.total / this.pager.pageSize);
        this.populateResolvedExtensions(0, this.pager.firstPage);
        this.pages = range(totalPages - 1).map(() => ({
            promise: null,
            cts: null,
            promiseIndexes: new Set(),
        }));
    }
    isResolved(index) {
        return this.resolved.has(index);
    }
    get(index) {
        return this.resolved.get(index);
    }
    async resolve(index, cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            throw new CancellationError();
        }
        if (this.isResolved(index)) {
            return this.get(index);
        }
        const indexInPagedModel = index - this.preferredExtensions.length + this.resolvedGalleryExtensionsFromQuery.length;
        const pageIndex = Math.floor(indexInPagedModel / this.pager.pageSize);
        const page = this.pages[pageIndex];
        if (!page.promise) {
            page.cts = new CancellationTokenSource();
            page.promise = this.pager.getPage(pageIndex, page.cts.token)
                .then(extensions => this.populateResolvedExtensions(pageIndex, extensions))
                .catch(e => { page.promise = null; throw e; })
                .finally(() => page.cts = null);
        }
        const listener = cancellationToken.onCancellationRequested(() => {
            if (!page.cts) {
                return;
            }
            page.promiseIndexes.delete(index);
            if (page.promiseIndexes.size === 0) {
                page.cts.cancel();
            }
        });
        page.promiseIndexes.add(index);
        try {
            await page.promise;
        }
        finally {
            listener.dispose();
        }
        return this.get(index);
    }
    populateResolvedExtensions(pageIndex, extensions) {
        let adjustIndexOfNextPagesBy = 0;
        const pageStartIndex = pageIndex * this.pager.pageSize;
        for (let i = 0; i < extensions.length; i++) {
            const e = extensions[i];
            if (e.gallery?.identifier.uuid && this.preferredGalleryExtensions.has(e.gallery.identifier.uuid)) {
                this.resolvedGalleryExtensionsFromQuery.push(e);
                adjustIndexOfNextPagesBy++;
            }
            else {
                this.resolved.set(this.preferredExtensions.length - this.resolvedGalleryExtensionsFromQuery.length + pageStartIndex + i, e);
            }
        }
        // If this page has preferred gallery extensions, then adjust the index of the next pages
        // by the number of preferred gallery extensions found in this page. Because these preferred extensions
        // are already in the resolved list and since we did not add them now, we need to adjust the indices of the next pages.
        // Skip first page as the preferred extensions are always in the first page
        if (pageIndex !== 0 && adjustIndexOfNextPagesBy) {
            const nextPageStartIndex = (pageIndex + 1) * this.pager.pageSize;
            const indices = [...this.resolved.keys()].sort();
            for (const index of indices) {
                if (index >= nextPageStartIndex) {
                    const e = this.resolved.get(index);
                    if (e) {
                        this.resolved.delete(index);
                        this.resolved.set(index - adjustIndexOfNextPagesBy, e);
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zVmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0csT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBVSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZHLE9BQU8sRUFBOEgscUJBQXFCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUMzTyxPQUFPLEVBQThCLGlDQUFpQyxFQUFtQixvQ0FBb0MsRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ2pQLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFB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