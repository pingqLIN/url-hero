import React, { useState, useEffect } from 'react';
import { 
  Link2, Key, Settings2, Sparkles, Image as ImageIcon, 
  Copy, Check, ExternalLink, Zap, Box, Paintbrush, 
  Map, Lightbulb, Bot, AlertCircle, RefreshCw, Edit2, Save
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion } from 'motion/react';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const colorThemes = [
  { id: 'default', name: 'Original Brand Colors', desc: 'Use the extracted brand palette', colors: ['#e2e8f0', '#94a3b8', '#64748b', '#475569', '#334155'] },
  { id: 'tweaked1', name: 'Vibrant & Saturated', desc: 'Slightly tweaked for more pop', colors: ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6'] },
  { id: 'tweaked2', name: 'Pastel & Soft', desc: 'Slightly tweaked for a softer look', colors: ['#fecdd3', '#fbcfe8', '#fce7f3', '#e0e7ff', '#dbeafe'] },
  { id: 'different1', name: 'Neon Cyberpunk', desc: 'Vastly different, high contrast neon', colors: ['#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff0000'] },
  { id: 'different2', name: 'Monochrome Minimalist', desc: 'Vastly different, single color focus', colors: ['#ffffff', '#e5e5e5', '#a3a3a3', '#525252', '#000000'] },
];

const aspectRatios = [
  { id: '1:1', name: 'Square (1:1)' },
  { id: '16:9', name: 'Landscape (16:9)' },
  { id: '9:16', name: 'Portrait (9:16)' },
  { id: '4:3', name: 'Standard (4:3)' },
  { id: '3:4', name: 'Vertical (3:4)' },
];

export default function App() {
  const [url, setUrl] = useState('tw.yahoo.com');
  
  // Text AI Settings
  const [provider, setProvider] = useState('google');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [textAuthMethod, setTextAuthMethod] = useState<'apikey' | 'oauth'>('apikey');
  
  // Image AI Settings
  const [imageProvider, setImageProvider] = useState('google');
  const [imageModel, setImageModel] = useState('gemini-2.5-flash-image');
  const [imageApiKey, setImageApiKey] = useState('');
  const [imageAuthMethod, setImageAuthMethod] = useState<'apikey' | 'oauth'>('apikey');
  
  const [hasPaidKey, setHasPaidKey] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [manualPrompt, setManualPrompt] = useState('');
  const [error, setError] = useState('');
  
  const [copied, setCopied] = useState(false);
  
  // 算圖相關狀態
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState('');
  
  // Image Generation Options
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [includeText, setIncludeText] = useState(false);
  const [imageText, setImageText] = useState('');
  const [colorTheme, setColorTheme] = useState('default');
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [characterType, setCharacterType] = useState('B');

  useEffect(() => {
    if (result?.section2?.content) {
      const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
      const matches = result.section2.content.match(hexRegex);
      if (matches && matches.length > 0) {
        // Get up to 5 unique colors
        const uniqueColors = Array.from(new Set(matches)).slice(0, 5) as string[];
        setExtractedColors(uniqueColors);
      } else {
        setExtractedColors(['#e2e8f0', '#94a3b8', '#64748b', '#475569', '#334155']);
      }
    }
  }, [result]);

  // 編輯與重新生成狀態
  const [editModes, setEditModes] = useState<Record<string, boolean>>({});
  const [regeneratingPrompt, setRegeneratingPrompt] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasPaidKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasPaidKey(true);
    }
  };

  const providers = [
    { id: 'google', name: 'Google (Gemini)' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' }
  ];

  const models: Record<string, string[]> = {
    google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    openai: ['gpt-5.2', 'gpt-5.2-mini', 'gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
    anthropic: ['claude-4-6-sonnet', 'claude-4-5-opus', 'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022']
  };

  const imageProviders = [
    { id: 'google', name: 'Google (Gemini)' },
    { id: 'openai', name: 'OpenAI (DALL-E)' },
  ];

  const imageModels: Record<string, string[]> = {
    google: ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'],
    openai: ['dall-e-3', 'dall-e-2'],
  };

  const imageModelNames: Record<string, string> = {
    'gemini-2.5-flash-image': 'Nano Banana (Gemini 2.5 Flash Image)',
    'gemini-3.1-flash-image-preview': 'Nano Banana 2 (Gemini 3.1 Flash Image)',
    'gemini-3-pro-image-preview': 'Nano Banana Pro (Gemini 3 Pro Image)',
    'dall-e-3': 'DALL-E 3',
    'dall-e-2': 'DALL-E 2'
  };

  // 當切換供應商時，自動重置選擇的模型
  useEffect(() => {
    setModel(models[provider][0]);
  }, [provider]);

  useEffect(() => {
    setImageModel(imageModels[imageProvider][0]);
  }, [imageProvider]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('複製失敗:', err);
      setError('複製失敗，您的瀏覽器可能不支援此操作。');
    });
  };

  const toggleEdit = (section: string) => {
    setEditModes(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleContentChange = (section: string, newContent: string) => {
    setResult((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        content: newContent
      }
    }));
  };

  const generateConcept = async () => {
    if (!url) {
      setError('請輸入目標網址');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setGeneratedImage('');
    setEditModes({});

    try {
      if (provider !== 'google') {
         throw new Error(`為了網站安全 (CORS 限制)，目前測試環境建議使用 Google (Gemini) 進行測試。`);
      }

      const characterTypeMap: Record<string, string> = {
        'A': '人物 (Human)',
        'B': '擬人化動物 (Anthropomorphic Animal)',
        'C': '擬人化物品 (Anthropomorphic Object)'
      };
      const selectedCharacterType = characterTypeMap[characterType] || '擬人化動物 (Anthropomorphic Animal)';

      const systemPrompt = `
      你現在是一位頂尖的網站設計師、AI 視覺概念設計師與 AI 繪圖 Prompt 工程師。
      請深度分析使用者提供的網址 (可能包含字面意義、品牌意涵或服務內容)，並將其轉化為一個具體的「3D 廣告卡通角色」概念。
      
      【重要設定】：本次角色設計的屬性必須為「${selectedCharacterType}」。請嚴格遵循此屬性進行設計。
      
      請嚴格以 JSON 格式輸出，不要包含其他文字或 Markdown 標記。

      重要規則：
      1. Section 1 到 5 請使用繁體中文（台灣用語）。
      2. Section 6 必須是純英文的繪圖 Prompt。
      3. Section 6 的開頭必須嚴格定調為：「A highly detailed, realistic 3D cartoon mascot representing the website "[目標網址]"...」
      4. Section 6 結尾必須放上渲染風格關鍵字（如 Unreal Engine 5, Octane render, ray tracing, 8k 等）。
      `;

      const keyToUse = apiKey.trim() || (process.env as any).API_KEY || process.env.GEMINI_API_KEY;
      if (!keyToUse) {
        throw new Error('請輸入 API Key 或確保系統已設定 GEMINI_API_KEY');
      }

      const ai = new GoogleGenAI({ apiKey: keyToUse });

      const response = await ai.models.generateContent({
        model: model,
        contents: `目標網址：${url}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              section1: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING, description: "解構網址與服務，定義2-3個核心意涵的描述。" },
                  keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "風格關鍵字，需包含 3D realistic rendering, cinematic lighting 等" }
                }
              },
              section2: {
                type: Type.OBJECT,
                properties: { content: { type: Type.STRING, description: `設定最能代表該網站的「${selectedCharacterType}」。詳細描述其頭部特徵（眼睛、表情）以及身體的材質質感（如毛髮、金屬、玻璃、科技材質）。` } }
              },
              section3: {
                type: Type.OBJECT,
                properties: { content: { type: Type.STRING, description: "設計能體現該網站功能性的服裝、工具配件或手持物件。請發揮創意，讓這些配件成為角色識別的關鍵。" } }
              },
              section4: {
                type: Type.OBJECT,
                properties: { content: { type: Type.STRING, description: "設定角色所在的空間場景，背景需包含能呼應網站主題的具體物件或 UI 介面元素。" } }
              },
              section5: {
                type: Type.OBJECT,
                properties: { content: { type: Type.STRING, description: "描述畫面的主光源、邊緣光與環境光氛圍，確保角色立體感強烈且從背景中凸顯出來。" } }
              },
              section6: {
                type: Type.OBJECT,
                properties: { content: { type: Type.STRING, description: "將上述設定翻譯成的英文 Prompt。" } }
              }
            }
          }
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        setResult(JSON.parse(jsonText));
      } else {
        throw new Error('無法生成內容，請稍後再試。');
      }

    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.includes('PERMISSION_DENIED')) {
        setError('API Key 權限不足 (403 Permission Denied)。請確認您的 API Key 是否有效，或嘗試更換為其他模型（例如 gemini-2.5-flash）。部分進階模型可能需要付費專案權限。');
      } else {
        setError(err.message || '發生未知錯誤');
      }
    } finally {
      setLoading(false);
    }
  };

  const regeneratePrompt = async () => {
    if (!result) return;
    setRegeneratingPrompt(true);
    setError('');

    try {
      if (provider !== 'google') {
         throw new Error(`為了網站安全 (CORS 限制)，目前測試環境建議使用 Google (Gemini) 進行測試。`);
      }

      const characterTypeMap: Record<string, string> = {
        'A': '人物 (Human)',
        'B': '擬人化動物 (Anthropomorphic Animal)',
        'C': '擬人化物品 (Anthropomorphic Object)'
      };
      const selectedCharacterType = characterTypeMap[characterType] || '擬人化動物 (Anthropomorphic Animal)';

      const systemPrompt = `
      你現在是一位頂尖的 AI 繪圖 Prompt 工程師。
      請根據以下使用者提供的角色設定，將其翻譯成「一段完整、流暢且細節豐富的英文 Prompt」。
      
      【重要設定】：本次角色設計的屬性為「${selectedCharacterType}」。
      
      角色設定：
      1. 核心概念：${result?.section1?.content || ''}
      2. 角色主體：${result?.section2?.content || ''}
      3. 裝備配件：${result?.section3?.content || ''}
      4. 環境背景：${result?.section4?.content || ''}
      5. 光影渲染：${result?.section5?.content || ''}

      重要規則：
      1. 必須是純英文的繪圖 Prompt。
      2. 開頭必須嚴格定調為：「A highly detailed, realistic 3D cartoon mascot representing the website "${url}"...」
      3. 結尾必須放上渲染風格關鍵字（如 Unreal Engine 5, Octane render, ray tracing, 8k 等）。
      `;

      const keyToUse = apiKey.trim() || (process.env as any).API_KEY || process.env.GEMINI_API_KEY;
      if (!keyToUse) {
        throw new Error('請輸入 API Key 或確保系統已設定 GEMINI_API_KEY');
      }

      const ai = new GoogleGenAI({ apiKey: keyToUse });

      const response = await ai.models.generateContent({
        model: model,
        contents: "請根據上述設定重新生成英文 Prompt",
        config: {
          systemInstruction: systemPrompt,
        }
      });

      const newPrompt = response.text;
      if (newPrompt) {
        setResult((prev: any) => ({
          ...prev,
          section6: {
            ...prev.section6,
            content: newPrompt
          }
        }));
      } else {
        throw new Error('無法生成 Prompt，請稍後再試。');
      }

    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.includes('PERMISSION_DENIED')) {
        setError('API Key 權限不足 (403 Permission Denied)。請確認您的 API Key 是否有效，或嘗試更換為其他模型。');
      } else {
        setError(err.message || '發生未知錯誤');
      }
    } finally {
      setRegeneratingPrompt(false);
    }
  };

  const generatePreviewImage = async () => {
    let promptToUse = result ? result?.section6?.content || '' : manualPrompt;
    if (!promptToUse) return;
    
    if (colorTheme !== 'default') {
      const theme = colorThemes.find(t => t.id === colorTheme);
      promptToUse += `\n\nColor Palette Instruction: Please use a ${theme?.name} color palette (${theme?.desc}). Specifically, try to incorporate these colors: ${theme?.colors.join(', ')}.`;
    }

    if (includeText && imageText.trim()) {
      promptToUse += `\n\nTypography Instruction: The image MUST prominently feature the text "${imageText.trim()}" integrated into the design.`;
    } else {
      promptToUse += `\n\nIMPORTANT: Do NOT include any text, words, letters, or typography in the image. The image should be purely visual without any written elements.`;
    }
    
    if (aspectRatio !== '1:1') {
      promptToUse += `\n\nComposition Instruction: The image MUST be generated in a ${aspectRatio} aspect ratio.`;
    }

    setGeneratingImage(true);
    setError('');

    try {
      if (imageProvider === 'google') {
        const keyToUse = imageApiKey.trim() || (process.env as any).API_KEY || process.env.GEMINI_API_KEY;
        if (!keyToUse) {
          throw new Error('請輸入 Gemini API Key 或確保系統已設定 GEMINI_API_KEY');
        }

        const ai = new GoogleGenAI({ apiKey: keyToUse });

        const imageConfig: any = {
          aspectRatio: aspectRatio,
          aspect_ratio: aspectRatio,
        };

        if (imageModel.includes('gemini-3')) {
          imageConfig.imageSize = "1K";
        }

        const response = await ai.models.generateContent({
          model: imageModel,
          contents: {
            parts: [
              {
                text: promptToUse,
              },
            ],
          },
          config: {
            imageConfig
          }
        });

        let foundImage = false;
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            setGeneratedImage(`data:image/jpeg;base64,${base64EncodeString}`);
            foundImage = true;
            break;
          }
        }

        if (!foundImage) {
          throw new Error('算圖失敗，請稍後再試。');
        }
      } else if (imageProvider === 'openai') {
        if (!imageApiKey.trim()) {
          throw new Error('請輸入 OpenAI API Key');
        }
        
        let openaiSize = "1024x1024";
        if (aspectRatio === "16:9" || aspectRatio === "4:3") openaiSize = "1792x1024";
        if (aspectRatio === "9:16" || aspectRatio === "3:4") openaiSize = "1024x1792";
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${imageApiKey.trim()}`
          },
          body: JSON.stringify({
            model: imageModel,
            prompt: promptToUse,
            n: 1,
            size: openaiSize
          })
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || 'OpenAI 算圖失敗');
        }
        
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          setGeneratedImage(data.data[0].url);
        } else {
          throw new Error('算圖失敗，請稍後再試。');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.includes('PERMISSION_DENIED')) {
        setError('算圖 API Key 權限不足 (403 Permission Denied)。請確認您的 API Key 是否有效，或嘗試更換為其他繪圖模型（例如 gemini-2.5-flash-image）。如果您使用的是免費 Key，部分進階模型可能無法使用，建議點擊下方的「選取付費 API Key」按鈕。');
      } else {
        setError(err.message || '發生未知錯誤');
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-slate-200">
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-md flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-800">URL to Mascot</h1>
              <p className="uppercase tracking-widest text-[11px] text-indigo-400/80 font-medium">AI Visual Concept Generator</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-6 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span className="flex items-center"><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500/80" /> 3D Prompt</span>
            <span className="flex items-center"><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500/80" /> Gemini Engine</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Input & Settings */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Target URL Panel */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-widest text-slate-400 font-medium px-1">1. Target Website</h2>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Link2 className="w-4 h-4 text-indigo-400" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value.replace(/^https?:\/\//, ''))}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-md pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-sm"
                  placeholder="e.g. spotify.com"
                />
              </div>
            </div>
          </section>

          {/* Character Settings Panel */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-widest text-slate-400 font-medium px-1">2. Character Settings</h2>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="space-y-3">
                <label className="block text-[11px] uppercase tracking-widest text-slate-400 font-medium">Character Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'A', label: '人物', subLabel: 'Human', icon: '👤' },
                    { id: 'B', label: '擬人化動物', subLabel: 'Anthropomorphic Animal', icon: '🦊' },
                    { id: 'C', label: '擬人化物品', subLabel: 'Anthropomorphic Object', icon: '☕' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setCharacterType(type.id)}
                      className={`flex items-center p-3 rounded-lg border text-left transition-all ${
                        characterType === type.id 
                          ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="text-2xl mr-3">{type.icon}</div>
                      <div>
                        <div className={`text-sm font-bold ${characterType === type.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {type.label}
                        </div>
                        <div className={`text-[10px] ${characterType === type.id ? 'text-indigo-500' : 'text-slate-400'}`}>
                          {type.subLabel}
                        </div>
                      </div>
                      {characterType === type.id && (
                        <div className="ml-auto">
                          <Check className="w-4 h-4 text-indigo-500" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* AI Engine Settings */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-widest text-slate-400 font-medium px-1">
              3. Engine Configuration
            </h2>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-6">
              
              {/* Text Provider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] uppercase tracking-widest text-slate-400 font-medium">Text Analysis</label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-slate-400 transition-all appearance-none text-sm font-medium"
                      >
                        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-slate-400 transition-all appearance-none text-sm"
                      >
                        {models[provider].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-widest text-slate-400 font-medium">Authentication</span>
                    {provider === 'google' && textAuthMethod === 'apikey' && (
                      <button 
                        onClick={handleSelectKey}
                        className="text-[10px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-wider"
                      >
                        {hasPaidKey ? 'Key Selected' : 'Select Paid Key'}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex bg-slate-100 p-1 rounded-md mb-3">
                    <button
                      onClick={() => setTextAuthMethod('apikey')}
                      className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-sm transition-all ${textAuthMethod === 'apikey' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      API Key
                    </button>
                    <button
                      onClick={() => setTextAuthMethod('oauth')}
                      className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-sm transition-all ${textAuthMethod === 'oauth' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      OAuth
                    </button>
                  </div>

                  {textAuthMethod === 'apikey' ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Key className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          disabled={provider === 'google' && hasPaidKey}
                          placeholder={provider === 'google' ? (hasPaidKey ? "Using selected key" : "Default key") : "Enter API Key"}
                          className={`w-full border rounded-md pl-10 pr-4 py-2.5 focus:outline-none transition-all font-mono text-xs ${provider === 'google' && hasPaidKey ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20'}`}
                        />
                      </div>
                      {provider === 'google' && (
                        <p className="text-[10px] text-slate-500 leading-tight flex items-center">
                          {!hasPaidKey ? (
                            "若不填寫 API Key，系統將使用自帶的預設金鑰。"
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1 text-emerald-500" />
                              <span className="text-emerald-600/90 font-medium">USING SELECTED KEY</span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => alert('OAuth flow would initiate here. Please configure Client ID.')}
                      className="w-full bg-indigo-600 text-white rounded-md py-2.5 flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors active:scale-[0.98]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Connect with {providers.find(p => p.id === provider)?.name}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100 mx-1"></div>

              {/* Image Provider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] uppercase tracking-widest text-slate-400 font-medium">Image Generation</label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                      <select
                        value={imageProvider}
                        onChange={(e) => setImageProvider(e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-slate-400 transition-all appearance-none text-sm font-medium"
                      >
                        {imageProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select
                        value={imageModel}
                        onChange={(e) => setImageModel(e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-md px-4 py-2.5 focus:outline-none focus:border-slate-400 transition-all appearance-none text-sm"
                      >
                        {imageModels[imageProvider].map(m => (
                          <option key={m} value={m}>{imageModelNames[m] || m}</option>
                        ))}
                      </select>
                    </div>
                
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-widest text-slate-400 font-medium">Authentication</span>
                    {imageProvider === 'google' && imageAuthMethod === 'apikey' && (
                      <button 
                        onClick={handleSelectKey}
                        className="text-[10px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-wider"
                      >
                        {hasPaidKey ? 'Key Selected' : 'Select Paid Key'}
                      </button>
                    )}
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-md mb-3">
                    <button
                      onClick={() => setImageAuthMethod('apikey')}
                      className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-sm transition-all ${imageAuthMethod === 'apikey' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      API Key
                    </button>
                    <button
                      onClick={() => setImageAuthMethod('oauth')}
                      className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-sm transition-all ${imageAuthMethod === 'oauth' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      OAuth
                    </button>
                  </div>

                  {imageAuthMethod === 'apikey' ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Key className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <input
                          type="password"
                          value={imageApiKey}
                          onChange={(e) => setImageApiKey(e.target.value)}
                          disabled={imageProvider === 'google' && hasPaidKey}
                          placeholder={imageProvider === 'google' ? (hasPaidKey ? "Using selected key" : "Default key") : "Enter API Key"}
                          className={`w-full border rounded-md pl-10 pr-4 py-2.5 focus:outline-none transition-all font-mono text-xs ${imageProvider === 'google' && hasPaidKey ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20'}`}
                        />
                      </div>
                      {imageProvider === 'google' && (
                        <p className="text-[10px] text-slate-500 leading-tight flex items-center">
                          {!hasPaidKey ? (
                            "若不填寫 API Key，系統將使用自帶的預設金鑰。"
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1 text-emerald-500" />
                              <span className="text-emerald-600/90 font-medium">USING SELECTED KEY</span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => alert('OAuth flow would initiate here. Please configure Client ID.')}
                      className="w-full bg-indigo-600 text-white rounded-md py-2.5 flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors active:scale-[0.98]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Connect with {imageProviders.find(p => p.id === imageProvider)?.name}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <button
            onClick={generateConcept}
            disabled={loading}
            className={`w-full py-4 rounded-md font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-sm
              ${loading 
                ? 'bg-indigo-50 text-indigo-400 cursor-wait border border-indigo-100' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
              }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Generate Mascot Concept</span>
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">{error}</p>
            </motion.div>
          )}

        </div>

        {/* Right Column: Results Display */}
        <div className="lg:col-span-8 space-y-6 relative">

          {loading && (
            <div className="h-full min-h-[500px] flex items-center justify-center z-10 bg-white backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm">
               <div className="flex flex-col items-center space-y-6">
                 <div className="relative w-16 h-16">
                   <div className="absolute inset-0 border-2 border-slate-100 rounded-full"></div>
                   <div className="absolute inset-0 border-t-2 border-indigo-600 rounded-full animate-spin"></div>
                   <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-amber-500 animate-pulse" />
                 </div>
                 <p className="text-slate-500 font-medium tracking-widest text-[10px] uppercase">Extracting Brand Essence</p>
               </div>
            </div>
          )}

          {!loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 bg-white border border-slate-200 rounded-lg p-6 shadow-sm"
            >
              
              {/* Output Sections Grid */}
              {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Section 1 */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-amber-50 rounded-md flex items-center justify-center border border-amber-100">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Core Concept & Keywords</h3>
                    </div>
                    <button onClick={() => toggleEdit('section1')} className="text-slate-400 hover:text-slate-700 transition-colors">
                      {editModes['section1'] ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {editModes['section1'] ? (
                    <textarea 
                      value={result?.section1?.content || ''}
                      onChange={(e) => handleContentChange('section1', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-md p-4 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 min-h-[100px]"
                    />
                  ) : (
                    <p className="text-slate-600 leading-relaxed text-sm">{result?.section1?.content || ''}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(result?.section1?.keywords || []).map((kw: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-sm text-[10px] font-semibold uppercase tracking-wider">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Section 2 */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded-md flex items-center justify-center border border-indigo-100">
                        <Bot className="w-4 h-4 text-indigo-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Character Base</h3>
                    </div>
                    <button onClick={() => toggleEdit('section2')} className="text-slate-400 hover:text-slate-700 transition-colors">
                      {editModes['section2'] ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {editModes['section2'] ? (
                    <textarea 
                      value={result?.section2?.content || ''}
                      onChange={(e) => handleContentChange('section2', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-md p-4 text-sm focus:outline-none focus:border-slate-400 min-h-[120px]"
                    />
                  ) : (
                    <p className="text-slate-600 leading-relaxed text-sm">{result?.section2?.content || ''}</p>
                  )}
                </div>

                {/* Section 3 */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-emerald-50 rounded-md flex items-center justify-center border border-emerald-100">
                        <Paintbrush className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Equipment & Gear</h3>
                    </div>
                    <button onClick={() => toggleEdit('section3')} className="text-slate-400 hover:text-slate-700 transition-colors">
                      {editModes['section3'] ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {editModes['section3'] ? (
                    <textarea 
                      value={result?.section3?.content || ''}
                      onChange={(e) => handleContentChange('section3', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-md p-4 text-sm focus:outline-none focus:border-slate-400 min-h-[120px]"
                    />
                  ) : (
                    <p className="text-slate-600 leading-relaxed text-sm">{result?.section3?.content || ''}</p>
                  )}
                </div>

                {/* Section 4 */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded-md flex items-center justify-center border border-indigo-100">
                        <Map className="w-4 h-4 text-indigo-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Environment</h3>
                    </div>
                    <button onClick={() => toggleEdit('section4')} className="text-slate-400 hover:text-slate-700 transition-colors">
                      {editModes['section4'] ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {editModes['section4'] ? (
                    <textarea 
                      value={result?.section4?.content || ''}
                      onChange={(e) => handleContentChange('section4', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-md p-4 text-sm focus:outline-none focus:border-slate-400 min-h-[120px]"
                    />
                  ) : (
                    <p className="text-slate-600 leading-relaxed text-sm">{result?.section4?.content || ''}</p>
                  )}
                </div>

                {/* Section 5 */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-amber-50 rounded-md flex items-center justify-center border border-amber-100">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Lighting & Rendering</h3>
                    </div>
                    <button onClick={() => toggleEdit('section5')} className="text-slate-400 hover:text-slate-700 transition-colors">
                      {editModes['section5'] ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {editModes['section5'] ? (
                    <textarea 
                      value={result?.section5?.content || ''}
                      onChange={(e) => handleContentChange('section5', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-md p-4 text-sm focus:outline-none focus:border-slate-400 min-h-[120px]"
                    />
                  ) : (
                    <p className="text-slate-600 leading-relaxed text-sm">{result?.section5?.content || ''}</p>
                  )}
                </div>

              </div>
              )}

              {/* Section 6: AI Prompt Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-md flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">AI Visual Prompt</h3>
                        <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-medium">Optimized for 3D Rendering</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={regeneratePrompt}
                        disabled={regeneratingPrompt}
                        className="flex items-center space-x-2 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-md text-slate-600 transition-all disabled:opacity-50 active:scale-95"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingPrompt ? 'animate-spin' : ''}`} />
                        <span>Regenerate</span>
                      </button>
                      <button 
                        onClick={() => handleCopy(result ? result?.section6?.content || '' : manualPrompt)}
                        className="flex items-center space-x-2 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-white transition-all active:scale-95"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
                      </button>
                    </div>
                  </div>
                  
                  {editModes['section6'] ? (
                    <textarea 
                      value={result ? result?.section6?.content || '' : manualPrompt}
                      onChange={(e) => {
                        if (result) {
                          handleContentChange('section6', e.target.value);
                        } else {
                          setManualPrompt(e.target.value);
                        }
                      }}
                      placeholder="Enter your prompt here..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-md p-6 font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 min-h-[200px]"
                    />
                  ) : (
                    <div className="relative group/prompt">
                      <div className="bg-slate-50 border border-slate-200 rounded-md p-6 text-slate-600 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all">
                        {result?.section6?.content || ''}
                      </div>
                      <button 
                        onClick={() => toggleEdit('section6')} 
                        className="absolute top-4 right-4 p-2 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-slate-700 opacity-0 group-hover/prompt:opacity-100 transition-all shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Image Generation Options */}
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="block text-[11px] uppercase tracking-widest text-slate-500 font-medium">Color Palette</label>
                          <select
                            value={colorTheme}
                            onChange={(e) => setColorTheme(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                          >
                            {colorThemes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <div className="flex items-center space-x-1 mt-2">
                            {(colorTheme === 'default' && extractedColors.length > 0 ? extractedColors : colorThemes.find(t => t.id === colorTheme)?.colors || []).map((color, idx) => (
                              <div key={idx} className="w-6 h-6 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: color }} title={color} />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[11px] uppercase tracking-widest text-slate-500 font-medium">Aspect Ratio</label>
                          <select
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                          >
                            {aspectRatios.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="includeText"
                            checked={includeText}
                            onChange={(e) => setIncludeText(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor="includeText" className="text-sm text-slate-700 font-medium cursor-pointer">
                            Include Text in Image
                          </label>
                        </div>
                        
                        {includeText && (
                          <input
                            type="text"
                            value={imageText}
                            onChange={(e) => setImageText(e.target.value)}
                            placeholder="Enter text to appear in the image..."
                            className="w-full bg-white border border-slate-200 text-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                          />
                        )}
                      </div>
                    </div>

                  {/* 算圖預覽按鈕 */}
                  <div className="pt-4 flex flex-col md:flex-row items-center gap-6">
                    <button
                      onClick={generatePreviewImage}
                      disabled={generatingImage || (!result && !manualPrompt)}
                      className={`flex-1 w-full py-4 rounded-md font-bold text-sm transition-all flex items-center justify-center space-x-2 shadow-sm
                        ${generatingImage || (!result && !manualPrompt)
                          ? 'bg-indigo-50 text-indigo-400 cursor-not-allowed border border-indigo-100' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                        }`}
                    >
                      {generatingImage ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Paintbrush className="w-4 h-4 text-amber-300" />
                          <span>Generate Preview Image</span>
                        </>
                      )}
                    </button>
                  </div>

                  {generatedImage && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-8 space-y-4"
                    >
                      <div className={`relative group rounded-xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 max-w-lg mx-auto ${
                        aspectRatio === '16:9' ? 'aspect-video' : 
                        aspectRatio === '9:16' ? 'aspect-[9/16]' : 
                        aspectRatio === '4:3' ? 'aspect-[4/3]' :
                        aspectRatio === '3:4' ? 'aspect-[3/4]' :
                        'aspect-square'
                      }`}>
                        <img 
                          src={generatedImage} 
                          alt="Mascot Preview" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
                      </div>
                      <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                        Preview generated using {imageModelNames[imageModel] || imageModel}
                      </p>
                    </motion.div>
                  )}
              </div>

            </motion.div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[11px] text-slate-300 font-medium uppercase tracking-widest">
            Powered by Gemini & DALL-E • Designed with Clarity
          </p>
          <div className="flex items-center space-x-6">
            <a href="#" className="text-[11px] text-slate-300 hover:text-slate-500 transition-colors font-medium uppercase tracking-widest">Documentation</a>
            <a href="#" className="text-[11px] text-slate-300 hover:text-slate-500 transition-colors font-medium uppercase tracking-widest">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
