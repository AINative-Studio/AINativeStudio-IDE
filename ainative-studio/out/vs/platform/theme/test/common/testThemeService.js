/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../../base/common/color.js';
import { Emitter } from '../../../../base/common/event.js';
import { ColorScheme } from '../../common/theme.js';
export class TestColorTheme {
    constructor(colors = {}, type = ColorScheme.DARK, semanticHighlighting = false) {
        this.colors = colors;
        this.type = type;
        this.semanticHighlighting = semanticHighlighting;
        this.label = 'test';
    }
    getColor(color, useDefault) {
        const value = this.colors[color];
        if (value) {
            return Color.fromHex(value);
        }
        return undefined;
    }
    defines(color) {
        throw new Error('Method not implemented.');
    }
    getTokenStyleMetadata(type, modifiers, modelLanguage) {
        return undefined;
    }
    get tokenColorMap() {
        return [];
    }
}
class TestFileIconTheme {
    constructor() {
        this.hasFileIcons = false;
        this.hasFolderIcons = false;
        this.hidesExplorerArrows = false;
    }
}
class UnthemedProductIconTheme {
    getIcon(contribution) {
        return undefined;
    }
}
export class TestThemeService {
    constructor(theme = new TestColorTheme(), fileIconTheme = new TestFileIconTheme(), productIconTheme = new UnthemedProductIconTheme()) {
        this._onThemeChange = new Emitter();
        this._onFileIconThemeChange = new Emitter();
        this._onProductIconThemeChange = new Emitter();
        this._colorTheme = theme;
        this._fileIconTheme = fileIconTheme;
        this._productIconTheme = productIconTheme;
    }
    getColorTheme() {
        return this._colorTheme;
    }
    setTheme(theme) {
        this._colorTheme = theme;
        this.fireThemeChange();
    }
    fireThemeChange() {
        this._onThemeChange.fire(this._colorTheme);
    }
    get onDidColorThemeChange() {
        return this._onThemeChange.event;
    }
    getFileIconTheme() {
        return this._fileIconTheme;
    }
    get onDidFileIconThemeChange() {
        return this._onFileIconThemeChange.event;
    }
    getProductIconTheme() {
        return this._productIconTheme;
    }
    get onDidProductIconThemeChange() {
        return this._onProductIconThemeChange.event;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRoZW1lU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS90ZXN0L2NvbW1vbi90ZXN0VGhlbWVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR3BELE1BQU0sT0FBTyxjQUFjO0lBSTFCLFlBQ1MsU0FBK0MsRUFBRSxFQUNsRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLEVBQ2QsdUJBQXVCLEtBQUs7UUFGcEMsV0FBTSxHQUFOLE1BQU0sQ0FBMkM7UUFDbEQsU0FBSSxHQUFKLElBQUksQ0FBbUI7UUFDZCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQVE7UUFMN0IsVUFBSyxHQUFHLE1BQU0sQ0FBQztJQU0zQixDQUFDO0lBRUwsUUFBUSxDQUFDLEtBQWEsRUFBRSxVQUFvQjtRQUMzQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxPQUFPLENBQUMsS0FBYTtRQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELHFCQUFxQixDQUFDLElBQVksRUFBRSxTQUFtQixFQUFFLGFBQXFCO1FBQzdFLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLGlCQUFpQjtJQUF2QjtRQUNDLGlCQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLG1CQUFjLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLHdCQUFtQixHQUFHLEtBQUssQ0FBQztJQUM3QixDQUFDO0NBQUE7QUFFRCxNQUFNLHdCQUF3QjtJQUM3QixPQUFPLENBQUMsWUFBOEI7UUFDckMsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdCQUFnQjtJQVU1QixZQUFZLEtBQUssR0FBRyxJQUFJLGNBQWMsRUFBRSxFQUFFLGFBQWEsR0FBRyxJQUFJLGlCQUFpQixFQUFFLEVBQUUsZ0JBQWdCLEdBQUcsSUFBSSx3QkFBd0IsRUFBRTtRQUpwSSxtQkFBYyxHQUFHLElBQUksT0FBTyxFQUFlLENBQUM7UUFDNUMsMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUM7UUFDdkQsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQXFCLENBQUM7UUFHNUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDekIsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUM7UUFDcEMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFDO0lBQzNDLENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBa0I7UUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDekIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxlQUFlO1FBQ2QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxJQUFXLHFCQUFxQjtRQUMvQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQVcsd0JBQXdCO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztJQUMxQyxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQy9CLENBQUM7SUFFRCxJQUFXLDJCQUEyQjtRQUNyQyxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7SUFDN0MsQ0FBQztDQUNEIn0=