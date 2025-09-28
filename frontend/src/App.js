import { useState, useCallback } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  Grid,
} from "@mui/material";

export default function App() {
  const [files, setFiles] = useState([]);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [crop, setCrop] = useState("cover");
  const [converted, setConverted] = useState([]); // [{ url, name }]

  // Dropzone handler
  const onDrop = useCallback((acceptedFiles) => {
    console.log("Dropped files:", acceptedFiles);
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    onDrop,
  });
  
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting conversion request with:", { files, width, height, crop });

    if (files.length === 0) {
      console.warn("No files selected for conversion");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    formData.append("width", width);
    formData.append("height", height);
    formData.append("crop", crop);

    try {
      const res = await axios.post("http://localhost:5009/convert-multi", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Server response:", res.data);

      if (res.data.urls) {
        // Pair each url with its original name
        const mapped = res.data.urls.map((url, idx) => ({
          url,
          name: files[idx].name.replace(/\.[^/.]+$/, "") + ".webp", // keep original base name
        }));
        setConverted(mapped);
      }
    } catch (err) {
      console.error("Conversion failed:", err);
    }
  };

  const handleDownload = async (url, filename) => {
    console.log("Downloading:", { url, filename });

    if (!url) {
      console.warn("No URL provided for download");
      return;
    }

    try {
      const response = await axios.get(url, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename || "converted.webp");
      document.body.appendChild(link);
      link.click();
      link.remove();

      console.log("Download triggered for", filename);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handleDownloadAll = async () => {
    console.log("Downloading all files...");
    for (const item of converted) {
      await handleDownload(item.url, item.name);
    }
    console.log("All downloads triggered");
  };

  const handleClean = async () => {
    await axios.delete("http://localhost:5009/clean");
    setConverted([]);
    alert("Converted folder cleaned!");
  };

  return (
    <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" gutterBottom>
        Image → WebP Converter (Multiple)
      </Typography>

      {/* Dropzone */}
      <Box
        {...getRootProps()}
        sx={{
          border: "2px dashed gray",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          bgcolor: isDragActive ? "grey.100" : "transparent",
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <Typography>Drop the files here ...</Typography>
        ) : (
          <Typography>
            Drag & drop images here, or click to select (multiple allowed)
          </Typography>
        )}
      </Box>

      {/* Previews before upload */}
      {files.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Files to convert</Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {files.map((f, idx) => (
                <Grid item key={idx}>
                  <img
                    src={URL.createObjectURL(f)}
                    alt="preview"
                    style={{ width: 100, height: "auto", borderRadius: 4 }}
                  />
                  <Typography variant="body2" noWrap>
                    {f.name}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card variant="outlined">
        <CardContent>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <TextField
              label="Width"
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              fullWidth
            />
            <TextField
              label="Height"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              fullWidth
            />

            <Select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              fullWidth
            >
              <MenuItem value="cover">cover</MenuItem>
              <MenuItem value="contain">contain</MenuItem>
              <MenuItem value="fill">fill</MenuItem>
              <MenuItem value="inside">inside</MenuItem>
              <MenuItem value="outside">outside</MenuItem>
            </Select>

            <Button type="submit" variant="contained" color="primary">
              Convert All to WebP
            </Button>

            {converted.length > 0 && (
              <Button
                variant="contained"
                color="success"
                onClick={handleDownloadAll}
              >
                Download All
              </Button>
            )}

            <Button
              variant="contained"
              color="error"
              onClick={handleClean}
            >
              Clean Converted Folder
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Converted results */}
      {converted.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Converted Images</Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {converted.map((item, idx) => (
                <Grid item key={idx}>
                  <Button
                    variant="outlined"
                    onClick={() => handleDownload(item.url, item.name)}
                  >
                    Download {item.name}
                  </Button>

                  <img
                    src={item.url}
                    alt="converted"
                    style={{ width: 120, borderRadius: 4, marginTop: 8 }}
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
