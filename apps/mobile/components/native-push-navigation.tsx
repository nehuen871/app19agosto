import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuth } from '../services/auth';
import { notificationPath } from '../services/notification-path';
export function NativePushNavigation() {
  const { user, ready } = useAuth();
  const lastHandled = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !user) return;
    let active = true;
    const open = (response: Notifications.NotificationResponse) => {
      if (!active) return;
      const id = response.notification.request.identifier + ':' + response.actionIdentifier;
      if (lastHandled.current === id) return;
      lastHandled.current = id;
      router.push(notificationPath(response.notification.request.content.data?.url));
      void Notifications.clearLastNotificationResponseAsync();
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then(response => { if (response) open(response); }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, [ready, user?.id]);
  return null;
}
