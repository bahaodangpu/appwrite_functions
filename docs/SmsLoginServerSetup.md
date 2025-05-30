# 短信验证码登录服务端配置指南

本文档说明如何在Appwrite后台配置短信验证码登录所需的Functions。

## 前置要求

1. 已开通网易云信短信服务
2. 已获取网易云信的AppKey和AppSecret
3. 已在网易云信后台创建短信模板

## 1. 发送验证码Function

在Appwrite控制台创建一个新的Function：

### Function配置
- **名称**: sendSmsCode
- **运行环境**: Python 3.9
- **执行权限**: Any（允许任何人调用）

### 环境变量配置
```
YUNXIN_APP_KEY=你的AppKey
YUNXIN_APP_SECRET=你的AppSecret
YUNXIN_SMS_TEMPLATE_ID=你的短信模板ID
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=你的项目ID
APPWRITE_API_KEY=你的API密钥
```

### Function代码示例

```python
# main.py
import os
import json
import hashlib
import random
import time
import requests
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID

# 网易云信配置
APP_KEY = os.environ.get('YUNXIN_APP_KEY')
APP_SECRET = os.environ.get('YUNXIN_APP_SECRET')
TEMPLATE_ID = os.environ.get('YUNXIN_SMS_TEMPLATE_ID')

# Appwrite配置
client = Client()
client.set_endpoint(os.environ.get('APPWRITE_ENDPOINT'))
client.set_project(os.environ.get('APPWRITE_PROJECT_ID'))
client.set_key(os.environ.get('APPWRITE_API_KEY'))

databases = Databases(client)

# 数据库和集合ID（需要预先创建）
DATABASE_ID = 'sms_codes'
COLLECTION_ID = 'verification_codes'

def main(req, res):
    """发送短信验证码的主函数"""
    try:
        payload = json.loads(req.payload or '{}')
        phone = payload.get('phone', '')
        sms_type = payload.get('type', 'login')
        
        # 验证手机号
        if not phone:
            return res.json({
                'success': False,
                'message': '手机号不能为空'
            })
        
        # 验证手机号格式（中国大陆手机号）
        import re
        if not re.match(r'^1[3-9]\d{9}$', phone):
            return res.json({
                'success': False,
                'message': '手机号格式不正确'
            })
        
        # 检查是否已发送验证码（60秒内）
        try:
            # 查询最近的验证码记录
            recent_codes = databases.list_documents(
                database_id=DATABASE_ID,
                collection_id=COLLECTION_ID,
                queries=[
                    f'phone="{phone}"',
                    f'createdAt>"{int(time.time() - 60) * 1000}"'
                ]
            )
            
            if recent_codes['total'] > 0:
                return res.json({
                    'success': False,
                    'message': '验证码已发送，请稍后再试'
                })
        except:
            # 如果数据库不存在，继续执行
            pass
        
        # 生成6位验证码
        code = str(random.randint(100000, 999999))
        
        # 发送短信
        result = send_sms(phone, code)
        
        if result.get('code') == 200:
            # 将验证码存储到数据库
            try:
                databases.create_document(
                    database_id=DATABASE_ID,
                    collection_id=COLLECTION_ID,
                    document_id=ID.unique(),
                    data={
                        'phone': phone,
                        'code': code,
                        'type': sms_type,
                        'used': False,
                        'createdAt': int(time.time() * 1000),
                        'expiresAt': int((time.time() + 300) * 1000)  # 5分钟后过期
                    }
                )
            except Exception as e:
                print(f"Error saving code: {e}")
                # 即使保存失败，如果短信发送成功，也返回成功
            
            return res.json({
                'success': True,
                'message': '验证码发送成功'
            })
        else:
            return res.json({
                'success': False,
                'message': '验证码发送失败'
            })
            
    except Exception as e:
        print(f"Error: {e}")
        return res.json({
            'success': False,
            'message': '服务器错误'
        })

def send_sms(mobile, code):
    """调用网易云信API发送短信"""
    nonce = str(random.random())
    cur_time = str(int(time.time()))
    check_sum = get_check_sum(APP_SECRET, nonce, cur_time)
    
    url = 'https://api.netease.im/sms/sendtemplate.action'
    headers = {
        'AppKey': APP_KEY,
        'Nonce': nonce,
        'CurTime': cur_time,
        'CheckSum': check_sum,
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    data = {
        'templateid': TEMPLATE_ID,
        'mobiles': json.dumps([mobile]),
        'params': json.dumps([code])
    }
    
    try:
        response = requests.post(url, headers=headers, data=data)
        return response.json()
    except Exception as e:
        print(f"SMS send error: {e}")
        return {'code': 500}

def get_check_sum(app_secret, nonce, cur_time):
    """计算网易云信的CheckSum"""
    content = app_secret + nonce + cur_time
    return hashlib.sha1(content.encode()).hexdigest()

### requirements.txt
```
appwrite==4.1.0
requests==2.31.0
```

## 2. 验证码验证与登录Function

### Function配置
- **名称**: verifySmsLogin
- **运行环境**: Python 3.9
- **执行权限**: Any

### 环境变量配置
```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=你的项目ID
APPWRITE_API_KEY=你的API密钥（需要users.read和users.write权限）
JWT_SECRET=你的JWT密钥
```

### Function代码示例

```python
# main.py
import os
import json
import time
import jwt
from appwrite.client import Client
from appwrite.services.users import Users
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.query import Query

# Appwrite配置
client = Client()
client.set_endpoint(os.environ.get('APPWRITE_ENDPOINT'))
client.set_project(os.environ.get('APPWRITE_PROJECT_ID'))
client.set_key(os.environ.get('APPWRITE_API_KEY'))

users = Users(client)
databases = Databases(client)

# JWT密钥
JWT_SECRET = os.environ.get('JWT_SECRET')

# 数据库和集合ID
DATABASE_ID = 'sms_codes'
COLLECTION_ID = 'verification_codes'

def main(req, res):
    """验证短信验证码并登录"""
    try:
        payload = json.loads(req.payload or '{}')
        phone = payload.get('phone', '')
        code = payload.get('code', '')
        
        if not phone or not code:
            return res.json({
                'success': False,
                'message': '手机号和验证码不能为空'
            })
        
        # 查找验证码
        try:
            code_docs = databases.list_documents(
                database_id=DATABASE_ID,
                collection_id=COLLECTION_ID,
                queries=[
                    Query.equal('phone', phone),
                    Query.equal('code', code),
                    Query.equal('used', False),
                    Query.greater('expiresAt', int(time.time() * 1000))
                ]
            )
            
            if code_docs['total'] == 0:
                return res.json({
                    'success': False,
                    'message': '验证码错误或已过期'
                })
            
            # 标记验证码为已使用
            code_doc = code_docs['documents'][0]
            databases.update_document(
                database_id=DATABASE_ID,
                collection_id=COLLECTION_ID,
                document_id=code_doc['$id'],
                data={'used': True}
            )
        except Exception as e:
            print(f"Code verification error: {e}")
            return res.json({
                'success': False,
                'message': '验证码验证失败'
            })
        
        # 查找或创建用户
        user = None
        try:
            # 尝试通过手机号查找用户
            users_list = users.list(queries=[
                Query.equal('phone', phone)
            ])
            
            if users_list['total'] > 0:
                user = users_list['users'][0]
            else:
                # 创建新用户
                user_id = ID.unique()
                user = users.create(
                    user_id=user_id,
                    email=f"{phone}@sms.local",
                    password=phone,  # 使用手机号作为初始密码
                    name=phone
                )
                
                # 更新用户属性，添加手机号
                users.update_prefs(
                    user_id=user['$id'],
                    prefs={'phone': phone}
                )
        except Exception as e:
            print(f"User operation error: {e}")
            # 如果是查找用户时的错误，尝试创建新用户
            try:
                user_id = ID.unique()
                user = users.create(
                    user_id=user_id,
                    email=f"{phone}@sms.local",
                    password=phone,
                    name=phone
                )
                users.update_prefs(
                    user_id=user['$id'],
                    prefs={'phone': phone}
                )
            except:
                return res.json({
                    'success': False,
                    'message': '用户操作失败'
                })
        
        # 生成JWT token
        token_payload = {
            'userId': user['$id'],
            'phone': phone,
            'exp': int(time.time()) + 7 * 24 * 60 * 60  # 7天过期
        }
        
        token = jwt.encode(token_payload, JWT_SECRET, algorithm='HS256')
        
        return res.json({
            'success': True,
            'token': token,
            'userId': user['$id'],
            'message': '登录成功'
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return res.json({
            'success': False,
            'message': '服务器错误'
        })
```

### requirements.txt
```
appwrite==4.1.0
PyJWT==2.8.0
```

## 3. 数据库设置

在Appwrite控制台创建数据库和集合：

### 创建数据库
- **数据库ID**: sms_codes
- **数据库名称**: 短信验证码

### 创建集合
- **集合ID**: verification_codes
- **集合名称**: 验证码记录

### 集合属性
1. **phone** (String, 必需)
   - 大小: 20
   - 默认值: 无

2. **code** (String, 必需)
   - 大小: 6
   - 默认值: 无

3. **type** (String, 必需)
   - 大小: 20
   - 默认值: "login"

4. **used** (Boolean, 必需)
   - 默认值: false

5. **createdAt** (Integer, 必需)
   - 最小值: 0
   - 默认值: 无

6. **expiresAt** (Integer, 必需)
   - 最小值: 0
   - 默认值: 无

### 创建索引
- **phone_index**: 在phone字段上创建索引
- **expire_index**: 在expiresAt字段上创建索引

## 4. 部署步骤

1. **创建Functions**
   - 在Appwrite控制台进入Functions页面
   - 创建两个新的Function（sendSmsCode和verifySmsLogin）
   - 设置运行环境为Python 3.9

2. **配置环境变量**
   - 为每个Function添加所需的环境变量
   - 确保API密钥具有正确的权限

3. **部署代码**
   - 创建包含`main.py`和`requirements.txt`的文件夹
   - 将文件夹打包为zip文件
   - 通过控制台或CLI部署到对应的Function

4. **创建数据库结构**
   - 按照上述说明创建数据库、集合和属性
   - 设置适当的权限（允许Functions读写）

5. **测试**
   - 使用Appwrite控制台的Function测试功能
   - 验证发送验证码和登录流程

## 安全建议

1. **限制调用频率**
   - 在Function中添加IP限制和频率限制
   - 可以使用Appwrite的Rate Limit功能

2. **验证码安全**
   - 使用随机生成的验证码
   - 设置合理的过期时间（5分钟）
   - 验证后立即标记为已使用

3. **HTTPS通信**
   - 确保所有API调用使用HTTPS
   - 在生产环境中使用安全的密钥存储

4. **日志监控**
   - 记录所有验证码发送和验证操作
   - 监控异常登录行为

5. **数据清理**
   - 定期清理过期的验证码记录
   - 可以创建一个定时Function来执行清理任务 