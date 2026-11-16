'use client';
import { useEffect, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { Plugin } from '@tiptap/pm/state';
import { brand, spacing, typography } from '@utn/design-tokens';
import { decodeRich, encodeRich, plainDocument, richPlain, richLimit, safeRichLink, type RichNode } from '@utn/api-client';

const Indent = Extension.create({
  name: 'summaryIndent',
  addGlobalAttributes() { return [{ types: ['paragraph', 'heading'], attributes: { indent: { default: 0, parseHTML: element => Math.min(6, Math.max(0, Number(element.getAttribute('data-indent')) || 0)), renderHTML: attributes => attributes.indent ? { 'data-indent': attributes.indent, style: `margin-left:${attributes.indent * spacing.lg}px` } : {} } } }]; },
});
const fontSizes = [typography.bodySmall.fontSize, typography.body.fontSize, typography.heading3.fontSize, typography.heading2.fontSize];
function normalizeEditorDocument(doc: RichNode): RichNode {
  function color(value: string) {
    if (/^#[a-f0-9]{6}$/i.test(value)) return value;
    const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(value);
    return rgb ? '#' + rgb.slice(1).map(channel => Math.min(255, Number(channel)).toString(16).padStart(2, '0')).join('') : undefined;
  }
  return { ...doc, ...(doc.content ? { content: doc.content.map(normalizeEditorDocument) } : {}), ...(doc.marks ? { marks: doc.marks.map(mark => {
    if (mark.type !== 'textStyle') return mark;
    const attrs = { ...mark.attrs };
    for (const key of ['color', 'backgroundColor']) if (attrs[key]) { const normalized = color(attrs[key]); if (normalized) attrs[key] = normalized; else delete attrs[key]; }
    if (attrs.fontFamily && ![brand.fonts.body, brand.fonts.display, brand.fonts.accent, brand.fonts.headingAlt].some(font => font === attrs.fontFamily)) attrs.fontFamily = brand.fonts.body;
    if (attrs.fontSize) { const size = parseFloat(attrs.fontSize); attrs.fontSize = `${fontSizes.reduce((closest, next) => Math.abs(next - size) < Math.abs(closest - size) ? next : closest)}px`; }
    return { ...mark, attrs };
  }) } : {}) };
}
function FormatButton({ label, active = false, disabled = false, action, children }: { label: string; active?: boolean; disabled?: boolean; action: () => void; children?: React.ReactNode }) {
  return <button type="button" className="button-secondary rich-tool" aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={action}>{children ?? label}</button>;
}
function Toolbar({ editor, disabled, fieldId, label }: { editor: Editor; disabled: boolean; fieldId: string; label: string }) {
  const [linkOpen, setLinkOpen] = useState(false), [url, setUrl] = useState(''), [error, setError] = useState('');
  function applyLink() {
    if (!safeRichLink(url.trim())) { setError('Ingresá una dirección https://, http:// o mailto: válida.'); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run(); setLinkOpen(false);
  }
  function indent(offset: number) {
    if (editor.isActive('listItem')) { const chain = editor.chain().focus(); if (offset > 0) chain.sinkListItem('listItem').run(); else chain.liftListItem('listItem').run(); return; }
    const type = editor.isActive('heading') ? 'heading' : 'paragraph';
    editor.chain().focus().updateAttributes(type, { indent: Math.min(6, Math.max(0, Number(editor.getAttributes(type).indent ?? 0) + offset)) }).run();
  }
  return <>
    <div className="rich-toolbar" role="group" aria-label={`Herramientas de ${label}`}>
      <div className="rich-group">
        <FormatButton label="Deshacer" disabled={disabled || !editor.can().undo()} action={() => editor.chain().focus().undo().run()} />
        <FormatButton label="Rehacer" disabled={disabled || !editor.can().redo()} action={() => editor.chain().focus().redo().run()} />
        <label className="rich-select">Párrafo<select disabled={disabled} value={editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : '0'} onChange={event => { const level = Number(event.target.value); if (level === 2 || level === 3) editor.chain().focus().setHeading({ level }).run(); else editor.chain().focus().setParagraph().run(); }}><option value="0">Normal</option><option value="2">Título</option><option value="3">Subtítulo</option></select></label>
        <label className="rich-select">Fuente<select disabled={disabled} value={editor.getAttributes('textStyle').fontFamily ?? brand.fonts.body} onChange={event => editor.chain().focus().setFontFamily(event.target.value).run()}>{[brand.fonts.body, brand.fonts.display, brand.fonts.accent, brand.fonts.headingAlt].map(font => <option key={font}>{font}</option>)}</select></label>
        <label className="rich-select">Tamaño<select disabled={disabled} value={editor.getAttributes('textStyle').fontSize ?? '16px'} onChange={event => editor.chain().focus().setFontSize(event.target.value).run()}>{fontSizes.map(size => <option key={size} value={`${size}px`}>{size}</option>)}</select></label>
      </div>
      <div className="rich-group">
        <FormatButton label="Negrita" active={editor.isActive('bold')} disabled={disabled} action={() => editor.chain().focus().toggleBold().run()}><strong>N</strong></FormatButton>
        <FormatButton label="Cursiva" active={editor.isActive('italic')} disabled={disabled} action={() => editor.chain().focus().toggleItalic().run()}><em>C</em></FormatButton>
        <FormatButton label="Subrayado" active={editor.isActive('underline')} disabled={disabled} action={() => editor.chain().focus().toggleUnderline().run()}><u>S</u></FormatButton>
        <FormatButton label="Tachado" active={editor.isActive('strike')} disabled={disabled} action={() => editor.chain().focus().toggleStrike().run()}><s>T</s></FormatButton>
        <label className="rich-select">Color<select disabled={disabled} value={editor.getAttributes('textStyle').color ?? ''} onChange={event => event.target.value ? editor.chain().focus().setColor(event.target.value).run() : editor.chain().focus().unsetColor().run()}><option value="">Automático</option>{Object.entries(brand.colors).map(([name, color]) => <option key={name} value={color}>{({ blue: 'Azul', lightBlue: 'Celeste', cyanGray: 'Verde grisáceo', yellow: 'Amarillo', warmGray: 'Gris cálido', beigeGray: 'Beige', black: 'Negro' } as Record<string, string>)[name]}</option>)}</select></label>
        <label className="rich-select">Resaltado<select disabled={disabled} value={editor.getAttributes('textStyle').backgroundColor ?? ''} onChange={event => event.target.value ? editor.chain().focus().setBackgroundColor(event.target.value).run() : editor.chain().focus().unsetBackgroundColor().run()}><option value="">Sin resaltado</option><option value={brand.colors.yellow}>Amarillo</option><option value={brand.colors.cyanGray}>Verde grisáceo</option><option value={brand.colors.warmGray}>Gris cálido</option></select></label>
      </div>
      <div className="rich-group">
        {([{ key: 'left', name: 'Alinear a la izquierda' }, { key: 'center', name: 'Centrar' }, { key: 'right', name: 'Alinear a la derecha' }, { key: 'justify', name: 'Justificar' }] as const).map(item => <FormatButton key={item.key} label={item.name} active={editor.isActive({ textAlign: item.key })} disabled={disabled} action={() => editor.chain().focus().setTextAlign(item.key).run()} />)}
      </div>
      <div className="rich-group">
        <FormatButton label="Lista con viñetas" active={editor.isActive('bulletList')} disabled={disabled} action={() => editor.chain().focus().toggleBulletList().run()} />
        <FormatButton label="Lista numerada" active={editor.isActive('orderedList')} disabled={disabled} action={() => editor.chain().focus().toggleOrderedList().run()} />
        <FormatButton label="Disminuir sangría" disabled={disabled} action={() => indent(-1)} />
        <FormatButton label="Aumentar sangría" disabled={disabled} action={() => indent(1)} />
        <FormatButton label="Cita" active={editor.isActive('blockquote')} disabled={disabled} action={() => editor.chain().focus().toggleBlockquote().run()} />
      </div>
      <div className="rich-group">
        <FormatButton label="Hipervínculo" active={editor.isActive('link')} disabled={disabled} action={() => { setUrl(editor.getAttributes('link').href ?? ''); setError(''); setLinkOpen(!linkOpen); }} />
        <FormatButton label="Quitar vínculo" disabled={disabled || !editor.isActive('link')} action={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()} />
        <FormatButton label="Limpiar formato" disabled={disabled} action={() => editor.chain().focus().unsetAllMarks().clearNodes().updateAttributes('paragraph', { indent: 0, textAlign: 'left' }).run()} />
      </div>
    </div>
    {linkOpen && <div className="rich-link-panel"><label htmlFor={`${fieldId}-link`}>Dirección del hipervínculo</label><input id={`${fieldId}-link`} type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" disabled={disabled} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); applyLink(); } if (event.key === 'Escape') { event.preventDefault(); setLinkOpen(false); editor.commands.focus(); } }} /><div className="rich-group"><button type="button" disabled={disabled} onClick={applyLink}>Aplicar vínculo</button><button type="button" className="button-secondary" onClick={() => { setLinkOpen(false); editor.commands.focus(); }}>Cancelar</button></div>{error && <p role="alert" className="form-error">{error}</p>}</div>}
  </>;
}
export function RichTextEditor({ value, onChange, disabled, name = 'summary', label = 'Resumen', maxLength = richLimit }: { value: string; onChange: (value: string) => void; disabled: boolean; name?: string; label?: string; maxLength?: number }) {
  const fieldId = `news-${name}`;
  const [count, setCount] = useState(() => richPlain(decodeRich(value) ?? plainDocument('')).length), [limited, setLimited] = useState(false);
  const [, redraw] = useState(0);
  const editor = useEditor({
    immediatelyRender: false, shouldRerenderOnTransaction: true,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, horizontalRule: false, link: { openOnClick: false, protocols: ['http', 'https', 'mailto'], isAllowedUri: safeRichLink } }), TextStyleKit.configure({ lineHeight: false }), TextAlign.configure({ types: ['paragraph', 'heading'], alignments: ['left', 'center', 'right', 'justify'] }), Indent,
      Extension.create({ name: 'summaryLimit', addProseMirrorPlugins: () => [new Plugin({ filterTransaction(transaction, state) { if (!transaction.docChanged) return true; const next = richPlain(transaction.doc.toJSON()).length; const previous = richPlain(state.doc.toJSON()).length; if (next > maxLength && next >= previous) { setLimited(true); return false; } setLimited(false); return true; } })] }),
    ],
    content: decodeRich(value) ?? plainDocument(''), editable: !disabled,
    editorProps: { attributes: { id: fieldId, class: 'rich-editor', role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': fieldId + '-label', 'aria-describedby': fieldId + '-count' } },
    onUpdate: ({ editor }) => { const doc = normalizeEditorDocument(editor.getJSON() as RichNode); setCount(richPlain(doc).length); onChange(encodeRich(doc)); },
    onSelectionUpdate: () => redraw(previous => previous + 1),
  });
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  return <div className="rich-field">{editor ? <><Toolbar editor={editor} disabled={disabled} fieldId={fieldId} label={label} /><EditorContent editor={editor} /></> : <p>Cargando editor…</p>}<input type="hidden" name={name} value={value} /><span id={`${fieldId}-count`} className="field-help">{count}/{maxLength} caracteres</span>{limited && <p role="status" className="form-error">{label} admite hasta {maxLength} caracteres. Acortá el texto para seguir escribiendo.</p>}</div>;
}
