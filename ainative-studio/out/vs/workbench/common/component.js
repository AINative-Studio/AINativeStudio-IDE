/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Memento } from './memento.js';
import { Themable } from '../../platform/theme/common/themeService.js';
export class Component extends Themable {
    constructor(id, themeService, storageService) {
        super(themeService);
        this.id = id;
        this.memento = new Memento(this.id, storageService);
        this._register(storageService.onWillSaveState(() => {
            // Ask the component to persist state into the memento
            this.saveState();
            // Then save the memento into storage
            this.memento.saveMemento();
        }));
    }
    getId() {
        return this.id;
    }
    getMemento(scope, target) {
        return this.memento.getMemento(scope, target);
    }
    reloadMemento(scope) {
        return this.memento.reloadMemento(scope);
    }
    onDidChangeMementoValue(scope, disposables) {
        return this.memento.onDidChangeValue(scope, disposables);
    }
    saveState() {
        // Subclasses to implement for storing state
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQWlCLE1BQU0sY0FBYyxDQUFDO0FBQ3RELE9BQU8sRUFBaUIsUUFBUSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFLdEYsTUFBTSxPQUFPLFNBQVUsU0FBUSxRQUFRO0lBSXRDLFlBQ2tCLEVBQVUsRUFDM0IsWUFBMkIsRUFDM0IsY0FBK0I7UUFFL0IsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBSkgsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQU0zQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFcEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRTtZQUVsRCxzREFBc0Q7WUFDdEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBRWpCLHFDQUFxQztZQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBRVMsVUFBVSxDQUFDLEtBQW1CLEVBQUUsTUFBcUI7UUFDOUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVTLGFBQWEsQ0FBQyxLQUFtQjtRQUMxQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFUyx1QkFBdUIsQ0FBQyxLQUFtQixFQUFFLFdBQTRCO1FBQ2xGLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVTLFNBQVM7UUFDbEIsNENBQTRDO0lBQzdDLENBQUM7Q0FDRCJ9