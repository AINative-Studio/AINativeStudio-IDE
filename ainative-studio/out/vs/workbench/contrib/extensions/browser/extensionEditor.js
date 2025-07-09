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
var ExtensionEditor_1;
import { $, addDisposableListener, append, hide, setParentFlowTo, show } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { CheckboxActionViewItem } from '../../../../base/browser/ui/toggle/toggle.js';
import { Action } from '../../../../base/common/actions.js';
import * as arrays from '../../../../base/common/arrays.js';
import { Cache } from '../../../../base/common/cache.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { isNative, language } from '../../../../base/common/platform.js';
import { isUndefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import './media/extensionEditor.css';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import { localize } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { computeSize, IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { defaultCheckboxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { buttonForeground, buttonHoverBackground, editorBackground, textLinkActiveForeground, textLinkForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ExtensionFeaturesTab } from './extensionFeaturesTab.js';
import { ButtonWithDropDownExtensionAction, ClearLanguageAction, DisableDropDownAction, EnableDropDownAction, ButtonWithDropdownExtensionActionViewItem, DropDownExtensionAction, ExtensionEditorManageExtensionAction, ExtensionStatusAction, ExtensionStatusLabelAction, InstallAnotherVersionAction, InstallDropdownAction, InstallingLabelAction, LocalInstallAction, MigrateDeprecatedExtensionAction, ExtensionRuntimeStateAction, RemoteInstallAction, SetColorThemeAction, SetFileIconThemeAction, SetLanguageAction, SetProductIconThemeAction, ToggleAutoUpdateForExtensionAction, UninstallAction, UpdateAction, WebInstallAction, TogglePreReleaseExtensionAction, } from './extensionsActions.js';
import { Delegate } from './extensionsList.js';
import { ExtensionData, ExtensionsGridView, ExtensionsTree, getExtensions } from './extensionsViewer.js';
import { ExtensionRecommendationWidget, ExtensionStatusWidget, ExtensionWidget, InstallCountWidget, RatingsWidget, RemoteBadgeWidget, SponsorWidget, PublisherWidget, onClick, ExtensionKindIndicatorWidget } from './extensionsWidgets.js';
import { ExtensionContainers, IExtensionsWorkbenchService } from '../common/extensions.js';
import { DEFAULT_MARKDOWN_STYLES, renderMarkdownDocument } from '../../markdown/browser/markdownDocumentRenderer.js';
import { IWebviewService, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED } from '../../webview/browser/webview.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ByteSize, IFileService } from '../../../../platform/files/common/files.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
function toDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}, ${date.toLocaleTimeString(language, { hourCycle: 'h23' })}`;
}
class NavBar extends Disposable {
    get onChange() { return this._onChange.event; }
    get currentId() { return this._currentId; }
    constructor(container) {
        super();
        this._onChange = this._register(new Emitter());
        this._currentId = null;
        const element = append(container, $('.navbar'));
        this.actions = [];
        this.actionbar = this._register(new ActionBar(element));
    }
    push(id, label, tooltip) {
        const action = new Action(id, label, undefined, true, () => this.update(id, true));
        action.tooltip = tooltip;
        this.actions.push(action);
        this.actionbar.push(action);
        if (this.actions.length === 1) {
            this.update(id);
        }
    }
    clear() {
        this.actions = dispose(this.actions);
        this.actionbar.clear();
    }
    switch(id) {
        const action = this.actions.find(action => action.id === id);
        if (action) {
            action.run();
            return true;
        }
        return false;
    }
    update(id, focus) {
        this._currentId = id;
        this._onChange.fire({ id, focus: !!focus });
        this.actions.forEach(a => a.checked = a.id === id);
    }
}
var WebviewIndex;
(function (WebviewIndex) {
    WebviewIndex[WebviewIndex["Readme"] = 0] = "Readme";
    WebviewIndex[WebviewIndex["Changelog"] = 1] = "Changelog";
})(WebviewIndex || (WebviewIndex = {}));
const CONTEXT_SHOW_PRE_RELEASE_VERSION = new RawContextKey('showPreReleaseVersion', false);
class ExtensionWithDifferentGalleryVersionWidget extends ExtensionWidget {
    constructor() {
        super(...arguments);
        this._gallery = null;
    }
    get gallery() { return this._gallery; }
    set gallery(gallery) {
        if (this.extension && gallery && !areSameExtensions(this.extension.identifier, gallery.identifier)) {
            return;
        }
        this._gallery = gallery;
        this.update();
    }
}
class VersionWidget extends ExtensionWithDifferentGalleryVersionWidget {
    constructor(container, hoverService) {
        super();
        this.element = append(container, $('code.version', undefined, 'pre-release'));
        this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, localize('extension version', "Extension Version")));
        this.render();
    }
    render() {
        if (this.extension?.preRelease) {
            show(this.element);
        }
        else {
            hide(this.element);
        }
    }
}
let ExtensionEditor = class ExtensionEditor extends EditorPane {
    static { ExtensionEditor_1 = this; }
    static { this.ID = 'workbench.editor.extension'; }
    constructor(group, telemetryService, instantiationService, extensionsWorkbenchService, extensionGalleryService, themeService, notificationService, openerService, extensionRecommendationsService, storageService, extensionService, webviewService, languageService, contextMenuService, contextKeyService, hoverService) {
        super(ExtensionEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionGalleryService = extensionGalleryService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.extensionRecommendationsService = extensionRecommendationsService;
        this.extensionService = extensionService;
        this.webviewService = webviewService;
        this.languageService = languageService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this._scopedContextKeyService = this._register(new MutableDisposable());
        // Some action bar items use a webview whose vertical scroll position we track in this map
        this.initialScrollProgress = new Map();
        // Spot when an ExtensionEditor instance gets reused for a different extension, in which case the vertical scroll positions must be zeroed
        this.currentIdentifier = '';
        this.layoutParticipants = [];
        this.contentDisposables = this._register(new DisposableStore());
        this.transientDisposables = this._register(new DisposableStore());
        this.activeElement = null;
        this.extensionReadme = null;
        this.extensionChangelog = null;
        this.extensionManifest = null;
    }
    get scopedContextKeyService() {
        return this._scopedContextKeyService.value;
    }
    createEditor(parent) {
        const root = append(parent, $('.extension-editor'));
        this._scopedContextKeyService.value = this.contextKeyService.createScoped(root);
        this._scopedContextKeyService.value.createKey('inExtensionEditor', true);
        this.showPreReleaseVersionContextKey = CONTEXT_SHOW_PRE_RELEASE_VERSION.bindTo(this._scopedContextKeyService.value);
        root.tabIndex = 0; // this is required for the focus tracker on the editor
        root.style.outline = 'none';
        root.setAttribute('role', 'document');
        const header = append(root, $('.header'));
        const iconContainer = append(header, $('.icon-container'));
        const icon = append(iconContainer, $('img.icon', { draggable: false, alt: '' }));
        const remoteBadge = this.instantiationService.createInstance(RemoteBadgeWidget, iconContainer, true);
        const details = append(header, $('.details'));
        const title = append(details, $('.title'));
        const name = append(title, $('span.name.clickable', { role: 'heading', tabIndex: 0 }));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), name, localize('name', "Extension name")));
        const versionWidget = new VersionWidget(title, this.hoverService);
        const preview = append(title, $('span.preview'));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), preview, localize('preview', "Preview")));
        preview.textContent = localize('preview', "Preview");
        const builtin = append(title, $('span.builtin'));
        builtin.textContent = localize('builtin', "Built-in");
        const subtitle = append(details, $('.subtitle'));
        const subTitleEntryContainers = [];
        const publisherContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(publisherContainer);
        const publisherWidget = this.instantiationService.createInstance(PublisherWidget, publisherContainer, false);
        const extensionKindContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(extensionKindContainer);
        const extensionKindWidget = this.instantiationService.createInstance(ExtensionKindIndicatorWidget, extensionKindContainer, false);
        const installCountContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(installCountContainer);
        const installCountWidget = this.instantiationService.createInstance(InstallCountWidget, installCountContainer, false);
        const ratingsContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(ratingsContainer);
        const ratingsWidget = this.instantiationService.createInstance(RatingsWidget, ratingsContainer, false);
        const sponsorContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(sponsorContainer);
        const sponsorWidget = this.instantiationService.createInstance(SponsorWidget, sponsorContainer);
        const widgets = [
            remoteBadge,
            versionWidget,
            publisherWidget,
            extensionKindWidget,
            installCountWidget,
            ratingsWidget,
            sponsorWidget,
        ];
        const description = append(details, $('.description'));
        const installAction = this.instantiationService.createInstance(InstallDropdownAction);
        const actions = [
            this.instantiationService.createInstance(ExtensionRuntimeStateAction),
            this.instantiationService.createInstance(ExtensionStatusLabelAction),
            this.instantiationService.createInstance(UpdateAction, true),
            this.instantiationService.createInstance(SetColorThemeAction),
            this.instantiationService.createInstance(SetFileIconThemeAction),
            this.instantiationService.createInstance(SetProductIconThemeAction),
            this.instantiationService.createInstance(SetLanguageAction),
            this.instantiationService.createInstance(ClearLanguageAction),
            this.instantiationService.createInstance(EnableDropDownAction),
            this.instantiationService.createInstance(DisableDropDownAction),
            this.instantiationService.createInstance(RemoteInstallAction, false),
            this.instantiationService.createInstance(LocalInstallAction),
            this.instantiationService.createInstance(WebInstallAction),
            installAction,
            this.instantiationService.createInstance(InstallingLabelAction),
            this.instantiationService.createInstance(ButtonWithDropDownExtensionAction, 'extensions.uninstall', UninstallAction.UninstallClass, [
                [
                    this.instantiationService.createInstance(MigrateDeprecatedExtensionAction, false),
                    this.instantiationService.createInstance(UninstallAction),
                    this.instantiationService.createInstance(InstallAnotherVersionAction, null, true),
                ]
            ]),
            this.instantiationService.createInstance(TogglePreReleaseExtensionAction),
            this.instantiationService.createInstance(ToggleAutoUpdateForExtensionAction),
            new ExtensionEditorManageExtensionAction(this.scopedContextKeyService || this.contextKeyService, this.instantiationService),
        ];
        const actionsAndStatusContainer = append(details, $('.actions-status-container'));
        const extensionActionBar = this._register(new ActionBar(actionsAndStatusContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof DropDownExtensionAction) {
                    return action.createActionViewItem(options);
                }
                if (action instanceof ButtonWithDropDownExtensionAction) {
                    return new ButtonWithDropdownExtensionActionViewItem(action, {
                        ...options,
                        icon: true,
                        label: true,
                        menuActionsOrProvider: { getActions: () => action.menuActions },
                        menuActionClassNames: action.menuActionClassNames
                    }, this.contextMenuService);
                }
                if (action instanceof ToggleAutoUpdateForExtensionAction) {
                    return new CheckboxActionViewItem(undefined, action, { ...options, icon: true, label: true, checkboxStyles: defaultCheckboxStyles });
                }
                return undefined;
            },
            focusOnlyEnabledItems: true
        }));
        extensionActionBar.push(actions, { icon: true, label: true });
        extensionActionBar.setFocusable(true);
        // update focusable elements when the enablement of an action changes
        this._register(Event.any(...actions.map(a => Event.filter(a.onDidChange, e => e.enabled !== undefined)))(() => {
            extensionActionBar.setFocusable(false);
            extensionActionBar.setFocusable(true);
        }));
        const otherExtensionContainers = [];
        const extensionStatusAction = this.instantiationService.createInstance(ExtensionStatusAction);
        const extensionStatusWidget = this._register(this.instantiationService.createInstance(ExtensionStatusWidget, append(actionsAndStatusContainer, $('.status')), extensionStatusAction));
        otherExtensionContainers.push(extensionStatusAction, new class extends ExtensionWidget {
            render() {
                actionsAndStatusContainer.classList.toggle('list-layout', this.extension?.state === 1 /* ExtensionState.Installed */);
            }
        }());
        const recommendationWidget = this.instantiationService.createInstance(ExtensionRecommendationWidget, append(details, $('.recommendation')));
        widgets.push(recommendationWidget);
        this._register(Event.any(extensionStatusWidget.onDidRender, recommendationWidget.onDidRender)(() => {
            if (this.dimension) {
                this.layout(this.dimension);
            }
        }));
        const extensionContainers = this.instantiationService.createInstance(ExtensionContainers, [...actions, ...widgets, ...otherExtensionContainers]);
        for (const disposable of [...actions, ...widgets, ...otherExtensionContainers, extensionContainers]) {
            this._register(disposable);
        }
        const onError = Event.chain(extensionActionBar.onDidRun, $ => $.map(({ error }) => error)
            .filter(error => !!error));
        this._register(onError(this.onError, this));
        const body = append(root, $('.body'));
        const navbar = new NavBar(body);
        const content = append(body, $('.content'));
        content.id = generateUuid(); // An id is needed for the webview parent flow to
        this.template = {
            builtin,
            content,
            description,
            header,
            icon,
            iconContainer,
            name,
            navbar,
            preview,
            actionsAndStatusContainer,
            extensionActionBar,
            set extension(extension) {
                extensionContainers.extension = extension;
                let lastNonEmptySubtitleEntryContainer;
                for (const subTitleEntryElement of subTitleEntryContainers) {
                    subTitleEntryElement.classList.remove('last-non-empty');
                    if (subTitleEntryElement.children.length > 0) {
                        lastNonEmptySubtitleEntryContainer = subTitleEntryElement;
                    }
                }
                if (lastNonEmptySubtitleEntryContainer) {
                    lastNonEmptySubtitleEntryContainer.classList.add('last-non-empty');
                }
            },
            set gallery(gallery) {
                versionWidget.gallery = gallery;
            },
            set manifest(manifest) {
                installAction.manifest = manifest;
            }
        };
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        this.updatePreReleaseVersionContext();
        if (this.template) {
            await this.render(input.extension, this.template, !!options?.preserveFocus);
        }
    }
    setOptions(options) {
        const currentOptions = this.options;
        super.setOptions(options);
        this.updatePreReleaseVersionContext();
        if (this.input && this.template && currentOptions?.showPreReleaseVersion !== options?.showPreReleaseVersion) {
            this.render(this.input.extension, this.template, !!options?.preserveFocus);
            return;
        }
        if (options?.tab) {
            this.template?.navbar.switch(options.tab);
        }
    }
    updatePreReleaseVersionContext() {
        let showPreReleaseVersion = this.options?.showPreReleaseVersion;
        if (isUndefined(showPreReleaseVersion)) {
            showPreReleaseVersion = !!this.input.extension.gallery?.properties.isPreReleaseVersion;
        }
        this.showPreReleaseVersionContextKey?.set(showPreReleaseVersion);
    }
    async openTab(tab) {
        if (!this.input || !this.template) {
            return;
        }
        if (this.template.navbar.switch(tab)) {
            return;
        }
        // Fallback to Readme tab if ExtensionPack tab does not exist
        if (tab === "extensionPack" /* ExtensionEditorTab.ExtensionPack */) {
            this.template.navbar.switch("readme" /* ExtensionEditorTab.Readme */);
        }
    }
    async getGalleryVersionToShow(extension, preRelease) {
        if (extension.resourceExtension) {
            return null;
        }
        if (extension.local?.source === 'resource') {
            return null;
        }
        if (isUndefined(preRelease)) {
            return null;
        }
        if (preRelease === extension.gallery?.properties.isPreReleaseVersion) {
            return null;
        }
        if (preRelease && !extension.hasPreReleaseVersion) {
            return null;
        }
        if (!preRelease && !extension.hasReleaseVersion) {
            return null;
        }
        return (await this.extensionGalleryService.getExtensions([{ ...extension.identifier, preRelease, hasPreRelease: extension.hasPreReleaseVersion }], CancellationToken.None))[0] || null;
    }
    async render(extension, template, preserveFocus) {
        this.activeElement = null;
        this.transientDisposables.clear();
        const token = this.transientDisposables.add(new CancellationTokenSource()).token;
        const gallery = await this.getGalleryVersionToShow(extension, this.options?.showPreReleaseVersion);
        if (token.isCancellationRequested) {
            return;
        }
        this.extensionReadme = new Cache(() => gallery ? this.extensionGalleryService.getReadme(gallery, token) : extension.getReadme(token));
        this.extensionChangelog = new Cache(() => gallery ? this.extensionGalleryService.getChangelog(gallery, token) : extension.getChangelog(token));
        this.extensionManifest = new Cache(() => gallery ? this.extensionGalleryService.getManifest(gallery, token) : extension.getManifest(token));
        template.extension = extension;
        template.gallery = gallery;
        template.manifest = null;
        this.transientDisposables.add(addDisposableListener(template.icon, 'error', () => template.icon.src = extension.iconUrlFallback, { once: true }));
        template.icon.src = extension.iconUrl;
        template.name.textContent = extension.displayName;
        template.name.classList.toggle('clickable', !!extension.url);
        template.name.classList.toggle('deprecated', !!extension.deprecationInfo);
        template.preview.style.display = extension.preview ? 'inherit' : 'none';
        template.builtin.style.display = extension.isBuiltin ? 'inherit' : 'none';
        template.description.textContent = extension.description;
        if (extension.url) {
            this.transientDisposables.add(onClick(template.name, () => this.openerService.open(URI.parse(extension.url))));
        }
        const manifest = await this.extensionManifest.get().promise;
        if (token.isCancellationRequested) {
            return;
        }
        if (manifest) {
            template.manifest = manifest;
        }
        this.renderNavbar(extension, manifest, template, preserveFocus);
        // report telemetry
        const extRecommendations = this.extensionRecommendationsService.getAllRecommendationsWithReason();
        let recommendationsData = {};
        if (extRecommendations[extension.identifier.id.toLowerCase()]) {
            recommendationsData = { recommendationReason: extRecommendations[extension.identifier.id.toLowerCase()].reasonId };
        }
        /* __GDPR__
        "extensionGallery:openExtension" : {
            "owner": "sandy081",
            "recommendationReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "${include}": [
                "${GalleryExtensionTelemetryData}"
            ]
        }
        */
        this.telemetryService.publicLog('extensionGallery:openExtension', { ...extension.telemetryData, ...recommendationsData });
    }
    renderNavbar(extension, manifest, template, preserveFocus) {
        template.content.innerText = '';
        template.navbar.clear();
        if (this.currentIdentifier !== extension.identifier.id) {
            this.initialScrollProgress.clear();
            this.currentIdentifier = extension.identifier.id;
        }
        template.navbar.push("readme" /* ExtensionEditorTab.Readme */, localize('details', "Details"), localize('detailstooltip', "Extension details, rendered from the extension's 'README.md' file"));
        if (manifest) {
            template.navbar.push("features" /* ExtensionEditorTab.Features */, localize('features', "Features"), localize('featurestooltip', "Lists features contributed by this extension"));
        }
        if (extension.hasChangelog()) {
            template.navbar.push("changelog" /* ExtensionEditorTab.Changelog */, localize('changelog', "Changelog"), localize('changelogtooltip', "Extension update history, rendered from the extension's 'CHANGELOG.md' file"));
        }
        if (extension.dependencies.length) {
            template.navbar.push("dependencies" /* ExtensionEditorTab.Dependencies */, localize('dependencies', "Dependencies"), localize('dependenciestooltip', "Lists extensions this extension depends on"));
        }
        if (manifest && manifest.extensionPack?.length && !this.shallRenderAsExtensionPack(manifest)) {
            template.navbar.push("extensionPack" /* ExtensionEditorTab.ExtensionPack */, localize('extensionpack', "Extension Pack"), localize('extensionpacktooltip', "Lists extensions those will be installed together with this extension"));
        }
        if (this.options?.tab) {
            template.navbar.switch(this.options.tab);
        }
        if (template.navbar.currentId) {
            this.onNavbarChange(extension, { id: template.navbar.currentId, focus: !preserveFocus }, template);
        }
        template.navbar.onChange(e => this.onNavbarChange(extension, e, template), this, this.transientDisposables);
    }
    clearInput() {
        this.contentDisposables.clear();
        this.transientDisposables.clear();
        super.clearInput();
    }
    focus() {
        super.focus();
        this.activeElement?.focus();
    }
    showFind() {
        this.activeWebview?.showFind();
    }
    runFindAction(previous) {
        this.activeWebview?.runFindAction(previous);
    }
    get activeWebview() {
        if (!this.activeElement || !this.activeElement.runFindAction) {
            return undefined;
        }
        return this.activeElement;
    }
    onNavbarChange(extension, { id, focus }, template) {
        this.contentDisposables.clear();
        template.content.innerText = '';
        this.activeElement = null;
        if (id) {
            const cts = new CancellationTokenSource();
            this.contentDisposables.add(toDisposable(() => cts.dispose(true)));
            this.open(id, extension, template, cts.token)
                .then(activeElement => {
                if (cts.token.isCancellationRequested) {
                    return;
                }
                this.activeElement = activeElement;
                if (focus) {
                    this.focus();
                }
            });
        }
    }
    open(id, extension, template, token) {
        switch (id) {
            case "readme" /* ExtensionEditorTab.Readme */: return this.openDetails(extension, template, token);
            case "features" /* ExtensionEditorTab.Features */: return this.openFeatures(template, token);
            case "changelog" /* ExtensionEditorTab.Changelog */: return this.openChangelog(extension, template, token);
            case "dependencies" /* ExtensionEditorTab.Dependencies */: return this.openExtensionDependencies(extension, template, token);
            case "extensionPack" /* ExtensionEditorTab.ExtensionPack */: return this.openExtensionPack(extension, template, token);
        }
        return Promise.resolve(null);
    }
    async openMarkdown(extension, cacheResult, noContentCopy, container, webviewIndex, title, token) {
        try {
            const body = await this.renderMarkdown(extension, cacheResult, container, token);
            if (token.isCancellationRequested) {
                return Promise.resolve(null);
            }
            const webview = this.contentDisposables.add(this.webviewService.createWebviewOverlay({
                title,
                options: {
                    enableFindWidget: true,
                    tryRestoreScrollPosition: true,
                    disableServiceWorker: true,
                },
                contentOptions: {},
                extension: undefined,
            }));
            webview.initialScrollProgress = this.initialScrollProgress.get(webviewIndex) || 0;
            webview.claim(this, this.window, this.scopedContextKeyService);
            setParentFlowTo(webview.container, container);
            webview.layoutWebviewOverElement(container);
            webview.setHtml(body);
            webview.claim(this, this.window, undefined);
            this.contentDisposables.add(webview.onDidFocus(() => this._onDidFocus?.fire()));
            this.contentDisposables.add(webview.onDidScroll(() => this.initialScrollProgress.set(webviewIndex, webview.initialScrollProgress)));
            const removeLayoutParticipant = arrays.insert(this.layoutParticipants, {
                layout: () => {
                    webview.layoutWebviewOverElement(container);
                }
            });
            this.contentDisposables.add(toDisposable(removeLayoutParticipant));
            let isDisposed = false;
            this.contentDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.contentDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since syntax highlighting of code blocks may have changed
                const body = await this.renderMarkdown(extension, cacheResult, container);
                if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                    webview.setHtml(body);
                }
            }));
            this.contentDisposables.add(webview.onDidClickLink(link => {
                if (!link) {
                    return;
                }
                // Only allow links with specific schemes
                if (matchesScheme(link, Schemas.http) || matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.mailto)) {
                    this.openerService.open(link);
                }
                if (matchesScheme(link, Schemas.command) && extension.type === 0 /* ExtensionType.System */) {
                    this.openerService.open(link, { allowCommands: true });
                }
            }));
            return webview;
        }
        catch (e) {
            const p = append(container, $('p.nocontent'));
            p.textContent = noContentCopy;
            return p;
        }
    }
    async renderMarkdown(extension, cacheResult, container, token) {
        const contents = await this.loadContents(() => cacheResult, container);
        if (token?.isCancellationRequested) {
            return '';
        }
        const content = await renderMarkdownDocument(contents, this.extensionService, this.languageService, { shouldSanitize: extension.type !== 0 /* ExtensionType.System */, token });
        if (token?.isCancellationRequested) {
            return '';
        }
        return this.renderBody(content);
    }
    renderBody(body) {
        const nonce = generateUuid();
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; script-src 'none'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}

					/* prevent scroll-to-top button from blocking the body text */
					body {
						padding-bottom: 75px;
					}

					#scroll-to-top {
						position: fixed;
						width: 32px;
						height: 32px;
						right: 25px;
						bottom: 25px;
						background-color: var(--vscode-button-secondaryBackground);
						border-color: var(--vscode-button-border);
						border-radius: 50%;
						cursor: pointer;
						box-shadow: 1px 1px 1px rgba(0,0,0,.25);
						outline: none;
						display: flex;
						justify-content: center;
						align-items: center;
					}

					#scroll-to-top:hover {
						background-color: var(--vscode-button-secondaryHoverBackground);
						box-shadow: 2px 2px 2px rgba(0,0,0,.25);
					}

					body.vscode-high-contrast #scroll-to-top {
						border-width: 2px;
						border-style: solid;
						box-shadow: none;
					}

					#scroll-to-top span.icon::before {
						content: "";
						display: block;
						background: var(--vscode-button-secondaryForeground);
						/* Chevron up icon */
						webkit-mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KCS5zdDF7ZmlsbDpub25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvbjwvdGl0bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04bDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						-webkit-mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KCS5zdDF7ZmlsbDpub25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvbjwvdGl0bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04bDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						width: 16px;
						height: 16px;
					}
					${css}
				</style>
			</head>
			<body>
				<a id="scroll-to-top" role="button" aria-label="scroll to top" href="#"><span class="icon"></span></a>
				${body}
			</body>
		</html>`;
    }
    async openDetails(extension, template, token) {
        const details = append(template.content, $('.details'));
        const readmeContainer = append(details, $('.readme-container'));
        const additionalDetailsContainer = append(details, $('.additional-details-container'));
        const layout = () => details.classList.toggle('narrow', this.dimension && this.dimension.width < 500);
        layout();
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout })));
        let activeElement = null;
        const manifest = await this.extensionManifest.get().promise;
        if (manifest && manifest.extensionPack?.length && this.shallRenderAsExtensionPack(manifest)) {
            activeElement = await this.openExtensionPackReadme(extension, manifest, readmeContainer, token);
        }
        else {
            activeElement = await this.openMarkdown(extension, this.extensionReadme.get(), localize('noReadme', "No README available."), readmeContainer, 0 /* WebviewIndex.Readme */, localize('Readme title', "Readme"), token);
        }
        this.renderAdditionalDetails(additionalDetailsContainer, extension);
        return activeElement;
    }
    shallRenderAsExtensionPack(manifest) {
        return !!(manifest.categories?.some(category => category.toLowerCase() === 'extension packs'));
    }
    async openExtensionPackReadme(extension, manifest, container, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve(null);
        }
        const extensionPackReadme = append(container, $('div', { class: 'extension-pack-readme' }));
        extensionPackReadme.style.margin = '0 auto';
        extensionPackReadme.style.maxWidth = '882px';
        const extensionPack = append(extensionPackReadme, $('div', { class: 'extension-pack' }));
        if (manifest.extensionPack.length <= 3) {
            extensionPackReadme.classList.add('one-row');
        }
        else if (manifest.extensionPack.length <= 6) {
            extensionPackReadme.classList.add('two-rows');
        }
        else if (manifest.extensionPack.length <= 9) {
            extensionPackReadme.classList.add('three-rows');
        }
        else {
            extensionPackReadme.classList.add('more-rows');
        }
        const extensionPackHeader = append(extensionPack, $('div.header'));
        extensionPackHeader.textContent = localize('extension pack', "Extension Pack ({0})", manifest.extensionPack.length);
        const extensionPackContent = append(extensionPack, $('div', { class: 'extension-pack-content' }));
        extensionPackContent.setAttribute('tabindex', '0');
        append(extensionPack, $('div.footer'));
        const readmeContent = append(extensionPackReadme, $('div.readme-content'));
        await Promise.all([
            this.renderExtensionPack(manifest, extensionPackContent, token),
            this.openMarkdown(extension, this.extensionReadme.get(), localize('noReadme', "No README available."), readmeContent, 0 /* WebviewIndex.Readme */, localize('Readme title', "Readme"), token),
        ]);
        return { focus: () => extensionPackContent.focus() };
    }
    renderAdditionalDetails(container, extension) {
        const content = $('div', { class: 'additional-details-content', tabindex: '0' });
        const scrollableContent = new DomScrollableElement(content, {});
        const layout = () => scrollableContent.scanDomNode();
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        this.contentDisposables.add(scrollableContent);
        this.contentDisposables.add(this.instantiationService.createInstance(AdditionalDetailsWidget, content, extension));
        append(container, scrollableContent.getDomNode());
        scrollableContent.scanDomNode();
    }
    openChangelog(extension, template, token) {
        return this.openMarkdown(extension, this.extensionChangelog.get(), localize('noChangelog', "No Changelog available."), template.content, 1 /* WebviewIndex.Changelog */, localize('Changelog title', "Changelog"), token);
    }
    async openFeatures(template, token) {
        const manifest = await this.loadContents(() => this.extensionManifest.get(), template.content);
        if (token.isCancellationRequested) {
            return null;
        }
        if (!manifest) {
            return null;
        }
        const extensionFeaturesTab = this.contentDisposables.add(this.instantiationService.createInstance(ExtensionFeaturesTab, manifest, this.options?.feature));
        const layout = () => extensionFeaturesTab.layout(template.content.clientHeight, template.content.clientWidth);
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        append(template.content, extensionFeaturesTab.domNode);
        layout();
        return extensionFeaturesTab.domNode;
    }
    openExtensionDependencies(extension, template, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve(null);
        }
        if (arrays.isFalsyOrEmpty(extension.dependencies)) {
            append(template.content, $('p.nocontent')).textContent = localize('noDependencies', "No Dependencies");
            return Promise.resolve(template.content);
        }
        const content = $('div', { class: 'subcontent' });
        const scrollableContent = new DomScrollableElement(content, {});
        append(template.content, scrollableContent.getDomNode());
        this.contentDisposables.add(scrollableContent);
        const dependenciesTree = this.instantiationService.createInstance(ExtensionsTree, new ExtensionData(extension, null, extension => extension.dependencies || [], this.extensionsWorkbenchService), content, {
            listBackground: editorBackground
        });
        const layout = () => {
            scrollableContent.scanDomNode();
            const scrollDimensions = scrollableContent.getScrollDimensions();
            dependenciesTree.layout(scrollDimensions.height);
        };
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        this.contentDisposables.add(dependenciesTree);
        scrollableContent.scanDomNode();
        return Promise.resolve({ focus() { dependenciesTree.domFocus(); } });
    }
    async openExtensionPack(extension, template, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve(null);
        }
        const manifest = await this.loadContents(() => this.extensionManifest.get(), template.content);
        if (token.isCancellationRequested) {
            return null;
        }
        if (!manifest) {
            return null;
        }
        return this.renderExtensionPack(manifest, template.content, token);
    }
    async renderExtensionPack(manifest, parent, token) {
        if (token.isCancellationRequested) {
            return null;
        }
        const content = $('div', { class: 'subcontent' });
        const scrollableContent = new DomScrollableElement(content, { useShadows: false });
        append(parent, scrollableContent.getDomNode());
        const extensionsGridView = this.instantiationService.createInstance(ExtensionsGridView, content, new Delegate());
        const extensions = await getExtensions(manifest.extensionPack, this.extensionsWorkbenchService);
        extensionsGridView.setExtensions(extensions);
        scrollableContent.scanDomNode();
        this.contentDisposables.add(scrollableContent);
        this.contentDisposables.add(extensionsGridView);
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout: () => scrollableContent.scanDomNode() })));
        return content;
    }
    loadContents(loadingTask, container) {
        container.classList.add('loading');
        const result = this.contentDisposables.add(loadingTask());
        const onDone = () => container.classList.remove('loading');
        result.promise.then(onDone, onDone);
        return result.promise;
    }
    layout(dimension) {
        this.dimension = dimension;
        this.layoutParticipants.forEach(p => p.layout());
    }
    onError(err) {
        if (isCancellationError(err)) {
            return;
        }
        this.notificationService.error(err);
    }
};
ExtensionEditor = ExtensionEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IExtensionsWorkbenchService),
    __param(4, IExtensionGalleryService),
    __param(5, IThemeService),
    __param(6, INotificationService),
    __param(7, IOpenerService),
    __param(8, IExtensionRecommendationsService),
    __param(9, IStorageService),
    __param(10, IExtensionService),
    __param(11, IWebviewService),
    __param(12, ILanguageService),
    __param(13, IContextMenuService),
    __param(14, IContextKeyService),
    __param(15, IHoverService)
], ExtensionEditor);
export { ExtensionEditor };
let AdditionalDetailsWidget = class AdditionalDetailsWidget extends Disposable {
    constructor(container, extension, hoverService, openerService, userDataProfilesService, remoteAgentService, fileService, uriIdentityService, extensionsWorkbenchService, extensionGalleryManifestService) {
        super();
        this.container = container;
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.userDataProfilesService = userDataProfilesService;
        this.remoteAgentService = remoteAgentService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.disposables = this._register(new DisposableStore());
        this.render(extension);
        this._register(this.extensionsWorkbenchService.onChange(e => {
            if (e && areSameExtensions(e.identifier, extension.identifier) && e.server === extension.server) {
                this.render(e);
            }
        }));
    }
    render(extension) {
        this.container.innerText = '';
        this.disposables.clear();
        if (extension.local) {
            this.renderInstallInfo(this.container, extension.local);
        }
        if (extension.gallery) {
            this.renderMarketplaceInfo(this.container, extension);
        }
        this.renderCategories(this.container, extension);
        this.renderExtensionResources(this.container, extension);
    }
    renderCategories(container, extension) {
        if (extension.categories.length) {
            const categoriesContainer = append(container, $('.categories-container.additional-details-element'));
            append(categoriesContainer, $('.additional-details-title', undefined, localize('categories', "Categories")));
            const categoriesElement = append(categoriesContainer, $('.categories'));
            this.extensionGalleryManifestService.getExtensionGalleryManifest()
                .then(manifest => {
                const hasCategoryFilter = manifest?.capabilities.extensionQuery.filtering?.some(({ name }) => name === "Category" /* FilterType.Category */);
                for (const category of extension.categories) {
                    const categoryElement = append(categoriesElement, $('span.category', { tabindex: '0' }, category));
                    if (hasCategoryFilter) {
                        categoryElement.classList.add('clickable');
                        this.disposables.add(onClick(categoryElement, () => this.extensionsWorkbenchService.openSearch(`@category:"${category}"`)));
                    }
                }
            });
        }
    }
    renderExtensionResources(container, extension) {
        const resources = [];
        if (extension.url) {
            resources.push([localize('Marketplace', "Marketplace"), URI.parse(extension.url)]);
        }
        if (extension.supportUrl) {
            try {
                resources.push([localize('issues', "Issues"), URI.parse(extension.supportUrl)]);
            }
            catch (error) { /* Ignore */ }
        }
        if (extension.repository) {
            try {
                resources.push([localize('repository', "Repository"), URI.parse(extension.repository)]);
            }
            catch (error) { /* Ignore */ }
        }
        if (extension.licenseUrl) {
            try {
                resources.push([localize('license', "License"), URI.parse(extension.licenseUrl)]);
            }
            catch (error) { /* Ignore */ }
        }
        if (extension.publisherUrl) {
            resources.push([extension.publisherDisplayName, extension.publisherUrl]);
        }
        if (resources.length || extension.publisherSponsorLink) {
            const extensionResourcesContainer = append(container, $('.resources-container.additional-details-element'));
            append(extensionResourcesContainer, $('.additional-details-title', undefined, localize('resources', "Resources")));
            const resourcesElement = append(extensionResourcesContainer, $('.resources'));
            for (const [label, uri] of resources) {
                const resource = append(resourcesElement, $('a.resource', { tabindex: '0' }, label));
                this.disposables.add(onClick(resource, () => this.openerService.open(uri)));
                this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), resource, uri.toString()));
            }
        }
    }
    renderInstallInfo(container, extension) {
        const installInfoContainer = append(container, $('.more-info-container.additional-details-element'));
        append(installInfoContainer, $('.additional-details-title', undefined, localize('Install Info', "Installation")));
        const installInfo = append(installInfoContainer, $('.more-info'));
        append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('id', "Identifier")), $('code', undefined, extension.identifier.id)));
        if (extension.type !== 0 /* ExtensionType.System */) {
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('Version', "Version")), $('code', undefined, extension.manifest.version)));
        }
        if (extension.installedTimestamp) {
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('last updated', "Last Updated")), $('div', undefined, toDateString(new Date(extension.installedTimestamp)))));
        }
        if (!extension.isBuiltin && extension.source !== 'gallery') {
            const element = $('div', undefined, extension.source === 'vsix' ? localize('vsix', "VSIX") : localize('other', "Local"));
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('source', "Source")), element));
            if (isNative && extension.source === 'resource' && extension.location.scheme === Schemas.file) {
                element.classList.add('link');
                element.title = extension.location.fsPath;
                this.disposables.add(onClick(element, () => this.openerService.open(extension.location, { openExternal: true })));
            }
        }
        if (extension.size) {
            const element = $('div', undefined, ByteSize.formatSize(extension.size));
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', { title: localize('size when installed', "Size when installed") }, localize('size', "Size")), element));
            if (isNative && extension.location.scheme === Schemas.file) {
                element.classList.add('link');
                element.title = extension.location.fsPath;
                this.disposables.add(onClick(element, () => this.openerService.open(extension.location, { openExternal: true })));
            }
        }
        this.getCacheLocation(extension).then(cacheLocation => {
            if (!cacheLocation) {
                return;
            }
            computeSize(cacheLocation, this.fileService).then(cacheSize => {
                if (!cacheSize) {
                    return;
                }
                const element = $('div', undefined, ByteSize.formatSize(cacheSize));
                append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', { title: localize('disk space used', "Cache size") }, localize('cache size', "Cache")), element));
                if (isNative && extension.location.scheme === Schemas.file) {
                    element.classList.add('link');
                    element.title = cacheLocation.fsPath;
                    this.disposables.add(onClick(element, () => this.openerService.open(cacheLocation.with({ scheme: Schemas.file }), { openExternal: true })));
                }
            });
        });
    }
    async getCacheLocation(extension) {
        let extensionCacheLocation = this.uriIdentityService.extUri.joinPath(this.userDataProfilesService.defaultProfile.globalStorageHome, extension.identifier.id.toLowerCase());
        if (extension.location.scheme === Schemas.vscodeRemote) {
            const environment = await this.remoteAgentService.getEnvironment();
            if (!environment) {
                return undefined;
            }
            extensionCacheLocation = this.uriIdentityService.extUri.joinPath(environment.globalStorageHome, extension.identifier.id.toLowerCase());
        }
        return extensionCacheLocation;
    }
    renderMarketplaceInfo(container, extension) {
        const gallery = extension.gallery;
        const moreInfoContainer = append(container, $('.more-info-container.additional-details-element'));
        append(moreInfoContainer, $('.additional-details-title', undefined, localize('Marketplace Info', "Marketplace")));
        const moreInfo = append(moreInfoContainer, $('.more-info'));
        if (gallery) {
            if (!extension.local) {
                append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('id', "Identifier")), $('code', undefined, extension.identifier.id)));
                append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('Version', "Version")), $('code', undefined, gallery.version)));
            }
            append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('published', "Published")), $('div', undefined, toDateString(new Date(gallery.releaseDate)))), $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('last released', "Last Released")), $('div', undefined, toDateString(new Date(gallery.lastUpdated)))));
        }
    }
};
AdditionalDetailsWidget = __decorate([
    __param(2, IHoverService),
    __param(3, IOpenerService),
    __param(4, IUserDataProfilesService),
    __param(5, IRemoteAgentService),
    __param(6, IFileService),
    __param(7, IUriIdentityService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IExtensionGalleryManifestService)
], AdditionalDetailsWidget);
const contextKeyExpr = ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', ExtensionEditor.ID), EditorContextKeys.focus.toNegated());
registerAction2(class ShowExtensionEditorFindAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.extensioneditor.showfind',
            title: localize('find', "Find"),
            keybinding: {
                when: contextKeyExpr,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
            }
        });
    }
    run(accessor) {
        const extensionEditor = getExtensionEditor(accessor);
        extensionEditor?.showFind();
    }
});
registerAction2(class StartExtensionEditorFindNextAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.extensioneditor.findNext',
            title: localize('find next', "Find Next"),
            keybinding: {
                when: ContextKeyExpr.and(contextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor) {
        const extensionEditor = getExtensionEditor(accessor);
        extensionEditor?.runFindAction(false);
    }
});
registerAction2(class StartExtensionEditorFindPreviousAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.extensioneditor.findPrevious',
            title: localize('find previous', "Find Previous"),
            keybinding: {
                when: ContextKeyExpr.and(contextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor) {
        const extensionEditor = getExtensionEditor(accessor);
        extensionEditor?.runFindAction(true);
    }
});
registerThemingParticipant((theme, collector) => {
    const link = theme.getColor(textLinkForeground);
    if (link) {
        collector.addRule(`.monaco-workbench .extension-editor .content .details .additional-details-container .resources-container a.resource { color: ${link}; }`);
        collector.addRule(`.monaco-workbench .extension-editor .content .feature-contributions a { color: ${link}; }`);
    }
    const activeLink = theme.getColor(textLinkActiveForeground);
    if (activeLink) {
        collector.addRule(`.monaco-workbench .extension-editor .content .details .additional-details-container .resources-container a.resource:hover,
			.monaco-workbench .extension-editor .content .details .additional-details-container .resources-container a.resource:active { color: ${activeLink}; }`);
        collector.addRule(`.monaco-workbench .extension-editor .content .feature-contributions a:hover,
			.monaco-workbench .extension-editor .content .feature-contributions a:active { color: ${activeLink}; }`);
    }
    const buttonHoverBackgroundColor = theme.getColor(buttonHoverBackground);
    if (buttonHoverBackgroundColor) {
        collector.addRule(`.monaco-workbench .extension-editor .content > .details > .additional-details-container .categories-container > .categories > .category.clickable:hover { background-color: ${buttonHoverBackgroundColor}; border-color: ${buttonHoverBackgroundColor}; }`);
    }
    const buttonForegroundColor = theme.getColor(buttonForeground);
    if (buttonForegroundColor) {
        collector.addRule(`.monaco-workbench .extension-editor .content > .details > .additional-details-container .categories-container > .categories > .category.clickable:hover { color: ${buttonForegroundColor}; }`);
    }
});
function getExtensionEditor(accessor) {
    const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
    if (activeEditorPane instanceof ExtensionEditor) {
        return activeEditorPane;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25FZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQWEscUJBQXFCLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0gsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQWUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3SCxPQUFPLEVBQUUsT0FBTyxF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