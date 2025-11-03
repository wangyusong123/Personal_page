const axios = require('axios');

const REQUIRED_ENV_VARS = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'FEISHU_APP_TOKEN',
  'FEISHU_DRIVE_FOLDER_TOKEN',
];

const TABLE_ENV_PREFIX = 'FEISHU_TABLE_';

let cachedToken = null;
let cachedTokenExpire = 0;

function assertEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing Feishu config: ${missing.join(', ')}`);
  }
}

async function getTenantToken() {
  assertEnv();

  const now = Date.now();
  if (cachedToken && cachedTokenExpire > now) {
    return cachedToken;
  }

  const { data } = await axios.post(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }
  );

  if (data.code !== 0) {
    throw new Error(`Failed to fetch tenant_access_token: ${data.msg || data.code}`);
  }

  cachedToken = data.tenant_access_token;
  cachedTokenExpire = now + (data.expire - 120) * 1000; // refresh 2 minutes earlier

  return cachedToken;
}

function getTableConfig() {
  const tables = {};
  Object.keys(process.env)
    .filter((key) => key.startsWith(TABLE_ENV_PREFIX))
    .forEach((key) => {
      const catalog = key.substring(TABLE_ENV_PREFIX.length).toLowerCase();
      tables[catalog] = process.env[key];
    });

  if (Object.keys(tables).length === 0) {
    throw new Error(
      'No Feishu tables configured. Set environment variables like FEISHU_TABLE_HONOR=tblXXXXXXXX.'
    );
  }

  return tables;
}

function getBitableBaseInfo() {
  return {
    appToken: process.env.FEISHU_APP_TOKEN,
    folderToken: process.env.FEISHU_DRIVE_FOLDER_TOKEN,
  };
}

module.exports = {
  getTenantToken,
  getTableConfig,
  getBitableBaseInfo,
};
