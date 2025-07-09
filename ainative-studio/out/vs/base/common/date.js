/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { LANGUAGE_DEFAULT } from './platform.js';
const minute = 60;
const hour = minute * 60;
const day = hour * 24;
const week = day * 7;
const month = day * 30;
const year = day * 365;
/**
 * Create a localized difference of the time between now and the specified date.
 * @param date The date to generate the difference from.
 * @param appendAgoLabel Whether to append the " ago" to the end.
 * @param useFullTimeWords Whether to use full words (eg. seconds) instead of
 * shortened (eg. secs).
 * @param disallowNow Whether to disallow the string "now" when the difference
 * is less than 30 seconds.
 */
export function fromNow(date, appendAgoLabel, useFullTimeWords, disallowNow) {
    if (typeof date !== 'number') {
        date = date.getTime();
    }
    const seconds = Math.round((new Date().getTime() - date) / 1000);
    if (seconds < -30) {
        return localize('date.fromNow.in', 'in {0}', fromNow(new Date().getTime() + seconds * 1000, false));
    }
    if (!disallowNow && seconds < 30) {
        return localize('date.fromNow.now', 'now');
    }
    let value;
    if (seconds < minute) {
        value = seconds;
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.seconds.singular.ago.fullWord', '{0} second ago', value)
                    : localize('date.fromNow.seconds.singular.ago', '{0} sec ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.seconds.plural.ago.fullWord', '{0} seconds ago', value)
                    : localize('date.fromNow.seconds.plural.ago', '{0} secs ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.seconds.singular.fullWord', '{0} second', value)
                    : localize('date.fromNow.seconds.singular', '{0} sec', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.seconds.plural.fullWord', '{0} seconds', value)
                    : localize('date.fromNow.seconds.plural', '{0} secs', value);
            }
        }
    }
    if (seconds < hour) {
        value = Math.floor(seconds / minute);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.minutes.singular.ago.fullWord', '{0} minute ago', value)
                    : localize('date.fromNow.minutes.singular.ago', '{0} min ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.minutes.plural.ago.fullWord', '{0} minutes ago', value)
                    : localize('date.fromNow.minutes.plural.ago', '{0} mins ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.minutes.singular.fullWord', '{0} minute', value)
                    : localize('date.fromNow.minutes.singular', '{0} min', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.minutes.plural.fullWord', '{0} minutes', value)
                    : localize('date.fromNow.minutes.plural', '{0} mins', value);
            }
        }
    }
    if (seconds < day) {
        value = Math.floor(seconds / hour);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.hours.singular.ago.fullWord', '{0} hour ago', value)
                    : localize('date.fromNow.hours.singular.ago', '{0} hr ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.hours.plural.ago.fullWord', '{0} hours ago', value)
                    : localize('date.fromNow.hours.plural.ago', '{0} hrs ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.hours.singular.fullWord', '{0} hour', value)
                    : localize('date.fromNow.hours.singular', '{0} hr', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.hours.plural.fullWord', '{0} hours', value)
                    : localize('date.fromNow.hours.plural', '{0} hrs', value);
            }
        }
    }
    if (seconds < week) {
        value = Math.floor(seconds / day);
        if (appendAgoLabel) {
            return value === 1
                ? localize('date.fromNow.days.singular.ago', '{0} day ago', value)
                : localize('date.fromNow.days.plural.ago', '{0} days ago', value);
        }
        else {
            return value === 1
                ? localize('date.fromNow.days.singular', '{0} day', value)
                : localize('date.fromNow.days.plural', '{0} days', value);
        }
    }
    if (seconds < month) {
        value = Math.floor(seconds / week);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.weeks.singular.ago.fullWord', '{0} week ago', value)
                    : localize('date.fromNow.weeks.singular.ago', '{0} wk ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.weeks.plural.ago.fullWord', '{0} weeks ago', value)
                    : localize('date.fromNow.weeks.plural.ago', '{0} wks ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.weeks.singular.fullWord', '{0} week', value)
                    : localize('date.fromNow.weeks.singular', '{0} wk', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.weeks.plural.fullWord', '{0} weeks', value)
                    : localize('date.fromNow.weeks.plural', '{0} wks', value);
            }
        }
    }
    if (seconds < year) {
        value = Math.floor(seconds / month);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.months.singular.ago.fullWord', '{0} month ago', value)
                    : localize('date.fromNow.months.singular.ago', '{0} mo ago', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.months.plural.ago.fullWord', '{0} months ago', value)
                    : localize('date.fromNow.months.plural.ago', '{0} mos ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? localize('date.fromNow.months.singular.fullWord', '{0} month', value)
                    : localize('date.fromNow.months.singular', '{0} mo', value);
            }
            else {
                return useFullTimeWords
                    ? localize('date.fromNow.months.plural.fullWord', '{0} months', value)
                    : localize('date.fromNow.months.plural', '{0} mos', value);
            }
        }
    }
    value = Math.floor(seconds / year);
    if (appendAgoLabel) {
        if (value === 1) {
            return useFullTimeWords
                ? localize('date.fromNow.years.singular.ago.fullWord', '{0} year ago', value)
                : localize('date.fromNow.years.singular.ago', '{0} yr ago', value);
        }
        else {
            return useFullTimeWords
                ? localize('date.fromNow.years.plural.ago.fullWord', '{0} years ago', value)
                : localize('date.fromNow.years.plural.ago', '{0} yrs ago', value);
        }
    }
    else {
        if (value === 1) {
            return useFullTimeWords
                ? localize('date.fromNow.years.singular.fullWord', '{0} year', value)
                : localize('date.fromNow.years.singular', '{0} yr', value);
        }
        else {
            return useFullTimeWords
                ? localize('date.fromNow.years.plural.fullWord', '{0} years', value)
                : localize('date.fromNow.years.plural', '{0} yrs', value);
        }
    }
}
export function fromNowByDay(date, appendAgoLabel, useFullTimeWords) {
    if (typeof date !== 'number') {
        date = date.getTime();
    }
    const todayMidnightTime = new Date();
    todayMidnightTime.setHours(0, 0, 0, 0);
    const yesterdayMidnightTime = new Date(todayMidnightTime.getTime());
    yesterdayMidnightTime.setDate(yesterdayMidnightTime.getDate() - 1);
    if (date > todayMidnightTime.getTime()) {
        return localize('today', 'Today');
    }
    if (date > yesterdayMidnightTime.getTime()) {
        return localize('yesterday', 'Yesterday');
    }
    return fromNow(date, appendAgoLabel, useFullTimeWords);
}
/**
 * Gets a readable duration with intelligent/lossy precision. For example "40ms" or "3.040s")
 * @param ms The duration to get in milliseconds.
 * @param useFullTimeWords Whether to use full words (eg. seconds) instead of
 * shortened (eg. secs).
 */
export function getDurationString(ms, useFullTimeWords) {
    const seconds = Math.abs(ms / 1000);
    if (seconds < 1) {
        return useFullTimeWords
            ? localize('duration.ms.full', '{0} milliseconds', ms)
            : localize('duration.ms', '{0}ms', ms);
    }
    if (seconds < minute) {
        return useFullTimeWords
            ? localize('duration.s.full', '{0} seconds', Math.round(ms) / 1000)
            : localize('duration.s', '{0}s', Math.round(ms) / 1000);
    }
    if (seconds < hour) {
        return useFullTimeWords
            ? localize('duration.m.full', '{0} minutes', Math.round(ms / (1000 * minute)))
            : localize('duration.m', '{0} mins', Math.round(ms / (1000 * minute)));
    }
    if (seconds < day) {
        return useFullTimeWords
            ? localize('duration.h.full', '{0} hours', Math.round(ms / (1000 * hour)))
            : localize('duration.h', '{0} hrs', Math.round(ms / (1000 * hour)));
    }
    return localize('duration.d', '{0} days', Math.round(ms / (1000 * day)));
}
export function toLocalISOString(date) {
    return date.getFullYear() +
        '-' + String(date.getMonth() + 1).padStart(2, '0') +
        '-' + String(date.getDate()).padStart(2, '0') +
        'T' + String(date.getHours()).padStart(2, '0') +
        ':' + String(date.getMinutes()).padStart(2, '0') +
        ':' + String(date.getSeconds()).padStart(2, '0') +
        '.' + (date.getMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
}
export const safeIntl = {
    DateTimeFormat(locales, options) {
        try {
            return new Intl.DateTimeFormat(locales, options);
        }
        catch {
            return new Intl.DateTimeFormat(undefined, options);
        }
    },
    Collator(locales, options) {
        try {
            return new Intl.Collator(locales, options);
        }
        catch {
            return new Intl.Collator(undefined, options);
        }
    },
    Segmenter(locales, options) {
        try {
            return new Intl.Segmenter(locales, options);
        }
        catch {
            return new Intl.Segmenter(undefined, options);
        }
    },
    Locale(tag, options) {
        try {
            return new Intl.Locale(tag, options);
        }
        catch {
            return new Intl.Locale(LANGUAGE_DEFAULT, options);
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9kYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDeEMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRWpELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUNsQixNQUFNLElBQUksR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ3pCLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7QUFDdEIsTUFBTSxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUNyQixNQUFNLEtBQUssR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ3ZCLE1BQU0sSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUM7QUFFdkI7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLFVBQVUsT0FBTyxDQUFDLElBQW1CLEVBQUUsY0FBd0IsRUFBRSxnQkFBMEIsRUFBRSxXQUFxQjtJQUN2SCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzlCLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2pFLElBQUksT0FBTyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkIsT0FBTyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksRUFBRSxD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