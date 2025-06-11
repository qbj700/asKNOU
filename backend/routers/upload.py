from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any
import asyncio

from utils.file_utils import FileManager
from services.pdf_processor import PDFProcessor
from services.embedder import embedder
from services.vector_store import VectorStoreManager

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/pdf")
async def upload_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    PDF 파일을 업로드하고 처리합니다.
    
    Args:
        file: 업로드할 PDF 파일
        
    Returns:
        처리 결과 정보
    """
    # 파일 형식 검증
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
    
    if file.size > 50 * 1024 * 1024:  # 50MB 제한
        raise HTTPException(status_code=400, detail="파일 크기는 50MB를 초과할 수 없습니다.")
    
    try:
        # 1. 문서 ID 생성 및 파일 저장
        doc_id = FileManager.generate_doc_id()
        file_content = await file.read()
        file_path = await FileManager.save_uploaded_file(file_content, doc_id)
        
        # 2. PDF 처리 (텍스트 추출 및 분할)
        chunks = PDFProcessor.process_pdf(file_path)
        
        if not chunks:
            # 빈 PDF인 경우 파일 삭제
            FileManager.delete_document_files(doc_id)
            raise HTTPException(status_code=400, detail="PDF에서 텍스트를 추출할 수 없습니다.")
        
        # 3. 임베딩 생성
        chunk_texts = [chunk["content"] for chunk in chunks]
        embeddings = embedder.encode_texts(chunk_texts)
        
        if len(embeddings) == 0:
            # 임베딩 실패시 파일 삭제
            FileManager.delete_document_files(doc_id)
            raise HTTPException(status_code=500, detail="임베딩 생성에 실패했습니다.")
        
        # 4. 벡터 저장소에 저장
        vector_store = VectorStoreManager.create_document_index(doc_id, embeddings, chunks)
        
        # 5. 결과 반환
        return {
            "success": True,
            "message": "PDF 업로드 및 처리가 완료되었습니다.",
            "doc_id": doc_id,
            "filename": file.filename,
            "file_size": len(file_content),
            "total_chunks": len(chunks),
            "total_pages": max([chunk["page"] for chunk in chunks]) if chunks else 0,
            "embedding_dimension": embeddings.shape[1] if len(embeddings) > 0 else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # 오류 발생시 생성된 파일들 정리
        try:
            FileManager.delete_document_files(doc_id)
        except:
            pass
        
        raise HTTPException(
            status_code=500, 
            detail=f"파일 처리 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/status/{doc_id}")
async def get_upload_status(doc_id: str) -> Dict[str, Any]:
    """
    업로드된 문서의 처리 상태를 확인합니다.
    
    Args:
        doc_id: 문서 ID
        
    Returns:
        문서 상태 정보
    """
    try:
        # 파일 존재 확인
        pdf_path = FileManager.get_pdf_path(doc_id)
        vector_path = FileManager.get_vectorstore_path(doc_id)
        metadata_path = FileManager.get_metadata_path(doc_id)
        
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
        
        # 벡터 저장소 통계 가져오기
        vector_store = VectorStoreManager.get_document_store(doc_id)
        if vector_store:
            stats = vector_store.get_statistics()
        else:
            stats = {"error": "벡터 저장소를 로드할 수 없습니다."}
        
        return {
            "doc_id": doc_id,
            "pdf_exists": pdf_path.exists(),
            "vector_exists": vector_path.exists(),
            "metadata_exists": metadata_path.exists(),
            "file_size": pdf_path.stat().st_size if pdf_path.exists() else 0,
            "created_at": pdf_path.stat().st_ctime if pdf_path.exists() else None,
            "vector_stats": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"상태 확인 중 오류가 발생했습니다: {str(e)}"
        )