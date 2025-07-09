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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vdGVybWluYWxQcm9maWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFM0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxnQkFBb0MsRUFBRSxpQkFBd0Q7SUFJdEksTUFBTSxNQUFNLEdBQW1ELENBQUM7WUFDL0QsSUFBSSxFQUFFLElBQUk7WUFDVixXQUFXLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGtDQUFrQyxDQUFDO1NBQ3JGLENBQUMsQ0FBQztJQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDdkMsT0FBTztZQUNOLElBQUksRUFBRSxDQUFDLENBQUMsV0FBVztZQUNuQixXQUFXLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1NBQ3hDLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0osSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUN2RCxPQUFPO2dCQUNOLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLO2dCQUM1QixXQUFXLEVBQUUsaUNBQWlDLENBQUMsZ0JBQWdCLENBQUM7YUFDaEUsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ0QsT0FBTztRQUNOLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUMvQixvQkFBb0IsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztLQUNwRCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsT0FBeUI7SUFDMUQsSUFBSSxXQUFXLEdBQUcsS0FBSyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxXQUFXLGFBQWEsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3BMLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xCLElBQUksT0FBTyxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLFdBQVcsSUFBSSxjQUFjLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQztRQUM5QyxDQUFDO2FBQU0sQ0FBQztZQUNQLFdBQVcsSUFBSSxjQUFjLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUNsRyxDQUFDO0lBQ0YsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN4QyxXQUFXLElBQUkscUJBQXFCLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUM1RCxDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbkIsV0FBVyxJQUFJLGNBQWMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzlDLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNqQixXQUFXLElBQUksWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0lBQzFELENBQUM7SUFDRCxPQUFPLFdBQVcsQ0FBQztBQUNwQixDQUFDO0FBRUQsU0FBUyxpQ0FBaUMsQ0FBQyxPQUFrQztJQUM1RSxNQUFNLFdBQVcsR0FBRyxLQUFLLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssT0FBTyxDQUFDLEtBQUssNEJBQTRCLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzlNLE9BQU8sV0FBVyxDQUFDO0FBQ3BCLENBQUM7QUFHRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBb0MsRUFBRSxLQUFvQztJQUNsSCxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO1NBQU0sSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbkUsT0FBTyxLQUFLLEtBQUssS0FBSyxDQUFDO0lBQ3hCLENBQUM7U0FBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3pELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2QyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxDQUFnQixFQUFFLENBQWdCO0lBQ3BFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztTQUFNLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNyQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzFELE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUM3QyxDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxNQUFNLElBQUksQ0FBQztXQUNwRCxPQUFPLENBQUMsS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDMUQsTUFBTSxPQUFPLEdBQUksQ0FBdUMsQ0FBQztRQUN6RCxNQUFNLE9BQU8sR0FBSSxDQUF1QyxDQUFDO1FBQ3pELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2VBQzFILENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDaEksT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUM3RixDQUFDO0lBQ0YsQ0FBQztJQUNELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2xGLE1BQU0sT0FBTyxHQUFJLENBQXdDLENBQUM7UUFDMUQsTUFBTSxPQUFPLEdBQUksQ0FBd0MsQ0FBQztRQUMxRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDM0UsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUdELE1BQU0sVUFBVSxlQUFlLENBQUMsS0FBYztJQUM3QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLE9BQWEsS0FBTSxDQUFDLElBQUksS0FBSyxRQUFRO1FBQzNDLE9BQWEsS0FBTSxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUM7QUFDMUMsQ0FBQyJ9