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
import { ColorTheme, ColorThemeKind } from './extHostTypes.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { Emitter } from '../../../base/common/event.js';
let ExtHostTheming = class ExtHostTheming {
    constructor(_extHostRpc) {
        this._actual = new ColorTheme(ColorThemeKind.Dark);
        this._onDidChangeActiveColorTheme = new Emitter();
    }
    get activeColorTheme() {
        return this._actual;
    }
    $onColorThemeChange(type) {
        let kind;
        switch (type) {
            case 'light':
                kind = ColorThemeKind.Light;
                break;
            case 'hcDark':
                kind = ColorThemeKind.HighContrast;
                break;
            case 'hcLight':
                kind = ColorThemeKind.HighContrastLight;
                break;
            default:
                kind = ColorThemeKind.Dark;
        }
        this._actual = new ColorTheme(kind);
        this._onDidChangeActiveColorTheme.fire(this._actual);
    }
    get onDidChangeActiveColorTheme() {
        return this._onDidChangeActiveColorTheme.event;
    }
};
ExtHostTheming = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostTheming);
export { ExtHostTheming };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRoZW1pbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFRoZW1pbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUU1RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFFeEQsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBYztJQU8xQixZQUNxQixXQUErQjtRQUVuRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsNEJBQTRCLEdBQUcsSUFBSSxPQUFPLEVBQWMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsSUFBVyxnQkFBZ0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxJQUFZO1FBQy9CLElBQUksSUFBSSxDQUFDO1FBQ1QsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLEtBQUssT0FBTztnQkFBRSxJQUFJLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQztnQkFBQyxNQUFNO1lBQ2pELEtBQUssUUFBUTtnQkFBRSxJQUFJLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQztnQkFBQyxNQUFNO1lBQ3pELEtBQUssU0FBUztnQkFBRSxJQUFJLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixDQUFDO2dCQUFDLE1BQU07WUFDL0Q7Z0JBQ0MsSUFBSSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDN0IsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELElBQVcsMkJBQTJCO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQztJQUNoRCxDQUFDO0NBQ0QsQ0FBQTtBQWxDWSxjQUFjO0lBUXhCLFdBQUEsa0JBQWtCLENBQUE7R0FSUixjQUFjLENBa0MxQiJ9