import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, Platform, View } from "react-native";

const preferenceKey = "bookpath:appearance:reduceTransparency";
const Context = createContext<{
  reduceTransparency: boolean;
  systemReduced: boolean;
  ready: boolean;
  toggleTransparency: () => void;
  blurTarget: React.RefObject<View | null>;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [manual, setManual] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const blurTarget = useRef<View | null>(null);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(preferenceKey)
      .then((value) => {
        if (active) setManual(value === "true");
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") {
      const media = window.matchMedia("(prefers-reduced-transparency: reduce)");
      const update = () => setSystemReduced(media.matches);
      update();
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    if (Platform.OS === "ios") {
      let active = true;
      void AccessibilityInfo.isReduceTransparencyEnabled()
        .then((value) => {
          if (active) setSystemReduced(value);
        })
        .catch(() => {});
      const listener = AccessibilityInfo.addEventListener(
        "reduceTransparencyChanged",
        setSystemReduced,
      );
      return () => {
        active = false;
        listener.remove();
      };
    }
  }, []);
  const toggleTransparency = () => {
    if (!ready || systemReduced) return;
    const next = !manual;
    setManual(next);
    void AsyncStorage.setItem(preferenceKey, String(next)).catch(() => {});
  };
  return (
    <Context.Provider
      value={{
        reduceTransparency: systemReduced || manual,
        systemReduced,
        ready,
        toggleTransparency,
        blurTarget,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useTheme() {
  const theme = useContext(Context);
  if (!theme) throw Error("ThemeProvider is required");
  return theme;
}
