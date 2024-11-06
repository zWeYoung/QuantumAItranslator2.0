import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import axios from 'axios';

interface Translation {
  id: string;
  fileName: string;
  timestamp: string;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
}

interface GPTConfig {
  apiKey: string;
  baseUrl: string;
}

interface TranslationContextType {
  translations: Translation[];
  gptConfig: GPTConfig;
  addTranslation: (translation: Translation) => void;
  removeTranslation: (id: string) => void;
  updateGPTConfig: (config: GPTConfig) => void;
  processFile: (file: File, targetLanguage: string) => Promise<Translation>;
  processText: (text: string, targetLanguage: string) => Promise<Translation>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const MAX_IMAGE_SIZE = 800;
const JPEG_QUALITY = 0.6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 从 localStorage 加载数据
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// 保存数据到 localStorage
const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('保存到 localStorage 失败:', error);
  }
};

async function compressImage(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('图片大小不能超过 5MB');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(width, height));
      width *= scale;
      height *= scale;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const base64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      
      const compressedSize = Math.ceil((base64.length - 'data:image/jpeg;base64,'.length) * 0.75);
      if (compressedSize > MAX_FILE_SIZE) {
        reject(new Error('压缩后图片仍然过大，请使用更小的图片'));
        return;
      }

      resolve(base64);
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function validateGPTResponse(response: any): string {
  if (!response?.choices?.[0]?.message?.content) {
    throw new Error('API 返回的响应格式无效');
  }

  const content = response.choices[0].message.content;
  
  const rejectPatterns = [
    /I('m| am) sorry/i,
    /I cannot|I can't/i,
    /unable to/i,
    /not (able|allowed) to/i
  ];

  if (rejectPatterns.some(pattern => pattern.test(content))) {
    throw new Error('模型无法处理该请求，请重试');
  }

  return content;
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [translations, setTranslations] = useState<Translation[]>(() => 
    loadFromStorage('translations', [])
  );
  
  const [gptConfig, setGPTConfig] = useState<GPTConfig>(() => 
    loadFromStorage('gptConfig', {
      apiKey: 'Link_V7OpQdP23EURKD8945Qhmcw0MC2jMct5dDOMFaPcf2-XbJjrIZq',
      baseUrl: 'https://api.link-ai.tech',
    })
  );

  // 当翻译记录更新时保存到 localStorage
  useEffect(() => {
    saveToStorage('translations', translations);
  }, [translations]);

  // 当 API 配置更新时保存到 localStorage
  useEffect(() => {
    saveToStorage('gptConfig', gptConfig);
  }, [gptConfig]);

  const addTranslation = (translation: Translation) => {
    setTranslations((prev) => [translation, ...prev]);
  };

  const removeTranslation = (id: string) => {
    setTranslations((prev) => prev.filter((t) => t.id !== id));
  };

  const updateGPTConfig = (config: GPTConfig) => {
    const normalizedBaseUrl = config.baseUrl.replace(/\/$/, '');
    setGPTConfig({ ...config, baseUrl: normalizedBaseUrl });
  };

  const makeGPTRequest = async (messages: any[], options: { max_tokens?: number, model?: string } = {}) => {
    try {
      const response = await axios.post(
        `${gptConfig.baseUrl}/v1/chat/completions`,
        {
          model: options.model || 'gpt-4o-mini',
          messages,
          temperature: 0.3,
          max_tokens: options.max_tokens || 2000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gptConfig.apiKey}`,
          },
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error('无法连接到服务器，请检查网络连接');
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error('请求超时，请重试');
        }
        if (error.response.status === 401) {
          throw new Error('API Key 无效或已过期');
        }
        if (error.response.status === 403) {
          throw new Error('API Key 无访问权限');
        }
        if (error.response.status === 429) {
          throw new Error('请求过于频繁，请稍后重试');
        }
        if (error.response.status >= 500) {
          throw new Error('服务器错误，请稍后重试');
        }
        throw new Error(error.response.data?.error?.message || '请求失败，请重试');
      }
      throw new Error('发生未知错误，请重试');
    }
  };

  const processText = async (text: string, targetLanguage: string): Promise<Translation> => {
    if (!gptConfig.apiKey) {
      throw new Error('请先配置 API Key');
    }

    try {
      const result = await makeGPTRequest([
        {
          role: 'system',
          content: `你是一位专业翻译。请将以下文本翻译成${targetLanguage}。
重要提示：
1. 必须严格保持原文的所有格式，包括换行、空格、缩进等
2. 不要改变原文的段落结构和布局
3. 保持专业术语的准确性
4. 确保翻译自然、地道
5. 不要添加任何额外的解释或注释
6. 直接返回翻译结果，不要包含任何其他内容`
        },
        {
          role: 'user',
          content: text
        }
      ]);

      const translatedText = validateGPTResponse(result);

      const translation = {
        id: Date.now().toString(),
        fileName: '文本翻译',
        timestamp: new Date().toISOString(),
        originalText: text,
        translatedText,
        targetLanguage,
      };

      addTranslation(translation);
      return translation;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('翻译过程中发生错误，请重试');
    }
  };

  const extractTextFromImage = async (base64Image: string): Promise<string> => {
    const result = await makeGPTRequest([
      {
        role: 'system',
        content: `你是一位专业的 OCR 专家。请提取图片中的文字。
重要提示：
1. 必须严格保持原文的所有格式，包括换行、空格、缩进等
2. 保持段落结构和文本布局
3. 不要添加任何解释或修改
4. 只返回提取的原始文字，不要包含任何其他内容
5. 如果图片中没有文字，请返回空字符串`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请提取这张图片中的所有文字，保持原有格式：'
          },
          {
            type: 'image_url',
            image_url: {
              url: base64Image
            }
          }
        ]
      }
    ], { max_tokens: 1000, model: 'gpt-4o' });

    return validateGPTResponse(result);
  };

  const processFile = async (file: File, targetLanguage: string): Promise<Translation> => {
    if (!gptConfig.apiKey) {
      throw new Error('请先配置 API Key');
    }

    try {
      const base64Image = await compressImage(file);
      const originalText = await extractTextFromImage(base64Image);
      
      if (!originalText.trim()) {
        throw new Error('未能从图片中提取到文字，请确保图片包含清晰的文本');
      }

      const result = await makeGPTRequest([
        {
          role: 'system',
          content: `你是一位专业翻译。请将以下文本翻译成${targetLanguage}。
重要提示：
1. 必须严格保持原文的所有格式，包括换行、空格、缩进等
2. 不要改变原文的段落结构和布局
3. 保持专业术语的准确性
4. 确保翻译自然、地道
5. 不要添加任何额外的解释或注释
6. 直接返回翻译结果，不要包含任何其他内容`
        },
        {
          role: 'user',
          content: originalText
        }
      ]);

      const translatedText = validateGPTResponse(result);

      const translation = {
        id: Date.now().toString(),
        fileName: file.name,
        timestamp: new Date().toISOString(),
        originalText,
        translatedText,
        targetLanguage,
      };

      addTranslation(translation);
      return translation;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('处理图片时发生错误，请重试');
    }
  };

  return (
    <TranslationContext.Provider value={{ 
      translations, 
      gptConfig,
      addTranslation, 
      removeTranslation,
      updateGPTConfig,
      processFile,
      processText
    }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}