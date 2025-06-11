from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List
from config import settings

class TextEmbedder:
    """텍스트 임베딩 생성 클래스"""
    
    def __init__(self):
        """임베딩 모델을 초기화합니다."""
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """임베딩 모델을 로드합니다."""
        try:
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
            print(f"임베딩 모델 로드 완료: {settings.EMBEDDING_MODEL}")
        except Exception as e:
            raise Exception(f"임베딩 모델 로드 실패: {str(e)}")
    
    def encode_texts(self, texts: List[str]) -> np.ndarray:
        """
        텍스트 리스트를 임베딩 벡터로 변환합니다.
        
        Args:
            texts: 임베딩할 텍스트 리스트
            
        Returns:
            임베딩 벡터 배열 (shape: [len(texts), embedding_dim])
        """
        if not self.model:
            raise Exception("임베딩 모델이 로드되지 않았습니다.")
        
        if not texts:
            return np.array([])
        
        try:
            # 빈 문자열 필터링
            valid_texts = [text for text in texts if text.strip()]
            
            if not valid_texts:
                return np.array([])
            
            # 임베딩 생성
            embeddings = self.model.encode(
                valid_texts,
                batch_size=32,
                show_progress_bar=True,
                convert_to_numpy=True,
                normalize_embeddings=True  # 코사인 유사도 최적화
            )
            
            return embeddings
            
        except Exception as e:
            raise Exception(f"임베딩 생성 오류: {str(e)}")
    
    def encode_single_text(self, text: str) -> np.ndarray:
        """
        단일 텍스트를 임베딩 벡터로 변환합니다.
        
        Args:
            text: 임베딩할 텍스트
            
        Returns:
            임베딩 벡터 (shape: [embedding_dim])
        """
        if not text.strip():
            raise ValueError("빈 텍스트는 임베딩할 수 없습니다.")
        
        embeddings = self.encode_texts([text])
        return embeddings[0] if len(embeddings) > 0 else np.array([])
    
    def get_embedding_dimension(self) -> int:
        """임베딩 벡터의 차원을 반환합니다."""
        if not self.model:
            raise Exception("임베딩 모델이 로드되지 않았습니다.")
        
        return self.model.get_sentence_embedding_dimension()

# 글로벌 임베더 인스턴스
embedder = TextEmbedder() 