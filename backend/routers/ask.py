from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from services.qa_chain import qa_chain

router = APIRouter(prefix="/ask", tags=["question-answer"])

class QuestionRequest(BaseModel):
    """질문 요청 모델"""
    question: str
    top_k: Optional[int] = None

class QuestionResponse(BaseModel):
    """질문 응답 모델"""
    answer: str
    sources: list
    retrieved_chunks: int
    question: str
    error: Optional[str] = None

@router.post("/", response_model=QuestionResponse)
async def ask_question(request: QuestionRequest) -> QuestionResponse:
    """
    사용자의 질문에 답변합니다.
    
    Args:
        request: 질문 요청 데이터
        
    Returns:
        AI 답변 및 관련 정보
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="질문을 입력해주세요.")
    
    if len(request.question) > 1000:
        raise HTTPException(status_code=400, detail="질문은 1000자를 초과할 수 없습니다.")
    
    try:
        # QA 체인을 통해 답변 생성
        result = await qa_chain.answer_question(
            question=request.question.strip(),
            top_k=request.top_k
        )
        
        return QuestionResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"답변 생성 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/test")
async def test_qa_system() -> Dict[str, Any]:
    """
    QA 시스템의 연결 상태를 테스트합니다.
    
    Returns:
        시스템 상태 정보
    """
    try:
        # Gemini API 연결 테스트
        gemini_test = qa_chain.test_connection()
        
        # 임베딩 모델 상태 확인
        from services.embedder import embedder
        embedding_status = {
            "model_loaded": embedder.model is not None,
            "model_name": settings.EMBEDDING_MODEL if embedder.model else None,
            "embedding_dimension": embedder.get_embedding_dimension() if embedder.model else None
        }
        
        # 문서 상태 확인
        from utils.file_utils import FileManager
        documents = FileManager.list_documents()
        doc_status = {
            "total_documents": len(documents),
            "documents_with_vectors": sum(1 for doc in documents if doc["has_vector"]),
            "documents_with_metadata": sum(1 for doc in documents if doc["has_metadata"])
        }
        
        return {
            "status": "success",
            "message": "QA 시스템이 정상적으로 동작합니다.",
            "gemini_api": gemini_test,
            "embedding_model": embedding_status,
            "document_status": doc_status
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"QA 시스템 테스트 실패: {str(e)}"
        }

@router.post("/search")
async def search_documents(request: QuestionRequest) -> Dict[str, Any]:
    """
    질문과 관련된 문서를 검색합니다 (답변 생성 없이).
    
    Args:
        request: 검색 요청 데이터
        
    Returns:
        검색 결과
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="검색어를 입력해주세요.")
    
    try:
        from services.embedder import embedder
        from services.vector_store import VectorStoreManager
        
        # 질문을 임베딩으로 변환
        question_embedding = embedder.encode_single_text(request.question.strip())
        
        # 문서 검색
        search_results = VectorStoreManager.search_all_documents(
            question_embedding, 
            request.top_k
        )
        
        # 결과 정리
        formatted_results = []
        for result in search_results:
            chunk = result["chunk"]
            formatted_results.append({
                "doc_id": result.get("doc_id", "Unknown"),
                "filename": result.get("filename", "Unknown"),
                "page": chunk.get("page", "Unknown"),
                "chunk_id": chunk.get("chunk_id", "Unknown"),
                "score": result["score"],
                "content_preview": chunk["content"][:300] + "..." if len(chunk["content"]) > 300 else chunk["content"],
                "rank": result["rank"]
            })
        
        return {
            "query": request.question.strip(),
            "total_results": len(formatted_results),
            "results": formatted_results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"문서 검색 중 오류가 발생했습니다: {str(e)}"
        ) 