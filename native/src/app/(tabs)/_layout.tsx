import { Tabs } from "expo-router";

export default function Layout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "책 찾기" }} />
      <Tabs.Screen name="map" options={{ title: "나의 개념 지도" }} />
      <Tabs.Screen name="recommendations" options={{ title: "맞춤 추천" }} />
    </Tabs>
  );
}
