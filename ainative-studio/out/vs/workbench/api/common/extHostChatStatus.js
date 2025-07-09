/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extHostProtocol from './extHost.protocol.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
export class ExtHostChatStatus {
    constructor(mainContext) {
        this._items = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadChatStatus);
    }
    createChatStatusItem(extension, id) {
        const internalId = asChatItemIdentifier(extension.identifier, id);
        if (this._items.has(internalId)) {
            throw new Error(`Chat status item '${id}' already exists`);
        }
        const state = {
            id: internalId,
            title: '',
            description: '',
            detail: '',
        };
        let disposed = false;
        let visible = false;
        const syncState = () => {
            if (disposed) {
                throw new Error('Chat status item is disposed');
            }
            if (!visible) {
                return;
            }
            this._proxy.$setEntry(id, state);
        };
        const item = Object.freeze({
            id: id,
            get title() {
                return state.title;
            },
            set title(value) {
                state.title = value;
                syncState();
            },
            get description() {
                return state.description;
            },
            set description(value) {
                state.description = value;
                syncState();
            },
            get detail() {
                return state.detail;
            },
            set detail(value) {
                state.detail = value;
                syncState();
            },
            show: () => {
                visible = true;
                syncState();
            },
            hide: () => {
                visible = false;
                this._proxy.$disposeEntry(id);
            },
            dispose: () => {
                disposed = true;
                this._proxy.$disposeEntry(id);
                this._items.delete(internalId);
            },
        });
        this._items.set(internalId, item);
        return item;
    }
}
function asChatItemIdentifier(extension, id) {
    return `${ExtensionIdentifier.toKey(extension)}.${id}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENoYXRTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQXlCLE1BQU0sbURBQW1ELENBQUM7QUFFL0csTUFBTSxPQUFPLGlCQUFpQjtJQU03QixZQUNDLFdBQXlDO1FBSHpCLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQztRQUtsRSxJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxTQUFnQyxFQUFFLEVBQVU7UUFDaEUsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNsRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFFRCxNQUFNLEtBQUssR0FBc0M7WUFDaEQsRUFBRSxFQUFFLFVBQVU7WUFDZCxLQUFLLEVBQUUsRUFBRTtZQUNULFdBQVcsRUFBRSxFQUFFO1lBQ2YsTUFBTSxFQUFFLEVBQUU7U0FDVixDQUFDO1FBRUYsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztRQUNwQixNQUFNLFNBQVMsR0FBRyxHQUFHLEVBQUU7WUFDdEIsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7WUFDakQsQ0FBQztZQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsQyxDQUFDLENBQUM7UUFFRixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUF3QjtZQUNqRCxFQUFFLEVBQUUsRUFBRTtZQUVOLElBQUksS0FBSztnQkFDUixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDcEIsQ0FBQztZQUNELElBQUksS0FBSyxDQUFDLEtBQWE7Z0JBQ3RCLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO2dCQUNwQixTQUFTLEVBQUUsQ0FBQztZQUNiLENBQUM7WUFFRCxJQUFJLFdBQVc7Z0JBQ2QsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDO1lBQzFCLENBQUM7WUFDRCxJQUFJLFdBQVcsQ0FBQyxLQUFhO2dCQUM1QixLQUFLLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztnQkFDMUIsU0FBUyxFQUFFLENBQUM7WUFDYixDQUFDO1lBRUQsSUFBSSxNQUFNO2dCQUNULE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUNyQixDQUFDO1lBQ0QsSUFBSSxNQUFNLENBQUMsS0FBeUI7Z0JBQ25DLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO2dCQUNyQixTQUFTLEVBQUUsQ0FBQztZQUNiLENBQUM7WUFFRCxJQUFJLEVBQUUsR0FBRyxFQUFFO2dCQUNWLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0JBQ2YsU0FBUyxFQUFFLENBQUM7WUFDYixDQUFDO1lBQ0QsSUFBSSxFQUFFLEdBQUcsRUFBRTtnQkFDVixPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMvQixDQUFDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDaEMsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRDtBQUVELFNBQVMsb0JBQW9CLENBQUMsU0FBOEIsRUFBRSxFQUFVO0lBQ3ZFLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7QUFDeEQsQ0FBQyJ9