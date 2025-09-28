import express from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import cors from "cors";

const app = express();
const port = 5009;

app.use(
  cors({
    origin: "http://localhost:3009",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);


const upload = multer({ dest: "uploads/" });

// Single file route (kept for reference)
app.post("/convert", upload.single("image"), async (req, res) => {
  try {
    const { width, height, crop } = req.body;
    const inputPath = req.file.path;
    const outputPath = `converted/${Date.now()}.webp`;

    fs.mkdirSync("converted", { recursive: true });

    await sharp(inputPath)
      .resize({
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        fit: crop || "cover",
      })
      .webp({ quality: 90 })
      .toFile(outputPath);

    fs.unlinkSync(inputPath);

    res.json({ success: true, url: `http://localhost:${port}/${outputPath}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Conversion failed" });
  }
});

// ✅ Multi-file route
app.post("/convert-multi", upload.array("images"), async (req, res) => {
  try {
    const { width, height, crop } = req.body;
    const urls = [];

    fs.mkdirSync("converted", { recursive: true });

    for (const file of req.files) {
      const inputPath = file.path;
      const outputPath = `converted/${Date.now()}-${file.originalname}.webp`;

      await sharp(inputPath)
        .resize({
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null,
          fit: crop || "cover",
        })
        .webp({ quality: 90 })
        .toFile(outputPath);

      fs.unlinkSync(inputPath);

      urls.push(`http://localhost:${port}/${outputPath}`);
    }

    res.json({ success: true, urls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Multi conversion failed" });
  }
});

// 🧹 Clean converted folder
app.delete("/clean", (req, res) => {
  const dir = path.join(process.cwd(), "converted");

  if (!fs.existsSync(dir)) {
    return res.json({ success: true, message: "Nothing to clean" });
  }

  try {
    fs.readdirSync(dir).forEach((file) => {
      fs.unlinkSync(path.join(dir, file));
    });
    return res.json({ success: true, message: "Converted folder cleaned" });
  } catch (err) {
    console.error("Error cleaning folder:", err);
    return res.status(500).json({ success: false, error: "Failed to clean folder" });
  }
});


app.use("/converted", express.static(path.join(process.cwd(), "converted")));

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
