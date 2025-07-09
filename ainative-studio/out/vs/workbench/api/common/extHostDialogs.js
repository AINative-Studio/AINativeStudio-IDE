/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
export class ExtHostDialogs {
    constructor(mainContext) {
        this._proxy = mainContext.getProxy(MainContext.MainThreadDialogs);
    }
    showOpenDialog(options) {
        return this._proxy.$showOpenDialog(options).then(filepaths => {
            return filepaths ? filepaths.map(p => URI.revive(p)) : undefined;
        });
    }
    showSaveDialog(options) {
        return this._proxy.$showSaveDialog(options).then(filepath => {
            return filepath ? URI.revive(filepath) : undefined;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERpYWxvZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdERpYWxvZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxXQUFXLEVBQXlDLE1BQU0sdUJBQXVCLENBQUM7QUFFM0YsTUFBTSxPQUFPLGNBQWM7SUFJMUIsWUFBWSxXQUF5QjtRQUNwQyxJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUFrQztRQUNoRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM1RCxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUFrQztRQUNoRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMzRCxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIn0=