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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1RoZW1lTWFwcGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvcmVuZGVyZXJzL3dlYnZpZXdUaGVtZU1hcHBpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxPQUFPLEdBQWdDLElBQUksR0FBRyxDQUFDO0lBQ3BELENBQUMsbUJBQW1CLEVBQUUsb0JBQW9CLENBQUM7SUFDM0MsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQztJQUMzQyxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDO0lBQ3ZDLENBQUMsd0JBQXdCLEVBQUUsMkJBQTJCLENBQUM7SUFDdkQsQ0FBQyx3QkFBd0IsRUFBRSwyQkFBMkIsQ0FBQztJQUN2RCxDQUFDLHNCQUFzQixFQUFFLHlCQUF5QixDQUFDO0lBQ25ELENBQUMsNEJBQTRCLEVBQUUsbUNBQW1DLENBQUM7SUFDbkUsQ0FBQyxrQ0FBa0MsRUFBRSx3Q0FBd0MsQ0FBQztJQUM5RSxDQUFDLG1DQUFtQyxFQUFFLHlDQUF5QyxDQUFDO0lBQ2hGLENBQUMsd0JBQXdCLEVBQUUsa0NBQWtDLENBQUM7SUFDOUQsQ0FBQyxvQkFBb0IsRUFBRSw4QkFBOEIsQ0FBQztJQUN0RCxDQUFDLHVCQUF1QixFQUFFLGlDQUFpQyxDQUFDO0lBQzVELFNBQVM7SUFDVCxDQUFDLGtCQUFrQixFQUFFLDBCQUEwQixDQUFDO0lBQ2hELENBQUMsa0JBQWtCLEVBQUUsMEJBQTBCLENBQUM7SUFDaEQsQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQztJQUM1QyxDQUFDLFlBQVksRUFBRSw0QkFBNEIsQ0FBQztJQUM1QyxDQUFDLG1CQUFtQixFQUFFLGtDQUFrQyxDQUFDO0lBQ3pELFVB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