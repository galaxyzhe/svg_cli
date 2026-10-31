# CLI

- `CommandLineParser`：处理空白、双引号、转义、空行和注释，不访问领域对象。
- `CommandRegistry`：集中完成命令名到处理器的分派；编辑处理器构造应用层 Command。
- `CliContext`：保存当前文档、读写路径和 `CommandInvoker`。
- `OutputFormatter`：输出 tree、show 和 help。
- `CliSession`：执行一行并统一转换为 `error:` 输出。
- `Repl`：负责启动提示、`svg>` 提示符、逐行输入和 `exit`/`quit`。