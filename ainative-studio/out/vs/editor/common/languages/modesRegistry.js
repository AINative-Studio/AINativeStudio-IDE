/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { Emitter } from '../../../base/common/event.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { Mimes } from '../../../base/common/mime.js';
import { Extensions as ConfigurationExtensions } from '../../../platform/configuration/common/configurationRegistry.js';
// Define extension point ids
export const Extensions = {
    ModesRegistry: 'editor.modesRegistry'
};
export class EditorModesRegistry {
    constructor() {
        this._onDidChangeLanguages = new Emitter();
        this.onDidChangeLanguages = this._onDidChangeLanguages.event;
        this._languages = [];
    }
    registerLanguage(def) {
        this._languages.push(def);
        this._onDidChangeLanguages.fire(undefined);
        return {
            dispose: () => {
                for (let i = 0, len = this._languages.length; i < len; i++) {
                    if (this._languages[i] === def) {
                        this._languages.splice(i, 1);
                        return;
                    }
                }
            }
        };
    }
    getLanguages() {
        return this._languages;
    }
}
export const ModesRegistry = new EditorModesRegistry();
Registry.add(Extensions.ModesRegistry, ModesRegistry);
export const PLAINTEXT_LANGUAGE_ID = 'plaintext';
export const PLAINTEXT_EXTENSION = '.txt';
ModesRegistry.registerLanguage({
    id: PLAINTEXT_LANGUAGE_ID,
    extensions: [PLAINTEXT_EXTENSION],
    aliases: [nls.localize('plainText.alias', "Plain Text"), 'text'],
    mimetypes: [Mimes.text]
});
Registry.as(ConfigurationExtensions.Configuration)
    .registerDefaultConfigurations([{
        overrides: {
            '[plaintext]': {
                'editor.unicodeHighlight.ambiguousCharacters': false,
                'editor.unicodeHighlight.invisibleCharacters': false
            },
            // TODO: Below is a workaround for: https://github.com/microsoft/vscode/issues/240567
            '[go]': {
                'editor.insertSpaces': false
            },
            '[makefile]': {
                'editor.insertSpaces': false,
            },
            '[shellscript]': {
                'files.eol': '\n'
            },
            '[yaml]': {
                'editor.insertSpaces': true,
                'editor.tabSize': 2
            }
        }
    }]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZXNSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9tb2Rlc1JlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUVoSiw2QkFBNkI7QUFDN0IsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHO0lBQ3pCLGFBQWEsRUFBRSxzQkFBc0I7Q0FDckMsQ0FBQztBQUVGLE1BQU0sT0FBTyxtQkFBbUI7SUFPL0I7UUFIaUIsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUM3Qyx5QkFBb0IsR0FBZ0IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztRQUdwRixJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRU0sZ0JBQWdCLENBQUMsR0FBNEI7UUFDbkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQyxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM1RCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDN0IsT0FBTztvQkFDUixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFTSxZQUFZO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0FBQ3ZELFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztBQUV0RCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxXQUFXLENBQUM7QUFDakQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDO0FBRTFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQztJQUM5QixFQUFFLEVBQUUscUJBQXFCO0lBQ3pCLFVBQVUsRUFBRSxDQUFDLG1CQUFtQixDQUFDO0lBQ2pDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLEVBQUUsTUFBTSxDQUFDO0lBQ2hFLFNBQVMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7Q0FDdkIsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDO0tBQ3hFLDZCQUE2QixDQUFDLENBQUM7UUFDL0IsU0FBUyxFQUFFO1lBQ1YsYUFBYSxFQUFFO2dCQUNkLDZDQUE2QyxFQUFFLEtBQUs7Z0JBQ3BELDZDQUE2QyxFQUFFLEtBQUs7YUFDcEQ7WUFDRCxxRkFBcUY7WUFDckYsTUFBTSxFQUFFO2dCQUNQLHFCQUFxQixFQUFFLEtBQUs7YUFDNUI7WUFDRCxZQUFZLEVBQUU7Z0JBQ2IscUJBQXFCLEVBQUUsS0FBSzthQUM1QjtZQUNELGVBQWUsRUFBRTtnQkFDaEIsV0FBVyxFQUFFLElBQUk7YUFDakI7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QscUJBQXFCLEVBQUUsSUFBSTtnQkFDM0IsZ0JBQWdCLEVBQUUsQ0FBQzthQUNuQjtTQUNEO0tBQ0QsQ0FBQyxDQUFDLENBQUMifQ==