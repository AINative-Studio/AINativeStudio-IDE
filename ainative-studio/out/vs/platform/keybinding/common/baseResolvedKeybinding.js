/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalArgument } from '../../../base/common/errors.js';
import { AriaLabelProvider, ElectronAcceleratorLabelProvider, UILabelProvider, UserSettingsLabelProvider } from '../../../base/common/keybindingLabels.js';
import { ResolvedKeybinding, ResolvedChord } from '../../../base/common/keybindings.js';
export class BaseResolvedKeybinding extends ResolvedKeybinding {
    constructor(os, chords) {
        super();
        if (chords.length === 0) {
            throw illegalArgument(`chords`);
        }
        this._os = os;
        this._chords = chords;
    }
    getLabel() {
        return UILabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getLabel(keybinding));
    }
    getAriaLabel() {
        return AriaLabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getAriaLabel(keybinding));
    }
    getElectronAccelerator() {
        if (this._chords.length > 1) {
            // [Electron Accelerators] Electron cannot handle chords
            return null;
        }
        if (this._chords[0].isDuplicateModifierCase()) {
            // [Electron Accelerators] Electron cannot handle modifier only keybindings
            // e.g. "shift shift"
            return null;
        }
        return ElectronAcceleratorLabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getElectronAccelerator(keybinding));
    }
    getUserSettingsLabel() {
        return UserSettingsLabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getUserSettingsLabel(keybinding));
    }
    isWYSIWYG() {
        return this._chords.every((keybinding) => this._isWYSIWYG(keybinding));
    }
    hasMultipleChords() {
        return (this._chords.length > 1);
    }
    getChords() {
        return this._chords.map((keybinding) => this._getChord(keybinding));
    }
    _getChord(keybinding) {
        return new ResolvedChord(keybinding.ctrlKey, keybinding.shiftKey, keybinding.altKey, keybinding.metaKey, this._getLabel(keybinding), this._getAriaLabel(keybinding));
    }
    getDispatchChords() {
        return this._chords.map((keybinding) => this._getChordDispatch(keybinding));
    }
    getSingleModifierDispatchChords() {
        return this._chords.map((keybinding) => this._getSingleModifierChordDispatch(keybinding));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVJlc29sdmVkS2V5YmluZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL2NvbW1vbi9iYXNlUmVzb2x2ZWRLZXliaW5kaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0NBQWdDLEVBQUUsZUFBZSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0osT0FBTyxFQUE4QixrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUdwSCxNQUFNLE9BQWdCLHNCQUF3QyxTQUFRLGtCQUFrQjtJQUt2RixZQUFZLEVBQW1CLEVBQUUsTUFBb0I7UUFDcEQsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsTUFBTSxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNELElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2QsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7SUFDdkIsQ0FBQztJQUVNLFFBQVE7UUFDZCxPQUFPLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDcEcsQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDMUcsQ0FBQztJQUVNLHNCQUFzQjtRQUM1QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzdCLHdEQUF3RDtZQUN4RCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDO1lBQy9DLDJFQUEyRTtZQUMzRSxxQkFBcUI7WUFDckIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxnQ0FBZ0MsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNuSSxDQUFDO0lBRU0sb0JBQW9CO1FBQzFCLE9BQU8seUJBQXlCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDMUgsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVPLFNBQVMsQ0FBQyxVQUFhO1FBQzlCLE9BQU8sSUFBSSxhQUFhLENBQ3ZCLFVBQVUsQ0FBQyxPQUFPLEVBQ2xCLFVBQVUsQ0FBQyxRQUFRLEVBQ25CLFVBQVUsQ0FBQyxNQUFNLEVBQ2pCLFVBQVUsQ0FBQyxPQUFPLEVBQ2xCLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQzFCLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQzlCLENBQUM7SUFDSCxDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFTSwrQkFBK0I7UUFDckMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQztDQVNEIn0=