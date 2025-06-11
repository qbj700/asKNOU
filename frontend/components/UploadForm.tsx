import React, { useState, useRef } from 'react';
import { apiService, UploadResponse } from '../lib/api';

interface UploadFormProps {
  onUploadSuccess?: (response: UploadResponse) => void;
  onUploadError?: (error: string) => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ onUploadSuccess, onUploadError }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      onUploadError?.('PDF 파일만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      onUploadError?.('파일 크기는 50MB를 초과할 수 없습니다.');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 프로그레스 시뮬레이션 (실제로는 axios에서 onUploadProgress 사용 가능)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await apiService.uploadPDF(selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        onUploadSuccess?.(response);
        setSelectedFile(null);
        setUploadProgress(0);
      }, 500);

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '업로드 중 오류가 발생했습니다.';
      onUploadError?.(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">📁 PDF 문서 업로드</h3>
      
      {/* 드래그 앤 드롭 영역 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver 
            ? 'border-knou-500 bg-knou-50' 
            : selectedFile 
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-knou-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {selectedFile ? (
          <div className="space-y-3">
            <div className="text-green-600">
              <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">{selectedFile.name}</div>
              <div className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</div>
            </div>
            <button
              onClick={handleRemoveFile}
              disabled={isUploading}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              파일 제거
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                PDF 파일을 여기에 드래그하거나 클릭해서 선택하세요
              </p>
              <p className="text-sm text-gray-500 mt-1">
                최대 파일 크기: 50MB
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
            >
              파일 선택
            </button>
          </div>
        )}
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 업로드 진행 상황 */}
      {isUploading && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>업로드 중...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-knou-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 업로드 버튼 */}
      {selectedFile && !isUploading && (
        <div className="mt-4">
          <button
            onClick={handleUpload}
            className="btn-primary w-full"
          >
            📤 업로드 시작
          </button>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-1">📌 업로드 안내:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>PDF 형식의 파일만 업로드 가능합니다</li>
          <li>한글 텍스트가 포함된 문서를 권장합니다</li>
          <li>업로드 후 AI가 문서를 분석하여 질문 답변에 활용합니다</li>
          <li>처리 시간은 문서 크기에 따라 1-5분 정도 소요됩니다</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadForm; 