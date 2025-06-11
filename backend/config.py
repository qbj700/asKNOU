import os
from dotenv import load_dotenv
from pathlib import Path

# 환경 변수 로드
load_dotenv()

class Settings:
    # Gemini API 설정
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # 서버 설정
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # 파일 저장 경로
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", "./data"))
    PDF_DIR: Path = Path(os.getenv("PDF_DIR", "./data/pdfs"))
    VECTORSTORE_DIR: Path = Path(os.getenv("VECTORSTORE_DIR", "./data/vectorstore"))
    
    # 임베딩 모델 설정
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "jhgan/ko-sbert-sts")
    
    # 검색 설정
    TOP_K_RESULTS: int = int(os.getenv("TOP_K_RESULTS", "5"))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "600"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "100"))
    
    def __init__(self):
        # 디렉터리 생성
        self.DATA_DIR.mkdir(exist_ok=True)
        self.PDF_DIR.mkdir(exist_ok=True)
        self.VECTORSTORE_DIR.mkdir(exist_ok=True)

# 글로벌 설정 인스턴스
settings = Settings() 