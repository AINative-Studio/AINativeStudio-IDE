/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../base/common/types.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CONTEXT_VARIABLE_NAME, CONTEXT_VARIABLE_TYPE, CONTEXT_VARIABLE_VALUE } from './debug.js';
import { getContextForVariable } from './debugContext.js';
import { Scope, Variable, VisualizedExpression } from './debugModel.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
export const IDebugVisualizerService = createDecorator('debugVisualizerService');
export class DebugVisualizer {
    get name() {
        return this.viz.name;
    }
    get iconPath() {
        return this.viz.iconPath;
    }
    get iconClass() {
        return this.viz.iconClass;
    }
    constructor(handle, viz) {
        this.handle = handle;
        this.viz = viz;
    }
    async resolve(token) {
        return this.viz.visualization ??= await this.handle.resolveDebugVisualizer(this.viz, token);
    }
    async execute() {
        await this.handle.executeDebugVisualizerCommand(this.viz.id);
    }
}
const emptyRef = { object: [], dispose: () => { } };
let DebugVisualizerService = class DebugVisualizerService {
    constructor(contextKeyService, extensionService, logService) {
        this.contextKeyService = contextKeyService;
        this.extensionService = extensionService;
        this.logService = logService;
        this.handles = new Map();
        this.trees = new Map();
        this.didActivate = new Map();
        this.registrations = [];
        visualizersExtensionPoint.setHandler((_, { added, removed }) => {
            this.registrations = this.registrations.filter(r => !removed.some(e => ExtensionIdentifier.equals(e.description.identifier, r.extensionId)));
            added.forEach(e => this.processExtensionRegistration(e.description));
        });
    }
    /** @inheritdoc */
    async getApplicableFor(variable, token) {
        if (!(variable instanceof Variable)) {
            return emptyRef;
        }
        const threadId = variable.getThreadId();
        if (threadId === undefined) { // an expression, not a variable
            return emptyRef;
        }
        const context = this.getVariableContext(threadId, variable);
        const overlay = getContextForVariable(this.contextKeyService, variable, [
            [CONTEXT_VARIABLE_NAME.key, variable.name],
            [CONTEXT_VARIABLE_VALUE.key, variable.value],
            [CONTEXT_VARIABLE_TYPE.key, variable.type],
        ]);
        const maybeVisualizers = await Promise.all(this.registrations.map(async (registration) => {
            if (!overlay.contextMatchesRules(registration.expr)) {
                return;
            }
            let prom = this.didActivate.get(registration.id);
            if (!prom) {
                prom = this.extensionService.activateByEvent(`onDebugVisualizer:${registration.id}`);
                this.didActivate.set(registration.id, prom);
            }
            await prom;
            if (token.isCancellationRequested) {
                return;
            }
            const handle = this.handles.get(toKey(registration.extensionId, registration.id));
            return handle && { handle, result: await handle.provideDebugVisualizers(context, token) };
        }));
        const ref = {
            object: maybeVisualizers.filter(isDefined).flatMap(v => v.result.map(r => new DebugVisualizer(v.handle, r))),
            dispose: () => {
                for (const viz of maybeVisualizers) {
                    viz?.handle.disposeDebugVisualizers(viz.result.map(r => r.id));
                }
            },
        };
        if (token.isCancellationRequested) {
            ref.dispose();
        }
        return ref;
    }
    /** @inheritdoc */
    register(handle) {
        const key = toKey(handle.extensionId, handle.id);
        this.handles.set(key, handle);
        return toDisposable(() => this.handles.delete(key));
    }
    /** @inheritdoc */
    registerTree(treeId, handle) {
        this.trees.set(treeId, handle);
        return toDisposable(() => this.trees.delete(treeId));
    }
    /** @inheritdoc */
    async getVisualizedNodeFor(treeId, expr) {
        if (!(expr instanceof Variable)) {
            return;
        }
        const threadId = expr.getThreadId();
        if (threadId === undefined) {
            return;
        }
        const tree = this.trees.get(treeId);
        if (!tree) {
            return;
        }
        try {
            const treeItem = await tree.getTreeItem(this.getVariableContext(threadId, expr));
            if (!treeItem) {
                return;
            }
            return new VisualizedExpression(expr.getSession(), this, treeId, treeItem, expr);
        }
        catch (e) {
            this.logService.warn('Failed to get visualized node', e);
            return;
        }
    }
    /** @inheritdoc */
    async getVisualizedChildren(session, treeId, treeElementId) {
        const node = this.trees.get(treeId);
        const children = await node?.getChildren(treeElementId) || [];
        return children.map(c => new VisualizedExpression(session, this, treeId, c, undefined));
    }
    /** @inheritdoc */
    async editTreeItem(treeId, treeItem, newValue) {
        const newItem = await this.trees.get(treeId)?.editItem?.(treeItem.id, newValue);
        if (newItem) {
            Object.assign(treeItem, newItem); // replace in-place so rerenders work
        }
    }
    getVariableContext(threadId, variable) {
        const context = {
            sessionId: variable.getSession()?.getId() || '',
            containerId: (variable.parent instanceof Variable ? variable.reference : undefined),
            threadId,
            variable: {
                name: variable.name,
                value: variable.value,
                type: variable.type,
                evaluateName: variable.evaluateName,
                variablesReference: variable.reference || 0,
                indexedVariables: variable.indexedVariables,
                memoryReference: variable.memoryReference,
                namedVariables: variable.namedVariables,
                presentationHint: variable.presentationHint,
            }
        };
        for (let p = variable; p instanceof Variable; p = p.parent) {
            if (p.parent instanceof Scope) {
                context.frameId = p.parent.stackFrame.frameId;
            }
        }
        return context;
    }
    processExtensionRegistration(ext) {
        const viz = ext.contributes?.debugVisualizers;
        if (!(viz instanceof Array)) {
            return;
        }
        for (const { when, id } of viz) {
            try {
                const expr = ContextKeyExpr.deserialize(when);
                if (expr) {
                    this.registrations.push({ expr, id, extensionId: ext.identifier });
                }
            }
            catch (e) {
                this.logService.error(`Error processing debug visualizer registration from extension '${ext.identifier.value}'`, e);
            }
        }
    }
};
DebugVisualizerService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IExtensionService),
    __param(2, ILogService)
], DebugVisualizerService);
export { DebugVisualizerService };
const toKey = (extensionId, id) => `${ExtensionIdentifier.toKey(extensionId)}\0${id}`;
const visualizersExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'debugVisualizers',
    jsonSchema: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Name of the debug visualizer'
                },
                when: {
                    type: 'string',
                    description: 'Condition when the debug visualizer is applicable'
                }
            },
            required: ['id', 'when']
        }
    },
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            if (contrib.id) {
                result.push(`onDebugVisualizer:${contrib.id}`);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaXN1YWxpemVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdWaXN1YWxpemVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQTJCLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUF3QixrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSxzREFBc0QsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBZ0ssTUFBTSxZQUFZLENBQUM7QUFDaFEsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUUvRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQTBCLHdCQUF3QixDQUFDLENBQUM7QUFrQjFHLE1BQU0sT0FBTyxlQUFlO0lBQzNCLElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLEdB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