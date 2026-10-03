import {
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import { AuthProvider, useAuth } from "../state/AuthContext";
import { Loading, Page } from "../components/ui";
import { StatusBar } from "expo-status-bar";
import { LearningProvider } from "../state/LearningContext";
import { AppShell } from "../components/AppShell";
import { ThemeProvider } from "../theme/ThemeContext";
import { colors } from "../theme/tokens";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "transparent",
    card: "transparent",
    primary: colors.green,
    text: colors.ink,
    border: colors.line,
  },
};
export default function Layout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthenticatedLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}
function AuthenticatedLayout() {
  const { ready, session, revision } = useAuth();
  return (
    <LearningProvider key={revision}>
      <StatusBar style="dark" />
      <NavigationThemeProvider value={navigationTheme}>
        <AppShell>
          {!ready ? (
            <Page title="책길을 준비하고 있어요" eyebrow="책길">
              <Loading />
            </Page>
          ) : (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="book/[id]" />
              <Stack.Screen name="account" />
              <Stack.Protected guard={!!session}>
                <Stack.Screen name="assessment" />
                <Stack.Screen name="question-review" />
              </Stack.Protected>
            </Stack>
          )}
        </AppShell>
      </NavigationThemeProvider>
    </LearningProvider>
  );
}
