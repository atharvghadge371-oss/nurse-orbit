/**
 * Curated, bundled imagery for the parts of the product that introduce a
 * Nurse Orbit journey. Keeping these assets local makes the first-use
 * experience dependable even when a device is offline or a remote image host
 * is unavailable.
 */
export const appVisuals = {
  welcomeHero: require("../assets/images/nurse-orbit-welcome-hero.png"),
  learning: require("../assets/images/nurse-orbit-learning.png"),
  clinicalSkills: require("../assets/images/nurse-orbit-clinical-skills.png"),
  examPrep: require("../assets/images/nurse-orbit-exam-prep.png"),
  globalCareer: require("../assets/images/nurse-orbit-global-career.png"),
} as const;
