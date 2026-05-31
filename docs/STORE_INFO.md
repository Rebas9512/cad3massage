# CAD3 Massage — Store Info（门店信息 / 开发引用源）

> 本文件是门店基础信息的 **single source of truth**，供前端（主页 Location & Hours、Footer、Contact、SEO 结构化数据）和后端（营业时间种子数据、时区）引用。资源图片同目录。最后更新：2026-05-30。

## 基本信息
| 项 | 值 |
|---|---|
| 店名 | **CAD3 Massage** |
| 地址 | **6505 W Park Blvd, Suite 160, Studio 116, Plano, TX 75093** |
| 所在建筑 | 位于 **IMAGE STUDIOS** 美容工作室综合楼内（Suite 160 → Studio 116） |
| 都会区 | Dallas–Fort Worth metro（Plano 属达拉斯都会区） |
| 时区 | **America/Chicago**（Central Time，自动含 CST/CDT） |
| 电话 | **(214) 415-9558** |
| 邮箱 | _待补_（发信将用 Resend，如 `noreply@cad3massage.com`） |
| 网站 | https://cad3massage.com |
| 社交媒体 | _待补_ |

### 地址分段（结构化数据 / 表单用）
```
street:   6505 W Park Blvd
unit:     Suite 160, Studio 116
city:     Plano
state:    TX
zip:      75093
country:  US
```
- Google Maps：搜索 `6505 W Park Blvd, Plano, TX 75093`
- 找店提示（写进主页"How to find us"）：进入 **IMAGE STUDIOS** 大楼后找 **Studio 116**。
- 周边地标：Total Wine & More、Chick-fil-A、Office Depot、Prestonwood Baptist Church (Plano Campus)。

## 营业时间（Hours of Operation）
> 当地时间（America/Chicago）。与后端 WorkingHours 种子数据一致。

| 星期 | 营业时间 | 24h |
|---|---|---|
| Sunday | 12:00 PM – 8:00 PM | 12:00–20:00 |
| Monday | 10:00 AM – 10:00 PM | 10:00–22:00 |
| Tuesday | 10:00 AM – 10:00 PM | 10:00–22:00 |
| Wednesday | 10:00 AM – 10:00 PM | 10:00–22:00 |
| Thursday | 10:00 AM – 10:00 PM | 10:00–22:00 |
| Friday | 10:00 AM – 10:00 PM | 10:00–22:00 |
| Saturday | 11:00 AM – 10:00 PM | 11:00–22:00 |

## 服务菜单
见同目录 **`menu.csv`**（single source of truth；Chair / Foot / Combo / Body 共 14 项上线；B4 双人四手与 H1 Head 为预留 `Active=false`，单技师阶段不对外）。规则详见 vault 文档 `Business Rules & Config`。

## 资源文件（本目录）
| 文件 | 用途 |
|---|---|
| `BldFront.jpg` | 店面/建筑外观照（IMAGE STUDIOS 楼） — 主页 Location/About |
| `Map.png` | 地图截图 — 主页 Location（正式上线建议用可交互地图或官方静态地图 API） |
| `menu.csv` | 服务菜单数据源 |

## 待补充
- [x] 电话：**(214) 415-9558**（tel: `+12144159558`）
- [ ] 对外邮箱、社交媒体链接
- [ ] 室内/服务照片（用于主页 Hero / About 画廊）
- [ ] Logo 与品牌色（见 vault `Open Questions` Q16）
