
<table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
  <tr style="background-color: #f0f0f0;">
    <th style="border: 1px solid black; text-align: left;">对比维度</th>
    <th style="border: 1px solid black; text-align: left;"><code>int.Parse()</code> (莽夫型)</th>
    <th style="border: 1px solid black; text-align: left;"><code>int.TryParse()</code> (谨慎型)</th>
  </tr>
  <tr>
    <td style="border: 1px solid black;"><strong>你的直观写法</strong></td>
    <td style="border: 1px solid black;"><code>int num = int.Parse(input);</code></td>
    <td style="border: 1px solid black;"><code>if (int.TryParse(input, out int num)) { ... }</code></td>
  </tr>
  <tr>
    <td style="border: 1px solid black;"><strong>用户输 "123" (合法)</strong></td>
    <td style="border: 1px solid black;">成功！<code>num</code> 变成 123</td>
    <td style="border: 1px solid black;">成功！<code>num</code> 变成 123，<code>if</code> 进去执行</td>
  </tr>
  <tr>
    <td style="border: 1px solid black;"><strong>用户输 "abc" (非法)</strong></td>
    <td style="border: 1px solid black; color: red;"><strong>程序当场崩溃（异常）</strong></td>
    <td style="border: 1px solid black;">返回 <code>false</code>，<code>num</code> 变成 0，程序继续跑</td>
  </tr>
  <tr>
    <td style="border: 1px solid black;"><strong>C 语言老兵秒懂</strong></td>
    <td style="border: 1px solid black;">像 <code>scanf("%d", &amp;num)</code>（不检查返回值）</td>
    <td style="border: 1px solid black;">像 <code>if(scanf("%d", &amp;num) == 1)</code>（检查了返回值）</td>
  </tr>
  <tr>
    <td style="border: 1px solid black;"><strong>什么时候用？</strong></td>
    <td style="border: 1px solid black;">数据来源绝对可信（如读取配置文件）</td>
    <td style="border: 1px solid black;"><strong>用户键盘输入、外部文件等不可预测来源</strong></td>
  </tr>
</table>