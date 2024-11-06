import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';

const LANGUAGE_NAMES: Record<string, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  ru: 'Русский',
};

export default function Translation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { translations } = useTranslation();
  const translation = translations.find((t) => t.id === id);

  const originalRef = useRef<HTMLPreElement>(null);
  const translatedRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const syncScroll = (sourceRef: HTMLPreElement, targetRef: HTMLPreElement) => {
      const percentage =
        sourceRef.scrollTop / (sourceRef.scrollHeight - sourceRef.clientHeight);
      targetRef.scrollTop =
        percentage * (targetRef.scrollHeight - targetRef.clientHeight);
    };

    const originalElement = originalRef.current;
    const translatedElement = translatedRef.current;

    if (originalElement && translatedElement) {
      const handleOriginalScroll = () =>
        syncScroll(originalElement, translatedElement);
      const handleTranslatedScroll = () =>
        syncScroll(translatedElement, originalElement);

      originalElement.addEventListener('scroll', handleOriginalScroll);
      translatedElement.addEventListener('scroll', handleTranslatedScroll);

      return () => {
        originalElement.removeEventListener('scroll', handleOriginalScroll);
        translatedElement.removeEventListener('scroll', handleTranslatedScroll);
      };
    }
  }, []);

  if (!translation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400 text-lg">未找到翻译记录</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-100">
            {translation.fileName}
          </h1>
          <span className="ml-4 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
            {LANGUAGE_NAMES[translation.targetLanguage]}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {new Date(translation.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">原文</h2>
          <pre
            ref={originalRef}
            className="flex-1 overflow-y-auto p-6 bg-gray-800 rounded-lg font-sans whitespace-pre-wrap break-words text-base leading-relaxed text-gray-100"
          >
            {translation.originalText}
          </pre>
        </div>

        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">译文</h2>
          <pre
            ref={translatedRef}
            className="flex-1 overflow-y-auto p-6 bg-gray-800 rounded-lg font-sans whitespace-pre-wrap break-words text-base leading-relaxed text-gray-100"
          >
            {translation.translatedText}
          </pre>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center px-4 py-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回翻译页面
        </button>
      </div>
    </div>
  );
}