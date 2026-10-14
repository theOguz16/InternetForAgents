import { profiles, type SpecialistHandler } from "../shared/contracts.js";
import { extractKeywords } from "./extract.js";

export const handler: SpecialistHandler = {
  mode: "deterministic",
  async execute(input) {
    return { profile: profiles.keywords, mode: "deterministic", output: { keywords: extractKeywords(input.text) } };
  },
};
