/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { category } from './searchActionsBase.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { TEXT_SEARCH_QUICK_ACCESS_PREFIX } from './quickTextSearch/textSearchQuickAccess.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getSelectionTextFromEditor } from './searchView.js';
registerAction2(class TextSearchQuickAccessAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.quickTextSearch" /* Constants.SearchCommandIds.QuickTextSearchActionId */,
            title: nls.localize2('quickTextSearch', "Quick Search"),
            category,
            f1: true
        });
    }
    async run(accessor, match) {
        const quickInputService = accessor.get(IQuickInputService);
        const searchText = getSearchText(accessor) ?? '';
        quickInputService.quickAccess.show(TEXT_SEARCH_QUICK_ACCESS_PREFIX + searchText, { preserveValue: !!searchText });
    }
});
function getSearchText(accessor) {
    const editorService = accessor.get(IEditorService);
    const configurationService = accessor.get(IConfigurationService);
    const activeEditor = editorService.activeTextEditorControl;
    if (!activeEditor) {
        return null;
    }
    if (!activeEditor.hasTextFocus()) {
        return null;
    }
    // only happen if it would also happen for the search view
    const seedSearchStringFromSelection = configurationService.getValue('editor.find.seedSearchStringFromSelection');
    if (!seedSearchStringFromSelection) {
        return null;
    }
    return getSelectionTextFromEditor(false, activeEditor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1RleHRRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hBY3Rpb25zVGV4dFF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFHMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWxGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRzdELGVBQWUsQ0FBQyxNQUFNLDJCQUE0QixTQUFRLE9BQU87SUFFaEU7UUFFQyxLQUFLLENBQUM7WUFDTCxFQUFFLDZGQUFvRDtZQUN0RCxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUM7WUFDdkQsUUFBUTtZQUNSLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFDO0lBRUosQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxLQUFrQztRQUNoRixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2pELGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsK0JBQStCLEdBQUcsVUFBVSxFQUFFLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ25ILENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxTQUFTLGFBQWEsQ0FBQyxRQUEwQjtJQUNoRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBRWpFLE1BQU0sWUFBWSxHQUFZLGFBQWEsQ0FBQyx1QkFBa0MsQ0FBQztJQUMvRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbkIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELDBEQUEwRDtJQUMxRCxNQUFNLDZCQUE2QixHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBVSwyQ0FBMkMsQ0FBQyxDQUFDO0lBQzFILElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE9BQU8sMEJBQTBCLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ3hELENBQUMifQ==