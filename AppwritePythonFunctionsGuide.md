# Appwrite Python Functions 开发配置指南

本指南详细介绍如何开发、测试和部署Appwrite Python Functions。

## 目录
1. [环境准备](#1-环境准备)
2. [本地开发环境设置](#2-本地开发环境设置)
3. [Function项目结构](#3-function项目结构)
4. [开发流程](#4-开发流程)
5. [部署方式](#5-部署方式)
6. [调试技巧](#6-调试技巧)
7. [最佳实践](#7-最佳实践)
8. [常见问题](#8-常见问题)

## 1. 环境准备

### 1.1 系统要求
- Python 3.8+ （推荐使用3.9）
- Node.js 14+ （用于Appwrite CLI）
- Git

### 1.2 安装Appwrite CLI
```bash
# 使用npm安装
npm install -g appwrite

# 或使用yarn
yarn global add appwrite

# 验证安装
appwrite --version
```

### 1.3 配置Appwrite CLI
```bash
# 登录到Appwrite
appwrite login

# 初始化项目
appwrite init project

# 选择或创建项目后，初始化function
appwrite init function
```

## 2. 本地开发环境设置

### 2.1 创建虚拟环境
```bash
# 创建项目目录
mkdir my-appwrite-function
cd my-appwrite-function

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 2.2 安装开发依赖
```bash
# 安装Appwrite SDK
pip install appwrite

# 安装其他常用依赖
pip install requests python-dotenv

# 生成requirements.txt
pip freeze > requirements.txt
```

### 2.3 本地测试环境
创建 `.env` 文件用于本地测试：
```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_FUNCTION_ID=your_function_id
```

## 3. Function项目结构

### 3.1 基本结构
```
my-appwrite-function/
├── src/
│   └── main.py          # 主函数文件
├── requirements.txt     # Python依赖
├── .env                # 本地环境变量（不要提交到版本控制）
├── .gitignore          # Git忽略文件
├── README.md           # 项目说明
└── test_local.py       # 本地测试脚本
```

### 3.2 main.py 模板
```python
import os
import json
from appwrite.client import Client
from appwrite.services.databases import Databases

def main(req, res):
    """
    Appwrite Function主入口
    
    Args:
        req: 请求对象，包含payload、headers等
        res: 响应对象，用于返回结果
    """
    # 初始化客户端
    client = Client()
    client.set_endpoint(os.environ.get('APPWRITE_ENDPOINT', 'https://cloud.appwrite.io/v1'))
    client.set_project(os.environ.get('APPWRITE_PROJECT_ID'))
    client.set_key(os.environ.get('APPWRITE_API_KEY'))
    
    # 解析请求数据
    try:
        payload = json.loads(req.payload or '{}')
    except json.JSONDecodeError:
        return res.json({
            'success': False,
            'message': 'Invalid JSON payload'
        }, 400)
    
    # 获取请求参数
    name = payload.get('name', 'World')
    
    # 业务逻辑
    try:
        # 这里添加您的业务逻辑
        result = f"Hello, {name}!"
        
        # 返回成功响应
        return res.json({
            'success': True,
            'message': result
        })
        
    except Exception as e:
        # 错误处理
        print(f"Error: {str(e)}")
        return res.json({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }, 500)
```

### 3.3 .gitignore 模板
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/

# 环境变量
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# 日志
*.log

# 测试
.pytest_cache/
.coverage
htmlcov/
```

## 4. 开发流程

### 4.1 本地测试脚本
创建 `test_local.py` 用于本地测试：
```python
import os
import json
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 模拟Appwrite的请求和响应对象
class MockRequest:
    def __init__(self, payload, headers=None):
        self.payload = json.dumps(payload) if isinstance(payload, dict) else payload
        self.headers = headers or {}
        self.url = "http://localhost"
        self.query = {}

class MockResponse:
    def json(self, data, status_code=200):
        print(f"Status Code: {status_code}")
        print(f"Response: {json.dumps(data, indent=2)}")
        return data
    
    def send(self, text, status_code=200):
        print(f"Status Code: {status_code}")
        print(f"Response: {text}")
        return text

# 导入主函数
from src.main import main

# 测试用例
def test_hello_world():
    print("=== 测试 Hello World ===")
    req = MockRequest({"name": "Appwrite"})
    res = MockResponse()
    main(req, res)

def test_empty_payload():
    print("\n=== 测试空载荷 ===")
    req = MockRequest({})
    res = MockResponse()
    main(req, res)

def test_invalid_json():
    print("\n=== 测试无效JSON ===")
    req = MockRequest("invalid json")
    res = MockResponse()
    main(req, res)

if __name__ == "__main__":
    test_hello_world()
    test_empty_payload()
    test_invalid_json()
```

### 4.2 开发工作流
1. 在本地编写函数代码
2. 使用 `test_local.py` 进行本地测试
3. 确保所有依赖都在 `requirements.txt` 中
4. 提交代码到版本控制
5. 部署到Appwrite

## 5. 部署方式

### 5.1 使用Appwrite CLI部署
```bash
# 确保在函数目录中
cd my-appwrite-function

# 部署函数
appwrite functions createDeployment \
    --functionId=YOUR_FUNCTION_ID \
    --entrypoint='src/main.py' \
    --code=.

# 或使用交互式部署
appwrite deploy function
```

### 5.2 使用控制台部署
1. 打包项目为zip文件（包含所有源代码和requirements.txt）
2. 在Appwrite控制台上传zip文件
3. 设置入口点为 `src/main.py`
4. 点击激活部署

### 5.3 CI/CD自动部署
创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy to Appwrite

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Appwrite CLI
      run: npm install -g appwrite
    
    - name: Deploy Function
      env:
        APPWRITE_ENDPOINT: ${{ secrets.APPWRITE_ENDPOINT }}
        APPWRITE_PROJECT_ID: ${{ secrets.APPWRITE_PROJECT_ID }}
        APPWRITE_API_KEY: ${{ secrets.APPWRITE_API_KEY }}
      run: |
        appwrite client \
          --endpoint=$APPWRITE_ENDPOINT \
          --projectId=$APPWRITE_PROJECT_ID \
          --key=$APPWRITE_API_KEY
        
        appwrite functions createDeployment \
          --functionId=${{ secrets.FUNCTION_ID }} \
          --entrypoint='src/main.py' \
          --code=.
```

## 6. 调试技巧

### 6.1 日志记录
```python
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main(req, res):
    # 记录请求信息
    logger.info(f"Received request: {req.payload}")
    
    try:
        # 业务逻辑
        result = process_data()
        logger.info(f"Process successful: {result}")
        
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}", exc_info=True)
        raise
```

### 6.2 查看函数日志
```bash
# 实时查看日志
appwrite functions listExecutions --functionId=YOUR_FUNCTION_ID --limit=10

# 查看特定执行的日志
appwrite functions getExecution \
    --functionId=YOUR_FUNCTION_ID \
    --executionId=EXECUTION_ID
```

### 6.3 环境变量调试
```python
def main(req, res):
    # 打印所有环境变量（仅用于调试）
    if os.environ.get('DEBUG') == 'true':
        env_vars = {k: v for k, v in os.environ.items() 
                   if not k.startswith('APPWRITE_API')}
        print("Environment variables:", json.dumps(env_vars, indent=2))
```

## 7. 最佳实践

### 7.1 错误处理
```python
class AppwriteFunctionError(Exception):
    """自定义错误类"""
    def __init__(self, message, status_code=400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

def main(req, res):
    try:
        # 输入验证
        if not req.payload:
            raise AppwriteFunctionError("Payload is required", 400)
        
        # 业务逻辑
        result = process_business_logic()
        
        return res.json({
            'success': True,
            'data': result
        })
        
    except AppwriteFunctionError as e:
        return res.json({
            'success': False,
            'error': e.message
        }, e.status_code)
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return res.json({
            'success': False,
            'error': 'Internal server error'
        }, 500)
```

### 7.2 输入验证
```python
def validate_input(data, required_fields):
    """验证必需字段"""
    missing = [field for field in required_fields if field not in data]
    if missing:
        raise AppwriteFunctionError(
            f"Missing required fields: {', '.join(missing)}", 
            400
        )

def main(req, res):
    try:
        payload = json.loads(req.payload or '{}')
        
        # 验证必需字段
        validate_input(payload, ['userId', 'action'])
        
        # 继续处理...
    except json.JSONDecodeError:
        return res.json({
            'success': False,
            'error': 'Invalid JSON payload'
        }, 400)
```

### 7.3 性能优化
```python
# 全局初始化客户端（避免每次请求都初始化）
client = None

def get_client():
    global client
    if client is None:
        client = Client()
        client.set_endpoint(os.environ.get('APPWRITE_ENDPOINT'))
        client.set_project(os.environ.get('APPWRITE_PROJECT_ID'))
        client.set_key(os.environ.get('APPWRITE_API_KEY'))
    return client

def main(req, res):
    client = get_client()
    # 使用client...
```

### 7.4 安全实践
```python
import secrets
import hashlib

def generate_secure_token():
    """生成安全的随机令牌"""
    return secrets.token_urlsafe(32)

def hash_sensitive_data(data):
    """哈希敏感数据"""
    return hashlib.sha256(data.encode()).hexdigest()

def sanitize_input(text):
    """清理用户输入"""
    # 移除潜在的危险字符
    dangerous_chars = ['<', '>', '&', '"', "'"]
    for char in dangerous_chars:
        text = text.replace(char, '')
    return text.strip()
```

## 8. 常见问题

### 8.1 模块导入错误
**问题**：`ModuleNotFoundError: No module named 'xxx'`
**解决**：
1. 确保模块在 `requirements.txt` 中
2. 检查模块名称拼写
3. 确保使用正确的Python版本

### 8.2 环境变量未找到
**问题**：环境变量返回 `None`
**解决**：
1. 在Appwrite控制台设置环境变量
2. 重新部署函数
3. 使用默认值：`os.environ.get('VAR_NAME', 'default_value')`

### 8.3 函数超时
**问题**：函数执行超时
**解决**：
1. 优化代码性能
2. 增加函数超时时间（最大900秒）
3. 考虑使用异步处理

### 8.4 内存限制
**问题**：函数内存不足
**解决**：
1. 减少内存使用
2. 在控制台增加函数内存限制
3. 使用流式处理大文件

### 8.5 权限错误
**问题**：`401 Unauthorized` 或 `403 Forbidden`
**解决**：
1. 检查API密钥权限
2. 确保Function有正确的执行权限
3. 验证用户权限设置

## 附录：实用代码片段

### A.1 发送HTTP请求
```python
import requests

def call_external_api(url, data):
    """调用外部API"""
    try:
        response = requests.post(
            url,
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API call failed: {str(e)}")
        raise AppwriteFunctionError("External API call failed", 503)
```

### A.2 数据库操作
```python
from appwrite.services.databases import Databases
from appwrite.query import Query

def get_user_data(client, user_id):
    """获取用户数据"""
    databases = Databases(client)
    
    try:
        document = databases.get_document(
            database_id='production',
            collection_id='users',
            document_id=user_id
        )
        return document
    except Exception as e:
        logger.error(f"Failed to get user data: {str(e)}")
        return None

def query_documents(client, collection_id, queries):
    """查询文档"""
    databases = Databases(client)
    
    try:
        result = databases.list_documents(
            database_id='production',
            collection_id=collection_id,
            queries=queries
        )
        return result['documents']
    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        return []
```

### A.3 文件处理
```python
import base64
from appwrite.services.storage import Storage

def upload_file_from_base64(client, bucket_id, base64_data, filename):
    """从Base64数据上传文件"""
    storage = Storage(client)
    
    try:
        # 解码Base64数据
        file_data = base64.b64decode(base64_data)
        
        # 上传文件
        result = storage.create_file(
            bucket_id=bucket_id,
            file_id=ID.unique(),
            file=file_data,
            filename=filename
        )
        
        return result
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise AppwriteFunctionError("File upload failed", 500)
```

---

通过本指南，您应该能够顺利地开发、测试和部署Appwrite Python Functions。如有问题，请参考[Appwrite官方文档](https://appwrite.io/docs)或社区支持。 