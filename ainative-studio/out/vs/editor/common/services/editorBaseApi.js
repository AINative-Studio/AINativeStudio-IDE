/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { URI } from '../../../base/common/uri.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
import { Token } from '../languages.js';
import * as standaloneEnums from '../standalone/standaloneEnums.js';
export class KeyMod {
    static { this.CtrlCmd = 2048 /* ConstKeyMod.CtrlCmd */; }
    static { this.Shift = 1024 /* ConstKeyMod.Shift */; }
    static { this.Alt = 512 /* ConstKeyMod.Alt */; }
    static { this.WinCtrl = 256 /* ConstKeyMod.WinCtrl */; }
    static chord(firstPart, secondPart) {
        return KeyChord(firstPart, secondPart);
    }
}
export function createMonacoBaseAPI() {
    return {
        editor: undefined, // undefined override expected here
        languages: undefined, // undefined override expected here
        CancellationTokenSource: CancellationTokenSource,
        Emitter: Emitter,
        KeyCode: standaloneEnums.KeyCode,
        KeyMod: KeyMod,
        Position: Position,
        Range: Range,
        Selection: Selection,
        SelectionDirection: standaloneEnums.SelectionDirection,
        MarkerSeverity: standaloneEnums.MarkerSeverity,
        MarkerTag: standaloneEnums.MarkerTag,
        Uri: URI,
        Token: Token
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQmFzZUFwaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL2VkaXRvckJhc2VBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQXlCLE1BQU0sa0NBQWtDLENBQUM7QUFDbkYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN4QyxPQUFPLEtBQUssZUFBZSxNQUFNLGtDQUFrQyxDQUFDO0FBRXBFLE1BQU0sT0FBTyxNQUFNO2FBQ0ssWUFBTyxrQ0FBK0I7YUFDdEMsVUFBSyxnQ0FBNkI7YUFDbEMsUUFBRyw2QkFBMkI7YUFDOUIsWUFBTyxpQ0FBK0I7SUFFdEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFpQixFQUFFLFVBQWtCO1FBQ3hELE9BQU8sUUFBUSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN4QyxDQUFDOztBQUdGLE1BQU0sVUFBVSxtQkFBbUI7SUFDbEMsT0FBTztRQUNOLE1BQU0sRUFBRSxTQUFVLEVBQUUsbUNBQW1DO1FBQ3ZELFNBQVMsRUFBRSxTQUFVLEVBQUUsbUNBQW1DO1FBQzFELHVCQUF1QixFQUFFLHVCQUF1QjtRQUNoRCxPQUFPLEVBQUUsT0FBTztRQUNoQixPQUFPLEVBQUUsZUFBZSxDQUFDLE9BQU87UUFDaEMsTUFBTSxFQUFFLE1BQU07UUFDZCxRQUFRLEVBQUUsUUFBUTtRQUNsQixLQUFLLEVBQUUsS0FBSztRQUNaLFNBQVMsRUFBTyxTQUFTO1FBQ3pCLGtCQUFrQixFQUFFLGVBQWUsQ0FBQyxrQkFBa0I7UUFDdEQsY0FBYyxFQUFFLGVBQWUsQ0FBQyxjQUFjO1FBQzlDLFNBQVMsRUFBRSxlQUFlLENBQUMsU0FBUztRQUNwQyxHQUFHLEVBQU8sR0FBRztRQUNiLEtBQUssRUFBRSxLQUFLO0tBQ1osQ0FBQztBQUNILENBQUMifQ==