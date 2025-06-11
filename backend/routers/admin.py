from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
from datetime import datetime

from utils.file_utils import FileManager
from services.vector_store import VectorStoreManager

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/documents")
async def list_documents() -> Dict[str, Any]:
    """
    업로드된 모든 문서 목록을 반환합니다.
    
    Returns:
        문서 목록 및 통계 정보
    """
    try:
        documents = FileManager.list_documents()
        
        # 통계 정보 계산
        total_size = sum(doc["file_size"] for doc in documents)
        processed_count = sum(1 for doc in documents if doc["has_vector"] and doc["has_metadata"])
        
        # 문서 정보 포맷팅
        formatted_docs = []
        for doc in documents:
            # 생성 시간 포맷팅
            created_at = datetime.fromtimestamp(doc["created_at"]).strftime("%Y-%m-%d %H:%M:%S")
            
            # 파일 크기 포맷팅
            size_mb = doc["file_size"] / (1024 * 1024)
            
            formatted_docs.append({
                "doc_id": doc["doc_id"],
                "filename": doc["filename"],
                "file_size_mb": round(size_mb, 2),
                "created_at": created_at,
                "status": {
                    "pdf_exists": True,  # list에서 나온 것은 항상 존재
                    "vector_exists": doc["has_vector"],
                    "metadata_exists": doc["has_metadata"],
                    "processed": doc["has_vector"] and doc["has_metadata"]
                }
            })
        
        return {
            "documents": formatted_docs,
            "statistics": {
                "total_documents": len(documents),
                "processed_documents": processed_count,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "pending_processing": len(documents) - processed_count
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"문서 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/documents/{doc_id}")
async def get_document_details(doc_id: str) -> Dict[str, Any]:
    """
    특정 문서의 상세 정보를 반환합니다.
    
    Args:
        doc_id: 문서 ID
        
    Returns:
        문서 상세 정보
    """
    try:
        # 파일 경로 확인
        pdf_path = FileManager.get_pdf_path(doc_id)
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
        
        # 기본 정보
        file_stat = pdf_path.stat()
        doc_info = {
            "doc_id": doc_id,
            "filename": pdf_path.name,
            "file_size_mb": round(file_stat.st_size / (1024 * 1024), 2),
            "created_at": datetime.fromtimestamp(file_stat.st_ctime).strftime("%Y-%m-%d %H:%M:%S"),
            "modified_at": datetime.fromtimestamp(file_stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # 벡터 저장소 정보
        vector_store = VectorStoreManager.get_document_store(doc_id)
        if vector_store:
            vector_stats = vector_store.get_statistics()
        else:
            vector_stats = {"error": "벡터 저장소를 로드할 수 없습니다."}
        
        return {
            "document": doc_info,
            "vector_store": vector_stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"문서 정보 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str) -> Dict[str, Any]:
    """
    문서와 관련된 모든 파일을 삭제합니다.
    
    Args:
        doc_id: 삭제할 문서 ID
        
    Returns:
        삭제 결과
    """
    try:
        # 문서 존재 확인
        pdf_path = FileManager.get_pdf_path(doc_id)
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
        
        # 삭제 전 정보 수집
        file_size = pdf_path.stat().st_size
        filename = pdf_path.name
        
        # 파일 삭제
        success = FileManager.delete_document_files(doc_id)
        
        if success:
            return {
                "success": True,
                "message": f"문서 '{filename}'이 성공적으로 삭제되었습니다.",
                "doc_id": doc_id,
                "deleted_file_size_mb": round(file_size / (1024 * 1024), 2)
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="문서 삭제 중 일부 파일 삭제에 실패했습니다."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"문서 삭제 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/cleanup")
async def cleanup_orphaned_files() -> Dict[str, Any]:
    """
    고아 파일들을 정리합니다 (PDF는 있지만 벡터 저장소가 없는 경우 등).
    
    Returns:
        정리 결과
    """
    try:
        documents = FileManager.list_documents()
        
        cleaned_files = []
        for doc in documents:
            doc_id = doc["doc_id"]
            
            # PDF는 있지만 벡터 저장소나 메타데이터가 없는 경우
            if not doc["has_vector"] or not doc["has_metadata"]:
                success = FileManager.delete_document_files(doc_id)
                if success:
                    cleaned_files.append({
                        "doc_id": doc_id,
                        "filename": doc["filename"],
                        "reason": "incomplete_processing"
                    })
        
        return {
            "success": True,
            "message": f"{len(cleaned_files)}개의 불완전한 파일이 정리되었습니다.",
            "cleaned_files": cleaned_files
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"파일 정리 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/statistics")
async def get_system_statistics() -> Dict[str, Any]:
    """
    시스템 전체 통계를 반환합니다.
    
    Returns:
        시스템 통계 정보
    """
    try:
        documents = FileManager.list_documents()
        
        # 기본 통계
        total_docs = len(documents)
        processed_docs = sum(1 for doc in documents if doc["has_vector"] and doc["has_metadata"])
        total_size = sum(doc["file_size"] for doc in documents)
        
        # 벡터 저장소 통계
        total_vectors = 0
        total_chunks = 0
        embedding_dims = set()
        
        for doc in documents:
            if doc["has_vector"]:
                vector_store = VectorStoreManager.get_document_store(doc["doc_id"])
                if vector_store:
                    stats = vector_store.get_statistics()
                    if "total_vectors" in stats:
                        total_vectors += stats["total_vectors"]
                        total_chunks += stats.get("total_chunks", 0)
                        if stats.get("dimension"):
                            embedding_dims.add(stats["dimension"])
        
        # 시스템 상태 확인
        from services.embedder import embedder
        embedding_model_status = {
            "loaded": embedder.model is not None,
            "model_name": settings.EMBEDDING_MODEL if embedder.model else None
        }
        
        from services.qa_chain import qa_chain
        gemini_status = qa_chain.test_connection()
        
        return {
            "document_statistics": {
                "total_documents": total_docs,
                "processed_documents": processed_docs,
                "pending_documents": total_docs - processed_docs,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            },
            "vector_statistics": {
                "total_vectors": total_vectors,
                "total_chunks": total_chunks,
                "embedding_dimensions": list(embedding_dims),
                "average_chunks_per_doc": round(total_chunks / max(processed_docs, 1), 2)
            },
            "system_status": {
                "embedding_model": embedding_model_status,
                "gemini_api": gemini_status["status"],
                "gemini_message": gemini_status.get("message", "")
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"통계 조회 중 오류가 발생했습니다: {str(e)}"
        ) 