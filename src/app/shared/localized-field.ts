/**
 * Strapi content carries one field per language: `title` (English) plus
 * `title_ee`, `title_gr`, `title_no`, `title_pl`, `title_ua` (same for other fields).
 * Returns the value for `lang`, falling back to the English field when the
 * translation is missing or empty — older news items / newsletters have
 * `title_xx = null`, and an empty card title or page heading is never acceptable.
 */
export function localizedField(item: any, field: string, lang: string | null | undefined): string {
  if (!item) { return ''; }
  const localized = lang && lang !== 'en' ? item[`${field}_${lang}`] : undefined;
  if (typeof localized === 'string' && localized.trim().length > 0) { return localized; }
  const base = item[field];
  return typeof base === 'string' ? base : '';
}
