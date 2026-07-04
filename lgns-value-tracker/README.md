# LGNS 实时资产价值追踪网站

一个纯前端静态网站：

- 自动获取 LGNS / USD 实时价格
- 输入持币量
- 自动计算总价值
- 绘制实时价值曲线
- 持币量和曲线保存在浏览器 localStorage

## 访问地址

```text
https://chengchaoccss.github.io/lgns-value-tracker/
```

## 数据源

CoinGecko Simple Price API：

```text
https://api.coingecko.com/api/v3/simple/price?ids=origin-lgns&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true
```

## 修改刷新频率

打开 `app.js`，修改：

```js
const REFRESH_MS = 30_000;
```
