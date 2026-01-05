/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Validates email format using a standard email regex pattern
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Validates password meets minimum length requirement
 */
export function isValidPassword(password, minLength = 8) {
    return password.length >= minLength;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvYnJvd3Nlci9yZWFjdC9zcmMvdXRpbC92YWxpZGF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxLQUFhO0lBQ3pDLE1BQU0sVUFBVSxHQUFHLDRCQUE0QixDQUFDO0lBQ2hELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsZUFBZSxDQUFDLFFBQWdCLEVBQUUsWUFBb0IsQ0FBQztJQUN0RSxPQUFPLFFBQVEsQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDO0FBQ3JDLENBQUMifQ==