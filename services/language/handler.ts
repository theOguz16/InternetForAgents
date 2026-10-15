import { profiles, type SpecialistHandler } from "../shared/contracts.js";
import { detectLanguage } from "./detect.js";

export const handler: SpecialistHandler = {
  mode: "deterministic",
  async execute(input) {
    return { profile: profiles.language, mode: "deterministic", output: { language: detectLanguage(input.text) } };
  },
};
