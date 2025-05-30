module.exports = async function (req, res) {
    // 获取请求数据
    const payload = req.payload || {};
    
    // 函数逻辑
    const message = `Hello ${payload.name || 'World1'}!`;
    
    // 返回响应
    res.json({
      success: true,
      message: message,
      timestamp: new Date().toISOString()
    });
  };