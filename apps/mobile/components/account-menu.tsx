import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../services/auth';
import { Avatar, Body, Button, Heading, styles } from './ui';
export function AccountMenu() {
  const auth = useAuth(), insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  if (!auth.user) return null;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Administrar cuenta" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={styles.accountTrigger}>
      <View accessible={false} style={styles.accountIcon}><View style={styles.accountIconHead} /><View style={styles.accountIconBody} /></View>
    </Pressable>
    <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
      <View style={styles.accountOverlay}>
        <Pressable style={styles.accountBackdrop} accessibilityRole="button" accessibilityLabel="Cerrar menú de cuenta" onPress={() => setOpen(false)} />
        <View accessibilityViewIsModal style={[styles.accountSidebar, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ScrollView contentContainerStyle={styles.accountSidebarContent} keyboardShouldPersistTaps="handled">
            <Avatar name={auth.user.name} /><Heading level={3}>Mi cuenta</Heading><Body>{auth.user.name}</Body><Body small muted>{auth.user.email}</Body>
            <Button title="Administrar mis datos" variant="outline" onPress={() => { setOpen(false); router.navigate('/account'); }} disabled={auth.busy} />
            {auth.error && <View accessibilityRole="alert"><Body>{auth.error}</Body></View>}
            <Button title={auth.busy ? 'Cerrando sesión…' : 'Cerrar sesión'} loading={auth.busy} onPress={() => { void auth.logout().then(ok => { if (ok) setOpen(false); }); }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
