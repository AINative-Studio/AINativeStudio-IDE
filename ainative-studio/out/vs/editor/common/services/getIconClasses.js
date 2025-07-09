/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
import { DataUri } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { ThemeIcon } from '../../../base/common/themables.js';
const fileIconDirectoryRegex = /(?:\/|^)(?:([^\/]+)\/)?([^\/]+)$/;
export function getIconClasses(modelService, languageService, resource, fileKind, icon) {
    if (ThemeIcon.isThemeIcon(icon)) {
        return [`codicon-${icon.id}`, 'predefined-file-icon'];
    }
    if (URI.isUri(icon)) {
        return [];
    }
    // we always set these base classes even if we do not have a path
    const classes = fileKind === FileKind.ROOT_FOLDER ? ['rootfolder-icon'] : fileKind === FileKind.FOLDER ? ['folder-icon'] : ['file-icon'];
    if (resource) {
        // Get the path and name of the resource. For data-URIs, we need to parse specially
        let name;
        if (resource.scheme === Schemas.data) {
            const metadata = DataUri.parseMetaData(resource);
            name = metadata.get(DataUri.META_DATA_LABEL);
        }
        else {
            const match = resource.path.match(fileIconDirectoryRegex);
            if (match) {
                name = fileIconSelectorEscape(match[2].toLowerCase());
                if (match[1]) {
                    classes.push(`${fileIconSelectorEscape(match[1].toLowerCase())}-name-dir-icon`); // parent directory
                }
            }
            else {
                name = fileIconSelectorEscape(resource.authority.toLowerCase());
            }
        }
        // Root Folders
        if (fileKind === FileKind.ROOT_FOLDER) {
            classes.push(`${name}-root-name-folder-icon`);
        }
        // Folders
        else if (fileKind === FileKind.FOLDER) {
            classes.push(`${name}-name-folder-icon`);
        }
        // Files
        else {
            // Name & Extension(s)
            if (name) {
                classes.push(`${name}-name-file-icon`);
                classes.push(`name-file-icon`); // extra segment to increase file-name score
                // Avoid doing an explosive combination of extensions for very long filenames
                // (most file systems do not allow files > 255 length) with lots of `.` characters
                // https://github.com/microsoft/vscode/issues/116199
                if (name.length <= 255) {
                    const dotSegments = name.split('.');
                    for (let i = 1; i < dotSegments.length; i++) {
                        classes.push(`${dotSegments.slice(i).join('.')}-ext-file-icon`); // add each combination of all found extensions if more than one
                    }
                }
                classes.push(`ext-file-icon`); // extra segment to increase file-ext score
            }
            // Detected Mode
            const detectedLanguageId = detectLanguageId(modelService, languageService, resource);
            if (detectedLanguageId) {
                classes.push(`${fileIconSelectorEscape(detectedLanguageId)}-lang-file-icon`);
            }
        }
    }
    return classes;
}
export function getIconClassesForLanguageId(languageId) {
    return ['file-icon', `${fileIconSelectorEscape(languageId)}-lang-file-icon`];
}
function detectLanguageId(modelService, languageService, resource) {
    if (!resource) {
        return null; // we need a resource at least
    }
    let languageId = null;
    // Data URI: check for encoded metadata
    if (resource.scheme === Schemas.data) {
        const metadata = DataUri.parseMetaData(resource);
        const mime = metadata.get(DataUri.META_DATA_MIME);
        if (mime) {
            languageId = languageService.getLanguageIdByMimeType(mime);
        }
    }
    // Any other URI: check for model if existing
    else {
        const model = modelService.getModel(resource);
        if (model) {
            languageId = model.getLanguageId();
        }
    }
    // only take if the language id is specific (aka no just plain text)
    if (languageId && languageId !== PLAINTEXT_LANGUAGE_ID) {
        return languageId;
    }
    // otherwise fallback to path based detection
    return languageService.guessLanguageIdByFilepathOrFirstLine(resource);
}
export function fileIconSelectorEscape(str) {
    return str.replace(/[\s]/g, '/'); // HTML class names can not contain certain whitespace characters (https://dom.spec.whatwg.org/#interface-domtokenlist), use / instead, which doesn't exist in file names.
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0SWNvbkNsYXNzZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9nZXRJY29uQ2xhc3Nlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQWMsTUFBTSw2QkFBNkIsQ0FBQztBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUd0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlELE1BQU0sc0JBQXNCLEdBQUcsa0NBQWtDLENBQUM7QUFFbEUsTUFBTSxVQUFVLGNBQWMsQ0FBQyxZQUEyQixFQUFFLGVBQWlDLEVBQUUsUUFBeUIsRUFBRSxRQUFtQixFQUFFLElBQXNCO0lBQ3BLLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxXQUFXLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNyQixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxpRUFBaUU7SUFDakUsTUFBTSxPQUFPLEdBQUcsUUFBUSxLQUFLLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFB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