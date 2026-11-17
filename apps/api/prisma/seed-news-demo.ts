import assert from 'node:assert/strict';
import { db } from '../src/db';

// Explicit, opt-in demo batch. Never part of the default seed or deployment.
const year = 2025;
const prefix = `demo-100-noticias-${year}-`;
const topics = [
  { category: 'Académicas', slug: 'academicas', titles: ['Inscripción a materias del próximo período', 'Consultas sobre finales y correlatividades', 'Taller de técnicas de estudio', 'Encuentro de orientación para ingresantes', 'Jornada de apoyo para preparar parciales'] },
  { category: 'Vida universitaria', slug: 'vida-universitaria', titles: ['Encuentro de estudiantes en la facultad', 'Nuevas propuestas para la comunidad', 'Feria de proyectos estudiantiles', 'Actividades para compartir entre cursadas', 'Espacio de intercambio entre carreras'] },
  { category: 'Becas y oportunidades', slug: 'becas-y-oportunidades', titles: ['Orientación sobre becas estudiantiles', 'Taller para preparar tu primer CV', 'Charla sobre prácticas profesionales', 'Encuentro con equipos de investigación', 'Guía de oportunidades para estudiantes'] },
  { category: 'Cultura y deportes', slug: 'cultura-y-deportes', titles: ['Jornada deportiva de la comunidad', 'Encuentro de fotografía universitaria', 'Taller de expresión y comunicación', 'Ciclo de cine y debate', 'Muestra de producciones estudiantiles'] },
  { category: 'Tecnología', slug: 'tecnologia', titles: ['Laboratorio abierto de programación', 'Charla sobre innovación tecnológica', 'Taller de herramientas digitales', 'Presentación de prototipos estudiantiles', 'Encuentro sobre tecnología y sociedad'] },
];

try {
  const result = await db.$transaction(async tx => {
    const before = await tx.news.count({ where: { NOT: { slug: { startsWith: prefix } } } });
    const categories = await Promise.all(topics.map(topic => tx.category.upsert({
      where: { slug: topic.slug }, update: {}, create: { name: topic.category, slug: topic.slug },
    })));
    // Reuse an existing local image, when available, without external image requests.
    const cover = await tx.news.findFirst({ where: { coverImageId: { not: null }, NOT: { slug: { startsWith: prefix } } }, select: { coverImageId: true, coverImageUrl: true } });
    let created = 0;
    for (let index = 0; index < 100; index++) {
      const topicIndex = index % topics.length;
      const topic = topics[topicIndex];
      const title = topic.titles[Math.floor(index / topics.length) % topic.titles.length];
      const publishedAt = new Date(Date.UTC(year, 0, 1 + Math.round(index * 364 / 99), 15));
      const dateLabel = publishedAt.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
      const slug = `${prefix}${String(index + 1).padStart(3, '0')}`;
      if (await tx.news.findUnique({ where: { slug }, select: { id: true } })) continue;
      await tx.news.create({ data: {
        slug, title: `[PRUEBA ${String(index + 1).padStart(3, '0')}] ${title}`,
        summary: `<p>Contenido de demostración del ${dateLabel}. ${title}: una propuesta para acompañar la vida en la facultad y probar la navegación de noticias.</p>`,
        content: `<p><strong>Noticia de prueba. No es una comunicación oficial ni una convocatoria vigente.</strong></p><h2>${title}</h2><p>Esta publicación forma parte de un conjunto de 100 noticias distribuidas durante ${year}. Permite comprobar la carga progresiva, el orden por fecha, las categorías y la lectura del detalle.</p><p>La propuesta reúne información de interés para estudiantes, con un resumen breve y contenido más extenso para recorrer desde el celular.</p><h3>Qué incluye esta actividad de ejemplo</h3><ul><li>Un espacio de orientación e intercambio.</li><li>Material de consulta para continuar aprendiendo.</li><li>Participación de la comunidad universitaria.</li></ul><p><em>Fecha de publicación de ejemplo: ${dateLabel}.</em></p><p>Los horarios, requisitos y actividades mencionados son ficticios. No requieren inscripción ni implican una actividad real.</p>`,
        categoryId: categories[topicIndex].id, status: 'PUBLISHED', featured: index % 5 === Math.floor(index / 5) % 5,
        publishedAt, ...(cover && index % 4 !== 0 ? cover : {}),
      } });
      created++;
    }
    const batch = await tx.news.findMany({ where: { slug: { startsWith: prefix } }, select: { publishedAt: true, featured: true, categoryId: true } });
    assert.equal(batch.length, 100);
    assert.equal(batch.filter(item => item.featured).length, 20);
    assert.equal(new Set(batch.map(item => item.publishedAt!.toISOString())).size, 100);
    assert.equal(new Set(batch.map(item => item.publishedAt!.getUTCMonth())).size, 12);
    assert.equal(await tx.news.count({ where: { NOT: { slug: { startsWith: prefix } } } }), before);
    return { created, batchTotal: batch.length, featured: batch.filter(item => item.featured).length, year, months: 12, existingNewsPreserved: before };
  }, { timeout: 60000 });
  console.info(JSON.stringify(result));
} finally {
  await db.$disconnect();
}
