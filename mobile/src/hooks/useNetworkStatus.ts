import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

// Treat "unknown" internet reachability (null, common right after reconnecting)
// as online rather than offline — only an explicit false counts as offline.
function isOnlineState(state: { isConnected: boolean | null; isInternetReachable: boolean | null }) {
  return !!state.isConnected && state.isInternetReachable !== false;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => setIsOnline(isOnlineState(state)));
    NetInfo.fetch().then((state) => setIsOnline(isOnlineState(state)));
    return unsubscribe;
  }, []);

  return isOnline;
}
