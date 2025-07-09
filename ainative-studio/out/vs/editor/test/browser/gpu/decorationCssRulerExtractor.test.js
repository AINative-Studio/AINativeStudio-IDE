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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkNzc1J1bGVyRXh0cmFjdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9ncHUvZGVjb3JhdGlvbkNzc1J1bGVyRXh0cmFjdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXZFLFNBQVMsV0FBVztJQUNuQixPQUFPLGFBQWEsR0FBRyxZQUFZLEVBQUUsQ0FBQztBQUN2QyxDQUFDO0FBRUQsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksR0FBYSxDQUFDO0lBQ2xCLElBQUksU0FBc0IsQ0FBQztJQUMzQixJQUFJLFNBQXFDLENBQUM7SUFDMUMsSUFBSSxhQUFxQixDQUFDO0lBRTFCLFNBQVMsZUFBZSxDQUFDLE9BQWU7UUFDdkMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hDLFlBQVksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO1FBQ25DLFNBQVMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFDLFNBQWlCLEVBQUUsZUFB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