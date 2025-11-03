const axios = require('axios');
const { getTenantToken } = require('./feishu-utils');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { fileToken } = event.queryStringParameters || {};
  if (!fileToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: '缺少 fileToken 参数' }),
    };
  }

  try {
    const token = await getTenantToken();
    const { data } = await axios.get(
      `https://open.feishu.cn/open-apis/drive/v1/files/${fileToken}`,
      {
        params: {
          fields: 'name,download_url',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (data.code !== 0) {
      throw new Error(`获取下载链接失败: ${data.msg || data.code}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        fileName: data.data.name,
        downloadUrl: data.data.download_url,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || '获取下载链接失败',
      }),
    };
  }
};
