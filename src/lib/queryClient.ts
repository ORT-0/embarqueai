import { onlineManager, QueryClient } from '@tanstack/react-query';
import { addNetworkStateListener } from 'expo-network';
import { Platform } from 'react-native';

// Pausa as consultas sem internet e recarrega tudo quando a conexão volta.
// No navegador, o TanStack Query já usa os eventos online/offline da janela.
// Lá o expo-network não é necessário e quebraria a renderização no servidor
// de desenvolvimento (output: 'static'), onde não existe `window`.
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => {
    const sub = addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => sub.remove();
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
});
