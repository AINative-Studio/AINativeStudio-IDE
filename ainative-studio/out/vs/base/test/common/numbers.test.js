/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { isPointWithinTriangle, randomInt } from '../../common/numbers.js';
suite('isPointWithinTriangle', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should return true if the point is within the triangle', () => {
        const result = isPointWithinTriangle(0.25, 0.25, 0, 0, 1, 0, 0, 1);
        assert.ok(result);
    });
    test('should return false if the point is outside the triangle', () => {
        const result = isPointWithinTriangle(2, 2, 0, 0, 1, 0, 0, 1);
        assert.ok(!result);
    });
    test('should return true if the point is on the edge of the triangle', () => {
        const result = isPointWithinTriangle(0.5, 0, 0, 0, 1, 0, 0, 1);
        assert.ok(result);
    });
});
suite('randomInt', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Test helper that allows to run a test on the `randomInt()`
     * utility with specified `max` and `min` values.
     */
    const testRandomIntUtil = (max, min, testName) => {
        suite(testName, () => {
            let i = 0;
            while (++i < 5) {
                test(`should generate random boolean attempt#${i}`, async () => {
                    let iterations = 100;
                    while (iterations-- > 0) {
                        const int = randomInt(max, min);
                        assert(int <= max, `Expected ${int} to be less than or equal to ${max}.`);
                        assert(int >= (min ?? 0), `Expected ${int} to be greater than or equal to ${min ?? 0}.`);
                    }
                });
            }
            test('should include min and max', async () => {
                let iterations = 125;
                const results = [];
                while (iterations-- > 0) {
                    results.push(randomInt(max, min));
                }
                assert(results.includes(max), `Expected ${results} to include ${max}.`);
                assert(results.includes(min ?? 0), `Expected ${results} to include ${min ?? 0}.`);
            });
        });
    };
    suite('positive numbers', () => {
        testRandomIntUtil(4, 2, 'max: 4, min: 2');
        testRandomIntUtil(4, 0, 'max: 4, min: 0');
        testRandomIntUtil(4, undefined, 'max: 4, min: undefined');
        testRandomIntUtil(1, 0, 'max: 0, min: 0');
    });
    suite('negative numbers', () => {
        testRandomIntUtil(-2, -5, 'max: -2, min: -5');
        testRandomIntUtil(0, -5, 'max: 0, min: -5');
        testRandomIntUtil(0, -1, 'max: 0, min: -1');
    });
    suite('split numbers', () => {
        testRandomIntUtil(3, -1, 'max: 3, min: -1');
        testRandomIntUtil(2, -2, 'max: 2, min: -2');
        testRandomIntUtil(1, -3, 'max: 2, min: -2');
    });
    suite('errors', () => {
        test('should throw if "min" is == "max" #1', () => {
            assert.throws(() => {
                randomInt(200, 200);
            }, `"max"(200) param should be greater than "min"(200)."`);
        });
        test('should throw if "min" is == "max" #2', () => {
            assert.throws(() => {
                randomInt(2, 2);
            }, `"max"(2) param should be greater than "min"(2)."`);
        });
        test('should throw if "min" is == "max" #3', () => {
            assert.throws(() => {
                randomInt(0);
            }, `"max"(0) param should be greater than "min"(0)."`);
        });
        test('should throw if "min" is > "max" #1', () => {
            assert.throws(() => {
                randomInt(2, 3);
            }, `"max"(2) param should be greater than "min"(3)."`);
        });
        test('should throw if "min" is > "max" #2', () => {
            assert.throws(() => {
                randomInt(999, 2000);
            }, `"max"(999) param should be greater than "min"(2000)."`);
        });
        test('should throw if "min" is > "max" #3', () => {
            assert.throws(() => {
                randomInt(0, 1);
            }, `"max"(0) param should be greater than "min"(1)."`);
        });
        test('should throw if "min" is > "max" #4', () => {
            assert.throws(() => {
                randomInt(-5, 2);
            }, `"max"(-5) param should be greater than "min"(2)."`);
        });
        test('should throw if "min" is > "max" #5', () => {
            assert.throws(() => {
                randomInt(-4, 0);
            }, `"max"(-4) param should be greater than "min"(0)."`);
        });
        test('should throw if "min" is > "max" #6', () => {
            assert.throws(() => {
                randomInt(-4);
            }, `"max"(-4) param should be greater than "min"(0)."`);
        });
        test('should throw if "max" is `NaN`', () => {
            assert.throws(() => {
                randomInt(NaN);
            }, `"max" param is not a number."`);
        });
        test('should throw if "min" is `NaN`', () => {
            assert.throws(() => {
                randomInt(4, NaN);
            }, `"min" param is not a number."`);
        });
        suite('infinite arguments', () => {
            test('should throw if "max" is infinite [Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "max" is infinite [-Infinity]', () => {
                assert.throws(() => {
                    randomInt(-Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "max" is infinite [+Infinity]', () => {
                assert.throws(() => {
                    randomInt(+Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "min" is infinite [Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity, Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "min" is infinite [-Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity, -Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "min" is infinite [+Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity, +Infinity);
                }, `"max" param is not finite."`);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVtYmVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbnVtYmVycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTNFLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsd0RBQXdELEVBQUUsR0FBRyxFQUFFO1FBQ25FLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRSxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEdBQUcsRUFBRTtRQUNyRSxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdFQUFnRSxFQUFFLEdBQUcsRUFBRTtRQUMzRSxNQUFNLE1BQU0sR0FBRyxxQkFBcUIs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