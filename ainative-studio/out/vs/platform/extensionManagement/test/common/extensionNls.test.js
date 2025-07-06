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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTmxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9jb21tb24vZXh0ZW5zaW9uTmxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFeEQsTUFBTSxRQUFRLEdBQXVCO0lBQ3BDLElBQUksRUFBRSxNQUFNO0lBQ1osU0FBUyxFQUFFLE1BQU07SUFDakIsT0FBTyxFQUFFLE9BQU87SUFDaEIsT0FBTyxFQUFFO1FBQ1IsTUFBTSxFQUFFLEdBQUc7S0FDWDtJQUNELFdBQVcsRUFBRTtRQUNaLFFBQVEsRUFBRTtZQUNUO2dCQUNDLE9BQU8sRUFBRSxjQUFjO2dCQUN2QixLQUFLLEVBQUUsc0JBQXNCO2dCQUM3QixRQUFRLEVBQUUseUJBQXlCO2FBQ25DO1NBQ0Q7UUFDRCxjQUFjLEVBQUU7WUFDZjtnQkFDQyxFQUFFLEVBQUUscUJBQXFCO2dCQUN6QixLQUFLLEVBQUUsNkJBQTZCO2FBQ3BDO1NBQ0Q7UUFDRCxhQUFhLEVBQUU7WUFDZCw2Q0FBNkM7WUFDN0MsS0FBSyxFQUFFLDRCQUE0QjtZQUNuQyxVQUFVLEVBQUU7Z0JBQ1gsb0JBQW9CLEVBQUU7b0JBQ3JCLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxlQUFlO2lCQUM1QjthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUM7QUFFRixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFDeEQsSUFBSSxDQUFDLDJCQUEyQixFQUFFO1FBQ2pDLE1BQU0saUJBQWlCLEdBQUcsZ0JBQWdCLENBQ3pDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQyxFQUMzQixTQUFTLENBQUMsUUFBUSxDQUFDLEVBQ25CO1lBQ0Msb0JBQW9CLEVBQUUsY0FBYztZQUNwQyx1QkFBdUIsRUFBRSxlQUFlO1lBQ3hDLDJCQUEyQixFQUFFLHFCQUFxQjtZQUNsRCwwQkFBMEIsRUFBRSxvQkFBb0I7U0FDaEQsQ0FDRCxDQUFDO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZGLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUMzRixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUNwRyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLGFBQW9DLENBQUEsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUN0SCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxzRUFBc0UsRUFBRTtRQUM1RSxNQUFNLGlCQUFpQixHQUFHLGdCQUFnQixDQUN6QyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxFQUFFLENBQUMsRUFDM0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUNuQixFQUFFLEVBQ0Y7WUFDQyxvQkFBb0IsRUFBRSxjQUFjO1lBQ3BDLHVCQUF1QixFQUFFLGVBQWU7WUFDeEMsMkJBQTJCLEVBQUUscUJBQXFCO1lBQ2xELDBCQUEwQixFQUFFLG9CQUFvQjtTQUNoRCxDQUNELENBQUM7UUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3BHLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsYUFBb0MsQ0FBQSxDQUFDLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3RILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdGQUFnRixFQUFFO1FBQ3RGLE1BQU0saUJBQWlCLEdBQUcsZ0JBQWdCLENBQ3pDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQyxFQUMzQixTQUFTLENBQUMsUUFBUSxDQUFDLEVBQ25CO1lBQ0Msb0JBQW9CLEVBQUUsYUFBYTtZQUNuQyx1QkFBdUIsRUFBRSxlQUFlO1lBQ3hDLDJCQUEyQixFQUFFLHVCQUF1QjtZQUNwRCwwQkFBMEIsRUFBRSxtQkFBbUI7U0FDL0MsRUFDRDtZQUNDLG9CQUFvQixFQUFFLGNBQWM7WUFDcEMsdUJBQXVCLEVBQUUsZUFBZTtZQUN4QywyQkFBMkIsRUFBRSxxQkFBcUI7WUFDbEQsMEJBQTBCLEVBQUUsb0JBQW9CO1NBQ2hELENBQ0QsQ0FBQztRQUVGLE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUF5QixDQUFDO1FBQ3JGLE1BQU0sUUFBUSxHQUFHLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUE0QixDQUFDO1FBQzNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUV2RCxxQ0FBcUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDdEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxhQUFvQyxDQUFBLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDckgsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0RBQW9ELEVBQUU7UUFDMUQsTUFBTSxnQkFBZ0IsR0FBdUI7WUFDNUMsSUFBSSxFQUFFLE1BQU07WUFDWixTQUFTLEVBQUUsTUFBTTtZQUNqQixPQUFPLEVBQUUsT0FBTztZQUNoQixPQUFPLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLEdBQUc7YUFDWDtZQUNELFdBQVcsRUFBRTtnQkFDWixjQUFjLEVBQUU7b0JBQ2Y7d0JBQ0MsRUFBRSxFQUFFLHFCQUFxQjt3QkFDekIsNERBQTREO3dCQUM1RCxLQUFLLEVBQUUsZ0JBQWdCO3FCQUN2QjtpQkFDRDtnQkFDRCxRQUFRLEVBQUU7b0JBQ1Q7d0JBQ0MsT0FBTyxFQUFFLGNBQWM7d0JBQ3ZCLEtBQUssRUFBRSxzQkFBc0I7d0JBQzdCLFFBQVEsRUFBRSx5QkFBeUI7cUJBQ25DO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDO1FBRUYsTUFBTSxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FDekMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDLEVBQzNCLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMzQjtZQUNDLG9CQUFvQixFQUFFLGNBQWM7WUFDcEMsdUJBQXVCLEVBQUUsZUFBZTtTQUN4QyxDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2hHLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==