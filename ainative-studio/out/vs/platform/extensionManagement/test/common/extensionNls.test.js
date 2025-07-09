/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { deepClone } from '../../../../base/common/objects.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { localizeManifest } from '../../common/extensionNls.js';
import { NullLogger } from '../../../log/common/log.js';
const manifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
    engines: {
        vscode: '*'
    },
    contributes: {
        commands: [
            {
                command: 'test.command',
                title: '%test.command.title%',
                category: '%test.command.category%'
            },
        ],
        authentication: [
            {
                id: 'test.authentication',
                label: '%test.authentication.label%',
            }
        ],
        configuration: {
            // to ensure we test another "title" property
            title: '%test.configuration.title%',
            properties: {
                'test.configuration': {
                    type: 'string',
                    description: 'not important',
                }
            }
        }
    }
};
suite('Localize Manifest', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('replaces template strings', function () {
        const localizedManifest = localizeManifest(store.add(new NullLogger()), deepClone(manifest), {
            'test.command.title': 'Test Command',
            'test.command.category': 'Test Category',
            'test.authentication.label': 'Test Authentication',
            'test.configuration.title': 'Test Configuration',
        });
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].title, 'Test Command');
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].category, 'Test Category');
        assert.strictEqual(localizedManifest.contributes?.authentication?.[0].label, 'Test Authentication');
        assert.strictEqual((localizedManifest.contributes?.configuration).title, 'Test Configuration');
    });
    test('replaces template strings with fallback if not found in translations', function () {
        const localizedManifest = localizeManifest(store.add(new NullLogger()), deepClone(manifest), {}, {
            'test.command.title': 'Test Command',
            'test.command.category': 'Test Category',
            'test.authentication.label': 'Test Authentication',
            'test.configuration.title': 'Test Configuration',
        });
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].title, 'Test Command');
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].category, 'Test Category');
        assert.strictEqual(localizedManifest.contributes?.authentication?.[0].label, 'Test Authentication');
        assert.strictEqual((localizedManifest.contributes?.configuration).title, 'Test Configuration');
    });
    test('replaces template strings - command title & categories become ILocalizedString', function () {
        const localizedManifest = localizeManifest(store.add(new NullLogger()), deepClone(manifest), {
            'test.command.title': 'Befehl test',
            'test.command.category': 'Testkategorie',
            'test.authentication.label': 'Testauthentifizierung',
            'test.configuration.title': 'Testkonfiguration',
        }, {
            'test.command.title': 'Test Command',
            'test.command.category': 'Test Category',
            'test.authentication.label': 'Test Authentication',
            'test.configuration.title': 'Test Configuration',
        });
        const title = localizedManifest.contributes?.commands?.[0].title;
        const category = localizedManifest.contributes?.commands?.[0].category;
        assert.strictEqual(title.value, 'Befehl test');
        assert.strictEqual(title.original, 'Test Command');
        assert.strictEqual(category.value, 'Testkategorie');
        assert.strictEqual(category.original, 'Test Category');
        // Everything else stays as a string.
        assert.strictEqual(localizedManifest.contributes?.authentication?.[0].label, 'Testauthentifizierung');
        assert.strictEqual((localizedManifest.contributes?.configuration).title, 'Testkonfiguration');
    });
    test('replaces template strings - is best effort #164630', function () {
        const manifestWithTypo = {
            name: 'test',
            publisher: 'test',
            version: '1.0.0',
            engines: {
                vscode: '*'
            },
            contributes: {
                authentication: [
                    {
                        id: 'test.authentication',
                        // This not existing in the bundle shouldn't cause an error.
                        label: '%doesnotexist%',
                    }
                ],
                commands: [
                    {
                        command: 'test.command',
                        title: '%test.command.title%',
                        category: '%test.command.category%'
                    },
                ],
            }
        };
        const localizedManifest = localizeManifest(store.add(new NullLogger()), deepClone(manifestWithTypo), {
            'test.command.title': 'Test Command',
            'test.command.category': 'Test Category'
        });
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].title, 'Test Command');
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].category, 'Test Category');
        assert.strictEqual(localizedManifest.contributes?.authentication?.[0].label, '%doesnotexist%');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTmxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC90ZXN0L2NvbW1vbi9leHRlbnNpb25ObHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUV4RCxNQUFNLFFBQVEsR0FBdUI7SUFDcEMsSUFBSSxFQUFFLE1BQU07SUFDWixTQUFTLEVBQUUsTUFBTTtJQUNqQixPQUFPLEVBQUUsT0FBTztJQUNoQixPQUFPLEVBQUU7UUFDUixNQUFNLEVBQUUsR0FBRztLQUNYO0lBQ0QsV0FBVyxFQUFFO1FBQ1osUUFBUSxFQUFFO1lBQ1Q7Z0JBQ0MsT0FBTyxFQUFFLGNBQWM7Z0JBQ3ZCLEtBQUssRUFBRSxzQkFBc0I7Z0JBQzdCLFFBQVEsRUFBRSx5QkFBeUI7YUFDbkM7U0FDRDtRQUNELGNBQWMsRUFBRTtZQUNmO2dCQUNDLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLEtBQUssRUFBRSw2QkFBNkI7YUFDcEM7U0FDRDtRQUNELGFBQWEsRUFBRTtZQUNkLDZDQUE2QztZQUM3QyxLQUFLLEVBQUUsNEJBQTRCO1lBQ25DLFVBQVUsRUFBRTtnQkFDWCxvQkFBb0IsRUFBRTtvQkFDckIsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLGVBQWU7aUJBQzVCO2FB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