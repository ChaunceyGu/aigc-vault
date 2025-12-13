"""
RustFS/S3 连接验证脚本
用于测试 S3 兼容的对象存储服务是否可用
"""
import sys
import os
import asyncio

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.services.rustfs_client import RustFSClient

async def verify_rustfs():
    """验证 RustFS/S3 连接"""
    print("=" * 60)
    print("RustFS/S3 连接验证")
    print("=" * 60)
    
    print(f"\n配置信息:")
    print(f"  Endpoint URL: {settings.RUSTFS_ENDPOINT_URL}")
    print(f"  Access Key: {settings.RUSTFS_ACCESS_KEY[:10]}..." if settings.RUSTFS_ACCESS_KEY else "  Access Key: (未设置)")
    print(f"  Secret Key: {'*' * 10}..." if settings.RUSTFS_SECRET_KEY else "  Secret Key: (未设置)")
    print(f"  Bucket: {settings.RUSTFS_BUCKET}")
    print(f"  Region: {settings.RUSTFS_REGION}")
    
    client = RustFSClient()
    
    # 1. 测试连接和权限
    print("\n[1] 测试 S3 服务连接...")
    try:
        is_healthy = await client.health_check()
        if is_healthy:
            print("✅ 连接成功！存储桶可访问")
        else:
            print("❌ 连接失败或存储桶不存在")
            print("   请检查:")
            print("   - 存储桶名称是否正确")
            print("   - Access Key 和 Secret Key 是否正确")
            print("   - 用户是否有该存储桶的访问权限")
            return False
    except Exception as e:
        print(f"❌ 连接测试失败: {e}")
        print("\n请检查:")
        print("   - Endpoint URL 是否正确")
        print("   - 网络连接是否正常")
        print("   - Access Key 和 Secret Key 是否正确")
        return False
    
    # 2. 测试文件上传
    print("\n[2] 测试文件上传...")
    try:
        test_content = b"test file content for RustFS verification"
        test_filename = "test_upload.txt"
        
        file_key = await client.upload_file(
            file_content=test_content,
            filename=test_filename,
            content_type="text/plain"
        )
        
        if file_key:
            print(f"✅ 上传成功！文件键: {file_key}")
        else:
            print("❌ 上传失败")
            return False
    except Exception as e:
        print(f"❌ 上传测试失败: {e}")
        return False
    
    # 3. 测试文件存在性检查
    print("\n[3] 测试文件存在性检查...")
    try:
        exists = await client.file_exists(file_key)
        if exists:
            print(f"✅ 文件存在性检查正常")
        else:
            print(f"❌ 文件不存在（应该存在）")
            return False
    except Exception as e:
        print(f"⚠️  存在性检查异常: {e}")
    
    # 4. 测试文件下载
    print("\n[4] 测试文件下载...")
    try:
        downloaded = await client.download_file(file_key)
        if downloaded and downloaded == test_content:
            print(f"✅ 下载成功！内容匹配")
        else:
            print(f"❌ 下载失败或内容不匹配")
            return False
    except Exception as e:
        print(f"❌ 下载测试失败: {e}")
        return False
    
    # 5. 测试 URL 生成
    print("\n[5] 测试文件 URL 生成...")
    try:
        url = await client.get_file_url(file_key, expires_in=300)
        print(f"✅ 预签名 URL 生成成功")
        print(f"   URL: {url[:80]}...")
    except Exception as e:
        print(f"⚠️  URL 生成异常: {e}")
    
    # 6. 清理测试文件
    print("\n[6] 清理测试文件...")
    try:
        deleted = await client.delete_file(file_key)
        if deleted:
            print(f"✅ 测试文件已删除")
        else:
            print(f"⚠️  删除测试文件失败（请手动清理）")
    except Exception as e:
        print(f"⚠️  删除测试文件异常: {e}")
    
    print("\n" + "=" * 60)
    print("✅ RustFS/S3 验证完成！")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = asyncio.run(verify_rustfs())
    sys.exit(0 if success else 1)
