import { Image, type ImageProps } from "expo-image";
import { useState } from "react";
import { appVisuals } from "@/src/visuals";

export type AppVisualName = keyof typeof appVisuals;

type RemoteImageProps = Omit<ImageProps, "source" | "onError"> & {
  /** A remote URL that may be absent or unavailable on a learner's device. */
  uri?: string | null;
  /** Bundled, purpose-matched artwork to show when the remote image cannot load. */
  fallback?: AppVisualName;
  /** Lets an interactive parent avoid opening a URL that has just failed to load. */
  onFallback?: () => void;
};

/**
 * Shows remote content when available without leaving blank image slots offline
 * or after a host error. The fallback is bundled with the app, so it is also
 * available during first use before a remote image cache has been populated.
 */
export function RemoteImage({ uri, fallback = "learning", onFallback, ...props }: RemoteImageProps) {
  const [failedUri, setFailedUri] = useState<string | undefined>();
  const cleanUri = uri?.trim();
  const didFail = !!cleanUri && failedUri === cleanUri;

  return (
    <Image
      {...props}
      source={didFail || !cleanUri ? appVisuals[fallback] : { uri: cleanUri }}
      onError={() => {
        if (!didFail) {
          setFailedUri(cleanUri);
          onFallback?.();
        }
      }}
    />
  );
}

type AppVisualImageProps = Omit<ImageProps, "source"> & {
  visual: AppVisualName;
};

/** A local, semantic visual for content whose remote art is unreliable or generic. */
export function AppVisualImage({ visual, ...props }: AppVisualImageProps) {
  return <Image {...props} source={appVisuals[visual]} />;
}

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

/** Choose a stable fallback that is close to the subject of a book. */
export function libraryVisualFor(...values: (string | null | undefined)[]): AppVisualName {
  const text = values.filter(Boolean).join(" ").toLowerCase();

  if (hasAny(text, ["nclex", "exam", "osce", "review", "question", "test", "education"])) return "examPrep";
  if (hasAny(text, ["international", "global", "abroad", "career", "licens", "recognition", "visa"])) return "globalCareer";
  if (hasAny(text, ["critical", "icu", "emergency", "trauma", "clinical", "medical-surgical", "procedure", "ecg", "cardiac"])) return "clinicalSkills";

  return "learning";
}

/** Choose clear, relevant article art instead of a generic external stock photo. */
export function newsVisualFor(category?: string | null, headline?: string | null): AppVisualName {
  const text = [category, headline].filter(Boolean).join(" ").toLowerCase();

  if (hasAny(text, ["critical", "icu", "clinical", "hospital", "procedure", "patient care"])) return "clinicalSkills";
  if (hasAny(text, ["education", "osce", "exam", "study", "university", "training"])) return "examPrep";
  if (hasAny(text, ["job", "position", "uae", "germany", "uk", "license", "licence", "recognition", "international", "global", "saudi"])) return "globalCareer";

  return "clinicalSkills";
}
