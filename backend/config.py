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
    # Google OAuth 설정 (API Key 방식 제거)
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
        """Google OAuth credentials를 환경변수에서 반환합니다."""
        if not self.GOOGLE_CREDENTIALS:
            print("❌ GOOGLE_CREDENTIALS 환경변수가 설정되지 않았습니다.")
            print("   .env 파일에 GOOGLE_CREDENTIALS='{\"type\":\"service_account\",...}' 추가 필요")
            return None
            
        try:
            # Generative AI API에 필요한 scope들
            scopes = [
                "https://www.googleapis.com/auth/generative-language",
                "https://www.googleapis.com/auth/cloud-platform"
            ]
            
            credentials_info = json.loads(self.GOOGLE_CREDENTIALS)
            credentials = service_account.Credentials.from_service_account_info(
                credentials_info,
                scopes=scopes
            )
            print("✅ Google OAuth credentials 로드 성공")
            return credentials
        except json.JSONDecodeError as e:
            print(f"❌ GOOGLE_CREDENTIALS JSON 파싱 실패: {e}")
            return None
        except Exception as e:
            print(f"❌ Google credentials 로드 실패: {e}")
            return None

    def __init__(self):
        # 디렉터리 생성
        self.DATA_DIR.mkdir(exist_ok=True)
        self.PDF_DIR.mkdir(exist_ok=True)
        self.VECTORSTORE_DIR.mkdir(exist_ok=True)

# 글로벌 설정 인스턴스
settings = Settings() 