import { createNavigationContainerRef } from "@react-navigation/native";

// Lets code outside the component tree (e.g. a notification-tap handler)
// navigate — same untyped `any` convention already used by every screen's
// useNavigation<any>() call in this app.
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: object) {
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate(name, params);
  }
}
