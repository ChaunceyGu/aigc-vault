"""
简单的内存缓存工具
用于缓存API响应，减少数据库查询
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import threading
import logging

logger = logging.getLogger(__name__)


class SimpleCache:
    """简单的内存缓存实现"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        with self._lock:
            if key not in self._cache:
                return None
            
            item = self._cache[key]
            # 检查是否过期
            if datetime.now() > item['expires_at']:
                del self._cache[key]
                return None
            
            return item['value']
    
    def set(self, key: str, value: Any, expires_in: int = 300) -> None:
        """
        设置缓存值
        
        Args:
            key: 缓存键
            value: 缓存值
            expires_in: 过期时间（秒），默认5分钟
        """
        with self._lock:
            expires_at = datetime.now() + timedelta(seconds=expires_in)
            self._cache[key] = {
                'value': value,
                'expires_at': expires_at
            }
    
    def delete(self, key: str) -> None:
        """删除缓存"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def clear(self, prefix: Optional[str] = None) -> None:
        """
        清除缓存
        
        Args:
            prefix: 如果提供，只清除以该前缀开头的缓存
        """
        with self._lock:
            if prefix:
                keys_to_delete = [k for k in self._cache.keys() if k.startswith(prefix)]
                for key in keys_to_delete:
                    del self._cache[key]
            else:
                self._cache.clear()
    
    def clear_expired(self) -> None:
        """清除所有过期的缓存"""
        with self._lock:
            now = datetime.now()
            keys_to_delete = [
                key for key, item in self._cache.items()
                if now > item['expires_at']
            ]
            for key in keys_to_delete:
                del self._cache[key]


# 全局缓存实例
cache = SimpleCache()

