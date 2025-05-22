import express from "express";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import PQueue from "p-queue";

dotenv.config();

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

puppeteerExtra.use(StealthPlugin());

const COOKIES_PATH = path.resolve("./cookies.json");
const REFRESH_INTERVAL = 5 * 60 * 1000;
let refreshTimer = null;

// 🔒 Concurrency control
const queue = new PQueue({ concurrency: 2 }); // allow 2 simultaneous Puppeteer jobs

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
  } catch (_) {}
  return [];
}

function writeCookiesToFile(cookies) {
  try {
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2), "utf-8");
  } catch (_) {}
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
      if (
        !matched &&
        (url.includes("download?resource") || url.includes("download?walletId"))
      ) {
        matched = true;

        try {
          const downloadPage = await browser.newPage();
          await downloadPage.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
          );
          await downloadPage.setViewport({ width: 1280, height: 800 });

          if (cookies.length > 0) {
            await downloadPage.setCookie(...sanitizeCookies(cookies));
          }

          const responseOnDownloadPage = await downloadPage.goto(url, {
            waitUntil: "networkidle2",
          });

          const dwJs = await responseOnDownloadPage.json();
          const newCookies = await downloadPage.cookies();
          writeCookiesToFile(newCookies);

          await downloadPage.close();
          await browser.close();
          resetRefreshTimer();
          resolve(dwJs);
        } catch (e) {
          await browser.close();
          reject({ error: "Failed to process download page." });
        }
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
      return reject({ error: "Download button not found or not clickable" });
    }

    setTimeout(async () => {
      if (!matched) {
        await browser.close();
        reject({ error: "Download response not captured in time." });
      }
    }, 15000);
  });
}

async function refreshCookies() {
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
    console.error("Failed to refresh cookies", err);
  } finally {
    await browser.close();
  }
}

function startRefreshInterval() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    refreshCookies();
  }, REFRESH_INTERVAL);
}

function resetRefreshTimer() {
  startRefreshInterval();
}

startRefreshInterval();

app.post("/download", async (req, res) => {
  const { url, secret } = req.body;

  if (secret !== process.env.SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Invalid input" });
  }

  resetRefreshTimer();

  const cookies = readCookiesFromFile();

  try {
    const result = await queue.add(() => getDownloadResponseUrl(url, cookies));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.error || "Unexpected server error." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
