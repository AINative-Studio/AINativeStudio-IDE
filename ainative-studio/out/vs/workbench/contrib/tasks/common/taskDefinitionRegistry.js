/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Types from '../../../../base/common/types.js';
import * as Objects from '../../../../base/common/objects.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../base/common/event.js';
const taskDefinitionSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        type: {
            type: 'string',
            description: nls.localize('TaskDefinition.description', 'The actual task type. Please note that types starting with a \'$\' are reserved for internal usage.')
        },
        required: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        properties: {
            type: 'object',
            description: nls.localize('TaskDefinition.properties', 'Additional properties of the task type'),
            additionalProperties: {
                $ref: 'http://json-schema.org/draft-07/schema#'
            }
        },
        when: {
            type: 'string',
            markdownDescription: nls.localize('TaskDefinition.when', 'Condition which must be true to enable this type of task. Consider using `shellExecutionSupported`, `processExecutionSupported`, and `customExecutionSupported` as appropriate for this task definition. See the [API documentation](https://code.visualstudio.com/api/extension-guides/task-provider#when-clause) for more information.'),
            default: ''
        }
    }
};
var Configuration;
(function (Configuration) {
    function from(value, extensionId, messageCollector) {
        if (!value) {
            return undefined;
        }
        const taskType = Types.isString(value.type) ? value.type : undefined;
        if (!taskType || taskType.length === 0) {
            messageCollector.error(nls.localize('TaskTypeConfiguration.noType', 'The task type configuration is missing the required \'taskType\' property'));
            return undefined;
        }
        const required = [];
        if (Array.isArray(value.required)) {
            for (const element of value.required) {
                if (Types.isString(element)) {
                    required.push(element);
                }
            }
        }
        return {
            extensionId: extensionId.value,
            taskType, required: required,
            properties: value.properties ? Objects.deepClone(value.properties) : {},
            when: value.when ? ContextKeyExpr.deserialize(value.when) : undefined
        };
    }
    Configuration.from = from;
})(Configuration || (Configuration = {}));
const taskDefinitionsExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'taskDefinitions',
    activationEventsGenerator: (contributions, result) => {
        for (const task of contributions) {
            if (task.type) {
                result.push(`onTaskType:${task.type}`);
            }
        }
    },
    jsonSchema: {
        description: nls.localize('TaskDefinitionExtPoint', 'Contributes task kinds'),
        type: 'array',
        items: taskDefinitionSchema
    }
});
class TaskDefinitionRegistryImpl {
    constructor() {
        this._onDefinitionsChanged = new Emitter();
        this.onDefinitionsChanged = this._onDefinitionsChanged.event;
        this.taskTypes = Object.create(null);
        this.readyPromise = new Promise((resolve, reject) => {
            taskDefinitionsExtPoint.setHandler((extensions, delta) => {
                this._schema = undefined;
                try {
                    for (const extension of delta.removed) {
                        const taskTypes = extension.value;
                        for (const taskType of taskTypes) {
                            if (this.taskTypes && taskType.type && this.taskTypes[taskType.type]) {
                                delete this.taskTypes[taskType.type];
                            }
                        }
                    }
                    for (const extension of delta.added) {
                        const taskTypes = extension.value;
                        for (const taskType of taskTypes) {
                            const type = Configuration.from(taskType, extension.description.identifier, extension.collector);
                            if (type) {
                                this.taskTypes[type.taskType] = type;
                            }
                        }
                    }
                    if ((delta.removed.length > 0) || (delta.added.length > 0)) {
                        this._onDefinitionsChanged.fire();
                    }
                }
                catch (error) {
                }
                resolve(undefined);
            });
        });
    }
    onReady() {
        return this.readyPromise;
    }
    get(key) {
        return this.taskTypes[key];
    }
    all() {
        return Object.keys(this.taskTypes).map(key => this.taskTypes[key]);
    }
    getJsonSchema() {
        if (this._schema === undefined) {
            const schemas = [];
            for (const definition of this.all()) {
                const schema = {
                    type: 'object',
                    additionalProperties: false
                };
                if (definition.required.length > 0) {
                    schema.required = definition.required.slice(0);
                }
                if (definition.properties !== undefined) {
                    schema.properties = Objects.deepClone(definition.properties);
                }
                else {
                    schema.properties = Object.create(null);
                }
                schema.properties.type = {
                    type: 'string',
                    enum: [definition.taskType]
                };
                schemas.push(schema);
            }
            this._schema = { oneOf: schemas };
        }
        return this._schema;
    }
}
export const TaskDefinitionRegistry = new TaskDefinitionRegistryImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0RlZmluaXRpb25SZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vdGFza0RlZmluaXRpb25SZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRzFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUM7QUFDMUQsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQTZCLE1BQU0sMkRBQTJELENBQUM7QUFJMUgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUdsRSxNQUFNLG9CQUFvQixHQUFnQjtJQUN6QyxJQUFJLEVBQUUsUUFBUTtJQUNkLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsVUFBVSxFQUFFO1FBQ1gsSUFBSSxFQUFFO1lBQ0wsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxxR0FBcUcsQ0FBQztTQUM5SjtRQUNELFFBQVEsRUFBRTtZQUNULElBQUksRUFBRSxPQUFPO1lBQ2IsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2FBQ2Q7U0FDRDtRQUNELFVBQVUsRUFBRTtZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsd0NBQXdDLENBQUM7WUFDaEcsb0JBQW9CLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSx5Q0FBeUM7YUFDL0M7U0FDRDtRQUNE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