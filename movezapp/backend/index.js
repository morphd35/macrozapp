require("dotenv").config();

const express = require("express");
const cors = require("cors");
const api = require("./routes");

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(express.json());

// All API routes
app.use("/api", api);

const port = process.env.PORT || 5055;
app.listen(port, () => {
  console.log(`MoveZapp backend listening on http://localhost:${port}`);
});