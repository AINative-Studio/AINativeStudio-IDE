/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parse } from '../../../base/common/glob.js';
import { Mimes } from '../../../base/common/mime.js';
import { Schemas } from '../../../base/common/network.js';
import { basename, posix } from '../../../base/common/path.js';
import { DataUri } from '../../../base/common/resources.js';
import { startsWithUTF8BOM } from '../../../base/common/strings.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
let registeredAssociations = [];
let nonUserRegisteredAssociations = [];
let userRegisteredAssociations = [];
/**
 * Associate a language to the registry (platform).
 * * **NOTE**: This association will lose over associations registered using `registerConfiguredLanguageAssociation`.
 * * **NOTE**: Use `clearPlatformLanguageAssociations` to remove all associations registered using this function.
 */
export function registerPlatformLanguageAssociation(association, warnOnOverwrite = false) {
    _registerLanguageAssociation(association, false, warnOnOverwrite);
}
/**
 * Associate a language to the registry (configured).
 * * **NOTE**: This association will win over associations registered using `registerPlatformLanguageAssociation`.
 * * **NOTE**: Use `clearConfiguredLanguageAssociations` to remove all associations registered using this function.
 */
export function registerConfiguredLanguageAssociation(association) {
    _registerLanguageAssociation(association, true, false);
}
function _registerLanguageAssociation(association, userConfigured, warnOnOverwrite) {
    // Register
    const associationItem = toLanguageAssociationItem(association, userConfigured);
    registeredAssociations.push(associationItem);
    if (!associationItem.userConfigured) {
        nonUserRegisteredAssociations.push(associationItem);
    }
    else {
        userRegisteredAssociations.push(associationItem);
    }
    // Check for conflicts unless this is a user configured association
    if (warnOnOverwrite && !associationItem.userConfigured) {
        registeredAssociations.forEach(a => {
            if (a.mime === associationItem.mime || a.userConfigured) {
                return; // same mime or userConfigured is ok
            }
            if (associationItem.extension && a.extension === associationItem.extension) {
                console.warn(`Overwriting extension <<${associationItem.extension}>> to now point to mime <<${associationItem.mime}>>`);
            }
            if (associationItem.filename && a.filename === associationItem.filename) {
                console.warn(`Overwriting filename <<${associationItem.filename}>> to now point to mime <<${associationItem.mime}>>`);
            }
            if (associationItem.filepattern && a.filepattern === associationItem.filepattern) {
                console.warn(`Overwriting filepattern <<${associationItem.filepattern}>> to now point to mime <<${associationItem.mime}>>`);
            }
            if (associationItem.firstline && a.firstline === associationItem.firstline) {
                console.warn(`Overwriting firstline <<${associationItem.firstline}>> to now point to mime <<${associationItem.mime}>>`);
            }
        });
    }
}
function toLanguageAssociationItem(association, userConfigured) {
    return {
        id: association.id,
        mime: association.mime,
        filename: association.filename,
        extension: association.extension,
        filepattern: association.filepattern,
        firstline: association.firstline,
        userConfigured: userConfigured,
        filenameLowercase: association.filename ? association.filename.toLowerCase() : undefined,
        extensionLowercase: association.extension ? association.extension.toLowerCase() : undefined,
        filepatternLowercase: association.filepattern ? parse(association.filepattern.toLowerCase()) : undefined,
        filepatternOnPath: association.filepattern ? association.filepattern.indexOf(posix.sep) >= 0 : false
    };
}
/**
 * Clear language associations from the registry (platform).
 */
export function clearPlatformLanguageAssociations() {
    registeredAssociations = registeredAssociations.filter(a => a.userConfigured);
    nonUserRegisteredAssociations = [];
}
/**
 * Clear language associations from the registry (configured).
 */
export function clearConfiguredLanguageAssociations() {
    registeredAssociations = registeredAssociations.filter(a => !a.userConfigured);
    userRegisteredAssociations = [];
}
/**
 * Given a file, return the best matching mime types for it
 * based on the registered language associations.
 */
export function getMimeTypes(resource, firstLine) {
    return getAssociations(resource, firstLine).map(item => item.mime);
}
/**
 * @see `getMimeTypes`
 */
export function getLanguageIds(resource, firstLine) {
    return getAssociations(resource, firstLine).map(item => item.id);
}
function getAssociations(resource, firstLine) {
    let path;
    if (resource) {
        switch (resource.scheme) {
            case Schemas.file:
                path = resource.fsPath;
                break;
            case Schemas.data: {
                const metadata = DataUri.parseMetaData(resource);
                path = metadata.get(DataUri.META_DATA_LABEL);
                break;
            }
            case Schemas.vscodeNotebookCell:
                // File path not relevant for language detection of cell
                path = undefined;
                break;
            default:
                path = resource.path;
        }
    }
    if (!path) {
        return [{ id: 'unknown', mime: Mimes.unknown }];
    }
    path = path.toLowerCase();
    const filename = basename(path);
    // 1.) User configured mappings have highest priority
    const configuredLanguage = getAssociationByPath(path, filename, userRegisteredAssociations);
    if (configuredLanguage) {
        return [configuredLanguage, { id: PLAINTEXT_LANGUAGE_ID, mime: Mimes.text }];
    }
    // 2.) Registered mappings have middle priority
    const registeredLanguage = getAssociationByPath(path, filename, nonUserRegisteredAssociations);
    if (registeredLanguage) {
        return [registeredLanguage, { id: PLAINTEXT_LANGUAGE_ID, mime: Mimes.text }];
    }
    // 3.) Firstline has lowest priority
    if (firstLine) {
        const firstlineLanguage = getAssociationByFirstline(firstLine);
        if (firstlineLanguage) {
            return [firstlineLanguage, { id: PLAINTEXT_LANGUAGE_ID, mime: Mimes.text }];
        }
    }
    return [{ id: 'unknown', mime: Mimes.unknown }];
}
function getAssociationByPath(path, filename, associations) {
    let filenameMatch = undefined;
    let patternMatch = undefined;
    let extensionMatch = undefined;
    // We want to prioritize associations based on the order they are registered so that the last registered
    // association wins over all other. This is for https://github.com/microsoft/vscode/issues/20074
    for (let i = associations.length - 1; i >= 0; i--) {
        const association = associations[i];
        // First exact name match
        if (filename === association.filenameLowercase) {
            filenameMatch = association;
            break; // take it!
        }
        // Longest pattern match
        if (association.filepattern) {
            if (!patternMatch || association.filepattern.length > patternMatch.filepattern.length) {
                const target = association.filepatternOnPath ? path : filename; // match on full path if pattern contains path separator
                if (association.filepatternLowercase?.(target)) {
                    patternMatch = association;
                }
            }
        }
        // Longest extension match
        if (association.extension) {
            if (!extensionMatch || association.extension.length > extensionMatch.extension.length) {
                if (filename.endsWith(association.extensionLowercase)) {
                    extensionMatch = association;
                }
            }
        }
    }
    // 1.) Exact name match has second highest priority
    if (filenameMatch) {
        return filenameMatch;
    }
    // 2.) Match on pattern
    if (patternMatch) {
        return patternMatch;
    }
    // 3.) Match on extension comes next
    if (extensionMatch) {
        return extensionMatch;
    }
    return undefined;
}
function getAssociationByFirstline(firstLine) {
    if (startsWithUTF8BOM(firstLine)) {
        firstLine = firstLine.substr(1);
    }
    if (firstLine.length > 0) {
        // We want to prioritize associations based on the order they are registered so that the last registered
        // association wins over all other. This is for https://github.com/microsoft/vscode/issues/20074
        for (let i = registeredAssociations.length - 1; i >= 0; i--) {
            const association = registeredAssociations[i];
            if (!association.firstline) {
                continue;
            }
            const matches = firstLine.match(association.firstline);
            if (matches && matches.length > 0) {
                return association;
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzQXNzb2NpYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvbGFuZ3VhZ2VzQXNzb2NpYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBaUIsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQW1CdEUsSUFBSSxzQkFBc0IsR0FBK0IsRUFBRSxDQUFDO0FBQzVELElBQUksNkJBQTZCLEdBQStCLEVBQUUsQ0FBQztBQUNuRSxJQUFJLDBCQUEwQixHQUErQixFQUFFLENBQUM7QUFFaEU7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxtQ0FBbUMsQ0FBQyxXQUFpQyxFQUFFLGVBQWUsR0FBRyxLQUFLO0lBQzdHLDRCQUE0QixDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDbkUsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUscUNBQXFDLENBQUMsV0FBaUM7SUFDdEYsNEJBQTRCLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRUQsU0FBUyw0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