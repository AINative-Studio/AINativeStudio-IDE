/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const SEMANTIC_HIGHLIGHTING_SETTING_ID = 'editor.semanticHighlighting';
export function isSemanticColoringEnabled(model, themeService, configurationService) {
    const setting = configurationService.getValue(SEMANTIC_HIGHLIGHTING_SETTING_ID, { overrideIdentifier: model.getLanguageId(), resource: model.uri })?.enabled;
    if (typeof setting === 'boolean') {
        return setting;
    }
    return themeService.getColorTheme().semanticHighlighting;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNDb25maWcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc2VtYW50aWNUb2tlbnMvY29tbW9uL3NlbWFudGljVG9rZW5zQ29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLDZCQUE2QixDQUFDO0FBTTlFLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxLQUFpQixFQUFFLFlBQTJCLEVBQUUsb0JBQTJDO0lBQ3BJLE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBcUMsZ0NBQWdDLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQztJQUNqTSxJQUFJLE9BQU8sT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFDRCxPQUFPLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQztBQUMxRCxDQUFDIn0=