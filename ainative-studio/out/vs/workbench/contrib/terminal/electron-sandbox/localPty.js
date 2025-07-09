/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BasePty } from '../common/basePty.js';
/**
 * Responsible for establishing and maintaining a connection with an existing terminal process
 * created on the local pty host.
 */
export class LocalPty extends BasePty {
    constructor(id, shouldPersist, _proxy) {
        super(id, shouldPersist);
        this._proxy = _proxy;
    }
    start() {
        return this._proxy.start(this.id);
    }
    detach(forcePersist) {
        return this._proxy.detachFromProcess(this.id, forcePersist);
    }
    shutdown(immediate) {
        this._proxy.shutdown(this.id, immediate);
    }
    async processBinary(data) {
        if (this._inReplay) {
            return;
        }
        return this._proxy.processBinary(this.id, data);
    }
    input(data) {
        if (this._inReplay) {
            return;
        }
        this._proxy.input(this.id, data);
    }
    resize(cols, rows) {
        if (this._inReplay || this._lastDimensions.cols === cols && this._lastDimensions.rows === rows) {
            return;
        }
        this._lastDimensions.cols = cols;
        this._lastDimensions.rows = rows;
        this._proxy.resize(this.id, cols, rows);
    }
    async clearBuffer() {
        this._proxy.clearBuffer?.(this.id);
    }
    freePortKillProcess(port) {
        if (!this._proxy.freePortKillProcess) {
            throw new Error('freePortKillProcess does not exist on the local pty service');
        }
        return this._proxy.freePortKillProcess(port);
    }
    async refreshProperty(type) {
        return this._proxy.refreshProperty(this.id, type);
    }
    async updateProperty(type, value) {
        return this._proxy.updateProperty(this.id, type, value);
    }
    acknowledgeDataEvent(charCount) {
        if (this._inReplay) {
            return;
        }
        this._proxy.acknowledgeDataEvent(this.id, charCount);
    }
    setUnicodeVersion(version) {
        return this._proxy.setUnicodeVersion(this.id, version);
    }
    handleOrphanQuestion() {
        this._proxy.orphanQuestionReply(this.id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxQdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvZWxlY3Ryb24tc2FuZGJveC9sb2NhbFB0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFL0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFFBQVMsU0FBUSxPQUFPO0lBQ3BDLFlBQ0MsRUFBVSxFQUNWLGFBQXNCLEVBQ0wsTUFBbUI7UUFFcEMsS0FBSyxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUZSLFdBQU0sR0FBTixNQUFNLENBQWE7SUFHckMsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsTUFBTSxDQUFDLFlBQXNCO1FBQzVCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxRQUFRLENBQUMsU0FBa0I7UUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFZO1FBQy9CLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU87UUFDUixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxLQUFLLENBQUMsSUFBWTtRQUNqQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFZLEVBQUUsSUFBWTtRQUNoQyxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ2hHLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVc7UUFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELG1CQUFtQixDQUFDLElBQVk7UUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLDZEQUE2RCxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBZ0MsSUFBTztRQUMzRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQWdDLElBQU8sRUFBRSxLQUE2QjtRQUN6RixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxTQUFpQjtRQUNyQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsT0FBbUI7UUFDcEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMxQyxDQUFDO0NBQ0QifQ==