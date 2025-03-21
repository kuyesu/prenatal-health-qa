import type { Language } from "../types"

export function getFallbackResponse(language: Language, question: string): string {
  const fallbackResponses: Record<Language, string> = {
    en: `ANSWER: I apologize, but I'm having trouble connecting to my knowledge base right now. Your question was about "${question}". 

Please try again in a moment. If you're experiencing a medical emergency, please contact your healthcare provider immediately or go to the nearest emergency room.

IMPORTANT: This is an AI assistant providing educational information only and is not a substitute for professional medical advice.

SUGGESTED_QUESTIONS:
1. What is prenatal care?
2. What vitamins should I take during pregnancy?
3. How often should I visit my doctor during pregnancy?`,
    sw: `ANSWER: Samahani, nina shida ya kuunganisha na hifadhidata yangu kwa sasa. Swali lako lilikuwa kuhusu "${question}". 

Tafadhali jaribu tena baada ya muda mfupi. Ikiwa una dharura ya matibabu, tafadhali wasiliana na mtoa huduma za afya mara moja au uende katika chumba cha dharura cha karibu.

MUHIMU: Hii ni programu ya AI inayotoa taarifa za kielimu pekee na sio mbadala wa ushauri wa kitaalamu wa matibabu.

SUGGESTED_QUESTIONS:
1. Huduma ya kabla ya kuzaa ni nini?
2. Ni vitamini gani ninapaswa kumeza wakati wa ujauzito?
3. Ni mara ngapi ninapaswa kumtembelea daktari wakati wa ujauzito?`,
    lg: `ANSWER: Nsonyiwa, ndi mu buzibu okuyunga ku ttaka lyange ery'okumanya mu kiseera kino. Ekibuuzo kyo kyali kikwata ku "${question}". 

Nsaba oddemu oluvannyuma. Bwoba nga olina embeera y'obulwadde eyeetaagisa obuyambi bwangu, tusaba weetaagise omusawo wo mangu oba ogendera ku ddwaliro eririkiririramu.

KIKULU: Eno nkola ya kompyuta eyigiriza era tennaba kuddira kifo kya kubudaabudibwa kwa basawo bakugu.

SUGGESTED_QUESTIONS:
1. Obujjanjabi bw'abakazi abazito kye ki?
2. Vitamini ki ze nnina okumira nga ndi lubuto?
3. Emirundi emeka gye nnina okukyalira omusawo nga ndi lubuto?`,
    ru: `ANSWER: Nimbesimire, ndi omu oburemeezi bw'okukoresa amaani gangye g'okumanya hati. Ekibuuzo kyawe kikaba nikikikwata "${question}". 

Nooshabwa kugyezaho omurundi ogundi. Ku oraabe noine endwara erikukyetaagisa okutwaara bwangu aha irwariro, shaba kukwatagana n'omushaaho wawe ahonaaho nari kuza aha irwariro eririhereraine.

KIKURU: Eri ni puroguraamu erikukozesebwa kushoborokya kwonka kandi ti nkomwanya gw'okuhabwamu ekiteekateeko ky'eby'amagara okuruga aha bashaaho abarimu.

SUGGESTED_QUESTIONS:
1. Obujanjabi bw'abakaziabaziito niki?
2. Ni vitamini ki zi nshemereire kumira obu ndikuba ndi enda?
3. Ninteekwa kukyalira omusawo emirundi engahi obu ndikuba ndi enda?`,
  }

  return fallbackResponses[language] || fallbackResponses.en
}

