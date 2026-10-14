import { profiles, type SpecialistHandler } from "../shared/contracts.js";
// Fixture gerçek analiz yapmaz; sonuç modu istemciye açıkça aktarılır.
export const handler: SpecialistHandler = {
  mode: "fixture",
  async execute(_input) {
    return { profile: profiles.summary, mode: "fixture", output: {"summary": "Bu bir geliştirme fixture sonucudur; metin özetlenmedi."} };
  },
};
