/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function showHistoryKeybindingHint(keybindingService) {
    return keybindingService.lookupKeybinding('history.showPrevious')?.getElectronAccelerator() === 'Up' && keybindingService.lookupKeybinding('history.showNext')?.getElectronAccelerator() === 'Down';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeVdpZGdldEtleWJpbmRpbmdIaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2hpc3RvcnkvYnJvd3Nlci9oaXN0b3J5V2lkZ2V0S2V5YmluZGluZ0hpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxVQUFVLHlCQUF5QixDQUFDLGlCQUFxQztJQUM5RSxPQUFPLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxJQUFJLElBQUksaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsRUFBRSxzQkFBc0IsRUFBRSxLQUFLLE1BQU0sQ0FBQztBQUNyTSxDQUFDIn0=