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
import { isMacintosh } from '../../../../base/common/platform.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
export class ToggleMultiCursorModifierAction extends Action2 {
    static { this.ID = 'workbench.action.toggleMultiCursorModifier'; }
    static { this.multiCursorModifierConfigurationKey = 'editor.multiCursorModifier'; }
    constructor() {
        super({
            id: ToggleMultiCursorModifierAction.ID,
            title: localize2('toggleLocation', 'Toggle Multi-Cursor Modifier'),
            f1: true
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const editorConf = configurationService.getValue('editor');
        const newValue = (editorConf.multiCursorModifier === 'ctrlCmd' ? 'alt' : 'ctrlCmd');
        return configurationService.updateValue(ToggleMultiCursorModifierAction.multiCursorModifierConfigurationKey, newValue);
    }
}
const multiCursorModifier = new RawContextKey('multiCursorModifier', 'altKey');
let MultiCursorModifierContextKeyController = class MultiCursorModifierContextKeyController extends Disposable {
    constructor(configurationService, contextKeyService) {
        super();
        this.configurationService = configurationService;
        this._multiCursorModifier = multiCursorModifier.bindTo(contextKeyService);
        this._update();
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.multiCursorModifier')) {
                this._update();
            }
        }));
    }
    _update() {
        const editorConf = this.configurationService.getValue('editor');
        const value = (editorConf.multiCursorModifier === 'ctrlCmd' ? 'ctrlCmd' : 'altKey');
        this._multiCursorModifier.set(value);
    }
};
MultiCursorModifierContextKeyController = __decorate([
    __param(0, IConfigurationService),
    __param(1, IContextKeyService)
], MultiCursorModifierContextKeyController);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(MultiCursorModifierContextKeyController, 3 /* LifecyclePhase.Restored */);
registerAction2(ToggleMultiCursorModifierAction);
MenuRegistry.appendMenuItem(MenuId.MenubarSelectionMenu, {
    group: '4_config',
    command: {
        id: ToggleMultiCursorModifierAction.ID,
        title: localize('miMultiCursorAlt', "Switch to Alt+Click for Multi-Cursor")
    },
    when: multiCursorModifier.isEqualTo('ctrlCmd'),
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarSelectionMenu, {
    group: '4_config',
    command: {
        id: ToggleMultiCursorModifierAction.ID,
        title: (isMacintosh
            ? localize('miMultiCursorCmd', "Switch to Cmd+Click for Multi-Cursor")
            : localize('miMultiCursorCtrl', "Switch to Ctrl+Click for Multi-Cursor"))
    },
    when: multiCursorModifier.isEqualTo('altKey'),
    order: 1
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlTXVsdGlDdXJzb3JNb2RpZmllci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvdG9nZ2xlTXVsdGlDdXJzb3JNb2RpZmllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV0SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUEyRCxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUc5SSxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsT0FBTzthQUUzQyxPQUFFLEdBQUcsNENBQTRDLENBQUM7YUFFMUMsd0NBQW1DLEdBQUcsNEJBQTRCLENBQUM7SUFFM0Y7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0JBQStCLENBQUMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLDhCQUE4QixDQUFDO1lBQ2xFLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFD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