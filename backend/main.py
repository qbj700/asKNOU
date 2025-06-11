from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from contextlib import asynccontextmanager

from config import settings
from routers import upload, ask, admin

# 애플리케이션 시작/종료 시 실행될 함수
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 라이프사이클 관리
    """
    # 시작 시 실행
    print("=" * 50)
    print("🚀 asKNOU 백엔드 서버 시작")
    print("=" * 50)
    
    # 설정 정보 출력
    print(f"📁 데이터 디렉터리: {settings.DATA_DIR}")
    print(f"📄 PDF 저장 경로: {settings.PDF_DIR}")
    print(f"🔍 벡터 저장소 경로: {settings.VECTORSTORE_DIR}")
    print(f"🤖 임베딩 모델: {settings.EMBEDDING_MODEL}")
    print(f"🔗 Gemini API 키 설정됨: {'✅' if settings.GEMINI_API_KEY else '❌'}")
    
    # 디렉터리 생성 확인
    try:
        settings.DATA_DIR.mkdir(exist_ok=True)
        settings.PDF_DIR.mkdir(exist_ok=True)
        settings.VECTORSTORE_DIR.mkdir(exist_ok=True)
        print("📂 필요한 디렉터리들이 준비되었습니다.")
    except Exception as e:
        print(f"❌ 디렉터리 생성 오류: {e}")
    
    # 임베딩 모델 로드 확인
    try:
        from services.embedder import embedder
        if embedder.model:
            print(f"🎯 임베딩 모델 로드 성공: {settings.EMBEDDING_MODEL}")
        else:
            print("❌ 임베딩 모델 로드 실패")
    except Exception as e:
        print(f"❌ 임베딩 모델 오류: {e}")
    
    # Gemini API 연결 테스트
    try:
        from services.qa_chain import qa_chain
        test_result = qa_chain.test_connection()
        if test_result["status"] == "success":
            print("✅ Gemini API 연결 성공")
        else:
            print(f"❌ Gemini API 연결 실패: {test_result['message']}")
    except Exception as e:
        print(f"❌ Gemini API 오류: {e}")
    
    print("=" * 50)
    
    yield
    
    # 종료 시 실행
    print("🛑 asKNOU 백엔드 서버 종료")

# FastAPI 앱 생성
app = FastAPI(
    title="asKNOU Backend API",
    description="방송통신대학교 학사정보 RAG 챗봇 백엔드 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js 개발 서버
        "http://127.0.0.1:3000",
        "https://your-frontend-domain.vercel.app"  # 배포된 프론트엔드 도메인
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(upload.router)
app.include_router(ask.router)
app.include_router(admin.router)

# 루트 엔드포인트
@app.get("/")
async def root():
    """
    API 루트 엔드포인트
    """
    return {
        "message": "asKNOU Backend API",
        "description": "방송통신대학교 학사정보 RAG 챗봇 백엔드",
        "version": "1.0.0",
        "endpoints": {
            "upload_pdf": "/upload/pdf",
            "ask_question": "/ask/",
            "admin_documents": "/admin/documents",
            "api_docs": "/docs",
            "health_check": "/health"
        }
    }

# 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    """
    서버 상태 확인
    """
    try:
        # 기본 시스템 체크
        from utils.file_utils import FileManager
        documents = FileManager.list_documents()
        
        # 임베딩 모델 체크
        from services.embedder import embedder
        embedding_status = embedder.model is not None
        
        # Gemini API 체크
        from services.qa_chain import qa_chain
        gemini_test = qa_chain.test_connection()
        
        return {
            "status": "healthy",
            "timestamp": str(settings.DATA_DIR.stat().st_ctime),
            "system": {
                "documents_count": len(documents),
                "embedding_model_loaded": embedding_status,
                "gemini_api_status": gemini_test["status"],
                "data_directory_exists": settings.DATA_DIR.exists(),
                "pdf_directory_exists": settings.PDF_DIR.exists(),
                "vector_directory_exists": settings.VECTORSTORE_DIR.exists()
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )

# 전역 예외 처리
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    전역 예외 처리기
    """
    print(f"전역 예외 발생: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "내부 서버 오류가 발생했습니다.",
            "detail": str(exc) if settings.DEBUG else "서버 오류"
        }
    )

# 개발 서버 실행 (개발용)
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug"
    ) 