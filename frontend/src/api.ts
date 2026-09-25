import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const KEY = "no_token";

export async function saveToken(t: string) {
  // SecureStore only accepts strings; anything else means the server reply was not a real login.
  if (typeof t !== "string" || !t) throw new Error("The server did not return a valid session. Please try again.");
  if (Platform.OS === "web") return window.localStorage.setItem(KEY, t);
  await SecureStore.setItemAsync(KEY, t);
}
export async function getToken(): Promise<string | null> {
  const t = Platform.OS === "web" ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  // Earlier builds could persist the literal string "undefined" on web.
  return t && t !== "undefined" && t !== "null" ? t : null;
}
export async function clearToken() {
  if (Platform.OS === "web") return window.localStorage.removeItem(KEY);
  await SecureStore.deleteItemAsync(KEY);
}

// Port of the FastAPI backend in local development (`uvicorn server:app --host 0.0.0.0 --port 8001`).
const DEV_BACKEND_PORT = 8001;

function resolveBackendUrl(): string {
  const configured = (process.env.EXPO_PUBLIC_BACKEND_URL || "").trim().replace(/\/+$/, "");
  if (configured || !__DEV__) return configured;
  // Nothing configured: in development assume the backend runs on the same machine as the Expo dev
  // server. A relative "/api" URL would otherwise hit Metro, which answers with its HTML page.
  const host = Platform.OS === "web"
    ? (typeof window !== "undefined" ? window.location.hostname : "")
    : Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:${DEV_BACKEND_PORT}` : "";
}

export const BACKEND_URL = resolveBackendUrl();
export const API_URL = BACKEND_URL + "/api";

function errorMessage(data: any, status: number): string {
  const d = data?.detail;
  if (typeof d === "string" && d) return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg).filter(Boolean).join("; ") || `Request failed (${status})`;
  return `Request failed (${status})`;
}

async function req(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const headers = new Headers(opts.headers);
  if (!(opts.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  } catch {
    throw new Error(`Cannot reach the server at ${BACKEND_URL || API_URL}. Check that the backend is running and EXPO_PUBLIC_BACKEND_URL is correct.`);
  }
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // A non-JSON reply usually means the URL points at the Expo/web server instead of the API.
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    throw new Error(`Unexpected response from ${API_URL}. Check that EXPO_PUBLIC_BACKEND_URL points at the backend.`);
  }
  if (!res.ok) throw new Error(errorMessage(data, res.status));
  return data;
}

export const api = {
  signup: (email: string, password: string, name: string) =>
    req("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) =>
    req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req("/auth/me"),
  saveOnboarding: (data: any) => req("/auth/onboarding", { method: "POST", body: JSON.stringify(data) }),

  home: () => req("/home/dashboard"),
  subjects: () => req("/study/subjects"),
  lessons: (subjectId: string) => req(`/study/subjects/${subjectId}/lessons`),
  questions: (params: { subject_id?: string; mode?: string; limit?: number } = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && p.append(k, String(v)));
    return req(`/questions?${p.toString()}`);
  },
  attempt: (question_id: string, selected_index: number, time_spent_seconds?: number, mode?: string) =>
    req("/questions/attempt", {
      method: "POST",
      body: JSON.stringify({
        question_id,
        selected_index,
        ...(time_spent_seconds != null ? { time_spent_seconds } : {}),
        ...(mode != null ? { mode } : {}),
      }),
    }),
  bookmark: (qid: string) => req(`/questions/${qid}/bookmark`, { method: "POST" }),
  qStats: () => req("/questions/stats"),
  qInsights: () => req("/questions/insights"),

  // ---- Recovery Sessions ("Teach Me") & Revision Plans ----
  startRecoverySession: (topic: string) =>
    req("/recovery/session", { method: "POST", body: JSON.stringify({ topic }) }),
  completeRecoverySession: (id: string) =>
    req(`/recovery/session/${id}/complete`, { method: "POST" }),
  recoveryHistory: () => req("/recovery/sessions"),

  generateRevisionPlan: (topic?: string) =>
    req("/revision/generate-plan", { method: "POST", body: JSON.stringify({ topic: topic || undefined }) }),
  revisionPlans: () => req("/revision/plans"),
  revisionPlan: (id: string) => req(`/revision/plans/${id}`),

  exams: () => req("/exams"),
  exam: (id: string) => req(`/exams/${id}`),

  pathways: () => req("/abroad/pathways"),
  pathway: (id: string) => req(`/abroad/pathways/${id}`),
  togglePathwayStep: (id: string, n: number) => req(`/abroad/pathways/${id}/step/${n}/toggle`, { method: "POST" }),

  documents: () => req("/passport/documents"),
  uploadDocument: async (form: FormData) => req("/passport/documents", { method: "POST", body: form }),
  deleteDocument: (id: string) => req(`/passport/documents/${id}`, { method: "DELETE" }),

  cme: () => req("/cme"),
  addCME: (data: any) => req("/cme", { method: "POST", body: JSON.stringify(data) }),

  jobs: (country?: string) => req(`/jobs${country ? `?country=${encodeURIComponent(country)}` : ""}`),
  news: () => req("/news"),
  notifications: () => req("/notifications"),

  chatHistory: (session_id: string) => req(`/ai/chat/${session_id}/history`),

  // Library
  libCategories: () => req("/library/categories"),
  libFeatured: () => req("/library/featured"),
  libBooks: (params: { category_id?: string; q?: string } = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && p.append(k, String(v)));
    return req(`/library/books?${p.toString()}`);
  },
  libBook: (id: string) => req(`/library/books/${id}`),
  libChapter: (bookId: string, n: number) => req(`/library/books/${bookId}/chapter/${n}`),
  libToggleBookmark: (book_id: string, chapter: number) =>
    req("/library/bookmarks/toggle", { method: "POST", body: JSON.stringify({ book_id, chapter }) }),
  libBookmarks: () => req("/library/bookmarks"),
  libAddNote: (book_id: string, chapter: number, text: string) =>
    req("/library/notes", { method: "POST", body: JSON.stringify({ book_id, chapter, text }) }),
  libDeleteNote: (id: string) => req(`/library/notes/${id}`, { method: "DELETE" }),
  libSearch: (q: string) => req(`/library/search?q=${encodeURIComponent(q)}`),
  libAdminAddBook: (data: any) => req("/library/admin/books", { method: "POST", body: JSON.stringify(data) }),
  libAdminDeleteBook: (id: string) => req(`/library/admin/books/${id}`, { method: "DELETE" }),

  // Clinical
  drugs: (q?: string) => req(`/drugs${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  drug: (id: string) => req(`/drugs/${id}`),
  ecgCases: () => req("/ecg/cases"),
  ecgCase: (id: string) => req(`/ecg/cases/${id}`),
  abgInterpret: (v: any) => req("/abg/interpret", { method: "POST", body: JSON.stringify(v) }),
  ventilator: () => req("/ventilator/topics"),
  skills: (category?: string) => req(`/skills${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  skill: (id: string) => req(`/skills/${id}`),
  emergency: () => req("/emergency/topics"),
  cases: (level?: string) => req(`/cases${level ? `?level=${encodeURIComponent(level)}` : ""}`),
  caseDetail: (id: string) => req(`/cases/${id}`),
  caseAttempt: (case_id: string, step_n: number, option_index: number) =>
    req("/cases/attempt", { method: "POST", body: JSON.stringify({ case_id, step_n, option_index }) }),
  nursingDiagnosis: (scenario: string) => req("/nursing-diagnosis", { method: "POST", body: JSON.stringify({ scenario }) }),
  createCarePlan: (data: any) => req("/care-plans", { method: "POST", body: JSON.stringify(data) }),
  listCarePlans: () => req("/care-plans"),
  deleteCarePlan: (id: string) => req(`/care-plans/${id}`, { method: "DELETE" }),
  gamification: () => req("/gamification"),
  gamAction: (action: string) => req("/gamification/action", { method: "POST", body: JSON.stringify({ action }) }),
  generatePlan: (focus?: string) => req("/learning-plan/generate", { method: "POST", body: JSON.stringify({ focus }) }),

  // ---- Pillar 1: My Nursing Journey ----
  journey: () => req("/journey"),
  journeySetYear: (year: string) => req("/journey/year", { method: "PUT", body: JSON.stringify({ year }) }),
  journeySubject: (subjectId: string) => req(`/journey/subjects/${subjectId}`),
  completeLesson: (lessonId: string, completed: boolean) =>
    req(`/journey/lessons/${lessonId}/complete`, { method: completed ? "POST" : "DELETE" }),
  journeyBuildPlan: () => req("/journey/plan", { method: "POST" }),
  journeyToggleTask: (planId: string, taskId: string) =>
    req(`/journey/plan/${planId}/tasks/${taskId}/toggle`, { method: "POST" }),

  // ---- Calendar / Shifts / Leave ----
  calListEvents: (from_date: string, to_date: string) =>
    req(`/calendar/events?from_date=${from_date}&to_date=${to_date}`),
  calCreateEvent: (data: any) => req("/calendar/events", { method: "POST", body: JSON.stringify(data) }),
  calUpdateEvent: (id: string, data: any) => req(`/calendar/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  calDeleteEvent: (id: string) => req(`/calendar/events/${id}`, { method: "DELETE" }),
  calPattern: (data: { start_date: string; pattern: string[]; cycles: number }) =>
    req("/calendar/pattern", { method: "POST", body: JSON.stringify(data) }),
  calSummary: () => req("/calendar/summary"),
  calLeaveConfig: () => req("/calendar/leave-config"),
  calSaveLeaveConfig: (data: any) => req("/calendar/leave-config", { method: "PUT", body: JSON.stringify(data) }),
  calPreviewLeave: (data: { start_date: string; end_date: string; leave_kind?: string }) =>
    req("/calendar/leave/preview", { method: "POST", body: JSON.stringify(data) }),
  calApplyLeave: (data: { start_date: string; end_date: string; leave_kind?: string }) =>
    req("/calendar/leave/apply", { method: "POST", body: JSON.stringify(data) }),
  calSuggestAL: (days = 14) => req(`/calendar/leave/suggest-al?days=${days}`, { method: "POST" }),

  // ---- Health Monitor ----
  hpProfile: () => req("/health/profile"),
  hpSaveProfile: (data: any) => req("/health/profile", { method: "PUT", body: JSON.stringify(data) }),
  hpAddVital: (data: any) => req("/health/vitals", { method: "POST", body: JSON.stringify(data) }),
  hpListVitals: (type?: string, limit = 90) => req(`/health/vitals?${type ? `type=${type}&` : ""}limit=${limit}`),
  hpDeleteVital: (id: string) => req(`/health/vitals/${id}`, { method: "DELETE" }),
  hpListMeds: () => req("/health/medications"),
  hpAddMed: (data: any) => req("/health/medications", { method: "POST", body: JSON.stringify(data) }),
  hpUpdateMed: (id: string, data: any) => req(`/health/medications/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  hpDeleteMed: (id: string) => req(`/health/medications/${id}`, { method: "DELETE" }),
  hpAddSteps: (data: { steps: number; source?: string; activity?: string; duration_min?: number; at?: string }) =>
    req("/health/steps", { method: "POST", body: JSON.stringify(data) }),
  hpStepsToday: () => req("/health/steps/today"),
  hpRewards: () => req("/health/rewards"),
  hpAddMeal: (data: any) => req("/health/meals", { method: "POST", body: JSON.stringify(data) }),
  hpListMeals: (date?: string) => req(`/health/meals${date ? `?date=${date}` : ""}`),
  hpDeleteMeal: (id: string) => req(`/health/meals/${id}`, { method: "DELETE" }),
  hpListLabs: () => req("/health/labs"),
  hpDeleteLab: (id: string) => req(`/health/labs/${id}`, { method: "DELETE" }),
  hpUploadLab: (fd: FormData) => req("/health/labs/upload", { method: "POST", body: fd }),
  hpWellbeing: () => req("/health/wellbeing"),
  hpSaveWellbeing: (data: { sleep_hours?: number; stress?: number; mood?: number; note?: string; date?: string }) =>
    req("/health/wellbeing", { method: "POST", body: JSON.stringify(data) }),

  // ---- Translator ----
  translate: (text: string, target_language: string, source_language?: string, mode = "patient") =>
    req("/translate", { method: "POST", body: JSON.stringify({ text, target_language, source_language, mode }) }),
  translateLanguages: () => req("/translate/languages"),
  translateHistory: (limit = 20) => req(`/translate/history?limit=${limit}`),

  // ---- Profile update (AI persona) ----
  updateProfile: (data: any) => req("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
  aiGenerateImage: (prompt: string, style: string = "medical_illustration") =>
    req("/ai/generate_image", { method: "POST", body: JSON.stringify({ prompt, style }) }),

  // ---- Clinical sims / procedures ----
  simsList: () => req("/clinical-sims"),
  simDetail: (id: string) => req(`/clinical-sims/${id}`),
  proceduresList: () => req("/procedures"),
  procedureDetail: (id: string) => req(`/procedures/${id}`),
  abnormalDeliveries: () => req("/abnormal-deliveries"),
  abnormalDelivery: (id: string) => req(`/abnormal-deliveries/${id}`),

  // ---- Pediatric ----
  pedBroselow: (weight_kg?: number) => req(`/pediatric/broselow${weight_kg ? `?weight_kg=${weight_kg}` : ""}`),
  pedDrugs: (category?: string) => req(`/pediatric/drugs${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  pedCalc: (drug_id: string, weight_kg: number, concentration_mg_per_ml?: number) =>
    req("/pediatric/calc", { method: "POST", body: JSON.stringify({ drug_id, weight_kg, concentration_mg_per_ml }) }),
  pedFluids: (weight_kg: number) =>
    req("/pediatric/fluids", { method: "POST", body: JSON.stringify({ weight_kg }) }),
  pedBSA: (height_cm: number, weight_kg: number) =>
    req("/pediatric/bsa", { method: "POST", body: JSON.stringify({ height_cm, weight_kg }) }),
  pedDrip: (volume_ml: number, time_hr: number, drop_factor = 20) =>
    req("/pediatric/drip", { method: "POST", body: JSON.stringify({ volume_ml, time_hr, drop_factor }) }),

  // ---- Nursing scope & trends ----
  nurseScopes: (category?: string) => req(`/nursing-scope${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  nurseScope: (id: string) => req(`/nursing-scope/${id}`),
  nurseTrends: () => req("/nursing-trends"),
  chatStream: async (session_id: string, message: string, onDelta: (s: string) => void, onDone: (refs?: any[], images?: any[]) => void, onError: (e: string) => void, mode: string = "STUDENT", onImages?: (images: any[]) => void) => {
    const token = await getToken();
    let res: Response;
    try {
      res = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ session_id, message, mode }),
      });
    } catch {
      onError(`Cannot reach the server at ${BACKEND_URL || API_URL}.`); return;
    }
    if (!res.ok) {
      let data: any = null;
      try { data = await res.json(); } catch {}
      onError(errorMessage(data, res.status)); return;
    }
    if (!res.body) { onError("No response body"); return; }
    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let refs: any[] = [];
    let imgs: any[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) { onDone(refs, imgs); return; }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const p of parts) {
        const line = p.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const data = JSON.parse(line.slice(5).trim());
          if (data.delta) onDelta(data.delta);
          if (data.references) refs = data.references;
          if (data.images) { imgs = data.images; if (onImages) onImages(data.images); }
          if (data.done) { onDone(refs, imgs); return; }
          if (data.error) { onError(data.error); return; }
        } catch {}
      }
    }
  },

  // ---- Clinical Logbook & Portfolio ----
  logbookEntries: (params: { from_date?: string; to_date?: string } = {}) => {
    const p = new URLSearchParams();
    if (params.from_date) p.append("from_date", params.from_date);
    if (params.to_date) p.append("to_date", params.to_date);
    const qs = p.toString();
    return req(`/logbook${qs ? `?${qs}` : ""}`);
  },
  createLogbookEntry: (entry: any) =>
    req("/logbook", { method: "POST", body: JSON.stringify(entry) }),
  logbookEntry: (id: string) => req(`/logbook/${id}`),
  updateLogbookEntry: (id: string, patch: any) =>
    req(`/logbook/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteLogbookEntry: (id: string) =>
    req(`/logbook/${id}`, { method: "DELETE" }),
  logbookPortfolio: () => req("/logbook/portfolio"),

  // ---- Pillar 4: OSCE (Skills Lab) ----
  osceStations: (category?: string, difficulty?: string) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (difficulty) params.append("difficulty", difficulty);
    const qs = params.toString();
    return req(`/osce/stations${qs ? `?${qs}` : ""}`);
  },
  osceStation: (id: string) => req(`/osce/stations/${encodeURIComponent(id)}`),
  osceAttempt: (
    station_id: string,
    checked_steps: number[],
    time_spent_seconds?: number,
    self_notes?: string
  ) =>
    req("/osce/attempt", {
      method: "POST",
      body: JSON.stringify({ station_id, checked_steps, time_spent_seconds, self_notes }),
    }),
  osceHistory: () => req("/osce/history"),
  osceAiExaminerStream: async (
    station_id: string,
    checked_steps: number[],
    self_notes: string,
    onDelta: (s: string) => void,
    onDone: () => void,
    onError: (e: string) => void
  ) => {
    const token = await getToken();
    let res: Response;
    try {
      res = await fetch(`${API_URL}/osce/ai-examiner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ station_id, checked_steps, self_notes }),
      });
    } catch {
      onError(`Cannot reach the server at ${BACKEND_URL || API_URL}.`); return;
    }
    if (!res.ok) {
      let data: any = null;
      try { data = await res.json(); } catch {}
      onError(errorMessage(data, res.status)); return;
    }
    if (!res.body) { onError("No response body"); return; }
    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) { onDone(); return; }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const p of parts) {
        const line = p.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const data = JSON.parse(line.slice(5).trim());
          if (data.delta) onDelta(data.delta);
          if (data.done) { onDone(); return; }
          if (data.error) { onError(data.error); return; }
        } catch {}
      }
    }
  },

  // ---- Pillar 8: Languages (OET, IELTS, German) ----
  langOET: () => req("/languages/oet"),
  langIELTS: () => req("/languages/ielts"),
  langGerman: (level?: string) => req(`/languages/german${level ? `?level=${encodeURIComponent(level)}` : ""}`),
  langGermanLesson: (id: string) => req(`/languages/german/${id}`),
  oetWritingFeedback: (letter_text: string) =>
    req("/languages/oet/writing-feedback", { method: "POST", body: JSON.stringify({ letter_text }) }),
  languagePracticeStream: async (
    type: string,
    user_input: string,
    context: string = "",
    onDelta: (s: string) => void,
    onDone: () => void,
    onError: (e: string) => void
  ) => {
    const token = await getToken();
    let res: Response;
    try {
      res = await fetch(`${API_URL}/languages/practice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type, user_input, context }),
      });
    } catch {
      onError(`Cannot reach the server at ${BACKEND_URL || API_URL}.`); return;
    }
    if (!res.ok) {
      let data: any = null;
      try { data = await res.json(); } catch {}
      onError(errorMessage(data, res.status)); return;
    }
    if (!res.body) { onError("No response body"); return; }
    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) { onDone(); return; }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const p of parts) {
        const line = p.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const data = JSON.parse(line.slice(5).trim());
          if (data.delta) onDelta(data.delta);
          if (data.done) { onDone(); return; }
          if (data.error) { onError(data.error); return; }
        } catch {}
      }
    }
  },
};
