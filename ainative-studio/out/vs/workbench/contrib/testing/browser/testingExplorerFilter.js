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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { Delayer } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { localize } from '../../../../nls.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ContextScopedSuggestEnabledInputWithHistory } from '../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { testingFilterIcon } from './icons.js';
import { StoredValue } from '../common/storedValue.js';
import { ITestExplorerFilterState } from '../common/testExplorerFilterState.js';
import { ITestService } from '../common/testService.js';
import { denamespaceTestTag } from '../common/testTypes.js';
const testFilterDescriptions = {
    ["@failed" /* TestFilterTerm.Failed */]: localize('testing.filters.showOnlyFailed', "Show Only Failed Tests"),
    ["@executed" /* TestFilterTerm.Executed */]: localize('testing.filters.showOnlyExecuted', "Show Only Executed Tests"),
    ["@doc" /* TestFilterTerm.CurrentDoc */]: localize('testing.filters.currentFile', "Show in Active File Only"),
    ["@openedFiles" /* TestFilterTerm.OpenedFiles */]: localize('testing.filters.openedFiles', "Show in Opened Files Only"),
    ["@hidden" /* TestFilterTerm.Hidden */]: localize('testing.filters.showExcludedTests', "Show Hidden Tests"),
};
let TestingExplorerFilter = class TestingExplorerFilter extends BaseActionViewItem {
    constructor(action, options, state, instantiationService, testService) {
        super(null, action, options);
        this.state = state;
        this.instantiationService = instantiationService;
        this.testService = testService;
        this.focusEmitter = this._register(new Emitter());
        this.onDidFocus = this.focusEmitter.event;
        this.history = this._register(this.instantiationService.createInstance(StoredValue, {
            key: 'testing.filterHistory2',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */
        }));
        this.filtersAction = new Action('markersFiltersAction', localize('testing.filters.menu', "More Filters..."), 'testing-filter-button ' + ThemeIcon.asClassName(testingFilterIcon));
        this.updateFilterActiveState();
        this._register(testService.excluded.onTestExclusionsChanged(this.updateFilterActiveState, this));
    }
    /**
     * @override
     */
    render(container) {
        container.classList.add('testing-filter-action-item');
        const updateDelayer = this._register(new Delayer(400));
        const wrapper = this.wrapper = dom.$('.testing-filter-wrapper');
        container.appendChild(wrapper);
        let history = this.history.get({ lastValue: '', values: [] });
        if (history instanceof Array) {
            history = { lastValue: '', values: history };
        }
        if (history.lastValue) {
            this.state.setText(history.lastValue);
        }
        const input = this.input = this._register(this.instantiationService.createInstance(ContextScopedSuggestEnabledInputWithHistory, {
            id: 'testing.explorer.filter',
            ariaLabel: localize('testExplorerFilterLabel', "Filter text for tests in the explorer"),
            parent: wrapper,
            suggestionProvider: {
                triggerCharacters: ['@'],
                provideResults: () => [
                    ...Object.entries(testFilterDescriptions).map(([label, detail]) => ({ label, detail })),
                    ...Iterable.map(this.testService.collection.tags.values(), tag => {
                        const { ctrlId, tagId } = denamespaceTestTag(tag.id);
                        const insertText = `@${ctrlId}:${tagId}`;
                        return ({
                            label: `@${ctrlId}:${tagId}`,
                            detail: this.testService.collection.getNodeById(ctrlId)?.item.label,
                            insertText: tagId.includes(' ') ? `@${ctrlId}:"${tagId.replace(/(["\\])/g, '\\$1')}"` : insertText,
                        });
                    }),
                ].filter(r => !this.state.text.value.includes(r.label)),
            },
            resourceHandle: 'testing:filter',
            suggestOptions: {
                value: this.state.text.value,
                placeholderText: localize('testExplorerFilter', "Filter (e.g. text, !exclude, @tag)"),
            },
            history: history.values
        }));
        this._register(this.state.text.onDidChange(newValue => {
            if (input.getValue() !== newValue) {
                input.setValue(newValue);
            }
        }));
        this._register(this.state.onDidRequestInputFocus(() => {
            input.focus();
        }));
        this._register(input.onDidFocus(() => {
            this.focusEmitter.fire();
        }));
        this._register(input.onInputDidChange(() => updateDelayer.trigger(() => {
            input.addToHistory();
            this.state.setText(input.getValue());
        })));
        const actionbar = this._register(new ActionBar(container, {
            actionViewItemProvider: (action, options) => {
                if (action.id === this.filtersAction.id) {
                    return this.instantiationService.createInstance(FiltersDropdownMenuActionViewItem, action, options, this.state, this.actionRunner);
                }
                return undefined;
            },
        }));
        actionbar.push(this.filtersAction, { icon: true, label: false });
        this.layout(this.wrapper.clientWidth);
    }
    layout(width) {
        this.input.layout(new dom.Dimension(width - /* horizontal padding */ 24 - /* editor padding */ 8 - /* filter button padding */ 22, 20));
    }
    /**
     * Focuses the filter input.
     */
    focus() {
        this.input.focus();
    }
    /**
     * Persists changes to the input history.
     */
    saveState() {
        this.history.store({ lastValue: this.input.getValue(), values: this.input.getHistory() });
    }
    /**
     * @override
     */
    dispose() {
        this.saveState();
        super.dispose();
    }
    /**
     * Updates the 'checked' state of the filter submenu.
     */
    updateFilterActiveState() {
        this.filtersAction.checked = this.testService.excluded.hasAny;
    }
};
TestingExplorerFilter = __decorate([
    __param(2, ITestExplorerFilterState),
    __param(3, IInstantiationService),
    __param(4, ITestService)
], TestingExplorerFilter);
export { TestingExplorerFilter };
let FiltersDropdownMenuActionViewItem = class FiltersDropdownMenuActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, filters, actionRunner, contextMenuService, testService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            actionRunner,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            menuAsChild: true
        });
        this.filters = filters;
        this.testService = testService;
    }
    render(container) {
        super.render(container);
        this.updateChecked();
    }
    getActions() {
        return [
            ...["@failed" /* TestFilterTerm.Failed */, "@executed" /* TestFilterTerm.Executed */, "@doc" /* TestFilterTerm.CurrentDoc */, "@openedFiles" /* TestFilterTerm.OpenedFiles */].map(term => ({
                checked: this.filters.isFilteringFor(term),
                class: undefined,
                enabled: true,
                id: term,
                label: testFilterDescriptions[term],
                run: () => this.filters.toggleFilteringFor(term),
                tooltip: '',
                dispose: () => null
            })),
            new Separator(),
            {
                checked: this.filters.fuzzy.value,
                class: undefined,
                enabled: true,
                id: 'fuzzy',
                label: localize('testing.filters.fuzzyMatch', "Fuzzy Match"),
                run: () => this.filters.fuzzy.value = !this.filters.fuzzy.value,
                tooltip: ''
            },
            new Separator(),
            {
                checked: this.filters.isFilteringFor("@hidden" /* TestFilterTerm.Hidden */),
                class: undefined,
                enabled: this.testService.excluded.hasAny,
                id: 'showExcluded',
                label: localize('testing.filters.showExcludedTests', "Show Hidden Tests"),
                run: () => this.filters.toggleFilteringFor("@hidden" /* TestFilterTerm.Hidden */),
                tooltip: ''
            },
            {
                class: undefined,
                enabled: this.testService.excluded.hasAny,
                id: 'removeExcluded',
                label: localize('testing.filters.removeTestExclusions', "Unhide All Tests"),
                run: async () => this.testService.excluded.clear(),
                tooltip: ''
            }
        ];
    }
    updateChecked() {
        this.element.classList.toggle('checked', this._action.checked);
    }
};
FiltersDropdownMenuActionViewItem = __decorate([
    __param(4, IContextMenuService),
    __param(5, ITestService)
], FiltersDropdownMenuActionViewItem);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0V4cGxvcmVyRmlsdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0aW5nRXhwbG9yZXJGaWx0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFzRCxNQUFNLDBEQUEwRCxDQUFDO0FBRWxKLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzVHLE9BQU8sRUFBRSxNQUFNLEVBQTBCLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLDJDQUEyQyxFQUEwRCxNQUFNLHFFQUFxRSxDQUFDO0FBQzFMLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUMvQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0s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