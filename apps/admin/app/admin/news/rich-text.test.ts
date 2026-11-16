import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { encodeRich, decodeRich, richText, validateRichDocument } from '@utn/api-client';

test('real editor defaults preserve styled hyperlinks and lists through the shared codec', () => {
  const schema = getSchema([StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, horizontalRule: false }), TextStyleKit.configure({ lineHeight: false }), TextAlign.configure({ types: ['paragraph', 'heading'] })]);
  const node = schema.nodeFromJSON({ type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'Consultar fechas', marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://frba.utn.edu.ar/' } }, { type: 'textStyle', attrs: { color: '#1F5AAA', fontSize: '22px' } }] }] }] }] }, { type: 'paragraph' }] });
  const parsed = validateRichDocument(node.toJSON());
  assert.ok(parsed, 'The actual editor schema must be accepted by the API and mobile renderer');
  const stored = encodeRich(parsed);
  assert.ok(decodeRich(stored));
  assert.equal(richText(stored), 'Consultar fechas\n');
});
