import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLoadingScreen } from "./src/components/AppLoadingScreen";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { SessionProvider, useSession } from "./src/context/SessionContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import { setupNotificationResponseHandling } from "./src/services/notifications";

function AppContent() {
  const { isRestoring } = useSession();
  useEffect(() => setupNotificationResponseHandling(), []);
  if (isRestoring) return <AppLoadingScreen />;
  return <NavigationContainer ref={navigationRef}><StatusBar style="dark" /><RootNavigator /></NavigationContainer>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider><SessionProvider><AppContent /></SessionProvider></SafeAreaProvider>
    </ErrorBoundary>
  );
}
