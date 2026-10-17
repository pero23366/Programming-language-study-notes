[[csharp--造轮子]]
①
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>报错日志总结表</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
            font-family: "Microsoft YaHei", sans-serif;
            font-size: 14px;
            background-color: #f9f9f9;
        }
        th, td {
            border: 1px solid #333;
            padding: 8px 12px;
            vertical-align: top;
            text-align: left;
        }
        th {
            background-color: #e0e0e0;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        .highlight {
            background-color: #ffff99;
        }
    </style>
</head>
<body>
    <table>
        <thead>
            <tr>
                <th>序号</th>
                <th>你看到的症状 / 报错信息</th>
                <th>根本原因（人话版）</th>
                <th>解决办法（老兵操作）</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>1</strong></td>
                <td><strong>症状</strong>：按 <code>Ctrl+F5</code>，黑屏一片，没有任何输出，等你敲键盘才显示字符。</td>
                <td>代码<strong>绝对执行了</strong>！但 <code>Console.WriteLine</code> 打印的 <code>10</code> 在黑屏的<strong>第一行</strong>，你的眼睛却一直盯着<strong>第二行（光标位置）</strong>，产生了“它在等我输入”的幻觉。</td>
                <td>在输出语句上下加分隔线：<br><code>Console.WriteLine("=====");</code> + <code>Console.WriteLine(num1);</code> + <code>Console.WriteLine("=====");</code>，让数字被框起来，一眼就看到。</td>
            </tr>
            <tr>
                <td><strong>2</strong></td>
                <td><strong>报错</strong>：<code>CS5001</code> 程序不包含适合于入口点的静态“Main”方法。</td>
                <td><strong>情况A（语法）</strong>：你把 <code>Main</code> 写成了 <code>main</code>（小写），或者漏掉了 <code>static</code> 关键字。<br><strong>情况B（项目指向）</strong>：<span class="highlight">你虽然打开了 <code>03</code> 号文件，但 VS 默认的启动项目是 <code>01_Hello_World</code>，且 <code>01</code> 项目的 <code>Main</code> 被删了。</span></td>
                <td><strong>检查语法</strong>：确保是 <code>static void Main(string[] args)</code>（<code>M</code> 大写）。<br><strong>设置启动项</strong>：右键 <code>03</code> 号项目 → 设为启动项目（加粗字体）。</td>
            </tr>
            <tr>
                <td><strong>3</strong></td>
                <td><strong>报错指向</strong>：我明明在改 <code>03</code> 号文件的代码，报错却显示 <code>Program.cs</code> 或 <code>01_Hello_World</code> 出错。</td>
                <td><strong>解决方案（.sln）是整栋公寓楼</strong>。VS 编译时<strong>只看“启动项目（粗体字）”</strong>，不看你现在打开了哪个文件。你正站在 <code>03</code> 号房修水管，但总闸在 <code>01</code> 号房，结果 <code>01</code> 号房跳闸，全楼停电停工。</td>
                <td>在解决方案管理器里，<span class="highlight"><strong>右键点击你要跑的项目</strong> → 选择 <strong>“设为启动项目”</strong>。</span></td>
            </tr>
            <tr>
                <td><strong>4</strong></td>
                <td><strong>困惑</strong>：为什么 C 语言按 <code>Ctrl+F5</code> 就能跑当前文件，C# 这么麻烦？</td>
                <td><strong>C语言</strong>是“平房”，开哪个门就进哪个房。<br><strong>C#（VS）</strong>是“高档公寓”，必须由大堂经理（启动项目）指定默认开哪间房。</td>
                <td><strong>临时串门</strong>：在当前 <code>.cs</code> 代码区，<strong>右键 → 调试 → 启动新实例</strong>。这招无视启动项目，强制运行当前文件，完美还原 C 语言习惯！</td>
            </tr>
            <tr>
                <td><strong>5</strong></td>
                <td><strong>代码正确但无效</strong>：<code>Console.WriteLine($"{num1}");</code> 语法没问题，但就是没反应。</td>
                <td>排除上面第 1、3 条后，如果运行的是其他项目（比如带 <code>Console.ReadKey()</code> 的空项目），程序会直接卡在读取状态。</td>
                <td>检查当前运行的<strong>控制台窗口标题栏</strong>，看它跑的是哪个 <code>.exe</code> 路径。如果路径不对，就是启动项目没设对。</td>
            </tr>
        </tbody>
    </table>
</body>
</html>



②：
问题：在XAML上定义的代码，到.cs时候同步过期
```csharp
WPF 有一个很特殊的机制：**你的 XAML 和 C# 不是分别独立编译的，而是“纠缠”在一起的。**

1. 当你改完 `MainWindow.xaml`，Visual Studio 会在后台偷偷生成一个文件（`MainWindow.g.i.cs`），里面会把你 XAML 里的 `x:Name="ModelToggleButton"` 翻译成 C# 代码。
    
2. 但是，**这个后台生成有延迟**。有时候你改了 XAML、立刻去改 C#，C# 编译器先跑起来了，但它拿到的还是**旧的**生成文件（里面没有 `ModelToggleButton`）。
    
3. 于是它就大喊：“找不到 `ModelToggleButton`！”——**其实不是真的找不到，只是它拿到的信息是过期的。**
    

### 🛠 为什么“清理 + 重新生成”能解决？

- **清理**：把 `obj` 和 `bin` 文件夹里所有旧文件删掉（包括那个过期的生成文件）。
    
- **重新生成**：强迫 Visual Studio 从头开始，**先把 XAML 全部解析一遍**，再编译 C# 代码。
    

**一句话总结：清理重新生成，就是让 XAML 和 C# 的“时间线”重新对齐。**

### 💡 给你的经验总结（以后会经常用到）

以后如果在 WPF 里遇到**莫名其妙的报错**，尤其是这种“控件明明在 XAML 里，C# 却说找不到”的情况，不要慌，按这个顺序排查：

1. **先按 `Ctrl + Shift + S`** 全部保存（防止改了没存）。
    
2. **右键项目 → 清理**。
    
3. **右键项目 → 重新生成**。
    
4. 90% 的“幽灵报错”都会消失。
    

这个习惯不只是 WPF 里用得上，将来你用 [ASP.NET](https://asp.net/)、Unity、WinForms 也会遇到类似的“缓存过期”问题，**清理重新生成永远是你的第一招。**
```