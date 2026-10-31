# Infrastructure

- `SvgReader` 使用 `fast-xml-parser` 保序解析 XML，负责根画布信息、嵌套元素、自动 id 和 warning。
- `SvgWriter` 负责 XML 声明、SVG 根元素和文件内容输出，图形细节委托给 `Shape.toSvg()`。
- `SvgIoError` 统一表示文件读取、写入和 XML 输入错误。

不支持的 SVG 标签会交给 `ShapeFactory`，以 `unknown shape type` 明确拒绝；`box` 同样不会降级为普通 `g`。