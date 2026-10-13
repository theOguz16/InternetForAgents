import { profiles, type SpecialistHandler } from "../shared/contracts.js";
// Fixture gerçek analiz yapmaz; sonuç modu istemciye açıkça aktarılır.
export const handler: SpecialistHandler = {
  async execute(_input) {
    return { profile: profiles.language, mode: "fixture", output: {"language": "und"} };
  },
};
