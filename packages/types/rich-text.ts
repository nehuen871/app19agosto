export interface RichMark { type: string; attrs?: Record<string, string> }
export interface RichNode { type: string; text?: string; attrs?: Record<string, string | number>; marks?: RichMark[]; content?: RichNode[] }
export const richPrefix = '@utn/rich-text:1:';
export const richLimit = 500;
export const richContentLimit = 20000;
export const richStorageLimit = 64000;
export const richContentStorageLimit = 256000;
const blocks = ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote'];
export function safeRichLink(value: string) {
  if (Array.from(value).some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) return false;
  try { const url = new URL(value); return ['https:', 'http:', 'mailto:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
export function richPlain(node: RichNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(richPlain).join(['paragraph', 'heading'].includes(node.type) ? '' : '\n');
}
export function plainDocument(value: string): RichNode { return { type: 'doc', content: value.split('\n').map(text => ({ type: 'paragraph', ...(text ? { content: [{ type: 'text', text }] } : {}) })) }; }
export function validateRichDocument(value: unknown): RichNode | null {
  let count = 0;
  function object(item: unknown): item is Record<string, unknown> { return typeof item === 'object' && item !== null && !Array.isArray(item); }
  function visit(item: unknown, parent: string, depth: number): RichNode {
    if (!object(item) || ++count > 6000 || depth > 24 || typeof item.type !== 'string' || Object.keys(item).some(key => !['type', 'text', 'content', 'marks', 'attrs'].includes(key))) throw new Error('Invalid node');
    const type = item.type;
    const allowed = parent === '' ? ['doc'] : ['paragraph', 'heading'].includes(parent) ? ['text', 'hardBreak'] : ['bulletList', 'orderedList'].includes(parent) ? ['listItem'] : parent === 'listItem' ? ['paragraph', 'bulletList', 'orderedList'] : blocks;
    if (!allowed.includes(type)) throw new Error('Invalid structure');
    const node: RichNode = { type };
    if (type === 'text') { if (typeof item.text !== 'string' || !item.text) throw new Error('Invalid text'); node.text = item.text; }
    else if (item.text !== undefined) throw new Error('Unexpected text');
    if (item.attrs !== undefined) {
      if (!object(item.attrs)) throw new Error('Invalid attributes');
      const attrs: Record<string, string | number> = {};
      for (const [key, value] of Object.entries(item.attrs)) {
        const validKey = (['paragraph', 'heading'].includes(type) && ['textAlign', 'indent'].includes(key)) || (type === 'heading' && key === 'level') || (type === 'orderedList' && ['start', 'type'].includes(key));
        if (!validKey) throw new Error('Unknown attribute');
        if (value === null) continue;
        if (key === 'textAlign' && !['left', 'center', 'right', 'justify'].includes(String(value))) throw new Error('Invalid alignment');
        if (key === 'indent' && (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 6)) throw new Error('Invalid indent');
        if (key === 'level' && ![2, 3].includes(Number(value))) throw new Error('Invalid heading');
        if (key === 'start' && (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 999)) throw new Error('Invalid list');
        if (key === 'type' && !['1', 'a', 'A', 'i', 'I'].includes(String(value))) throw new Error('Invalid list type');
        attrs[key] = value as string | number;
      }
      if (Object.keys(attrs).length) node.attrs = attrs;
    }
    if (item.marks !== undefined) {
      if (type !== 'text' || !Array.isArray(item.marks) || item.marks.length > 6) throw new Error('Invalid marks');
      node.marks = item.marks.map(mark => {
        if (!object(mark) || typeof mark.type !== 'string' || !['bold', 'italic', 'underline', 'strike', 'link', 'textStyle'].includes(mark.type) || Object.keys(mark).some(key => !['type', 'attrs'].includes(key))) throw new Error('Invalid mark');
        const result: RichMark = { type: mark.type };
        if (mark.attrs !== undefined) {
          if (!object(mark.attrs)) throw new Error('Invalid mark attributes');
          const attrs: Record<string, string> = {};
          for (const [key, value] of Object.entries(mark.attrs)) {
            const allowedKeys = mark.type === 'link' ? ['href', 'target', 'rel', 'class', 'title'] : mark.type === 'textStyle' ? ['color', 'backgroundColor', 'fontSize', 'fontFamily'] : [];
            if (!allowedKeys.includes(key)) throw new Error('Unknown mark attribute');
            if (value === null) continue;
            if (typeof value !== 'string') throw new Error('Invalid style');
            if (key === 'href' && !safeRichLink(value)) throw new Error('Unsafe link');
            if (key === 'title' && value.length > 200) throw new Error('Invalid link title');
            if (['color', 'backgroundColor'].includes(key) && !/^#[a-f0-9]{6}$/i.test(value)) throw new Error('Invalid color');
            if (key === 'fontSize' && !['14px', '16px', '18px', '22px', '28px'].includes(value)) throw new Error('Invalid size');
            if (key === 'fontFamily' && !['Libre Franklin', 'Archivo Black', 'Libre Baskerville', 'Archivo'].includes(value)) throw new Error('Invalid font');
            if (mark.type === 'textStyle' || ['href', 'title'].includes(key)) attrs[key] = value;
          }
          if (mark.type === 'link') { if (!attrs.href) throw new Error('Missing link'); attrs.target = '_blank'; attrs.rel = 'noopener noreferrer nofollow'; }
          if (Object.keys(attrs).length) result.attrs = attrs;
        } else if (mark.type === 'link') throw new Error('Missing link');
        return result;
      });
    }
    if (item.content !== undefined) {
      if (['text', 'hardBreak'].includes(type) || !Array.isArray(item.content)) throw new Error('Invalid children');
      node.content = item.content.map(child => visit(child, type, depth + 1));
    }
    if (['doc', 'bulletList', 'orderedList', 'listItem', 'blockquote'].includes(type) && !node.content?.length) throw new Error('Empty block');
    if (type === 'listItem' && node.content?.[0].type !== 'paragraph') throw new Error('Invalid list item');
    return node;
  }
  try { return visit(value, '', 0); } catch { return null; }
}
export function decodeRich(value: string): RichNode | null {
  if (!value.startsWith(richPrefix)) return plainDocument(value);
  if (value.length > richContentStorageLimit) return null;
  try { return validateRichDocument(JSON.parse(value.slice(richPrefix.length))); } catch { return null; }
}
export function richText(value: string) { const doc = decodeRich(value); return doc ? richPlain(doc) : value; }
export function encodeRich(doc: RichNode) { return richPrefix + JSON.stringify(doc); }
