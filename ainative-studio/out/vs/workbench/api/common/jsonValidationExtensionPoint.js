/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { ExtensionsRegistry } from '../../services/extensions/common/extensionsRegistry.js';
import * as resources from '../../../base/common/resources.js';
import { isString } from '../../../base/common/types.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Extensions } from '../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'jsonValidation',
    defaultExtensionKind: ['workspace', 'web'],
    jsonSchema: {
        description: nls.localize('contributes.jsonValidation', 'Contributes json schema configuration.'),
        type: 'array',
        defaultSnippets: [{ body: [{ fileMatch: '${1:file.json}', url: '${2:url}' }] }],
        items: {
            type: 'object',
            defaultSnippets: [{ body: { fileMatch: '${1:file.json}', url: '${2:url}' } }],
            properties: {
                fileMatch: {
                    type: ['string', 'array'],
                    description: nls.localize('contributes.jsonValidation.fileMatch', 'The file pattern (or an array of patterns) to match, for example "package.json" or "*.launch". Exclusion patterns start with \'!\''),
                    items: {
                        type: ['string']
                    }
                },
                url: {
                    description: nls.localize('contributes.jsonValidation.url', 'A schema URL (\'http:\', \'https:\') or relative path to the extension folder (\'./\').'),
                    type: 'string'
                }
            }
        }
    }
});
export class JSONValidationExtensionPoint {
    constructor() {
        configurationExtPoint.setHandler((extensions) => {
            for (const extension of extensions) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                const extensionLocation = extension.description.extensionLocation;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.jsonValidation', "'configuration.jsonValidation' must be a array"));
                    return;
                }
                extensionValue.forEach(extension => {
                    if (!isString(extension.fileMatch) && !(Array.isArray(extension.fileMatch) && extension.fileMatch.every(isString))) {
                        collector.error(nls.localize('invalid.fileMatch', "'configuration.jsonValidation.fileMatch' must be defined as a string or an array of strings."));
                        return;
                    }
                    const uri = extension.url;
                    if (!isString(uri)) {
                        collector.error(nls.localize('invalid.url', "'configuration.jsonValidation.url' must be a URL or relative path"));
                        return;
                    }
                    if (uri.startsWith('./')) {
                        try {
                            const colorThemeLocation = resources.joinPath(extensionLocation, uri);
                            if (!resources.isEqualOrParent(colorThemeLocation, extensionLocation)) {
                                collector.warn(nls.localize('invalid.path.1', "Expected `contributes.{0}.url` ({1}) to be included inside extension's folder ({2}). This might make the extension non-portable.", configurationExtPoint.name, colorThemeLocation.toString(), extensionLocation.path));
                            }
                        }
                        catch (e) {
                            collector.error(nls.localize('invalid.url.fileschema', "'configuration.jsonValidation.url' is an invalid relative URL: {0}", e.message));
                        }
                    }
                    else if (!/^[^:/?#]+:\/\//.test(uri)) {
                        collector.error(nls.localize('invalid.url.schema', "'configuration.jsonValidation.url' must be an absolute URL or start with './'  to reference schemas located in the extension."));
                        return;
                    }
                });
            }
        });
    }
}
class JSONValidationDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.jsonValidation;
    }
    render(manifest) {
        const contrib = manifest.contributes?.jsonValidation || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize('fileMatch', "File Match"),
            nls.localize('schema', "Schema"),
        ];
        const rows = contrib.map(v => {
            return [
                new MarkdownString().appendMarkdown(`\`${Array.isArray(v.fileMatch) ? v.fileMatch.join(', ') : v.fileMatch}\``),
                v.url,
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'jsonValidation',
    label: nls.localize('jsonValidation', "JSON Validation"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(JSONValidationDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblZhbGlkYXRpb25FeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9qc29uVmFsaWRhdGlvbkV4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxLQUFLLFNBQVMsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQW1HLE1BQU0sZ0VBQWdFLENBQUM7QUFFN0wsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFPckUsTUFBTSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBa0M7SUFDeEcsY0FBYyxFQUFFLGdCQUFnQjtJQUNoQyxvQkFBb0IsRUFBRSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUM7SUFDMUMsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsd0NBQXdDLENBQUM7UUFDakcsSUFBSSxFQUFFLE9BQU87UUFDYixlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLEdB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