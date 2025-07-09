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
var TrustedUriActionsColumnRenderer_1, TrustedUriPathColumnRenderer_1, TrustedUriHostColumnRenderer_1, WorkspaceTrustEditor_1;
import { $, addDisposableListener, addStandardDisposableListener, append, clearNode, EventHelper, EventType, isAncestorOfActiveElement } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ButtonBar } from '../../../../base/browser/ui/button/button.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Action } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { isVirtualResource, isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { asCssVariable, buttonBackground, buttonSecondaryBackground, editorErrorForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IWorkspaceContextService, toWorkspaceIdentifier } from '../../../../platform/workspace/common/workspace.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { debugIconStartForeground } from '../../debug/browser/debugColors.js';
import { IExtensionsWorkbenchService, LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID } from '../../extensions/common/extensions.js';
import { APPLICATION_SCOPES, IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { getExtensionDependencies } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { posix, win32 } from '../../../../base/common/path.js';
import { hasDriveLetter, toSlashes } from '../../../../base/common/extpath.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { defaultButtonStyles, defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { basename, dirname } from '../../../../base/common/resources.js';
export const shieldIcon = registerIcon('workspace-trust-banner', Codicon.shield, localize('shieldIcon', 'Icon for workspace trust ion the banner.'));
const checkListIcon = registerIcon('workspace-trust-editor-check', Codicon.check, localize('checkListIcon', 'Icon for the checkmark in the workspace trust editor.'));
const xListIcon = registerIcon('workspace-trust-editor-cross', Codicon.x, localize('xListIcon', 'Icon for the cross in the workspace trust editor.'));
const folderPickerIcon = registerIcon('workspace-trust-editor-folder-picker', Codicon.folder, localize('folderPickerIcon', 'Icon for the pick folder icon in the workspace trust editor.'));
const editIcon = registerIcon('workspace-trust-editor-edit-folder', Codicon.edit, localize('editIcon', 'Icon for the edit folder icon in the workspace trust editor.'));
const removeIcon = registerIcon('workspace-trust-editor-remove-folder', Codicon.close, localize('removeIcon', 'Icon for the remove folder icon in the workspace trust editor.'));
let WorkspaceTrustedUrisTable = class WorkspaceTrustedUrisTable extends Disposable {
    constructor(container, instantiationService, workspaceService, workspaceTrustManagementService, uriService, labelService, fileDialogService) {
        super();
        this.container = container;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.uriService = uriService;
        this.labelService = labelService;
        this.fileDialogService = fileDialogService;
        this._onDidAcceptEdit = this._register(new Emitter());
        this.onDidAcceptEdit = this._onDidAcceptEdit.event;
        this._onDidRejectEdit = this._register(new Emitter());
        this.onDidRejectEdit = this._onDidRejectEdit.event;
        this._onEdit = this._register(new Emitter());
        this.onEdit = this._onEdit.event;
        this._onDelete = this._register(new Emitter());
        this.onDelete = this._onDelete.event;
        this.descriptionElement = container.appendChild($('.workspace-trusted-folders-description'));
        const tableElement = container.appendChild($('.trusted-uris-table'));
        const addButtonBarElement = container.appendChild($('.trusted-uris-button-bar'));
        this.table = this.instantiationService.createInstance(WorkbenchTable, 'WorkspaceTrust', tableElement, new TrustedUriTableVirtualDelegate(), [
            {
                label: localize('hostColumnLabel', "Host"),
                tooltip: '',
                weight: 1,
                templateId: TrustedUriHostColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('pathColumnLabel', "Path"),
                tooltip: '',
                weight: 8,
                templateId: TrustedUriPathColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: '',
                tooltip: '',
                weight: 1,
                minimumWidth: 75,
                maximumWidth: 75,
                templateId: TrustedUriActionsColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
        ], [
            this.instantiationService.createInstance(TrustedUriHostColumnRenderer),
            this.instantiationService.createInstance(TrustedUriPathColumnRenderer, this),
            this.instantiationService.createInstance(TrustedUriActionsColumnRenderer, this, this.currentWorkspaceUri),
        ], {
            horizontalScrolling: false,
            alwaysConsumeMouseWheel: false,
            openOnSingleClick: false,
            multipleSelectionSupport: false,
            accessibilityProvider: {
                getAriaLabel: (item) => {
                    const hostLabel = getHostLabel(this.labelService, item);
                    if (hostLabel === undefined || hostLabel.length === 0) {
                        return localize('trustedFolderAriaLabel', "{0}, trusted", this.labelService.getUriLabel(item.uri));
                    }
                    return localize('trustedFolderWithHostAriaLabel', "{0} on {1}, trusted", this.labelService.getUriLabel(item.uri), hostLabel);
                },
                getWidgetAriaLabel: () => localize('trustedFoldersAndWorkspaces', "Trusted Folders & Workspaces")
            },
            identityProvider: {
                getId(element) {
                    return element.uri.toString();
                },
            }
        });
        this._register(this.table.onDidOpen(item => {
            // default prevented when input box is double clicked #125052
            if (item && item.element && !item.browserEvent?.defaultPrevented) {
                this.edit(item.element, true);
            }
        }));
        const buttonBar = this._register(new ButtonBar(addButtonBarElement));
        const addButton = this._register(buttonBar.addButton({ title: localize('addButton', "Add Folder"), ...defaultButtonStyles }));
        addButton.label = localize('addButton', "Add Folder");
        this._register(addButton.onDidClick(async () => {
            const uri = await this.fileDialogService.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: this.currentWorkspaceUri,
                openLabel: localize('trustUri', "Trust Folder"),
                title: localize('selectTrustedUri', "Select Folder To Trust")
            });
            if (uri) {
                this.workspaceTrustManagementService.setUrisTrust(uri, true);
            }
        }));
        this._register(this.workspaceTrustManagementService.onDidChangeTrustedFolders(() => {
            this.updateTable();
        }));
    }
    getIndexOfTrustedUriEntry(item) {
        const index = this.trustedUriEntries.indexOf(item);
        if (index === -1) {
            for (let i = 0; i < this.trustedUriEntries.length; i++) {
                if (this.trustedUriEntries[i].uri === item.uri) {
                    return i;
                }
            }
        }
        return index;
    }
    selectTrustedUriEntry(item, focus = true) {
        const index = this.getIndexOfTrustedUriEntry(item);
        if (index !== -1) {
            if (focus) {
                this.table.domFocus();
                this.table.setFocus([index]);
            }
            this.table.setSelection([index]);
        }
    }
    get currentWorkspaceUri() {
        return this.workspaceService.getWorkspace().folders[0]?.uri || URI.file('/');
    }
    get trustedUriEntries() {
        const currentWorkspace = this.workspaceService.getWorkspace();
        const currentWorkspaceUris = currentWorkspace.folders.map(folder => folder.uri);
        if (currentWorkspace.configuration) {
            currentWorkspaceUris.push(currentWorkspace.configuration);
        }
        const entries = this.workspaceTrustManagementService.getTrustedUris().map(uri => {
            let relatedToCurrentWorkspace = false;
            for (const workspaceUri of currentWorkspaceUris) {
                relatedToCurrentWorkspace = relatedToCurrentWorkspace || this.uriService.extUri.isEqualOrParent(workspaceUri, uri);
            }
            return {
                uri,
                parentOfWorkspaceItem: relatedToCurrentWorkspace
            };
        });
        // Sort entries
        const sortedEntries = entries.sort((a, b) => {
            if (a.uri.scheme !== b.uri.scheme) {
                if (a.uri.scheme === Schemas.file) {
                    return -1;
                }
                if (b.uri.scheme === Schemas.file) {
                    return 1;
                }
            }
            const aIsWorkspace = a.uri.path.endsWith('.code-workspace');
            const bIsWorkspace = b.uri.path.endsWith('.code-workspace');
            if (aIsWorkspace !== bIsWorkspace) {
                if (aIsWorkspace) {
                    return 1;
                }
                if (bIsWorkspace) {
                    return -1;
                }
            }
            return a.uri.fsPath.localeCompare(b.uri.fsPath);
        });
        return sortedEntries;
    }
    layout() {
        this.table.layout((this.trustedUriEntries.length * TrustedUriTableVirtualDelegate.ROW_HEIGHT) + TrustedUriTableVirtualDelegate.HEADER_ROW_HEIGHT, undefined);
    }
    updateTable() {
        const entries = this.trustedUriEntries;
        this.container.classList.toggle('empty', entries.length === 0);
        this.descriptionElement.innerText = entries.length ?
            localize('trustedFoldersDescription', "You trust the following folders, their subfolders, and workspace files.") :
            localize('noTrustedFoldersDescriptions', "You haven't trusted any folders or workspace files yet.");
        this.table.splice(0, Number.POSITIVE_INFINITY, this.trustedUriEntries);
        this.layout();
    }
    validateUri(path, item) {
        if (!item) {
            return null;
        }
        if (item.uri.scheme === 'vscode-vfs') {
            const segments = path.split(posix.sep).filter(s => s.length);
            if (segments.length === 0 && path.startsWith(posix.sep)) {
                return {
                    type: 2 /* MessageType.WARNING */,
                    content: localize({ key: 'trustAll', comment: ['The {0} will be a host name where repositories are hosted.'] }, "You will trust all repositories on {0}.", getHostLabel(this.labelService, item))
                };
            }
            if (segments.length === 1) {
                return {
                    type: 2 /* MessageType.WARNING */,
                    content: localize({ key: 'trustOrg', comment: ['The {0} will be an organization or user name.', 'The {1} will be a host name where repositories are hosted.'] }, "You will trust all repositories and forks under '{0}' on {1}.", segments[0], getHostLabel(this.labelService, item))
                };
            }
            if (segments.length > 2) {
                return {
                    type: 3 /* MessageType.ERROR */,
                    content: localize('invalidTrust', "You cannot trust individual folders within a repository.", path)
                };
            }
        }
        return null;
    }
    acceptEdit(item, uri) {
        const trustedFolders = this.workspaceTrustManagementService.getTrustedUris();
        const index = trustedFolders.findIndex(u => this.uriService.extUri.isEqual(u, item.uri));
        if (index >= trustedFolders.length || index === -1) {
            trustedFolders.push(uri);
        }
        else {
            trustedFolders[index] = uri;
        }
        this.workspaceTrustManagementService.setTrustedUris(trustedFolders);
        this._onDidAcceptEdit.fire(item);
    }
    rejectEdit(item) {
        this._onDidRejectEdit.fire(item);
    }
    async delete(item) {
        this.table.focusNext();
        await this.workspaceTrustManagementService.setUrisTrust([item.uri], false);
        if (this.table.getFocus().length === 0) {
            this.table.focusLast();
        }
        this._onDelete.fire(item);
        this.table.domFocus();
    }
    async edit(item, usePickerIfPossible) {
        const canUseOpenDialog = item.uri.scheme === Schemas.file ||
            (item.uri.scheme === this.currentWorkspaceUri.scheme &&
                this.uriService.extUri.isEqualAuthority(this.currentWorkspaceUri.authority, item.uri.authority) &&
                !isVirtualResource(item.uri));
        if (canUseOpenDialog && usePickerIfPossible) {
            const uri = await this.fileDialogService.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: item.uri,
                openLabel: localize('trustUri', "Trust Folder"),
                title: localize('selectTrustedUri', "Select Folder To Trust")
            });
            if (uri) {
                this.acceptEdit(item, uri[0]);
            }
            else {
                this.rejectEdit(item);
            }
        }
        else {
            this.selectTrustedUriEntry(item);
            this._onEdit.fire(item);
        }
    }
};
WorkspaceTrustedUrisTable = __decorate([
    __param(1, IInstantiationService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkspaceTrustManagementService),
    __param(4, IUriIdentityService),
    __param(5, ILabelService),
    __param(6, IFileDialogService)
], WorkspaceTrustedUrisTable);
class TrustedUriTableVirtualDelegate {
    constructor() {
        this.headerRowHeight = TrustedUriTableVirtualDelegate.HEADER_ROW_HEIGHT;
    }
    static { this.HEADER_ROW_HEIGHT = 30; }
    static { this.ROW_HEIGHT = 24; }
    getHeight(item) {
        return TrustedUriTableVirtualDelegate.ROW_HEIGHT;
    }
}
let TrustedUriActionsColumnRenderer = class TrustedUriActionsColumnRenderer {
    static { TrustedUriActionsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'actions'; }
    constructor(table, currentWorkspaceUri, uriService) {
        this.table = table;
        this.currentWorkspaceUri = currentWorkspaceUri;
        this.uriService = uriService;
        this.templateId = TrustedUriActionsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = container.appendChild($('.actions'));
        const actionBar = new ActionBar(element);
        return { actionBar };
    }
    renderElement(item, index, templateData, height) {
        templateData.actionBar.clear();
        const canUseOpenDialog = item.uri.scheme === Schemas.file ||
            (item.uri.scheme === this.currentWorkspaceUri.scheme &&
                this.uriService.extUri.isEqualAuthority(this.currentWorkspaceUri.authority, item.uri.authority) &&
                !isVirtualResource(item.uri));
        const actions = [];
        if (canUseOpenDialog) {
            actions.push(this.createPickerAction(item));
        }
        actions.push(this.createEditAction(item));
        actions.push(this.createDeleteAction(item));
        templateData.actionBar.push(actions, { icon: true });
    }
    createEditAction(item) {
        return {
            label: '',
            class: ThemeIcon.asClassName(editIcon),
            enabled: true,
            id: 'editTrustedUri',
            tooltip: localize('editTrustedUri', "Edit Path"),
            run: () => {
                this.table.edit(item, false);
            }
        };
    }
    createPickerAction(item) {
        return {
            label: '',
            class: ThemeIcon.asClassName(folderPickerIcon),
            enabled: true,
            id: 'pickerTrustedUri',
            tooltip: localize('pickerTrustedUri', "Open File Picker"),
            run: () => {
                this.table.edit(item, true);
            }
        };
    }
    createDeleteAction(item) {
        return {
            label: '',
            class: ThemeIcon.asClassName(removeIcon),
            enabled: true,
            id: 'deleteTrustedUri',
            tooltip: localize('deleteTrustedUri', "Delete Path"),
            run: async () => {
                await this.table.delete(item);
            }
        };
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
    }
};
TrustedUriActionsColumnRenderer = TrustedUriActionsColumnRenderer_1 = __decorate([
    __param(2, IUriIdentityService)
], TrustedUriActionsColumnRenderer);
let TrustedUriPathColumnRenderer = class TrustedUriPathColumnRenderer {
    static { TrustedUriPathColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'path'; }
    constructor(table, contextViewService) {
        this.table = table;
        this.contextViewService = contextViewService;
        this.templateId = TrustedUriPathColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = container.appendChild($('.path'));
        const pathLabel = element.appendChild($('div.path-label'));
        const pathInput = new InputBox(element, this.contextViewService, {
            validationOptions: {
                validation: value => this.table.validateUri(value, this.currentItem)
            },
            inputBoxStyles: defaultInputBoxStyles
        });
        const disposables = new DisposableStore();
        const renderDisposables = disposables.add(new DisposableStore());
        return {
            element,
            pathLabel,
            pathInput,
            disposables,
            renderDisposables
        };
    }
    renderElement(item, index, templateData, height) {
        templateData.renderDisposables.clear();
        this.currentItem = item;
        templateData.renderDisposables.add(this.table.onEdit(async (e) => {
            if (item === e) {
                templateData.element.classList.add('input-mode');
                templateData.pathInput.focus();
                templateData.pathInput.select();
                templateData.element.parentElement.style.paddingLeft = '0px';
            }
        }));
        // stop double click action from re-rendering the element on the table #125052
        templateData.renderDisposables.add(addDisposableListener(templateData.pathInput.element, EventType.DBLCLICK, e => {
            EventHelper.stop(e);
        }));
        const hideInputBox = () => {
            templateData.element.classList.remove('input-mode');
            templateData.element.parentElement.style.paddingLeft = '5px';
        };
        const accept = () => {
            hideInputBox();
            const pathToUse = templateData.pathInput.value;
            const uri = hasDriveLetter(pathToUse) ? item.uri.with({ path: posix.sep + toSlashes(pathToUse) }) : item.uri.with({ path: pathToUse });
            templateData.pathLabel.innerText = this.formatPath(uri);
            if (uri) {
                this.table.acceptEdit(item, uri);
            }
        };
        const reject = () => {
            hideInputBox();
            templateData.pathInput.value = stringValue;
            this.table.rejectEdit(item);
        };
        templateData.renderDisposables.add(addStandardDisposableListener(templateData.pathInput.inputElement, EventType.KEY_DOWN, e => {
            let handled = false;
            if (e.equals(3 /* KeyCode.Enter */)) {
                accept();
                handled = true;
            }
            else if (e.equals(9 /* KeyCode.Escape */)) {
                reject();
                handled = true;
            }
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        }));
        templateData.renderDisposables.add((addDisposableListener(templateData.pathInput.inputElement, EventType.BLUR, () => {
            reject();
        })));
        const stringValue = this.formatPath(item.uri);
        templateData.pathInput.value = stringValue;
        templateData.pathLabel.innerText = stringValue;
        templateData.element.classList.toggle('current-workspace-parent', item.parentOfWorkspaceItem);
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
        templateData.renderDisposables.dispose();
    }
    formatPath(uri) {
        if (uri.scheme === Schemas.file) {
            return normalizeDriveLetter(uri.fsPath);
        }
        // If the path is not a file uri, but points to a windows remote, we should create windows fs path
        // e.g. /c:/user/directory => C:\user\directory
        if (uri.path.startsWith(posix.sep)) {
            const pathWithoutLeadingSeparator = uri.path.substring(1);
            const isWindowsPath = hasDriveLetter(pathWithoutLeadingSeparator, true);
            if (isWindowsPath) {
                return normalizeDriveLetter(win32.normalize(pathWithoutLeadingSeparator), true);
            }
        }
        return uri.path;
    }
};
TrustedUriPathColumnRenderer = TrustedUriPathColumnRenderer_1 = __decorate([
    __param(1, IContextViewService)
], TrustedUriPathColumnRenderer);
function getHostLabel(labelService, item) {
    return item.uri.authority ? labelService.getHostLabel(item.uri.scheme, item.uri.authority) : localize('localAuthority', "Local");
}
let TrustedUriHostColumnRenderer = class TrustedUriHostColumnRenderer {
    static { TrustedUriHostColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'host'; }
    constructor(labelService) {
        this.labelService = labelService;
        this.templateId = TrustedUriHostColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const renderDisposables = disposables.add(new DisposableStore());
        const element = container.appendChild($('.host'));
        const hostContainer = element.appendChild($('div.host-label'));
        const buttonBarContainer = element.appendChild($('div.button-bar'));
        return {
            element,
            hostContainer,
            buttonBarContainer,
            disposables,
            renderDisposables
        };
    }
    renderElement(item, index, templateData, height) {
        templateData.renderDisposables.clear();
        templateData.renderDisposables.add({ dispose: () => { clearNode(templateData.buttonBarContainer); } });
        templateData.hostContainer.innerText = getHostLabel(this.labelService, item);
        templateData.element.classList.toggle('current-workspace-parent', item.parentOfWorkspaceItem);
        templateData.hostContainer.style.display = '';
        templateData.buttonBarContainer.style.display = 'none';
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
TrustedUriHostColumnRenderer = TrustedUriHostColumnRenderer_1 = __decorate([
    __param(0, ILabelService)
], TrustedUriHostColumnRenderer);
let WorkspaceTrustEditor = class WorkspaceTrustEditor extends EditorPane {
    static { WorkspaceTrustEditor_1 = this; }
    static { this.ID = 'workbench.editor.workspaceTrust'; }
    constructor(group, telemetryService, themeService, storageService, workspaceService, extensionWorkbenchService, extensionManifestPropertiesService, instantiationService, workspaceTrustManagementService, configurationService, extensionEnablementService, productService, keybindingService) {
        super(WorkspaceTrustEditor_1.ID, group, telemetryService, themeService, storageService);
        this.workspaceService = workspaceService;
        this.extensionWorkbenchService = extensionWorkbenchService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.instantiationService = instantiationService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.configurationService = configurationService;
        this.extensionEnablementService = extensionEnablementService;
        this.productService = productService;
        this.keybindingService = keybindingService;
        this.rendering = false;
        this.rerenderDisposables = this._register(new DisposableStore());
        this.layoutParticipants = [];
    }
    createEditor(parent) {
        this.rootElement = append(parent, $('.workspace-trust-editor', { tabindex: '0' }));
        this.createHeaderElement(this.rootElement);
        const scrollableContent = $('.workspace-trust-editor-body');
        this.bodyScrollBar = this._register(new DomScrollableElement(scrollableContent, {
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
            vertical: 1 /* ScrollbarVisibility.Auto */,
        }));
        append(this.rootElement, this.bodyScrollBar.getDomNode());
        this.createAffectedFeaturesElement(scrollableContent);
        this.createConfigurationElement(scrollableContent);
        this.rootElement.style.setProperty('--workspace-trust-selected-color', asCssVariable(buttonBackground));
        this.rootElement.style.setProperty('--workspace-trust-unselected-color', asCssVariable(buttonSecondaryBackground));
        this.rootElement.style.setProperty('--workspace-trust-check-color', asCssVariable(debugIconStartForeground));
        this.rootElement.style.setProperty('--workspace-trust-x-color', asCssVariable(editorErrorForeground));
        // Navigate page with keyboard
        this._register(addDisposableListener(this.rootElement, EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(16 /* KeyCode.UpArrow */) || event.equals(18 /* KeyCode.DownArrow */)) {
                const navOrder = [this.headerContainer, this.trustedContainer, this.untrustedContainer, this.configurationContainer];
                const currentIndex = navOrder.findIndex(element => {
                    return isAncestorOfActiveElement(element);
                });
                let newIndex = currentIndex;
                if (event.equals(18 /* KeyCode.DownArrow */)) {
                    newIndex++;
                }
                else if (event.equals(16 /* KeyCode.UpArrow */)) {
                    newIndex = Math.max(0, newIndex);
                    newIndex--;
                }
                newIndex += navOrder.length;
                newIndex %= navOrder.length;
                navOrder[newIndex].focus();
            }
            else if (event.equals(9 /* KeyCode.Escape */)) {
                this.rootElement.focus();
            }
            else if (event.equals(2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */)) {
                if (this.workspaceTrustManagementService.canSetWorkspaceTrust()) {
                    this.workspaceTrustManagementService.setWorkspaceTrust(!this.workspaceTrustManagementService.isWorkspaceTrusted());
                }
            }
            else if (event.equals(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */)) {
                if (this.workspaceTrustManagementService.canSetParentFolderTrust()) {
                    this.workspaceTrustManagementService.setParentFolderTrust(true);
                }
            }
        }));
    }
    focus() {
        super.focus();
        this.rootElement.focus();
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        if (token.isCancellationRequested) {
            return;
        }
        await this.workspaceTrustManagementService.workspaceTrustInitialized;
        this.registerListeners();
        await this.render();
    }
    registerListeners() {
        this._register(this.extensionWorkbenchService.onChange(() => this.render()));
        this._register(this.configurationService.onDidChangeRestrictedSettings(() => this.render()));
        this._register(this.workspaceTrustManagementService.onDidChangeTrust(() => this.render()));
        this._register(this.workspaceTrustManagementService.onDidChangeTrustedFolders(() => this.render()));
    }
    getHeaderContainerClass(trusted) {
        if (trusted) {
            return 'workspace-trust-header workspace-trust-trusted';
        }
        return 'workspace-trust-header workspace-trust-untrusted';
    }
    getHeaderTitleText(trusted) {
        if (trusted) {
            if (this.workspaceTrustManagementService.isWorkspaceTrustForced()) {
                return localize('trustedUnsettableWindow', "This window is trusted");
            }
            switch (this.workspaceService.getWorkbenchState()) {
                case 1 /* WorkbenchState.EMPTY */:
                    return localize('trustedHeaderWindow', "You trust this window");
                case 2 /* WorkbenchState.FOLDER */:
                    return localize('trustedHeaderFolder', "You trust this folder");
                case 3 /* WorkbenchState.WORKSPACE */:
                    return localize('trustedHeaderWorkspace', "You trust this workspace");
            }
        }
        return localize('untrustedHeader', "You are in Restricted Mode");
    }
    getHeaderTitleIconClassNames(trusted) {
        return ThemeIcon.asClassNameArray(shieldIcon);
    }
    getFeaturesHeaderText(trusted) {
        let title = '';
        let subTitle = '';
        switch (this.workspaceService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */: {
                title = trusted ? localize('trustedWindow', "In a Trusted Window") : localize('untrustedWorkspace', "In Restricted Mode");
                subTitle = trusted ? localize('trustedWindowSubtitle', "You trust the authors of the files in the current window. All features are enabled:") :
                    localize('untrustedWindowSubtitle', "You do not trust the authors of the files in the current window. The following features are disabled:");
                break;
            }
            case 2 /* WorkbenchState.FOLDER */: {
                title = trusted ? localize('trustedFolder', "In a Trusted Folder") : localize('untrustedWorkspace', "In Restricted Mode");
                subTitle = trusted ? localize('trustedFolderSubtitle', "You trust the authors of the files in the current folder. All features are enabled:") :
                    localize('untrustedFolderSubtitle', "You do not trust the authors of the files in the current folder. The following features are disabled:");
                break;
            }
            case 3 /* WorkbenchState.WORKSPACE */: {
                title = trusted ? localize('trustedWorkspace', "In a Trusted Workspace") : localize('untrustedWorkspace', "In Restricted Mode");
                subTitle = trusted ? localize('trustedWorkspaceSubtitle', "You trust the authors of the files in the current workspace. All features are enabled:") :
                    localize('untrustedWorkspaceSubtitle', "You do not trust the authors of the files in the current workspace. The following features are disabled:");
                break;
            }
        }
        return [title, subTitle];
    }
    async render() {
        if (this.rendering) {
            return;
        }
        this.rendering = true;
        this.rerenderDisposables.clear();
        const isWorkspaceTrusted = this.workspaceTrustManagementService.isWorkspaceTrusted();
        this.rootElement.classList.toggle('trusted', isWorkspaceTrusted);
        this.rootElement.classList.toggle('untrusted', !isWorkspaceTrusted);
        // Header Section
        this.headerTitleText.innerText = this.getHeaderTitleText(isWorkspaceTrusted);
        this.headerTitleIcon.className = 'workspace-trust-title-icon';
        this.headerTitleIcon.classList.add(...this.getHeaderTitleIconClassNames(isWorkspaceTrusted));
        this.headerDescription.innerText = '';
        const headerDescriptionText = append(this.headerDescription, $('div'));
        headerDescriptionText.innerText = isWorkspaceTrusted ?
            localize('trustedDescription', "All features are enabled because trust has been granted to the workspace.") :
            localize('untrustedDescription', "{0} is in a restricted mode intended for safe code browsing.", this.productService.nameShort);
        const headerDescriptionActions = append(this.headerDescription, $('div'));
        const headerDescriptionActionsText = localize({ key: 'workspaceTrustEditorHeaderActions', comment: ['Please ensure the markdown link syntax is not broken up with whitespace [text block](link block)'] }, "[Configure your settings]({0}) or [learn more](https://aka.ms/vscode-workspace-trust).", `command:workbench.trust.configure`);
        for (const node of parseLinkedText(headerDescriptionActionsText).nodes) {
            if (typeof node === 'string') {
                append(headerDescriptionActions, document.createTextNode(node));
            }
            else {
                this.rerenderDisposables.add(this.instantiationService.createInstance(Link, headerDescriptionActions, { ...node, tabIndex: -1 }, {}));
            }
        }
        this.headerContainer.className = this.getHeaderContainerClass(isWorkspaceTrusted);
        this.rootElement.setAttribute('aria-label', `${localize('root element label', "Manage Workspace Trust")}:  ${this.headerContainer.innerText}`);
        // Settings
        const restrictedSettings = this.configurationService.restrictedSettings;
        const configurationRegistry = Registry.as(Extensions.Configuration);
        const settingsRequiringTrustedWorkspaceCount = restrictedSettings.default.filter(key => {
            const property = configurationRegistry.getConfigurationProperties()[key];
            // cannot be configured in workspace
            if (property.scope && (APPLICATION_SCOPES.includes(property.scope) || property.scope === 2 /* ConfigurationScope.MACHINE */)) {
                return false;
            }
            // If deprecated include only those configured in the workspace
            if (property.deprecationMessage || property.markdownDeprecationMessage) {
                if (restrictedSettings.workspace?.includes(key)) {
                    return true;
                }
                if (restrictedSettings.workspaceFolder) {
                    for (const workspaceFolderSettings of restrictedSettings.workspaceFolder.values()) {
                        if (workspaceFolderSettings.includes(key)) {
                            return true;
                        }
                    }
                }
                return false;
            }
            return true;
        }).length;
        // Features List
        this.renderAffectedFeatures(settingsRequiringTrustedWorkspaceCount, this.getExtensionCount());
        // Configuration Tree
        this.workspaceTrustedUrisTable.updateTable();
        this.bodyScrollBar.getDomNode().style.height = `calc(100% - ${this.headerContainer.clientHeight}px)`;
        this.bodyScrollBar.scanDomNode();
        this.rendering = false;
    }
    getExtensionCount() {
        const set = new Set();
        const inVirtualWorkspace = isVirtualWorkspace(this.workspaceService.getWorkspace());
        const localExtensions = this.extensionWorkbenchService.local.filter(ext => ext.local).map(ext => ext.local);
        for (const extension of localExtensions) {
            const enablementState = this.extensionEnablementService.getEnablementState(extension);
            if (enablementState !== 11 /* EnablementState.EnabledGlobally */ && enablementState !== 12 /* EnablementState.EnabledWorkspace */ &&
                enablementState !== 0 /* EnablementState.DisabledByTrustRequirement */ && enablementState !== 8 /* EnablementState.DisabledByExtensionDependency */) {
                continue;
            }
            if (inVirtualWorkspace && this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(extension.manifest) === false) {
                continue;
            }
            if (this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(extension.manifest) !== true) {
                set.add(extension.identifier.id);
                continue;
            }
            const dependencies = getExtensionDependencies(localExtensions, extension);
            if (dependencies.some(ext => this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(ext.manifest) === false)) {
                set.add(extension.identifier.id);
            }
        }
        return set.size;
    }
    createHeaderElement(parent) {
        this.headerContainer = append(parent, $('.workspace-trust-header', { tabIndex: '0' }));
        this.headerTitleContainer = append(this.headerContainer, $('.workspace-trust-title'));
        this.headerTitleIcon = append(this.headerTitleContainer, $('.workspace-trust-title-icon'));
        this.headerTitleText = append(this.headerTitleContainer, $('.workspace-trust-title-text'));
        this.headerDescription = append(this.headerContainer, $('.workspace-trust-description'));
    }
    createConfigurationElement(parent) {
        this.configurationContainer = append(parent, $('.workspace-trust-settings', { tabIndex: '0' }));
        const configurationTitle = append(this.configurationContainer, $('.workspace-trusted-folders-title'));
        configurationTitle.innerText = localize('trustedFoldersAndWorkspaces', "Trusted Folders & Workspaces");
        this.workspaceTrustedUrisTable = this._register(this.instantiationService.createInstance(WorkspaceTrustedUrisTable, this.configurationContainer));
    }
    createAffectedFeaturesElement(parent) {
        this.affectedFeaturesContainer = append(parent, $('.workspace-trust-features'));
        this.trustedContainer = append(this.affectedFeaturesContainer, $('.workspace-trust-limitations.trusted', { tabIndex: '0' }));
        this.untrustedContainer = append(this.affectedFeaturesContainer, $('.workspace-trust-limitations.untrusted', { tabIndex: '0' }));
    }
    async renderAffectedFeatures(numSettings, numExtensions) {
        clearNode(this.trustedContainer);
        clearNode(this.untrustedContainer);
        // Trusted features
        const [trustedTitle, trustedSubTitle] = this.getFeaturesHeaderText(true);
        this.renderLimitationsHeaderElement(this.trustedContainer, trustedTitle, trustedSubTitle);
        const trustedContainerItems = this.workspaceService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ?
            [
                localize('trustedTasks', "Tasks are allowed to run"),
                localize('trustedDebugging', "Debugging is enabled"),
                localize('trustedExtensions', "All enabled extensions are activated")
            ] :
            [
                localize('trustedTasks', "Tasks are allowed to run"),
                localize('trustedDebugging', "Debugging is enabled"),
                localize('trustedSettings', "All workspace settings are applied"),
                localize('trustedExtensions', "All enabled extensions are activated")
            ];
        this.renderLimitationsListElement(this.trustedContainer, trustedContainerItems, ThemeIcon.asClassNameArray(checkListIcon));
        // Restricted Mode features
        const [untrustedTitle, untrustedSubTitle] = this.getFeaturesHeaderText(false);
        this.renderLimitationsHeaderElement(this.untrustedContainer, untrustedTitle, untrustedSubTitle);
        const untrustedContainerItems = this.workspaceService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ?
            [
                localize('untrustedTasks', "Tasks are not allowed to run"),
                localize('untrustedDebugging', "Debugging is disabled"),
                fixBadLocalizedLinks(localize({ key: 'untrustedExtensions', comment: ['Please ensure the markdown link syntax is not broken up with whitespace [text block](link block)'] }, "[{0} extensions]({1}) are disabled or have limited functionality", numExtensions, `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`))
            ] :
            [
                localize('untrustedTasks', "Tasks are not allowed to run"),
                localize('untrustedDebugging', "Debugging is disabled"),
                fixBadLocalizedLinks(numSettings ? localize({ key: 'untrustedSettings', comment: ['Please ensure the markdown link syntax is not broken up with whitespace [text block](link block)'] }, "[{0} workspace settings]({1}) are not applied", numSettings, 'command:settings.filterUntrusted') : localize('no untrustedSettings', "Workspace settings requiring trust are not applied")),
                fixBadLocalizedLinks(localize({ key: 'untrustedExtensions', comment: ['Please ensure the markdown link syntax is not broken up with whitespace [text block](link block)'] }, "[{0} extensions]({1}) are disabled or have limited functionality", numExtensions, `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`))
            ];
        this.renderLimitationsListElement(this.untrustedContainer, untrustedContainerItems, ThemeIcon.asClassNameArray(xListIcon));
        if (this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            if (this.workspaceTrustManagementService.canSetWorkspaceTrust()) {
                this.addDontTrustButtonToElement(this.untrustedContainer);
            }
            else {
                this.addTrustedTextToElement(this.untrustedContainer);
            }
        }
        else {
            if (this.workspaceTrustManagementService.canSetWorkspaceTrust()) {
                this.addTrustButtonToElement(this.trustedContainer);
            }
        }
    }
    createButtonRow(parent, buttonInfo, enabled) {
        const buttonRow = append(parent, $('.workspace-trust-buttons-row'));
        const buttonContainer = append(buttonRow, $('.workspace-trust-buttons'));
        const buttonBar = this.rerenderDisposables.add(new ButtonBar(buttonContainer));
        for (const { action, keybinding } of buttonInfo) {
            const button = buttonBar.addButtonWithDescription(defaultButtonStyles);
            button.label = action.label;
            button.enabled = enabled !== undefined ? enabled : action.enabled;
            button.description = keybinding.getLabel();
            button.element.ariaLabel = action.label + ', ' + localize('keyboardShortcut', "Keyboard Shortcut: {0}", keybinding.getAriaLabel());
            this.rerenderDisposables.add(button.onDidClick(e => {
                if (e) {
                    EventHelper.stop(e, true);
                }
                action.run();
            }));
        }
    }
    addTrustButtonToElement(parent) {
        const trustAction = this.rerenderDisposables.add(new Action('workspace.trust.button.action.grant', localize('trustButton', "Trust"), undefined, true, async () => {
            await this.workspaceTrustManagementService.setWorkspaceTrust(true);
        }));
        const trustActions = [{ action: trustAction, keybinding: this.keybindingService.resolveUserBinding(isMacintosh ? 'Cmd+Enter' : 'Ctrl+Enter')[0] }];
        if (this.workspaceTrustManagementService.canSetParentFolderTrust()) {
            const workspaceIdentifier = toWorkspaceIdentifier(this.workspaceService.getWorkspace());
            const name = basename(dirname(workspaceIdentifier.uri));
            const trustMessageElement = append(parent, $('.trust-message-box'));
            trustMessageElement.innerText = localize('trustMessage', "Trust the authors of all files in the current folder or its parent '{0}'.", name);
            const trustParentAction = this.rerenderDisposables.add(new Action('workspace.trust.button.action.grantParent', localize('trustParentButton', "Trust Parent"), undefined, true, async () => {
                await this.workspaceTrustManagementService.setParentFolderTrust(true);
            }));
            trustActions.push({ action: trustParentAction, keybinding: this.keybindingService.resolveUserBinding(isMacintosh ? 'Cmd+Shift+Enter' : 'Ctrl+Shift+Enter')[0] });
        }
        this.createButtonRow(parent, trustActions);
    }
    addDontTrustButtonToElement(parent) {
        this.createButtonRow(parent, [{
                action: this.rerenderDisposables.add(new Action('workspace.trust.button.action.deny', localize('dontTrustButton', "Don't Trust"), undefined, true, async () => {
                    await this.workspaceTrustManagementService.setWorkspaceTrust(false);
                })),
                keybinding: this.keybindingService.resolveUserBinding(isMacintosh ? 'Cmd+Enter' : 'Ctrl+Enter')[0]
            }]);
    }
    addTrustedTextToElement(parent) {
        if (this.workspaceService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return;
        }
        const textElement = append(parent, $('.workspace-trust-untrusted-description'));
        if (!this.workspaceTrustManagementService.isWorkspaceTrustForced()) {
            textElement.innerText = this.workspaceService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ ? localize('untrustedWorkspaceReason', "This workspace is trusted via the bolded entries in the trusted folders below.") : localize('untrustedFolderReason', "This folder is trusted via the bolded entries in the trusted folders below.");
        }
        else {
            textElement.innerText = localize('trustedForcedReason', "This window is trusted by nature of the workspace that is opened.");
        }
    }
    renderLimitationsHeaderElement(parent, headerText, subtitleText) {
        const limitationsHeaderContainer = append(parent, $('.workspace-trust-limitations-header'));
        const titleElement = append(limitationsHeaderContainer, $('.workspace-trust-limitations-title'));
        const textElement = append(titleElement, $('.workspace-trust-limitations-title-text'));
        const subtitleElement = append(limitationsHeaderContainer, $('.workspace-trust-limitations-subtitle'));
        textElement.innerText = headerText;
        subtitleElement.innerText = subtitleText;
    }
    renderLimitationsListElement(parent, limitations, iconClassNames) {
        const listContainer = append(parent, $('.workspace-trust-limitations-list-container'));
        const limitationsList = append(listContainer, $('ul'));
        for (const limitation of limitations) {
            const limitationListItem = append(limitationsList, $('li'));
            const icon = append(limitationListItem, $('.list-item-icon'));
            const text = append(limitationListItem, $('.list-item-text'));
            icon.classList.add(...iconClassNames);
            const linkedText = parseLinkedText(limitation);
            for (const node of linkedText.nodes) {
                if (typeof node === 'string') {
                    append(text, document.createTextNode(node));
                }
                else {
                    this.rerenderDisposables.add(this.instantiationService.createInstance(Link, text, { ...node, tabIndex: -1 }, {}));
                }
            }
        }
    }
    layout(dimension) {
        if (!this.isVisible()) {
            return;
        }
        this.workspaceTrustedUrisTable.layout();
        this.layoutParticipants.forEach(participant => {
            participant.layout();
        });
        this.bodyScrollBar.scanDomNode();
    }
};
__decorate([
    debounce(100)
], WorkspaceTrustEditor.prototype, "render", null);
WorkspaceTrustEditor = WorkspaceTrustEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IWorkspaceContextService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IExtensionManifestPropertiesService),
    __param(7, IInstantiationService),
    __param(8, IWorkspaceTrustManagementService),
    __param(9, IWorkbenchConfigurationService),
    __param(10, IWorkbenchExtensionEnablementService),
    __param(11, IProductService),
    __param(12, IKeybindingService)
], WorkspaceTrustEditor);
export { WorkspaceTrustEditor };
// Highly scoped fix for #126614
function fixBadLocalizedLinks(badString) {
    const regex = /(.*)\[(.+)\]\s*\((.+)\)(.*)/; // markdown link match with spaces
    return badString.replace(regex, '$1[$2]($3)$4');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3RFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd29ya3NwYWNlL2Jyb3dzZXIvd29ya3NwYWNlVHJ1c3RFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBYSxXQUFXLEVBQUUsU0FBUyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0wsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RSxPQUFPLEVBQVksUUFBUSxFQUFlLE1BQU0sa0RBQWtELENBQUM7QUFDbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbEcsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztB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