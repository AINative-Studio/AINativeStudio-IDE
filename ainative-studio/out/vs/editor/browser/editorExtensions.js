/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
import { URI } from '../../base/common/uri.js';
import { ICodeEditorService } from './services/codeEditorService.js';
import { Position } from '../common/core/position.js';
import { IModelService } from '../common/services/model.js';
import { ITextModelService } from '../common/services/resolverService.js';
import { MenuId, MenuRegistry, Action2 } from '../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry } from '../../platform/keybinding/common/keybindingsRegistry.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { assertType } from '../../base/common/types.js';
import { ILogService } from '../../platform/log/common/log.js';
import { getActiveElement } from '../../base/browser/dom.js';
export var EditorContributionInstantiation;
(function (EditorContributionInstantiation) {
    /**
     * The contribution is created eagerly when the {@linkcode ICodeEditor} is instantiated.
     * Only Eager contributions can participate in saving or restoring of view state.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["Eager"] = 0] = "Eager";
    /**
     * The contribution is created at the latest 50ms after the first render after attaching a text model.
     * If the contribution is explicitly requested via `getContribution`, it will be instantiated sooner.
     * If there is idle time available, it will be instantiated sooner.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["AfterFirstRender"] = 1] = "AfterFirstRender";
    /**
     * The contribution is created before the editor emits events produced by user interaction (mouse events, keyboard events).
     * If the contribution is explicitly requested via `getContribution`, it will be instantiated sooner.
     * If there is idle time available, it will be instantiated sooner.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["BeforeFirstInteraction"] = 2] = "BeforeFirstInteraction";
    /**
     * The contribution is created when there is idle time available, at the latest 5000ms after the editor creation.
     * If the contribution is explicitly requested via `getContribution`, it will be instantiated sooner.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["Eventually"] = 3] = "Eventually";
    /**
     * The contribution is created only when explicitly requested via `getContribution`.
     */
    EditorContributionInstantiation[EditorContributionInstantiation["Lazy"] = 4] = "Lazy";
})(EditorContributionInstantiation || (EditorContributionInstantiation = {}));
export class Command {
    constructor(opts) {
        this.id = opts.id;
        this.precondition = opts.precondition;
        this._kbOpts = opts.kbOpts;
        this._menuOpts = opts.menuOpts;
        this.metadata = opts.metadata;
    }
    register() {
        if (Array.isArray(this._menuOpts)) {
            this._menuOpts.forEach(this._registerMenuItem, this);
        }
        else if (this._menuOpts) {
            this._registerMenuItem(this._menuOpts);
        }
        if (this._kbOpts) {
            const kbOptsArr = Array.isArray(this._kbOpts) ? this._kbOpts : [this._kbOpts];
            for (const kbOpts of kbOptsArr) {
                let kbWhen = kbOpts.kbExpr;
                if (this.precondition) {
                    if (kbWhen) {
                        kbWhen = ContextKeyExpr.and(kbWhen, this.precondition);
                    }
                    else {
                        kbWhen = this.precondition;
                    }
                }
                const desc = {
                    id: this.id,
                    weight: kbOpts.weight,
                    args: kbOpts.args,
                    when: kbWhen,
                    primary: kbOpts.primary,
                    secondary: kbOpts.secondary,
                    win: kbOpts.win,
                    linux: kbOpts.linux,
                    mac: kbOpts.mac,
                };
                KeybindingsRegistry.registerKeybindingRule(desc);
            }
        }
        CommandsRegistry.registerCommand({
            id: this.id,
            handler: (accessor, args) => this.runCommand(accessor, args),
            metadata: this.metadata
        });
    }
    _registerMenuItem(item) {
        MenuRegistry.appendMenuItem(item.menuId, {
            group: item.group,
            command: {
                id: this.id,
                title: item.title,
                icon: item.icon,
                precondition: this.precondition
            },
            when: item.when,
            order: item.order
        });
    }
}
export class MultiCommand extends Command {
    constructor() {
        super(...arguments);
        this._implementations = [];
    }
    /**
     * A higher priority gets to be looked at first
     */
    addImplementation(priority, name, implementation, when) {
        this._implementations.push({ priority, name, implementation, when });
        this._implementations.sort((a, b) => b.priority - a.priority);
        return {
            dispose: () => {
                for (let i = 0; i < this._implementations.length; i++) {
                    if (this._implementations[i].implementation === implementation) {
                        this._implementations.splice(i, 1);
                        return;
                    }
                }
            }
        };
    }
    runCommand(accessor, args) {
        const logService = accessor.get(ILogService);
        const contextKeyService = accessor.get(IContextKeyService);
        logService.trace(`Executing Command '${this.id}' which has ${this._implementations.length} bound.`);
        for (const impl of this._implementations) {
            if (impl.when) {
                const context = contextKeyService.getContext(getActiveElement());
                const value = impl.when.evaluate(context);
                if (!value) {
                    continue;
                }
            }
            const result = impl.implementation(accessor, args);
            if (result) {
                logService.trace(`Command '${this.id}' was handled by '${impl.name}'.`);
                if (typeof result === 'boolean') {
                    return;
                }
                return result;
            }
        }
        logService.trace(`The Command '${this.id}' was not handled by any implementation.`);
    }
}
//#endregion
/**
 * A command that delegates to another command's implementation.
 *
 * This lets different commands be registered but share the same implementation
 */
export class ProxyCommand extends Command {
    constructor(command, opts) {
        super(opts);
        this.command = command;
    }
    runCommand(accessor, args) {
        return this.command.runCommand(accessor, args);
    }
}
export class EditorCommand extends Command {
    /**
     * Create a command class that is bound to a certain editor contribution.
     */
    static bindToContribution(controllerGetter) {
        return class EditorControllerCommandImpl extends EditorCommand {
            constructor(opts) {
                super(opts);
                this._callback = opts.handler;
            }
            runEditorCommand(accessor, editor, args) {
                const controller = controllerGetter(editor);
                if (controller) {
                    this._callback(controller, args);
                }
            }
        };
    }
    static runEditorCommand(accessor, args, precondition, runner) {
        const codeEditorService = accessor.get(ICodeEditorService);
        // Find the editor with text focus or active
        const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
        if (!editor) {
            // well, at least we tried...
            return;
        }
        return editor.invokeWithinContext((editorAccessor) => {
            const kbService = editorAccessor.get(IContextKeyService);
            if (!kbService.contextMatchesRules(precondition ?? undefined)) {
                // precondition does not hold
                return;
            }
            return runner(editorAccessor, editor, args);
        });
    }
    runCommand(accessor, args) {
        return EditorCommand.runEditorCommand(accessor, args, this.precondition, (accessor, editor, args) => this.runEditorCommand(accessor, editor, args));
    }
}
export class EditorAction extends EditorCommand {
    static convertOptions(opts) {
        let menuOpts;
        if (Array.isArray(opts.menuOpts)) {
            menuOpts = opts.menuOpts;
        }
        else if (opts.menuOpts) {
            menuOpts = [opts.menuOpts];
        }
        else {
            menuOpts = [];
        }
        function withDefaults(item) {
            if (!item.menuId) {
                item.menuId = MenuId.EditorContext;
            }
            if (!item.title) {
                item.title = typeof opts.label === 'string' ? opts.label : opts.label.value;
            }
            item.when = ContextKeyExpr.and(opts.precondition, item.when);
            return item;
        }
        if (Array.isArray(opts.contextMenuOpts)) {
            menuOpts.push(...opts.contextMenuOpts.map(withDefaults));
        }
        else if (opts.contextMenuOpts) {
            menuOpts.push(withDefaults(opts.contextMenuOpts));
        }
        opts.menuOpts = menuOpts;
        return opts;
    }
    constructor(opts) {
        super(EditorAction.convertOptions(opts));
        if (typeof opts.label === 'string') {
            this.label = opts.label;
            this.alias = opts.alias ?? opts.label;
        }
        else {
            this.label = opts.label.value;
            this.alias = opts.alias ?? opts.label.original;
        }
    }
    runEditorCommand(accessor, editor, args) {
        this.reportTelemetry(accessor, editor);
        return this.run(accessor, editor, args || {});
    }
    reportTelemetry(accessor, editor) {
        accessor.get(ITelemetryService).publicLog2('editorActionInvoked', { name: this.label, id: this.id });
    }
}
export class MultiEditorAction extends EditorAction {
    constructor() {
        super(...arguments);
        this._implementations = [];
    }
    /**
     * A higher priority gets to be looked at first
     */
    addImplementation(priority, implementation) {
        this._implementations.push([priority, implementation]);
        this._implementations.sort((a, b) => b[0] - a[0]);
        return {
            dispose: () => {
                for (let i = 0; i < this._implementations.length; i++) {
                    if (this._implementations[i][1] === implementation) {
                        this._implementations.splice(i, 1);
                        return;
                    }
                }
            }
        };
    }
    run(accessor, editor, args) {
        for (const impl of this._implementations) {
            const result = impl[1](accessor, editor, args);
            if (result) {
                if (typeof result === 'boolean') {
                    return;
                }
                return result;
            }
        }
    }
}
//#endregion EditorAction
//#region EditorAction2
export class EditorAction2 extends Action2 {
    run(accessor, ...args) {
        // Find the editor with text focus or active
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
        if (!editor) {
            // well, at least we tried...
            return;
        }
        // precondition does hold
        return editor.invokeWithinContext((editorAccessor) => {
            const kbService = editorAccessor.get(IContextKeyService);
            const logService = editorAccessor.get(ILogService);
            const enabled = kbService.contextMatchesRules(this.desc.precondition ?? undefined);
            if (!enabled) {
                logService.debug(`[EditorAction2] NOT running command because its precondition is FALSE`, this.desc.id, this.desc.precondition?.serialize());
                return;
            }
            return this.runEditorCommand(editorAccessor, editor, ...args);
        });
    }
}
//#endregion
// --- Registration of commands and actions
export function registerModelAndPositionCommand(id, handler) {
    CommandsRegistry.registerCommand(id, function (accessor, ...args) {
        const instaService = accessor.get(IInstantiationService);
        const [resource, position] = args;
        assertType(URI.isUri(resource));
        assertType(Position.isIPosition(position));
        const model = accessor.get(IModelService).getModel(resource);
        if (model) {
            const editorPosition = Position.lift(position);
            return instaService.invokeFunction(handler, model, editorPosition, ...args.slice(2));
        }
        return accessor.get(ITextModelService).createModelReference(resource).then(reference => {
            return new Promise((resolve, reject) => {
                try {
                    const result = instaService.invokeFunction(handler, reference.object.textEditorModel, Position.lift(position), args.slice(2));
                    resolve(result);
                }
                catch (err) {
                    reject(err);
                }
            }).finally(() => {
                reference.dispose();
            });
        });
    });
}
export function registerEditorCommand(editorCommand) {
    EditorContributionRegistry.INSTANCE.registerEditorCommand(editorCommand);
    return editorCommand;
}
export function registerEditorAction(ctor) {
    const action = new ctor();
    EditorContributionRegistry.INSTANCE.registerEditorAction(action);
    return action;
}
export function registerMultiEditorAction(action) {
    EditorContributionRegistry.INSTANCE.registerEditorAction(action);
    return action;
}
export function registerInstantiatedEditorAction(editorAction) {
    EditorContributionRegistry.INSTANCE.registerEditorAction(editorAction);
}
/**
 * Registers an editor contribution. Editor contributions have a lifecycle which is bound
 * to a specific code editor instance.
 */
export function registerEditorContribution(id, ctor, instantiation) {
    EditorContributionRegistry.INSTANCE.registerEditorContribution(id, ctor, instantiation);
}
/**
 * Registers a diff editor contribution. Diff editor contributions have a lifecycle which
 * is bound to a specific diff editor instance.
 */
export function registerDiffEditorContribution(id, ctor) {
    EditorContributionRegistry.INSTANCE.registerDiffEditorContribution(id, ctor);
}
export var EditorExtensionsRegistry;
(function (EditorExtensionsRegistry) {
    function getEditorCommand(commandId) {
        return EditorContributionRegistry.INSTANCE.getEditorCommand(commandId);
    }
    EditorExtensionsRegistry.getEditorCommand = getEditorCommand;
    function getEditorActions() {
        return EditorContributionRegistry.INSTANCE.getEditorActions();
    }
    EditorExtensionsRegistry.getEditorActions = getEditorActions;
    function getEditorContributions() {
        return EditorContributionRegistry.INSTANCE.getEditorContributions();
    }
    EditorExtensionsRegistry.getEditorContributions = getEditorContributions;
    function getSomeEditorContributions(ids) {
        return EditorContributionRegistry.INSTANCE.getEditorContributions().filter(c => ids.indexOf(c.id) >= 0);
    }
    EditorExtensionsRegistry.getSomeEditorContributions = getSomeEditorContributions;
    function getDiffEditorContributions() {
        return EditorContributionRegistry.INSTANCE.getDiffEditorContributions();
    }
    EditorExtensionsRegistry.getDiffEditorContributions = getDiffEditorContributions;
})(EditorExtensionsRegistry || (EditorExtensionsRegistry = {}));
// Editor extension points
const Extensions = {
    EditorCommonContributions: 'editor.contributions'
};
class EditorContributionRegistry {
    static { this.INSTANCE = new EditorContributionRegistry(); }
    constructor() {
        this.editorContributions = [];
        this.diffEditorContributions = [];
        this.editorActions = [];
        this.editorCommands = Object.create(null);
    }
    registerEditorContribution(id, ctor, instantiation) {
        this.editorContributions.push({ id, ctor: ctor, instantiation });
    }
    getEditorContributions() {
        return this.editorContributions.slice(0);
    }
    registerDiffEditorContribution(id, ctor) {
        this.diffEditorContributions.push({ id, ctor: ctor });
    }
    getDiffEditorContributions() {
        return this.diffEditorContributions.slice(0);
    }
    registerEditorAction(action) {
        action.register();
        this.editorActions.push(action);
    }
    getEditorActions() {
        return this.editorActions;
    }
    registerEditorCommand(editorCommand) {
        editorCommand.register();
        this.editorCommands[editorCommand.id] = editorCommand;
    }
    getEditorCommand(commandId) {
        return (this.editorCommands[commandId] || null);
    }
}
Registry.add(Extensions.EditorCommonContributions, EditorContributionRegistry.INSTANCE);
function registerCommand(command) {
    command.register();
    return command;
}
export const UndoCommand = registerCommand(new MultiCommand({
    id: 'undo',
    precondition: undefined,
    kbOpts: {
        weight: 0 /* KeybindingWeight.EditorCore */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */
    },
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '1_do',
            title: nls.localize({ key: 'miUndo', comment: ['&& denotes a mnemonic'] }, "&&Undo"),
            order: 1
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('undo', "Undo"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: '1_do',
            title: nls.localize('undo', "Undo"),
            order: 1
        }]
}));
registerCommand(new ProxyCommand(UndoCommand, { id: 'default:undo', precondition: undefined }));
export const RedoCommand = registerCommand(new MultiCommand({
    id: 'redo',
    precondition: undefined,
    kbOpts: {
        weight: 0 /* KeybindingWeight.EditorCore */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 56 /* KeyCode.KeyZ */],
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 56 /* KeyCode.KeyZ */ }
    },
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '1_do',
            title: nls.localize({ key: 'miRedo', comment: ['&& denotes a mnemonic'] }, "&&Redo"),
            order: 2
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('redo', "Redo"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: '1_do',
            title: nls.localize('redo', "Redo"),
            order: 2
        }]
}));
registerCommand(new ProxyCommand(RedoCommand, { id: 'default:redo', precondition: undefined }));
export const SelectAllCommand = registerCommand(new MultiCommand({
    id: 'editor.action.selectAll',
    precondition: undefined,
    kbOpts: {
        weight: 0 /* KeybindingWeight.EditorCore */,
        kbExpr: null,
        primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */
    },
    menuOpts: [{
            menuId: MenuId.MenubarSelectionMenu,
            group: '1_basic',
            title: nls.localize({ key: 'miSelectAll', comment: ['&& denotes a mnemonic'] }, "&&Select All"),
            order: 1
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('selectAll', "Select All"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: '9_select',
            title: nls.localize('selectAll', "Select All"),
            order: 1
        }]
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2VkaXRvckV4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUM7QUFDcEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUd0RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFvQixNQUFNLDRDQUE0QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQXdCLE1BQU0sZ0RBQWdELENBQUM7QUFDMUgsT0FBTyxFQUFxRSxxQkFBcUIsRUFBeUIsTUFBTSxzREFBc0QsQ0FBQztBQUN2TCxPQUFPLEVBQWdCLG1CQUFtQixFQUFvQixNQUFNLHlEQUF5RCxDQUFDO0FBQzlILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFJeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FB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