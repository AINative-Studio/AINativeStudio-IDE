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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2pzb25TY2hlbWEudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLG9CQUFvQixFQUFlLE1BQU0sNEJBQTRCLENBQUM7QUFDL0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBRXpCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUVuQyxNQUFNLE1BQU0sR0FBZ0I7WUFDM0IsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsQ0FBQyxFQUFFO29CQUNGLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxHQUFHO29CQUNoQixVQUFVLEVBQUU7d0JBQ1gsQ0FBQyxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFVBQVUsRUFBRTtnQ0FDWCxDQUFDLEVBQUU7b0NBQ0YsSUFBSSxFQUFFLFFBQVE7b0NBQ2QsVUFBVSxFQUFFO3dDQUNYLENBQUMsRUFBRTs0Q0FDRixJQUFJLEVBQUUsUUFBUTt5Q0FDZDtxQ0FDRDtpQ0FDRDs2QkFDRDt5QkFDRDtxQkFDRDtpQkFDRDtnQkFDRCxDQUFDLEVBQUU7b0JBQ0YsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLEdBQUc7b0JBQ2hCLFVBQVUsRUFBRTt3QkFDWCxDQUFDLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsVUFBVSxFQUFFO2dDQUNYLENBQUMsRUFBRTtvQ0FDRixJ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