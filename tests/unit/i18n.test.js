import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LANGUAGES, LANGUAGE_NAMES, currentLanguage, facilityName, facilityNotes, loadLanguage, placeName, resolveLanguage, saveLanguage, setLanguage, t,
} from '../../js/i18n.js';
import { MESSAGES } from '../../js/messages.js';

afterEach(() => setLanguage('ja'));

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
}

test('offers Japanese, English, Chinese and Korean', () => {
  assert.deepEqual(LANGUAGES, ['ja', 'en', 'zh-Hant', 'zh-Hans', 'ko']);
  assert.deepEqual(Object.keys(LANGUAGE_NAMES), LANGUAGES);
  assert.equal(LANGUAGE_NAMES['zh-Hant'], '繁體中文');
});

test('resolveLanguage prefers the URL, then the saved choice, then the device', () => {
  assert.equal(resolveLanguage({ search: '?lang=en', saved: 'ja', deviceLanguages: ['ja-JP'] }), 'en');
  assert.equal(resolveLanguage({ search: '?lang=ko', saved: 'ja', deviceLanguages: ['ja-JP'] }), 'ko');
  assert.equal(resolveLanguage({ search: '?lang=xx', saved: 'zh-Hans', deviceLanguages: ['ja-JP'] }), 'zh-Hans');
  assert.equal(resolveLanguage({ search: '', saved: null, deviceLanguages: ['ja-JP', 'en'] }), 'ja');
  assert.equal(resolveLanguage({ search: '', saved: null, deviceLanguages: ['en-US'] }), 'en');
});

test('resolveLanguage picks Chinese and Korean from the device', () => {
  const fromDevice = (language) => resolveLanguage({ search: '', saved: null, deviceLanguages: [language] });
  assert.equal(fromDevice('zh-TW'), 'zh-Hant');
  assert.equal(fromDevice('zh-HK'), 'zh-Hant');
  assert.equal(fromDevice('zh-Hant-TW'), 'zh-Hant');
  assert.equal(fromDevice('zh-CN'), 'zh-Hans');
  assert.equal(fromDevice('zh'), 'zh-Hans');
  assert.equal(fromDevice('ko-KR'), 'ko');
  assert.equal(fromDevice('fr-FR'), 'en');
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
const KANA = /[\u3040-\u30ff]/;
const HAN = /[\u4e00-\u9fff]/;
const HANGUL = /[\uac00-\ud7af]/;
// 各言語の文言に、ほかの言語の文字が混ざっていないかを確かめる
const FORBIDDEN = { en: [KANA, HAN, HANGUL], 'zh-Hant': [KANA, HANGUL], 'zh-Hans': [KANA, HANGUL], ko: [KANA, HAN] };

test('every language has exactly the Japanese message keys', () => {
  const keys = Object.keys(MESSAGES.ja).sort();
  for (const language of LANGUAGES) {
    assert.deepEqual(Object.keys(MESSAGES[language]).sort(), keys, language);
  }
});

test('every message is written only in its own language', () => {
  for (const [language, patterns] of Object.entries(FORBIDDEN)) {
    for (const [key, text] of Object.entries(MESSAGES[language])) {
      assert.ok(typeof text === 'string' && text.length > 0, `${language} ${key} is empty`);
      for (const pattern of patterns) {
        assert.equal(pattern.test(text), false, `${language} ${key}: ${text}`);
      }
    }
  }
});

test('every language uses the same parameters in each message', () => {
  const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const language of LANGUAGES) {
    for (const key of Object.keys(MESSAGES.ja)) {
      assert.deepEqual(params(MESSAGES[language][key]), params(MESSAGES.ja[key]), `${language} ${key}`);
    }
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
