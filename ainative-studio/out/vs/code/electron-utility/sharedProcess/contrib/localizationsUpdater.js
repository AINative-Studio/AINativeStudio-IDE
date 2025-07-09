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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguagePackService } from '../../../../platform/languagePacks/common/languagePacks.js';
let LocalizationsUpdater = class LocalizationsUpdater extends Disposable {
    constructor(localizationsService) {
        super();
        this.localizationsService = localizationsService;
        this.updateLocalizations();
    }
    updateLocalizations() {
        this.localizationsService.update();
    }
};
LocalizationsUpdater = __decorate([
    __param(0, ILanguagePackService)
], LocalizationsUpdater);
export { LocalizationsUpdater };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uc1VwZGF0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi11dGlsaXR5L3NoYXJlZFByb2Nlc3MvY29udHJpYi9sb2NhbGl6YXRpb25zVXBkYXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHM0YsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBRW5ELFlBQ3dDLG9CQUErQztRQUV0RixLQUFLLEVBQUUsQ0FBQztRQUYrQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTJCO1FBSXRGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3BDLENBQUM7Q0FDRCxDQUFBO0FBYlksb0JBQW9CO0lBRzlCLFdBQUEsb0JBQW9CLENBQUE7R0FIVixvQkFBb0IsQ0FhaEMifQ==