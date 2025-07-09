/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { AbstractCodeEditorService, GlobalStyleSheet } from '../../browser/services/abstractCodeEditorService.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
export class TestCodeEditorService extends AbstractCodeEditorService {
    constructor() {
        super(...arguments);
        this.globalStyleSheet = new TestGlobalStyleSheet();
    }
    _createGlobalStyleSheet() {
        return this.globalStyleSheet;
    }
    getActiveCodeEditor() {
        return null;
    }
    openCodeEditor(input, source, sideBySide) {
        this.lastInput = input;
        return Promise.resolve(null);
    }
}
export class TestGlobalStyleSheet extends GlobalStyleSheet {
    constructor() {
        super(null);
        this.rules = [];
    }
    insertRule(selector, rule) {
        this.rules.unshift(`${selector} {${rule}}`);
    }
    removeRulesContainingSelector(ruleName) {
        for (let i = 0; i < this.rules.length; i++) {
            if (this.rules[i].indexOf(ruleName) >= 0) {
                this.rules.splice(i, 1);
                i--;
            }
        }
    }
    read() {
        return this.rules.join('\n');
    }
}
export class TestCommandService {
    constructor(instantiationService) {
        this._onWillExecuteCommand = new Emitter();
        this.onWillExecuteCommand = this._onWillExecuteCommand.event;
        this._onDidExecuteCommand = new Emitter();
        this.onDidExecuteCommand = this._onDidExecuteCommand.event;
        this._instantiationService = instantiationService;
    }
    executeCommand(id, ...args) {
        const command = CommandsRegistry.getCommand(id);
        if (!command) {
            return Promise.reject(new Error(`command '${id}' not found`));
        }
        try {
            this._onWillExecuteCommand.fire({ commandId: id, args });
            const result = this._instantiationService.invokeFunction.apply(this._instantiationService, [command.handler, ...args]);
            this._onDidExecuteCommand.fire({ commandId: id, args });
            return Promise.resolve(result);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvZWRpdG9yVGVzdFNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQWtDLE1BQU0sK0NBQStDLENBQUM7QUFJakgsTUFBTSxPQUFPLHFCQUFzQixTQUFRLHlCQUF5QjtJQUFwRTs7UUFFaUIscUJBQWdCLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO0lBYy9ELENBQUM7SUFabUIsdUJBQXVCO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO0lBQzlCLENBQUM7SUFFRCxtQkFBbUI7UUFDbEIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRVEsY0FBYyxDQUFDLEtBQTJCLEVBQUUsTUFBMEIsRUFBRSxVQUFvQjtRQUNwRyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGdCQUFnQjtJQUl6RDtRQUNDLEtBQUssQ0FBQyxJQUFLLENBQUMsQ0FBQztRQUhQLFVBQUssR0FBYSxFQUFFLENBQUM7SUFJNUIsQ0FBQztJQUVlLFVBQVUsQ0FBQyxRQUFnQixFQUFFLElBQVk7UUFDeEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxRQUFRLEtBQUssSUFBSSxHQUFHLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRWUsNkJBQTZCLENBQUMsUUFBZ0I7UUFDN0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixDQUFDLEVBQUUsQ0FBQztZQUNMLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVNLElBQUk7UUFDVixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrQkFBa0I7SUFXOUIsWUFBWSxvQkFBMkM7UUFOdEMsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQWlCLENBQUM7UUFDdEQseUJBQW9CLEdBQXlCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7UUFFN0UseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQWlCLENBQUM7UUFDckQsd0JBQW1CLEdBQXlCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUM7UUFHM0YsSUFBSSxDQUFDLHFCQUFxQixHQUFHLG9CQUFvQixDQUFDO0lBQ25ELENBQUM7SUFFTSxjQUFjLENBQUksRUFBVSxFQUFFLEdBQUcsSUFBVztRQUNsRCxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBTSxDQUFDO1lBQzVILElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDeEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==