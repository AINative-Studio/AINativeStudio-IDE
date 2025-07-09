/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { getCompressedContent } from '../../common/jsonSchema.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('JSON Schema', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getCompressedContent 1', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    description: 'a',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                e: {
                    type: 'object',
                    description: 'e',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        const expected = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    description: 'a',
                    properties: {
                        b: {
                            $ref: '#/$defs/_0'
                        }
                    }
                },
                e: {
                    type: 'object',
                    description: 'e',
                    properties: {
                        b: {
                            $ref: '#/$defs/_0'
                        }
                    }
                }
            },
            $defs: {
                "_0": {
                    type: 'object',
                    properties: {
                        c: {
                            type: 'object',
                            properties: {
                                d: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            }
        };
        assert.deepEqual(getCompressedContent(schema), JSON.stringify(expected));
    });
    test('getCompressedContent 2', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                e: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        const expected = {
            type: 'object',
            properties: {
                a: {
                    $ref: '#/$defs/_0'
                },
                e: {
                    $ref: '#/$defs/_0'
                }
            },
            $defs: {
                "_0": {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        assert.deepEqual(getCompressedContent(schema), JSON.stringify(expected));
    });
    test('getCompressedContent 3', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    oneOf: [
                        {
                            allOf: [
                                {
                                    properties: {
                                        name: {
                                            type: 'string'
                                        },
                                        description: {
                                            type: 'string'
                                        }
                                    }
                                },
                                {
                                    properties: {
                                        street: {
                                            type: 'string'
                                        },
                                    }
                                }
                            ]
                        },
                        {
                            allOf: [
                                {
                                    properties: {
                                        name: {
                                            type: 'string'
                                        },
                                        description: {
                                            type: 'string'
                                        }
                                    }
                                },
                                {
                                    properties: {
                                        river: {
                                            type: 'string'
                                        },
                                    }
                                }
                            ]
                        },
                        {
                            allOf: [
                                {
                                    properties: {
                                        name: {
                                            type: 'string'
                                        },
                                        description: {
                                            type: 'string'
                                        }
                                    }
                                },
                                {
                                    properties: {
                                        mountain: {
                                            type: 'string'
                                        },
                                    }
                                }
                            ]
                        }
                    ]
                },
                b: {
                    type: 'object',
                    properties: {
                        street: {
                            properties: {
                                street: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            }
        };
        const expected = {
            "type": "object",
            "properties": {
                "a": {
                    "type": "object",
                    "oneOf": [
                        {
                            "allOf": [
                                {
                                    "$ref": "#/$defs/_0"
                                },
                                {
                                    "$ref": "#/$defs/_1"
                                }
                            ]
                        },
                        {
                            "allOf": [
                                {
                                    "$ref": "#/$defs/_0"
                                },
                                {
                                    "properties": {
                                        "river": {
                                            "type": "string"
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "allOf": [
                                {
                                    "$ref": "#/$defs/_0"
                                },
                                {
                                    "properties": {
                                        "mountain": {
                                            "type": "string"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                "b": {
                    "type": "object",
                    "properties": {
                        "street": {
                            "$ref": "#/$defs/_1"
                        }
                    }
                }
            },
            "$defs": {
                "_0": {
                    "properties": {
                        "name": {
                            "type": "string"
                        },
                        "description": {
                            "type": "string"
                        }
                    }
                },
                "_1": {
                    "properties": {
                        "street": {
                            "type": "string"
                        }
                    }
                }
            }
        };
        const actual = getCompressedContent(schema);
        assert.deepEqual(actual, JSON.stringify(expected));
    });
    test('getCompressedContent 4', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                e: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                f: {
                    type: 'object',
                    properties: {
                        d: {
                            type: 'string'
                        }
                    }
                }
            }
        };
        const expected = {
            type: 'object',
            properties: {
                a: {
                    $ref: '#/$defs/_0'
                },
                e: {
                    $ref: '#/$defs/_0'
                },
                f: {
                    $ref: '#/$defs/_1'
                }
            },
            $defs: {
                "_0": {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    $ref: '#/$defs/_1'
                                }
                            }
                        }
                    }
                },
                "_1": {
                    type: 'object',
                    properties: {
                        d: {
                            type: 'string'
                        }
                    }
                }
            }
        };
        assert.deepEqual(getCompressedContent(schema), JSON.stringify(expected));
    });
    test('getCompressedContent 5', () => {
        const schema = {
            type: 'object',
            properties: {
                a: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            c: {
                                type: 'object',
                                properties: {
                                    d: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                e: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            c: {
                                type: 'object',
                                properties: {
                                    d: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                f: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                g: {
                    type: 'object',
                    properties: {
                        b: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'object',
                                    properties: {
                                        d: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        const expected = {
            type: 'object',
            properties: {
                a: {
                    $ref: '#/$defs/_0'
                },
                e: {
                    $ref: '#/$defs/_0'
                },
                f: {
                    $ref: '#/$defs/_1'
                },
                g: {
                    $ref: '#/$defs/_1'
                }
            },
            $defs: {
                "_0": {
                    type: 'array',
                    items: {
                        $ref: '#/$defs/_2'
                    }
                },
                "_1": {
                    type: 'object',
                    properties: {
                        b: {
                            $ref: '#/$defs/_2'
                        }
                    }
                },
                "_2": {
                    type: 'object',
                    properties: {
                        c: {
                            type: 'object',
                            properties: {
                                d: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            }
        };
        assert.deepEqual(getCompressedContent(schema), JSON.stringify(expected));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vanNvblNjaGVtYS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsb0JBQW9CLEVBQWUsTUFBTSw0QkFBNEIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFckUsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFFekIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1FBRW5DLE1BQU0sTUFBTSxHQUFnQjtZQUMzQixJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxDQUFDLEVBQUU7b0JBQ0YsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLEdBQUc7b0JBQ2hCLFVBQVUsRUFBRTt3QkFDWCxDQUFDLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsVUFBVSxFQUFFO2dDQUNYLENBQUMsRUFBRTtvQ0FDRixJQUFJLEVBQUUsUUFBUTtvQ0FDZCxVQUFVLEVBQUU7d0NBQ1gsQ0FBQyxFQUFFOzRDQUNGLElBQUksRUFBRSxRQUFRO3lDQUNkO3FDQUNEO2lDQUNEOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNEO2dCQUNELENBQUMsRUFBRTtvQkFDRixJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsR0FBRztvQkFDaEIsVUFBVSxFQUFFO3dCQUNYLENBQUMsRUFBRTs0QkFDRixJQUFJLEVBQUUsUUFBUTs0QkFDZCxVQUFVLEVBQUU7Z0NBQ1gsQ0FBQyxFQUFFO29DQUNGLElBQUks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