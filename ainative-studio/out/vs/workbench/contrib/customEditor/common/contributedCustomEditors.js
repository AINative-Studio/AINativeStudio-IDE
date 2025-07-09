/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as nls from '../../../../nls.js';
import { Memento } from '../../../common/memento.js';
import { CustomEditorInfo } from './customEditor.js';
import { customEditorsExtensionPoint } from './extensionPoint.js';
import { RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
export class ContributedCustomEditors extends Disposable {
    static { this.CUSTOM_EDITORS_STORAGE_ID = 'customEditors'; }
    static { this.CUSTOM_EDITORS_ENTRY_ID = 'editors'; }
    constructor(storageService) {
        super();
        this._editors = new Map();
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._memento = new Memento(ContributedCustomEditors.CUSTOM_EDITORS_STORAGE_ID, storageService);
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        for (const info of (mementoObject[ContributedCustomEditors.CUSTOM_EDITORS_ENTRY_ID] || [])) {
            this.add(new CustomEditorInfo(info));
        }
        customEditorsExtensionPoint.setHandler(extensions => {
            this.update(extensions);
        });
    }
    update(extensions) {
        this._editors.clear();
        for (const extension of extensions) {
            for (const webviewEditorContribution of extension.value) {
                this.add(new CustomEditorInfo({
                    id: webviewEditorContribution.viewType,
                    displayName: webviewEditorContribution.displayName,
                    providerDisplayName: extension.description.isBuiltin ? nls.localize('builtinProviderDisplayName', "Built-in") : extension.description.displayName || extension.description.identifier.value,
                    selector: webviewEditorContribution.selector || [],
                    priority: getPriorityFromContribution(webviewEditorContribution, extension.description),
                }));
            }
        }
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        mementoObject[ContributedCustomEditors.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._editors.values());
        this._memento.saveMemento();
        this._onChange.fire();
    }
    [Symbol.iterator]() {
        return this._editors.values();
    }
    get(viewType) {
        return this._editors.get(viewType);
    }
    getContributedEditors(resource) {
        return Array.from(this._editors.values())
            .filter(customEditor => customEditor.matches(resource));
    }
    add(info) {
        if (this._editors.has(info.id)) {
            console.error(`Custom editor with id '${info.id}' already registered`);
            return;
        }
        this._editors.set(info.id, info);
    }
}
function getPriorityFromContribution(contribution, extension) {
    switch (contribution.priority) {
        case RegisteredEditorPriority.default:
        case RegisteredEditorPriority.option:
            return contribution.priority;
        case RegisteredEditorPriority.builtin:
            // Builtin is only valid for builtin extensions
            return extension.isBuiltin ? RegisteredEditorPriority.builtin : RegisteredEditorPriority.default;
        default:
            return RegisteredEditorPriority.default;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0ZWRDdXN0b21FZGl0b3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2N1c3RvbUVkaXRvci9jb21tb24vY29udHJpYnV0ZWRDdXN0b21FZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUcxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDckQsT0FBTyxFQUEwQixnQkFBZ0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdFLE9BQU8sRUFBRSwyQkFBMkIsRUFBZ0MsTUFBTSxxQkFBcUIsQ0FBQztBQUNoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUdwRyxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTthQUUvQiw4QkFBeUIsR0FBRyxlQUFlLEFBQWxCLENBQW1CO2FBQzVDLDRCQUF1QixHQUFHLFNBQVMsQUFBWixDQUFhO0lBSzVELFlBQVksY0FBK0I7UUFDMUMsS0FBSyxFQUFFLENBQUM7UUFKUSxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUM7UUFrQi9DLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNqRCxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7UUFiL0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyx5QkFBeUIsRUFB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