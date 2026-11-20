import { useState } from 'react';
import type { Specialty } from '@utn/api-client';
import { TextInput, View } from 'react-native';
import { useAuth } from '../services/auth';
import { Body, Button, styles } from './ui';
import { SpecialtySelect } from './specialty-select';
export function ProfileForm({ initialName, initialSpecialty }: { initialName: string; initialSpecialty: Specialty | null }) {
  const auth = useAuth();
  const [name, setName] = useState(initialName), [pending, setPending] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const [specialty, setSpecialty] = useState<Specialty | null>(initialSpecialty ?? null);
  async function save() {
    if (pending) return;
    if (!name.trim() || name.trim().length > 200) { setError('Ingresá un nombre de hasta 200 caracteres.'); return; }
    setPending(true); setError(''); setSaved(false);
    try { await auth.updateProfile(name.trim(), specialty); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar el perfil. Intentá nuevamente.'); }
    finally { setPending(false); }
  }
  return <View style={styles.section}>
    <Body>Nombre</Body><TextInput accessibilityLabel="Nombre" value={name} onChangeText={value => { setName(value); setSaved(false); }} maxLength={200} autoComplete="name" editable={!pending} style={styles.profileInput} returnKeyType="done" onSubmitEditing={() => void save()} />
    <Body>Especialidad</Body><SpecialtySelect value={specialty} disabled={pending} onChange={value => { setSpecialty(value); setSaved(false); }} />
    <Body small muted>El correo de Google identifica tu cuenta y no se modifica desde acá.</Body>
    {error && <View accessibilityRole="alert"><Body>{error}</Body></View>}{saved && <View accessibilityLiveRegion="polite"><Body>Datos de la cuenta guardados.</Body></View>}
    <Button title={pending ? 'Guardando…' : 'Guardar cambios'} loading={pending} onPress={() => void save()} />
  </View>;
}
