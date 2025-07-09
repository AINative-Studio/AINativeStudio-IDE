/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { MenuPreventer } from './menuPreventer.js';
import { SelectionClipboardContributionID } from './selectionClipboard.js';
import { TabCompletionController } from '../../snippets/browser/tabCompletion.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { selectionBackground, inputBackground, inputForeground, editorSelectionBackground } from '../../../../platform/theme/common/colorRegistry.js';
export function getSimpleEditorOptions(configurationService) {
    return {
        wordWrap: 'on',
        overviewRulerLanes: 0,
        glyphMargin: false,
        lineNumbers: 'off',
        folding: false,
        selectOnLineNumbers: false,
        hideCursorInOverviewRuler: true,
        selectionHighlight: false,
        scrollbar: {
            horizontal: 'hidden',
            alwaysConsumeMouseWheel: false
        },
        lineDecorationsWidth: 0,
        overviewRulerBorder: false,
        scrollBeyondLastLine: false,
        renderLineHighlight: 'none',
        fixedOverflowWidgets: true,
        acceptSuggestionOnEnter: 'smart',
        dragAndDrop: false,
        revealHorizontalRightPadding: 5,
        minimap: {
            enabled: false
        },
        guides: {
            indentation: false
        },
        accessibilitySupport: configurationService.getValue('editor.accessibilitySupport'),
        cursorBlinking: configurationService.getValue('editor.cursorBlinking'),
        experimentalEditContextEnabled: configurationService.getValue('editor.experimentalEditContextEnabled'),
        defaultColorDecorators: 'never',
    };
}
export function getSimpleCodeEditorWidgetOptions() {
    return {
        isSimpleWidget: true,
        contributions: EditorExtensionsRegistry.getSomeEditorContributions([
            MenuPreventer.ID,
            SelectionClipboardContributionID,
            ContextMenuController.ID,
            SuggestController.ID,
            SnippetController2.ID,
            TabCompletionController.ID,
        ])
    };
}
/**
 * Should be called to set the styling on editors that are appearing as just input boxes
 * @param editorContainerSelector An element selector that will match the container of the editor
 */
export function setupSimpleEditorSelectionStyling(editorContainerSelector) {
    // Override styles in selections.ts
    return registerThemingParticipant((theme, collector) => {
        const selectionBackgroundColor = theme.getColor(selectionBackground);
        if (selectionBackgroundColor) {
            // Override inactive selection bg
            const inputBackgroundColor = theme.getColor(inputBackground);
            if (inputBackgroundColor) {
                collector.addRule(`${editorContainerSelector} .monaco-editor-background { background-color: ${inputBackgroundColor}; } `);
                collector.addRule(`${editorContainerSelector} .monaco-editor .selected-text { background-color: ${inputBackgroundColor.transparent(0.4)}; }`);
            }
            // Override selected fg
            const inputForegroundColor = theme.getColor(inputForeground);
            if (inputForegroundColor) {
                collector.addRule(`${editorContainerSelector} .monaco-editor .view-line span.inline-selected-text { color: ${inputForegroundColor}; }`);
            }
            collector.addRule(`${editorContainerSelector} .monaco-editor .focused .selected-text { background-color: ${selectionBackgroundColor}; }`);
        }
        else {
            // Use editor selection color if theme has not set a selection background color
            collector.addRule(`${editorContainerSelector} .monaco-editor .focused .selected-text { background-color: ${theme.getColor(editorSelectionBackground)}; }`);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvc2ltcGxlRWRpdG9yT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFMUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV0SixNQUFNLFVBQVUsc0JBQXNCLENBQUMsb0JBQTJDO0lBQ2pGLE9BQU87UUFDTixRQUFRLEVBQUUsSUFBSTtRQUNkLGtCQUFrQixFQUFFLENBQUM7UUFDckIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsT0FBTyxFQUFFLEtBQUs7UUFDZCxtQkFBbUIsRUFBRSxLQUFLO1FBQzFCLHlCQUF5QixFQUFFLElBQUk7UUFDL0Isa0JBQWtCLEVBQUUsS0FBSztRQUN6QixT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