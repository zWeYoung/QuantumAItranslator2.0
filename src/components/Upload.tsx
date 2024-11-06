import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, ArrowRight } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { useNavigate } from 'react-router-dom';

const LANGUAGES = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' },
];

export default function Upload() {
  const { processFile, processText } = useTranslation();
  const navigate = useNavigate();
  const [targetLanguage, setTargetLanguage] = useState('zh');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('文件大小不能超过 20MB');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const translation = await processFile(file, targetLanguage);
      navigate(`/translation/${translation.id}`);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('处理失败，请检查 API 设置和网络连接');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [processFile, navigate, targetLanguage]);

  const handleTextTranslation = async () => {
    if (!inputText.trim()) {
      setError('请输入需要翻译的文本');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const translation = await processText(inputText, targetLanguage);
      navigate(`/translation/${translation.id}`);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('处理失败，请检查 API 设置和网络连接');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    disabled: isProcessing,
    maxSize: 20 * 1024 * 1024,
  });

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-100">
        Quantum AI Translator
      </h1>

      {/* 目标语言选择 */}
      <div className="mb-8 bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-100 whitespace-nowrap">请先选择翻译后的目标语言：</h2>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-48 rounded-lg bg-gray-900 border-gray-700 text-gray-100"
            disabled={isProcessing}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex gap-6">
        {/* 文本输入区域 */}
        <div className="flex-[2] bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">文本翻译</h2>
          <div className="space-y-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="请输入需要翻译的文本..."
              className="w-full h-[400px] p-4 rounded-lg bg-gray-900 text-gray-100 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
              disabled={isProcessing}
            />
            <div className="flex justify-end">
              <button
                onClick={handleTextTranslation}
                disabled={isProcessing || !inputText.trim()}
                className={`flex items-center px-6 py-2 rounded-lg transition-colors ${
                  isProcessing || !inputText.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                {isProcessing ? '翻译中...' : '开始翻译'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>

        {/* 图片上传区域 */}
        <div className="flex-1 bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">图片翻译</h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors h-[400px] flex flex-col items-center justify-center
              ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-blue-500 hover:bg-gray-700/50'}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <UploadIcon className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-100">
              {isProcessing ? '处理中...' : isDragActive ? '将文件拖放到此处' : '上传图片文件并翻译'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              支持图片文件（PNG、JPG、GIF、WebP）
            </p>
            <button 
              className={`px-4 py-2 rounded-lg transition-colors ${
                isProcessing 
                  ? 'bg-gray-700 text-gray-400' 
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
              disabled={isProcessing}
            >
              {isProcessing ? '处理中...' : '选择文件'}
            </button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}