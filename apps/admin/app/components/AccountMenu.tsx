'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutFromMenu } from '../admin/login/actions';
export function AccountMenu({ name, email }: { name?: string; email?: string }) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [state, action, pending] = useActionState(logoutFromMenu, { error: '' });
  const path = usePathname();
  function close() { dialog.current?.close(); }
  useEffect(() => { dialog.current?.close(); }, [path]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <>
    <button ref={trigger} className="account-trigger" aria-label="Administrar cuenta" aria-haspopup="dialog" aria-expanded={open} aria-controls="admin-account-menu" onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3Z" /></svg>
    </button>
    <dialog ref={dialog} id="admin-account-menu" className="account-sidebar" aria-labelledby="admin-account-heading" onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX > box.right || event.clientY > box.bottom) close(); } }}>
      <div className="account-sidebar-content">
        <h2 id="admin-account-heading">Mi cuenta</h2>{name && <p>{name}</p>}{email && <p className="field-help">{email}</p>}
        <Link className="account-menu-link" href="/admin/account" onClick={close}>Administrar mis datos</Link>
        <form action={action}>{state.error && <p role="alert" className="form-error">{state.error}</p>}<button disabled={pending}>{pending ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></form>
      </div>
    </dialog>
  </>;
}
