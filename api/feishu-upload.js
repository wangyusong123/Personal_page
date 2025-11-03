const axios = require('axios');
const Busboy = require('busboy');
const FormData = require('form-data');
const {
  getTenantToken,
  getTableConfig,
  getBitableBaseInfo,
} = require('./feishu-utils');

const CATEGORY_MAPPINGS = [
  { key: 'personal_info', tableEnv: 'personal', keywords: ['姓名', '个人信息', '基本信息'] },
  { key: 'honor_awards', tableEnv: 'honor', keywords: ['奖', '荣誉', '人才', '证书'] },
  { key: 'academic_positions', tableEnv: 'society', keywords: ['学会', '职务', '任职'] },
  { key: 'intellectual_property', tableEnv: 'ip', keywords: ['专利', '知识产权', '申请'] },
  { key: 'articles', tableEnv: 'article', keywords: ['文章', '期刊', '论文'] },
  { key: 'submitted_materials', tableEnv: 'material', keywords: ['材料', '申报', '提交'] },
  { key: 'books', tableEnv: 'book', keywords: ['著作', '书', '出版'] },
  { key: 'projects', tableEnv: 'project', keywords: ['课题', '项目', '资助'] },
  { key: 'science_pop', tableEnv: 'science', keywords: ['科普'] },
  { key: 'clinical_trials', tableEnv: 'trial', keywords: ['临床试验', '试验'] },
];

function classifyCategory(filename, ocrText) {
  const lowerFilename = filename.toLowerCase();
  const text = (ocrText || '').toLowerCase();

  for (const entry of CATEGORY_MAPPINGS) {
    const matchKeyword = entry.keywords.find((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      return lowerFilename.includes(lowerKeyword) || text.includes(lowerKeyword);
    });

    if (matchKeyword) {
      return entry.tableEnv;
    }
  }

  return 'material';
}

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: event.headers,
    });

    const result = {
      fields: {},
      fileBuffer: null,
      filename: '',
      mimetype: '',
    };

    busboy.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks = [];

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        result.fileBuffer = Buffer.concat(chunks);
        result.filename = filename;
        result.mimetype = mimeType;
      });
    });

    busboy.on('field', (name, value) => {
      result.fields[name] = value;
    });

    busboy.on('finish', () => {
      if (!result.fileBuffer) {
        reject(new Error('No file uploaded'));
      } else {
        resolve(result);
      }
    });

    busboy.on('error', reject);

    busboy.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
  });
}

async function uploadFile(token, buffer, filename, mimetype) {
  const { folderToken } = getBitableBaseInfo();

  const form = new FormData();
  form.append('file_name', filename);
  form.append('parent_type', 'explorer');
  form.append('parent_token', folderToken);
  form.append('size', buffer.length);
  form.append('file', buffer, { filename, contentType: mimetype });

  const { data } = await axios.post(
    'https://open.feishu.cn/open-apis/drive/v1/files/upload_all',
    form,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  if (data.code !== 0) {
    throw new Error(`Feishu upload failed: ${data.msg || data.code}`);
  }

  return data.data;
}

async function runOCR(token, fileToken) {
  try {
    const { data } = await axios.post(
      'https://open.feishu.cn/open-apis/ocr/v1/file/structure',
      {
        file_token: fileToken,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (data.code !== 0) {
      throw new Error(`Feishu OCR failed: ${data.msg || data.code}`);
    }

    return data.data;
  } catch (error) {
    console.warn('OCR failed: ', error.message);
    return null;
  }
}

function buildRecordPayload(tableKey, fileInfo, ocrData, fields) {
  const fileToken = fileInfo.file_token;
  const basePayload = {
    records: [
      {
        fields: {
          附件: [
            {
              file_token: fileToken,
            },
          ],
        },
      },
    ],
  };

  const textContent =
    ocrData?.content
      ?.map((item) => item.text || item.content || '')
      .filter(Boolean)
      .join('\n') || '';

  if (tableKey === 'honor') {
    basePayload.records[0].fields['奖项名称'] = fields.title || fileInfo.file_name;
    if (fields.awardDate) basePayload.records[0].fields['获奖时间'] = fields.awardDate;
  }

  if (tableKey === 'article') {
    basePayload.records[0].fields['文章标题'] = fields.title || fileInfo.file_name;
    if (textContent) {
      basePayload.records[0].fields['作者'] = fields.author || '';
    }
  }

  if (!basePayload.records[0].fields['备注']) {
    basePayload.records[0].fields['备注'] = textContent.slice(0, 4000);
  }

  return basePayload;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const parsed = await parseMultipart(event);
    if (!parsed.filename || !parsed.filename.toLowerCase().endsWith('.pdf')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: '只支持 PDF 文件上传' }),
      };
    }

    const token = await getTenantToken();
    const uploadInfo = await uploadFile(
      token,
      parsed.fileBuffer,
      parsed.filename,
      parsed.mimetype
    );

    const ocrResult = await runOCR(token, uploadInfo.file_token);
    const ocrText =
      ocrResult?.content
        ?.map((item) => item.text || item.content || '')
        .filter(Boolean)
        .join(' ') || '';

    const tableKey = classifyCategory(parsed.filename, ocrText);
    const tableMapping = getTableConfig();
    const tableId = tableMapping[tableKey];

    if (!tableId) {
      throw new Error(
        `未配置分类 ${tableKey} 对应的多维表格 table_id，请设置环境变量 FEISHU_TABLE_${tableKey.toUpperCase()}`
      );
    }

    const recordPayload = buildRecordPayload(
      tableKey,
      uploadInfo,
      ocrResult,
      parsed.fields
    );

    const { appToken } = getBitableBaseInfo();
    const { data: recordRes } = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
      recordPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (recordRes.code !== 0) {
      throw new Error(`写入多维表格失败: ${recordRes.msg || recordRes.code}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        category: tableKey,
        recordId: recordRes.data.records[0].record_id,
        fileToken: uploadInfo.file_token,
        fileName: uploadInfo.file_name,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || '上传失败',
      }),
    };
  }
};
