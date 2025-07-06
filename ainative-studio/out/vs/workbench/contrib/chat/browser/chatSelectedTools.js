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
import { reset } from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived, observableFromEvent } from '../../../../base/common/observable.js';
import { assertType } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ILanguageModelToolsService, ToolDataSource } from '../common/languageModelToolsService.js';
const storedTools = observableMemento({
    defaultValue: {},
    key: 'chat/selectedTools',
});
let ChatSelectedTools = class ChatSelectedTools extends Disposable {
    constructor(toolsService, instaService, storageService) {
        super();
        this._selectedTools = this._register(storedTools(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, storageService));
        const allTools = observableFromEvent(toolsService.onDidChangeTools, () => Array.from(toolsService.getTools()).filter(t => t.supportsToolPicker));
        const disabledData = this._selectedTools.map(data => {
            return (data.disabledBuckets?.length || data.disabledTools?.length) && {
                buckets: new Set(data.disabledBuckets),
                toolIds: new Set(data.disabledTools),
            };
        });
        this.tools = derived(r => {
            const disabled = disabledData.read(r);
            const tools = allTools.read(r);
            if (!disabled) {
                return tools;
            }
            return tools.filter(t => !(disabled.toolIds.has(t.id) || disabled.buckets.has(ToolDataSource.toKey(t.source))));
        });
        const toolsCount = derived(r => {
            const count = allTools.read(r).length;
            const enabled = this.tools.read(r).length;
            return { count, enabled };
        });
        const onDidRender = this._store.add(new Emitter());
        this.toolsActionItemViewItemProvider = Object.assign((action, options) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instaService.createInstance(class extends MenuEntryActionViewItem {
                render(container) {
                    this.options.icon = false;
                    this.options.label = true;
                    container.classList.add('chat-mcp');
                    super.render(container);
                }
                updateLabel() {
                    this._store.add(autorun(r => {
                        assertType(this.label);
                        const { enabled, count } = toolsCount.read(r);
                        const message = count === 0
                            ? '$(tools)'
                            : enabled !== count
                                ? localize('tool.1', "{0} {1} of {2}", '$(tools)', enabled, count)
                                : localize('tool.0', "{0} {1}", '$(tools)', count);
                        reset(this.label, ...renderLabelWithIcons(message));
                        if (this.element?.isConnected) {
                            onDidRender.fire();
                        }
                    }));
                }
            }, action, { ...options, keybindingNotRenderedWithLabel: true });
        }, { onDidRender: onDidRender.event });
    }
    update(disableBuckets, disableTools) {
        this._selectedTools.set({
            disabledBuckets: disableBuckets.map(ToolDataSource.toKey),
            disabledTools: disableTools.map(t => t.id)
        }, undefined);
    }
};
ChatSelectedTools = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInstantiationService),
    __param(2, IStorageService)
], ChatSelectedTools);
export { ChatSelectedTools };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlbGVjdGVkVG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFNlbGVjdGVkVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTNGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkgsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsMEJBQTBCLEVBQWEsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFXL0csTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQWE7SUFDakQsWUFBWSxFQUFFLEVBQUU7SUFDaEIs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