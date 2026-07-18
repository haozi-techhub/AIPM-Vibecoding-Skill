# Output schema

## 必需文件

- `jobs.jsonl`：一行一个去重后的完整岗位对象。
- `crawl-state.json`：断点、候选队列、请求日志、拒绝与去重记录。
- `jobs.csv`：适合直接筛选和导入表格软件的 UTF-8 BOM 文件。
- `.xlsx`：宿主具备可靠表格能力时生成。

## 岗位必需字段

- `id`
- `source`
- `sourceId`
- `title`
- `company`
- `city`
- `district`
- `salaryRaw`
- `salary.minimumK`
- `salary.maximumK`
- `salary.months`
- `experience`
- `degree`
- `description`
- `industries`
- `skills`
- `recruiter`
- `fetchedAt`
- `url`
- `alternateSources`
- `searchTerm`

## Excel 工作表

1. `分类汇总`：总数、来源、城市、证据等级、类别统计。
2. `岗位总表`：可筛选的结构化字段、来源 URL、搜索词和匹配证据。
3. `JD详情`：岗位 ID、职位、公司、完整 JD、来源 URL。
4. `运行说明`：输入、薪资口径、安全规则、运行时间、请求数、违规数和停止原因。

将数字、日期和薪资存为真实类型。长 JD 需要换行并限制 Excel 单元格最大长度；JSONL 保留未截断文本。
