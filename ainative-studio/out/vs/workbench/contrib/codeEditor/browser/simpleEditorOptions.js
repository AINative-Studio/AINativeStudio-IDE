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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3NpbXBsZUVkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzNFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRS9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdEosTUFBTSxVQUFVLHNCQUFzQixDQUFDLG9CQUEyQztJQUNqRixPQUFPO1FBQ04sUUFBUSxFQUFFLElBQUk7UUFDZCxrQkFBa0IsRUFBRSxDQUFDO1FBQ3JCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLE9BQU8sRUFBRSxLQUFLO1FBQ2QsbUJBQW1CLEVBQUUsS0FBSztRQUMxQix5QkFBeUIsRUFBRSxJQUFJO1FBQy9CLGtCQUFrQixFQUFFLEtBQUs7UUFD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