/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedExternalError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
export class NotebookCellStatusBarService extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeProviders = this._register(new Emitter());
        this.onDidChangeProviders = this._onDidChangeProviders.event;
        this._onDidChangeItems = this._register(new Emitter());
        this.onDidChangeItems = this._onDidChangeItems.event;
        this._providers = [];
    }
    registerCellStatusBarItemProvider(provider) {
        this._providers.push(provider);
        let changeListener;
        if (provider.onDidChangeStatusBarItems) {
            changeListener = provider.onDidChangeStatusBarItems(() => this._onDidChangeItems.fire());
        }
        this._onDidChangeProviders.fire();
        return toDisposable(() => {
            changeListener?.dispose();
            const idx = this._providers.findIndex(p => p === provider);
            this._providers.splice(idx, 1);
        });
    }
    async getStatusBarItemsForCell(docUri, cellIndex, viewType, token) {
        const providers = this._providers.filter(p => p.viewType === viewType || p.viewType === '*');
        return await Promise.all(providers.map(async (p) => {
            try {
                return await p.provideCellStatusBarItems(docUri, cellIndex, token) ?? { items: [] };
            }
            catch (e) {
                onUnexpectedExternalError(e);
                return { items: [] };
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsU3RhdHVzQmFyU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va0NlbGxTdGF0dXNCYXJTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUtoRyxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsVUFBVTtJQUE1RDs7UUFJa0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDcEUseUJBQW9CLEdBQWdCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7UUFFN0Qsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDaEUscUJBQWdCLEdBQWdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7UUFFckQsZUFBVSxHQUF5QyxFQUFFLENBQUM7SUE2QnhFLENBQUM7SUEzQkEsaUNBQWlDLENBQUMsUUFBNEM7UUFDN0UsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0IsSUFBSSxjQUF1QyxDQUFDO1FBQzVDLElBQUksUUFBUSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDeEMsY0FBYyxHQUFHLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMxRixDQUFDO1FBRUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFDO1FBRWxDLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxNQUFXLEVBQUUsU0FBaUIsRUFBRSxRQUFnQixFQUFFLEtBQXdCO1FBQ3hHLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLFFBQVEsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUM3RixPQUFPLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsRUFBRTtZQUNoRCxJQUFJLENBQUM7Z0JBQ0osT0FBTyxNQUFNLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3JGLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNEIn0=