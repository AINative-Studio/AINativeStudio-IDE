/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Color } from '../../../../base/common/color.js';
import { isObject, isUndefinedOrNull, isString, isStringArray } from '../../../../base/common/types.js';
function canBeType(propTypes, ...types) {
    return types.some(t => propTypes.includes(t));
}
function isNullOrEmpty(value) {
    return value === '' || isUndefinedOrNull(value);
}
export function createValidator(prop) {
    const type = Array.isArray(prop.type) ? prop.type : [prop.type];
    const isNullable = canBeType(type, 'null');
    const isNumeric = (canBeType(type, 'number') || canBeType(type, 'integer')) && (type.length === 1 || type.length === 2 && isNullable);
    const numericValidations = getNumericValidators(prop);
    const stringValidations = getStringValidators(prop);
    const arrayValidator = getArrayValidator(prop);
    const objectValidator = getObjectValidator(prop);
    return value => {
        if (isNullable && isNullOrEmpty(value)) {
            return '';
        }
        const errors = [];
        if (arrayValidator) {
            const err = arrayValidator(value);
            if (err) {
                errors.push(err);
            }
        }
        if (objectValidator) {
            const err = objectValidator(value);
            if (err) {
                errors.push(err);
            }
        }
        if (prop.type === 'boolean' && value !== true && value !== false) {
            errors.push(nls.localize('validations.booleanIncorrectType', 'Incorrect type. Expected "boolean".'));
        }
        if (isNumeric) {
            if (isNullOrEmpty(value) || typeof value === 'boolean' || Array.isArray(value) || isNaN(+value)) {
                errors.push(nls.localize('validations.expectedNumeric', "Value must be a number."));
            }
            else {
                errors.push(...numericValidations.filter(validator => !validator.isValid(+value)).map(validator => validator.message));
            }
        }
        if (prop.type === 'string') {
            if (prop.enum && !isStringArray(prop.enum)) {
                errors.push(nls.localize('validations.stringIncorrectEnumOptions', 'The enum options should be strings, but there is a non-string option. Please file an issue with the extension author.'));
            }
            else if (!isString(value)) {
                errors.push(nls.localize('validations.stringIncorrectType', 'Incorrect type. Expected "string".'));
            }
            else {
                errors.push(...stringValidations.filter(validator => !validator.isValid(value)).map(validator => validator.message));
            }
        }
        if (errors.length) {
            return prop.errorMessage ? [prop.errorMessage, ...errors].join(' ') : errors.join(' ');
        }
        return '';
    };
}
/**
 * Returns an error string if the value is invalid and can't be displayed in the settings UI for the given type.
 */
export function getInvalidTypeError(value, type) {
    if (typeof type === 'undefined') {
        return;
    }
    const typeArr = Array.isArray(type) ? type : [type];
    if (!typeArr.some(_type => valueValidatesAsType(value, _type))) {
        return nls.localize('invalidTypeError', "Setting has an invalid type, expected {0}. Fix in JSON.", JSON.stringify(type));
    }
    return;
}
function valueValidatesAsType(value, type) {
    const valueType = typeof value;
    if (type === 'boolean') {
        return valueType === 'boolean';
    }
    else if (type === 'object') {
        return value && !Array.isArray(value) && valueType === 'object';
    }
    else if (type === 'null') {
        return value === null;
    }
    else if (type === 'array') {
        return Array.isArray(value);
    }
    else if (type === 'string') {
        return valueType === 'string';
    }
    else if (type === 'number' || type === 'integer') {
        return valueType === 'number';
    }
    return true;
}
function toRegExp(pattern) {
    try {
        // The u flag allows support for better Unicode matching,
        // but deprecates some patterns such as [\s-9]
        // Ref https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Character_class#description
        return new RegExp(pattern, 'u');
    }
    catch (e) {
        try {
            return new RegExp(pattern);
        }
        catch (e) {
            // If the pattern can't be parsed even without the 'u' flag,
            // just log the error to avoid rendering the entire Settings editor blank.
            // Ref https://github.com/microsoft/vscode/issues/195054
            console.error(nls.localize('regexParsingError', "Error parsing the following regex both with and without the u flag:"), pattern);
            return /.*/;
        }
    }
}
function getStringValidators(prop) {
    const uriRegex = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    let patternRegex;
    if (typeof prop.pattern === 'string') {
        patternRegex = toRegExp(prop.pattern);
    }
    return [
        {
            enabled: prop.maxLength !== undefined,
            isValid: ((value) => value.length <= prop.maxLength),
            message: nls.localize('validations.maxLength', "Value must be {0} or fewer characters long.", prop.maxLength)
        },
        {
            enabled: prop.minLength !== undefined,
            isValid: ((value) => value.length >= prop.minLength),
            message: nls.localize('validations.minLength', "Value must be {0} or more characters long.", prop.minLength)
        },
        {
            enabled: patternRegex !== undefined,
            isValid: ((value) => patternRegex.test(value)),
            message: prop.patternErrorMessage || nls.localize('validations.regex', "Value must match regex `{0}`.", prop.pattern)
        },
        {
            enabled: prop.format === 'color-hex',
            isValid: ((value) => Color.Format.CSS.parseHex(value)),
            message: nls.localize('validations.colorFormat', "Invalid color format. Use #RGB, #RGBA, #RRGGBB or #RRGGBBAA.")
        },
        {
            enabled: prop.format === 'uri' || prop.format === 'uri-reference',
            isValid: ((value) => !!value.length),
            message: nls.localize('validations.uriEmpty', "URI expected.")
        },
        {
            enabled: prop.format === 'uri' || prop.format === 'uri-reference',
            isValid: ((value) => uriRegex.test(value)),
            message: nls.localize('validations.uriMissing', "URI is expected.")
        },
        {
            enabled: prop.format === 'uri',
            isValid: ((value) => {
                const matches = value.match(uriRegex);
                return !!(matches && matches[2]);
            }),
            message: nls.localize('validations.uriSchemeMissing', "URI with a scheme is expected.")
        },
        {
            enabled: prop.enum !== undefined,
            isValid: ((value) => {
                return prop.enum.includes(value);
            }),
            message: nls.localize('validations.invalidStringEnumValue', "Value is not accepted. Valid values: {0}.", prop.enum ? prop.enum.map(key => `"${key}"`).join(', ') : '[]')
        }
    ].filter(validation => validation.enabled);
}
function getNumericValidators(prop) {
    const type = Array.isArray(prop.type) ? prop.type : [prop.type];
    const isNullable = canBeType(type, 'null');
    const isIntegral = (canBeType(type, 'integer')) && (type.length === 1 || type.length === 2 && isNullable);
    const isNumeric = canBeType(type, 'number', 'integer') && (type.length === 1 || type.length === 2 && isNullable);
    if (!isNumeric) {
        return [];
    }
    let exclusiveMax;
    let exclusiveMin;
    if (typeof prop.exclusiveMaximum === 'boolean') {
        exclusiveMax = prop.exclusiveMaximum ? prop.maximum : undefined;
    }
    else {
        exclusiveMax = prop.exclusiveMaximum;
    }
    if (typeof prop.exclusiveMinimum === 'boolean') {
        exclusiveMin = prop.exclusiveMinimum ? prop.minimum : undefined;
    }
    else {
        exclusiveMin = prop.exclusiveMinimum;
    }
    return [
        {
            enabled: exclusiveMax !== undefined && (prop.maximum === undefined || exclusiveMax <= prop.maximum),
            isValid: ((value) => value < exclusiveMax),
            message: nls.localize('validations.exclusiveMax', "Value must be strictly less than {0}.", exclusiveMax)
        },
        {
            enabled: exclusiveMin !== undefined && (prop.minimum === undefined || exclusiveMin >= prop.minimum),
            isValid: ((value) => value > exclusiveMin),
            message: nls.localize('validations.exclusiveMin', "Value must be strictly greater than {0}.", exclusiveMin)
        },
        {
            enabled: prop.maximum !== undefined && (exclusiveMax === undefined || exclusiveMax > prop.maximum),
            isValid: ((value) => value <= prop.maximum),
            message: nls.localize('validations.max', "Value must be less than or equal to {0}.", prop.maximum)
        },
        {
            enabled: prop.minimum !== undefined && (exclusiveMin === undefined || exclusiveMin < prop.minimum),
            isValid: ((value) => value >= prop.minimum),
            message: nls.localize('validations.min', "Value must be greater than or equal to {0}.", prop.minimum)
        },
        {
            enabled: prop.multipleOf !== undefined,
            isValid: ((value) => value % prop.multipleOf === 0),
            message: nls.localize('validations.multipleOf', "Value must be a multiple of {0}.", prop.multipleOf)
        },
        {
            enabled: isIntegral,
            isValid: ((value) => value % 1 === 0),
            message: nls.localize('validations.expectedInteger', "Value must be an integer.")
        },
    ].filter(validation => validation.enabled);
}
function getArrayValidator(prop) {
    if (prop.type === 'array' && prop.items && !Array.isArray(prop.items)) {
        const propItems = prop.items;
        if (propItems && !Array.isArray(propItems.type)) {
            const withQuotes = (s) => `'` + s + `'`;
            return value => {
                if (!value) {
                    return null;
                }
                let message = '';
                if (!Array.isArray(value)) {
                    message += nls.localize('validations.arrayIncorrectType', 'Incorrect type. Expected an array.');
                    message += '\n';
                    return message;
                }
                const arrayValue = value;
                if (prop.uniqueItems) {
                    if (new Set(arrayValue).size < arrayValue.length) {
                        message += nls.localize('validations.stringArrayUniqueItems', 'Array has duplicate items');
                        message += '\n';
                    }
                }
                if (prop.minItems && arrayValue.length < prop.minItems) {
                    message += nls.localize('validations.stringArrayMinItem', 'Array must have at least {0} items', prop.minItems);
                    message += '\n';
                }
                if (prop.maxItems && arrayValue.length > prop.maxItems) {
                    message += nls.localize('validations.stringArrayMaxItem', 'Array must have at most {0} items', prop.maxItems);
                    message += '\n';
                }
                if (propItems.type === 'string') {
                    if (!isStringArray(arrayValue)) {
                        message += nls.localize('validations.stringArrayIncorrectType', 'Incorrect type. Expected a string array.');
                        message += '\n';
                        return message;
                    }
                    if (typeof propItems.pattern === 'string') {
                        const patternRegex = toRegExp(propItems.pattern);
                        arrayValue.forEach(v => {
                            if (!patternRegex.test(v)) {
                                message +=
                                    propItems.patternErrorMessage ||
                                        nls.localize('validations.stringArrayItemPattern', 'Value {0} must match regex {1}.', withQuotes(v), withQuotes(propItems.pattern));
                            }
                        });
                    }
                    const propItemsEnum = propItems.enum;
                    if (propItemsEnum) {
                        arrayValue.forEach(v => {
                            if (propItemsEnum.indexOf(v) === -1) {
                                message += nls.localize('validations.stringArrayItemEnum', 'Value {0} is not one of {1}', withQuotes(v), '[' + propItemsEnum.map(withQuotes).join(', ') + ']');
                                message += '\n';
                            }
                        });
                    }
                }
                else if (propItems.type === 'integer' || propItems.type === 'number') {
                    arrayValue.forEach(v => {
                        const errorMessage = getErrorsForSchema(propItems, v);
                        if (errorMessage) {
                            message += `${v}: ${errorMessage}\n`;
                        }
                    });
                }
                return message;
            };
        }
    }
    return null;
}
function getObjectValidator(prop) {
    if (prop.type === 'object') {
        const { properties, patternProperties, additionalProperties } = prop;
        return value => {
            if (!value) {
                return null;
            }
            const errors = [];
            if (!isObject(value)) {
                errors.push(nls.localize('validations.objectIncorrectType', 'Incorrect type. Expected an object.'));
            }
            else {
                Object.keys(value).forEach((key) => {
                    const data = value[key];
                    if (properties && key in properties) {
                        const errorMessage = getErrorsForSchema(properties[key], data);
                        if (errorMessage) {
                            errors.push(`${key}: ${errorMessage}\n`);
                        }
                        return;
                    }
                    if (patternProperties) {
                        for (const pattern in patternProperties) {
                            if (RegExp(pattern).test(key)) {
                                const errorMessage = getErrorsForSchema(patternProperties[pattern], data);
                                if (errorMessage) {
                                    errors.push(`${key}: ${errorMessage}\n`);
                                }
                                return;
                            }
                        }
                    }
                    if (additionalProperties === false) {
                        errors.push(nls.localize('validations.objectPattern', 'Property {0} is not allowed.\n', key));
                    }
                    else if (typeof additionalProperties === 'object') {
                        const errorMessage = getErrorsForSchema(additionalProperties, data);
                        if (errorMessage) {
                            errors.push(`${key}: ${errorMessage}\n`);
                        }
                    }
                });
            }
            if (errors.length) {
                return prop.errorMessage ? [prop.errorMessage, ...errors].join(' ') : errors.join(' ');
            }
            return '';
        };
    }
    return null;
}
function getErrorsForSchema(propertySchema, data) {
    const validator = createValidator(propertySchema);
    const errorMessage = validator(data);
    return errorMessage;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNWYWxpZGF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy9jb21tb24vcHJlZmVyZW5jZXNWYWxpZGF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBS3hHLFNBQVMsU0FBUyxDQUFDLFNBQWlDLEVBQUUsR0FBRyxLQUF1QjtJQUMvRSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQWM7SUFDcEMsT0FBTyxLQUFLLEtBQUssRUFBRSxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUFDLElBQWtDO0lBQ2pFLE1BQU0sSUFBSSxHQUEyQixLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEYsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMzQyxNQUFNLFNBQVMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJ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