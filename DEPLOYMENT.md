# asKNOU 배포 가이드

## 🚀 Render (Backend) 배포

### 1. 사전 준비
- [ ] Render 계정 생성 및 로그인
- [ ] GitHub 저장소에 코드 푸시
- [ ] Gemini API 키 준비

### 2. Render 배포 단계
1. **새 Web Service 생성**
   - Repository: GitHub 저장소 선택
   - Root Directory: `backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **환경변수 설정**
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key
   HOST=0.0.0.0
   PORT=$PORT
   DEBUG=False
   DATA_DIR=/opt/render/project/src/data
   PDF_DIR=/opt/render/project/src/data/pdfs
   VECTORSTORE_DIR=/opt/render/project/src/data/vectorstore
   EMBEDDING_MODEL=jhgan/ko-sbert-sts
   TOP_K_RESULTS=5
   CHUNK_SIZE=600
   CHUNK_OVERLAP=100
   ADMIN_ID=admin
   ADMIN_PW=your_secure_password
   JWT_SECRET_KEY=your_secure_jwt_secret
   ```

3. **배포 확인**
   - 배포 완료 후 제공되는 URL 확인
   - `/health` 엔드포인트로 상태 확인
   - `/docs` 에서 API 문서 확인

## 🌐 Vercel (Frontend) 배포

### 1. 사전 준비
- [ ] Vercel 계정 생성 및 로그인
- [ ] GitHub 저장소에 코드 푸시
- [ ] Backend URL 확인 (Render 배포 완료 후)

### 2. Vercel 배포 단계
1. **새 프로젝트 생성**
   - Repository: GitHub 저장소 선택
   - Root Directory: `frontend`
   - Framework Preset: `Next.js`

2. **환경변수 설정**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-app.onrender.com
   NEXT_PUBLIC_ADMIN_ID=admin
   NEXT_PUBLIC_ADMIN_PW=your_secure_password
   ```

3. **배포 확인**
   - 배포 완료 후 제공되는 URL 확인
   - 채팅 기능 테스트
   - 관리자 페이지 접근 테스트

## 🔧 배포 후 설정

### 1. CORS 업데이트
Backend의 `main.py`에서 실제 프론트엔드 도메인으로 CORS 설정 업데이트:
```python
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://your-actual-frontend.vercel.app"  # 실제 도메인으로 변경
],
```

### 2. 환경변수 보안
- [ ] 모든 API 키와 비밀번호를 안전한 값으로 변경
- [ ] JWT_SECRET_KEY를 강력한 랜덤 문자열로 설정
- [ ] ADMIN_PW를 복잡한 비밀번호로 설정

### 3. 도메인 설정 (선택사항)
- Vercel에서 커스텀 도메인 설정
- Render에서 커스텀 도메인 설정

## 🧪 테스트 체크리스트

### Backend 테스트
- [ ] `/health` 엔드포인트 응답 확인
- [ ] PDF 업로드 기능 테스트
- [ ] 질문-답변 기능 테스트
- [ ] 관리자 기능 테스트

### Frontend 테스트
- [ ] 메인 페이지 로딩 확인
- [ ] 채팅 인터페이스 동작 확인
- [ ] PDF 업로드 기능 확인
- [ ] 관리자 페이지 접근 확인

### 통합 테스트
- [ ] 프론트엔드에서 백엔드 API 호출 확인
- [ ] CORS 설정 정상 동작 확인
- [ ] 전체 워크플로우 테스트

## 🚨 주의사항

1. **보안**
   - 환경변수에 민감한 정보 저장
   - API 키 노출 방지
   - 강력한 비밀번호 사용

2. **성능**
   - Render 무료 플랜은 비활성 시 슬립 모드
   - 첫 요청 시 웜업 시간 필요
   - 대용량 파일 업로드 시 타임아웃 고려

3. **모니터링**
   - 배포 후 로그 모니터링
   - 에러 발생 시 즉시 대응
   - 정기적인 상태 확인

## 📞 문제 해결

### 일반적인 문제
1. **CORS 에러**: 프론트엔드 도메인이 백엔드 CORS 설정에 포함되어 있는지 확인
2. **API 연결 실패**: 환경변수 `NEXT_PUBLIC_API_URL`이 올바른지 확인
3. **빌드 실패**: 의존성 버전 충돌 확인
4. **메모리 부족**: Render 플랜 업그레이드 고려

### 로그 확인 방법
- Render: 대시보드에서 로그 확인
- Vercel: 함수 로그 및 빌드 로그 확인 