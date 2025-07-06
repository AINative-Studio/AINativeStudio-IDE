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
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize } from '../../../../nls.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { EXTENSION_SETTING_TAG, FEATURE_SETTING_TAG, GENERAL_TAG_SETTING_TAG, LANGUAGE_SETTING_TAG, MODIFIED_SETTING_TAG, POLICY_SETTING_TAG } from '../common/preferences.js';
let SettingsSearchFilterDropdownMenuActionViewItem = class SettingsSearchFilterDropdownMenuActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, actionRunner, searchWidget, contextMenuService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            ...options,
            actionRunner,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            menuAsChild: true
        });
        this.searchWidget = searchWidget;
        this.suggestController = SuggestController.get(this.searchWidget.inputWidget);
    }
    render(container) {
        super.render(container);
    }
    doSearchWidgetAction(queryToAppend, triggerSuggest) {
        this.searchWidget.setValue(this.searchWidget.getValue().trimEnd() + ' ' + queryToAppend);
        this.searchWidget.focus();
        if (triggerSuggest && this.suggestController) {
            this.suggestController.triggerSuggest();
        }
    }
    /**
     * The created action appends a query to the search widget search string. It optionally triggers suggestions.
     */
    createAction(id, label, tooltip, queryToAppend, triggerSuggest) {
        return {
            id,
            label,
            tooltip,
            class: undefined,
            enabled: true,
            run: () => { this.doSearchWidgetAction(queryToAppend, triggerSuggest); }
        };
    }
    /**
     * The created action appends a query to the search widget search string, if the query does not exist.
     * Otherwise, it removes the query from the search widget search string.
     * The action does not trigger suggestions after adding or removing the query.
     */
    createToggleAction(id, label, tooltip, queryToAppend) {
        const splitCurrentQuery = this.searchWidget.getValue().split(' ');
        const queryContainsQueryToAppend = splitCurrentQuery.includes(queryToAppend);
        return {
            id,
            label,
            tooltip,
            class: undefined,
            enabled: true,
            checked: queryContainsQueryToAppend,
            run: () => {
                if (!queryContainsQueryToAppend) {
                    const trimmedCurrentQuery = this.searchWidget.getValue().trimEnd();
                    const newQuery = trimmedCurrentQuery ? trimmedCurrentQuery + ' ' + queryToAppend : queryToAppend;
                    this.searchWidget.setValue(newQuery);
                }
                else {
                    const queryWithRemovedTags = this.searchWidget.getValue().split(' ')
                        .filter(word => word !== queryToAppend).join(' ');
                    this.searchWidget.setValue(queryWithRemovedTags);
                }
                this.searchWidget.focus();
            }
        };
    }
    getActions() {
        return [
            this.createToggleAction('modifiedSettingsSearch', localize('modifiedSettingsSearch', "Modified"), localize('modifiedSettingsSearchTooltip', "Add or remove modified settings filter"), `@${MODIFIED_SETTING_TAG}`),
            this.createAction('extSettingsSearch', localize('extSettingsSearch', "Extension ID..."), localize('extSettingsSearchTooltip', "Add extension ID filter"), `@${EXTENSION_SETTING_TAG}`, true),
            this.createAction('featuresSettingsSearch', localize('featureSettingsSearch', "Feature..."), localize('featureSettingsSearchTooltip', "Add feature filter"), `@${FEATURE_SETTING_TAG}`, true),
            this.createAction('tagSettingsSearch', localize('tagSettingsSearch', "Tag..."), localize('tagSettingsSearchTooltip', "Add tag filter"), `@${GENERAL_TAG_SETTING_TAG}`, true),
            this.createAction('langSettingsSearch', localize('langSettingsSearch', "Language..."), localize('langSettingsSearchTooltip', "Add language ID filter"), `@${LANGUAGE_SETTING_TAG}`, true),
            this.createToggleAction('onlineSettingsSearch', localize('onlineSettingsSearch', "Online services"), localize('onlineSettingsSearchTooltip', "Show settings for online services"), '@tag:usesOnlineServices'),
            this.createToggleAction('policySettingsSearch', localize('policySettingsSearch', "Policy services"), localize('policySettingsSearchTooltip', "Show settings for policy services"), `@${POLICY_SETTING_TAG}`)
        ];
    }
};
SettingsSearchFilterDropdownMenuActionViewItem = __decorate([
    __param(4, IContextMenuService)
], SettingsSearchFilterDropdownMenuActionViewItem);
export { SettingsSearchFilterDropdownMenuActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NTZWFyY2hNZW51LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9zZXR0aW5nc1NlYXJjaE1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFNUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXhLLElBQU0sOENBQThDLEdBQXBELE1BQU0sOENBQStDLFNBQVEsMEJBQTBCO0lBRzdGLFlBQ0MsTUFBZSxFQUNmLE9BQStCLEVBQy9CLFlBQXVDLEVBQ3RCLFlBQWlDLEVBQzdCLGtCQUF1QztRQUU1RCxLQUFLLENBQUMsTUFBTSxFQUNYLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUN2QyxrQkFBa0IsRUFDbEI7WUFDQyxHQUFHLE9BQU87WUFDVixZQUFZO1lBQ1osVUFBVSxFQUFFLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLHVCQUF1QixFQUFFLEdBQUcsRUFBRSw4QkFBc0I7WUFDcEQsV0FBVyxFQUFFLElBQUk7U0FDakIsQ0FDRCxDQUFDO1FBYmUsaUJBQVksR0FBWixZQUFZLENBQXFCO1FBZWxE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