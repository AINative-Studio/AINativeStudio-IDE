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
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let SleepResumeRepaintMinimap = class SleepResumeRepaintMinimap extends Disposable {
    constructor(codeEditorService, nativeHostService) {
        super();
        this._register(nativeHostService.onDidResumeOS(() => {
            codeEditorService.listCodeEditors().forEach(editor => editor.render(true));
        }));
    }
};
SleepResumeRepaintMinimap = __decorate([
    __param(0, ICodeEditorService),
    __param(1, INativeHostService)
], SleepResumeRepaintMinimap);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(SleepResumeRepaintMinimap, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2xlZXBSZXN1bWVSZXBhaW50TWluaW1hcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2VsZWN0cm9uLXNhbmRib3gvc2xlZXBSZXN1bWVSZXBhaW50TWluaW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBMkQsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5SSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBRWpELFlBQ3FCLGlCQUFxQyxFQUNyQyxpQkFBcUM7UUFFekQsS0FBSyxFQUFFLENBQUM7UUFFUixJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDbkQsaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QsQ0FBQTtBQVpLLHlCQUF5QjtJQUc1QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7R0FKZix5QkFBeUIsQ0FZOUI7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUFrQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyx5QkFBeUIsb0NBQTRCLENBQUMifQ==