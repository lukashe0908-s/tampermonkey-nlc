const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = 31561;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Api-Token");
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.post("/api/v1/tasks", async (req, res) => {
  const {
    req: { url, extra: { header = {} } = {} },
    opt: { name, path: folderPath = "./downloads", extra = {} } = {},
  } = req.body;

  if (!url || !name) {
    return res.status(400).json({ code: "缺少 url 或文件名 name" });
  }

  try {
    // 确保文件夹存在
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, name);
    console.log(url, header);
    res.json({ code: 0, file: filePath });

    const response = await axios.get(url, {
      headers: header,
      responseType: "stream",
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log(`✅ 下载完成：${filePath}`);
      // res.json({ code: 0, file: filePath });
    });

    writer.on("error", (err) => {
      console.error(`❌ 写入文件失败: ${err.message}`);
      // res.status(500).json({ code: "文件保存失败" });
    });
  } catch (err) {
    console.error(`❌ 下载失败: ${err.message}`);
    // res.status(500).json({ code: "下载失败", msg: err.message });
  }
});
app.use((req, res, next) => {
  res.json({});
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`🚀 服务监听在 http://127.0.0.1:${PORT}/api/v1/tasks`);
});
