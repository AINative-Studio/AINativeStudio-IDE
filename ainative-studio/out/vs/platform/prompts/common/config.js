/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../contextkey/common/contextkey.js';
import { CONFIG_KEY, DEFAULT_SOURCE_FOLDER, LOCATIONS_CONFIG_KEY } from './constants.js';
/**
 * Configuration helper for the `reusable prompts` feature.
 * @see {@link CONFIG_KEY} and {@link LOCATIONS_CONFIG_KEY}.
 *
 * ### Functions
 *
 * - {@link enabled} allows to check if the feature is enabled
 * - {@link getLocationsValue} allows to current read configuration value
 * - {@link promptSourceFolders} gets list of source folders for prompt files
 *
 * ### File Paths Resolution
 *
 * We resolve only `*.prompt.md` files inside the resulting source folders. Relative paths are resolved
 * relative to:
 *
 * - the current workspace `root`, if applicable, in other words one of the workspace folders
 *   can be used as a prompt files source folder
 * - root of each top-level folder in the workspace (if there are multiple workspace folders)
 * - current root folder (if a single folder is open)
 */
export var PromptsConfig;
(function (PromptsConfig) {
    PromptsConfig.KEY = CONFIG_KEY;
    PromptsConfig.LOCATIONS_KEY = LOCATIONS_CONFIG_KEY;
    /**
     * Checks if the feature is enabled.
     * @see {@link CONFIG_KEY}.
     */
    PromptsConfig.enabled = (configService) => {
        const enabledValue = configService.getValue(CONFIG_KEY);
        return asBoolean(enabledValue) ?? false;
    };
    /**
     * Context key expression for the `reusable prompts` feature `enabled` status.
     */
    PromptsConfig.enabledCtx = ContextKeyExpr.equals(`config.${CONFIG_KEY}`, true);
    /**
     * Get value of the `reusable prompt locations` configuration setting.
     * @see {@link LOCATIONS_CONFIG_KEY}.
     */
    PromptsConfig.getLocationsValue = (configService) => {
        const configValue = configService.getValue(LOCATIONS_CONFIG_KEY);
        if (configValue === undefined || configValue === null || Array.isArray(configValue)) {
            return undefined;
        }
        // note! this would be also true for `null` and `array`,
        // 		 but those cases are already handled above
        if (typeof configValue === 'object') {
            const paths = {};
            for (const [path, value] of Object.entries(configValue)) {
                const cleanPath = path.trim();
                const booleanValue = asBoolean(value);
                // if value can be mapped to a boolean, and the clean
                // path is not empty, add it to the map
                if ((booleanValue !== undefined) && cleanPath) {
                    paths[cleanPath] = booleanValue;
                }
            }
            return paths;
        }
        return undefined;
    };
    /**
     * Gets list of source folders for prompt files.
     * Defaults to {@link DEFAULT_SOURCE_FOLDER}.
     */
    PromptsConfig.promptSourceFolders = (configService) => {
        const value = PromptsConfig.getLocationsValue(configService);
        // note! the `value &&` part handles the `undefined`, `null`, and `false` cases
        if (value && (typeof value === 'object')) {
            const paths = [];
            // if the default source folder is not explicitly disabled, add it
            if (value[DEFAULT_SOURCE_FOLDER] !== false) {
                paths.push(DEFAULT_SOURCE_FOLDER);
            }
            // copy all the enabled paths to the result list
            for (const [path, enabled] of Object.entries(value)) {
                // we already added the default source folder, so skip it
                if ((enabled === false) || (path === DEFAULT_SOURCE_FOLDER)) {
                    continue;
                }
                paths.push(path);
            }
            return paths;
        }
        // `undefined`, `null`, and `false` cases
        return [];
    };
})(PromptsConfig || (PromptsConfig = {}));
/**
 * Helper to parse an input value of `any` type into a boolean.
 *
 * @param value - input value to parse
 * @returns `true` if the value is the boolean `true` value or a string that can
 * 			be clearly mapped to a boolean (e.g., `"true"`, `"TRUE"`, `"FaLSe"`, etc.),
 * 			`undefined` for rest of the values
 */
function asBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const cleanValue = value.trim().toLowerCase();
        if (cleanValue === 'true') {
            return true;
        }
        if (cleanValue === 'false') {
            return false;
        }
        return undefined;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb21wdHMvY29tbW9uL2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRXpGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHO0FBQ0gsTUFBTSxLQUFXLGFBQWEsQ0EwRjdCO0FBMUZELFdBQWlCLGFBQWE7SUFDaEIsaUJBQUcsR0FBRyxVQUFVLENBQUM7SUFDakIsMkJBQWEsR0FBRyxvQkFBb0IsQ0FBQztJQUVsRDs7O09BR0c7SUFDVSxxQkFBTyxHQUFHLENBQ3RCLGFBQW9DLEVBQzFCLEVBQUU7UUFDWixNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhELE9BQU8sU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQztJQUN6QyxDQUFDLENBQUM7SUFFRjs7T0FFRztJQUNVLHdCQUFVLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxVQUFVLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRTlFOzs7T0FHRztJQUNVLCtCQUFpQixHQUFHLENBQ2hDLGFBQW9DLEVBQ0UsRUFBRTtRQUN4QyxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFakUsSUFBSSxXQUFXLEtBQUssU0FBUyxJQUFJLFdBQVcsS0FBSyxJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3JGLE9B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