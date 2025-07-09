/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from './window.js';
import { isElectron, isMacintosh, isWindows } from '../common/platform.js';
/**
 * The best font-family to be used in CSS based on the platform:
 * - Windows: Segoe preferred, fallback to sans-serif
 * - macOS: standard system font, fallback to sans-serif
 * - Linux: standard system font preferred, fallback to Ubuntu fonts
 *
 * Note: this currently does not adjust for different locales.
 */
export const DEFAULT_FONT_FAMILY = isWindows ? '"Segoe WPC", "Segoe UI", sans-serif' : isMacintosh ? '-apple-system, BlinkMacSystemFont, sans-serif' : 'system-ui, "Ubuntu", "Droid Sans", sans-serif';
export const getFonts = async () => {
    try {
        // @ts-ignore
        const fonts = await mainWindow.queryLocalFonts();
        const fontsArray = [...fonts];
        const families = fontsArray.map(font => font.family);
        return families;
    }
    catch (error) {
        console.error(`Failed to query fonts: ${error}`);
        return [];
    }
};
export const getFontSnippets = async () => {
    if (!isElectron) {
        return [];
    }
    const fonts = await getFonts();
    const snippets = fonts.map(font => {
        return {
            body: `${font}`
        };
    });
    return snippets;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2ZvbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFM0U7Ozs7Ozs7R0FPRztBQUNILE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsK0NBQStDLENBQUMsQ0FBQyxDQUFDLCtDQUErQyxDQUFDO0FBTXZNLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxLQUFLLElBQXVCLEVBQUU7SUFDckQsSUFBSSxDQUFDO1FBQ0osYUFBYTtRQUNiLE1BQU0sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFDLGVBQWUsRUFBZ0IsQ0FBQztRQUMvRCxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDOUIsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyRCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztBQUNGLENBQUMsQ0FBQztBQUdGLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxLQUFLLElBQW1DLEVBQUU7SUFDeEUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2pCLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sUUFBUSxFQUFFLENBQUM7SUFDL0IsTUFBTSxRQUFRLEdBQXlCLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDdkQsT0FBTztZQUNOLElBQUksRUFBRSxHQUFHLElBQUksRUFBRTtTQUNmLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sUUFBUSxDQUFDO0FBQ2pCLENBQUMsQ0FBQyJ9