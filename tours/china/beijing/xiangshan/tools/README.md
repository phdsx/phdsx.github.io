# 可复现地理处理

运行项目本身不需要这些工具。仅在希望重新生成栅格和地图派生数据时：

```sh
python -m pip install -r requirements.txt
python fetch_geodata.py
python rebuild_geodata.py
```

下载的两个完整 DEM 瓦片约 100 MB，保存在 tools/sources，不必部署。脚本默认重用包内 OSM 快照，避免地图更新后结果漂移。原始栅格来源、CRS、变换和版本见 scene.json。不同 GDAL/PROJ 版本可能有很小的浮点差别。

该脚本会覆盖 assets/geo 的派生成果及 geographic-validation.json；修改前请保留备份。它不生成测量精度，不修复原始 DSM 的树冠影响。

浏览器 QA 脚本需要另外安装 playwright，且默认使用 Windows Edge 的常见安装路径；其他系统需修改 executable_path。先在根目录启动本地服务器，再运行 browser_check.py、acceptance_extra.py 和 v2_check.py。
