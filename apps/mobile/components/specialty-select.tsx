import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@utn/design-tokens';
import { specialties, specialtyLabels, type Specialty } from '@utn/api-client';
import { Button, Heading } from './ui';
export type SpecialtySelectProps = { value: Specialty | null; onChange: (value: Specialty | null) => void; disabled: boolean };
export function SpecialtySelect({ value, onChange, disabled }: SpecialtySelectProps) {
  const [open, setOpen] = useState(false);
  function choose(next: Specialty | null) { onChange(next); setOpen(false); }
  return <>
    <Button title={value ? specialtyLabels[value] : 'Elegí tu especialidad'} accessibilityLabel={`Especialidad: ${value ? specialtyLabels[value] : 'sin especificar'}`} accessibilityState={{ expanded: open }} variant="outline" disabled={disabled} onPress={() => setOpen(true)} />
    <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
      <View style={selectStyles.backdrop}><View style={selectStyles.panel} accessibilityViewIsModal>
        <Heading level={3}>Elegí tu especialidad</Heading>
        <ScrollView contentContainerStyle={selectStyles.options}>
          <Button title="Sin especificar" variant={value === null ? 'primary' : 'ghost'} accessibilityRole="radio" accessibilityState={{ checked: value === null }} onPress={() => choose(null)} />
          {specialties.map(specialty => <Button key={specialty} title={specialtyLabels[specialty]} variant={value === specialty ? 'primary' : 'ghost'} accessibilityRole="radio" accessibilityState={{ checked: value === specialty }} onPress={() => choose(specialty)} />)}
        </ScrollView>
        <Button title="Cancelar" variant="outline" onPress={() => setOpen(false)} />
      </View></View>
    </Modal>
  </>;
}
const selectStyles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: `${colors.light.foreground}80` },
  panel: { width: '100%', maxHeight: '85%', backgroundColor: colors.light.surface, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  options: { gap: spacing.xs },
});
