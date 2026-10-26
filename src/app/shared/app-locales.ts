import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEt from '@angular/common/locales/et';
import localeEl from '@angular/common/locales/el';
import localeNo from '@angular/common/locales/no';
import localePl from '@angular/common/locales/pl';
import localeUk from '@angular/common/locales/uk';

/**
 * Maps the app's UI language codes (TranslateService: en, ee, gr, no, pl, ua) to the
 * CLDR locale ids that Angular's DatePipe / formatDate understand.
 *
 * The app codes are NOT ISO codes: CLDR "ee" is Ewe (not Estonian) and "ua" does not
 * exist (Ukrainian is "uk"). Until 2026-08-31 the app registered the Ewe and ru-UA
 * (Russian) data under those keys, so Estonian pages showed Ewe month names and
 * Ukrainian pages Russian ones. Keep this mapping the single meeting point of the two
 * code sets.
 */
export const APP_LOCALE_IDS: { readonly [lang: string]: string } = {
  en: 'en',
  ee: 'et',
  gr: 'el',
  no: 'no',
  pl: 'pl',
  ua: 'uk',
};

/** DatePipe locale argument for an app language code (English when unknown). */
export function dateLocale(lang: string | null | undefined): string {
  return (lang && APP_LOCALE_IDS[lang]) || 'en';
}

let registered = false;

/** Registers the CLDR data for all six UI languages exactly once (called from AppModule). */
export function registerAppLocales(): void {
  if (registered) { return; }
  registered = true;
  registerLocaleData(localeEn, 'en');
  registerLocaleData(localeEt, 'et');
  registerLocaleData(localeEl, 'el');
  registerLocaleData(localeNo, 'no');
  registerLocaleData(localePl, 'pl');
  registerLocaleData(localeUk, 'uk');
  // Legacy aliases: templates should use dateLocale(lang), but a stray
  // `| date : ... : 'ee'` must never throw "Missing locale data" at runtime.
  registerLocaleData(localeEt, 'ee');
  registerLocaleData(localeEl, 'gr');
  registerLocaleData(localeUk, 'ua');
}
