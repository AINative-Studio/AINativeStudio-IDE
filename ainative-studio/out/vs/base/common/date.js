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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN4QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFakQsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2xCLE1BQU0sSUFBSSxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUN0QixNQUFNLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLE1BQU0sS0FBSyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDdkIsTUFBTSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztBQUV2Qjs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSxPQUFPLENBQUMsSUFBbUIsRUFBRSxjQUF3QixFQUFFLGdCQUEwQixFQUFFLFdBQXFCO0lBQ3ZILElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDOUIsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDakUsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNuQixPQUFPLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBSSxFQUFFLENB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