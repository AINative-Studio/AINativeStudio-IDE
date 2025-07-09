/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import { ProblemMatcherRegistry } from './problemMatcher.js';
import commonSchema from './jsonSchemaCommon.js';
const schema = {
    oneOf: [
        {
            allOf: [
                {
                    type: 'object',
                    required: ['version'],
                    properties: {
                        version: {
                            type: 'string',
                            enum: ['0.1.0'],
                            deprecationMessage: nls.localize('JsonSchema.version.deprecated', 'Task version 0.1.0 is deprecated. Please use 2.0.0'),
                            description: nls.localize('JsonSchema.version', 'The config\'s version number')
                        },
                        _runner: {
                            deprecationMessage: nls.localize('JsonSchema._runner', 'The runner has graduated. Use the official runner property')
                        },
                        runner: {
                            type: 'string',
                            enum: ['process', 'terminal'],
                            default: 'process',
                            description: nls.localize('JsonSchema.runner', 'Defines whether the task is executed as a process and the output is shown in the output window or inside the terminal.')
                        },
                        windows: {
                            $ref: '#/definitions/taskRunnerConfiguration',
                            description: nls.localize('JsonSchema.windows', 'Windows specific command configuration')
                        },
                        osx: {
                            $ref: '#/definitions/taskRunnerConfiguration',
                            description: nls.localize('JsonSchema.mac', 'Mac specific command configuration')
                        },
                        linux: {
                            $ref: '#/definitions/taskRunnerConfiguration',
                            description: nls.localize('JsonSchema.linux', 'Linux specific command configuration')
                        }
                    }
                },
                {
                    $ref: '#/definitions/taskRunnerConfiguration'
                }
            ]
        }
    ]
};
const shellCommand = {
    type: 'boolean',
    default: true,
    description: nls.localize('JsonSchema.shell', 'Specifies whether the command is a shell command or an external program. Defaults to false if omitted.')
};
schema.definitions = Objects.deepClone(commonSchema.definitions);
const definitions = schema.definitions;
definitions['commandConfiguration']['properties']['isShellCommand'] = Objects.deepClone(shellCommand);
definitions['taskDescription']['properties']['isShellCommand'] = Objects.deepClone(shellCommand);
definitions['taskRunnerConfiguration']['properties']['isShellCommand'] = Objects.deepClone(shellCommand);
Object.getOwnPropertyNames(definitions).forEach(key => {
    const newKey = key + '1';
    definitions[newKey] = definitions[key];
    delete definitions[key];
});
function fixReferences(literal) {
    if (Array.isArray(literal)) {
        literal.forEach(fixReferences);
    }
    else if (typeof literal === 'object') {
        if (literal['$ref']) {
            literal['$ref'] = literal['$ref'] + '1';
        }
        Object.getOwnPropertyNames(literal).forEach(property => {
            const value = literal[property];
            if (Array.isArray(value) || typeof value === 'object') {
                fixReferences(value);
            }
        });
    }
}
fixReferences(schema);
ProblemMatcherRegistry.onReady().then(() => {
    try {
        const matcherIds = ProblemMatcherRegistry.keys().map(key => '$' + key);
        definitions.problemMatcherType1.oneOf[0].enum = matcherIds;
        definitions.problemMatcherType1.oneOf[2].items.anyOf[1].enum = matcherIds;
    }
    catch (err) {
        console.log('Installing problem matcher ids failed');
    }
});
export default schema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYV92MS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vanNvblNjaGVtYV92MS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFHOUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFN0QsT0FBTyxZQUFZLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsTUFBTSxNQUFNLEdBQWdCO0lBQzNCLEtBQUssRUFBRTtRQUNOO1lBQ0MsS0FBSyxFQUFFO2dCQUNOO29CQUNDLElBQUksRUFBRSxRQUFRO29CQUNkLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQztvQkFDckIsVUFBVSxFQUFFO3dCQUNYLE9BQU8sRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUM7NEJBQ2Ysa0JBQWtCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxvREFBb0QsQ0FBQzs0QkFDdkgsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsOEJBQThCLENBQUM7eUJBQy9FO3dCQUNELE9BQU8sRUFBRTs0QkFDUixrQkFBa0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDREQUE0RCxDQUFDO3lCQUNwSDt3QkFDRCxNQUFNLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQzs0QkFDN0IsT0FBTyxFQUFFLFNBQVM7NEJBQ2xCLFdB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LENBQUM7QUFFdEIsc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUMxQyxJQUFJLENBQUM7UUFDSixNQUFNLFVBQVUsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDdkUsV0FBVyxDQUFDLG1CQUFtQixDQUFDLEtBQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1FBQzNELFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBcUIsQ0FBQyxLQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztJQUM5RixDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUM7QUFFSCxlQUFlLE1BQU0sQ0FBQyJ9