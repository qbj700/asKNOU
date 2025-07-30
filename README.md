# asKNOU - 방송통신대학교 학사정보 RAG 챗봇

방송통신대학교 학생들을 위한 AI 기반 학사정보 질문답변 시스템입니다. RAG(Retrieval-Augmented Generation) 기술을 활용하여 PDF 문서를 기반으로 정확한 답변을 제공합니다.

## 🎯 주요 기능

- **📁 PDF 문서 업로드**: 관리자가 학사정보 PDF 문서를 업로드
- **🔍 지능형 문서 검색**: 한국어 특화 임베딩 모델로 관련 문서 검색
- **🤖 자연어 답변 생성**: Gemini AI를 통한 친절하고 정확한 답변
- **📊 관리자 대시보드**: 문서 관리 및 시스템 모니터링
- **💬 실시간 채팅**: 직관적인 챗봇 인터페이스

## 🏗️ 기술 스택

### 백엔드
- **Framework**: FastAPI (Python 3.12.10)
- **PDF 처리**: PyMuPDF
- **임베딩**: Hugging Face Transformers (`jhgan/ko-sbert-sts`)
- **벡터 검색**: FAISS
- **AI 모델**: Google Gemini API
- **환경 관리**: python-dotenv

### 프론트엔드
- **Framework**: Next.js 14 (React 18)
- **언어**: TypeScript
- **스타일링**: TailwindCSS
- **API 통신**: Axios
- **배포**: Vercel (예정)

## 📂 프로젝트 구조

```
asKNOU/
├── backend/
│   ├── main.py                 # FastAPI 앱 진입점
│   ├── config.py               # 환경 설정
│   ├── routers/                # API 라우팅
│   │   ├── upload.py           # PDF 업로드
│   │   ├── ask.py              # 질문 답변
│   │   └── admin.py            # 관리자 기능
│   ├── services/               # 핵심 서비스
│   │   ├── pdf_processor.py    # PDF 처리
│   │   ├── embedder.py         # 텍스트 임베딩
│   │   ├── vector_store.py     # FAISS 벡터 저장소
│   │   └── qa_chain.py         # QA 체인
│   ├── utils/
│   │   └── file_utils.py       # 파일 관리
│   ├── data/                   # 데이터 저장소
│   │   ├── pdfs/               # 업로드된 PDF
│   │   └── vectorstore/        # 벡터 인덱스
│   └── requirements.txt        # Python 의존성
├── frontend/
│   ├── pages/
│   │   ├── index.tsx           # 사용자 메인 페이지
│   │   ├── admin.tsx           # 관리자 페이지
│   │   └── _app.tsx            # Next.js 앱 컴포넌트
│   ├── components/
│   │   ├── ChatBox.tsx         # 채팅 인터페이스
│   │   └── UploadForm.tsx      # 업로드 폼
│   ├── lib/
│   │   └── api.ts              # API 유틸리티
│   ├── styles/
│   │   └── globals.css         # 전역 스타일
│   └── package.json            # Node.js 의존성
└── README.md
```

## 🚀 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/asKNOU.git
cd asKNOU
```

### 2. 백엔드 설정

#### 가상환경 설정 (적극 권장)

```bash
cd backend

# 가상환경 생성
python -m venv venv

# 가상환경 활성화
# Windows (Command Prompt)
venv\Scripts\activate

# Windows (PowerShell)
venv\Scripts\Activate.ps1

# Linux/Mac
source venv/bin/activate

# 가상환경이 활성화되면 프롬프트 앞에 (venv) 표시됨
```

#### 의존성 설치 및 환경 설정

```bash
# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
# Windows
copy env_example.txt .env

# Linux/Mac
cp env_example.txt .env

# .env 파일을 편집하여 Gemini API 키 설정
```

#### 가상환경 사용의 장점
- ✅ **의존성 충돌 방지**: 다른 프로젝트와 패키지 버전 충돌 없음
- ✅ **깔끔한 환경**: 프로젝트별 독립적인 패키지 관리
- ✅ **배포 용이성**: requirements.txt로 정확한 환경 재현 가능
- ✅ **시스템 Python 보호**: 전역 Python 환경에 영향 없음

#### 환경 변수 설정 (.env)

```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
HOST=0.0.0.0
PORT=8000
DEBUG=True
DATA_DIR=./data
PDF_DIR=./data/pdfs
VECTORSTORE_DIR=./data/vectorstore
EMBEDDING_MODEL=jhgan/ko-sbert-sts
TOP_K_RESULTS=5
CHUNK_SIZE=600
CHUNK_OVERLAP=100
```

#### 백엔드 실행

```bash
python main.py
```

백엔드가 `http://localhost:8000`에서 실행됩니다.

### 3. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install
# 또는
yarn install

# 환경 변수 설정
cp env_local_example.txt .env.local
# 필요시 API URL 수정
```

#### 환경 변수 설정 (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
```

#### 프론트엔드 실행

```bash
npm run dev
# 또는
yarn dev
```

프론트엔드가 `http://localhost:3000`에서 실행됩니다.

## 📖 사용 방법

### 관리자 (문서 관리)

1. **http://localhost:3000/admin** 접속
2. PDF 문서 업로드 (드래그 앤 드롭 또는 파일 선택)
3. 업로드된 문서 목록 및 처리 상태 확인
4. 필요시 문서 삭제 또는 시스템 정리

### 사용자 (질문 답변)

1. **http://localhost:3000** 접속
2. 채팅창에 질문 입력
3. AI 답변 및 참고 문서 확인
4. 추가 질문 계속

### API 사용

백엔드 API 문서: **http://localhost:8000/docs**

주요 엔드포인트:
- `POST /upload/pdf` - PDF 업로드
- `POST /ask/` - 질문 답변
- `GET /admin/documents` - 문서 목록
- `GET /health` - 헬스 체크

## 🔧 주요 구성 요소

### RAG 파이프라인

1. **문서 수집**: PDF 업로드 및 텍스트 추출
2. **텍스트 분할**: 500-800자 단위 청크로 분할
3. **임베딩 생성**: `jhgan/ko-sbert-sts` 모델 사용
4. **벡터 저장**: FAISS 인덱스에 저장
5. **검색**: 질문과 유사한 문서 청크 검색
6. **답변 생성**: Gemini AI로 자연어 답변 생성

### 핵심 기술

- **한국어 최적화**: 한국어 특화 임베딩 모델 사용
- **확장성**: 문서별 독립적인 벡터 인덱스
- **안정성**: 오류 처리 및 복구 메커니즘
- **모니터링**: 시스템 상태 실시간 확인

## 🔒 보안 고려사항

- 업로드 파일 크기 제한 (50MB)
- 파일 형식 검증 (PDF만 허용)
- API 요청 타임아웃 설정
- 환경 변수를 통한 민감 정보 관리

## 🚀 배포

### 백엔드 (Railway)

1. Railway에서 새 웹서비스 생성
2. GitHub 저장소 연결
3. 빌드 명령: `pip install -r requirements.txt`
4. 시작 명령: `python main.py`
5. 환경 변수 설정

### 프론트엔드 (Vercel)

1. Vercel에서 새 프로젝트 생성
2. GitHub 저장소 연결
3. 프레임워크: Next.js 선택
4. 루트 디렉터리: `frontend`
5. 환경 변수 설정

## 📞 문의

프로젝트에 대한 문의사항이나 제안사항이 있으시면 이슈를 등록해주세요.

## 🙏 감사의 말

- **방송통신대학교**: 프로젝트 아이디어 제공
- **Hugging Face**: 한국어 임베딩 모델 제공
- **Google**: Gemini AI API 제공
- **FastAPI & Next.js**: 훌륭한 프레임워크 제공 

## 오픈소스 라이선스 정보

이 프로젝트는 다음과 같은 오픈소스 라이브러리들을 사용하고 있습니다:

### Backend Dependencies

| 라이브러리 | 버전 | 라이선스 |
|------------|------|----------|
| FastAPI | 0.104.1 | MIT License |
| Uvicorn | 0.24.0 | BSD License |
| PyMuPDF | 1.23.19 | GNU AGPL v3 |
| Transformers | 4.36.2 | Apache License 2.0 |
| PyTorch | ≥2.6.0 | BSD License |
| Sentence-Transformers | ≥2.7.0 | Apache License 2.0 |
| FAISS | 1.11.0 | MIT License |
| Google Generative AI | 0.3.2 | Apache License 2.0 |
| Python-dotenv | 1.0.0 | BSD License |
| NumPy | ≥1.25.0 | BSD License |
| Pydantic | 2.5.0 | MIT License |

### Frontend Dependencies

| 라이브러리 | 버전 | 라이선스 |
|------------|------|----------|
| Next.js | 14.2.29 | MIT License |
| React | 18.2.0 | MIT License |
| React DOM | 18.2.0 | MIT License |
| Axios | 1.9.0 | MIT License |
| React Markdown | 10.1.0 | MIT License |
| Tailwind CSS | 3.3.6 | MIT License |
| TypeScript | 5.3.3 | Apache License 2.0 |

### 주요 모델 및 데이터

- **Sentence Transformer**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (Apache License 2.0)
- **Gemini Pro**: Google AI Studio API (Google AI Studio Terms of Service)

### 오픈소스 라이선스 및 출처

이 프로젝트는 다음 오픈소스 소프트웨어를 사용합니다:

- PyMuPDF (AGPL v3): https://github.com/pymupdf/PyMuPDF
- FastAPI (MIT): https://github.com/tiangolo/fastapi
- Transformers (Apache 2.0): https://github.com/huggingface/transformers
- 기타 라이브러리 및 상세 라이선스는 본문 표 참고

각 라이브러리의 라이선스 조건을 준수하며, 소스코드는 AGPL v3에 따라 전체 공개됩니다.