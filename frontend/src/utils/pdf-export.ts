import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

type MedImg = { id?: string; url: string; title?: string; caption?: string };
type Ref = { book_title: string; chapter: number; chapter_title: string; author?: string };

/**
 * Build an HTML representation of an AI Chat response and render → PDF → share.
 * Educational purpose only.
 */
export async function exportChatToPDF(opts: {
  question?: string;
  answer: string;
  images?: MedImg[];
  references?: Ref[];
}) {
  const { question, answer, images = [], references = [] } = opts;
  const ts = new Date();
  const dateStr = ts.toLocaleString();

  // Simple markdown-lite: convert **bold**, *italic*, numbered/bulleted lists, code blocks, and preserve line breaks.
  const md = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/```([\s\S]*?)```/g, (_m, code) => `<pre>${code}</pre>`)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|\s)\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
      .replace(/^\s*[-•]\s+(.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]*?<\/li>)/g, (m) => `<ul>${m}</ul>`.replace(/<\/ul>\s*<ul>/g, ""))
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br/>");

  const imgHtml =
    images.length > 0
      ? `<div class="images">
          <h3>Related medical images</h3>
          ${images
            .map(
              (i) => `
              <div class="img-card">
                <img src="${i.url}" alt="${(i.title || "").replace(/"/g, "&quot;")}" />
                <div class="img-meta">
                  <strong>${(i.title || "").replace(/</g, "&lt;")}</strong>
                  <small>${(i.caption || "").replace(/</g, "&lt;")}</small>
                </div>
              </div>`,
            )
            .join("")}
        </div>`
      : "";

  const refHtml =
    references.length > 0
      ? `<div class="refs">
          <h3>References from Nursing Library</h3>
          <ol>
            ${references
              .map(
                (r) =>
                  `<li><strong>${(r.book_title || "").replace(/</g, "&lt;")}</strong> — Ch ${r.chapter} · ${(r.chapter_title || "").replace(/</g, "&lt;")}${r.author ? " · " + r.author.replace(/</g, "&lt;") : ""}</li>`,
              )
              .join("")}
          </ol>
        </div>`
      : "";

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; padding: 32px; margin: 0; }
        header { border-bottom: 3px solid #1E3A8A; padding-bottom: 14px; margin-bottom: 22px; display: flex; align-items: center; justify-content: space-between; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .logo { width: 42px; height: 42px; border-radius: 22px; background: linear-gradient(135deg, #1E3A8A, #0D9488); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; }
        h1.title { font-size: 20px; margin: 0; color: #0F172A; font-weight: 900; }
        .tagline { color: #1E3A8A; font-size: 11px; font-weight: 700; margin: 2px 0 0; }
        .meta { font-size: 11px; color: #64748B; text-align: right; }
        .question-box { background: #E0F2FE; border-left: 4px solid #1E3A8A; padding: 12px 14px; margin-bottom: 18px; border-radius: 8px; }
        .question-box .lbl { color: #1E3A8A; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
        .question-box .txt { color: #0F172A; font-size: 14px; font-weight: 600; }
        .answer { font-size: 14px; line-height: 1.65; color: #1E293B; }
        .answer p { margin: 0 0 12px; }
        .answer h1, .answer h2, .answer h3 { color: #1E3A8A; margin-top: 18px; }
        .answer ul { padding-left: 20px; margin: 10px 0; }
        .answer li { margin-bottom: 5px; }
        .answer strong { color: #0F172A; }
        .answer code { background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .answer pre { background: #0F172A; color: #E2E8F0; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
        .images { margin-top: 24px; }
        .images h3, .refs h3 { color: #1E3A8A; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 14px 0 8px; }
        .img-card { margin-bottom: 14px; padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; }
        .img-card img { max-width: 100%; border-radius: 6px; }
        .img-meta { margin-top: 6px; }
        .img-meta strong { display: block; font-size: 12px; color: #0F172A; }
        .img-meta small { font-size: 11px; color: #64748B; }
        .refs { margin-top: 20px; padding: 12px; background: #F8FAFC; border-radius: 8px; }
        .refs ol { margin: 4px 0 0; padding-left: 22px; }
        .refs li { font-size: 12px; color: #334155; margin-bottom: 4px; }
        footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 10px; color: #94A3B8; line-height: 1.6; }
        .disclaimer { background: #FEF3C7; border-left: 3px solid #F59E0B; padding: 10px 12px; border-radius: 6px; font-size: 10px; color: #78350F; margin-top: 24px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <header>
        <div class="brand">
          <div class="logo">N</div>
          <div>
            <h1 class="title">Nurse Orbit</h1>
            <div class="tagline">AI Nursing Companion</div>
          </div>
        </div>
        <div class="meta">
          <div>${dateStr}</div>
          <div>AI-generated study note</div>
        </div>
      </header>

      ${question ? `<div class="question-box"><div class="lbl">Your question</div><div class="txt">${md(question)}</div></div>` : ""}

      <div class="answer"><p>${md(answer)}</p></div>

      ${imgHtml}
      ${refHtml}

      <div class="disclaimer">
        <strong>⚠ Educational disclaimer:</strong> Nurse Orbit AI is an educational assistant. Always verify doses,
        interventions and clinical decisions against your local protocols, institutional policies, and licensed
        healthcare professionals. Do not use this content for direct patient care without supervision.
      </div>

      <footer>
        Generated by Nurse Orbit · nurseorbit.app<br/>
        © ${ts.getFullYear()} Nurse Orbit. For personal study use only.
      </footer>
    </body>
  </html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (Platform.OS === "web") {
      // On web, open the PDF directly (share sheet not available)
      // @ts-ignore
      if (typeof window !== "undefined") window.open(uri, "_blank");
      return { uri, ok: true };
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Save AI reply as PDF", UTI: "com.adobe.pdf" });
    } else {
      Alert.alert("PDF ready", `Saved to ${uri}`);
    }
    return { uri, ok: true };
  } catch (e: any) {
    Alert.alert("Export failed", e?.message || "Could not generate PDF");
    return { ok: false, error: e?.message };
  }
}
