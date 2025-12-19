"""
验证码工具
生成和验证数学验证码（支持加减乘除，增加难度）
"""
import random
import time
from typing import Dict, Tuple
import secrets


# 内存存储验证码（生产环境建议使用 Redis）
_captcha_store: Dict[str, Dict[str, any]] = {}


def generate_captcha() -> Tuple[str, str, str]:
    """
    生成数学验证码（支持加减乘除，增加难度）
    
    Returns:
        Tuple[str, str, str]: (验证码ID, 问题文本, 答案)
    """
    # 随机选择验证码类型（70% 简单，30% 复杂）
    captcha_type = random.choices(
        ['simple', 'medium', 'hard'],
        weights=[40, 40, 20]
    )[0]
    
    if captcha_type == 'simple':
        # 简单：两位数加减法
        num1 = random.randint(10, 99)
        num2 = random.randint(10, 99)
        operator = random.choice(['+', '-'])
        
        if operator == '+':
            answer = num1 + num2
            question = f"{num1} + {num2} = ?"
        else:
            # 确保减法结果为正数
            if num1 < num2:
                num1, num2 = num2, num1
            answer = num1 - num2
            question = f"{num1} - {num2} = ?"
    
    elif captcha_type == 'medium':
        # 中等：乘法或三位数加减
        if random.random() < 0.5:
            # 乘法（1-12 的乘法表）
            num1 = random.randint(2, 12)
            num2 = random.randint(2, 12)
            answer = num1 * num2
            question = f"{num1} × {num2} = ?"
        else:
            # 三位数加减
            num1 = random.randint(100, 999)
            num2 = random.randint(10, 99)
            operator = random.choice(['+', '-'])
            if operator == '+':
                answer = num1 + num2
                question = f"{num1} + {num2} = ?"
            else:
                answer = num1 - num2
                question = f"{num1} - {num2} = ?"
    
    else:  # hard
        # 困难：混合运算或大数运算
        if random.random() < 0.5:
            # 混合运算：a + b × c 或 a × b - c
            if random.random() < 0.5:
                # a + b × c
                b = random.randint(2, 9)
                c = random.randint(2, 9)
                a = random.randint(10, 50)
                answer = a + (b * c)
                question = f"{a} + {b} × {c} = ?"
            else:
                # a × b - c
                a = random.randint(2, 9)
                b = random.randint(2, 9)
                c = random.randint(1, a * b - 1)
                answer = (a * b) - c
                question = f"{a} × {b} - {c} = ?"
        else:
            # 大数运算
            num1 = random.randint(100, 999)
            num2 = random.randint(100, 999)
            operator = random.choice(['+', '-'])
            if operator == '+':
                answer = num1 + num2
                question = f"{num1} + {num2} = ?"
            else:
                if num1 < num2:
                    num1, num2 = num2, num1
                answer = num1 - num2
                question = f"{num1} - {num2} = ?"
    
    # 生成验证码ID（使用随机字符串）
    captcha_id = secrets.token_urlsafe(16)
    
    # 存储验证码
    _captcha_store[captcha_id] = {
        'answer': answer,  # 实际存储答案用于验证
        'created_at': time.time(),
        'used': False
    }
    
    # 清理过期验证码（5分钟过期）
    _cleanup_expired_captchas()
    
    return captcha_id, question, str(answer)


def verify_captcha(captcha_id: str, user_answer: str) -> bool:
    """
    验证验证码
    
    Args:
        captcha_id: 验证码ID
        user_answer: 用户输入的答案
        
    Returns:
        bool: 验证是否通过
    """
    if not captcha_id or not user_answer:
        return False
    
    # 检查验证码是否存在
    if captcha_id not in _captcha_store:
        return False
    
    captcha_data = _captcha_store[captcha_id]
    
    # 检查是否已使用
    if captcha_data['used']:
        return False
    
    # 检查是否过期（5分钟）
    if time.time() - captcha_data['created_at'] > 300:
        # 删除过期验证码
        del _captcha_store[captcha_id]
        return False
    
    # 验证答案（去除空格，转换为字符串比较）
    user_answer_clean = str(user_answer).strip()
    correct_answer = str(captcha_data['answer'])
    
    if user_answer_clean == correct_answer:
        # 标记为已使用
        captcha_data['used'] = True
        # 延迟删除，避免重复使用
        return True
    
    return False


def _cleanup_expired_captchas():
    """清理过期的验证码"""
    current_time = time.time()
    expired_ids = [
        captcha_id for captcha_id, data in _captcha_store.items()
        if current_time - data['created_at'] > 300  # 5分钟过期
    ]
    for captcha_id in expired_ids:
        del _captcha_store[captcha_id]


def get_captcha_question(captcha_id: str) -> str:
    """
    获取验证码问题（用于调试，生产环境不建议暴露）
    """
    if captcha_id not in _captcha_store:
        return ""
    return f"验证码ID: {captcha_id}"

