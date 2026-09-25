import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { API_URL, getToken } from "@/src/api";
import { colors, spacing } from "@/src/theme";

export default function PdfViewer() {
  const { bookId, title } = useLocalSearchParams<{ bookId: string; title?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      const raw = `${API_URL}/library/books/${bookId}/file?token=${t}`;
      // On Android, WebView cannot render PDFs natively — wrap with Google's viewer
      const finalUrl =
        Platform.OS === "android"
          ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(raw)}`
          : raw;
      setUrl(finalUrl);
    })();
  }, [bookId]);

  return (
    <View style={{ flex: 1, backgroundColor: "#111" }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="pdf-close" onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.iconTxt}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title ? decodeURIComponent(title) : "Original PDF"}
          </Text>
          <Text style={styles.subtitle}>High-quality original format</Text>
        </View>
      </View>

      {!url ? (
        <View style={styles.center}><ActivityIndicator color="#FFF" /></View>
      ) : Platform.OS === "web" ? (
        // Web: iframe delivers native browser PDF experience
        // eslint-disable-next-line react-native/no-inline-styles
        <View style={{ flex: 1 }}>
          {/* @ts-ignore — iframe is web-only */}
          <iframe src={url} style={{ flex: 1, width: "100%", height: "100%", border: 0 } as any} />
        </View>
      ) : (
        <>
          {loading && (
            <View style={styles.loader} pointerEvents="none">
              <ActivityIndicator color="#FFF" size="large" />
              <Text style={styles.loaderText}>Loading original PDF…</Text>
            </View>
          )}
          <WebView
            testID="pdf-webview"
            source={{ uri: url }}
            style={{ flex: 1, backgroundColor: "#111" }}
            onLoadEnd={() => setLoading(false)}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: spacing.md, paddingBottom: 10, backgroundColor: "#111" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  iconTxt: { fontSize: 22, color: "#FFF" },
  title: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  subtitle: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loader: { position: "absolute", top: "40%", left: 0, right: 0, alignItems: "center", zIndex: 10, gap: 12 },
  loaderText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
});
