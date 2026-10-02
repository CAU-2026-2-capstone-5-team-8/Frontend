import {
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
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
    <LearningProvider>
      <ThemeProvider>
        <StatusBar style="dark" />
        <NavigationThemeProvider value={navigationTheme}>
          <AppShell>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            />
          </AppShell>
        </NavigationThemeProvider>
      </ThemeProvider>
    </LearningProvider>
  );
}
