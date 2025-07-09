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
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { score } from '../../../../editor/common/languageSelector.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ToggleTitleBarConfigAction } from '../../../browser/parts/titlebar/titlebarActions.js';
import { WorkspaceFolderCountContext } from '../../../common/contextkeys.js';
export const ShareProviderCountContext = new RawContextKey('shareProviderCount', 0, localize('shareProviderCount', "The number of available share providers"));
let ShareService = class ShareService {
    constructor(contextKeyService, labelService, quickInputService, codeEditorService, telemetryService) {
        this.contextKeyService = contextKeyService;
        this.labelService = labelService;
        this.quickInputService = quickInputService;
        this.codeEditorService = codeEditorService;
        this.telemetryService = telemetryService;
        this._providers = new Set();
        this.providerCount = ShareProviderCountContext.bindTo(this.contextKeyService);
    }
    registerShareProvider(provider) {
        this._providers.add(provider);
        this.providerCount.set(this._providers.size);
        return {
            dispose: () => {
                this._providers.delete(provider);
                this.providerCount.set(this._providers.size);
            }
        };
    }
    getShareActions() {
        // todo@joyceerhl return share actions
        return [];
    }
    async provideShare(item, token) {
        const language = this.codeEditorService.getActiveCodeEditor()?.getModel()?.getLanguageId() ?? '';
        const providers = [...this._providers.values()]
            .filter((p) => score(p.selector, item.resourceUri, language, true, undefined, undefined) > 0)
            .sort((a, b) => a.priority - b.priority);
        if (providers.length === 0) {
            return undefined;
        }
        if (providers.length === 1) {
            this.telemetryService.publicLog2('shareService.share', { providerId: providers[0].id });
            return providers[0].provideShare(item, token);
        }
        const items = providers.map((p) => ({ label: p.label, provider: p }));
        const selected = await this.quickInputService.pick(items, { canPickMany: false, placeHolder: localize('type to filter', 'Choose how to share {0}', this.labelService.getUriLabel(item.resourceUri)) }, token);
        if (selected !== undefined) {
            this.telemetryService.publicLog2('shareService.share', { providerId: selected.provider.id });
            return selected.provider.provideShare(item, token);
        }
        return;
    }
};
ShareService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ILabelService),
    __param(2, IQuickInputService),
    __param(3, ICodeEditorService),
    __param(4, ITelemetryService)
], ShareService);
export { ShareService };
registerAction2(class ToggleShareControl extends ToggleTitleBarConfigAction {
    constructor() {
        super('workbench.experimental.share.enabled', localize('toggle.share', 'Share'), localize('toggle.shareDescription', "Toggle visibility of the Share action in title bar"), 3, false, ContextKeyExpr.and(ContextKeyExpr.has('config.window.commandCenter'), ContextKeyExpr.and(ShareProviderCountContext.notEqualsTo(0), WorkspaceFolderCountContext.notEqualsTo(0))));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NoYXJlL2Jyb3dzZXIvc2hhcmVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFnQixlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQWtCLE1BQU0sc0RBQXNELENBQUM7QUFDMUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDaEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHN0UsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxhQUFhLENBQVMsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDLENBQUM7QUFVaEssSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBWTtJQU14QixZQUNxQixpQkFBNkMsRUFDbEQsWUFBNEMsRUFDdkMsaUJBQTZDLEVBQzdDLGlCQUFzRCxFQUN2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