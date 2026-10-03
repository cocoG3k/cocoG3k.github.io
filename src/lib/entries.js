/** Shared by Astro, the browser, and the regression tests. */
export const categoryOf = (entry) => entry.category || entry.tags?.[0] || "未分類";
export const normalize = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja");
export function filterEntries(entries, { query = "", category = "", tag = "", month = "", sort = "new" } = {}) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    const haystack = normalize([entry.title, entry.description, entry.body, ...(entry.tags || [])].join(" "));
    return terms.every((term) => haystack.includes(term)) &&
      (!category || categoryOf(entry) === category) &&
      (!tag || entry.tags?.includes(tag)) && (!month || entry.date.slice(0, 7) === month);
  }).sort((a, b) => (sort === "old" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.slug.localeCompare(b.slug));
}
// Exclude markup and embed URLs, while retaining the complete article text.
export const searchableBody = (body) => body.replace(/<[^>]*>/g, " ").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
