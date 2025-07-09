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
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILanguageService } from '../languages/language.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { SemanticTokensProviderStyling } from './semanticTokensProviderStyling.js';
import { ISemanticTokensStylingService } from './semanticTokensStyling.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
let SemanticTokensStylingService = class SemanticTokensStylingService extends Disposable {
    constructor(_themeService, _logService, _languageService) {
        super();
        this._themeService = _themeService;
        this._logService = _logService;
        this._languageService = _languageService;
        this._caches = new WeakMap();
        this._register(this._themeService.onDidColorThemeChange(() => {
            this._caches = new WeakMap();
        }));
    }
    getStyling(provider) {
        if (!this._caches.has(provider)) {
            this._caches.set(provider, new SemanticTokensProviderStyling(provider.getLegend(), this._themeService, this._languageService, this._logService));
        }
        return this._caches.get(provider);
    }
};
SemanticTokensStylingService = __decorate([
    __param(0, IThemeService),
    __param(1, ILogService),
    __param(2, ILanguageService)
], SemanticTokensStylingService);
export { SemanticTokensStylingService };
registerSingleton(ISemanticTokensStylingService, SemanticTokensStylingService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNTdHlsaW5nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3NlbWFudGljVG9rZW5zU3R5bGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDM0UsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXJHLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTtJQU0zRCxZQUNpQyxhQUE0QixFQUM5QixXQUF3QixFQUNuQixnQkFBa0M7UUFFckUsS0FBSyxFQUFFLENBQUM7UUFKd0Isa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDOUIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDbkIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUdyRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxFQUF5RCxDQUFDO1FBQ3BGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7WUFDNUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sRUFBeUQsQ0FBQztRQUNyRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLFVBQVUsQ0FBQyxRQUFnQztRQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDbEosQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFFLENBQUM7SUFDcEMsQ0FBQztDQUNELENBQUE7QUF4QlksNEJBQTRCO0lBT3RDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGdCQUFnQixDQUFBO0dBVE4sNEJBQTRCLENBd0J4Qzs7QUFFRCxpQkFBaUIsQ0FBQyw2QkFBNkIsRUFBRSw0QkFBNEIsb0NBQTRCLENBQUMifQ==