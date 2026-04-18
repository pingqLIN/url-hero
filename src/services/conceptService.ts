import { GoogleGenAI, Type } from '@google/genai';
import type { Locale } from '../i18n/messages';
import type { ConceptResult, SectionKey, TFunction } from '../types';

type BuildSystemPromptParams = {
  analysisLanguage: string;
  mascotInstruction: string;
  t: TFunction;
  url: string;
};

type DemoConceptParams = {
  locale: Locale;
  url: string;
};

type FetchConceptParams = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  t: TFunction;
  url: string;
};

type FetchRegeneratedPromptParams = {
  apiKey: string;
  mascotInstruction: string;
  model: string;
  result: ConceptResult;
  t: TFunction;
  url: string;
};

type FetchRegeneratedSectionParams = {
  apiKey: string;
  model: string;
  result: ConceptResult;
  section: SectionKey;
  t: TFunction;
  url: string;
};

export function buildSystemPrompt({
  analysisLanguage,
  mascotInstruction,
  t,
  url,
}: BuildSystemPromptParams) {
  return `
${t('systemPromptRole')}
${t('systemPromptTask')}

${t('systemPromptJson')}

${t('systemPromptRules')}
1. ${t('systemPromptRule1', { language: analysisLanguage })}
2. ${t('systemPromptRule2')}
3. ${t('systemPromptRule3', { mascotInstruction })}
4. ${t('systemPromptRule4', { url })}
5. ${t('systemPromptRule5')}
6. ${t('systemPromptRule6')}
`.trim();
}

export function buildDemoConceptResult({ locale, url }: DemoConceptParams): ConceptResult {
  return {
    section1: {
      content:
        locale === 'zh-TW'
          ? `以 ${url} 為核心，主打「信任、速度、未來感」三大支柱，塑造可立即辨識的品牌人格。`
          : `Built around ${url}, the concept focuses on trust, speed, and futuristic clarity to create an instantly recognizable mascot identity.`,
      keywords:
        locale === 'zh-TW'
          ? ['可信賴', '流線速度', '數位未來', '品牌識別']
          : ['trustworthy', 'streamlined speed', 'digital future', 'brand identity'],
    },
    section2: {
      content:
        locale === 'zh-TW'
          ? '角色採用圓潤幾何比例與友善表情，眼部有發光 HUD 介面語彙，整體形象偏高端科技吉祥物。'
          : 'The character uses soft geometric proportions with a friendly face, featuring glowing HUD-inspired eyes and a premium tech-mascot silhouette.',
    },
    section3: {
      content:
        locale === 'zh-TW'
          ? '搭配發光手環、懸浮徽章與品牌符號化背包，強化任務導向與服務感。'
          : 'It includes luminous wrist gear, floating badges, and a symbolic utility pack to reinforce a mission-ready service personality.',
    },
    section4: {
      content:
        locale === 'zh-TW'
          ? '場景為半透明數位舞台，漂浮網址字樣與資訊面板環繞，呈現沉浸式品牌入口。'
          : 'The scene is a translucent digital stage with floating URL lettering and orbiting UI panels, presenting an immersive brand gateway.',
    },
    section5: {
      content:
        locale === 'zh-TW'
          ? '主光偏暖、邊緣輪廓光偏冷，背景以柔霧體積光襯托角色，形成高質感展示氛圍。'
          : 'Warm key light, cool rim light, and soft volumetric haze in the background create a polished showcase atmosphere.',
    },
    section6: {
      content: `A highly detailed, realistic 3D cartoon mascot representing the website "${url}", premium cinematic advertising composition, charming and trustworthy character design, glowing holographic UI accents, floating neon URL signage, stylized digital stage, physically based materials, depth of field, dramatic key and rim lighting, Unreal Engine 5, Octane render, ray tracing, 8k.`,
    },
  };
}

export async function fetchConcept({
  apiKey,
  model,
  systemPrompt,
  t,
  url,
}: FetchConceptParams): Promise<ConceptResult> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: `${t('targetUrlPrefix')}${url}`,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          section1: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING, description: t('schemaSection1Content') },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: t('schemaSection1Keywords'),
              },
            },
          },
          section2: {
            type: Type.OBJECT,
            properties: { content: { type: Type.STRING, description: t('schemaSection2Content') } },
          },
          section3: {
            type: Type.OBJECT,
            properties: { content: { type: Type.STRING, description: t('schemaSection3Content') } },
          },
          section4: {
            type: Type.OBJECT,
            properties: { content: { type: Type.STRING, description: t('schemaSection4Content') } },
          },
          section5: {
            type: Type.OBJECT,
            properties: { content: { type: Type.STRING, description: t('schemaSection5Content') } },
          },
          section6: {
            type: Type.OBJECT,
            properties: { content: { type: Type.STRING, description: t('schemaSection6Content') } },
          },
        },
      },
    },
  });

  if (!response.text) throw new Error(t('errorGenerateContent'));
  return JSON.parse(response.text) as ConceptResult;
}

export async function fetchRegeneratedPrompt({
  apiKey,
  mascotInstruction,
  model,
  result,
  t,
  url,
}: FetchRegeneratedPromptParams): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const systemPrompt = `
${t('regenPromptRole')}
${t('regenPromptTask')}

1. ${t('coreConcept')}: ${result.section1.content}
2. ${t('characterSubject')}: ${result.section2.content}
3. ${t('equipment')}: ${result.section3.content}
4. ${t('environment')}: ${result.section4.content}
5. ${t('lighting')}: ${result.section5.content}

- ${t('systemPromptRule3', { mascotInstruction })}
- ${t('systemPromptRule4', { url })}
- ${t('systemPromptRule5')}
- ${t('systemPromptRule6')}
`.trim();

  const response = await ai.models.generateContent({
    model,
    contents: t('regenPromptInstruction'),
    config: { systemInstruction: systemPrompt },
  });

  if (!response.text) throw new Error(t('errorGeneratePrompt'));
  return response.text;
}

export async function fetchRegeneratedSection({
  apiKey,
  model,
  result,
  section,
  t,
  url,
}: FetchRegeneratedSectionParams): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  
  const sectionTitleKey = {
    section1: 'coreConcept',
    section2: 'characterSubject',
    section3: 'equipment',
    section4: 'environment',
    section5: 'lighting',
    section6: 'aiVisualPrompt',
  }[section] as string;

  const systemPrompt = `
${t('systemPromptRole')}
${t('regenSectionTask', { section: t(sectionTitleKey) })}

Current Concept Context:
1. ${t('coreConcept')}: ${result.section1.content}
2. ${t('characterSubject')}: ${result.section2.content}
3. ${t('equipment')}: ${result.section3.content}
4. ${t('environment')}: ${result.section4.content}
5. ${t('lighting')}: ${result.section5.content}

Target URL: ${url}
`.trim();

  const response = await ai.models.generateContent({
    model,
    contents: `Please rethink and rewrite the "${t(sectionTitleKey)}" part.`,
    config: { systemInstruction: systemPrompt },
  });

  if (!response.text) throw new Error(t('errorGenerateContent'));
  return response.text;
}
