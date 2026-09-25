import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { LogBox, View, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider, useAuth } from "@/src/auth";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)/welcome");
    else if (user && !user.onboarded && !(segments as string[]).includes("onboarding")) router.replace("/(auth)/onboarding");
    else if (user && user.onboarded && inAuth) router.replace("/(tabs)/home");
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AuthGate>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="lesson/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="quiz/[subjectId]" options={{ presentation: "card" }} />
                  <Stack.Screen name="quiz/results" options={{ presentation: "card" }} />
                  <Stack.Screen name="exam/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="pathway/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="document-upload" options={{ presentation: "modal" }} />
                  <Stack.Screen name="ai-nurse" options={{ presentation: "card" }} />
                  <Stack.Screen name="cme" options={{ presentation: "card" }} />
                  <Stack.Screen name="jobs" options={{ presentation: "card" }} />
                  <Stack.Screen name="news" options={{ presentation: "card" }} />
                  <Stack.Screen name="notifications" options={{ presentation: "card" }} />
                  <Stack.Screen name="profile" options={{ presentation: "card" }} />
                  <Stack.Screen name="library/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="library/category/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="library/book/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="library/read/[bookId]" options={{ presentation: "fullScreenModal" }} />
                  <Stack.Screen name="library/pdf/[bookId]" options={{ presentation: "fullScreenModal" }} />
                  <Stack.Screen name="library/search" options={{ presentation: "modal" }} />
                  <Stack.Screen name="library/admin" options={{ presentation: "modal" }} />
                  <Stack.Screen name="cases/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="cases/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="drug-guide/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="drug-guide/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="ecg-learning/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="abg" options={{ presentation: "card" }} />
                  <Stack.Screen name="nursing-diagnosis" options={{ presentation: "card" }} />
                  <Stack.Screen name="care-plans/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="care-plans/new" options={{ presentation: "modal" }} />
                  <Stack.Screen name="emergency" options={{ presentation: "card" }} />
                  <Stack.Screen name="clinical-skills/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="clinical-skills/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="nclex" options={{ presentation: "card" }} />
                  <Stack.Screen name="passport-list" options={{ presentation: "card" }} />
                  <Stack.Screen name="abroad-list" options={{ presentation: "card" }} />
                  <Stack.Screen name="academy" options={{ presentation: "card" }} />
                  <Stack.Screen name="journey/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="image-viewer" options={{ presentation: "fullScreenModal", animation: "fade" }} />
                  <Stack.Screen name="tools/translator" options={{ presentation: "card" }} />
                  <Stack.Screen name="tools/ai-persona" options={{ presentation: "card" }} />
                  <Stack.Screen name="pediatric/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="pediatric/broselow" options={{ presentation: "card" }} />
                  <Stack.Screen name="pediatric/dose" options={{ presentation: "card" }} />
                  <Stack.Screen name="pediatric/fluids" options={{ presentation: "card" }} />
                  <Stack.Screen name="pediatric/bsa" options={{ presentation: "card" }} />
                  <Stack.Screen name="nursing-scope/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="nursing-scope/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="health/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="career/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="about" options={{ presentation: "card" }} />
                  <Stack.Screen name="calendar/add" options={{ presentation: "modal" }} />
                  <Stack.Screen name="calendar/pattern" options={{ presentation: "modal" }} />
                  <Stack.Screen name="calendar/settings" options={{ presentation: "modal" }} />
                  <Stack.Screen name="calendar/apply-leave" options={{ presentation: "modal" }} />
                  <Stack.Screen name="calendar/summary" options={{ presentation: "card" }} />
                  <Stack.Screen name="calendar/day/[date]" options={{ presentation: "card" }} />
                  <Stack.Screen name="logbook/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="logbook/new" options={{ presentation: "modal" }} />
                  <Stack.Screen name="logbook/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="logbook/portfolio" options={{ presentation: "card" }} />
                  <Stack.Screen name="nclex/recovery" options={{ presentation: "card" }} />
                  <Stack.Screen name="nclex/revision-plan" options={{ presentation: "card" }} />
                  <Stack.Screen name="languages/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="languages/oet" options={{ presentation: "card" }} />
                  <Stack.Screen name="languages/ielts" options={{ presentation: "card" }} />
                  <Stack.Screen name="languages/german" options={{ presentation: "card" }} />
                  <Stack.Screen name="languages/german/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="languages/writing-practice" options={{ presentation: "card" }} />
                  <Stack.Screen name="osce/index" options={{ presentation: "card" }} />
                  <Stack.Screen name="osce/[id]" options={{ presentation: "card" }} />
                  <Stack.Screen name="osce/history" options={{ presentation: "card" }} />
                </Stack>
              </AuthGate>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
