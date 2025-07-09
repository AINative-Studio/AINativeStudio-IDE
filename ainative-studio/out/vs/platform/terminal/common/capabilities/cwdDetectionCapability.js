/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class CwdDetectionCapability extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 0 /* TerminalCapability.CwdDetection */;
        this._cwd = '';
        this._cwds = new Map();
        this._onDidChangeCwd = this._register(new Emitter());
        this.onDidChangeCwd = this._onDidChangeCwd.event;
    }
    /**
     * Gets the list of cwds seen in this session in order of last accessed.
     */
    get cwds() {
        return Array.from(this._cwds.keys());
    }
    getCwd() {
        return this._cwd;
    }
    updateCwd(cwd) {
        const didChange = this._cwd !== cwd;
        this._cwd = cwd;
        const count = this._cwds.get(this._cwd) || 0;
        this._cwds.delete(this._cwd); // Delete to put it at the bottom of the iterable
        this._cwds.set(this._cwd, count + 1);
        if (didChange) {
            this._onDidChangeCwd.fire(cwd);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3dkRGV0ZWN0aW9uQ2FwYWJpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL2N3ZERldGVjdGlvbkNhcGFiaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdsRSxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsVUFBVTtJQUF0RDs7UUFDVSxTQUFJLDJDQUFtQztRQUN4QyxTQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ1YsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1FBUzdDLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUM7UUFDaEUsbUJBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztJQWdCdEQsQ0FBQztJQXhCQTs7T0FFRztJQUNILElBQUksSUFBSTtRQUNQLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUtELE1BQU07UUFDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVELFNBQVMsQ0FBQyxHQUFXO1FBQ3BCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsaURBQWlEO1FBQy9FLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=