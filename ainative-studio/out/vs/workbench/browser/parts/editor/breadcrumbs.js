/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export const IBreadcrumbsService = createDecorator('IEditorBreadcrumbsService');
export class BreadcrumbsService {
    constructor() {
        this._map = new Map();
    }
    register(group, widget) {
        if (this._map.has(group)) {
            throw new Error(`group (${group}) has already a widget`);
        }
        this._map.set(group, widget);
        return {
            dispose: () => this._map.delete(group)
        };
    }
    getWidget(group) {
        return this._map.get(group);
    }
}
registerSingleton(IBreadcrumbsService, BreadcrumbsService, 1 /* InstantiationType.Delayed */);
//#region config
export class BreadcrumbsConfig {
    constructor() {
        // internal
    }
    static { this.IsEnabled = BreadcrumbsConfig._stub('breadcrumbs.enabled'); }
    static { this.UseQuickPick = BreadcrumbsConfig._stub('breadcrumbs.useQuickPick'); }
    static { this.FilePath = BreadcrumbsConfig._stub('breadcrumbs.filePath'); }
    static { this.SymbolPath = BreadcrumbsConfig._stub('breadcrumbs.symbolPath'); }
    static { this.SymbolSortOrder = BreadcrumbsConfig._stub('breadcrumbs.symbolSortOrder'); }
    static { this.Icons = BreadcrumbsConfig._stub('breadcrumbs.icons'); }
    static { this.TitleScrollbarSizing = BreadcrumbsConfig._stub('workbench.editor.titleScrollbarSizing'); }
    static { this.FileExcludes = BreadcrumbsConfig._stub('files.exclude'); }
    static _stub(name) {
        return {
            bindTo(service) {
                const onDidChange = new Emitter();
                const listener = service.onDidChangeConfiguration(e => {
                    if (e.affectsConfiguration(name)) {
                        onDidChange.fire(undefined);
                    }
                });
                return new class {
                    constructor() {
                        this.name = name;
                        this.onDidChange = onDidChange.event;
                    }
                    getValue(overrides) {
                        if (overrides) {
                            return service.getValue(name, overrides);
                        }
                        else {
                            return service.getValue(name);
                        }
                    }
                    updateValue(newValue, overrides) {
                        if (overrides) {
                            return service.updateValue(name, newValue, overrides);
                        }
                        else {
                            return service.updateValue(name, newValue);
                        }
                    }
                    dispose() {
                        listener.dispose();
                        onDidChange.dispose();
                    }
                };
            }
        };
    }
}
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'breadcrumbs',
    title: localize('title', "Breadcrumb Navigation"),
    order: 101,
    type: 'object',
    properties: {
        'breadcrumbs.enabled': {
            description: localize('enabled', "Enable/disable navigation breadcrumbs."),
            type: 'boolean',
            default: true
        },
        'breadcrumbs.filePath': {
            description: localize('filepath', "Controls whether and how file paths are shown in the breadcrumbs view."),
            type: 'string',
            default: 'on',
            enum: ['on', 'off', 'last'],
            enumDescriptions: [
                localize('filepath.on', "Show the file path in the breadcrumbs view."),
                localize('filepath.off', "Do not show the file path in the breadcrumbs view."),
                localize('filepath.last', "Only show the last element of the file path in the breadcrumbs view."),
            ]
        },
        'breadcrumbs.symbolPath': {
            description: localize('symbolpath', "Controls whether and how symbols are shown in the breadcrumbs view."),
            type: 'string',
            default: 'on',
            enum: ['on', 'off', 'last'],
            enumDescriptions: [
                localize('symbolpath.on', "Show all symbols in the breadcrumbs view."),
                localize('symbolpath.off', "Do not show symbols in the breadcrumbs view."),
                localize('symbolpath.last', "Only show the current symbol in the breadcrumbs view."),
            ]
        },
        'breadcrumbs.symbolSortOrder': {
            description: localize('symbolSortOrder', "Controls how symbols are sorted in the breadcrumbs outline view."),
            type: 'string',
            default: 'position',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            enum: ['position', 'name', 'type'],
            enumDescriptions: [
                localize('symbolSortOrder.position', "Show symbol outline in file position order."),
                localize('symbolSortOrder.name', "Show symbol outline in alphabetical order."),
                localize('symbolSortOrder.type', "Show symbol outline in symbol type order."),
            ]
        },
        'breadcrumbs.icons': {
            description: localize('icons', "Render breadcrumb items with icons."),
            type: 'boolean',
            default: true
        },
        'breadcrumbs.showFiles': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.file', "When enabled breadcrumbs show `file`-symbols.")
        },
        'breadcrumbs.showModules': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.module', "When enabled breadcrumbs show `module`-symbols.")
        },
        'breadcrumbs.showNamespaces': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.namespace', "When enabled breadcrumbs show `namespace`-symbols.")
        },
        'breadcrumbs.showPackages': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.package', "When enabled breadcrumbs show `package`-symbols.")
        },
        'breadcrumbs.showClasses': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.class', "When enabled breadcrumbs show `class`-symbols.")
        },
        'breadcrumbs.showMethods': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.method', "When enabled breadcrumbs show `method`-symbols.")
        },
        'breadcrumbs.showProperties': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.property', "When enabled breadcrumbs show `property`-symbols.")
        },
        'breadcrumbs.showFields': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.field', "When enabled breadcrumbs show `field`-symbols.")
        },
        'breadcrumbs.showConstructors': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.constructor', "When enabled breadcrumbs show `constructor`-symbols.")
        },
        'breadcrumbs.showEnums': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.enum', "When enabled breadcrumbs show `enum`-symbols.")
        },
        'breadcrumbs.showInterfaces': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.interface', "When enabled breadcrumbs show `interface`-symbols.")
        },
        'breadcrumbs.showFunctions': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.function', "When enabled breadcrumbs show `function`-symbols.")
        },
        'breadcrumbs.showVariables': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.variable', "When enabled breadcrumbs show `variable`-symbols.")
        },
        'breadcrumbs.showConstants': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.constant', "When enabled breadcrumbs show `constant`-symbols.")
        },
        'breadcrumbs.showStrings': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.string', "When enabled breadcrumbs show `string`-symbols.")
        },
        'breadcrumbs.showNumbers': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.number', "When enabled breadcrumbs show `number`-symbols.")
        },
        'breadcrumbs.showBooleans': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.boolean', "When enabled breadcrumbs show `boolean`-symbols.")
        },
        'breadcrumbs.showArrays': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.array', "When enabled breadcrumbs show `array`-symbols.")
        },
        'breadcrumbs.showObjects': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.object', "When enabled breadcrumbs show `object`-symbols.")
        },
        'breadcrumbs.showKeys': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.key', "When enabled breadcrumbs show `key`-symbols.")
        },
        'breadcrumbs.showNull': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.null', "When enabled breadcrumbs show `null`-symbols.")
        },
        'breadcrumbs.showEnumMembers': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.enumMember', "When enabled breadcrumbs show `enumMember`-symbols.")
        },
        'breadcrumbs.showStructs': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.struct', "When enabled breadcrumbs show `struct`-symbols.")
        },
        'breadcrumbs.showEvents': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.event', "When enabled breadcrumbs show `event`-symbols.")
        },
        'breadcrumbs.showOperators': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.operator', "When enabled breadcrumbs show `operator`-symbols.")
        },
        'breadcrumbs.showTypeParameters': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.typeParameter', "When enabled breadcrumbs show `typeParameter`-symbols.")
        }
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2JyZWFkY3J1bWJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUdsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLFVBQVUsRUFBOEMsTUFBTSxvRUFBb0UsQ0FBQztBQUM1SSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUc1RSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLDJCQUEyQixDQUFDLENBQUM7QUFZckcsTUFBTSxPQUFPLGtCQUFrQjtJQUEvQjtRQUlrQixTQUFJLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUM7SUFlOUQsQ0FBQztJQWJBLFFBQVEsQ0FBQyxLQUFhLEVBQUUsTUFBeUI7UUFDaEQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLHdCQUF3QixDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QixPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxD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