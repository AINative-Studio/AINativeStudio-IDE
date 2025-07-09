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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlbGVjdGVkVG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTZWxlY3RlZFRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUd4RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUzRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFlLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUMxRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLDBCQUEwQixFQUFhLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBVy9HLE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFhO0lBQ2pELFlBQVksRUFBRSxFQUFFO0lBQ2hC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