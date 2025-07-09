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
var TextSearchResultRenderer_1, FolderMatchRenderer_1, FileMatchRenderer_1, MatchRenderer_1;
import * as DOM from '../../../../base/browser/dom.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as paths from '../../../../base/common/path.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { isEqual } from '../../../../base/common/resources.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { SearchContext } from '../common/constants.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { isSearchTreeMatch, isSearchTreeFileMatch, isSearchTreeFolderMatch, isTextSearchHeading, isSearchTreeFolderMatchWorkspaceRoot, isSearchTreeFolderMatchNoRoot, isPlainTextSearchHeading } from './searchTreeModel/searchTreeCommon.js';
import { isSearchTreeAIFileMatch } from './AISearch/aiSearchModelBase.js';
export class SearchDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return SearchDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        if (isSearchTreeFolderMatch(element)) {
            return FolderMatchRenderer.TEMPLATE_ID;
        }
        else if (isSearchTreeFileMatch(element)) {
            return FileMatchRenderer.TEMPLATE_ID;
        }
        else if (isSearchTreeMatch(element)) {
            return MatchRenderer.TEMPLATE_ID;
        }
        else if (isTextSearchHeading(element)) {
            return TextSearchResultRenderer.TEMPLATE_ID;
        }
        console.error('Invalid search tree element', element);
        throw new Error('Invalid search tree element');
    }
}
let TextSearchResultRenderer = class TextSearchResultRenderer extends Disposable {
    static { TextSearchResultRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'textResultMatch'; }
    constructor(labels, contextService, instantiationService, contextKeyService) {
        super();
        this.labels = labels;
        this.contextService = contextService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = TextSearchResultRenderer_1.TEMPLATE_ID;
    }
    disposeCompressedElements(node, index, templateData, height) {
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const textSearchResultElement = DOM.append(container, DOM.$('.textsearchresult'));
        const label = this.labels.create(textSearchResultElement, { supportDescriptionHighlights: true, supportHighlights: true, supportIcons: true });
        disposables.add(label);
        const actionBarContainer = DOM.append(textSearchResultElement, DOM.$('.actionBarContainer'));
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            highlightToggledItems: true,
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return { label, disposables, actions, contextKeyService: contextKeyServiceMain };
    }
    async renderElement(node, index, templateData, height) {
        if (isPlainTextSearchHeading(node.element)) {
            templateData.label.setLabel(nls.localize('searchFolderMatch.plainText.label', "Text Results"));
            SearchContext.AIResultsTitle.bindTo(templateData.contextKeyService).set(false);
            SearchContext.MatchFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FileFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FolderFocusKey.bindTo(templateData.contextKeyService).set(false);
        }
        else {
            let aiName = 'Copilot';
            try {
                aiName = (await node.element.parent().searchModel.getAITextResultProviderName()) || 'Copilot';
            }
            catch {
                // ignore
            }
            const localizedLabel = nls.localize({
                key: 'searchFolderMatch.aiText.label',
                comment: ['This is displayed before the AI text search results, where {0} will be in the place of the AI name (ie: Copilot)']
            }, '{0} Results', aiName);
            // todo: make icon extension-contributed.
            templateData.label.setLabel(`$(${Codicon.copilot.id}) ${localizedLabel}`);
            SearchContext.AIResultsTitle.bindTo(templateData.contextKeyService).set(true);
            SearchContext.MatchFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FileFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FolderFocusKey.bindTo(templateData.contextKeyService).set(false);
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    renderCompressedElements(node, index, templateData, height) {
    }
};
TextSearchResultRenderer = TextSearchResultRenderer_1 = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IInstantiationService),
    __param(3, IContextKeyService)
], TextSearchResultRenderer);
export { TextSearchResultRenderer };
let FolderMatchRenderer = class FolderMatchRenderer extends Disposable {
    static { FolderMatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'folderMatch'; }
    constructor(searchView, labels, contextService, labelService, instantiationService, contextKeyService) {
        super();
        this.searchView = searchView;
        this.labels = labels;
        this.contextService = contextService;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = FolderMatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData, height) {
        const compressed = node.element;
        const folder = compressed.elements[compressed.elements.length - 1];
        const label = compressed.elements.map(e => e.name());
        if (folder.resource) {
            const fileKind = (isSearchTreeFolderMatchWorkspaceRoot(folder)) ? FileKind.ROOT_FOLDER : FileKind.FOLDER;
            templateData.label.setResource({ resource: folder.resource, name: label }, {
                fileKind,
                separator: this.labelService.getSeparator(folder.resource.scheme),
            });
        }
        else {
            templateData.label.setLabel(nls.localize('searchFolderMatch.other.label', "Other files"));
        }
        this.renderFolderDetails(folder, templateData);
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const folderMatchElement = DOM.append(container, DOM.$('.foldermatch'));
        const label = this.labels.create(folderMatchElement, { supportDescriptionHighlights: true, supportHighlights: true });
        disposables.add(label);
        const badge = new CountBadge(DOM.append(folderMatchElement, DOM.$('.badge')), {}, defaultCountBadgeStyles);
        disposables.add(badge);
        const actionBarContainer = DOM.append(folderMatchElement, DOM.$('.actionBarContainer'));
        const elementDisposables = new DisposableStore();
        disposables.add(elementDisposables);
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(true);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            label,
            badge,
            actions,
            disposables,
            elementDisposables,
            contextKeyService: contextKeyServiceMain
        };
    }
    renderElement(node, index, templateData) {
        const folderMatch = node.element;
        if (folderMatch.resource) {
            const workspaceFolder = this.contextService.getWorkspaceFolder(folderMatch.resource);
            if (workspaceFolder && isEqual(workspaceFolder.uri, folderMatch.resource)) {
                templateData.label.setFile(folderMatch.resource, { fileKind: FileKind.ROOT_FOLDER, hidePath: true });
            }
            else {
                templateData.label.setFile(folderMatch.resource, { fileKind: FileKind.FOLDER, hidePath: this.searchView.isTreeLayoutViewVisible });
            }
        }
        else {
            templateData.label.setLabel(nls.localize('searchFolderMatch.other.label', "Other files"));
        }
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!folderMatch.hasOnlyReadOnlyMatches());
        templateData.elementDisposables.add(folderMatch.onChange(() => {
            SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!folderMatch.hasOnlyReadOnlyMatches());
        }));
        this.renderFolderDetails(folderMatch, templateData);
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    renderFolderDetails(folder, templateData) {
        const count = folder.recursiveMatchCount();
        templateData.badge.setCount(count);
        templateData.badge.setTitleFormat(count > 1 ? nls.localize('searchFileMatches', "{0} files found", count) : nls.localize('searchFileMatch', "{0} file found", count));
        templateData.actions.context = { viewer: this.searchView.getControl(), element: folder };
    }
};
FolderMatchRenderer = FolderMatchRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, ILabelService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], FolderMatchRenderer);
export { FolderMatchRenderer };
let FileMatchRenderer = class FileMatchRenderer extends Disposable {
    static { FileMatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'fileMatch'; }
    constructor(searchView, labels, contextService, configurationService, instantiationService, contextKeyService) {
        super();
        this.searchView = searchView;
        this.labels = labels;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = FileMatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Should never happen since node is incompressible.');
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        disposables.add(elementDisposables);
        const fileMatchElement = DOM.append(container, DOM.$('.filematch'));
        const label = this.labels.create(fileMatchElement);
        disposables.add(label);
        const badge = new CountBadge(DOM.append(fileMatchElement, DOM.$('.badge')), {}, defaultCountBadgeStyles);
        disposables.add(badge);
        const actionBarContainer = DOM.append(fileMatchElement, DOM.$('.actionBarContainer'));
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(true);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(false);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            el: fileMatchElement,
            label,
            badge,
            actions,
            disposables,
            elementDisposables,
            contextKeyService: contextKeyServiceMain
        };
    }
    renderElement(node, index, templateData) {
        const fileMatch = node.element;
        templateData.el.setAttribute('data-resource', fileMatch.resource.toString());
        const decorationConfig = this.configurationService.getValue('search').decorations;
        templateData.label.setFile(fileMatch.resource, { range: isSearchTreeAIFileMatch(fileMatch) ? fileMatch.getFullRange() : undefined, hidePath: this.searchView.isTreeLayoutViewVisible && !(isSearchTreeFolderMatchNoRoot(fileMatch.parent())), hideIcon: false, fileDecorations: { colors: decorationConfig.colors, badges: decorationConfig.badges } });
        const count = fileMatch.count();
        templateData.badge.setCount(count);
        templateData.badge.setTitleFormat(count > 1 ? nls.localize('searchMatches', "{0} matches found", count) : nls.localize('searchMatch', "{0} match found", count));
        templateData.actions.context = { viewer: this.searchView.getControl(), element: fileMatch };
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!fileMatch.hasOnlyReadOnlyMatches());
        templateData.elementDisposables.add(fileMatch.onChange(() => {
            SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!fileMatch.hasOnlyReadOnlyMatches());
        }));
        // when hidesExplorerArrows: true, then the file nodes should still have a twistie because it would otherwise
        // be hard to tell whether the node is collapsed or expanded.
        const twistieContainer = templateData.el.parentElement?.parentElement?.querySelector('.monaco-tl-twistie');
        twistieContainer?.classList.add('force-twistie');
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
FileMatchRenderer = FileMatchRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], FileMatchRenderer);
export { FileMatchRenderer };
let MatchRenderer = class MatchRenderer extends Disposable {
    static { MatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'match'; }
    constructor(searchView, contextService, configurationService, instantiationService, contextKeyService, hoverService) {
        super();
        this.searchView = searchView;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this.templateId = MatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Should never happen since node is incompressible.');
    }
    renderTemplate(container) {
        container.classList.add('linematch');
        const lineNumber = DOM.append(container, DOM.$('span.matchLineNum'));
        const parent = DOM.append(container, DOM.$('a.plain.match'));
        const before = DOM.append(parent, DOM.$('span'));
        const match = DOM.append(parent, DOM.$('span.findInFileMatch'));
        const replace = DOM.append(parent, DOM.$('span.replaceMatch'));
        const after = DOM.append(parent, DOM.$('span'));
        const actionBarContainer = DOM.append(container, DOM.$('span.actionBarContainer'));
        const disposables = new DisposableStore();
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(true);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(false);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            parent,
            before,
            match,
            replace,
            after,
            lineNumber,
            actions,
            disposables,
            contextKeyService: contextKeyServiceMain
        };
    }
    renderElement(node, index, templateData) {
        const match = node.element;
        const preview = match.preview();
        const replace = this.searchView.model.isReplaceActive() &&
            !!this.searchView.model.replaceString &&
            !match.isReadonly;
        templateData.before.textContent = preview.before;
        templateData.match.textContent = preview.inside;
        templateData.match.classList.toggle('replace', replace);
        templateData.replace.textContent = replace ? match.replaceString : '';
        templateData.after.textContent = preview.after;
        const title = (preview.fullBefore + (replace ? match.replaceString : preview.inside) + preview.after).trim().substr(0, 999);
        templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.parent, title));
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!match.isReadonly);
        const numLines = match.range().endLineNumber - match.range().startLineNumber;
        const extraLinesStr = numLines > 0 ? `+${numLines}` : '';
        const showLineNumbers = this.configurationService.getValue('search').showLineNumbers;
        const lineNumberStr = showLineNumbers ? `${match.range().startLineNumber}:` : '';
        templateData.lineNumber.classList.toggle('show', (numLines > 0) || showLineNumbers);
        templateData.lineNumber.textContent = lineNumberStr + extraLinesStr;
        templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.lineNumber, this.getMatchTitle(match, showLineNumbers)));
        templateData.actions.context = { viewer: this.searchView.getControl(), element: match };
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    getMatchTitle(match, showLineNumbers) {
        const startLine = match.range().startLineNumber;
        const numLines = match.range().endLineNumber - match.range().startLineNumber;
        const lineNumStr = showLineNumbers ?
            nls.localize('lineNumStr', "From line {0}", startLine, numLines) + ' ' :
            '';
        const numLinesStr = numLines > 0 ?
            '+ ' + nls.localize('numLinesStr', "{0} more lines", numLines) :
            '';
        return lineNumStr + numLinesStr;
    }
};
MatchRenderer = MatchRenderer_1 = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IHoverService)
], MatchRenderer);
export { MatchRenderer };
let SearchAccessibilityProvider = class SearchAccessibilityProvider {
    constructor(searchView, labelService) {
        this.searchView = searchView;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return nls.localize('search', "Search");
    }
    getAriaLabel(element) {
        if (isSearchTreeFolderMatch(element)) {
            const count = element.allDownstreamFileMatches().reduce((total, current) => total + current.count(), 0);
            return element.resource ?
                nls.localize('folderMatchAriaLabel', "{0} matches in folder root {1}, Search result", count, element.name()) :
                nls.localize('otherFilesAriaLabel', "{0} matches outside of the workspace, Search result", count);
        }
        if (isSearchTreeFileMatch(element)) {
            const path = this.labelService.getUriLabel(element.resource, { relative: true }) || element.resource.fsPath;
            return nls.localize('fileMatchAriaLabel', "{0} matches in file {1} of folder {2}, Search result", element.count(), element.name(), paths.dirname(path));
        }
        if (isSearchTreeMatch(element)) {
            const match = element;
            const searchModel = this.searchView.model;
            const replace = searchModel.isReplaceActive() && !!searchModel.replaceString;
            const matchString = match.getMatchString();
            const range = match.range();
            const matchText = match.text().substr(0, range.endColumn + 150);
            if (replace) {
                return nls.localize('replacePreviewResultAria', "'{0}' at column {1} replace {2} with {3}", matchText, range.startColumn, matchString, match.replaceString);
            }
            return nls.localize('searchResultAria', "'{0}' at column {1} found {2}", matchText, range.startColumn, matchString);
        }
        return null;
    }
};
SearchAccessibilityProvider = __decorate([
    __param(1, ILabelService)
], SearchAccessibilityProvider);
export { SearchAccessibilityProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0c1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoUmVzdWx0c1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBSWxGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxLQUFLLEtBQUssTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFHOUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRy9ELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXNCLG9CQUFvQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFM0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFvQixpQkFBaUIsRUFBcUYscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQWdCLG9DQUFvQyxFQUFFLDZCQUE2QixFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDalcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUF3QzFFLE1BQU0sT0FBTyxjQUFjO2FBRVosZ0JBQVcsR0FBRyxFQUFFLENBQUM7SUFFL0IsU0FBUyxDQUFDLE9BQXdCO1FBQ2pDLE9BQU8sY0FBYyxDQUFDLFdBQVcsQ0FBQztJQUNuQyxDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQXdCO1FBQ3JDLElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLG1CQUFtQixDQUFDLFdBQVcsQ0FBQztRQUN4QyxDQUFDO2FBQU0sSUFBSSxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzNDLE9BQU8saUJBQWlCLENBQUMsV0FBVyxDQUFDO1FBQ3RDLENBQUM7YUFBTSxJQUFJLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdkMsT0FBTyxhQUFhLENBQUMsV0FBVyxDQUFDO1FBQ2xDLENBQUM7YUFBTSxJQUFJLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDekMsT0FBTyx3QkFBd0IsQ0FBQyxXQUFXLENBQUM7UUFDN0MsQ0FBQztRQUVELE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEQsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ2hELENBQUM7O0FBR0ssSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVOzthQUN2QyxnQkFBVyxHQUFHLGlCQUFpQixBQUFwQixDQUFxQjtJQUloRCxZQUNTLE1BQXNCLEVBQ0osY0FBa0QsRUFDckQsb0JBQTRELEVBQy9ELGlCQUFzRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQztRQUxBLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBQ00sbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQ3BDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDOUMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQU5sRSxlQUFVLEdBQUcsMEJBQXdCLENBQUMsV0FBVyxDQUFDO0lBUzNELENBQUM7SUFDRCx5QkFBeUIsQ0FBRSxJQUE2RCxFQUFFLEtBQWEsRUFBRSxZQUF1QyxFQUFFLE1BQTBCO0lBRTVLLENBQUM7SUFDRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHVCQUF1QixFQUFFLEVBQUUsNEJBQTRCLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMvSSxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXZCLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUM3RixNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRTlGLE1BQU0sb0JBQW9CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hKLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtZQUN0SSxXQUFXLEVBQUU7Z0JBQ1osaUJBQWlCLEVBQUUsSUFBSTthQUN2QjtZQUNELHFCQUFxQixFQUFFLElBQUk7WUFDM0Isa0JBQWtCLG1DQUEyQjtZQUM3QyxjQUFjLEVBQUU7Z0JBQ2YsWUFBWSxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUM5QztTQUNELENBQUMsQ0FBQyxDQUFDO1FBQ0osT0FBTyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLENBQUM7SUFDbEYsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBd0MsRUFBRSxLQUFhLEVBQUUsWUFBa0MsRUFBRSxNQUEwQjtRQUMxSSxJQUFJLHdCQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzVDLFlBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUMvRixhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0UsYUFBYSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzlFLGFBQWEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3RSxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLE1BQU0sR0FBRyxTQUFTLENBQUM7WUFDdkIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQztZQUMvRixDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLFNBQVM7WUFDVixDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQztnQkFDbkMsR0FBRyxFQUFFLGdDQUFnQztnQkFDckMsT0FBTyxFQUFFLENBQUMsa0hBQWtILENBQUM7YUFDN0gsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFMUIseUNBQXlDO1lBQ3pDLFlBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssY0FBYyxFQUFFLENBQUMsQ0FBQztZQUUxRSxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUUsYUFBYSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzlFLGFBQWEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3RSxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEYsQ0FBQztJQUNGLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBa0M7UUFDakQsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRUQsd0JBQXdCLENBQUMsSUFBNkQsRUFBRSxLQUFhLEVBQUUsWUFBdUMsRUFBRSxNQUEwQjtJQUMxSyxDQUFDOztBQTFFVyx3QkFBd0I7SUFPbEMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7R0FUUix3QkFBd0IsQ0E0RXBDOztBQUNNLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTs7YUFDbEMsZ0JBQVcsR0FBRyxhQUFhLEFBQWhCLENBQWlCO0lBSTVDLFlBQ1MsVUFBc0IsRUFDdEIsTUFBc0IsRUFDSixjQUFrRCxFQUM3RCxZQUE0QyxFQUNwQyxvQkFBNEQsRUFDL0QsaUJBQXNEO1FBRTFFLEtBQUssRUFBRSxDQUFDO1FBUEEsZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUN0QixXQUFNLEdBQU4sTUFBTSxDQUFnQjtRQUNNLG1CQUFjLEdBQWQsY0FBYyxDQUEwQjtRQUM1QyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNuQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzlDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFSbEUsZUFBVSxHQUFHLHFCQUFtQixDQUFDLFdBQVcsQ0FBQztJQVd0RCxDQUFDO0lBRUQsd0JBQXdCLENBQUMsSUFBaUUsRUFBRSxLQUFhLEVBQUUsWUFBa0MsRUFBRSxNQUEwQjtRQUN4SyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbkUsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUVyRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQixNQUFNLFFBQVEsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDekcsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQzFFLFFBQVE7Z0JBQ1IsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO2FBQ2pFLENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxDQUFDO1lBQ1AsWUFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUUxQyxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUN4RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLDRCQUE0QixFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3RILFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDM0csV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFFeEYsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2pELFdBQVcsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUVwQyxNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzlGLGFBQWEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RFLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JFLGFBQWEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BFLGFBQWEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJFLE1BQU0sb0JBQW9CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hKLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtZQUN0SSxXQUFXLEVBQUU7Z0JBQ1osaUJBQWlCLEVBQUUsSUFBSTthQUN2QjtZQUNELGtCQUFrQixtQ0FBMkI7WUFDN0MsY0FBYyxFQUFFO2dCQUNmLFlBQVksRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDOUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLE9BQU87WUFDTixLQUFLO1lBQ0wsS0FBSztZQUNMLE9BQU87WUFDUCxXQUFXO1lBQ1gsa0JBQWtCO1lBQ2xCLGlCQUFpQixFQUFFLHFCQUFxQjtTQUN4QyxDQUFDO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUE0QyxFQUFFLEtBQWEsRUFBRSxZQUFrQztRQUM1RyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ2pDLElBQUksV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzFCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JGLElBQUksZUFBZSxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMzRSxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDdEcsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7WUFDcEksQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsWUFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRCxhQUFhLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFbEgsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUM3RCxhQUFhLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFDbkgsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUF3QyxFQUFFLEtBQWEsRUFBRSxZQUFrQztRQUN6RyxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELHlCQUF5QixDQUFDLElBQWlFLEVBQUUsS0FBYSxFQUFFLFlBQWtDLEVBQUUsTUFBMEI7UUFDekssWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBa0M7UUFDakQsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRU8sbUJBQW1CLENBQUMsTUFBOEIsRUFBRSxZQUFrQztRQUM3RixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzQyxZQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQyxZQUFZLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFdEssWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFpQyxDQUFDO0lBQ3pILENBQUM7O0FBbEhXLG1CQUFtQjtJQVE3QixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0dBWFIsbUJBQW1CLENBbUgvQjs7QUFFTSxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7O2FBQ2hDLGdCQUFXLEdBQUcsV0FBVyxBQUFkLENBQWU7SUFJMUMsWUFDUyxVQUFzQixFQUN0QixNQUFzQixFQUNKLGNBQWtELEVBQ3JELG9CQUE0RCxFQUM1RCxvQkFBNEQsRUFDL0QsaUJBQXNEO1FBRTFFLEtBQUssRUFBRSxDQUFDO1FBUEEsZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUN0QixXQUFNLEdBQU4sTUFBTSxDQUFnQjtRQUNNLG1CQUFjLEdBQWQsY0FBYyxDQUEwQjtRQUNwQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDOUMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQVJsRSxlQUFVLEdBQUcsbUJBQWlCLENBQUMsV0FBVyxDQUFDO0lBV3BELENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxJQUErRCxFQUFFLEtBQWEsRUFBRSxZQUFnQyxFQUFFLE1BQTBCO1FBQ3BLLE1BQU0sSUFBSSxLQUFLLENBQUMsbURBQW1ELENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRUQsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2pELFdBQVcsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNwQyxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNwRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25ELFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDekcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxxQkFBcUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM5RixhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0RSxhQUFhLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRSxhQUFhLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuRSxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV0RSxNQUFNLG9CQUFvQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4SixNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7WUFDdEksV0FBVyxFQUFFO2dCQUNaLGlCQUFpQixFQUFFLElBQUk7YUFDdkI7WUFDRCxrQkFBa0IsbUNBQTJCO1lBQzdDLGNBQWMsRUFBRTtnQkFDZixZQUFZLEVBQUUsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQzlDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPO1lBQ04sRUFBRSxFQUFFLGdCQUFnQjtZQUNwQixLQUFLO1lBQ0wsS0FBSztZQUNMLE9BQU87WUFDUCxXQUFXO1lBQ1gsa0JBQWtCO1lBQ2xCLGlCQUFpQixFQUFFLHFCQUFxQjtTQUN4QyxDQUFDO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUEwQyxFQUFFLEtBQWEsRUFBRSxZQUFnQztRQUN4RyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQy9CLFlBQVksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFN0UsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFpQyxRQUFRLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFDbEgsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsdUJBQXVCLElBQUksQ0FBQyxDQUFDLDZCQUE2QixDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeFYsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2hDLFlBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25DLFlBQVksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRWpLLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBaUMsQ0FBQztRQUUzSCxhQUFhLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFaEgsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUMzRCxhQUFhLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFDakgsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLDZHQUE2RztRQUM3Ryw2REFBNkQ7UUFDN0QsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUUsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0csZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsY0FBYyxDQUFDLE9BQXdDLEVBQUUsS0FBYSxFQUFFLFlBQWdDO1FBQ3ZHLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQWdDO1FBQy9DLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDcEMsQ0FBQzs7QUF6RlcsaUJBQWlCO0lBUTNCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7R0FYUixpQkFBaUIsQ0EwRjdCOztBQUVNLElBQU0sYUFBYSxHQUFuQixNQUFNLGFBQWMsU0FBUSxVQUFVOzthQUM1QixnQkFBVyxHQUFHLE9BQU8sQUFBVixDQUFXO0lBSXRDLFlBQ1MsVUFBc0IsRUFDSixjQUFrRCxFQUNyRCxvQkFBNEQsRUFDNUQsb0JBQTRELEVBQy9ELGlCQUFzRCxFQUMzRCxZQUE0QztRQUUzRCxLQUFLLEVBQUUsQ0FBQztRQVBBLGVBQVUsR0FBVixVQUFVLENBQVk7UUFDTSxtQkFBYyxHQUFkLGNBQWMsQ0FBMEI7UUFDcEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzlDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDMUMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFSbkQsZUFBVSxHQUFHLGVBQWEsQ0FBQyxXQUFXLENBQUM7SUFXaEQsQ0FBQztJQUNELHdCQUF3QixDQUFDLElBQTRELEVBQUUsS0FBYSxFQUFFLFlBQTRCLEVBQUUsTUFBMEI7UUFDN0osTUFBTSxJQUFJLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFckMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDckUsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUMvRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEQsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQztRQUVuRixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRTFDLE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDOUYsYUFBYSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEUsYUFBYSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEUsYUFBYSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEUsYUFBYSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdEUsTUFBTSxvQkFBb0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEosTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixFQUFFO1lBQ3RJLFdBQVcsRUFBRTtnQkFDWixpQkFBaUIsRUFBRSxJQUFJO2FBQ3ZCO1lBQ0Qsa0JBQWtCLG1DQUEyQjtZQUM3QyxjQUFjLEVBQUU7Z0JBQ2YsWUFBWSxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUM5QztTQUNELENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTztZQUNOLE1BQU07WUFDTixNQUFNO1lBQ04sS0FBSztZQUNMLE9BQU87WUFDUCxLQUFLO1lBQ0wsVUFBVTtZQUNWLE9BQU87WUFDUCxXQUFXO1lBQ1gsaUJBQWlCLEVBQUUscUJBQXFCO1NBQ3hDLENBQUM7SUFDSCxDQUFDO0lBRUQsYUFBYSxDQUFDLElBQXNDLEVBQUUsS0FBYSxFQUFFLFlBQTRCO1FBQ2hHLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDM0IsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRTtZQUN0RCxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsYUFBYTtZQUNyQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFFbkIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUNqRCxZQUFZLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ2hELFlBQVksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsWUFBWSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdEUsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztRQUUvQyxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1SCxZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVoSSxhQUFhLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU5RixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxlQUFlLENBQUM7UUFDN0UsTUFBTSxhQUFhLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRXpELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQWlDLFFBQVEsQ0FBQyxDQUFDLGVBQWUsQ0FBQztRQUNySCxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDakYsWUFBWSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsQ0FBQztRQUVwRixZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsR0FBRyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ3BFLFlBQVksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFekssWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFpQyxDQUFDO0lBRXhILENBQUM7SUFFRCxlQUFlLENBQUMsWUFBNEI7UUFDM0MsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRU8sYUFBYSxDQUFDLEtBQXVCLEVBQUUsZUFBd0I7UUFDdEUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLGVBQWUsQ0FBQztRQUNoRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxlQUFlLENBQUM7UUFFN0UsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLENBQUM7WUFDbkMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN4RSxFQUFFLENBQUM7UUFFSixNQUFNLFdBQVcsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDaEUsRUFBRSxDQUFDO1FBRUosT0FBTyxVQUFVLEdBQUcsV0FBVyxDQUFDO0lBQ2pDLENBQUM7O0FBL0dXLGFBQWE7SUFPdkIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGFBQWEsQ0FBQTtHQVhILGFBQWEsQ0FnSHpCOztBQUVNLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTJCO0lBRXZDLFlBQ1MsVUFBc0IsRUFDRSxZQUEyQjtRQURuRCxlQUFVLEdBQVYsVUFBVSxDQUFZO1FBQ0UsaUJBQVksR0FBWixZQUFZLENBQWU7SUFFNUQsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxZQUFZLENBQUMsT0FBd0I7UUFDcEMsSUFBSSx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDeEcsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3hCLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsK0NBQStDLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzlHLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUscURBQXFELEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEcsQ0FBQztRQUVELElBQUkscUJBQXFCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFFNUcsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHNEQUFzRCxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pKLENBQUM7UUFFRCxJQUFJLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDaEMsTUFBTSxLQUFLLEdBQXFCLE9BQU8sQ0FBQztZQUN4QyxNQUFNLFdBQVcsR0FBaUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7WUFDeEQsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDO1lBQzdFLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMzQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDNUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUNoRSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSwwQ0FBMEMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdKLENBQUM7WUFFRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsK0JBQStCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDckgsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNELENBQUE7QUF6Q1ksMkJBQTJCO0lBSXJDLFdBQUEsYUFBYSxDQUFBO0dBSkgsMkJBQTJCLENBeUN2QyJ9