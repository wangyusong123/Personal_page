// 按量免费，每月 12.5 万次调用
const axios = require('axios');
exports.handler = async () => {
  const { data } = await axios.post(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET }
  );
  return {
    statusCode: 200,
    body: JSON.stringify({ tenant_access_token: data.tenant_access_token })
  };
};
