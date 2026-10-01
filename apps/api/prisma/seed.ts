import { db } from '../src/db';
try {
  const category = await db.category.upsert({ where: { slug: 'institucional' }, update: {}, create: { name: 'Institucional', slug: 'institucional' } });
  await db.news.upsert({ where: { slug: 'bienvenidos-utn-frba' }, update: {}, create: { title: 'Bienvenidos a UTN FRBA', slug: 'bienvenidos-utn-frba', summary: 'Estamos construyendo un nuevo espacio para las novedades de la facultad.', content: 'Esta es una noticia de demostración para validar la conexión entre la API, la base de datos y las aplicaciones. No representa una comunicación oficial de UTN.', status: 'PUBLISHED', featured: true, publishedAt: new Date(), categoryId: category.id } });
} finally { await db.$disconnect(); }
