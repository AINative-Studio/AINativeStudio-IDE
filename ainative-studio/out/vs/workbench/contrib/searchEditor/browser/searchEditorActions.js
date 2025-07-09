/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import './media/searchEditor.css';
import { isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getSearchView } from '../../search/browser/searchActionsBase.js';
import { getOrMakeSearchEditorInput, SearchEditorInput } from './searchEditorInput.js';
import { serializeSearchResultForEditor } from './searchEditorSerialization.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
export const toggleSearchEditorCaseSensitiveCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        editorService.activeEditorPane.toggleCaseSensitive();
    }
};
export const toggleSearchEditorWholeWordCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        editorService.activeEditorPane.toggleWholeWords();
    }
};
export const toggleSearchEditorRegexCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        editorService.activeEditorPane.toggleRegex();
    }
};
export const toggleSearchEditorContextLinesCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        editorService.activeEditorPane.toggleContextLines();
    }
};
export const modifySearchEditorContextLinesCommand = (accessor, increase) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        editorService.activeEditorPane.modifyContextLines(increase);
    }
};
export const selectAllSearchEditorMatchesCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        editorService.activeEditorPane.focusAllResults();
    }
};
export async function openSearchEditor(accessor) {
    const viewsService = accessor.get(IViewsService);
    const instantiationService = accessor.get(IInstantiationService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        await instantiationService.invokeFunction(openNewSearchEditor, {
            filesToInclude: searchView.searchIncludePattern.getValue(),
            onlyOpenEditors: searchView.searchIncludePattern.onlySearchInOpenEditors(),
            filesToExclude: searchView.searchExcludePattern.getValue(),
            isRegexp: searchView.searchAndReplaceWidget.searchInput?.getRegex(),
            isCaseSensitive: searchView.searchAndReplaceWidget.searchInput?.getCaseSensitive(),
            matchWholeWord: searchView.searchAndReplaceWidget.searchInput?.getWholeWords(),
            useExcludeSettingsAndIgnoreFiles: searchView.searchExcludePattern.useExcludesAndIgnoreFiles(),
            showIncludesExcludes: !!(searchView.searchIncludePattern.getValue() || searchView.searchExcludePattern.getValue() || !searchView.searchExcludePattern.useExcludesAndIgnoreFiles())
        });
    }
    else {
        await instantiationService.invokeFunction(openNewSearchEditor);
    }
}
export const openNewSearchEditor = async (accessor, _args = {}, toSide = false) => {
    const editorService = accessor.get(IEditorService);
    const editorGroupsService = accessor.get(IEditorGroupsService);
    const telemetryService = accessor.get(ITelemetryService);
    const instantiationService = accessor.get(IInstantiationService);
    const configurationService = accessor.get(IConfigurationService);
    const configurationResolverService = accessor.get(IConfigurationResolverService);
    const workspaceContextService = accessor.get(IWorkspaceContextService);
    const historyService = accessor.get(IHistoryService);
    const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(Schemas.file);
    const lastActiveWorkspaceRoot = activeWorkspaceRootUri ? workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
    const activeEditorControl = editorService.activeTextEditorControl;
    let activeModel;
    let selected = '';
    if (activeEditorControl) {
        if (isDiffEditor(activeEditorControl)) {
            if (activeEditorControl.getOriginalEditor().hasTextFocus()) {
                activeModel = activeEditorControl.getOriginalEditor();
            }
            else {
                activeModel = activeEditorControl.getModifiedEditor();
            }
        }
        else {
            activeModel = activeEditorControl;
        }
        const selection = activeModel?.getSelection();
        selected = (selection && activeModel?.getModel()?.getValueInRange(selection)) ?? '';
        if (selection?.isEmpty() && configurationService.getValue('search').seedWithNearestWord) {
            const wordAtPosition = activeModel.getModel()?.getWordAtPosition(selection.getStartPosition());
            if (wordAtPosition) {
                selected = wordAtPosition.word;
            }
        }
    }
    else {
        if (editorService.activeEditor instanceof SearchEditorInput) {
            const active = editorService.activeEditorPane;
            selected = active.getSelected();
        }
    }
    telemetryService.publicLog2('searchEditor/openNewSearchEditor');
    const seedSearchStringFromSelection = _args.location === 'new' || configurationService.getValue('editor').find.seedSearchStringFromSelection;
    const args = { query: seedSearchStringFromSelection ? selected : undefined };
    for (const entry of Object.entries(_args)) {
        const name = entry[0];
        const value = entry[1];
        if (value !== undefined) {
            args[name] = (typeof value === 'string') ? await configurationResolverService.resolveAsync(lastActiveWorkspaceRoot, value) : value;
        }
    }
    const existing = editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).find(id => id.editor.typeId === SearchEditorInput.ID);
    let editor;
    if (existing && args.location === 'reuse') {
        const group = editorGroupsService.getGroup(existing.groupId);
        if (!group) {
            throw new Error('Invalid group id for search editor');
        }
        const input = existing.editor;
        editor = (await group.openEditor(input));
        if (selected) {
            editor.setQuery(selected);
        }
        else {
            editor.selectQuery();
        }
        editor.setSearchConfig(args);
    }
    else {
        const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, { config: args, resultsContents: '', from: 'rawData' });
        // TODO @roblourens make this use the editor resolver service if possible
        editor = await editorService.openEditor(input, { pinned: true }, toSide ? SIDE_GROUP : ACTIVE_GROUP);
    }
    const searchOnType = configurationService.getValue('search').searchOnType;
    if (args.triggerSearch === true ||
        args.triggerSearch !== false && searchOnType && args.query) {
        editor.triggerSearch({ focusResults: args.focusResults });
    }
    if (!args.focusResults) {
        editor.focusSearchInput();
    }
};
export const createEditorFromSearchResult = async (accessor, searchResult, rawIncludePattern, rawExcludePattern, onlySearchInOpenEditors) => {
    if (!searchResult.query) {
        console.error('Expected searchResult.query to be defined. Got', searchResult);
        return;
    }
    const editorService = accessor.get(IEditorService);
    const telemetryService = accessor.get(ITelemetryService);
    const instantiationService = accessor.get(IInstantiationService);
    const labelService = accessor.get(ILabelService);
    const configurationService = accessor.get(IConfigurationService);
    const sortOrder = configurationService.getValue('search').sortOrder;
    telemetryService.publicLog2('searchEditor/createEditorFromSearchResult');
    const labelFormatter = (uri) => labelService.getUriLabel(uri, { relative: true });
    const { text, matchRanges, config } = serializeSearchResultForEditor(searchResult, rawIncludePattern, rawExcludePattern, 0, labelFormatter, sortOrder);
    config.onlyOpenEditors = onlySearchInOpenEditors;
    const contextLines = configurationService.getValue('search').searchEditor.defaultNumberOfContextLines;
    if (searchResult.isDirty || contextLines === 0 || contextLines === null) {
        const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, { resultsContents: text, config, from: 'rawData' });
        await editorService.openEditor(input, { pinned: true });
        input.setMatchRanges(matchRanges);
    }
    else {
        const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, { from: 'rawData', resultsContents: '', config: { ...config, contextLines } });
        const editor = await editorService.openEditor(input, { pinned: true });
        editor.triggerSearch();
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2hFZGl0b3IvYnJvd3Nlci9zZWFyY2hFZGl0b3JBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RCxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFHMUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDdkYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDaEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDeEgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDOUYsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBSTlFLE1BQU0sQ0FBQyxNQUFNLHNDQUFzQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxFQUFFO0lBQ3BGLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkQsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQztJQUN6QyxJQUFJLEtBQUssWUFBWSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZDLGFBQWEsQ0FBQyxnQkFBaUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQ3hFLENBQUM7QUFDRixDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxDQUFDLFFBQTBCLEVBQUUsRUFBRTtJQUNoRixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUM7SUFDekMsSUFBSSxLQUFLLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztRQUN2QyxhQUFhLENBQUMsZ0JBQWlDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUNyRSxDQUFDO0FBQ0YsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEVBQUU7SUFDNUUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNuRCxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDO0lBQ3pDLElBQUksS0FBSyxZQUFZLGlCQUFpQixFQUFFLENBQUM7UUFDdkMsYUFBYSxDQUFDLGdCQUFpQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2hFLENBQUM7QUFDRixDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxxQ0FBcUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsRUFBRTtJQUNuRixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUM7SUFDekMsSUFBSSxLQUFLLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztRQUN2QyxhQUFhLENBQUMsZ0JBQWlDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUN2RSxDQUFDO0FBQ0YsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLFFBQWlCLEVBQUUsRUFBRTtJQUN0RyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUM7SUFDekMsSUFBSSxLQUFLLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztRQUN2QyxhQUFhLENBQUMsZ0JBQWlDLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDL0UsQ0FBQztBQUNGLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxFQUFFO0lBQ2pGLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkQsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQztJQUN6QyxJQUFJLEtBQUssWUFBWSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZDLGFBQWEsQ0FBQyxnQkFBaUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNwRSxDQUFDO0FBQ0YsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxRQUEwQjtJQUNoRSxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMvQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFO1lBQzlELGNBQWMsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFO1lBQzFELGVBQWUsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsdUJBQXVCLEVBQUU7WUFDMUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUU7WUFDMUQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFO1lBQ25FLGVBQWUsRUFBRSxVQUFVLENBQUMsc0JBQXNCLENBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFFO1lBQ2xGLGNBQWMsRUFBRSxVQUFVLENBQUMsc0JBQXNCLENBQUMsV0FBVyxFQUFFLGFBQWEsRUFBRTtZQUM5RSxnQ0FBZ0MsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMseUJBQXlCLEVBQUU7WUFDN0Ysb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxJQUFJLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1NBQ2xMLENBQUMsQ0FBQztJQUNKLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNoRSxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUMvQixLQUFLLEVBQUUsUUFBMEIsRUFBRSxRQUE4QixFQUFFLEVBQUUsTUFBTSxHQUFHLEtBQUssRUFBRSxFQUFFO0lBQ3RGLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDL0QsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDekQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDakUsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFFakUsTUFBTSw0QkFBNEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDakYsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDdkUsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNyRCxNQUFNLHNCQUFzQixHQUFHLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkYsTUFBTSx1QkFBdUIsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUdySixNQUFNLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztJQUNsRSxJQUFJLFdBQW9DLENBQUM7SUFDekMsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUN6QixJQUFJLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7WUFDdkMsSUFBSSxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7Z0JBQzVELFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLEdBQUcsbUJBQW1CLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN2RCxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxXQUFXLEdBQUcsbUJBQWtDLENBQUM7UUFDbEQsQ0FBQztRQUNELE1BQU0sU0FBUyxHQUFHLFdBQVcsRUFBRSxZQUFZLEVBQUUsQ0FBQztRQUM5QyxRQUFRLEdBQUcsQ0FBQyxTQUFTLElBQUksV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVwRixJQUFJLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxvQkFBb0IsQ0FBQyxRQUFRLENBQWlDLFFBQVEsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDekgsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7WUFDL0YsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDaEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLElBQUksYUFBYSxDQUFDLFlBQVksWUFBWSxpQkFBaUIsRUFBRSxDQUFDO1lBQzdELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxnQkFBZ0MsQ0FBQztZQUM5RCxRQUFRLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsVUFBVSxDQUt6QixrQ0FBa0MsQ0FBQyxDQUFDO0lBRXRDLE1BQU0sNkJBQTZCLEdBQUcsS0FBSyxDQUFDLFFBQVEsS0FBSyxLQUFLLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFpQixRQUFRLENBQUMsQ0FBQyxJQUFLLENBQUMsNkJBQTZCLENBQUM7SUFDOUosTUFBTSxJQUFJLEdBQXlCLEVBQUUsS0FBSyxFQUFFLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ25HLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzNDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEIsSUFBWSxDQUFDLElBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sNEJBQTRCLENBQUMsWUFBWSxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDcEosQ0FBQztJQUNGLENBQUM7SUFDRCxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuSSxJQUFJLE1BQW9CLENBQUM7SUFDekIsSUFBSSxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUMzQyxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQTJCLENBQUM7UUFDbkQsTUFBTSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFpQixDQUFDO1FBQ3pELElBQUksUUFBUSxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQUMsQ0FBQzthQUN2QyxDQUFDO1lBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDBCQUEwQixFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ3RJLHlFQUF5RTtRQUN6RSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFpQixDQUFDO0lBQ3RILENBQUM7SUFFRCxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQWlDLFFBQVEsQ0FBQyxDQUFDLFlBQVksQ0FBQztJQUMxRyxJQUNDLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSTtRQUMzQixJQUFJLENBQUMsYUFBYSxLQUFLLEtBQUssSUFBSSxZQUFZLElBQUksSUFBSSxDQUFDLEtBQUssRUFDekQsQ0FBQztRQUNGLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQ3hDLEtBQUssRUFBRSxRQUEwQixFQUFFLFlBQTJCLEVBQUUsaUJBQXlCLEVBQUUsaUJBQXlCLEVBQUUsdUJBQWdDLEVBQUUsRUFBRTtJQUN6SixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0RBQWdELEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDOUUsT0FBTztJQUNSLENBQUM7SUFFRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3pELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDakQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDakUsTUFBTSxTQUFTLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFpQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFFcEcsZ0JBQWdCLENBQUMsVUFBVSxDQU16QiwyQ0FBMkMsQ0FBQyxDQUFDO0lBRS9DLE1BQU0sY0FBYyxHQUFHLENBQUMsR0FBUSxFQUFVLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRS9GLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxHQUFHLDhCQUE4QixDQUFDLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZKLE1BQU0sQ0FBQyxlQUFlLEdBQUcsdUJBQXVCLENBQUM7SUFDakQsTUFBTSxZQUFZLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFpQyxRQUFRLENBQUMsQ0FBQyxZQUFZLENBQUMsMkJBQTJCLENBQUM7SUFFdEksSUFBSSxZQUFZLENBQUMsT0FBTyxJQUFJLFlBQVksS0FBSyxDQUFDLElBQUksWUFBWSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3pFLE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2xJLE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RCxLQUFLLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25DLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDBCQUEwQixFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsTUFBTSxFQUFFLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3SixNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFpQixDQUFDO1FBQ3ZGLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN4QixDQUFDO0FBQ0YsQ0FBQyxDQUFDIn0=