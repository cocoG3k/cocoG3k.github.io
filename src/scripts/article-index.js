import { filterEntries } from "../lib/entries.js";
const form = document.querySelector("#search-form");
const query = document.querySelector("#query");
const sort = document.querySelector("#sort");
const tag = document.querySelector("#tag");
const month = document.querySelector("#month-filter");
const entries = JSON.parse(document.querySelector("#search-data").textContent);
const container = document.querySelector("#entries");
const rows = new Map([...container.children].map((row) => [row.dataset.slug, row]));
const buttons = [...document.querySelectorAll("[data-category]")];
let category = "";
function readURL() {
  const params = new URLSearchParams(location.search);
  query.value = params.get("q") || "";
  sort.value = params.get("sort") === "old" ? "old" : "new";
  // Keep unknown incoming values as an explicit empty result, not an accidental broad search.
  for (const [select, key] of [[tag, "tag"], [month, "month"]]) {
    const value = params.get(key) || "";
    if (value && ![...select.options].some((option) => option.value === value)) {
      select.add(new Option(value, value));
    }
    select.value = value;
  }
  category = params.get("category") || "";
  render(false);
}
function render(updateURL = true) {
  const state = { query: query.value, category, tag: tag.value, month: month.value, sort: sort.value };
  const results = filterEntries(entries, state);
  for (const row of rows.values()) row.hidden = true;
  for (const entry of results) {
    const row = rows.get(entry.slug);
    row.hidden = false;
    container.append(row);
  }
  for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.category === category));
  document.querySelector("#empty").hidden = results.length > 0;
  document.querySelector("#result-count").textContent = results.length ? `1–${results.length} / ${entries.length}件` : `0 / ${entries.length}件`;
  const labels = [state.query.trim() && `検索：${state.query.trim()}`, category && `カテゴリー：${category}`, state.tag && `タグ：${state.tag}`, state.month && `月：${state.month}`, state.sort === "old" && "古い順"].filter(Boolean);
  document.querySelector("#filter-summary").hidden = labels.length === 0;
  document.querySelector("#filter-text").textContent = labels.join(" / ");
  if (state.tag || state.month) document.querySelector("#advanced-filters").open = true;
  if (updateURL) {
    const params = new URLSearchParams();
    for (const [key, value] of [["q", state.query.trim()], ["category", category], ["tag", state.tag], ["month", state.month], ["sort", state.sort === "old" ? "old" : ""]]) if (value) params.set(key, value);
    const next = location.pathname + (params.size ? `?${params}` : "") + location.hash;
    if (next !== location.pathname + location.search + location.hash) history.pushState(null, "", next);
  }
}
form.addEventListener("submit", (event) => { event.preventDefault(); render(); });
// Native search-clear controls should restore results immediately.
query.addEventListener("search", () => { if (!query.value) render(); });
for (const button of buttons) button.addEventListener("click", () => { category = button.dataset.category; render(); });
for (const select of [sort, tag, month]) select.addEventListener("change", () => render());
for (const link of document.querySelectorAll("[data-month]")) link.addEventListener("click", (event) => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault(); month.value = link.dataset.month; render();
});
function reset() {
  query.value = ""; category = ""; tag.value = ""; month.value = ""; sort.value = "new";
  document.querySelector("#advanced-filters").open = false;
  render(); query.focus();
}
form.addEventListener("reset", (event) => { event.preventDefault(); reset(); });
document.querySelector("#empty-reset").addEventListener("click", reset);
window.addEventListener("popstate", readURL);
readURL();
