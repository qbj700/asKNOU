import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import UploadForm from '../components/UploadForm';
import AdminLogin from '../components/AdminLogin';
import { apiService, Document, UploadResponse } from '../lib/api';

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<any>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameDocument, setRenameDocument] = useState<Document | null>(null);
  const [newFilename, setNewFilename] = useState('');

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

  // 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = () => {
      const loginStatus = sessionStorage.getItem('admin_logged_in');
      const loginTime = sessionStorage.getItem('admin_login_time');
      
      if (loginStatus === 'true' && loginTime) {
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - parseInt(loginTime);
        // 24시간 세션 유지
        if (timeDiff < 24 * 60 * 60 * 1000) {
          setIsLoggedIn(true);
        } else {
          // 세션 만료
          sessionStorage.removeItem('admin_logged_in');
          sessionStorage.removeItem('admin_login_time');
          setIsLoggedIn(false);
        }
      }
    };

    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_logged_in');
    sessionStorage.removeItem('admin_login_time');
    setIsLoggedIn(false);
  };

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

  const handleCleanupClick = async () => {
    try {
      const preview = await apiService.previewCleanup();
      setCleanupPreview(preview);
      setShowCleanupModal(true);
    } catch (error: any) {
      showNotification('error', `정리 미리보기 실패: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleCleanupConfirm = async () => {
    try {
      const response = await apiService.cleanupFiles();
      showNotification('success', response.message);
      setShowCleanupModal(false);
      setCleanupPreview(null);
      loadData(); // 문서 목록 새로고침
    } catch (error: any) {
      showNotification('error', `정리 실패: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleSelectDocument = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc.doc_id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedDocuments.size === 0) {
      showNotification('error', '삭제할 문서를 선택해주세요.');
      return;
    }
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await apiService.deleteSelectedDocuments(Array.from(selectedDocuments));
      showNotification('success', response.message);
      setShowDeleteModal(false);
      setSelectedDocuments(new Set());
      loadData(); // 문서 목록 새로고침
    } catch (error: any) {
      showNotification('error', `삭제 실패: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleRenameClick = (doc: Document) => {
    setRenameDocument(doc);
    setNewFilename(doc.filename.replace('.pdf', ''));
    setShowRenameModal(true);
  };

  const handleRenameConfirm = async () => {
    if (!renameDocument || !newFilename.trim()) {
      showNotification('error', '파일명을 입력해주세요.');
      return;
    }

    try {
      const response = await apiService.updateDocumentFilename(renameDocument.doc_id, newFilename.trim());
      showNotification('success', response.message);
      setShowRenameModal(false);
      setRenameDocument(null);
      setNewFilename('');
      loadData(); // 문서 목록 새로고침
    } catch (error: any) {
      showNotification('error', `파일명 수정 실패: ${error.response?.data?.detail || error.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  // 로그인하지 않은 경우 로그인 화면 표시
  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>관리자 로그인 - asKNOU</title>
          <meta name="description" content="asKNOU 관리자 로그인" />
        </Head>
        <AdminLogin onLogin={handleLogin} />
      </>
    );
  }

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
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            <div className="whitespace-pre-line break-words">
              {notification.message}
            </div>
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
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  로그아웃
                </button>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

          {/* 업로드 섹션 */}
          <div className="w-full">
            <UploadForm 
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>

          {/* 문서 목록 */}
          <div className="card">
                        <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">📄 업로드된 문서</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedDocuments.size === 0}
                  className={`px-3 py-1.5 text-sm font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    selectedDocuments.size === 0 
                      ? 'text-gray-400 bg-gray-200 cursor-not-allowed' 
                      : 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  🗑️ 삭제 {selectedDocuments.size > 0 ? `(${selectedDocuments.size})` : ''}
                </button>
                <button
                  onClick={handleCleanupClick}
                  disabled={documents.length === 0}
                  className={`px-3 py-1.5 text-sm font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    documents.length === 0
                      ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                      : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-knou-500'
                  }`}
                >
                  🧹 불완전 파일 정리
                </button>
              </div>
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
                      <th className="px-4 py-2 text-center w-12">
                        <input
                          type="checkbox"
                          checked={documents.length > 0 && selectedDocuments.size === documents.length}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-knou-600 focus:ring-knou-500"
                        />
                      </th>
                      <th className="px-4 py-2 text-center">파일명</th>
                      <th className="px-4 py-2 text-center">크기</th>
                      <th className="px-4 py-2 text-center">업로드일</th>
                      <th className="px-4 py-2 text-center">상태</th>
                      <th className="px-4 py-2 text-center">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                                            {documents.map((doc) => (
                          <tr 
                            key={doc.doc_id} 
                            className={`border-t transition-colors duration-150 ${
                              selectedDocuments.has(doc.doc_id) 
                                ? 'bg-knou-50 hover:bg-knou-100' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedDocuments.has(doc.doc_id)}
                                onChange={() => handleSelectDocument(doc.doc_id)}
                                className="rounded border-gray-300 text-knou-600 focus:ring-knou-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {doc.filename}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                ID: {doc.doc_id}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-center">
                              {doc.file_size_mb.toFixed(2)} MB
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-center">
                              {formatDate(doc.created_at)}
                            </td>
                            <td className="px-4 py-3 text-center">
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
                                onClick={() => handleRenameClick(doc)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                📝 파일명 수정
                              </button>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* 정리 확인 모달 */}
        {showCleanupModal && cleanupPreview && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCleanupModal(false);
              setCleanupPreview(null);
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">🧹 파일 정리 확인</h3>
              </div>
              
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">정리 기능 설명</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    업로드되었지만 처리가 완료되지 않은 파일들을 삭제합니다.<br/>
                    벡터 저장소나 메타데이터가 없어 검색에 사용할 수 없는 파일들입니다.
                  </p>
                </div>

                {cleanupPreview.total_count === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-green-600 text-lg mb-2">✅</div>
                    <p className="text-gray-600">정리가 필요한 파일이 없습니다.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm font-medium text-yellow-800">
                        삭제 예정: {cleanupPreview.total_count}개 파일 
                        ({cleanupPreview.total_size_mb.toFixed(2)} MB)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-700">삭제될 파일 목록:</h5>
                      <div className="max-h-48 overflow-y-auto border rounded-md">
                        {cleanupPreview.cleanup_targets.map((file: any, index: number) => (
                          <div key={file.doc_id} className="px-3 py-2 border-b last:border-b-0 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                                <p className="text-xs text-gray-500">
                                  크기: {file.file_size_mb.toFixed(2)} MB | ID: {file.doc_id.slice(0, 8)}...
                                </p>
                              </div>
                              <div className="ml-2 flex flex-col text-xs text-red-600">
                                {file.issues.no_vector && <span>❌ 벡터 없음</span>}
                                {file.issues.no_metadata && <span>❌ 메타데이터 없음</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCleanupModal(false);
                    setCleanupPreview(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                {cleanupPreview.total_count > 0 && (
                  <button
                    onClick={handleCleanupConfirm}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                  >
                    정리 실행 ({cleanupPreview.total_count}개 삭제)
                  </button>
                )}
              </div>
                         </div>
           </div>
         )}

        {/* 선택 삭제 확인 모달 */}
        {showDeleteModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">🗑️ 선택된 문서 삭제</h3>
              </div>
              
              <div className="px-6 py-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    선택된 <strong>{selectedDocuments.size}개 문서</strong>를 완전히 삭제하시겠습니까?
                  </p>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-800">
                      ⚠️ 이 작업은 되돌릴 수 없습니다.
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      PDF 파일, 벡터 데이터베이스, 메타데이터가 모두 삭제됩니다.
                    </p>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border rounded-md bg-gray-50">
                  {documents
                    .filter(doc => selectedDocuments.has(doc.doc_id))
                    .map((doc) => (
                      <div key={doc.doc_id} className="px-3 py-2 border-b last:border-b-0">
                        <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                        <p className="text-xs text-gray-500">
                          {doc.file_size_mb.toFixed(2)} MB | ID: {doc.doc_id.slice(0, 8)}...
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  삭제 ({selectedDocuments.size}개)
                </button>
              </div>
                         </div>
           </div>
         )}

        {/* 파일명 수정 모달 */}
        {showRenameModal && renameDocument && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowRenameModal(false);
              setRenameDocument(null);
              setNewFilename('');
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">📝 파일명 수정</h3>
              </div>
              
              <div className="px-6 py-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    현재 파일명: <span className="font-medium">{renameDocument.filename}</span>
                  </p>
                  <p className="text-xs text-gray-500 font-mono mb-3">
                    ID: {renameDocument.doc_id}
                  </p>
                </div>

                <div className="mb-4">
                  <label htmlFor="newFilename" className="block text-sm font-medium text-gray-700 mb-2">
                    새 파일명
                  </label>
                  <input
                    id="newFilename"
                    type="text"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-knou-500 focus:border-knou-500"
                    placeholder="새로운 파일명을 입력하세요"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    .pdf 확장자는 자동으로 추가됩니다.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRenameModal(false);
                    setRenameDocument(null);
                    setNewFilename('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleRenameConfirm}
                  disabled={!newFilename.trim()}
                  className={`px-4 py-2 text-sm font-medium border border-transparent rounded-md ${
                    newFilename.trim()
                      ? 'text-white bg-knou-600 hover:bg-knou-700'
                      : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  }`}
                >
                  수정
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 