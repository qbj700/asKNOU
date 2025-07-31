import requests
import json
from typing import List, Dict, Any
from config import settings
from services.embedder import embedder
from services.vector_store import VectorStoreManager

class QAChain:
    """질문 응답 체인 클래스"""
    
    def __init__(self):
        """OAuth를 사용하여 Gemini API를 초기화합니다."""
        self._configure_gemini()
    
    def _configure_gemini(self):
        """OAuth를 사용하여 Gemini API를 설정합니다."""
        credentials = settings.get_google_credentials()
        if not credentials:
            raise Exception("Google OAuth credentials를 로드할 수 없습니다.")
        
        # credentials 객체를 보관 (토큰 만료 체크를 위해)
        self.credentials = credentials
        
        # 초기 토큰 갱신
        try:
            from google.auth.transport.requests import Request
            self.credentials.refresh(Request())
            self.access_token = self.credentials.token
            print("✅ Gemini API OAuth 설정 완료")
        except Exception as e:
            print(f"❌ OAuth 설정 실패: {e}")
            raise Exception(f"OAuth 설정 실패: {e}")
    
    def _ensure_valid_token(self):
        """토큰이 만료되었으면 갱신합니다."""
        if self.credentials.expired:
            try:
                from google.auth.transport.requests import Request
                self.credentials.refresh(Request())
                self.access_token = self.credentials.token
                print("🔄 Access token 갱신 완료")
            except Exception as e:
                print(f"❌ 토큰 갱신 실패: {e}")
                raise Exception(f"토큰 갱신 실패: {e}")
    
    def _generate_content_oauth(self, prompt: str) -> str:
        """OAuth를 사용하여 직접 REST API로 콘텐츠를 생성합니다."""
        # 토큰이 만료되었으면 갱신 (효율적!)
        self._ensure_valid_token()
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        
        data = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 2000,
                "topP": 0.8,
                "topK": 40
            }
        }
        
        response = requests.post(
            "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"Gemini API 호출 실패: {response.status_code} - {response.text}")
        
        result = response.json()
        if "candidates" in result and len(result["candidates"]) > 0:
            content = result["candidates"][0]["content"]["parts"][0]["text"]
            return content
        else:
            raise Exception("Gemini API 응답에서 콘텐츠를 찾을 수 없습니다.")
    
    def create_prompt(self, question: str, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        질문과 검색된 문서를 바탕으로 프롬프트를 생성합니다.
        
        Args:
            question: 사용자 질문
            retrieved_chunks: 검색된 문서 청크 리스트
            
        Returns:
            Gemini에게 전달할 프롬프트
        """
        # 검색된 문서들을 정리
        context_parts = []
        for i, chunk_data in enumerate(retrieved_chunks, 1):
            chunk = chunk_data["chunk"]
            score = chunk_data["score"]
            page = chunk.get("page", "Unknown")
            
            # 시연용 하드코딩된 파일명 사용
            clean_filename = "2025년도 2학기 대학생활 길라잡이"
            
            context_parts.append(
                f"[{clean_filename} p.{page}] (유사도: {score:.3f})\n"
                f"{chunk['content']}\n"
            )
        
        context = "\n".join(context_parts)
        
        prompt = f"""당신은 방송통신대학교 학생들을 위한 친절한 AI 도우미입니다.
아래 제공된 자료를 바탕으로 학생의 질문에 정확하고 도움이 되는 답변을 해주세요.

질문: {question}

참고 자료:
{context}

답변 지침:
1. 제공된 자료에 기반하여 정확한 정보를 전달해주세요
2. 방송통신대학교 학생에게 친절하고 이해하기 쉽게 설명해주세요
3. 구체적인 절차나 방법이 있다면 단계별로 안내해주세요
4. 답변에 참고한 자료의 출처를 반드시 명시해주세요 (예: [2025년도 2학기 대학생활 길라잡이 p.2] 참조)
5. 추가 문의가 필요한 경우 적절한 연락처나 방법을 안내해주세요
6. 현재 검색된 자료로는 완전한 답변이 어려운 경우, "현재 검색된 자료 범위에서는..." 또는 "제공된 일부 자료를 바탕으로는..." 같은 신중한 표현을 사용하고, 추가 자료 확인이나 다른 방법을 제안해주세요
7. 예를 들어 답변 내용 중 "별첨" 과 같이 추가 자료가 있을 경우 해당 키워드로 추가검색 할 수 있게 안내해주세요
8. 절대 "자료에 없다" 또는 "찾을 수 없다"는 단정적 표현은 피하고, 검색 범위의 한계일 수 있음을 인정해주세요

**답변 형식 요구사항 (필수):**
반드시 마크다운 문법을 사용하여 답변해주세요:

## 시험 일정 및 방법
와 같이 제목은 ##를 사용하고,

### 세부 항목
과 같이 소제목은 ###를 사용하세요.

1. 첫 번째 항목
2. 두 번째 항목
3. 세 번째 항목

이런 식으로 번호 목록을 사용하거나,

- 첫 번째 포인트
- 두 번째 포인트

불릿 포인트를 사용하세요.

**중요한 내용**은 볼드체로, `중요 키워드`는 백틱으로 감싸주세요.

문단 사이에는 반드시 빈 줄을 넣어 구분해주세요.

답변:"""
        
        return prompt
    
    async def answer_question(self, question: str, top_k: int = None) -> Dict[str, Any]:
        """
        질문에 대한 답변을 생성합니다.
        
        Args:
            question: 사용자 질문
            top_k: 검색할 상위 문서 수
            
        Returns:
            답변 정보 딕셔너리
        """
        try:
            # 1. 질문을 임베딩으로 변환
            question_embedding = embedder.encode_single_text(question)
            
            # 2. 관련 문서 검색
            retrieved_chunks = VectorStoreManager.search_all_documents(
                question_embedding, top_k
            )
            
            if not retrieved_chunks:
                return {
                    "answer": "죄송합니다. 현재 업로드된 문서에서 관련 정보를 찾을 수 없습니다. 다른 질문을 해보시거나 관리자에게 문의해주세요.",
                    "sources": [],
                    "retrieved_chunks": 0,
                    "question": question
                }
            
            # 3. 프롬프트 생성
            prompt = self.create_prompt(question, retrieved_chunks)
            
            # 4. Gemini API로 답변 생성 (OAuth 전용)
            answer = self._generate_content_oauth(prompt).strip()
            
            # 6. 소스 정보 정리
            sources = []
            for chunk_data in retrieved_chunks:
                chunk = chunk_data["chunk"]
                sources.append({
                    "filename": "2025년도 2학기 대학생활 길라잡이.pdf",
                    "page": chunk.get("page", "Unknown"),
                    "chunk_id": chunk.get("chunk_id", "Unknown"),
                    "score": chunk_data["score"],
                    "content_preview": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"]
                })
            
            return {
                "answer": answer,
                "sources": sources,
                "retrieved_chunks": len(retrieved_chunks),
                "question": question
            }
            
        except Exception as e:
            return {
                "answer": f"죄송합니다. 답변 생성 중 오류가 발생했습니다: {str(e)}",
                "sources": [],
                "retrieved_chunks": 0,
                "question": question,
                "error": str(e)
            }
    
    def test_connection(self) -> Dict[str, Any]:
        """Gemini API OAuth 연결을 테스트합니다."""
        try:
            test_response = self._generate_content_oauth("안녕하세요. 테스트입니다.")
            return {
                "status": "success",
                "message": "Gemini API OAuth 연결 성공",
                "response": test_response[:100]
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Gemini API OAuth 연결 실패: {str(e)}"
            }

# 글로벌 QA 체인 인스턴스
qa_chain = QAChain() 