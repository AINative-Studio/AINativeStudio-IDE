/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { getTokenClassificationRegistry, typeAndModifierIdPattern } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
const tokenClassificationRegistry = getTokenClassificationRegistry();
const tokenTypeExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'semanticTokenTypes',
    jsonSchema: {
        description: nls.localize('contributes.semanticTokenTypes', 'Contributes semantic token types.'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: nls.localize('contributes.semanticTokenTypes.id', 'The identifier of the semantic token type'),
                    pattern: typeAndModifierIdPattern,
                    patternErrorMessage: nls.localize('contributes.semanticTokenTypes.id.format', 'Identifiers should be in the form letterOrDigit[_-letterOrDigit]*'),
                },
                superType: {
                    type: 'string',
                    description: nls.localize('contributes.semanticTokenTypes.superType', 'The super type of the semantic token type'),
                    pattern: typeAndModifierIdPattern,
                    patternErrorMessage: nls.localize('contributes.semanticTokenTypes.superType.format', 'Super types should be in the form letterOrDigit[_-letterOrDigit]*'),
                },
                description: {
                    type: 'string',
                    description: nls.localize('contributes.color.description', 'The description of the semantic token type'),
                }
            }
        }
    }
});
const tokenModifierExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'semanticTokenModifiers',
    jsonSchema: {
        description: nls.localize('contributes.semanticTokenModifiers', 'Contributes semantic token modifiers.'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: nls.localize('contributes.semanticTokenModifiers.id', 'The identifier of the semantic token modifier'),
                    pattern: typeAndModifierIdPattern,
                    patternErrorMessage: nls.localize('contributes.semanticTokenModifiers.id.format', 'Identifiers should be in the form letterOrDigit[_-letterOrDigit]*')
                },
                description: {
                    description: nls.localize('contributes.semanticTokenModifiers.description', 'The description of the semantic token modifier')
                }
            }
        }
    }
});
const tokenStyleDefaultsExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'semanticTokenScopes',
    jsonSchema: {
        description: nls.localize('contributes.semanticTokenScopes', 'Contributes semantic token scope maps.'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                language: {
                    description: nls.localize('contributes.semanticTokenScopes.languages', 'Lists the languge for which the defaults are.'),
                    type: 'string'
                },
                scopes: {
                    description: nls.localize('contributes.semanticTokenScopes.scopes', 'Maps a semantic token (described by semantic token selector) to one or more textMate scopes used to represent that token.'),
                    type: 'object',
                    additionalProperties: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                }
            }
        }
    }
});
export class TokenClassificationExtensionPoints {
    constructor() {
        function validateTypeOrModifier(contribution, extensionPoint, collector) {
            if (typeof contribution.id !== 'string' || contribution.id.length === 0) {
                collector.error(nls.localize('invalid.id', "'configuration.{0}.id' must be defined and can not be empty", extensionPoint));
                return false;
            }
            if (!contribution.id.match(typeAndModifierIdPattern)) {
                collector.error(nls.localize('invalid.id.format', "'configuration.{0}.id' must follow the pattern letterOrDigit[-_letterOrDigit]*", extensionPoint));
                return false;
            }
            const superType = contribution.superType;
            if (superType && !superType.match(typeAndModifierIdPattern)) {
                collector.error(nls.localize('invalid.superType.format', "'configuration.{0}.superType' must follow the pattern letterOrDigit[-_letterOrDigit]*", extensionPoint));
                return false;
            }
            if (typeof contribution.description !== 'string' || contribution.id.length === 0) {
                collector.error(nls.localize('invalid.description', "'configuration.{0}.description' must be defined and can not be empty", extensionPoint));
                return false;
            }
            return true;
        }
        tokenTypeExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.semanticTokenTypeConfiguration', "'configuration.semanticTokenType' must be an array"));
                    return;
                }
                for (const contribution of extensionValue) {
                    if (validateTypeOrModifier(contribution, 'semanticTokenType', collector)) {
                        tokenClassificationRegistry.registerTokenType(contribution.id, contribution.description, contribution.superType);
                    }
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const contribution of extensionValue) {
                    tokenClassificationRegistry.deregisterTokenType(contribution.id);
                }
            }
        });
        tokenModifierExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.semanticTokenModifierConfiguration', "'configuration.semanticTokenModifier' must be an array"));
                    return;
                }
                for (const contribution of extensionValue) {
                    if (validateTypeOrModifier(contribution, 'semanticTokenModifier', collector)) {
                        tokenClassificationRegistry.registerTokenModifier(contribution.id, contribution.description);
                    }
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const contribution of extensionValue) {
                    tokenClassificationRegistry.deregisterTokenModifier(contribution.id);
                }
            }
        });
        tokenStyleDefaultsExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize('invalid.semanticTokenScopes.configuration', "'configuration.semanticTokenScopes' must be an array"));
                    return;
                }
                for (const contribution of extensionValue) {
                    if (contribution.language && typeof contribution.language !== 'string') {
                        collector.error(nls.localize('invalid.semanticTokenScopes.language', "'configuration.semanticTokenScopes.language' must be a string"));
                        continue;
                    }
                    if (!contribution.scopes || typeof contribution.scopes !== 'object') {
                        collector.error(nls.localize('invalid.semanticTokenScopes.scopes', "'configuration.semanticTokenScopes.scopes' must be defined as an object"));
                        continue;
                    }
                    for (const selectorString in contribution.scopes) {
                        const tmScopes = contribution.scopes[selectorString];
                        if (!Array.isArray(tmScopes) || tmScopes.some(l => typeof l !== 'string')) {
                            collector.error(nls.localize('invalid.semanticTokenScopes.scopes.value', "'configuration.semanticTokenScopes.scopes' values must be an array of strings"));
                            continue;
                        }
                        try {
                            const selector = tokenClassificationRegistry.parseTokenSelector(selectorString, contribution.language);
                            tokenClassificationRegistry.registerTokenStyleDefault(selector, { scopesToProbe: tmScopes.map(s => s.split(' ')) });
                        }
                        catch (e) {
                            collector.error(nls.localize('invalid.semanticTokenScopes.scopes.selector', "configuration.semanticTokenScopes.scopes': Problems parsing selector {0}.", selectorString));
                            // invalid selector, ignore
                        }
                    }
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const contribution of extensionValue) {
                    for (const selectorString in contribution.scopes) {
                        const tmScopes = contribution.scopes[selectorString];
                        try {
                            const selector = tokenClassificationRegistry.parseTokenSelector(selectorString, contribution.language);
                            tokenClassificationRegistry.registerTokenStyleDefault(selector, { scopesToProbe: tmScopes.map(s => s.split(' ')) });
                        }
                        catch (e) {
                            // invalid selector, ignore
                        }
                    }
                }
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5DbGFzc2lmaWNhdGlvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL3Rva2VuQ2xhc3NpZmljYXRpb25FeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBNkIsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RyxPQUFPLEVBQUUsOEJBQThCLEVBQWdDLHdCQUF3QixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFrQjFLLE1BQU0sMkJBQTJCLEdBQWlDLDhCQUE4QixFQUFFLENBQUM7QUFFbkcsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBNkI7SUFDL0YsY0FBYyxFQUFFLG9CQUFvQjtJQUNwQyxVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxtQ0FBbUMsQ0FBQztRQUNoRyxJQUFJLEVBQUUsT0FBTztRQUNiLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLEVBQUUsRUFBRTtvQkFDSCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSwyQ0FBMkMsQ0FBQztvQkFDM0csT0FBTyxFQUFFLHdCQUF3QjtvQkFDakMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxtRUFBbUUsQ0FBQztpQkFDbEo7Z0JBQ0QsU0FBUyxFQUFFO29CQUNWLElBQUksRUFBRSxRQUFRO29CQUNkLFdB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