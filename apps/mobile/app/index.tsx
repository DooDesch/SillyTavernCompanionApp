import { Redirect } from 'expo-router';
import { useConnection } from '@/stores/connectionStore';

/** Entry gate: jump to the character list once connected, otherwise into onboarding. */
export default function Index() {
  const client = useConnection((s) => s.client);
  return <Redirect href={client ? '/(tabs)/chats' : '/onboarding/discovery'} />;
}
