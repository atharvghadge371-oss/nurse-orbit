import { View, Text, Pressable, StyleSheet, StatusBar } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { spacing } from "@/src/theme";
import { RemoteImage } from "@/src/components/content-image";

export default function ImageViewer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { url, title, caption } = useLocalSearchParams<{ url: string; title?: string; caption?: string }>();

  const imgUrl = decodeURIComponent(String(url || ""));
  const imgTitle = decodeURIComponent(String(title || "Medical image"));
  const imgCaption = decodeURIComponent(String(caption || ""));

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(6, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      if (scale.value > 1) {
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(200)
    .onEnd(() => {
      runOnJS(router.back)();
    })
    .requireExternalGestureToFail(doubleTap);

  const composed = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="viewer-close" onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{imgTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.imgWrap, animatedStyle]}>
          <RemoteImage
            testID="viewer-image"
            uri={imgUrl}
            fallback="clinicalSkills"
            style={styles.image}
            contentFit="contain"
            transition={200}
            accessibilityLabel={imgTitle}
          />
        </Animated.View>
      </GestureDetector>

      {!!imgCaption && (
        <View style={[styles.captionBar, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.captionText} numberOfLines={3}>{imgCaption}</Text>
          <Text style={styles.hint}>Pinch to zoom · double-tap · tap to close</Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    gap: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  title: { flex: 1, color: "#FFF", fontSize: 15, fontWeight: "700", textAlign: "center" },
  imgWrap: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  captionBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },
  captionText: { color: "#FFF", fontSize: 14, lineHeight: 20 },
  hint: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
});
