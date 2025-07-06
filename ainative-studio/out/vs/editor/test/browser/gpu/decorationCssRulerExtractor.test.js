/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { DecorationCssRuleExtractor } from '../../../browser/gpu/css/decorationCssRuleExtractor.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { $, getActiveDocument } from '../../../../base/browser/dom.js';
function randomClass() {
    return 'test-class-' + generateUuid();
}
suite('DecorationCssRulerExtractor', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let doc;
    let container;
    let extractor;
    let testClassName;
    function addStyleElement(content) {
        const styleElement = $('style');
        styleElement.textContent = content;
        container.append(styleElement);
    }
    function assertStyles(className, expectedCssText) {
        deepStrictEqual(extractor.getStyleRules(container, className).map(e => e.cssText), expectedCssText);
    }
    setup(() => {
        doc = getActiveDocument();
        extractor = store.add(new DecorationCssRuleExtractor());
        testClassName = randomClass();
        container = $('div');
        doc.body.append(container);
    });
    teardown(() => {
        container.remove();
    });
    test('unknown class should give no styles', () => {
        assertStyles(randomClass(), []);
    });
    test('single style should be picked up', () => {
        addStyleElement(`.${testClassName} { color: red; }`);
        assertStyles(testClassName, [
            `.${testClassName} { color: red; }`
        ]);
    });
    test('multiple styles from the same selector should be picked up', () => {
        addStyleElement(`.${testClassName} { color: red; opacity: 0.5; }`);
        assertStyles(testClassName, [
            `.${testClassName} { color: red; opacity: 0.5; }`
        ]);
    });
    test('multiple styles from  different selectors should be picked up', () => {
        addStyleElement([
            `.${testClassName} { color: red; opacity: 0.5; }`,
            `.${testClassName}:hover { opacity: 1; }`,
        ].join('\n'));
        assertStyles(testClassName, [
            `.${testClassName} { color: red; opacity: 0.5; }`,
            `.${testClassName}:hover { opacity: 1; }`,
        ]);
    });
    test('multiple styles from the different stylesheets should be picked up', () => {
        addStyleElement(`.${testClassName} { color: red; opacity: 0.5; }`);
        addStyleElement(`.${testClassName}:hover { opacity: 1; }`);
        assertStyles(testClassName, [
            `.${testClassName} { color: red; opacity: 0.5; }`,
            `.${testClassName}:hover { opacity: 1; }`,
        ]);
    });
    test('should not pick up styles from selectors where the prefix is the class', () => {
        addStyleElement([
            `.${testClassName} { color: red; }`,
            `.${testClassName}-ignoreme { opacity: 1; }`,
            `.${testClassName}fake { opacity: 1; }`,
        ].join('\n'));
        assertStyles(testClassName, [
            `.${testClassName} { color: red; }`,
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkNzc1J1bGVyRXh0cmFjdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2dwdS9kZWNvcmF0aW9uQ3NzUnVsZXJFeHRyYWN0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFdkUsU0FBUyxXQUFXO0lBQ25CLE9BQU8sYUFBYSxHQUFHLFlBQVksRUFBRSxDQUFDO0FBQ3ZDLENBQUM7QUFFRCxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxHQUFhLENBQUM7SUFDbEIsSUFBSSxTQUFzQixDQUFDO0lBQzNCLElBQUksU0FBcUMsQ0FBQztJQUMxQyxJQUFJLGFBQXFCLENBQUM7SUFFMUIsU0FBUyxlQUFlLENBQUMsT0FBZTtRQUN2QyxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEMsWUFBWSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7UUFDbkMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsU0FBaUIsRUFBRSxlQUF5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