import faiss
import numpy as np
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any
from config import settings
from utils.file_utils import FileManager

class VectorStore:
    """FAISS 기반 벡터 저장소 클래스"""
    
    def __init__(self, doc_id: str):
        """
        문서별 벡터 저장소를 초기화합니다.
        
        Args:
            doc_id: 문서 ID
        """
        self.doc_id = doc_id
        self.index_path = FileManager.get_vectorstore_path(doc_id)
        self.metadata_path = FileManager.get_metadata_path(doc_id)
        self.index = None
        self.metadata = []
        self.dimension = None
    
    def create_index(self, embeddings: np.ndarray, chunks: List[Dict[str, Any]]):
        """
        새로운 FAISS 인덱스를 생성하고 저장합니다.
        
        Args:
            embeddings: 임베딩 벡터 배열
            chunks: 청크 메타데이터 리스트
        """
        if len(embeddings) == 0:
            raise ValueError("임베딩 배열이 비어있습니다.")
        
        if len(embeddings) != len(chunks):
            raise ValueError("임베딩과 청크 수가 일치하지 않습니다.")
        
        # 차원 설정
        self.dimension = embeddings.shape[1]
        
        # FAISS 인덱스 생성 (코사인 유사도용 L2 정규화)
        self.index = faiss.IndexFlatIP(self.dimension)  # Inner Product (코사인 유사도)
        
        # 임베딩 정규화 (코사인 유사도를 위해)
        normalized_embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        
        # 벡터 추가
        self.index.add(normalized_embeddings.astype(np.float32))
        
        # 메타데이터 저장
        self.metadata = chunks
        
        # 파일로 저장
        self._save_to_disk()
        
        print(f"벡터 저장소 생성 완료: {len(embeddings)}개 벡터, 차원: {self.dimension}")
    
    def load_index(self) -> bool:
        """
        디스크에서 인덱스를 로드합니다.
        
        Returns:
            로드 성공 여부
        """
        try:
            if not self.index_path.exists() or not self.metadata_path.exists():
                return False
            
            # FAISS 인덱스 로드
            self.index = faiss.read_index(str(self.index_path))
            
            # 메타데이터 로드
            with open(self.metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
            
            # 차원 정보 설정
            self.dimension = self.index.d
            
            print(f"벡터 저장소 로드 완료: {len(self.metadata)}개 벡터")
            return True
            
        except Exception as e:
            print(f"벡터 저장소 로드 실패: {str(e)}")
            return False
    
    def search(self, query_embedding: np.ndarray, top_k: int = None) -> List[Dict[str, Any]]:
        """
        유사한 벡터를 검색합니다.
        
        Args:
            query_embedding: 쿼리 임베딩 벡터
            top_k: 상위 k개 결과 (기본값: 설정에서 가져옴)
            
        Returns:
            검색 결과 리스트 [{"chunk": Dict, "score": float}]
        """
        if top_k is None:
            top_k = settings.TOP_K_RESULTS
        
        if self.index is None:
            if not self.load_index():
                raise Exception("벡터 저장소를 로드할 수 없습니다.")
        
        # 쿼리 벡터 정규화
        query_embedding = query_embedding.reshape(1, -1)
        normalized_query = query_embedding / np.linalg.norm(query_embedding, axis=1, keepdims=True)
        
        # 검색 수행
        scores, indices = self.index.search(normalized_query.astype(np.float32), top_k)
        
        # 결과 구성
        results = []
        for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
            if idx != -1 and idx < len(self.metadata):  # 유효한 인덱스인지 확인
                results.append({
                    "chunk": self.metadata[idx],
                    "score": float(score),
                    "rank": i + 1
                })
        
        return results
    
    def _save_to_disk(self):
        """인덱스와 메타데이터를 디스크에 저장합니다."""
        try:
            # FAISS 인덱스 저장
            faiss.write_index(self.index, str(self.index_path))
            
            # 메타데이터 저장
            with open(self.metadata_path, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            raise Exception(f"벡터 저장소 저장 실패: {str(e)}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """벡터 저장소 통계 정보를 반환합니다."""
        if self.index is None:
            if not self.load_index():
                return {"error": "벡터 저장소를 로드할 수 없습니다."}
        
        return {
            "doc_id": self.doc_id,
            "total_vectors": self.index.ntotal,
            "dimension": self.dimension,
            "total_chunks": len(self.metadata),
            "index_file_exists": self.index_path.exists(),
            "metadata_file_exists": self.metadata_path.exists()
        }

class VectorStoreManager:
    """여러 문서의 벡터 저장소를 관리하는 클래스"""
    
    @staticmethod
    def create_document_index(doc_id: str, embeddings: np.ndarray, chunks: List[Dict[str, Any]]) -> VectorStore:
        """
        새로운 문서의 벡터 인덱스를 생성합니다.
        
        Args:
            doc_id: 문서 ID
            embeddings: 임베딩 벡터 배열
            chunks: 청크 메타데이터 리스트
            
        Returns:
            생성된 벡터 저장소 인스턴스
        """
        vector_store = VectorStore(doc_id)
        vector_store.create_index(embeddings, chunks)
        return vector_store
    
    @staticmethod
    def get_document_store(doc_id: str) -> Optional[VectorStore]:
        """
        문서의 벡터 저장소를 가져옵니다.
        
        Args:
            doc_id: 문서 ID
            
        Returns:
            벡터 저장소 인스턴스 또는 None
        """
        vector_store = VectorStore(doc_id)
        if vector_store.load_index():
            return vector_store
        return None
    
    @staticmethod
    def search_all_documents(query_embedding: np.ndarray, top_k: int = None) -> List[Dict[str, Any]]:
        """
        모든 문서에서 검색을 수행합니다.
        
        Args:
            query_embedding: 쿼리 임베딩 벡터
            top_k: 각 문서별 상위 k개 결과
            
        Returns:
            전체 검색 결과 리스트
        """
        if top_k is None:
            top_k = settings.TOP_K_RESULTS
        
        all_results = []
        documents = FileManager.list_documents()
        
        for doc_info in documents:
            if doc_info["has_vector"]:
                doc_id = doc_info["doc_id"]
                vector_store = VectorStoreManager.get_document_store(doc_id)
                
                if vector_store:
                    try:
                        doc_results = vector_store.search(query_embedding, top_k)
                        # 문서 정보 추가
                        for result in doc_results:
                            result["doc_id"] = doc_id
                            result["filename"] = doc_info["filename"]
                        all_results.extend(doc_results)
                    except Exception as e:
                        print(f"문서 {doc_id} 검색 오류: {str(e)}")
        
        # 점수 기준으로 정렬
        all_results.sort(key=lambda x: x["score"], reverse=True)
        
        # 상위 top_k 결과만 반환
        return all_results[:top_k] 