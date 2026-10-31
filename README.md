# SVG CLI

一个使用 TypeScript 编写的交互式 SVG 编辑器命令行工具。它把 SVG 文档建模为可组合的图形树，支持创建、编辑、分组、读写 SVG，以及 undo/redo。

本项目适合希望用命令行快速生成或修改简单 SVG、学习 TypeScript 面向对象设计，或了解 Command / Composite / Factory 模式落地方式的读者。

## 特性

- 交互式 REPL，提示符为 `svg>`，支持注释和命令脚本回放。
- 内置 `rect`、`circle`、`ellipse`、`line`、`text`、`g` 六种 SVG 类型。
- 使用 `id` 定位图形，支持嵌套分组和统一的 move / scale 操作。
- 支持 `group`、`ungroup`、`addto`、前后层级调整和删除。
- 编辑操作支持 undo / redo；读写文档或修改画布后会锁定旧历史。
- 通过 `fast-xml-parser` 读写 SVG XML，保留嵌套顺序并处理 XML 转义。
- 严格 TypeScript 类型检查，包含领域、应用层、基础设施和 CLI 测试。

## 快速开始

### 环境要求

- Node.js 24 或兼容的现代 Node.js 版本
- npm

### 安装

```bash
git clone https://github.com/galaxyzhe/svg_cli.git
cd svg_cli
npm install
```

### 启动 CLI

```bash
npm.cmd run cli
```

启动后输入 `help` 查看完整命令，输入 `quit` 或 `exit` 退出。

### 第一个 SVG

在 CLI 中依次输入：

```text
init 400 200
create rect start 30 70 120 60 "#4a90d9"
create circle center 200 100 30 "#50b87a"
create text title 20 30 "SVG CLI"
group diagram start center title
tree
save demo.svg
quit
```

生成的 `demo.svg` 是普通 SVG 文件，可以直接用浏览器、图片查看器或 VS Code 的 SVG 预览扩展打开。

也可以从命令行管道执行一组命令：

```bash
printf 'init 400 200\ncreate rect box 20 20 100 60 blue\nsave demo.svg\nquit\n' | npm run cli
```

Windows PowerShell 中也可以使用：

```powershell
@('init 400 200', 'create rect box 20 20 100 60 blue', 'save demo.svg', 'quit') | npm.cmd run cli
```

## 命令速查

### 文档与画布

| 命令 | 作用 |
| --- | --- |
| `init [w] [h]` | 新建画布，默认 `800 x 600` |
| `read <file.svg>` | 读取 SVG 文件 |
| `save [file.svg]` | 保存当前 SVG；省略路径时使用当前文件路径 |
| `canvas [w] [h]` | 查看或修改画布尺寸 |

### 图形编辑

| 命令 | 作用 |
| --- | --- |
| `create rect <id> <x> <y> <w> <h> [fill]` | 创建矩形 |
| `create circle <id> <cx> <cy> <r> [fill]` | 创建圆形 |
| `create ellipse <id> <cx> <cy> <rx> <ry> [fill]` | 创建椭圆 |
| `create line <id> <x1> <y1> <x2> <y2> [stroke]` | 创建直线 |
| `create text <id> <x> <y> "content"` | 创建文字 |
| `create g <id>` | 创建空分组 |
| `delete <id>` | 删除图形或整个分组 |
| `move <id> <dx> <dy>` | 平移图形 |
| `scale <id> <factor>` | 等比缩放图形 |
| `set <id> <attr> <value>` | 设置允许的属性 |
| `group <gid> <id1> <id2>...` | 将已有图形收入新分组 |
| `ungroup <gid>` | 解散分组 |
| `addto <gid> <id>` | 将图形移入已有分组 |
| `front <id>` / `back <id>` | 调整图形前后层级 |

创建图形时也可以直接指定容器：

```text
create g layer
create rect card 20 20 120 80 orange in layer
```

### 查看与历史

| 命令 | 作用 |
| --- | --- |
| `tree [id]` | 查看文档树 |
| `show <id>` | 查看图形详情 |
| `undo` / `redo` | 撤销或重做编辑 |
| `help` | 查看帮助 |
| `exit` / `quit` | 退出 CLI |

命令失败时会输出 `error:`，并保持文档状态不变。图形 `id` 必须全局唯一且大小写敏感。

## 开发

安装依赖后，可以使用以下脚本：

```bash
npm run dev       # 使用 tsx 启动开发 CLI
npm run cli       # 启动 CLI
npm test          # 运行全部测试
npm run typecheck # 仅执行 TypeScript 类型检查
npm run build     # 编译到 dist/
```

当前测试覆盖领域模型、Command 与 undo/redo、SVG 读写、CLI 会话和阶段验收，共 40 个测试。

## 项目结构

```text
src/
  cli/              命令行解析、REPL、会话和命令注册
  application/      Command、Invoker、UndoManager 和编辑命令
  domain/           SVG 文档、Shape 层次、分组和 ShapeFactory
  infrastructure/   SVG Reader/Writer 与文件系统适配
  main.ts           CLI 入口
tests/               单元测试、集成测试和验收测试
doc/README.md        实验要求对应的架构、过程和质量保证文档
```

核心设计模式包括：

- **Command**：将编辑操作封装为可执行、可撤销的对象。
- **Composite**：让叶子图形与 `g` 分组共享 move、scale、序列化等操作。
- **Factory**：由 `ShapeFactory` 集中完成 SVG 类型到具体图形类的创建。

详细的模块边界、依赖方向、设计决策、验收矩阵和过程记录见 [`doc/README.md`](doc/README.md)。
