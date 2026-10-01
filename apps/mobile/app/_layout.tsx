import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const client = new QueryClient();
export default function Layout() { return <QueryClientProvider client={client}><Stack screenOptions={{ title: 'UTN FRBA' }} /></QueryClientProvider>; }
