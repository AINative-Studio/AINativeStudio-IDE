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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvYnJlYWRjcnVtYnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsVUFBVSxFQUE4QyxNQUFNLG9FQUFvRSxDQUFDO0FBQzVJLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRzVFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0IsMkJBQTJCLENBQUMsQ0FBQztBQVlyRyxNQUFNLE9BQU8sa0JBQWtCO0lBQS9CO1FBSWtCLFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztJQWU5RCxDQUFDO0lBYkEsUUFBUSxDQUFDLEtBQWEsRUFBRSxNQUF5QjtRQUNoRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLEtBQUssd0JBQXdCLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzdCLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENB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