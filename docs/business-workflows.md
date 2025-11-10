# SAMS 业务流程图

本文档使用 Mermaid 图表描述测序申请管理系统的核心业务流程。

## 1. 用户注册与登录流程

```mermaid
flowchart TD
    Start([用户访问系统]) --> CheckAuth{已登录?}
    CheckAuth -->|是| Dashboard[进入控制面板]
    CheckAuth -->|否| LoginOrSignup{选择操作}
    
    LoginOrSignup -->|登录| LoginForm[填写登录表单]
    LoginOrSignup -->|注册| SignupForm[填写注册表单]
    
    SignupForm --> ValidateSignup{验证注册信息}
    ValidateSignup -->|失败| SignupError[显示错误信息]
    SignupError --> SignupForm
    ValidateSignup -->|成功| CreateUser[创建用户账户]
    CreateUser --> SendVerification[发送验证邮件]
    SendVerification --> LoginForm
    
    LoginForm --> ValidateLogin{验证凭证}
    ValidateLogin -->|失败| LoginError[显示错误信息]
    LoginError --> LoginForm
    ValidateLogin -->|成功| GenerateTokens[生成JWT令牌]
    GenerateTokens --> SetSession[设置会话Cookie]
    SetSession --> Dashboard
    
    Dashboard --> UserActions[用户操作]
    
    style Start fill:#e1f5ff
    style Dashboard fill:#c8e6c9
    style CreateUser fill:#fff9c4
    style GenerateTokens fill:#fff9c4
```

## 2. 测序申请完整流程

```mermaid
flowchart TD
    Start([申请人发起申请]) --> CheckRole{验证用户角色}
    CheckRole -->|无权限| AccessDenied[拒绝访问]
    CheckRole -->|有权限| FillForm[填写申请表单]
    
    FillForm --> InputBasicInfo[基本信息<br/>项目名称、申请人]
    InputBasicInfo --> InputSampleInfo[样品信息<br/>样品数量、类型]
    InputSampleInfo --> InputSeqParams[测序参数<br/>平台、策略、深度]
    InputSeqParams --> AddAttachments[上传附件<br/>实验方案等]
    
    AddAttachments --> ValidateForm{表单验证}
    ValidateForm -->|失败| ShowErrors[显示验证错误]
    ShowErrors --> FillForm
    
    ValidateForm -->|成功| SubmitApp[提交申请]
    SubmitApp --> SaveToDB[(保存到数据库)]
    SaveToDB --> NotifyManager[通知实验室管理员]
    NotifyManager --> StatusPending[状态: 待审核]
    
    StatusPending --> ManagerReview{管理员审核}
    ManagerReview -->|拒绝| RejectApp[拒绝申请]
    RejectApp --> NotifyResearcher1[通知申请人]
    NotifyResearcher1 --> CanRevise{允许修改?}
    CanRevise -->|是| FillForm
    CanRevise -->|否| EndRejected([申请结束])
    
    ManagerReview -->|批准| ApproveApp[批准申请]
    ApproveApp --> StatusApproved[状态: 已批准]
    StatusApproved --> NotifyTech[通知技术员]
    NotifyTech --> AssignTech[分配技术员]
    
    AssignTech --> TechReceive[技术员接收任务]
    TechReceive --> StatusProcessing[状态: 处理中]
    StatusProcessing --> RegisterSamples[登记样品]
    
    RegisterSamples --> GenerateBarcode[生成样品条码]
    GenerateBarcode --> QualityCheck{样品质检}
    QualityCheck -->|不合格| NotifyQCFail[通知质检失败]
    NotifyQCFail --> ContactResearcher[联系申请人]
    ContactResearcher --> ResendSample{重新送样?}
    ResendSample -->|是| RegisterSamples
    ResendSample -->|否| EndQCFailed([申请结束])
    
    QualityCheck -->|合格| UpdateQCPass[更新质检通过]
    UpdateQCPass --> LibraryPrep[文库制备]
    LibraryPrep --> Sequencing[上机测序]
    Sequencing --> DataAnalysis[数据分析]
    DataAnalysis --> StatusCompleted[状态: 已完成]
    
    StatusCompleted --> GenerateReport[生成测序报告]
    GenerateReport --> NotifyResearcher2[通知申请人]
    NotifyResearcher2 --> DeliverResults[交付结果]
    DeliverResults --> EndSuccess([申请完成])
    
    style Start fill:#e1f5ff
    style EndSuccess fill:#c8e6c9
    style EndRejected fill:#ffcdd2
    style EndQCFailed fill:#ffcdd2
    style SaveToDB fill:#fff9c4
    style Sequencing fill:#b3e5fc
```

## 3. 样品管理流程

```mermaid
flowchart TD
    Start([技术员登录系统]) --> ViewPending[查看待处理申请]
    ViewPending --> SelectApp[选择申请]
    SelectApp --> ViewSamples[查看样品列表]
    
    ViewSamples --> ReceiveSamples[接收实体样品]
    ReceiveSamples --> VerifyCount{核对数量}
    VerifyCount -->|不符| ReportIssue[报告问题]
    ReportIssue --> ContactPI[联系申请人]
    ContactPI --> ResolveIssue{问题解决?}
    ResolveIssue -->|否| Reject[拒绝样品]
    Reject --> End1([结束])
    ResolveIssue -->|是| VerifyCount
    
    VerifyCount -->|相符| RegisterSample[登记样品信息]
    RegisterSample --> InputSampleID[输入样品编号]
    InputSampleID --> GenerateBarcode[生成条码标签]
    GenerateBarcode --> PrintBarcode[打印条码]
    PrintBarcode --> AttachBarcode[贴附条码]
    
    AttachBarcode --> QCTest[进行质检]
    QCTest --> MeasureConc[测定浓度]
    MeasureConc --> MeasureVolume[测定体积]
    MeasureVolume --> CheckIntegrity[检查完整性]
    
    CheckIntegrity --> RecordQC[记录质检结果]
    RecordQC --> QCResult{质检结果}
    
    QCResult -->|不合格| UpdateStatusFailed[更新状态: 质检失败]
    UpdateStatusFailed --> NotifyFailure[通知申请人]
    NotifyFailure --> WaitAction{等待处理}
    WaitAction -->|重新送样| ReceiveSamples
    WaitAction -->|放弃| End2([结束])
    
    QCResult -->|合格| UpdateStatusPass[更新状态: 质检通过]
    UpdateStatusPass --> StoreSample[样品入库]
    StoreSample --> RecordLocation[记录存储位置]
    RecordLocation --> UpdateInventory[(更新库存系统)]
    
    UpdateInventory --> WaitLibPrep[等待文库制备]
    WaitLibPrep --> RetrieveSample[取出样品]
    RetrieveSample --> LibraryPrep[文库制备]
    LibraryPrep --> LibQC[文库质检]
    
    LibQC --> LibResult{文库质检}
    LibResult -->|不合格| RetryLib{可重做?}
    RetryLib -->|是| LibraryPrep
    RetryLib -->|否| NotifyLibFail[通知文库失败]
    NotifyLibFail --> End3([结束])
    
    LibResult -->|合格| PoolSamples[样品混池]
    PoolSamples --> LoadSequencer[上机测序]
    LoadSequencer --> UpdateStatusSeq[状态: 测序中]
    UpdateStatusSeq --> MonitorRun[监控测序运行]
    MonitorRun --> SeqComplete{测序完成?}
    
    SeqComplete -->|失败| CheckRetry{可重测?}
    CheckRetry -->|是| LoadSequencer
    CheckRetry -->|否| NotifySeqFail[通知测序失败]
    NotifySeqFail --> End4([结束])
    
    SeqComplete -->|成功| UpdateStatusDone[状态: 测序完成]
    UpdateStatusDone --> ArchiveSample[样品归档]
    ArchiveSample --> EndSuccess([流程完成])
    
    style Start fill:#e1f5ff
    style EndSuccess fill:#c8e6c9
    style End1 fill:#ffcdd2
    style End2 fill:#ffcdd2
    style End3 fill:#ffcdd2
    style End4 fill:#ffcdd2
    style UpdateInventory fill:#fff9c4
    style LoadSequencer fill:#b3e5fc
```

## 4. 权限管理流程

```mermaid
flowchart TD
    Start([用户请求操作]) --> ExtractToken[提取JWT令牌]
    ExtractToken --> TokenExists{令牌存在?}
    
    TokenExists -->|否| Return401[返回401未授权]
    Return401 --> RedirectLogin[重定向到登录]
    RedirectLogin --> End1([结束])
    
    TokenExists -->|是| VerifyToken{验证令牌}
    VerifyToken -->|无效| TokenError{错误类型}
    TokenError -->|过期| CheckRefresh{有刷新令牌?}
    CheckRefresh -->|是| RefreshToken[刷新访问令牌]
    RefreshToken --> IssueNewToken[颁发新令牌]
    IssueNewToken --> VerifyToken
    CheckRefresh -->|否| Return401
    
    TokenError -->|签名错误| Return401
    TokenError -->|格式错误| Return401
    
    VerifyToken -->|有效| ExtractUser[提取用户信息]
    ExtractUser --> LoadPermissions[(加载用户权限)]
    LoadPermissions --> CheckResource{检查资源权限}
    
    CheckResource --> ResourceType{资源类型}
    
    ResourceType -->|测序申请| CheckAppPermission{权限判断}
    CheckAppPermission -->|创建| HasResearcher{是申请人+?}
    HasResearcher -->|是| Allow1[允许操作]
    HasResearcher -->|否| Deny1[拒绝访问]
    
    CheckAppPermission -->|审核| HasManager{是管理员+?}
    HasManager -->|是| Allow2[允许操作]
    HasManager -->|否| Deny2[拒绝访问]
    
    CheckAppPermission -->|查看| CheckOwner{是所有者?}
    CheckOwner -->|是| Allow3[允许操作]
    CheckOwner -->|否| HasRole{有查看权限?}
    HasRole -->|是| Allow4[允许操作]
    HasRole -->|否| Deny3[拒绝访问]
    
    ResourceType -->|样品管理| CheckSamplePerm{权限判断}
    CheckSamplePerm -->|登记| HasTech{是技术员+?}
    HasTech -->|是| Allow5[允许操作]
    HasTech -->|否| Deny4[拒绝访问]
    
    CheckSamplePerm -->|质检| HasTechOrManager{技术员或管理员?}
    HasTechOrManager -->|是| Allow6[允许操作]
    HasTechOrManager -->|否| Deny5[拒绝访问]
    
    ResourceType -->|系统管理| CheckAdmin{是管理员?}
    CheckAdmin -->|是| Allow7[允许操作]
    CheckAdmin -->|否| Deny6[拒绝访问]
    
    Allow1 --> ExecuteAction[执行操作]
    Allow2 --> ExecuteAction
    Allow3 --> ExecuteAction
    Allow4 --> ExecuteAction
    Allow5 --> ExecuteAction
    Allow6 --> ExecuteAction
    Allow7 --> ExecuteAction
    
    ExecuteAction --> LogAction[(记录审计日志)]
    LogAction --> Return200[返回200成功]
    Return200 --> End2([结束])
    
    Deny1 --> Return403[返回403禁止]
    Deny2 --> Return403
    Deny3 --> Return403
    Deny4 --> Return403
    Deny5 --> Return403
    Deny6 --> Return403
    Return403 --> LogDenied[(记录拒绝日志)]
    LogDenied --> End3([结束])
    
    style Start fill:#e1f5ff
    style End2 fill:#c8e6c9
    style End1 fill:#ffcdd2
    style End3 fill:#ffcdd2
    style ExecuteAction fill:#fff9c4
    style LogAction fill:#fff9c4
    style LoadPermissions fill:#fff9c4
```

## 5. 数据导出与报告流程

```mermaid
flowchart TD
    Start([用户请求导出]) --> SelectType{选择导出类型}
    
    SelectType -->|申请列表| QueryApps[(查询申请数据)]
    SelectType -->|样品列表| QuerySamples[(查询样品数据)]
    SelectType -->|统计报告| QueryStats[(查询统计数据)]
    
    QueryApps --> FilterApps[应用过滤条件]
    FilterApps --> AppDateRange[日期范围]
    AppDateRange --> AppStatus[申请状态]
    AppStatus --> AppUser[申请人]
    AppUser --> LoadAppData[(加载申请数据)]
    
    QuerySamples --> FilterSamples[应用过滤条件]
    FilterSamples --> SampleDateRange[日期范围]
    SampleDateRange --> SampleStatus[样品状态]
    SampleStatus --> SampleQC[质检结果]
    SampleQC --> LoadSampleData[(加载样品数据)]
    
    QueryStats --> SelectPeriod[选择统计周期]
    SelectPeriod --> SelectMetrics[选择指标]
    SelectMetrics --> CalcStats[计算统计数据]
    CalcStats --> LoadStatsData[(加载统计数据)]
    
    LoadAppData --> FormatData[格式化数据]
    LoadSampleData --> FormatData
    LoadStatsData --> FormatData
    
    FormatData --> SelectFormat{选择导出格式}
    
    SelectFormat -->|Excel| GenerateExcel[生成Excel文件]
    GenerateExcel --> ExcelHeaders[创建表头]
    ExcelHeaders --> ExcelRows[填充数据行]
    ExcelRows --> ExcelStyle[应用样式]
    ExcelStyle --> ExcelFile[生成.xlsx文件]
    
    SelectFormat -->|CSV| GenerateCSV[生成CSV文件]
    GenerateCSV --> CSVHeaders[写入表头]
    CSVHeaders --> CSVRows[写入数据行]
    CSVRows --> CSVFile[生成.csv文件]
    
    SelectFormat -->|PDF| GeneratePDF[生成PDF报告]
    GeneratePDF --> PDFLayout[设计布局]
    PDFLayout --> PDFContent[填充内容]
    PDFContent --> PDFCharts[添加图表]
    PDFCharts --> PDFFile[生成.pdf文件]
    
    ExcelFile --> SaveFile[保存文件]
    CSVFile --> SaveFile
    PDFFile --> SaveFile
    
    SaveFile --> GenerateURL[生成下载链接]
    GenerateURL --> SendResponse[发送响应]
    SendResponse --> UserDownload[用户下载文件]
    
    UserDownload --> LogExport[(记录导出日志)]
    LogExport --> CleanupTemp[清理临时文件]
    CleanupTemp --> End([导出完成])
    
    style Start fill:#e1f5ff
    style End fill:#c8e6c9
    style LoadAppData fill:#fff9c4
    style LoadSampleData fill:#fff9c4
    style LoadStatsData fill:#fff9c4
    style LogExport fill:#fff9c4
    style GenerateExcel fill:#b3e5fc
    style GeneratePDF fill:#b3e5fc
```

## 6. 系统监控与审计流程

```mermaid
flowchart TD
    Start([系统运行]) --> MonitorHealth[健康检查]
    MonitorHealth --> CheckDB{数据库连接}
    CheckDB -->|失败| AlertDB[发送数据库告警]
    AlertDB --> LogDBError[(记录错误日志)]
    LogDBError --> RetryDB{重试连接}
    RetryDB -->|失败| NotifyAdmin[通知管理员]
    NotifyAdmin --> ManualFix[人工修复]
    RetryDB -->|成功| MonitorHealth
    
    CheckDB -->|成功| CheckMemory{内存使用}
    CheckMemory -->|>80%| AlertMemory[内存告警]
    AlertMemory --> LogMemoryWarn[(记录警告)]
    LogMemoryWarn --> CheckMemory
    
    CheckMemory -->|正常| CheckDisk{磁盘空间}
    CheckDisk -->|<20%| AlertDisk[磁盘告警]
    AlertDisk --> LogDiskWarn[(记录警告)]
    LogDiskWarn --> CheckDisk
    
    CheckDisk -->|正常| MonitorRequests[监控请求]
    MonitorRequests --> TrackResponse[响应时间]
    TrackResponse --> SlowQuery{慢查询检测}
    SlowQuery -->|>3秒| LogSlowQuery[(记录慢查询)]
    LogSlowQuery --> AnalyzeQuery[分析查询]
    AnalyzeQuery --> OptimizeDB[优化数据库]
    
    SlowQuery -->|正常| MonitorErrors[错误监控]
    MonitorErrors --> CaptureError[捕获异常]
    CaptureError --> ClassifyError{错误分类}
    
    ClassifyError -->|4xx| ClientError[客户端错误]
    ClientError --> LogClientError[(记录客户端错误)]
    
    ClassifyError -->|5xx| ServerError[服务器错误]
    ServerError --> LogServerError[(记录服务器错误)]
    LogServerError --> AlertCritical{严重错误?}
    AlertCritical -->|是| SendAlert[发送告警]
    SendAlert --> EscalateIssue[升级问题]
    
    AlertCritical -->|否| MonitorErrors
    LogClientError --> MonitorErrors
    
    MonitorErrors --> AuditLog[审计日志]
    AuditLog --> TrackUserAction[跟踪用户操作]
    TrackUserAction --> RecordAction[(记录操作)]
    RecordAction --> ActionType{操作类型}
    
    ActionType -->|登录| LogLogin[(记录登录)]
    ActionType -->|数据修改| LogModify[(记录修改)]
    ActionType -->|权限变更| LogPermission[(记录权限)]
    ActionType -->|导出数据| LogExport[(记录导出)]
    
    LogLogin --> AnalyzePattern[分析行为模式]
    LogModify --> AnalyzePattern
    LogPermission --> AnalyzePattern
    LogExport --> AnalyzePattern
    
    AnalyzePattern --> DetectAnomaly{异常检测}
    DetectAnomaly -->|异常| SecurityAlert[安全告警]
    SecurityAlert --> BlockUser[阻止用户]
    BlockUser --> InvestigateSecurity[安全调查]
    
    DetectAnomaly -->|正常| GenerateReport[生成报告]
    InvestigateSecurity --> GenerateReport
    
    GenerateReport --> DailyReport[每日报告]
    DailyReport --> WeeklyReport[周报]
    WeeklyReport --> MonthlyReport[月报]
    MonthlyReport --> ArchiveReport[(归档报告)]
    
    ArchiveReport --> MonitorHealth
    
    style Start fill:#e1f5ff
    style MonitorHealth fill:#fff9c4
    style LogDBError fill:#ffcdd2
    style LogServerError fill:#ffcdd2
    style SecurityAlert fill:#ff9800
    style RecordAction fill:#c8e6c9
    style ArchiveReport fill:#c8e6c9
```

## 7. 角色与权限矩阵

```mermaid
graph TB
    subgraph Roles["用户角色"]
        R1[申请人<br/>Researcher]
        R2[技术员<br/>Technician]
        R3[实验室管理员<br/>Lab Manager]
        R4[系统管理员<br/>Admin]
    end
    
    subgraph AppPerms["申请管理权限"]
        A1[创建申请]
        A2[查看自己的申请]
        A3[查看所有申请]
        A4[审核申请]
        A5[删除申请]
    end
    
    subgraph SamplePerms["样品管理权限"]
        S1[登记样品]
        S2[质检样品]
        S3[更新状态]
        S4[查看样品]
        S5[删除样品]
    end
    
    subgraph SysPerms["系统管理权限"]
        Y1[用户管理]
        Y2[权限配置]
        Y3[系统设置]
        Y4[查看审计日志]
        Y5[导出数据]
    end
    
    R1 --> A1
    R1 --> A2
    
    R2 --> S1
    R2 --> S2
    R2 --> S3
    R2 --> S4
    R2 --> A2
    
    R3 --> A3
    R3 --> A4
    R3 --> S4
    R3 --> Y4
    R3 --> Y5
    
    R4 --> A5
    R4 --> S5
    R4 --> Y1
    R4 --> Y2
    R4 --> Y3
    R4 --> Y4
    R4 --> Y5
    
    style R1 fill:#e3f2fd
    style R2 fill:#f3e5f5
    style R3 fill:#fff3e0
    style R4 fill:#ffebee
```

---

## 流程图使用说明

### 查看方式

1. **GitHub**: GitHub 原生支持 Mermaid 图表渲染
2. **VS Code**: 安装 "Markdown Preview Mermaid Support" 插件
3. **在线工具**: https://mermaid.live/ 在线编辑器

### 图表类型说明

- **flowchart**: 流程图，展示步骤和决策
- **graph**: 关系图，展示权限和角色关系
- **圆角矩形** `([文字])`: 开始/结束节点
- **菱形** `{文字}`: 决策节点
- **矩形** `[文字]`: 处理步骤
- **圆柱** `[(文字)]`: 数据库操作

### 颜色编码

- 🔵 蓝色 (#e1f5ff): 流程起点
- 🟢 绿色 (#c8e6c9): 成功结束
- 🔴 红色 (#ffcdd2): 失败/错误结束
- 🟡 黄色 (#fff9c4): 数据库/关键操作
- 🔷 浅蓝 (#b3e5fc): 特殊处理步骤

---

**文档版本**: 1.0\
**创建日期**: 2025年11月10日\
**维护团队**: SAMS 开发团队\
**更新记录**: 初始版本，包含7个核心业务流程图
