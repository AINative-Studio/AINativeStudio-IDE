/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
export const IDummyService = createDecorator('DummyService');
// An example of an action (delete if you're not using an action):
registerAction2(class extends Action2 {
    constructor() {
        super({
            f1: true,
            id: 'void.dummy',
            title: localize2('dummy', 'dummy: Init'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 21 /* KeyCode.Digit0 */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const n = accessor.get(IDummyService);
        console.log('Hi', n._serviceBrand);
    }
});
let DummyService = class DummyService extends Disposable {
    static { this.ID = 'workbench.contrib.void.dummy'; } // workbenchContributions need this, services do not
    constructor(codeEditorService) {
        super();
    }
};
DummyService = __decorate([
    __param(0, ICodeEditorService)
], DummyService);
// pick one and delete the other:
registerSingleton(IDummyService, DummyService, 0 /* InstantiationType.Eager */); // lazily loaded, even if Eager
registerWorkbenchContribution2(DummyService.ID, DummyService, 2 /* WorkbenchPhase.BlockRestore */); // mounts on start
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX2R1bW15Q29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvX2R1bW15Q29udHJpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUcxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU3RixPQUFPLEVBQTBCLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBUTFILE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQWdCLGNBQWMsQ0FBQyxDQUFDO0FBSTVFLGtFQUFrRTtBQUNsRSxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsSUFBSTtZQUNSLEVBQUUsRUFBRSxZQUFZO1lBQ2hCLEtBQUssRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQztZQUN4QyxVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLG1EQUErQjtnQkFDeEMsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBR0YsSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBYSxTQUFRLFVBQVU7YUFDcEIsT0FBRSxHQUFHLDhCQUE4QixBQUFqQyxDQUFpQyxHQUFDLG9EQUFvRDtJQUd4RyxZQUNxQixpQkFBcUM7UUFFekQsS0FBSyxFQUFFLENBQUE7SUFFUixDQUFDOztBQVRJLFlBQVk7SUFLZixXQUFBLGtCQUFrQixDQUFBO0dBTGYsWUFBWSxDQVVqQjtBQUdELGlDQUFpQztBQUNqQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsWUFBWSxrQ0FBMEIsQ0FBQyxDQUFDLCtCQUErQjtBQUV4Ryw4QkFBOEIsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLFlBQVksc0NBQThCLENBQUMsQ0FBQyxrQkFBa0IifQ==