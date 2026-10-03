import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { filterEntries, categoryOf, searchableBody } from '../src/lib/entries.js';
const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const initial = new JSDOM(html);
const entries = JSON.parse(initial.window.document.querySelector('#search-data').textContent);
const script = initial.window.document.querySelector('script[type="module"]').textContent;
const ids = (items) => items.map((item) => item.slug);
function dom(search = '') {
  const result = new JSDOM(html, { url: `https://cocog.dev/diary${search}`, runScripts: 'outside-only' });
  result.window.eval(script);
  const { document } = result.window;
  const $ = (selector) => document.querySelector(selector);
  const visible = () => [...document.querySelectorAll('.entry:not([hidden])')].map((el) => el.dataset.slug);
  const change = (selector, value) => { $(selector).value = value; $(selector).dispatchEvent(new result.window.Event('change', { bubbles: true })); };
  const searchFor = (query) => { $('#query').value = query; $('#search-form').dispatchEvent(new result.window.Event('submit', { bubbles: true, cancelable: true })); };
  return { ...result, window: result.window, $, visible, change, searchFor };
}
test('all four preserved articles appear newest first', () => {
  assert.deepEqual(ids(filterEntries(entries)), ['2026-01-27','2026-01-26','2026-01-23-0','2026-01-22-cold']);
});
test('body-only search, title search, and description search', () => {
  assert.deepEqual(ids(filterEntries(entries,{query:'ドメイン'})), ['2026-01-23-0']);
  assert.deepEqual(ids(filterEntries(entries,{query:'寒波'})), ['2026-01-22-cold']);
  assert.deepEqual(ids(filterEntries(entries,{query:'Something New'})), ['2026-01-27']);
});
test('NFKC / case-insensitive search and AND terms', () => {
  assert.deepEqual(ids(filterEntries(entries,{query:'ＢＬＡＣＫ　ｍｉｄｉ'})), ['2026-01-27']);
  assert.equal(filterEntries(entries,{query:'black ドメイン'}).length, 0);
});
test('combined category, tag, month, query, and oldest sorting', () => {
  assert.deepEqual(ids(filterEntries(entries,{query:'聴いた',category:'曲紹介',tag:'曲紹介',month:'2026-01',sort:'old'})), ['2026-01-26','2026-01-27']);
  assert.equal(filterEntries(entries,{category:'日記',tag:'曲紹介'}).length,0);
  assert.equal(filterEntries(entries,{month:'2026-02'}).length,0);
});
test('optional categories and tags behave sensibly for future articles', () => {
  assert.equal(categoryOf({tags:['日記','生活']}), '日記');
  assert.equal(categoryOf({category:'制作',tags:['Astro']}),'制作');
  assert.equal(categoryOf({}), '未分類');
  const source=[{slug:'a',date:'2026-02-02',title:'A',body:'',tags:['生活'],category:'日記'},{slug:'b',date:'2026-03-01',title:'B',body:'',tags:[]}];
  assert.deepEqual(ids(filterEntries(source,{month:'2026-02',tag:'生活',category:'日記'})),['a']);
  assert.equal(source[0].slug,'a');
});
test('search body excludes iframe URLs but preserves words', () => {
  assert.equal(searchableBody('word <iframe src="secret"></iframe> [link](url)'), 'word    link');
});
test('real built DOM wires title/body search and empty reset', () => {
  const d=dom(); d.searchFor('ドメイン'); assert.deepEqual(d.visible(),['2026-01-23-0']);
  d.searchFor('no-results-123'); assert.deepEqual(d.visible(),[]); assert.equal(d.$('#empty').hidden,false);
  assert.equal(d.$('#result-count').textContent,'0 / 4件');
  d.$('#empty-reset').click(); assert.equal(d.visible().length,4); assert.equal(d.$('#query').value,''); assert.equal(d.window.location.search,'');
  assert.equal(d.$('#filter-summary').hidden,true); d.window.close();
});
test('real built DOM combines and resets controls, handles repeated click', () => {
  const d=dom(); d.$('[data-category="曲紹介"]').click(); d.$('[data-category="曲紹介"]').click();
  d.change('#tag','曲紹介'); d.$('[data-month="2026-01"]').click(); d.change('#sort','old'); d.searchFor('聴いた');
  assert.deepEqual(d.visible(),['2026-01-26','2026-01-27']);
  assert.equal(d.$('[data-category="曲紹介"]').getAttribute('aria-pressed'),'true');
  assert.equal(d.$('#advanced-filters').open,true);
  d.$('button[type="reset"]').click(); assert.equal(d.visible().length,4); assert.equal(d.$('#sort').value,'new'); assert.equal(d.$('#month-filter').value,''); assert.equal(d.$('#tag').value,'');
  assert.equal(d.$('#advanced-filters').open,false); d.window.close();
});
test('URL restoration, unknown values and back/forward state handler', () => {
  const d=dom('?q=聴いた&category=曲紹介&tag=曲紹介&month=2026-01&sort=old'); assert.deepEqual(d.visible(),['2026-01-26','2026-01-27']);
  d.window.history.pushState(null,'','?q=ドメイン'); d.window.dispatchEvent(new d.window.PopStateEvent('popstate')); assert.deepEqual(d.visible(),['2026-01-23-0']);
  d.window.history.pushState(null,'','?month=1900-01'); d.window.dispatchEvent(new d.window.PopStateEvent('popstate')); assert.equal(d.visible().length,0);
  d.window.close();
});
test('untrusted query is rendered only as text', () => {
  const d=dom(); d.searchFor('<img src=x onerror=alert(1)>'); assert.equal(d.$('#filter-text img'),null); assert.equal(d.visible().length,0); d.window.close();
});
test('all internal routes exist; metadata and preserved Giscus/Spotify settings', () => {
  let embeds=0;
  for (const route of ['','diary','about','contact',...entries.map((e)=>`diary/${e.slug}`)]) {
    const page=fs.readFileSync(new URL(`../dist/${route ? route+'/' : ''}index.html`,import.meta.url),'utf8');
    const doc=new JSDOM(page).window.document;
    assert.match(doc.title,/cocoG学入門/); assert.match(doc.querySelector('link[rel="canonical"]').href,/^https:\/\/cocog.dev\//);
    for (const a of doc.querySelectorAll('a[href^="/"]')) {
      const path=new URL(a.href,'https://cocog.dev').pathname;
      assert.ok(fs.existsSync(new URL(`../dist${path.replace(/\/$/,'')}/index.html`,import.meta.url)),path);
    }
    if(route.startsWith('diary/')) {
      const giscus=doc.querySelector('script[src="https://giscus.app/client.js"]');
      assert.equal(giscus.dataset.mapping,'url'); assert.equal(giscus.dataset.repo,'cocoG3k/cocoG3k.github.io'); assert.equal(giscus.dataset.categoryId,'DIC_kwDOQ9VG084C1UDu');
      embeds+=doc.querySelectorAll('iframe[src^="https://open.spotify.com/embed/"]').length;
    }
  }
  assert.equal(embeds,7);
});
