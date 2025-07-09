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
import { FontMeasurements } from '../../../../editor/browser/config/fontMeasurements.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
let DisplayChangeRemeasureFonts = class DisplayChangeRemeasureFonts extends Disposable {
    constructor(nativeHostService) {
        super();
        this._register(nativeHostService.onDidChangeDisplay(() => {
            FontMeasurements.clearAllFontInfos();
        }));
    }
};
DisplayChangeRemeasureFonts = __decorate([
    __param(0, INativeHostService)
], DisplayChangeRemeasureFonts);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DisplayChangeRemeasureFonts, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzcGxheUNoYW5nZVJlbWVhc3VyZUZvbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvZWxlY3Ryb24tc2FuZGJveC9kaXNwbGF5Q2hhbmdlUmVtZWFzdXJlRm9udHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUEyRCxNQUFNLGtDQUFrQyxDQUFDO0FBRzlJLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQUVuRCxZQUNxQixpQkFBcUM7UUFFekQsS0FBSyxFQUFFLENBQUM7UUFFUixJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRTtZQUN4RCxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QsQ0FBQTtBQVhLLDJCQUEyQjtJQUc5QixXQUFBLGtCQUFrQixDQUFBO0dBSGYsMkJBQTJCLENBV2hDO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsNkJBQTZCLENBQUMsMkJBQTJCLG9DQUE0QixDQUFDIn0=