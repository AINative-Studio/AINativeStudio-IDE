/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
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
import { URI } from '../../../../base/common/uri.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IVoidModelService } from '../common/voidModelService.js';
let ConvertContribWorkbenchContribution = class ConvertContribWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.void.convertcontrib'; }
    constructor(voidModelService, workspaceContext) {
        super();
        this.voidModelService = voidModelService;
        this.workspaceContext = workspaceContext;
        const initializeURI = (uri) => {
            this.workspaceContext.getWorkspace();
            const voidRulesURI = URI.joinPath(uri, '.voidrules');
            this.voidModelService.initializeModel(voidRulesURI);
        };
        // call
        this._register(this.workspaceContext.onDidChangeWorkspaceFolders((e) => {
            [...e.changed, ...e.added].forEach(w => { initializeURI(w.uri); });
        }));
        this.workspaceContext.getWorkspace().folders.forEach(w => { initializeURI(w.uri); });
    }
};
ConvertContribWorkbenchContribution = __decorate([
    __param(0, IVoidModelService),
    __param(1, IWorkspaceContextService)
], ConvertContribWorkbenchContribution);
registerWorkbenchContribution2(ConvertContribWorkbenchContribution.ID, ConvertContribWorkbenchContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydFRvTExNTWVzc2FnZVdvcmtiZW5jaENvbnRyaWIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvY29udmVydFRvTExNTWVzc2FnZVdvcmtiZW5jaENvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQTBCLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWxFLElBQU0sbUNBQW1DLEdBQXpDLE1BQU0sbUNBQW9DLFNBQVEsVUFBVTthQUMzQyxPQUFFLEdBQUcsdUNBQXVDLEFBQTFDLENBQTBDO0lBRzVELFlBQ3FDLGdCQUFtQyxFQUM1QixnQkFBMEM7UUFFckYsS0FBSyxFQUFFLENBQUE7UUFINkIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUM1QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTBCO1FBSXJGLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBUSxFQUFFLEVBQUU7WUFDbEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFBO1lBQ3BDLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3BELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDcEQsQ0FBQyxDQUFBO1FBRUQsT0FBTztRQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDSCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNwRixDQUFDOztBQXJCSSxtQ0FBbUM7SUFLdEMsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHdCQUF3QixDQUFBO0dBTnJCLG1DQUFtQyxDQXNCeEM7QUFHRCw4QkFBOEIsQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsbUNBQW1DLHNDQUE4QixDQUFDIn0=