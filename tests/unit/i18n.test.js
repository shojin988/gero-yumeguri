import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LANGUAGES, currentLanguage, facilityName, facilityNotes, loadLanguage, placeName, resolveLanguage, saveLanguage, setLanguage, t,
} from '../../js/i18n.js';
import { MESSAGES } from '../../js/messages.js';

afterEach(() => setLanguage('ja'));

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
}

test('offers Japanese and English', () => {
  assert.deepEqual(LANGUAGES, ['ja', 'en']);
});

test('resolveLanguage prefers the URL, then the saved choice, then the device', () => {
  assert.equal(resolveLanguage({ search: '?lang=en', saved: 'ja', deviceLanguages: ['ja-JP'] }), 'en');
  assert.equal(resolveLanguage({ search: '?lang=xx', saved: 'en', deviceLanguages: ['ja-JP'] }), 'en');
  assert.equal(resolveLanguage({ search: '', saved: null, deviceLanguages: ['ja-JP', 'en'] }), 'ja');
  assert.equal(resolveLanguage({ search: '', saved: null, deviceLanguages: ['en-US'] }), 'en');
});

test('resolveLanguage uses English for devices that are not set to Japanese', () => {
  assert.equal(resolveLanguage({ search: '', saved: null, deviceLanguages: ['zh-TW'] }), 'en');
  assert.equal(resolveLanguage({ search: '', saved: null, deviceLanguages: ['ko'] }), 'en');
});

test('resolveLanguage falls back to Japanese without any hint', () => {
  assert.equal(resolveLanguage({ search: '', saved: null, deviceLanguages: [] }), 'ja');
  assert.equal(resolveLanguage({}), 'ja');
});

test('saveLanguage and loadLanguage remember only supported languages', () => {
  const storage = memoryStorage();
  assert.equal(loadLanguage(storage), null);
  assert.equal(saveLanguage('en', storage), true);
  assert.equal(loadLanguage(storage), 'en');
  assert.equal(loadLanguage(memoryStorage({ 'gero-yumeguri:language:v1': 'fr' })), null);
  assert.equal(loadLanguage(null), null);
  assert.equal(saveLanguage('en', null), false);
});

test('loadLanguage survives a storage that throws', () => {
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.equal(loadLanguage(broken), null);
  assert.equal(saveLanguage('en', broken), false);
});

test('t fills in parameters in the current language', () => {
  assert.equal(t('card.hours', { hours: '12:00〜14:00' }), '手形の時間：12:00〜14:00');
  setLanguage('en');
  assert.equal(currentLanguage(), 'en');
  assert.equal(t('card.hours', { hours: '12:00–14:00' }), 'Pass hours: 12:00–14:00');
});

test('t returns the key when a message is missing', () => {
  assert.equal(t('no.such.key'), 'no.such.key');
});

test('setLanguage ignores unsupported languages', () => {
  setLanguage('fr');
  assert.equal(currentLanguage(), 'ja');
});

// 言語の切り替えボタンだけは、切り替え先の言語（日本語）で書く
const NATIVE_NAME_KEYS = new Set(['header.language']);

test('Japanese and English have exactly the same message keys', () => {
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), Object.keys(MESSAGES.ja).sort());
  for (const [key, text] of Object.entries(MESSAGES.en)) {
    assert.ok(typeof text === 'string' && text.length > 0, `${key} is empty`);
    if (NATIVE_NAME_KEYS.has(key)) {
      continue;
    }
    assert.equal(/[぀-ヿ一-鿿]/.test(text), false, `${key} contains Japanese: ${text}`);
  }
});

test('Japanese and English use the same parameters in each message', () => {
  const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const key of Object.keys(MESSAGES.ja)) {
    assert.deepEqual(params(MESSAGES.en[key]), params(MESSAGES.ja[key]), key);
  }
});

const FACILITY = { name: '水明館', notes: ['駐車場利用不可'], i18n: { en: { name: 'Suimeikan', notes: ['No parking for pass users'] } } };

test('facility text follows the current language and falls back to Japanese', () => {
  assert.equal(facilityName(FACILITY), '水明館');
  assert.deepEqual(facilityNotes(FACILITY), ['駐車場利用不可']);
  setLanguage('en');
  assert.equal(facilityName(FACILITY), 'Suimeikan');
  assert.deepEqual(facilityNotes(FACILITY), ['No parking for pass users']);
  assert.equal(facilityName({ name: '名前だけ', notes: [] }), '名前だけ');
  assert.deepEqual(facilityNotes({ name: '名前だけ', notes: ['メモ'] }), ['メモ']);
});

test('placeName translates places such as the station', () => {
  const station = { name: '下呂駅', i18n: { en: { name: 'Gero Station' } } };
  assert.equal(placeName(station), '下呂駅');
  setLanguage('en');
  assert.equal(placeName(station), 'Gero Station');
});
