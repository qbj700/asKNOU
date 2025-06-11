import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import UploadForm from '../components/UploadForm';
import { apiService, Document, UploadResponse } from '../lib/api';

export default function Admin() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsResponse, statsResponse] = await Promise.all([
        apiService.getDocuments(),
        apiService.getStatistics()
      ]);
      
      setDocuments(docsResponse.documents);
      setStatistics({
        documents: docsResponse.statistics,
        system: statsResponse
      });
    } catch (error: any) {
      showNotification('error', `데이터 로드 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadSuccess = (response: UploadResponse) => {
    showNotification('success', `${response.filename} 업로드 완료! (${response.total_chunks}개 청크 생성)`);
    loadData(); // 문서 목록 새로고침
  };

  const handleUploadError = (error: string) => {
    showNotification('error', error);
  };

  const handleDeleteDocument = async (docId: string, filename: string) => {
    if (!confirm(`'${filename}' 문서를 삭제하시겠습니까?`)) return;

    try {
      await apiService.deleteDocument(docId);
      showNotification('success', `${filename} 문서가 삭제되었습니다.`);
      loadData(); // 문서 목록 새로고침
    } catch (error: any) {
      showNotification('error', `삭제 실패: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('불완전한 파일들을 정리하시겠습니까?')) return;

    try {
      const response = await apiService.cleanupFiles();
      showNotification('success', response.message);
      loadData(); // 문서 목록 새로고침
    } catch (error: any) {
      showNotification('error', `정리 실패: ${error.response?.data?.detail || error.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-knou-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>관리자 - asKNOU</title>
        <meta name="description" content="asKNOU 관리자 페이지" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 알림 */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {notification.message}
          </div>
        )}

        {/* 헤더 */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center">
                  <span className="text-2xl">🎓</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-knou-600">asKNOU 관리자</h1>
                  <p className="text-xs text-gray-500">문서 관리 및 시스템 모니터링</p>
                </div>
              </div>
              
              <nav className="flex items-center space-x-4">
                <Link href="/" className="text-gray-600 hover:text-knou-600 transition-colors">
                  ← 사용자 페이지
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 업로드 섹션 */}
            <div className="lg:col-span-1">
              <UploadForm 
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>

            {/* 통계 및 문서 관리 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 통계 카드들 */}
              {statistics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-knou-600">
                      {statistics.documents.total_documents}
                    </div>
                    <div className="text-sm text-gray-600">총 문서</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {statistics.documents.processed_documents}
                    </div>
                    <div className="text-sm text-gray-600">처리 완료</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {statistics.system.vector_statistics.total_vectors}
                    </div>
                    <div className="text-sm text-gray-600">총 벡터</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {statistics.documents.total_size_mb.toFixed(1)}MB
                    </div>
                    <div className="text-sm text-gray-600">총 용량</div>
                  </div>
                </div>
              )}

              {/* 시스템 상태 */}
              {statistics && (
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">🔧 시스템 상태</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">임베딩 모델</h4>
                      <div className="text-sm text-gray-600">
                        <p>상태: {statistics.system.system_status.embedding_model.loaded ? '✅ 로드됨' : '❌ 미로드'}</p>
                        <p>모델: {statistics.system.system_status.embedding_model.model_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Gemini API</h4>
                      <div className="text-sm text-gray-600">
                        <p>상태: {statistics.system.system_status.gemini_api === 'success' ? '✅ 연결됨' : '❌ 오류'}</p>
                        <p>{statistics.system.system_status.gemini_message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 문서 목록 */}
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">📄 업로드된 문서</h3>
                  <button
                    onClick={handleCleanup}
                    className="btn-secondary text-sm"
                  >
                    🧹 정리
                  </button>
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    업로드된 문서가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">파일명</th>
                          <th className="px-4 py-2 text-left">크기</th>
                          <th className="px-4 py-2 text-left">업로드일</th>
                          <th className="px-4 py-2 text-left">상태</th>
                          <th className="px-4 py-2 text-center">작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc.doc_id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {doc.filename}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {doc.doc_id.slice(0, 8)}...
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {doc.file_size_mb.toFixed(2)} MB
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatDate(doc.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              {doc.status.processed ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✅ 완료
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  ⏳ 처리중
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteDocument(doc.doc_id, doc.filename)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 