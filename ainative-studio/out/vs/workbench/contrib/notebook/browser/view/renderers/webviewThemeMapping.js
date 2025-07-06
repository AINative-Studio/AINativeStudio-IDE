/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const mapping = new Map([
    ['theme-font-family', 'vscode-font-family'],
    ['theme-font-weight', 'vscode-font-weight'],
    ['theme-font-size', 'vscode-font-size'],
    ['theme-code-font-family', 'vscode-editor-font-family'],
    ['theme-code-font-weight', 'vscode-editor-font-weight'],
    ['theme-code-font-size', 'vscode-editor-font-size'],
    ['theme-scrollbar-background', 'vscode-scrollbarSlider-background'],
    ['theme-scrollbar-hover-background', 'vscode-scrollbarSlider-hoverBackground'],
    ['theme-scrollbar-active-background', 'vscode-scrollbarSlider-activeBackground'],
    ['theme-quote-background', 'vscode-textBlockQuote-background'],
    ['theme-quote-border', 'vscode-textBlockQuote-border'],
    ['theme-code-foreground', 'vscode-textPreformat-foreground'],
    // Editor
    ['theme-background', 'vscode-editor-background'],
    ['theme-foreground', 'vscode-editor-foreground'],
    ['theme-ui-foreground', 'vscode-foreground'],
    ['theme-link', 'vscode-textLink-foreground'],
    ['theme-link-active', 'vscode-textLink-activeForeground'],
    // Buttons
    ['theme-button-background', 'vscode-button-background'],
    ['theme-button-hover-background', 'vscode-button-hoverBackground'],
    ['theme-button-foreground', 'vscode-button-foreground'],
    ['theme-button-secondary-background', 'vscode-button-secondaryBackground'],
    ['theme-button-secondary-hover-background', 'vscode-button-secondaryHoverBackground'],
    ['theme-button-secondary-foreground', 'vscode-button-secondaryForeground'],
    ['theme-button-hover-foreground', 'vscode-button-foreground'],
    ['theme-button-focus-foreground', 'vscode-button-foreground'],
    ['theme-button-secondary-hover-foreground', 'vscode-button-secondaryForeground'],
    ['theme-button-secondary-focus-foreground', 'vscode-button-secondaryForeground'],
    // Inputs
    ['theme-input-background', 'vscode-input-background'],
    ['theme-input-foreground', 'vscode-input-foreground'],
    ['theme-input-placeholder-foreground', 'vscode-input-placeholderForeground'],
    ['theme-input-focus-border-color', 'vscode-focusBorder'],
    // Menus
    ['theme-menu-background', 'vscode-menu-background'],
    ['theme-menu-foreground', 'vscode-menu-foreground'],
    ['theme-menu-hover-background', 'vscode-menu-selectionBackground'],
    ['theme-menu-focus-background', 'vscode-menu-selectionBackground'],
    ['theme-menu-hover-foreground', 'vscode-menu-selectionForeground'],
    ['theme-menu-focus-foreground', 'vscode-menu-selectionForeground'],
    // Errors
    ['theme-error-background', 'vscode-inputValidation-errorBackground'],
    ['theme-error-foreground', 'vscode-foreground'],
    ['theme-warning-background', 'vscode-inputValidation-warningBackground'],
    ['theme-warning-foreground', 'vscode-foreground'],
    ['theme-info-background', 'vscode-inputValidation-infoBackground'],
    ['theme-info-foreground', 'vscode-foreground'],
    // Notebook:
    ['theme-notebook-output-background', 'vscode-notebook-outputContainerBackgroundColor'],
    ['theme-notebook-output-border', 'vscode-notebook-outputContainerBorderColor'],
    ['theme-notebook-cell-selected-background', 'vscode-notebook-selectedCellBackground'],
    ['theme-notebook-symbol-highlight-background', 'vscode-notebook-symbolHighlightBackground'],
    ['theme-notebook-diff-removed-background', 'vscode-diffEditor-removedTextBackground'],
    ['theme-notebook-diff-inserted-background', 'vscode-diffEditor-insertedTextBackground'],
]);
const constants = {
    'theme-input-border-width': '1px',
    'theme-button-primary-hover-shadow': 'none',
    'theme-button-secondary-hover-shadow': 'none',
    'theme-input-border-color': 'transparent',
};
/**
 * Transforms base vscode theme variables into generic variables for notebook
 * renderers.
 * @see https://github.com/microsoft/vscode/issues/107985 for context
 * @deprecated
 */
export const transformWebviewThemeVars = (s) => {
    const result = { ...s, ...constants };
    for (const [target, src] of mapping) {
        result[target] = s[src];
    }
    return result;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1RoZW1lTWFwcGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9yZW5kZXJlcnMvd2Vidmlld1RoZW1lTWFwcGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLE9BQU8sR0FBZ0MsSUFBSSxHQUFHLENBQUM7SUFDcEQsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQztJQUMzQyxDQUFDLG1CQUFtQixFQUFFLG9CQUFvQixDQUFDO0lBQzNDLENBQUMsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUM7SUFDdkMsQ0FBQyx3QkFBd0IsRUFBRSwyQkFBMkIsQ0FBQztJQUN2RCxDQUFDLHdCQUF3QixFQUFFLDJCQUEyQixDQUFDO0lBQ3ZELENBQUMsc0JBQXNCLEVBQUUseUJBQXlCLENBQUM7SUFDbkQsQ0FBQyw0QkFBNEIsRUFBRSxtQ0FBbUMsQ0FBQztJQUNuRSxDQUFDLGtDQUFrQyxFQUFFLHdDQUF3QyxDQUFDO0lBQzlFLENBQUMsbUNBQW1DLEVBQUUseUNBQXlDLENBQUM7SUFDaEYsQ0FBQyx3QkFBd0IsRUFBRSxrQ0FBa0MsQ0FBQztJQUM5RCxDQUFDLG9CQUFvQixFQUFFLDhCQUE4QixDQUFDO0lBQ3RELENBQUMsdUJBQXVCLEVBQUUsaUNBQWlDLENBQUM7SUFDNUQsU0FBUztJQUNULENBQUMsa0JBQWtCLEVBQUUsMEJBQTBCLENBQUM7SUFDaEQsQ0FBQyxrQkFBa0IsRUFBRSwwQkFBMEIsQ0FBQztJQUNoRCxDQUFDLHFCQUFxQixFQUFFLG1CQUFtQixDQUFDO0lBQzVDLENBQUMsWUFBWSxFQUFFLDRCQUE0QixDQUFDO0lBQzVDLENBQUMsbUJBQW1CLEVBQUUsa0NBQWtDLENBQUM7SUFDekQsVUFB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