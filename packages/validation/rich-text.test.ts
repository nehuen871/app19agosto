import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeRich, encodeRich, richPlain, richText, safeRichLink, type RichNode } from '@utn/types';
import { newsSummary, newsContent } from './index';
const text = (value: string): RichNode => ({ type: 'text', text: value });
const paragraph = (value: string): RichNode => ({ type: 'paragraph', content: [text(value)] });
const document = (content: RichNode[]): RichNode => ({ type: 'doc', content });
test('content accepts 20000 text characters while summary keeps its own 500 limit', () => {
  const content = encodeRich(document([paragraph('á'.repeat(20000))]));
  assert.ok(newsContent.safeParse(content).success);
  assert.equal(newsSummary.safeParse(content).success, false);
  assert.equal(newsContent.safeParse(encodeRich(document([paragraph('a'.repeat(20001))]))).success, false);
  assert.equal(newsContent.safeParse('a'.repeat(20001)).success, false);
  assert.equal(newsContent.safeParse(encodeRich(document([{ type: 'script', text: 'alert(1)' }]))).success, false);
  assert.equal(newsContent.parse('Contenido anterior'), 'Contenido anterior');
});
test('legacy text remains compatible and rich text keeps Word-style formatting', () => {
  assert.equal(newsSummary.parse('Resumen anterior'), 'Resumen anterior');
  const doc = document([{ ...paragraph('Inscripciones'), attrs: { indent: 2, textAlign: 'center' }, content: [{ ...text('Inscripciones'), marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }, { type: 'strike' }, { type: 'textStyle', attrs: { color: '#1F5AAA', backgroundColor: '#EDAA37', fontSize: '22px', fontFamily: 'Archivo' } }, { type: 'link', attrs: { href: 'https://frba.utn.edu.ar/' } }] }] }, { type: 'orderedList', attrs: { start: 1 }, content: [{ type: 'listItem', content: [paragraph('Primera fecha')] }] }]);
  const saved = newsSummary.parse(encodeRich(doc));
  assert.equal(richText(saved), 'Inscripciones\nPrimera fecha');
  const parsed = decodeRich(saved)!;
  assert.equal(parsed.content?.[0].attrs?.indent, 2);
  assert.equal(parsed.content?.[0].content?.[0].marks?.find(mark => mark.type === 'link')?.attrs?.rel, 'noopener noreferrer nofollow');
});
test('500 visible characters are allowed; 501, empty text and oversized payloads fail', () => {
  assert.ok(newsSummary.safeParse(encodeRich(document([paragraph('a'.repeat(500))]))).success);
  for (const value of [' ', 'a'.repeat(501), encodeRich(document([paragraph('a'.repeat(501))])), encodeRich(document([paragraph('')])), 'a'.repeat(64001)]) assert.equal(newsSummary.safeParse(value).success, false);
  assert.equal(richPlain(document([paragraph('a'), paragraph('b')])), 'a\nb');
});
test('rich text rejects scripts, handlers, unknown styles and unsafe hyperlinks', () => {
  const malicious = [document([{ type: 'script', text: 'alert(1)' }]), document([{ ...paragraph('x'), attrs: { onclick: 'alert(1)' } }]), document([{ type: 'paragraph', content: [{ ...text('x'), marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }]), document([{ type: 'paragraph', content: [{ ...text('x'), marks: [{ type: 'textStyle', attrs: { color: 'url(javascript:alert(1))' } }] }] }])];
  for (const doc of malicious) assert.equal(newsSummary.safeParse(encodeRich(doc)).success, false);
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//evil.test', 'https://user:password@example.test', 'https://example.test/\nscript']) assert.equal(safeRichLink(url), false);
  assert.ok(safeRichLink('mailto:info@frba.utn.edu.ar'));
  assert.equal(richText('<img src=x onerror=alert(1)>'), '<img src=x onerror=alert(1)>');
});
