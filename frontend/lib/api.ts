import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5분 타임아웃 (PDF 처리 시간 고려)
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    console.log(`API 요청: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API 요청 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    console.log(`API 응답: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API 응답 오류:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// 타입 정의
export interface UploadResponse {
  success: boolean;
  message: string;
  doc_id: string;
  filename: string;
  file_size: number;
  total_chunks: number;
  total_pages: number;
  embedding_dimension: number;
}

export interface QuestionRequest {
  question: string;
  top_k?: number;
}

export interface QuestionResponse {
  answer: string;
  sources: Array<{
    filename: string;
    page: string | number;
    chunk_id: string | number;
    score: number;
    content_preview: string;
  }>;
  retrieved_chunks: number;
  question: string;
  error?: string;
}

export interface Document {
  doc_id: string;
  filename: string;
  file_size_mb: number;
  created_at: string;
  status: {
    pdf_exists: boolean;
    vector_exists: boolean;
    metadata_exists: boolean;
    processed: boolean;
  };
}

export interface DocumentListResponse {
  documents: Document[];
  statistics: {
    total_documents: number;
    processed_documents: number;
    total_size_mb: number;
    pending_processing: number;
  };
}

// API 함수들
export const apiService = {
  // PDF 업로드
  async uploadPDF(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload/pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // 업로드 상태 확인
  async getUploadStatus(docId: string) {
    const response = await api.get(`/upload/status/${docId}`);
    return response.data;
  },

  // 질문하기
  async askQuestion(request: QuestionRequest): Promise<QuestionResponse> {
    const response = await api.post('/ask/', request);
    return response.data;
  },

  // 문서 검색 (답변 생성 없이)
  async searchDocuments(request: QuestionRequest) {
    const response = await api.post('/ask/search', request);
    return response.data;
  },

  // QA 시스템 테스트
  async testQASystem() {
    const response = await api.get('/ask/test');
    return response.data;
  },

  // 문서 목록 조회
  async getDocuments(): Promise<DocumentListResponse> {
    const response = await api.get('/admin/documents');
    return response.data;
  },

  // 문서 상세 정보
  async getDocumentDetails(docId: string) {
    const response = await api.get(`/admin/documents/${docId}`);
    return response.data;
  },

  // 문서 삭제
  async deleteDocument(docId: string) {
    const response = await api.delete(`/admin/documents/${docId}`);
    return response.data;
  },

  // 정리 대상 파일 미리보기
  async previewCleanup() {
    const response = await api.get('/admin/cleanup/preview');
    return response.data;
  },

  // 고아 파일 정리
  async cleanupFiles() {
    const response = await api.post('/admin/cleanup');
    return response.data;
  },

  // 선택된 문서들 삭제
  async deleteSelectedDocuments(docIds: string[]) {
    const response = await api.post('/admin/delete-selected', docIds);
    return response.data;
  },

  // 문서 파일명 수정
  async updateDocumentFilename(docId: string, newFilename: string) {
    const response = await api.put(`/admin/documents/${docId}/filename`, null, {
      params: { new_filename: newFilename }
    });
    return response.data;
  },

  // 시스템 통계
  async getStatistics() {
    const response = await api.get('/admin/statistics');
    return response.data;
  },

  // 헬스 체크
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // 서버 정보
  async getServerInfo() {
    const response = await api.get('/');
    return response.data;
  },
};

export default api; 