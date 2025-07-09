/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs';
import * as perf from '../common/performance.js';
export async function resolveNLSConfiguration({ userLocale, osLocale, userDataPath, commit, nlsMetadataPath }) {
    perf.mark('code/willGenerateNls');
    if (process.env['VSCODE_DEV'] ||
        userLocale === 'pseudo' ||
        userLocale.startsWith('en') ||
        !commit ||
        !userDataPath) {
        return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
    }
    try {
        const languagePacks = await getLanguagePackConfigurations(userDataPath);
        if (!languagePacks) {
            return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
        }
        const resolvedLanguage = resolveLanguagePackLanguage(languagePacks, userLocale);
        if (!resolvedLanguage) {
            return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
        }
        const languagePack = languagePacks[resolvedLanguage];
        const mainLanguagePackPath = languagePack?.translations?.['vscode'];
        if (!languagePack ||
            typeof languagePack.hash !== 'string' ||
            !languagePack.translations ||
            typeof mainLanguagePackPath !== 'string' ||
            !(await exists(mainLanguagePackPath))) {
            return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
        }
        const languagePackId = `${languagePack.hash}.${resolvedLanguage}`;
        const globalLanguagePackCachePath = path.join(userDataPath, 'clp', languagePackId);
        const commitLanguagePackCachePath = path.join(globalLanguagePackCachePath, commit);
        const languagePackMessagesFile = path.join(commitLanguagePackCachePath, 'nls.messages.json');
        const translationsConfigFile = path.join(globalLanguagePackCachePath, 'tcf.json');
        const languagePackCorruptMarkerFile = path.join(globalLanguagePackCachePath, 'corrupted.info');
        if (await exists(languagePackCorruptMarkerFile)) {
            await fs.promises.rm(globalLanguagePackCachePath, { recursive: true, force: true, maxRetries: 3 }); // delete corrupted cache folder
        }
        const result = {
            userLocale,
            osLocale,
            resolvedLanguage,
            defaultMessagesFile: path.join(nlsMetadataPath, 'nls.messages.json'),
            languagePack: {
                translationsConfigFile,
                messagesFile: languagePackMessagesFile,
                corruptMarkerFile: languagePackCorruptMarkerFile
            },
            // NLS: below properties are a relic from old times only used by vscode-nls and deprecated
            locale: userLocale,
            availableLanguages: { '*': resolvedLanguage },
            _languagePackId: languagePackId,
            _languagePackSupport: true,
            _translationsConfigFile: translationsConfigFile,
            _cacheRoot: globalLanguagePackCachePath,
            _resolvedLanguagePackCoreLocation: commitLanguagePackCachePath,
            _corruptedFile: languagePackCorruptMarkerFile
        };
        if (await exists(commitLanguagePackCachePath)) {
            touch(commitLanguagePackCachePath).catch(() => { }); // We don't wait for this. No big harm if we can't touch
            perf.mark('code/didGenerateNls');
            return result;
        }
        const [, nlsDefaultKeys, nlsDefaultMessages, nlsPackdata] 
        //               ^moduleId ^nlsKeys                               ^moduleId      ^nlsKey ^nlsValue
        = await Promise.all([
            fs.promises.mkdir(commitLanguagePackCachePath, { recursive: true }),
            JSON.parse(await fs.promises.readFile(path.join(nlsMetadataPath, 'nls.keys.json'), 'utf-8')),
            JSON.parse(await fs.promises.readFile(path.join(nlsMetadataPath, 'nls.messages.json'), 'utf-8')),
            JSON.parse(await fs.promises.readFile(mainLanguagePackPath, 'utf-8'))
        ]);
        const nlsResult = [];
        // We expect NLS messages to be in a flat array in sorted order as they
        // where produced during build time. We use `nls.keys.json` to know the
        // right order and then lookup the related message from the translation.
        // If a translation does not exist, we fallback to the default message.
        let nlsIndex = 0;
        for (const [moduleId, nlsKeys] of nlsDefaultKeys) {
            const moduleTranslations = nlsPackdata.contents[moduleId];
            for (const nlsKey of nlsKeys) {
                nlsResult.push(moduleTranslations?.[nlsKey] || nlsDefaultMessages[nlsIndex]);
                nlsIndex++;
            }
        }
        await Promise.all([
            fs.promises.writeFile(languagePackMessagesFile, JSON.stringify(nlsResult), 'utf-8'),
            fs.promises.writeFile(translationsConfigFile, JSON.stringify(languagePack.translations), 'utf-8')
        ]);
        perf.mark('code/didGenerateNls');
        return result;
    }
    catch (error) {
        console.error('Generating translation files failed.', error);
    }
    return defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath);
}
/**
 * The `languagepacks.json` file is a JSON file that contains all metadata
 * about installed language extensions per language. Specifically, for
 * core (`vscode`) and all extensions it supports, it points to the related
 * translation files.
 *
 * The file is updated whenever a new language pack is installed or removed.
 */
async function getLanguagePackConfigurations(userDataPath) {
    const configFile = path.join(userDataPath, 'languagepacks.json');
    try {
        return JSON.parse(await fs.promises.readFile(configFile, 'utf-8'));
    }
    catch (err) {
        return undefined; // Do nothing. If we can't read the file we have no language pack config.
    }
}
function resolveLanguagePackLanguage(languagePacks, locale) {
    try {
        while (locale) {
            if (languagePacks[locale]) {
                return locale;
            }
            const index = locale.lastIndexOf('-');
            if (index > 0) {
                locale = locale.substring(0, index);
            }
            else {
                return undefined;
            }
        }
    }
    catch (error) {
        console.error('Resolving language pack configuration failed.', error);
    }
    return undefined;
}
function defaultNLSConfiguration(userLocale, osLocale, nlsMetadataPath) {
    perf.mark('code/didGenerateNls');
    return {
        userLocale,
        osLocale,
        resolvedLanguage: 'en',
        defaultMessagesFile: path.join(nlsMetadataPath, 'nls.messages.json'),
        // NLS: below 2 are a relic from old times only used by vscode-nls and deprecated
        locale: userLocale,
        availableLanguages: {}
    };
}
//#region fs helpers
async function exists(path) {
    try {
        await fs.promises.access(path);
        return true;
    }
    catch {
        return false;
    }
}
function touch(path) {
    const date = new Date();
    return fs.promises.utimes(path, date, date);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9ubHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSwwQkFBMEIsQ0FBQztBQWlDakQsTUFBTSxDQUFDLEtBQUssVUFBVSx1QkFBdUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQW1DO0lBQzdJLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUVsQyxJQUNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO1FBQ3pCLFVBQVUsS0FBSyxRQUFRO1FBQ3ZCLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQzNCLENBQUMsTUFBTTtRQUNQLENBQUMsWUFBWSxFQUNaLENBQUM7UUFDRixPQUFPLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELElBQUksQ0FBQztRQUNKLE1BQU0sYUFBYSxHQUFHLE1BQU0sNkJBQTZCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sdUJBQXVCLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRywyQkFBMkIsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkIs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