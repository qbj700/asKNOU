import os
import json
from dotenv import load_dotenv
from pathlib import Path
from typing import Optional
import google.auth
from google.oauth2 import service_account

# 환경 변수 로드
load_dotenv()

class Settings:
    # Gemini API 설정
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_CREDENTIALS: str = os.getenv("GOOGLE_CREDENTIALS", "")
    
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
    
    # 관리자 계정 설정
    ADMIN_ID: str = os.getenv("ADMIN_ID", "admin")
    ADMIN_PW: str = os.getenv("ADMIN_PW", "password")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this")
    
    def get_google_credentials(self) -> Optional[service_account.Credentials]:
        """Google OAuth credentials를 반환합니다."""
        if self.GOOGLE_CREDENTIALS:
            try:
                credentials_info = json.loads(self.GOOGLE_CREDENTIALS)
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_info,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"]
                )
                return credentials
            except Exception as e:
                print(f"Google credentials 로드 실패: {e}")
                return None
        return None

    def __init__(self):
        # 디렉터리 생성
        self.DATA_DIR.mkdir(exist_ok=True)
        self.PDF_DIR.mkdir(exist_ok=True)
        self.VECTORSTORE_DIR.mkdir(exist_ok=True)

# 글로벌 설정 인스턴스
settings = Settings() 