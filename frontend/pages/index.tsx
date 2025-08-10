import Head from 'next/head';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ChatBox, { ChatBoxRef } from '../components/ChatBox';
import { apiService } from '../lib/api';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatBoxRef = useRef<ChatBoxRef>(null);

  // 서버 헬스 상태
  const [healthStatus, setHealthStatus] = useState<'checking'|'healthy'|'degraded'|'unhealthy'>('checking');
  const [healthLabel, setHealthLabel] = useState('상태 확인중');
  const [healthTooltip, setHealthTooltip] = useState('서버 상태 확인 중');

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const res = await apiService.healthCheck();
        const embedding = Boolean(res?.system?.embedding_model_loaded);
        const gemini = res?.system?.gemini_api_status === 'success';
        const overall = res?.status === 'healthy';

        let status: 'healthy'|'degraded'|'unhealthy' = 'healthy';
        if (overall && embedding && gemini) status = 'healthy';
        else if (overall) status = 'degraded';
        else status = 'unhealthy';

        if (!isMounted) return;
        setHealthStatus(status);
        setHealthLabel(status === 'healthy' ? '온라인' : status === 'degraded' ? '일시 지연' : '오프라인');
        setHealthTooltip(
          status === 'healthy'
            ? '서버 정상 작동'
            : status === 'degraded'
            ? '일부 구성요소 점검/지연 (임베딩 또는 Gemini)'
            : '서버 응답 지연 또는 점검중'
        );
      } catch (e) {
        if (!isMounted) return;
        setHealthStatus('unhealthy');
        setHealthLabel('오프라인');
        setHealthTooltip('서버 응답 없음 또는 초기 기동 중');
      }
    };

    check();
    const id = setInterval(check, 60000);
    return () => { isMounted = false; clearInterval(id); };
  }, []);

  const statusColor = {
    checking: 'bg-gray-300',
    healthy: 'bg-green-400',
    degraded: 'bg-yellow-400',
    unhealthy: 'bg-red-400',
  }[healthStatus];

  const handleHardReload: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    window.location.href = '/';
  };

  const handleQuestionClick = (question: string) => {
    chatBoxRef.current?.askQuestion(question);
    // 모바일에서는 사이드바 닫기
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };
  return (
    <>
      <Head>
        <title>asKNOU - 방송통신대학교 AI 길라잡이</title>
        <meta name="description" content="방송통신대학교 학사정보 AI 챗봇" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-knou-50 to-blue-50">
        {/* 헤더 */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                {/* 모바일 메뉴 버튼 */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-600 hover:text-knou-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-knou-500"
                  aria-label="메뉴"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <Link href="/" onClick={handleHardReload} className="flex items-center space-x-3 group">
                  <div className="flex items-center justify-center">
                    <span className="text-2xl">🎓</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-knou-600 group-hover:text-knou-700">asKNOU</h1>
                    <p className="text-xs text-gray-500">방송통신대학교 AI 길라잡이</p>
                  </div>
                </Link>
              </div>
              
              <nav className="flex items-center space-x-2" title={healthTooltip}>
                <div className={`w-2 h-2 rounded-full animate-pulse-slow ${statusColor}`} />
                <span className="text-xs text-gray-500 hidden sm:inline">{healthLabel}</span>
              </nav>
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8 relative">
            {/* 모바일 오버레이 */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            
            {/* 사이드바 */}
            <div className={`
              lg:w-96 
              lg:relative lg:translate-x-0 lg:block
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              fixed top-0 left-0 h-full w-80 bg-white z-50 overflow-y-auto
              transition-transform duration-300 ease-in-out
              lg:transition-none lg:transform-none lg:fixed-none lg:z-auto lg:bg-transparent
              pt-0 lg:pt-0 px-4 lg:px-0
            `}>
              {/* 모바일 헤더 */}
              <div className="lg:hidden flex items-center mb-4 h-16 bg-white shadow-sm border-b px-4 -mx-4">
                <div className="flex-1"></div>
                <Link href="/" onClick={handleHardReload} className="flex items-center space-x-3">
                  <div className="flex items-center justify-center">
                    <span className="text-2xl">🎓</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-knou-600">asKNOU</h1>
                    <p className="text-xs text-gray-500">방송통신대학교 AI 길라잡이</p>
                  </div>
                </Link>
                <div className="flex-1 flex justify-end">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-md text-gray-600 hover:text-knou-600 hover:bg-gray-100"
                    aria-label="닫기"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 카드 컨테이너 */}
              <div className="space-y-6">
                {/* 자주찾는 질문 카드 */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">❓ 자주찾는 질문</h2>
                  
                  <div className="text-sm">
                    <div className="space-y-2">
                      <button
                        onClick={() => handleQuestionClick("수강신청 일정이 언제인가요?")}
                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-knou-50 hover:text-knou-700 rounded-md transition-colors duration-200 border border-transparent hover:border-knou-200"
                      >
                        수강신청 일정이 언제인가요?
                      </button>
                      <button
                        onClick={() => handleQuestionClick("졸업 요건을 알려주세요")}
                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-knou-50 hover:text-knou-700 rounded-md transition-colors duration-200 border border-transparent hover:border-knou-200"
                      >
                        졸업 요건을 알려주세요
                      </button>
                      <button
                        onClick={() => handleQuestionClick("시험 일정 및 방법은?")}
                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-knou-50 hover:text-knou-700 rounded-md transition-colors duration-200 border border-transparent hover:border-knou-200"
                      >
                        시험 일정 및 방법은?
                      </button>
                    </div>
                  </div>
                </div>

                {/* 이용안내 */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-3">📋 이용안내</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>• 구체적인 질문일수록 정확한 답변을 받을 수 있습니다</p>
                    <p>• 최신 정보는 공식 홈페이지를 확인해주세요</p>
                    <p>• 개인정보는 입력하지 마세요</p>
                    <p>• 문의사항은 관련 부서에 직접 연락바랍니다</p>
                  </div>
                </div>

                {/* 문의처 정보 */}
                <div className="card">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-center">
                      <div className="font-medium text-gray-800 mb-1">대표전화</div>
                      <div className="text-lg font-bold text-knou-600 mb-2">1577-9995</div>
                      <div className="text-xs text-gray-500">평일 09:00~18:00</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700">입학상담</div>
                      <div className="text-sm text-gray-600">1577-2853</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700">학사안내</div>
                      <div className="text-sm text-gray-600">02-3668-4334</div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">홈페이지</span>
                      <span className="text-gray-400">|</span>
                      <a 
                        href="https://www.knou.ac.kr" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-knou-600 hover:text-knou-700 underline"
                      >
                        www.knou.ac.kr
                      </a>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 text-center pt-2">
                    서울시 종로구 대학로 86 (동숭동)
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* 채팅 영역 */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border h-[758px] lg:ml-0">
              <ChatBox ref={chatBoxRef} />
            </div>
          </div>
        </main>

        {/* 푸터 */}
        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col space-y-2">
              <div className="text-sm text-gray-600 whitespace-normal lg:whitespace-nowrap break-words text-center lg:text-left">
                © 2025 asKNOU. 방송통신대학교 학사정보 AI 길라잡이 
                <span className="text-xs text-gray-500 ml-2">Powered by Gemini AI & RAG Technology</span>
              </div>
              
              <div className="text-xs text-gray-500 leading-relaxed whitespace-normal lg:whitespace-nowrap break-words text-center lg:text-left">
                본 서비스는 PyMuPDF(AGPL v3), FastAPI(MIT), Transformers(Apache 2.0) 등 다양한 오픈소스 소프트웨어를 사용하며, 전체 소스코드는 AGPL v3 라이선스에 따라 
                <a href="https://github.com/qbj700/asKNOU" target="_blank" rel="noopener noreferrer" className="text-knou-600 hover:text-knou-700 underline ml-1">GitHub</a>에서 공개되어 있습니다.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
} 