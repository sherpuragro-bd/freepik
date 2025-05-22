import express from "express";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

puppeteerExtra.use(StealthPlugin());

const COOKIES_PATH = path.resolve("./cookies.json");

function sanitizeCookies(cookies) {
  return cookies.map((cookie) => {
    const sanitized = {};
    if (typeof cookie.name === "string") sanitized.name = cookie.name;
    if (typeof cookie.value === "string") sanitized.value = cookie.value;
    if (typeof cookie.domain === "string") sanitized.domain = cookie.domain;
    if (typeof cookie.path === "string") sanitized.path = cookie.path;
    if (typeof cookie.httpOnly === "boolean")
      sanitized.httpOnly = cookie.httpOnly;
    if (typeof cookie.secure === "boolean") sanitized.secure = cookie.secure;
    if (["Strict", "Lax", "None"].includes(cookie.sameSite))
      sanitized.sameSite = cookie.sameSite;
    if (typeof cookie.expires === "number" && cookie.expires > 0)
      sanitized.expires = cookie.expires;
    return sanitized;
  });
}

function readCookiesFromFile() {
  try {
    if (fs.existsSync(COOKIES_PATH)) {
      const data = fs.readFileSync(COOKIES_PATH, "utf-8");
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    return [];
  }
}

function writeCookiesToFile(cookies) {
  try {
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2), "utf-8");
    return;
  } catch (err) {
    return;
  }
}

async function getDownloadResponseUrl(freepikUrl, cookies) {
  const browser = await puppeteerExtra.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1280, height: 800 });

  if (cookies.length > 0) {
    await page.setCookie(...sanitizeCookies(cookies));
  }

  await page.goto(freepikUrl, { waitUntil: "networkidle2" });

  return new Promise(async (resolve, reject) => {
    let matched = false;

    page.on("response", async (response) => {
      const url = response.url();
      const headers = response.headers();

      if (
        !matched &&
        (url.includes("download?resource") || url.includes("download?walletId"))
      ) {
        matched = true;
        await browser.close();

        resolve({
          url,
          contentType: headers["content-type"],
        });
      }
    });

    try {
      await page.waitForSelector('button[data-cy="download-button"]', {
        visible: true,
        timeout: 10000,
      });

      await page.evaluate(() => {
        const btn = document.querySelector('button[data-cy="download-button"]');
        if (btn) btn.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      await page.click('button[data-cy="download-button"]');
    } catch (err) {
      await browser.close();
      reject({ error: "Failed to find or click download button" });
    }

    setTimeout(async () => {
      if (!matched) {
        await browser.close();
        reject({ error: "Download URL not found" });
      }
    }, 15000);
  });
}

// 🔁 Refresh cookies every 10 minutes
setInterval(async () => {
  const cookies = readCookiesFromFile();
  const browser = await puppeteerExtra.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1280, height: 800 });

    if (cookies.length > 0) {
      await page.setCookie(...sanitizeCookies(cookies));
    }

    await page.goto("https://www.freepik.com", { waitUntil: "networkidle2" });

    const newCookies = await page.cookies();
    writeCookiesToFile(newCookies);
  } catch (err) {
    return;
  } finally {
    await browser.close();
  }
}, 600000);

app.post("/download", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Invalid input" });
    }

    const cookies = readCookiesFromFile();
    const result = await getDownloadResponseUrl(url, cookies);

    const cookieHeader = cookies
      .filter((cookie) => !!cookie.name && !!cookie.value)
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const response = await fetch(result.url, {
      headers: {
        Cookie: cookieHeader,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      },
    });

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const json = await response.json();
      return res.json(json);
    }

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err?.message || err.toString() });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT} PORT`);
});
