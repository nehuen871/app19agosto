import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? '19 de Agosto',
  slug: config.slug ?? 'utn-frba',
  extra: { ...config.extra, ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } } : {}) },
  android: { ...config.android, ...(process.env.EXPO_PUBLIC_ANDROID_PACKAGE ? { package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE } : {}), ...(process.env.EXPO_PUBLIC_GOOGLE_SERVICES_FILE ? { googleServicesFile: process.env.EXPO_PUBLIC_GOOGLE_SERVICES_FILE } : {}) },
  ios: { ...config.ios, ...(process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER ? { bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER } : {}) },
});
