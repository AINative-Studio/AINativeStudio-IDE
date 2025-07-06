/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../base/common/codicons.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ThemeIcon } from '../../../base/common/themables.js';
export function createProfileSchemaEnums(detectedProfiles, extensionProfiles) {
    const result = [{
            name: null,
            description: localize('terminalAutomaticProfile', 'Automatically detect the default')
        }];
    result.push(...detectedProfiles.map(e => {
        return {
            name: e.profileName,
            description: createProfileDescription(e)
        };
    }));
    if (extensionProfiles) {
        result.push(...extensionProfiles.map(extensionProfile => {
            return {
                name: extensionProfile.title,
                description: createExtensionProfileDescription(extensionProfile)
            };
        }));
    }
    return {
        values: result.map(e => e.name),
        markdownDescriptions: result.map(e => e.description)
    };
}
function createProfileDescription(profile) {
    let description = `$(${ThemeIcon.isThemeIcon(profile.icon) ? profile.icon.id : profile.icon ? profile.icon : Codicon.terminal.id}) ${profile.profileName}\n- path: ${profile.path}`;
    if (profile.args) {
        if (typeof profile.args === 'string') {
            description += `\n- args: "${profile.args}"`;
        }
        else {
            description += `\n- args: [${profile.args.length === 0 ? '' : `'${profile.args.join(`','`)}'`}]`;
        }
    }
    if (profile.overrideName !== undefined) {
        description += `\n- overrideName: ${profile.overrideName}`;
    }
    if (profile.color) {
        description += `\n- color: ${profile.color}`;
    }
    if (profile.env) {
        description += `\n- env: ${JSON.stringify(profile.env)}`;
    }
    return description;
}
function createExtensionProfileDescription(profile) {
    const description = `$(${ThemeIcon.isThemeIcon(profile.icon) ? profile.icon.id : profile.icon ? profile.icon : Codicon.terminal.id}) ${profile.title}\n- extensionIdentifier: ${profile.extensionIdentifier}`;
    return description;
}
export function terminalProfileArgsMatch(args1, args2) {
    if (!args1 && !args2) {
        return true;
    }
    else if (typeof args1 === 'string' && typeof args2 === 'string') {
        return args1 === args2;
    }
    else if (Array.isArray(args1) && Array.isArray(args2)) {
        if (args1.length !== args2.length) {
            return false;
        }
        for (let i = 0; i < args1.length; i++) {
            if (args1[i] !== args2[i]) {
                return false;
            }
        }
        return true;
    }
    return false;
}
export function terminalIconsEqual(a, b) {
    if (!a && !b) {
        return true;
    }
    else if (!a || !b) {
        return false;
    }
    if (ThemeIcon.isThemeIcon(a) && ThemeIcon.isThemeIcon(b)) {
        return a.id === b.id && a.color === b.color;
    }
    if (typeof a === 'object' && 'light' in a && 'dark' in a
        && typeof b === 'object' && 'light' in b && 'dark' in b) {
        const castedA = a;
        const castedB = b;
        if ((URI.isUri(castedA.light) || isUriComponents(castedA.light)) && (URI.isUri(castedA.dark) || isUriComponents(castedA.dark))
            && (URI.isUri(castedB.light) || isUriComponents(castedB.light)) && (URI.isUri(castedB.dark) || isUriComponents(castedB.dark))) {
            return castedA.light.path === castedB.light.path && castedA.dark.path === castedB.dark.path;
        }
    }
    if ((URI.isUri(a) && URI.isUri(b)) || (isUriComponents(a) || isUriComponents(b))) {
        const castedA = a;
        const castedB = b;
        return castedA.path === castedB.path && castedA.scheme === castedB.scheme;
    }
    return false;
}
export function isUriComponents(thing) {
    if (!thing) {
        return false;
    }
    return typeof thing.path === 'string' &&
        typeof thing.scheme === 'string';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbFByb2ZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFOUQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLGdCQUFvQyxFQUFFLGlCQUF3RDtJQUl0SSxNQUFNLE1BQU0sR0FBbUQsQ0FBQztZQUMvRCxJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsa0NBQWtDLENBQUM7U0FDckYsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUN2QyxPQUFPO1lBQ04sSUFBSSxFQUFFLENBQUMsQ0FBQyxXQUFXO1lBQ25CLFdBQVcsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7U0FDeEMsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ3ZELE9BQU87Z0JBQ04sSUFBSSxFQUFFLGdCQUFnQixDQUFDLEtBQUs7Z0JBQzVCLFdBQVcsRUFBRSxpQ0FBaUMs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