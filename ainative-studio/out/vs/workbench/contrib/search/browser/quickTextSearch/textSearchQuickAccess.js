var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { basenameOrAuthority, dirname } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { getSelectionKeyboardEvent } from '../../../../../platform/list/browser/listService.js';
import { PickerQuickAccessProvider, TriggerAction } from '../../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { DefaultQuickAccessFilterValue } from '../../../../../platform/quickinput/common/quickAccess.js';
import { QuickInputButtonLocation, QuickInputHideReason } from '../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { searchDetailsIcon, searchOpenInFileIcon, searchActivityBarIcon } from '../searchIcons.js';
import { getEditorSelectionFromMatch } from '../searchView.js';
import { getOutOfWorkspaceEditorResources } from '../../common/search.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { QueryBuilder } from '../../../../services/search/common/queryBuilder.js';
import { VIEW_ID } from '../../../../services/search/common/search.js';
import { Event } from '../../../../../base/common/event.js';
import { PickerEditorState } from '../../../../browser/quickaccess.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { Sequencer } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { SearchModelImpl } from '../searchTreeModel/searchModel.js';
import { SearchModelLocation } from '../searchTreeModel/searchTreeCommon.js';
import { searchComparer } from '../searchCompare.js';
export const TEXT_SEARCH_QUICK_ACCESS_PREFIX = '%';
const DEFAULT_TEXT_QUERY_BUILDER_OPTIONS = {
    _reason: 'quickAccessSearch',
    disregardIgnoreFiles: false,
    disregardExcludeSettings: false,
    onlyOpenEditors: false,
    expandPatterns: true
};
const MAX_FILES_SHOWN = 30;
const MAX_RESULTS_PER_FILE = 10;
const DEBOUNCE_DELAY = 75;
let TextSearchQuickAccess = class TextSearchQuickAccess extends PickerQuickAccessProvider {
    _getTextQueryBuilderOptions(charsPerLine) {
        return {
            ...DEFAULT_TEXT_QUERY_BUILDER_OPTIONS,
            ...{
                extraFileResources: this._instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
                maxResults: this.configuration.maxResults ?? undefined,
                isSmartCase: this.configuration.smartCase,
            },
            previewOptions: {
                matchLines: 1,
                charsPerLine
            }
        };
    }
    constructor(_instantiationService, _contextService, _editorService, _labelService, _viewsService, _configurationService) {
        super(TEXT_SEARCH_QUICK_ACCESS_PREFIX, { canAcceptInBackground: true, shouldSkipTrimPickFilter: true });
        this._instantiationService = _instantiationService;
        this._contextService = _contextService;
        this._editorService = _editorService;
        this._labelService = _labelService;
        this._viewsService = _viewsService;
        this._configurationService = _configurationService;
        this.currentAsyncSearch = Promise.resolve({
            results: [],
            messages: []
        });
        this.queryBuilder = this._instantiationService.createInstance(QueryBuilder);
        this.searchModel = this._register(this._instantiationService.createInstance(SearchModelImpl));
        this.editorViewState = this._register(this._instantiationService.createInstance(PickerEditorState));
        this.searchModel.location = SearchModelLocation.QUICK_ACCESS;
        this.editorSequencer = new Sequencer();
    }
    dispose() {
        this.searchModel.dispose();
        super.dispose();
    }
    provide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        if (TEXT_SEARCH_QUICK_ACCESS_PREFIX.length < picker.value.length) {
            picker.valueSelection = [TEXT_SEARCH_QUICK_ACCESS_PREFIX.length, picker.value.length];
        }
        picker.buttons = [{
                location: QuickInputButtonLocation.Inline,
                iconClass: ThemeIcon.asClassName(Codicon.goToSearch),
                tooltip: localize('goToSearch', "Open in Search View")
            }];
        this.editorViewState.reset();
        disposables.add(picker.onDidTriggerButton(async () => {
            if (this.searchModel.searchResult.count() > 0) {
                await this.moveToSearchViewlet(undefined);
            }
            else {
                this._viewsService.openView(VIEW_ID, true);
            }
            picker.hide();
        }));
        const onDidChangeActive = () => {
            const [item] = picker.activeItems;
            if (item?.match) {
                // we must remember our curret view state to be able to restore (will automatically track if there is already stored state)
                this.editorViewState.set();
                const itemMatch = item.match;
                this.editorSequencer.queue(async () => {
                    await this.editorViewState.openTransientEditor({
                        resource: itemMatch.parent().resource,
                        options: { preserveFocus: true, revealIfOpened: true, ignoreError: true, selection: itemMatch.range() }
                    });
                });
            }
        };
        disposables.add(Event.debounce(picker.onDidChangeActive, (last, event) => event, DEBOUNCE_DELAY, true)(onDidChangeActive));
        disposables.add(Event.once(picker.onWillHide)(({ reason }) => {
            // Restore view state upon cancellation if we changed it
            // but only when the picker was closed via explicit user
            // gesture and not e.g. when focus was lost because that
            // could mean the user clicked into the editor directly.
            if (reason === QuickInputHideReason.Gesture) {
                this.editorViewState.restore();
            }
        }));
        disposables.add(Event.once(picker.onDidHide)(({ reason }) => {
            this.searchModel.searchResult.toggleHighlights(false);
        }));
        disposables.add(super.provide(picker, token, runOptions));
        disposables.add(picker.onDidAccept(() => this.searchModel.searchResult.toggleHighlights(false)));
        return disposables;
    }
    get configuration() {
        const editorConfig = this._configurationService.getValue().workbench?.editor;
        const searchConfig = this._configurationService.getValue().search;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
            preserveInput: searchConfig.quickAccess.preserveInput,
            maxResults: searchConfig.maxResults,
            smartCase: searchConfig.smartCase,
            sortOrder: searchConfig.sortOrder,
        };
    }
    get defaultFilterValue() {
        if (this.configuration.preserveInput) {
            return DefaultQuickAccessFilterValue.LAST;
        }
        return undefined;
    }
    doSearch(contentPattern, token) {
        if (contentPattern === '') {
            return undefined;
        }
        const folderResources = this._contextService.getWorkspace().folders;
        const content = {
            pattern: contentPattern,
        };
        this.searchModel.searchResult.toggleHighlights(false);
        const charsPerLine = content.isRegExp ? 10000 : 1000; // from https://github.com/microsoft/vscode/blob/e7ad5651ac26fa00a40aa1e4010e81b92f655569/src/vs/workbench/contrib/search/browser/searchView.ts#L1508
        const query = this.queryBuilder.text(content, folderResources.map(folder => folder.uri), this._getTextQueryBuilderOptions(charsPerLine));
        const result = this.searchModel.search(query, undefined, token);
        const getAsyncResults = async () => {
            this.currentAsyncSearch = result.asyncResults;
            await result.asyncResults;
            const syncResultURIs = new ResourceSet(result.syncResults.map(e => e.resource));
            return this.searchModel.searchResult.matches(false).filter(e => !syncResultURIs.has(e.resource));
        };
        return {
            syncResults: this.searchModel.searchResult.matches(false),
            asyncResults: getAsyncResults()
        };
    }
    async moveToSearchViewlet(currentElem) {
        // this function takes this._searchModel and moves it to the search viewlet's search model.
        // then, this._searchModel will construct a new (empty) SearchModel.
        this._viewsService.openView(VIEW_ID, false);
        const viewlet = this._viewsService.getActiveViewWithId(VIEW_ID);
        await viewlet.replaceSearchModel(this.searchModel, this.currentAsyncSearch);
        this.searchModel = this._instantiationService.createInstance(SearchModelImpl);
        this.searchModel.location = SearchModelLocation.QUICK_ACCESS;
        const viewer = viewlet?.getControl();
        if (currentElem) {
            viewer.setFocus([currentElem], getSelectionKeyboardEvent());
            viewer.setSelection([currentElem], getSelectionKeyboardEvent());
            viewer.reveal(currentElem);
        }
        else {
            viewlet.searchAndReplaceWidget.focus();
        }
    }
    _getPicksFromMatches(matches, limit, firstFile) {
        matches = matches.sort((a, b) => {
            if (firstFile) {
                if (firstFile === a.resource) {
                    return -1;
                }
                else if (firstFile === b.resource) {
                    return 1;
                }
            }
            return searchComparer(a, b, this.configuration.sortOrder);
        });
        const files = matches.length > limit ? matches.slice(0, limit) : matches;
        const picks = [];
        for (let fileIndex = 0; fileIndex < matches.length; fileIndex++) {
            if (fileIndex === limit) {
                picks.push({
                    type: 'separator',
                });
                picks.push({
                    label: localize('QuickSearchSeeMoreFiles', "See More Files"),
                    iconClass: ThemeIcon.asClassName(searchDetailsIcon),
                    accept: async () => {
                        await this.moveToSearchViewlet(matches[limit]);
                    }
                });
                break;
            }
            const iFileInstanceMatch = files[fileIndex];
            const label = basenameOrAuthority(iFileInstanceMatch.resource);
            const description = this._labelService.getUriLabel(dirname(iFileInstanceMatch.resource), { relative: true });
            picks.push({
                label,
                type: 'separator',
                description,
                buttons: [{
                        iconClass: ThemeIcon.asClassName(searchOpenInFileIcon),
                        tooltip: localize('QuickSearchOpenInFile', "Open File")
                    }],
                trigger: async () => {
                    await this.handleAccept(iFileInstanceMatch, {});
                    return TriggerAction.CLOSE_PICKER;
                },
            });
            const results = iFileInstanceMatch.matches() ?? [];
            for (let matchIndex = 0; matchIndex < results.length; matchIndex++) {
                const element = results[matchIndex];
                if (matchIndex === MAX_RESULTS_PER_FILE) {
                    picks.push({
                        label: localize('QuickSearchMore', "More"),
                        iconClass: ThemeIcon.asClassName(searchDetailsIcon),
                        accept: async () => {
                            await this.moveToSearchViewlet(element);
                        }
                    });
                    break;
                }
                const preview = element.preview();
                const previewText = (preview.before + preview.inside + preview.after).trim().substring(0, 999);
                const match = [{
                        start: preview.before.length,
                        end: preview.before.length + preview.inside.length
                    }];
                picks.push({
                    label: `${previewText}`,
                    highlights: {
                        label: match
                    },
                    buttons: [{
                            iconClass: ThemeIcon.asClassName(searchActivityBarIcon),
                            tooltip: localize('showMore', "Open in Search View"),
                        }],
                    ariaLabel: `Match at location ${element.range().startLineNumber}:${element.range().startColumn} - ${previewText}`,
                    accept: async (keyMods, event) => {
                        await this.handleAccept(iFileInstanceMatch, {
                            keyMods,
                            selection: getEditorSelectionFromMatch(element, this.searchModel),
                            preserveFocus: event.inBackground,
                            forcePinned: event.inBackground
                        });
                    },
                    trigger: async () => {
                        await this.moveToSearchViewlet(element);
                        return TriggerAction.CLOSE_PICKER;
                    },
                    match: element
                });
            }
        }
        return picks;
    }
    async handleAccept(iFileInstanceMatch, options) {
        const editorOptions = {
            preserveFocus: options.preserveFocus,
            pinned: options.keyMods?.ctrlCmd || options.forcePinned || this.configuration.openEditorPinned,
            selection: options.selection
        };
        // from https://github.com/microsoft/vscode/blob/f40dabca07a1622b2a0ae3ee741cfc94ab964bef/src/vs/workbench/contrib/search/browser/anythingQuickAccess.ts#L1037
        const targetGroup = options.keyMods?.alt || (this.configuration.openEditorPinned && options.keyMods?.ctrlCmd) || options.forceOpenSideBySide ? SIDE_GROUP : ACTIVE_GROUP;
        await this._editorService.openEditor({
            resource: iFileInstanceMatch.resource,
            options: editorOptions
        }, targetGroup);
    }
    _getPicks(contentPattern, disposables, token) {
        const searchModelAtTimeOfSearch = this.searchModel;
        if (contentPattern === '') {
            this.searchModel.searchResult.clear();
            return [{
                    label: localize('enterSearchTerm', "Enter a term to search for across your files.")
                }];
        }
        const conditionalTokenCts = disposables.add(new CancellationTokenSource());
        disposables.add(token.onCancellationRequested(() => {
            if (searchModelAtTimeOfSearch.location === SearchModelLocation.QUICK_ACCESS) {
                // if the search model has not been imported to the panel, you can cancel
                conditionalTokenCts.cancel();
            }
        }));
        const allMatches = this.doSearch(contentPattern, conditionalTokenCts.token);
        if (!allMatches) {
            return null;
        }
        const matches = allMatches.syncResults;
        const syncResult = this._getPicksFromMatches(matches, MAX_FILES_SHOWN, this._editorService.activeEditor?.resource);
        if (syncResult.length > 0) {
            this.searchModel.searchResult.toggleHighlights(true);
        }
        if (matches.length >= MAX_FILES_SHOWN) {
            return syncResult;
        }
        return {
            picks: syncResult,
            additionalPicks: allMatches.asyncResults
                .then(asyncResults => (asyncResults.length + syncResult.length === 0) ? [{
                    label: localize('noAnythingResults', "No matching results")
                }] : this._getPicksFromMatches(asyncResults, MAX_FILES_SHOWN - matches.length))
                .then(picks => {
                if (picks.length > 0) {
                    this.searchModel.searchResult.toggleHighlights(true);
                }
                return picks;
            })
        };
    }
};
TextSearchQuickAccess = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkspaceContextService),
    __param(2, IEditorService),
    __param(3, ILabelService),
    __param(4, IViewsService),
    __param(5, IConfigurationService)
], TextSearchQuickAccess);
export { TextSearchQuickAccess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3F1aWNrVGV4dFNlYXJjaC90ZXh0U2VhcmNoUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzlFLE9BQU8sRUFBc0MseUJBQXlCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNwSSxPQUFPLEVBQXlFLHlCQUF5QixFQUFTLGFBQWEsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3pNLE9BQU8sRUFBRSw2QkFBNkIsRUFBa0MsTUFBTSwwREFBMEQsQ0FBQztBQUN6SSxPQUFPLEVBQXdDLHdCQUF3QixFQUFFLG9CQUFvQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0osT0FBTyxFQUFFLHdCQUF3QixF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