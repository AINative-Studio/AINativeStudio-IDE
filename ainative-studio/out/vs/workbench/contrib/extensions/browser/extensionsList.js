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
import './media/extension.css';
import { append, $, addDisposableListener } from '../../../../base/browser/dom.js';
import { dispose, combinedDisposable } from '../../../../base/common/lifecycle.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ExtensionContainers, IExtensionsWorkbenchService } from '../common/extensions.js';
import { ManageExtensionAction, ExtensionRuntimeStateAction, ExtensionStatusLabelAction, RemoteInstallAction, ExtensionStatusAction, LocalInstallAction, ButtonWithDropDownExtensionAction, InstallDropdownAction, InstallingLabelAction, ButtonWithDropdownExtensionActionViewItem, DropDownExtensionAction, WebInstallAction, MigrateDeprecatedExtensionAction, SetLanguageAction, ClearLanguageAction, UpdateAction } from './extensionsActions.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { RatingsWidget, InstallCountWidget, RecommendationWidget, RemoteBadgeWidget, ExtensionPackCountWidget as ExtensionPackBadgeWidget, SyncIgnoredWidget, ExtensionHoverWidget, ExtensionRuntimeStatusWidget, PreReleaseBookmarkWidget, PublisherWidget, ExtensionKindIndicatorWidget } from './extensionsWidgets.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { WORKBENCH_BACKGROUND } from '../../../common/theme.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { extensionVerifiedPublisherIconColor, verifiedPublisherIcon } from '../../../services/extensionManagement/common/extensionsIcons.js';
const EXTENSION_LIST_ELEMENT_HEIGHT = 72;
export class Delegate {
    getHeight() { return EXTENSION_LIST_ELEMENT_HEIGHT; }
    getTemplateId() { return 'extension'; }
}
let Renderer = class Renderer {
    constructor(extensionViewState, options, instantiationService, notificationService, extensionService, extensionsWorkbenchService, extensionEnablementService, contextMenuService) {
        this.extensionViewState = extensionViewState;
        this.options = options;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.contextMenuService = contextMenuService;
    }
    get templateId() { return 'extension'; }
    renderTemplate(root) {
        const recommendationWidget = this.instantiationService.createInstance(RecommendationWidget, append(root, $('.extension-bookmark-container')));
        const preReleaseWidget = this.instantiationService.createInstance(PreReleaseBookmarkWidget, append(root, $('.extension-bookmark-container')));
        const element = append(root, $('.extension-list-item'));
        const iconContainer = append(element, $('.icon-container'));
        const icon = append(iconContainer, $('img.icon', { alt: '' }));
        const iconRemoteBadgeWidget = this.instantiationService.createInstance(RemoteBadgeWidget, iconContainer, false);
        const extensionPackBadgeWidget = this.instantiationService.createInstance(ExtensionPackBadgeWidget, iconContainer);
        const details = append(element, $('.details'));
        const headerContainer = append(details, $('.header-container'));
        const header = append(headerContainer, $('.header'));
        const name = append(header, $('span.name'));
        const installCount = append(header, $('span.install-count'));
        const ratings = append(header, $('span.ratings'));
        const syncIgnore = append(header, $('span.sync-ignored'));
        const extensionKindIndicator = append(header, $('span'));
        const activationStatus = append(header, $('span.activation-status'));
        const headerRemoteBadgeWidget = this.instantiationService.createInstance(RemoteBadgeWidget, header, false);
        const description = append(details, $('.description.ellipsis'));
        const footer = append(details, $('.footer'));
        const publisherWidget = this.instantiationService.createInstance(PublisherWidget, append(footer, $('.publisher-container')), true);
        const actionbar = new ActionBar(footer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof ButtonWithDropDownExtensionAction) {
                    return new ButtonWithDropdownExtensionActionViewItem(action, {
                        ...options,
                        icon: true,
                        label: true,
                        menuActionsOrProvider: { getActions: () => action.menuActions },
                        menuActionClassNames: action.menuActionClassNames
                    }, this.contextMenuService);
                }
                if (action instanceof DropDownExtensionAction) {
                    return action.createActionViewItem(options);
                }
                return undefined;
            },
            focusOnlyEnabledItems: true
        });
        actionbar.setFocusable(false);
        const actionBarListener = actionbar.onDidRun(({ error }) => error && this.notificationService.error(error));
        const extensionStatusIconAction = this.instantiationService.createInstance(ExtensionStatusAction);
        const actions = [
            this.instantiationService.createInstance(ExtensionStatusLabelAction),
            this.instantiationService.createInstance(MigrateDeprecatedExtensionAction, true),
            this.instantiationService.createInstance(ExtensionRuntimeStateAction),
            this.instantiationService.createInstance(UpdateAction, false),
            this.instantiationService.createInstance(InstallDropdownAction),
            this.instantiationService.createInstance(InstallingLabelAction),
            this.instantiationService.createInstance(SetLanguageAction),
            this.instantiationService.createInstance(ClearLanguageAction),
            this.instantiationService.createInstance(RemoteInstallAction, false),
            this.instantiationService.createInstance(LocalInstallAction),
            this.instantiationService.createInstance(WebInstallAction),
            extensionStatusIconAction,
            this.instantiationService.createInstance(ManageExtensionAction)
        ];
        const extensionHoverWidget = this.instantiationService.createInstance(ExtensionHoverWidget, { target: root, position: this.options.hoverOptions.position }, extensionStatusIconAction);
        const widgets = [
            recommendationWidget,
            preReleaseWidget,
            iconRemoteBadgeWidget,
            extensionPackBadgeWidget,
            headerRemoteBadgeWidget,
            publisherWidget,
            extensionHoverWidget,
            this.instantiationService.createInstance(SyncIgnoredWidget, syncIgnore),
            this.instantiationService.createInstance(ExtensionRuntimeStatusWidget, this.extensionViewState, activationStatus),
            this.instantiationService.createInstance(InstallCountWidget, installCount, true),
            this.instantiationService.createInstance(RatingsWidget, ratings, true),
            this.instantiationService.createInstance(ExtensionKindIndicatorWidget, extensionKindIndicator, true),
        ];
        const extensionContainers = this.instantiationService.createInstance(ExtensionContainers, [...actions, ...widgets]);
        actionbar.push(actions, { icon: true, label: true });
        const disposable = combinedDisposable(...actions, ...widgets, actionbar, actionBarListener, extensionContainers);
        return {
            root, element, icon, name, installCount, ratings, description, disposables: [disposable], actionbar,
            extensionDisposables: [],
            set extension(extension) {
                extensionContainers.extension = extension;
            }
        };
    }
    renderPlaceholder(index, data) {
        data.element.classList.add('loading');
        data.root.removeAttribute('aria-label');
        data.root.removeAttribute('data-extension-id');
        data.extensionDisposables = dispose(data.extensionDisposables);
        data.icon.src = '';
        data.name.textContent = '';
        data.description.textContent = '';
        data.installCount.style.display = 'none';
        data.ratings.style.display = 'none';
        data.extension = null;
    }
    renderElement(extension, index, data) {
        data.element.classList.remove('loading');
        data.root.setAttribute('data-extension-id', extension.identifier.id);
        if (extension.state !== 3 /* ExtensionState.Uninstalled */ && !extension.server) {
            // Get the extension if it is installed and has no server information
            extension = this.extensionsWorkbenchService.local.filter(e => e.server === extension.server && areSameExtensions(e.identifier, extension.identifier))[0] || extension;
        }
        data.extensionDisposables = dispose(data.extensionDisposables);
        const updateEnablement = () => {
            const disabled = extension.state === 1 /* ExtensionState.Installed */ && extension.local && !this.extensionEnablementService.isEnabled(extension.local);
            const deprecated = !!extension.deprecationInfo;
            data.element.classList.toggle('deprecated', deprecated);
            data.root.classList.toggle('disabled', disabled);
        };
        updateEnablement();
        this.extensionService.onDidChangeExtensions(() => updateEnablement(), this, data.extensionDisposables);
        data.extensionDisposables.push(addDisposableListener(data.icon, 'error', () => data.icon.src = extension.iconUrlFallback, { once: true }));
        data.icon.src = extension.iconUrl;
        if (!data.icon.complete) {
            data.icon.style.visibility = 'hidden';
            data.icon.onload = () => data.icon.style.visibility = 'inherit';
        }
        else {
            data.icon.style.visibility = 'inherit';
        }
        data.name.textContent = extension.displayName;
        data.description.textContent = extension.description;
        data.installCount.style.display = '';
        data.ratings.style.display = '';
        data.extension = extension;
        if (extension.gallery && extension.gallery.properties && extension.gallery.properties.localizedLanguages && extension.gallery.properties.localizedLanguages.length) {
            data.description.textContent = extension.gallery.properties.localizedLanguages.map(name => name[0].toLocaleUpperCase() + name.slice(1)).join(', ');
        }
        this.extensionViewState.onFocus(e => {
            if (areSameExtensions(extension.identifier, e.identifier)) {
                data.actionbar.setFocusable(true);
            }
        }, this, data.extensionDisposables);
        this.extensionViewState.onBlur(e => {
            if (areSameExtensions(extension.identifier, e.identifier)) {
                data.actionbar.setFocusable(false);
            }
        }, this, data.extensionDisposables);
    }
    disposeElement(extension, index, data) {
        data.extensionDisposables = dispose(data.extensionDisposables);
    }
    disposeTemplate(data) {
        data.extensionDisposables = dispose(data.extensionDisposables);
        data.disposables = dispose(data.disposables);
    }
};
Renderer = __decorate([
    __param(2, IInstantiationService),
    __param(3, INotificationService),
    __param(4, IExtensionService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IWorkbenchExtensionEnablementService),
    __param(7, IContextMenuService)
], Renderer);
export { Renderer };
registerThemingParticipant((theme, collector) => {
    const verifiedPublisherIconColor = theme.getColor(extensionVerifiedPublisherIconColor);
    if (verifiedPublisherIconColor) {
        const disabledVerifiedPublisherIconColor = verifiedPublisherIconColor.transparent(.5).makeOpaque(WORKBENCH_BACKGROUND(theme));
        collector.addRule(`.extensions-list .monaco-list .monaco-list-row.disabled:not(.selected) .author .verified-publisher ${ThemeIcon.asCSSSelector(verifiedPublisherIcon)} { color: ${disabledVerifiedPublisherIconColor}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0xpc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbnNMaXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sdUJBQXVCLENBQUM7QUFDL0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuRixPQUFPLEVBQWUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLE9BQU8sRUFBYyxtQkFBbUIsRUFBa0IsMkJBQTJCLEVBQXdCLE1BQU0seUJBQXlCLENBQUM7QUFDN0ksT0FBTyxFQUFFLHFCQUFxQixFQUFFLDJCQUEyQixFQUFFLDBCQUEwQixFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLGlDQUFpQyxFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLHlDQUF5QyxFQUFFLHVCQUF1QixFQUFFLGdCQUFnQixFQUFFLGdDQUFnQyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZiLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQy9HLE9BQU8sRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLElBQUksd0JBQXdCLEVBQUUsaUJBQWlCLEVBQUUsb0JBQW9C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