const axios = require('axios');
const {
  getTenantToken,
  getTableConfig,
  getBitableBaseInfo,
} = require('./feishu-utils');

async function fetchRecords(token, appToken, tableId) {
  const records = [];
  let pageToken = '';

  while (true) {
    const { data } = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
      {
        params: {
          page_size: 200,
          page_token: pageToken || undefined,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (data.code !== 0) {
      throw new Error(`获取多维表格数据失败: ${data.msg || data.code}`);
    }

    records.push(...data.data.items);

    if (!data.data.has_more) {
      break;
    }
    pageToken = data.data.page_token;
  }

  return records;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { category } = event.queryStringParameters || {};
    const tableMapping = getTableConfig();

    const requestedCategories = category
      ? category.split(',').map((item) => item.trim().toLowerCase())
      : Object.keys(tableMapping);

    const token = await getTenantToken();
    const { appToken } = getBitableBaseInfo();

    const result = {};

    for (const key of requestedCategories) {
      const tableId = tableMapping[key];
      if (!tableId) {
        continue;
      }

      const items = await fetchRecords(token, appToken, tableId);
      result[key] = items.map((item) => ({
        recordId: item.record_id,
        fields: item.fields,
      }));
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || '获取多维表格失败',
      }),
    };
  }
};
