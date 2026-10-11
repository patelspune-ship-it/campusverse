import { ComponentType } from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSession } from "../context/SessionContext";
import { colors } from "../theme/theme";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { EventsScreen } from "../screens/events/EventsScreen";
import { EventDetailScreen } from "../screens/events/EventDetailScreen";
import { MyQRScreen } from "../screens/events/MyQRScreen";
import { MyRegistrationsScreen } from "../screens/events/MyRegistrationsScreen";
import { CertificateScreen } from "../screens/certificates/CertificateScreen";
import { ClubDashboardScreen } from "../screens/club/ClubDashboardScreen";
import { CreateEventScreen } from "../screens/club/CreateEventScreen";
import { EventRegistrationsScreen } from "../screens/club/EventRegistrationsScreen";
import { ScannerScreen } from "../screens/club/ScannerScreen";
import { BudgetRequestsScreen as ClubBudgetRequestsScreen } from "../screens/club/BudgetRequestsScreen";
import { BudgetRequestFormScreen } from "../screens/club/BudgetRequestFormScreen";
import { FacultyDashboardScreen } from "../screens/faculty/FacultyDashboardScreen";
import { VerificationHistoryScreen } from "../screens/faculty/VerificationHistoryScreen";
import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";
import { PendingApprovalsScreen } from "../screens/admin/PendingApprovalsScreen";
import { AllEventsScreen } from "../screens/admin/AllEventsScreen";
import { AllClubsScreen } from "../screens/admin/AllClubsScreen";
import { BudgetRequestsScreen as AdminBudgetRequestsScreen } from "../screens/admin/BudgetRequestsScreen";
import { VenueBookingsScreen } from "../screens/admin/VenueBookingsScreen";
import { DrivesScreen } from "../screens/recruitment/DrivesScreen";
import { ApplyScreen } from "../screens/recruitment/ApplyScreen";
import { MyApplicationsScreen } from "../screens/recruitment/MyApplicationsScreen";
import { RecruitmentApplicationsScreen } from "../screens/club/RecruitmentApplicationsScreen";
import type { BudgetRequest, CampusVerseUser, Event, RecruitmentDrive } from "../types/api";

export type AppTabsParamList = {
  Home: undefined;
  Events: undefined;
  "My Registrations": undefined;
  "My Events": undefined;
  Scanner: undefined;
  Budget: undefined;
  Recruitment: undefined;
  Verifications: undefined;
  Admin: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  EventDetail: { event: Event };
  MyQR: { eventId: string; eventName: string };
  Certificate: { eventId: string };
  ClubCreateEvent: undefined;
  ClubEventRegistrations: { eventId: string; eventName: string };
  ClubBudgetForm: { request?: BudgetRequest };
  FacultyHistory: undefined;
  AdminPendingApprovals: undefined;
  AdminAllEvents: undefined;
  AdminAllClubs: undefined;
  AdminBudgetRequests: undefined;
  AdminVenueBookings: undefined;
  RecruitmentApply: { drive: RecruitmentDrive };
  MyApplications: undefined;
};

type TabDefinition = {
  name: keyof AppTabsParamList;
  title?: string;
  icon: string;
  component: ComponentType<any>;
};

// Single source of truth: which tabs each role sees, in order.
const ROLE_TABS: Record<CampusVerseUser["role"], TabDefinition[]> = {
  student: [
    { name: "Home", title: "CampusVerse", icon: "⌂", component: HomeScreen },
    { name: "Events", icon: "○", component: EventsScreen },
    { name: "My Registrations", icon: "▦", component: MyRegistrationsScreen },
    { name: "Recruitment", icon: "🎯", component: DrivesScreen },
  ],
  club_admin: [
    { name: "Home", title: "CampusVerse", icon: "⌂", component: HomeScreen },
    { name: "My Events", icon: "▤", component: ClubDashboardScreen },
    { name: "Scanner", icon: "▣", component: ScannerScreen },
    { name: "Budget", icon: "₹", component: ClubBudgetRequestsScreen },
    { name: "Recruitment", icon: "🎯", component: RecruitmentApplicationsScreen },
  ],
  faculty: [
    { name: "Home", title: "CampusVerse", icon: "⌂", component: HomeScreen },
    { name: "Verifications", icon: "✓", component: FacultyDashboardScreen },
  ],
  super_admin: [
    { name: "Home", title: "CampusVerse", icon: "⌂", component: HomeScreen },
    { name: "Admin", icon: "☰", component: AdminDashboardScreen },
  ],
};

const Stack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<AppTabsParamList>();

function TabsNavigator() {
  const { user } = useSession();
  const tabs = user ? ROLE_TABS[user.role] : [];

  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          color: colors.primary,
          fontWeight: "800",
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 16 }}>{tab.icon}</Text>
            ),
          }}
        />
      ))}
    </Tabs.Navigator>
  );
}

// Wraps the tab bar in a stack so any tab can push detail screens
// (event detail, QR, certificate) above it.
function AppStackNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.primary, fontWeight: "800" },
        headerTintColor: colors.primary,
      }}
    >
      <AppStack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
      <AppStack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: "Event Details" }} />
      <AppStack.Screen name="MyQR" component={MyQRScreen} options={{ title: "My QR Code" }} />
      <AppStack.Screen name="Certificate" component={CertificateScreen} options={{ title: "Certificate" }} />
      <AppStack.Screen name="ClubCreateEvent" component={CreateEventScreen} options={{ title: "Create Event" }} />
      <AppStack.Screen name="ClubEventRegistrations" component={EventRegistrationsScreen} options={{ title: "Registrations" }} />
      <AppStack.Screen name="ClubBudgetForm" component={BudgetRequestFormScreen} options={{ title: "Budget Request" }} />
      <AppStack.Screen name="FacultyHistory" component={VerificationHistoryScreen} options={{ title: "Verification History" }} />
      <AppStack.Screen name="AdminPendingApprovals" component={PendingApprovalsScreen} options={{ title: "Pending Approvals" }} />
      <AppStack.Screen name="AdminAllEvents" component={AllEventsScreen} options={{ title: "All Events" }} />
      <AppStack.Screen name="AdminAllClubs" component={AllClubsScreen} options={{ title: "All Clubs" }} />
      <AppStack.Screen name="AdminBudgetRequests" component={AdminBudgetRequestsScreen} options={{ title: "Budget Requests" }} />
      <AppStack.Screen name="AdminVenueBookings" component={VenueBookingsScreen} options={{ title: "Venue Bookings" }} />
      <AppStack.Screen name="RecruitmentApply" component={ApplyScreen} options={{ title: "Apply" }} />
      <AppStack.Screen name="MyApplications" component={MyApplicationsScreen} options={{ title: "My Applications" }} />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { token } = useSession();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <Stack.Screen
          name="App"
          component={AppStackNavigator}
        />
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
      )}
    </Stack.Navigator>
  );
}
