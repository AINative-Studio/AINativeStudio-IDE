/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export const IEmbedderTerminalService = createDecorator('embedderTerminalService');
class EmbedderTerminalService {
    constructor() {
        this._onDidCreateTerminal = new Emitter();
        this.onDidCreateTerminal = Event.buffer(this._onDidCreateTerminal.event);
    }
    createTerminal(options) {
        const slc = {
            name: options.name,
            isFeatureTerminal: true,
            customPtyImplementation(terminalId, cols, rows) {
                return new EmbedderTerminalProcess(terminalId, options.pty);
            },
        };
        this._onDidCreateTerminal.fire(slc);
    }
}
class EmbedderTerminalProcess extends Disposable {
    constructor(id, pty) {
        super();
        this.id = id;
        this.shouldPersist = false;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        this._pty = pty;
        this.onProcessData = this._pty.onDidWrite;
        if (this._pty.onDidClose) {
            this._register(this._pty.onDidClose(e => this._onProcessExit.fire(e || undefined)));
        }
        if (this._pty.onDidChangeName) {
            this._register(this._pty.onDidChangeName(e => this._onDidChangeProperty.fire({
                type: "title" /* ProcessPropertyType.Title */,
                value: e
            })));
        }
    }
    async start() {
        this._onProcessReady.fire({ pid: -1, cwd: '', windowsPty: undefined });
        this._pty.open();
        return undefined;
    }
    shutdown() {
        this._pty.close();
    }
    // TODO: A lot of these aren't useful for some implementations of ITerminalChildProcess, should
    // they be optional? Should there be a base class for "external" consumers to implement?
    input() {
        // not supported
    }
    async processBinary() {
        // not supported
    }
    resize() {
        // no-op
    }
    clearBuffer() {
        // no-op
    }
    acknowledgeDataEvent() {
        // no-op, flow control not currently implemented
    }
    async setUnicodeVersion() {
        // no-op
    }
    async getInitialCwd() {
        return '';
    }
    async getCwd() {
        return '';
    }
    refreshProperty(property) {
        throw new Error(`refreshProperty is not suppported in EmbedderTerminalProcess. property: ${property}`);
    }
    updateProperty(property, value) {
        throw new Error(`updateProperty is not suppported in EmbedderTerminalProcess. property: ${property}, value: ${value}`);
    }
}
registerSingleton(IEmbedderTerminalService, EmbedderTerminalService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZWRkZXJUZXJtaW5hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3Rlcm1pbmFsL2NvbW1vbi9lbWJlZGRlclRlcm1pbmFsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGVBQWUsQ0FBMkIseUJBQXlCLENBQUMsQ0FBQztBQTJDN0csTUFBTSx1QkFBdUI7SUFBN0I7UUFHa0IseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQXNCLENBQUM7UUFDakUsd0JBQW1CLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7SUFZOUUsQ0FBQztJQVZBLGNBQWMsQ0FBQyxPQUFpQztRQUMvQyxNQUFNLEdBQUcsR0FBcUI7WUFDN0IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsdUJBQXVCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJO2dCQUM3QyxPQUFPLElBQUksdUJBQXVCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3RCxDQUFDO1NBQ0QsQ0FBQztRQUNGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENB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