import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLangFromUrl, localizedPath, defaultLang, locales } from './routing.ts';

test('defaultLang is es and locales lists es then en', () => {
  assert.equal(defaultLang, 'es');
  assert.deepEqual([...locales], ['es', 'en']);
});

test('getLangFromUrl: root is default locale', () => {
  assert.equal(getLangFromUrl(new URL('http://x/')), 'es');
});

test('getLangFromUrl: /en/ prefix is en', () => {
  assert.equal(getLangFromUrl(new URL('http://x/en/')), 'en');
  assert.equal(getLangFromUrl(new URL('http://x/en')), 'en');
});

test('getLangFromUrl: unknown or default prefix falls back to es', () => {
  assert.equal(getLangFromUrl(new URL('http://x/es/')), 'es');
  assert.equal(getLangFromUrl(new URL('http://x/blog/post')), 'es');
});

test('localizedPath: default locale is unprefixed', () => {
  assert.equal(localizedPath('/', 'es'), '/');
  assert.equal(localizedPath('/about', 'es'), '/about');
});

test('localizedPath: en is prefixed, root keeps trailing slash', () => {
  assert.equal(localizedPath('/', 'en'), '/en/');
  assert.equal(localizedPath('/about', 'en'), '/en/about');
  assert.equal(localizedPath('about', 'en'), '/en/about');
});
