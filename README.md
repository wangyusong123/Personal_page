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
