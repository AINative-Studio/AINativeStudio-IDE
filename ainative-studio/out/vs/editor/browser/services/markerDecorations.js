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
import { IMarkerDecorationsService } from '../../common/services/markerDecorations.js';
import { registerEditorContribution } from '../editorExtensions.js';
let MarkerDecorationsContribution = class MarkerDecorationsContribution {
    static { this.ID = 'editor.contrib.markerDecorations'; }
    constructor(_editor, _markerDecorationsService) {
        // Doesn't do anything, just requires `IMarkerDecorationsService` to make sure it gets instantiated
    }
    dispose() {
    }
};
MarkerDecorationsContribution = __decorate([
    __param(1, IMarkerDecorationsService)
], MarkerDecorationsContribution);
export { MarkerDecorationsContribution };
registerEditorContribution(MarkerDecorationsContribution.ID, MarkerDecorationsContribution, 0 /* EditorContributionInstantiation.Eager */); // eager because it instantiates IMarkerDecorationsService which is responsible for rendering squiggles
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvc2VydmljZXMvbWFya2VyRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkYsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBSTlGLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQTZCO2FBRWxCLE9BQUUsR0FBVyxrQ0FBa0MsQUFBN0MsQ0FBOEM7SUFFdkUsWUFDQyxPQUFvQixFQUNPLHlCQUFvRDtRQUUvRSxtR0FBbUc7SUFDcEcsQ0FBQztJQUVELE9BQU87SUFDUCxDQUFDOztBQVpXLDZCQUE2QjtJQU12QyxXQUFBLHlCQUF5QixDQUFBO0dBTmYsNkJBQTZCLENBYXpDOztBQUVELDBCQUEwQixDQUFDLDZCQUE2QixDQUFDLEVBQUUsRUFBRSw2QkFBNkIsZ0RBQXdDLENBQUMsQ0FBQyx1R0FBdUcifQ==