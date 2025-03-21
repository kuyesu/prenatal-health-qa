import type { Language } from "./types"

export const LANGUAGE_NAMES: { [key in Language]: string } = {
  en: "English",
  sw: "Swahili",
  lg: "Luganda",
  ru: "Runyankore",
}

export const LANGUAGE_SPECIFIC_SUGGESTIONS: Record<Language, string[]> = {
  en: [
    "What prenatal vitamins should I take?",
    "How often should I have prenatal checkups?",
    "What foods should I avoid during pregnancy?",
    "What are the signs of labor?",
  ],
  sw: [
    "Ni vitamini gani za ujauzito ninapaswa kumeza?",
    "Ni mara ngapi ninapaswa kupata ukaguzi wa kabla ya kuzaa?",
    "Ni vyakula gani ninapaswa kuepuka wakati wa ujauzito?",
    "Ni dalili zipi za uchungu wa kuzaa?",
  ],
  lg: [
    "Vitamini ki ez'obulwadde ez'abakazi abazito ze nnina okumira?",
    "Emirundi emeka gye nnina okukebezebwa ng'ennina olubuto?",
    "Emmere ki gye nnina okwewala nga nnina olubuto?",
    "Bubonero ki obulaga nti okuzaala kusembedde?",
  ],
  ru: [
    "Vitamini ki eziragiirwa abakazi abazito?",
    "Ninteekwa kukyalira omushawo emirundi engahi obu ndaaba nzito?",
    "Ebyokurya ki ebi nshemereire kweshaasha obundaba nyizire?",
    "Bumanyiso ki obwokuzaara?",
  ],
}

export const TEST_MODE_RESPONSES: Record<Language, string> = {
  en: `ANSWER: Prenatal care is essential healthcare provided to women during pregnancy. It involves regular check-ups with healthcare providers, including doctors, midwives, or nurses, to monitor the mother's health and the baby's development. These check-ups typically include physical examinations, weight checks, blood pressure monitoring, and various screening tests.

The purpose of prenatal care is to identify and address potential health issues before they become serious, provide education about pregnancy and childbirth, and support the mother's overall wellbeing. Regular prenatal visits allow healthcare providers to track the baby's growth, check the baby's heart rate, and identify any potential complications early.

IMPORTANT: This information is provided for educational purposes only and is not a substitute for professional medical advice. Always consult with qualified healthcare providers for personalized medical recommendations.

SUGGESTED_QUESTIONS:
1. When should I start prenatal care?
2. How often should I have prenatal check-ups?
3. What tests are typically done during prenatal visits?`,
  sw: `ANSWER: Huduma ya kabla ya kuzaa ni huduma muhimu ya afya inayotolewa kwa wanawake wakati wa ujauzito. Inajumuisha ukaguzi wa mara kwa mara na watoa huduma za afya, ikiwa ni pamoja na madaktari, wakunga, au wauguzi, kufuatilia afya ya mama na maendeleo ya mtoto. Ukaguzi huu kwa kawaida unajumuisha uchunguzi wa mwili, kupima uzito, kufuatilia shinikizo la damu, na vipimo mbalimbali vya uchunguzi.

Lengo la huduma ya kabla ya kuzaa ni kutambua na kushughulikia matatizo yanayoweza kutokea kabla hayajawa makubwa, kutoa elimu kuhusu ujauzito na kuzaa, na kusaidia ustawi wa mama kwa ujumla. Ziara za mara kwa mara za kabla ya kuzaa huwaruhusu watoa huduma za afya kufuatilia ukuaji wa mtoto, kupima kasi ya moyo wa mtoto, na kutambua matatizo yoyote mapema.

MUHIMU: Taarifa hii inatolewa kwa madhumuni ya kielimu tu na sio mbadala wa ushauri wa kitaalamu wa kitiba. Daima wasiliana na watoa huduma za afya wenye sifa kwa mapendekezo ya kitiba binafsi.

SUGGESTED_QUESTIONS:
1. Ninapaswa kuanza lini huduma ya kabla ya kuzaa?
2. Ni mara ngapi ninapaswa kupata ukaguzi wa kabla ya kuzaa?
3. Ni vipimo gani vinavyofanywa wakati wa ziara za kabla ya kuzaa?`,
  lg: `ANSWER: Obujjanjabi bw'abakazi abazito bwe bujjanjabi obw'omuwendo ennyo obuweebwa abakazi nga balina embuto. Bujjamu okukeberebwa emirundi mingi n'abasawo, okulimu abasawo abakugu, abazaalisa, n'abasawo abalala, okulabirira obulamu bw'omukyala omuzito n'okukula kw'omwana. Okukeberebwa kuno kulimu okukebera embeera y'omubiri, obuzito, okupima omusaayi, n'ebigezo ebirala eby'enjawulo.

Ekigendererwa ky'obujjanjabi bw'abakazi abazito kwe kuzuula n'okukola ku bizibu eby'obulamu nga tebinnafuuka bizibu binene, okuwa amagezi ku lubuto n'okuzaala, era n'okuyamba omukyala omuzito yenna. Okukyala abasawo emirundi mingi kuyamba abasawo okulawulira okukula kw'omwana, okukebera embala y'omutima gw'omwana, n'okuzuula obuzibu bwonna amangu.

KIKULU: Amawulire gano gaweebwa lwa kusomesa mwokka, era si kifo kya kuwa kubuulirirwa kwa by'obulamu okuva eri abasawo abakugu. Bulijjo webuuze ku basawo abakugu olw'ebiragiro ebikwata ku by'obulamu ebikwata ku ggwe wennyini.

SUGGESTED_QUESTIONS:
1. Ntandika ddi obujjanjabi bw'abakazi abazito?
2. Nteekwa okukeberebwa emirundi emeka nga ndi lubuto?
3. Bigezo ki ebikozesebwa mu kukyala kw'obujjanjabi bw'abakazi abazito?`,
  ru: `ANSWER: Obujanjabi bw'abakaziabaziito n'obujanjabi bw'amaani munonga obuheebwa abakazi obubaire bari nenda. Burimu okubuganira n'abashuhuzi emirundi mingi, ababaire barimu abashaho, abashuhuzi b'okuzaarisa, nari abashaaho abandi, kureeberera amagara g'omukazi aine enda n'okukuura kw'omwana. Okubuganira uku kurimu kureebebera omubiri, okupima obuzito, okupima omushaija, n'okubuganirwa ebindi.

Ekigyendererwa ky'obujanjabi bw'abakaziabaziito n'okumanya n'okureeberera ebizibu by'amagara bitakahikire kubaire bihango, kushoborokyera aha kugira enda n'okuzaara, n'okuhwera omukazi aine enda. Okubuganirwa omushaaho emirundi mingi nikiikirizamushaaho kukuratira okukuura kw'omwana, kureeba ebirikufuga omutima gw'omwana, n'okumanya obundi buremezi ahonaaho.

KIKURU: Amakuru aga nigateerwa kugunjisa kwonka, kandi ti nk'omwanya gw'okuhabwamu ekiteekateeko ky'eby'amagara okuruga aha bashaaho abarimu obwengye. Buriijo buuza abashaaho abarimu obumanyiso kukuhabura aha by'amagara.

SUGGESTED_QUESTIONS:
1. Ntandikire ryari obujanjabi bw'abakaziabaziito?
2. Ninteekwa kureeberwa emirundi engahi obu ndikuba ndi nda?
3. Ni bipimo ki ebikorwa omu kubuganirwa obw'abakaziabaziito?`,
}

