/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqualOrParent, joinPath } from '../../../base/common/resources.js';
import Severity from '../../../base/common/severity.js';
import * as nls from '../../../nls.js';
import * as semver from '../../../base/common/semver/semver.js';
import { parseApiProposals } from './extensions.js';
import { allApiProposals } from './extensionsApiProposals.js';
const VERSION_REGEXP = /^(\^|>=)?((\d+)|x)\.((\d+)|x)\.((\d+)|x)(\-.*)?$/;
const NOT_BEFORE_REGEXP = /^-(\d{4})(\d{2})(\d{2})$/;
export function isValidVersionStr(version) {
    version = version.trim();
    return (version === '*' || VERSION_REGEXP.test(version));
}
export function parseVersion(version) {
    if (!isValidVersionStr(version)) {
        return null;
    }
    version = version.trim();
    if (version === '*') {
        return {
            hasCaret: false,
            hasGreaterEquals: false,
            majorBase: 0,
            majorMustEqual: false,
            minorBase: 0,
            minorMustEqual: false,
            patchBase: 0,
            patchMustEqual: false,
            preRelease: null
        };
    }
    const m = version.match(VERSION_REGEXP);
    if (!m) {
        return null;
    }
    return {
        hasCaret: m[1] === '^',
        hasGreaterEquals: m[1] === '>=',
        majorBase: m[2] === 'x' ? 0 : parseInt(m[2], 10),
        majorMustEqual: (m[2] === 'x' ? false : true),
        minorBase: m[4] === 'x' ? 0 : parseInt(m[4], 10),
        minorMustEqual: (m[4] === 'x' ? false : true),
        patchBase: m[6] === 'x' ? 0 : parseInt(m[6], 10),
        patchMustEqual: (m[6] === 'x' ? false : true),
        preRelease: m[8] || null
    };
}
export function normalizeVersion(version) {
    if (!version) {
        return null;
    }
    const majorBase = version.majorBase;
    const majorMustEqual = version.majorMustEqual;
    const minorBase = version.minorBase;
    let minorMustEqual = version.minorMustEqual;
    const patchBase = version.patchBase;
    let patchMustEqual = version.patchMustEqual;
    if (version.hasCaret) {
        if (majorBase === 0) {
            patchMustEqual = false;
        }
        else {
            minorMustEqual = false;
            patchMustEqual = false;
        }
    }
    let notBefore = 0;
    if (version.preRelease) {
        const match = NOT_BEFORE_REGEXP.exec(version.preRelease);
        if (match) {
            const [, year, month, day] = match;
            notBefore = Date.UTC(Number(year), Number(month) - 1, Number(day));
        }
    }
    return {
        majorBase: majorBase,
        majorMustEqual: majorMustEqual,
        minorBase: minorBase,
        minorMustEqual: minorMustEqual,
        patchBase: patchBase,
        patchMustEqual: patchMustEqual,
        isMinimum: version.hasGreaterEquals,
        notBefore,
    };
}
export function isValidVersion(_inputVersion, _inputDate, _desiredVersion) {
    let version;
    if (typeof _inputVersion === 'string') {
        version = normalizeVersion(parseVersion(_inputVersion));
    }
    else {
        version = _inputVersion;
    }
    let productTs;
    if (_inputDate instanceof Date) {
        productTs = _inputDate.getTime();
    }
    else if (typeof _inputDate === 'string') {
        productTs = new Date(_inputDate).getTime();
    }
    let desiredVersion;
    if (typeof _desiredVersion === 'string') {
        desiredVersion = normalizeVersion(parseVersion(_desiredVersion));
    }
    else {
        desiredVersion = _desiredVersion;
    }
    if (!version || !desiredVersion) {
        return false;
    }
    const majorBase = version.majorBase;
    const minorBase = version.minorBase;
    const patchBase = version.patchBase;
    let desiredMajorBase = desiredVersion.majorBase;
    let desiredMinorBase = desiredVersion.minorBase;
    let desiredPatchBase = desiredVersion.patchBase;
    const desiredNotBefore = desiredVersion.notBefore;
    let majorMustEqual = desiredVersion.majorMustEqual;
    let minorMustEqual = desiredVersion.minorMustEqual;
    let patchMustEqual = desiredVersion.patchMustEqual;
    if (desiredVersion.isMinimum) {
        if (majorBase > desiredMajorBase) {
            return true;
        }
        if (majorBase < desiredMajorBase) {
            return false;
        }
        if (minorBase > desiredMinorBase) {
            return true;
        }
        if (minorBase < desiredMinorBase) {
            return false;
        }
        if (productTs && productTs < desiredNotBefore) {
            return false;
        }
        return patchBase >= desiredPatchBase;
    }
    // Anything < 1.0.0 is compatible with >= 1.0.0, except exact matches
    if (majorBase === 1 && desiredMajorBase === 0 && (!majorMustEqual || !minorMustEqual || !patchMustEqual)) {
        desiredMajorBase = 1;
        desiredMinorBase = 0;
        desiredPatchBase = 0;
        majorMustEqual = true;
        minorMustEqual = false;
        patchMustEqual = false;
    }
    if (majorBase < desiredMajorBase) {
        // smaller major version
        return false;
    }
    if (majorBase > desiredMajorBase) {
        // higher major version
        return (!majorMustEqual);
    }
    // at this point, majorBase are equal
    if (minorBase < desiredMinorBase) {
        // smaller minor version
        return false;
    }
    if (minorBase > desiredMinorBase) {
        // higher minor version
        return (!minorMustEqual);
    }
    // at this point, minorBase are equal
    if (patchBase < desiredPatchBase) {
        // smaller patch version
        return false;
    }
    if (patchBase > desiredPatchBase) {
        // higher patch version
        return (!patchMustEqual);
    }
    // at this point, patchBase are equal
    if (productTs && productTs < desiredNotBefore) {
        return false;
    }
    return true;
}
export function validateExtensionManifest(productVersion, productDate, extensionLocation, extensionManifest, extensionIsBuiltin, validateApiVersion) {
    const validations = [];
    if (typeof extensionManifest.publisher !== 'undefined' && typeof extensionManifest.publisher !== 'string') {
        validations.push([Severity.Error, nls.localize('extensionDescription.publisher', "property publisher must be of type `string`.")]);
        return validations;
    }
    if (typeof extensionManifest.name !== 'string') {
        validations.push([Severity.Error, nls.localize('extensionDescription.name', "property `{0}` is mandatory and must be of type `string`", 'name')]);
        return validations;
    }
    if (typeof extensionManifest.version !== 'string') {
        validations.push([Severity.Error, nls.localize('extensionDescription.version', "property `{0}` is mandatory and must be of type `string`", 'version')]);
        return validations;
    }
    if (!extensionManifest.engines) {
        validations.push([Severity.Error, nls.localize('extensionDescription.engines', "property `{0}` is mandatory and must be of type `object`", 'engines')]);
        return validations;
    }
    if (typeof extensionManifest.engines.vscode !== 'string') {
        validations.push([Severity.Error, nls.localize('extensionDescription.engines.vscode', "property `{0}` is mandatory and must be of type `string`", 'engines.vscode')]);
        return validations;
    }
    if (typeof extensionManifest.extensionDependencies !== 'undefined') {
        if (!isStringArray(extensionManifest.extensionDependencies)) {
            validations.push([Severity.Error, nls.localize('extensionDescription.extensionDependencies', "property `{0}` can be omitted or must be of type `string[]`", 'extensionDependencies')]);
            return validations;
        }
    }
    if (typeof extensionManifest.activationEvents !== 'undefined') {
        if (!isStringArray(extensionManifest.activationEvents)) {
            validations.push([Severity.Error, nls.localize('extensionDescription.activationEvents1', "property `{0}` can be omitted or must be of type `string[]`", 'activationEvents')]);
            return validations;
        }
        if (typeof extensionManifest.main === 'undefined' && typeof extensionManifest.browser === 'undefined') {
            validations.push([Severity.Error, nls.localize('extensionDescription.activationEvents2', "property `{0}` should be omitted if the extension doesn't have a `{1}` or `{2}` property.", 'activationEvents', 'main', 'browser')]);
            return validations;
        }
    }
    if (typeof extensionManifest.extensionKind !== 'undefined') {
        if (typeof extensionManifest.main === 'undefined') {
            validations.push([Severity.Warning, nls.localize('extensionDescription.extensionKind', "property `{0}` can be defined only if property `main` is also defined.", 'extensionKind')]);
            // not a failure case
        }
    }
    if (typeof extensionManifest.main !== 'undefined') {
        if (typeof extensionManifest.main !== 'string') {
            validations.push([Severity.Error, nls.localize('extensionDescription.main1', "property `{0}` can be omitted or must be of type `string`", 'main')]);
            return validations;
        }
        else {
            const mainLocation = joinPath(extensionLocation, extensionManifest.main);
            if (!isEqualOrParent(mainLocation, extensionLocation)) {
                validations.push([Severity.Warning, nls.localize('extensionDescription.main2', "Expected `main` ({0}) to be included inside extension's folder ({1}). This might make the extension non-portable.", mainLocation.path, extensionLocation.path)]);
                // not a failure case
            }
        }
    }
    if (typeof extensionManifest.browser !== 'undefined') {
        if (typeof extensionManifest.browser !== 'string') {
            validations.push([Severity.Error, nls.localize('extensionDescription.browser1', "property `{0}` can be omitted or must be of type `string`", 'browser')]);
            return validations;
        }
        else {
            const browserLocation = joinPath(extensionLocation, extensionManifest.browser);
            if (!isEqualOrParent(browserLocation, extensionLocation)) {
                validations.push([Severity.Warning, nls.localize('extensionDescription.browser2', "Expected `browser` ({0}) to be included inside extension's folder ({1}). This might make the extension non-portable.", browserLocation.path, extensionLocation.path)]);
                // not a failure case
            }
        }
    }
    if (!semver.valid(extensionManifest.version)) {
        validations.push([Severity.Error, nls.localize('notSemver', "Extension version is not semver compatible.")]);
        return validations;
    }
    const notices = [];
    const validExtensionVersion = isValidExtensionVersion(productVersion, productDate, extensionManifest, extensionIsBuiltin, notices);
    if (!validExtensionVersion) {
        for (const notice of notices) {
            validations.push([Severity.Error, notice]);
        }
    }
    if (validateApiVersion && extensionManifest.enabledApiProposals?.length) {
        const incompatibleNotices = [];
        if (!areApiProposalsCompatible([...extensionManifest.enabledApiProposals], incompatibleNotices)) {
            for (const notice of incompatibleNotices) {
                validations.push([Severity.Error, notice]);
            }
        }
    }
    return validations;
}
export function isValidExtensionVersion(productVersion, productDate, extensionManifest, extensionIsBuiltin, notices) {
    if (extensionIsBuiltin || (typeof extensionManifest.main === 'undefined' && typeof extensionManifest.browser === 'undefined')) {
        // No version check for builtin or declarative extensions
        return true;
    }
    return isVersionValid(productVersion, productDate, extensionManifest.engines.vscode, notices);
}
export function isEngineValid(engine, version, date) {
    // TODO@joao: discuss with alex '*' doesn't seem to be a valid engine version
    return engine === '*' || isVersionValid(version, date, engine);
}
export function areApiProposalsCompatible(apiProposals, arg1) {
    if (apiProposals.length === 0) {
        return true;
    }
    const notices = Array.isArray(arg1) ? arg1 : undefined;
    const productApiProposals = (notices ? undefined : arg1) ?? allApiProposals;
    const incompatibleProposals = [];
    const parsedProposals = parseApiProposals(apiProposals);
    for (const { proposalName, version } of parsedProposals) {
        if (!version) {
            continue;
        }
        const existingProposal = productApiProposals[proposalName];
        if (existingProposal?.version !== version) {
            incompatibleProposals.push(proposalName);
        }
    }
    if (incompatibleProposals.length) {
        if (notices) {
            if (incompatibleProposals.length === 1) {
                notices.push(nls.localize('apiProposalMismatch1', "This extension is using the API proposal '{0}' that is not compatible with the current version of VS Code.", incompatibleProposals[0]));
            }
            else {
                notices.push(nls.localize('apiProposalMismatch2', "This extension is using the API proposals {0} and '{1}' that are not compatible with the current version of VS Code.", incompatibleProposals.slice(0, incompatibleProposals.length - 1).map(p => `'${p}'`).join(', '), incompatibleProposals[incompatibleProposals.length - 1]));
            }
        }
        return false;
    }
    return true;
}
function isVersionValid(currentVersion, date, requestedVersion, notices = []) {
    const desiredVersion = normalizeVersion(parseVersion(requestedVersion));
    if (!desiredVersion) {
        notices.push(nls.localize('versionSyntax', "Could not parse `engines.vscode` value {0}. Please use, for example: ^1.22.0, ^1.22.x, etc.", requestedVersion));
        return false;
    }
    // enforce that a breaking API version is specified.
    // for 0.X.Y, that means up to 0.X must be specified
    // otherwise for Z.X.Y, that means Z must be specified
    if (desiredVersion.majorBase === 0) {
        // force that major and minor must be specific
        if (!desiredVersion.majorMustEqual || !desiredVersion.minorMustEqual) {
            notices.push(nls.localize('versionSpecificity1', "Version specified in `engines.vscode` ({0}) is not specific enough. For vscode versions before 1.0.0, please define at a minimum the major and minor desired version. E.g. ^0.10.0, 0.10.x, 0.11.0, etc.", requestedVersion));
            return false;
        }
    }
    else {
        // force that major must be specific
        if (!desiredVersion.majorMustEqual) {
            notices.push(nls.localize('versionSpecificity2', "Version specified in `engines.vscode` ({0}) is not specific enough. For vscode versions after 1.0.0, please define at a minimum the major desired version. E.g. ^1.10.0, 1.10.x, 1.x.x, 2.x.x, etc.", requestedVersion));
            return false;
        }
    }
    if (!isValidVersion(currentVersion, date, desiredVersion)) {
        notices.push(nls.localize('versionMismatch', "Extension is not compatible with Code {0}. Extension requires: {1}.", currentVersion, requestedVersion));
        return false;
    }
    return true;
}
function isStringArray(arr) {
    if (!Array.isArray(arr)) {
        return false;
    }
    for (let i = 0, len = arr.length; i < len; i++) {
        if (typeof arr[i] !== 'string') {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVmFsaWRhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uVmFsaWRhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFFeEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEtBQUssTUFBTSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBc0IsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUF5QjlELE1BQU0sY0FBYyxHQUFHLGtEQUFrRCxDQUFDO0FBQzFFLE1BQU0saUJBQWlCLEdBQUcsMEJBQTBCLENBQUM7QUFFckQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLE9BQWU7SUFDaEQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN6QixPQUFPLENBQUMsT0FBTyxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZLENBQUMsT0FBZTtJQUMzQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBRXpCLElBQUksT0FBTyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLE9BQU87WUFDTixRQUFRLEVBQUUsS0FBSztZQUNmLGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsU0FBUyxFQUFFLENBQUM7WUFDWixjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUUsQ0FBQztZQUNaLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRSxDQUFDO1lBQ1osY0FBYyxFQUFFLEtBQUs7WUFDckIsVUFBVSxFQUFFLElBQUk7U0FDaEIsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3hDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNSLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELE9BQU87UUFDTixRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7UUFDdEIsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUk7UUFDL0IsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDaEQsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDN0MsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDaEQsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDN0MsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDaEQsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDN0MsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJO0tBQ3hCLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLE9BQThCO0lBQzlELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNkLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7SUFDcEMsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQztJQUM5QyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO0lBQ3BDLElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUM7SUFDNUMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUNwQyxJQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDO0lBRTVDLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RCLElBQUksU0FBUyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JCLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFDeEIsQ0FBQzthQUFNLENBQUM7WUFDUCxjQUFjLEdBQUcsS0FBSyxDQUFDO1lBQ3ZCLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFDeEIsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDbEIsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDeEIsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6RCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDbkMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDcEUsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sU0FBUyxFQUFFLFNBQVM7UUFDcEIsY0FBYyxFQUFFLGNBQWM7UUFDOUIsU0FBUyxFQUFFLFNBQVM7UUFDcEIsY0FBYyxFQUFFLGNBQWM7UUFDOUIsU0FBUyxFQUFFLFNBQVM7UUFDcEIsY0FBYyxFQUFFLGNBQWM7UUFDOUIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0I7UUFDbkMsU0FBUztLQUNULENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxhQUEwQyxFQUFFLFVBQXVCLEVBQUUsZUFBNEM7SUFDL0ksSUFBSSxPQUFrQyxDQUFDO0lBQ3ZDLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDdkMsT0FBTyxHQUFHLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ3pELENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxHQUFHLGFBQWEsQ0FBQztJQUN6QixDQUFDO0lBRUQsSUFBSSxTQUE2QixDQUFDO0lBQ2xDLElBQUksVUFBVSxZQUFZLElBQUksRUFBRSxDQUFDO1FBQ2hDLFNBQVMsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbEMsQ0FBQztTQUFNLElBQUksT0FBTyxVQUFVLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDM0MsU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVDLENBQUM7SUFFRCxJQUFJLGNBQXlDLENBQUM7SUFDOUMsSUFBSSxPQUFPLGVBQWUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN6QyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDbEUsQ0FBQztTQUFNLENBQUM7UUFDUCxjQUFjLEdBQUcsZUFBZSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDakMsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUNwQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO0lBQ3BDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7SUFFcEMsSUFBSSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO0lBQ2hELElBQUksZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQztJQUNoRCxJQUFJLGdCQUFnQixHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUM7SUFDaEQsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO0lBRWxELElBQUksY0FBYyxHQUFHLGNBQWMsQ0FBQyxjQUFjLENBQUM7SUFDbkQsSUFBSSxjQUFjLEdBQUcsY0FBYyxDQUFDLGNBQWMsQ0FBQztJQUNuRCxJQUFJLGNBQWMsR0FBRyxjQUFjLENBQUMsY0FBYyxDQUFDO0lBRW5ELElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzlCLElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxTQUFTLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztZQUNsQyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7WUFDbEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxTQUFTLElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7WUFDL0MsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxTQUFTLElBQUksZ0JBQWdCLENBQUM7SUFDdEMsQ0FBQztJQUVELHFFQUFxRTtJQUNyRSxJQUFJLFNBQVMsS0FBSyxDQUFDLElBQUksZ0JBQWdCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1FBQzFHLGdCQUFnQixHQUFHLENBQUMsQ0FBQztRQUNyQixnQkFBZ0IsR0FBRyxDQUFDLENBQUM7UUFDckIsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFDdEIsY0FBYyxHQUFHLEtBQUssQ0FBQztRQUN2QixjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2xDLHdCQUF3QjtRQUN4QixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2xDLHVCQUF1QjtRQUN2QixPQUFPLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRUQscUNBQXFDO0lBRXJDLElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7UUFDbEMsd0JBQXdCO1FBQ3hCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELElBQUksU0FBUyxHQUFHLGdCQUFnQixFQUFFLENBQUM7UUFDbEMsdUJBQXVCO1FBQ3ZCLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFRCxxQ0FBcUM7SUFFckMsSUFBSSxTQUFTLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNsQyx3QkFBd0I7UUFDeEIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSSxTQUFTLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNsQyx1QkFBdUI7UUFDdkIsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELHFDQUFxQztJQUVyQyxJQUFJLFNBQVMsSUFBSSxTQUFTLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUMvQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFJRCxNQUFNLFVBQVUseUJBQXlCLENBQUMsY0FBc0IsRUFBRSxXQUF3QixFQUFFLGlCQUFzQixFQUFFLGlCQUFxQyxFQUFFLGtCQUEyQixFQUFFLGtCQUEyQjtJQUNsTixNQUFNLFdBQVcsR0FBeUIsRUFBRSxDQUFDO0lBQzdDLElBQUksT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLEtBQUssV0FBVyxJQUFJLE9BQU8saUJBQWlCLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzNHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsOENBQThDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkksT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQUksT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDaEQsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwwREFBMEQsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEosT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQUksT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbkQsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSwwREFBMEQsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEosT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLDBEQUEwRCxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4SixPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBQ0QsSUFBSSxPQUFPLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDMUQsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSwwREFBMEQsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0SyxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBQ0QsSUFBSSxPQUFPLGlCQUFpQixDQUFDLHFCQUFxQixLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQ3BFLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO1lBQzdELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNENBQTRDLEVBQUUsNkRBQTZELEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkwsT0FBTyxXQUFXLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFDRCxJQUFJLE9BQU8saUJBQWlCLENBQUMsZ0JBQWdCLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDL0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDeEQsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSw2REFBNkQsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5SyxPQUFPLFdBQVcsQ0FBQztRQUNwQixDQUFDO1FBQ0QsSUFBSSxPQUFPLGlCQUFpQixDQUFDLElBQUksS0FBSyxXQUFXLElBQUksT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDdkcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSwyRkFBMkYsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9OLE9BQU8sV0FBVyxDQUFDO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBQ0QsSUFBSSxPQUFPLGlCQUFpQixDQUFDLGFBQWEsS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUM1RCxJQUFJLE9BQU8saUJBQWlCLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ25ELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsd0VBQXdFLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BMLHFCQUFxQjtRQUN0QixDQUFDO0lBQ0YsQ0FBQztJQUNELElBQUksT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDbkQsSUFBSSxPQUFPLGlCQUFpQixDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDJEQUEyRCxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwSixPQUFPLFdBQVcsQ0FBQztRQUNwQixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6RSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsbUhBQW1ILEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pQLHFCQUFxQjtZQUN0QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxJQUFJLE9BQU8saUJBQWlCLENBQUMsT0FBTyxLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQ3RELElBQUksT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbkQsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSwyREFBMkQsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUosT0FBTyxXQUFXLENBQUM7UUFDcEIsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0UsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxDQUFDO2dCQUMxRCxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLHNIQUFzSCxFQUFFLGVBQWUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxUCxxQkFBcUI7WUFDdEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUM5QyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RyxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO0lBQzdCLE1BQU0scUJBQXFCLEdBQUcsdUJBQXVCLENBQUMsY0FBYyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNuSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUM1QixLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLGtCQUFrQixJQUFJLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQ3pFLE1BQU0sbUJBQW1CLEdBQWEsRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7WUFDakcsS0FBSyxNQUFNLE1BQU0sSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUMxQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sV0FBVyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsY0FBc0IsRUFBRSxXQUF3QixFQUFFLGlCQUFxQyxFQUFFLGtCQUEyQixFQUFFLE9BQWlCO0lBRTlLLElBQUksa0JBQWtCLElBQUksQ0FBQyxPQUFPLGlCQUFpQixDQUFDLElBQUksS0FBSyxXQUFXLElBQUksT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLEtBQUssV0FBVyxDQUFDLEVBQUUsQ0FBQztRQUMvSCx5REFBeUQ7UUFDekQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsT0FBTyxjQUFjLENBQUMsY0FBYyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQy9GLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLE1BQWMsRUFBRSxPQUFlLEVBQUUsSUFBaUI7SUFDL0UsNkVBQTZFO0lBQzdFLE9BQU8sTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNoRSxDQUFDO0FBS0QsTUFBTSxVQUFVLHlCQUF5QixDQUFDLFlBQXNCLEVBQUUsSUFBVTtJQUMzRSxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDL0IsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsTUFBTSxPQUFPLEdBQXlCLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQzdFLE1BQU0sbUJBQW1CLEdBQTJGLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLGVBQWUsQ0FBQztJQUNwSyxNQUFNLHFCQUFxQixHQUFhLEVBQUUsQ0FBQztJQUMzQyxNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4RCxLQUFLLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLElBQUksZUFBZSxFQUFFLENBQUM7UUFDekQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsU0FBUztRQUNWLENBQUM7UUFDRCxNQUFNLGdCQUFnQixHQUFHLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzNELElBQUksZ0JBQWdCLEVBQUUsT0FBTyxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQzNDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0YsQ0FBQztJQUNELElBQUkscUJBQXFCLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbEMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUkscUJBQXFCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsNEdBQTRHLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVMLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsc0hBQXNILEVBQ3ZLLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUscUJBQXFCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQzlGLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUQsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxjQUFzQixFQUFFLElBQWlCLEVBQUUsZ0JBQXdCLEVBQUUsVUFBb0IsRUFBRTtJQUVsSCxNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNyQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLDZGQUE2RixFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUM3SixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxvREFBb0Q7SUFDcEQsb0RBQW9EO0lBQ3BELHNEQUFzRDtJQUN0RCxJQUFJLGNBQWMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDcEMsOENBQThDO1FBQzlDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3RFLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSwwTUFBME0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDaFIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUscU1BQXFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1lBQzNRLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQztRQUMzRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUscUVBQXFFLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUN2SixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxHQUFhO0lBQ25DLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDekIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ2hELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyJ9