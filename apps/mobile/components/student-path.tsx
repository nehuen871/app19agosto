import { useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, componentTokens, layout, radius, spacing, typography } from '@utn/design-tokens';
import { ruleSatisfied, unmetRequirements, studyStatuses, studyStatusLabels, specialtyLabels, type StudentPath, type StudyCourse, type StudyRule, type StudyStatus } from '@utn/api-client';
import { api } from '../services/api';
import { Badge, Body, Button, Card, EmptyState, Heading, Text, styles } from './ui';

const theme = colors.light;
function availability(course: StudyCourse, statuses: Record<string, StudyStatus>) {
  if (course.status !== 'PENDING') return studyStatusLabels[course.status];
  if (ruleSatisfied(course.requirements.enroll, statuses)) return 'Podés cursarla';
  const missing = unmetRequirements(course.requirements.enroll, statuses);
  return missing.regular.length + missing.approved.length ? 'Tiene correlativas pendientes' : 'Revisar condiciones';
}
export function StudentMap({ data, queryKey }: { data: StudentPath; queryKey: readonly string[] }) {
  const [year, setYear] = useState(1), [search, setSearch] = useState(''), [selected, setSelected] = useState<string | null>(null), [sourceError, setSourceError] = useState('');
  const client = useQueryClient();
  const selectPlan = useMutation({ mutationFn: api.selectStudentPlan, onSuccess: () => { setSelected(null); void client.invalidateQueries({ queryKey }); } });
  if (!data.specialty) return <><EmptyState title="Tu camino empieza acá" description="Elegí tu especialidad en Mi cuenta para ver sus materias y empezar tu mapa personal." /><Link href="/account" asChild><Button title="Elegir mi especialidad" /></Link></>;
  if (!data.plan) return <EmptyState title="Plan todavía no disponible" description="Tu especialidad está guardada. Falta cargar su plan de estudios para mostrar el mapa." />;
  const plan = data.plan, courses = plan.courses, statuses = Object.fromEntries(courses.map(c => [c.code, c.status]));
  const mandatory = courses.filter(c => c.kind === 'SUBJECT'), approved = mandatory.filter(c => c.status === 'APPROVED').length;
  const years = [...new Set(courses.map(c => c.year))].sort((a, b) => (a || 99) - (b || 99));
  const visible = courses.filter(c => search.trim() ? c.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')) : c.year === year).sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
  const chosen = courses.find(c => c.id === selected);
  return <>
    <View style={ss.hero}><Text style={ss.eyebrow}>{specialtyLabels[data.specialty]} · PLAN {plan.version}</Text><Heading level={2}>Cada materia{ '\n' }abre caminos.</Heading><Body small>Marcá tu avance y descubrí qué podés cursar después.</Body>
      <View style={ss.metric}><Text style={ss.number}>{approved}</Text><View style={ss.flex}><Body>de {mandatory.length} materias obligatorias aprobadas</Body><Body small muted>Electivas y prácticas se registran por separado.</Body></View></View>
      <View accessibilityRole="progressbar" accessibilityLabel="Materias obligatorias aprobadas" accessibilityValue={{ min: 0, max: mandatory.length, now: approved }} style={ss.track}><View style={[ss.progress, { width: `${approved / mandatory.length * 100}%` }]} /></View>
    </View>
    {data.plans.length > 1 && <View style={ss.gap}><Heading level={3}>Mi plan</Heading>{data.plans.map(p => <Button key={p.id} title={p.name} variant={p.id === plan.id ? 'primary' : 'outline'} disabled={selectPlan.isPending} accessibilityState={{ selected: p.id === plan.id }} onPress={() => selectPlan.mutate(p.id)} />)}{selectPlan.error && <Body>{selectPlan.error.message}</Body>}</View>}
    <View style={ss.gap}><Heading level={3}>Mapa de desbloqueos</Heading><Body small muted>Tocá una materia para ver sus requisitos y editar tu estado.</Body>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.filters}>{years.map(y => <Button key={y} title={y ? `${y}º año` : 'Electivas'} size="sm" variant={year === y ? 'primary' : 'outline'} accessibilityState={{ selected: year === y }} onPress={() => { setYear(y); setSearch(''); }} />)}</ScrollView>
      <TextInput accessibilityLabel="Buscar materia del plan" placeholder="Buscar en todas las materias" value={search} onChangeText={setSearch} style={styles.profileInput} />
    </View>
    {!visible.length && <EmptyState title="Sin coincidencias" description="Probá con otro nombre de materia." />}
    <View>{visible.map((c, index) => <View key={c.id} style={ss.row}>
      <View style={ss.rail}>{index < visible.length - 1 && <View style={ss.connector} />}<View style={[ss.node, c.status === 'APPROVED' && ss.nodeApproved]}><Text style={[ss.nodeText, c.status === 'APPROVED' && ss.nodeTextApproved]}>{c.status === 'APPROVED' ? '✓' : c.year || 'E'}</Text></View></View>
      <Card style={ss.course}><View style={ss.badges}><Badge variant={c.status === 'APPROVED' ? 'primary' : 'outline'}>{studyStatusLabels[c.status]}</Badge>{c.kind !== 'SUBJECT' && <Badge>{c.kind === 'ELECTIVE' ? 'Electiva' : c.kind === 'PRACTICE' ? 'Práctica' : 'Título intermedio'}</Badge>}</View><Text style={ss.courseName}>{c.name}</Text><Text style={ss.available}>{availability(c, statuses)}</Text><Button title="Ver correlativas y editar" variant="ghost" size="sm" onPress={() => setSelected(c.id)} /></Card>
    </View>)}</View>
    <View style={ss.footnote}><Heading level={3}>Tu avance, a tu manera</Heading><Body small>Es un registro personal, no un certificado académico. Podés cargar equivalencias o avances previos aunque falten correlativas en el mapa. Cambiar un estado recalcula los requisitos y conserva el resto de tu recorrido.</Body><Body small>{plan.notes}</Body><Button title="Consultar plan y correlativas oficiales ↗" variant="outline" onPress={() => { setSourceError(''); void Linking.openURL(plan.sourceUrl).catch(() => setSourceError('No se pudo abrir la fuente oficial. Intentá nuevamente.')); }} />{sourceError && <Body>{sourceError}</Body>}<Body small muted>Fuente revisada el {new Date(plan.verifiedAt).toLocaleDateString('es-AR', { timeZone: 'UTC' })}.</Body></View>
    {chosen && <CourseEditor key={chosen.id} course={chosen} courses={courses} statuses={statuses} queryKey={queryKey} onClose={() => setSelected(null)} onChoose={id => setSelected(id)} />}
  </>;
}
function RuleDetails({ title, rule, courses, statuses, onChoose }: { title: string; rule: StudyRule; courses: StudyCourse[]; statuses: Record<string, StudyStatus>; onChoose: (id: string) => void }) {
  const missing = unmetRequirements(rule, statuses);
  return <View style={ss.gap}><Heading level={3}>{title}</Heading>{!rule.regular.length && !rule.approved.length && <Body small>Sin correlativas académicas previas.</Body>}{(['regular', 'approved'] as const).map(kind => rule[kind].map(code => {
    const c = courses.find(c => c.code === code)!;
    return <Button key={kind + code} title={`${missing[kind].includes(code) ? '○' : '✓'} ${c.name} · ${kind === 'regular' ? 'regularizada' : 'aprobada'}`} variant="outline" size="sm" onPress={() => onChoose(c.id)} />;
  }))}{rule.notes.map(note => <Body key={note} small>{note}</Body>)}</View>;
}
function CourseEditor({ course, courses, statuses, queryKey, onClose, onChoose }: { course: StudyCourse; courses: StudyCourse[]; statuses: Record<string, StudyStatus>; queryKey: readonly string[]; onClose: () => void; onChoose: (id: string) => void }) {
  const insets = useSafeAreaInsets(), client = useQueryClient();
  const [draft, setDraft] = useState(course.status), [base, setBase] = useState(course.updatedAt), [savedStatus, setSavedStatus] = useState(course.status), [notice, setNotice] = useState('');
  const [reloading, setReloading] = useState(false);
  const dirty = draft !== savedStatus;
  const mutation = useMutation({ mutationFn: () => api.saveStudentProgress(course.id, draft, base), retry: false, onSuccess: saved => {
    setBase(saved.updatedAt); setSavedStatus(saved.status); setNotice('Avance guardado en tu cuenta.');
    client.setQueryData<StudentPath>(queryKey, previous => previous?.plan ? { ...previous, plan: { ...previous.plan, courses: previous.plan.courses.map(c => c.id === course.id ? { ...c, ...saved } : c) } } : previous);
  } });
  async function reload() {
    setReloading(true); setNotice('');
    try { const data = await api.studentPath(); const latest = data.plan?.courses.find(c => c.id === course.id); if (!latest) throw new Error('La materia ya no está en tu plan. Cerrá y actualizá el mapa.'); client.setQueryData(queryKey, data); setBase(latest.updatedAt); setSavedStatus(latest.status); mutation.reset(); setNotice(`Estado guardado: ${studyStatusLabels[latest.status]}. Conservamos tu selección para que decidas si querés guardarla.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'No pudimos actualizar.'); } finally { setReloading(false); }
  }
  const unlocked = courses.filter(c => [...c.requirements.enroll.regular, ...c.requirements.enroll.approved].includes(course.code));
  const busy = mutation.isPending || reloading;
  return <Modal visible animationType="none" onRequestClose={() => { if (!busy && !dirty) onClose(); }} accessibilityViewIsModal><View style={ss.modal}>
    <ScrollView contentContainerStyle={[ss.editor, { paddingTop: spacing.lg + insets.top, paddingBottom: spacing.lg + insets.bottom }]}>
      <Button title={dirty ? 'Descartar cambios y cerrar' : 'Cerrar materia'} variant="ghost" disabled={busy} onPress={onClose} />
      <Text style={ss.eyebrow}>{course.year ? `${course.year}º AÑO` : 'ELECTIVA'} · {course.code}</Text><Heading level={2}>{course.name}</Heading>
      <View style={ss.gap}><Heading level={3}>Mi estado</Heading><View style={ss.badges}>{studyStatuses.map(status => <Button key={status} title={studyStatusLabels[status]} variant={draft === status ? 'primary' : 'outline'} accessibilityState={{ selected: draft === status }} disabled={busy} onPress={() => { setDraft(status); setNotice(''); }} />)}</View><Button title="Guardar avance" disabled={!dirty || reloading} loading={mutation.isPending} onPress={() => mutation.mutate()} />{mutation.error && <View accessibilityRole="alert"><Body>{mutation.error.message}</Body><Button title="Actualizar datos conservando mi selección" variant="outline" loading={reloading} onPress={() => void reload()} /></View>}{notice && <View accessibilityLiveRegion="polite"><Body small>{notice}</Body></View>}</View>
      <Body small muted>Para rendir, además necesitás la cursada de esta materia regularizada y vigente. Las condiciones de asistencia, vencimientos, equivalencias y trámites se revisan con la facultad.</Body>
      <RuleDetails title="Para cursar" rule={course.requirements.enroll} courses={courses} statuses={statuses} onChoose={id => { if (!dirty && !busy) onChoose(id); }} />
      <RuleDetails title="Para rendir" rule={course.requirements.exam} courses={courses} statuses={statuses} onChoose={id => { if (!dirty && !busy) onChoose(id); }} />
      {course.notes && <Body small>{course.notes}</Body>}
      <View style={ss.gap}><Heading level={3}>Abre camino a</Heading>{!unlocked.length && <Body small>No tiene dependientes directas para cursar en este plan.</Body>}{unlocked.map(c => <Button key={c.id} title={`${c.name} · ${availability(c, statuses)}`} variant="outline" disabled={dirty || busy} onPress={() => onChoose(c.id)} />)}{dirty && <Body small>Guardá o descartá tus cambios antes de abrir otra materia.</Body>}</View>
    </ScrollView></View></Modal>;
}
const ss = StyleSheet.create({
  flex: { flex: 1 }, gap: { gap: spacing.sm }, hero: { gap: spacing.md, borderBottomWidth: componentTokens.borderWidth, borderColor: theme.border, paddingBottom: spacing.lg },
  eyebrow: { ...typography.label, color: theme.primary }, metric: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, number: { ...typography.display, color: theme.primary },
  track: { height: spacing.sm, backgroundColor: theme.border, borderRadius: radius.full, overflow: 'hidden' }, progress: { height: '100%', backgroundColor: theme.primary },
  filters: { gap: spacing.sm, paddingVertical: spacing.xs }, row: { flexDirection: 'row', gap: spacing.sm },
  rail: { width: spacing.xl, alignItems: 'center' }, connector: { position: 'absolute', top: spacing.lg, bottom: -spacing.lg, width: componentTokens.focusWidth, backgroundColor: theme.border },
  node: { marginTop: spacing.md, width: spacing.xl, height: spacing.xl, borderRadius: radius.full, backgroundColor: theme.editorial, borderWidth: componentTokens.focusWidth, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  nodeApproved: { backgroundColor: theme.primary }, nodeText: { ...typography.label, color: theme.primary }, nodeTextApproved: { color: theme.primaryForeground },
  course: { flex: 1, width: 'auto', padding: spacing.md, marginBottom: spacing.md, borderRadius: radius.lg, gap: spacing.sm }, courseName: { ...typography.alternateHeading, color: theme.foreground },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, available: { ...typography.bodySmall, color: theme.primary },
  footnote: { gap: spacing.md, paddingTop: spacing.md, borderTopWidth: componentTokens.borderWidth, borderColor: theme.border }, modal: { flex: 1, backgroundColor: theme.editorial },
  editor: { width: '100%', maxWidth: layout.readingMax, alignSelf: 'center', padding: spacing.lg, gap: spacing.lg },
});
