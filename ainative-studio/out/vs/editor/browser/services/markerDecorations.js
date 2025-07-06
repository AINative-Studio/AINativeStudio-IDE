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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9tYXJrZXJEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RixPQUFPLEVBQW1DLDBCQUEwQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFJOUYsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBNkI7YUFFbEIsT0FBRSxHQUFXLGtDQUFrQyxBQUE3QyxDQUE4QztJQUV2RSxZQUNDLE9BQW9CLEVBQ08seUJBQW9EO1FBRS9FLG1HQUFtRztJQUNwRyxDQUFDO0lBRUQsT0FBTztJQUNQLENBQUM7O0FBWlcsNkJBQTZCO0lBTXZDLFdBQUEseUJBQXlCLENBQUE7R0FOZiw2QkFBNkIsQ0FhekM7O0FBRUQsMEJBQTBCLENBQUMsNkJBQTZCLENBQUMsRUFBRSxFQUFFLDZCQUE2QixnREFBd0MsQ0FBQyxDQUFDLHVHQUF1RyJ9