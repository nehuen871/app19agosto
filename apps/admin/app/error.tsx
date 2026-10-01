'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="state" role="alert"><h1>No se pudo cargar el panel</h1><button onClick={reset}>Reintentar</button></section>; }
