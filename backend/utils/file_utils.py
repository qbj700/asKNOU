import uuid
import aiofiles
from pathlib import Path
from typing import Optional
from config import settings

class FileManager:
    """파일 저장 및 관리 유틸리티 클래스"""
    
    @staticmethod
    def generate_doc_id() -> str:
        """새로운 문서 ID를 생성합니다."""
        return str(uuid.uuid4())
    
    @staticmethod
    def get_pdf_path(doc_id: str) -> Path:
        """문서 ID로 PDF 파일 경로를 반환합니다."""
        return settings.PDF_DIR / f"{doc_id}.pdf"
    
    @staticmethod
    def get_vectorstore_path(doc_id: str) -> Path:
        """문서 ID로 벡터 저장소 경로를 반환합니다."""
        return settings.VECTORSTORE_DIR / f"{doc_id}.index"
    
    @staticmethod
    def get_metadata_path(doc_id: str) -> Path:
        """문서 ID로 메타데이터 파일 경로를 반환합니다."""
        return settings.VECTORSTORE_DIR / f"{doc_id}_metadata.json"
    
    @staticmethod
    async def save_uploaded_file(file_content: bytes, doc_id: str) -> Path:
        """업로드된 파일을 저장합니다."""
        file_path = FileManager.get_pdf_path(doc_id)
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        return file_path
    
    @staticmethod
    def delete_document_files(doc_id: str) -> bool:
        """문서와 관련된 모든 파일을 삭제합니다."""
        try:
            # PDF 파일 삭제
            pdf_path = FileManager.get_pdf_path(doc_id)
            if pdf_path.exists():
                pdf_path.unlink()
            
            # 벡터 저장소 파일 삭제
            vector_path = FileManager.get_vectorstore_path(doc_id)
            if vector_path.exists():
                vector_path.unlink()
            
            # 메타데이터 파일 삭제
            metadata_path = FileManager.get_metadata_path(doc_id)
            if metadata_path.exists():
                metadata_path.unlink()
            
            return True
        except Exception as e:
            print(f"파일 삭제 오류: {e}")
            return False
    
    @staticmethod
    def list_documents() -> list[dict]:
        """저장된 문서 목록을 반환합니다."""
        documents = []
        
        for pdf_file in settings.PDF_DIR.glob("*.pdf"):
            doc_id = pdf_file.stem
            
            # 메타데이터 파일 확인
            metadata_path = FileManager.get_metadata_path(doc_id)
            vector_path = FileManager.get_vectorstore_path(doc_id)
            
            documents.append({
                "doc_id": doc_id,
                "filename": pdf_file.name,
                "file_size": pdf_file.stat().st_size,
                "created_at": pdf_file.stat().st_ctime,
                "has_vector": vector_path.exists(),
                "has_metadata": metadata_path.exists()
            })
        
        return documents 