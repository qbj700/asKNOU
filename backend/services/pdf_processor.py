import fitz  # PyMuPDF
from pathlib import Path
from typing import List, Dict
from config import settings

class PDFProcessor:
    """PDF 문서 처리 클래스"""
    
    @staticmethod
    def extract_text_from_pdf(pdf_path: Path) -> List[Dict[str, any]]:
        """
        PDF에서 텍스트를 추출합니다.
        
        Args:
            pdf_path: PDF 파일 경로
            
        Returns:
            페이지별 텍스트 리스트 [{"page": int, "content": str}]
        """
        pages_content = []
        
        try:
            # PDF 문서 열기
            doc = fitz.open(pdf_path)
            
            for page_num in range(doc.page_count):
                page = doc.load_page(page_num)
                text = page.get_text()
                
                # 빈 페이지가 아닌 경우에만 추가
                if text.strip():
                    pages_content.append({
                        "page": page_num + 1,  # 1-based 페이지 번호
                        "content": text.strip()
                    })
            
            doc.close()
            
        except Exception as e:
            raise Exception(f"PDF 텍스트 추출 오류: {str(e)}")
        
        return pages_content
    
    @staticmethod
    def split_text_into_chunks(
        pages_content: List[Dict[str, any]], 
        chunk_size: int = None, 
        chunk_overlap: int = None
    ) -> List[Dict[str, any]]:
        """
        텍스트를 지정된 크기로 분할합니다.
        
        Args:
            pages_content: 페이지별 텍스트 리스트
            chunk_size: 청크 크기 (기본값: 설정에서 가져옴)
            chunk_overlap: 청크 중복 크기 (기본값: 설정에서 가져옴)
            
        Returns:
            분할된 텍스트 청크 리스트 [{"chunk_id": int, "page": int, "content": str}]
        """
        if chunk_size is None:
            chunk_size = settings.CHUNK_SIZE
        if chunk_overlap is None:
            chunk_overlap = settings.CHUNK_OVERLAP
            
        chunks = []
        chunk_id = 0
        
        for page_data in pages_content:
            page_num = page_data["page"]
            text = page_data["content"]
            
            # 텍스트가 청크 크기보다 작으면 그대로 사용
            if len(text) <= chunk_size:
                chunks.append({
                    "chunk_id": chunk_id,
                    "page": page_num,
                    "content": text
                })
                chunk_id += 1
                continue
            
            # 텍스트를 청크로 분할
            start = 0
            while start < len(text):
                end = start + chunk_size
                
                # 마지막 청크가 아니고 단어 중간에서 끊어지는 경우
                if end < len(text):
                    # 공백이나 구두점에서 끊어지도록 조정
                    last_space = text.rfind(' ', start, end)
                    last_punct = max(
                        text.rfind('.', start, end),
                        text.rfind('!', start, end),
                        text.rfind('?', start, end),
                        text.rfind('\n', start, end)
                    )
                    
                    cut_point = max(last_space, last_punct)
                    if cut_point > start:
                        end = cut_point + 1
                
                chunk_text = text[start:end].strip()
                
                if chunk_text:
                    chunks.append({
                        "chunk_id": chunk_id,
                        "page": page_num,
                        "content": chunk_text
                    })
                    chunk_id += 1
                
                # 다음 시작점 설정 (중복 고려)
                start = max(start + 1, end - chunk_overlap)
        
        return chunks
    
    @staticmethod
    def process_pdf(pdf_path: Path) -> List[Dict[str, any]]:
        """
        PDF를 처리하여 청크 리스트를 반환합니다.
        
        Args:
            pdf_path: PDF 파일 경로
            
        Returns:
            처리된 청크 리스트
        """
        # 1. PDF에서 텍스트 추출
        pages_content = PDFProcessor.extract_text_from_pdf(pdf_path)
        
        # 2. 텍스트를 청크로 분할
        chunks = PDFProcessor.split_text_into_chunks(pages_content)
        
        return chunks 