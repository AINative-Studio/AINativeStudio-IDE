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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVmFsaWRhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvblZhbGlkYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBRXhELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxLQUFLLE1BQU0sTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQXNCLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBeUI5RCxNQUFNLGNBQWMsR0FBRyxrREFBa0QsQ0FBQztBQUMxRSxNQUFNLGlCQUFpQixHQUFHLDBCQUEwQixDQUFDO0FBRXJELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxPQUFlO0lBQ2hELE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDekIsT0FBTyxDQUFDLE9BQU8sS0FBSyxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLE9BQWU7SUFDM0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDakMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUV6QixJQUFJLE9BQU8sS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNyQixP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