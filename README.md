# 本地预览说明

如果 VS Code 的 Live Server 扩展没有正常显示或无法启动，你可以使用下面的方法在本地快速启动一个临时 HTTP 服务：

1) 使用 VS Code 任务（推荐）

- 打开命令面板（Ctrl+Shift+P），输入 `Tasks: Run Task`，选择 `Start HTTP server (5500)`。任务会在项目根目录启动一个 HTTP 服务并在端口 5500 提供文件。

2) 使用终端（需要 Python）

```powershell
Set-Location -Path "e:\.vsdode\.env\xuyingying"
# 启动服务器
python -m http.server 5500
# 在浏览器打开 http://127.0.0.1:5500
```

3) 使用 npm 的 http-server（如果安装了 Node/npm）

```powershell
Set-Location -Path "e:\.vsdode\.env\xuyingying"
npx http-server -p 5500
```

额外说明：如果你更喜欢使用 Live Server 扩展，可以在扩展管理器里确认它已安装并启用。我们已在 `.vscode/settings.json` 中添加了 Live Server 的默认端口（5500）和 host 设置，安装扩展后会自动读取这些设置。

如何安装并启用 Live Server（一键/手动两种方式）

1) 在 VS Code 中安装（图形界面）

- 打开扩展视图（Ctrl+Shift+X），搜索 `Live Server`（作者通常显示为 Ritwick Dey），点击“安装”，安装完成后点击“启用”，然后按 Ctrl+Shift+P 输入 `Developer: Reload Window` 重载窗口。

2) 在命令行一键安装（可选）

如果你安装了 VS Code 的命令行工具（`code`），可以在 PowerShell 中运行：

```powershell
code --install-extension ritwickde.live-server
```

安装完成后，重载 VS Code 窗口：

```powershell
# 在 VS Code 内按 Ctrl+Shift+P，然后输入并运行
Developer: Reload Window
```

3) 启用并测试

- 打开 `index.html`，保存文件（Ctrl+S），右下角应该出现 “Go Live” 按钮，或右键文件选择 “Open with Live Server”。
- 如果安装后仍然没有反应，请检查：
	- 工作区是否被“信任”（Workspace Trust），若未信任请点击界面上的提示并选择“信任此工作区”。
	- 查看 输出（View > Output）面板，右上角下拉选择 “Live Server” 并把日志内容发给我们以便进一步诊断。

## 流程图

```mermaid
flowchart TD
    A[开始预览项目] --> B{是否安装 VS Code 任务?}
    B -- 是 --> C[运行 Start HTTP server (5500)]
    B -- 否 --> D{是否安装 Python?}
    D -- 是 --> E[执行 python -m http.server 5500]
    D -- 否 --> F{是否安装 Node/npm?}
    F -- 是 --> G[执行 npx http-server -p 5500]
    F -- 否 --> H[安装任意静态服务器工具]
    C --> I[浏览器访问 http://127.0.0.1:5500]
    E --> I
    G --> I
    H --> I
    I --> J[完成]
```

## 飞书多维表格同步

项目新增了与飞书多维表格的联动：在“资料库同步（飞书）”标签里拖拽 PDF，即可自动上传、OCR 识别，并按类别写入对应表格，页面也会展示最新记录并提供下载按钮。部署前需要在 Netlify 配置以下环境变量：

- `FEISHU_APP_ID`、`FEISHU_APP_SECRET`：飞书自建应用凭据。
- `FEISHU_APP_TOKEN`：多维表格 Base（应用） token，可从链接 `https://<domain>.feishu.cn/base/<app_token>` 中获取。
- `FEISHU_DRIVE_FOLDER_TOKEN`：上传 PDF 时存放的飞书云盘文件夹 token，推荐预先创建一个专属文件夹。
- 表格映射：至少为每个启用的分类设置一个 table id，例如：
  - `FEISHU_TABLE_PERSONAL`
  - `FEISHU_TABLE_HONOR`
  - `FEISHU_TABLE_SOCIETY`
  - `FEISHU_TABLE_IP`
  - `FEISHU_TABLE_ARTICLE`
  - `FEISHU_TABLE_MATERIAL`
  - `FEISHU_TABLE_BOOK`
  - `FEISHU_TABLE_PROJECT`
  - `FEISHU_TABLE_SCIENCE`
  - `FEISHU_TABLE_TRIAL`

> table id 可通过接口 `GET /open-apis/bitable/v1/apps/{app_token}/tables` 获取，或在多维表格网页端通过“开发者工具→查看 API ID”复制。

上传流程：

1. 前端拖拽或点击上传按钮，向 `/api/feishu-upload` 发送 multipart 请求。
2. Netlify Function：
   - 使用凭据换取 `tenant_access_token`；
   - 调用云盘上传接口 `drive/v1/files/upload_all` 保存 PDF；
   - 触发 `ocr/v1/file/structure` 获取文本；
   - 根据关键字映射到对应分类，并调用 `bitable/v1/apps/.../records` 新增记录；
   - 返回记录 ID、附件 token 等信息。
3. 前端自动刷新 `/api/feishu-records` 的数据并渲染分类卡片；点击下载时会通过 `/api/feishu-download` 获取临时直链。

如果只想开启部分分类，仅需配置对应 `FEISHU_TABLE_*` 环境变量；未配置的分类页面会显示“暂无数据”。当 OCR 无法准确识别类别时，可进一步完善 `api/feishu-upload.js` 里的 `CATEGORY_MAPPINGS` 关键字映射。
