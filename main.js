// import express from "express";
// import puppeteerExtra from "puppeteer-extra";
// import StealthPlugin from "puppeteer-extra-plugin-stealth";

// const app = express();
// app.use(express.json({ limit: "5mb" }));

// puppeteerExtra.use(StealthPlugin());

// function sanitizeCookies(cookies) {
//   return cookies.map((cookie) => {
//     const sanitized = {};
//     if (typeof cookie.name === "string") sanitized.name = cookie.name;
//     if (typeof cookie.value === "string") sanitized.value = cookie.value;
//     if (typeof cookie.domain === "string") sanitized.domain = cookie.domain;
//     if (typeof cookie.path === "string") sanitized.path = cookie.path;
//     if (typeof cookie.httpOnly === "boolean")
//       sanitized.httpOnly = cookie.httpOnly;
//     if (typeof cookie.secure === "boolean") sanitized.secure = cookie.secure;
//     if (["Strict", "Lax", "None"].includes(cookie.sameSite))
//       sanitized.sameSite = cookie.sameSite;
//     if (typeof cookie.expires === "number" && cookie.expires > 0)
//       sanitized.expires = cookie.expires;
//     return sanitized;
//   });
// }

// async function getDownloadResponseUrl(freepikUrl, cookies) {
//   const browser = await puppeteerExtra.launch({ headless: "new" });
//   const page = await browser.newPage();

//   await page.setUserAgent(
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
//   );

//   await page.setViewport({ width: 1280, height: 800 });
//   await page.setCookie(...sanitizeCookies(cookies));
//   await page.goto(freepikUrl, { waitUntil: "networkidle2" });

//   return new Promise(async (resolve, reject) => {
//     let matched = false;

//     page.on("response", async (response) => {
//       const url = response.url();
//       const headers = response.headers();

//       if (!matched && url.includes("download?resource")) {
//         matched = true;
//         await browser.close();
//         resolve({
//           url,
//           contentType: headers["content-type"],
//         });
//       }
//       if (!matched && url.includes("download?walletId")) {
//         matched = true;
//         await browser.close();
//         resolve({
//           url,
//           contentType: headers["content-type"],
//         });
//       }
//     });

//     try {
//       await page.waitForSelector('button[data-cy="download-button"]', {
//         visible: true,
//         timeout: 10000,
//       });

//       await page.evaluate(() => {
//         const btn = document.querySelector('button[data-cy="download-button"]');
//         if (btn) btn.scrollIntoView({ behavior: "smooth", block: "center" });
//       });

//       await page.click('button[data-cy="download-button"]');
//     } catch (err) {
//       await browser.close();
//       reject("Failed to find or click download button");
//     }

//     setTimeout(async () => {
//       if (!matched) {
//         await browser.close();
//         reject("Download URL not found");
//       }
//     }, 15000);
//   });
// }

// app.post("/download", async (req, res) => {
//   try {
//     const { url, cookies } = req.body;

//     if (!url || !cookies || !Array.isArray(cookies)) {
//       return res.status(400).json({ error: "Invalid input" });
//     }

//     const result = await getDownloadResponseUrl(url, cookies);
//     res.json({
//       type: "download?resource",
//       url: result.url,
//       contentType: result.contentType,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.toString() });
//   }
// });

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on ${PORT} PORT`);
// });

// import express from "express";
// import puppeteerExtra from "puppeteer-extra";
// import StealthPlugin from "puppeteer-extra-plugin-stealth";
// import fs from "fs";
// import path from "path";

// const app = express();

// app.use(express.json({ limit: "5mb" }));
// app.use(express.urlencoded({ extended: true }));

// puppeteerExtra.use(StealthPlugin());

// const COOKIES_PATH = path.resolve("./cookies.json");

// function sanitizeCookies(cookies) {
//   return cookies.map((cookie) => {
//     const sanitized = {};
//     if (typeof cookie.name === "string") sanitized.name = cookie.name;
//     if (typeof cookie.value === "string") sanitized.value = cookie.value;
//     if (typeof cookie.domain === "string") sanitized.domain = cookie.domain;
//     if (typeof cookie.path === "string") sanitized.path = cookie.path;
//     if (typeof cookie.httpOnly === "boolean")
//       sanitized.httpOnly = cookie.httpOnly;
//     if (typeof cookie.secure === "boolean") sanitized.secure = cookie.secure;
//     if (["Strict", "Lax", "None"].includes(cookie.sameSite))
//       sanitized.sameSite = cookie.sameSite;
//     if (typeof cookie.expires === "number" && cookie.expires > 0)
//       sanitized.expires = cookie.expires;
//     return sanitized;
//   });
// }

// function readCookiesFromFile() {
//   try {
//     if (fs.existsSync(COOKIES_PATH)) {
//       const data = fs.readFileSync(COOKIES_PATH, "utf-8");
//       return JSON.parse(data);
//     }
//     return [];
//   } catch (err) {
//     console.error("Failed to read cookies file:", err);
//     return [];
//   }
// }

// async function getDownloadResponseUrl(freepikUrl, cookies) {
//   const browser = await puppeteerExtra.launch({ headless: "new" });
//   const page = await browser.newPage();

//   await page.setUserAgent(
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
//   );

//   await page.setViewport({ width: 1280, height: 800 });

//   // Set cookies from file, if any
//   if (cookies.length > 0) {
//     await page.setCookie(...sanitizeCookies(cookies));
//   }

//   await page.goto(freepikUrl, { waitUntil: "networkidle2" });

//   return new Promise(async (resolve, reject) => {
//     let matched = false;

//     page.on("response", async (response) => {
//       const url = response.url();
//       const headers = response.headers();

//       if (
//         !matched &&
//         (url.includes("download?resource") || url.includes("download?walletId"))
//       ) {
//         matched = true;
//         await browser.close();

//         resolve({
//           url,
//           contentType: headers["content-type"],
//         });
//       }
//     });

//     try {
//       await page.waitForSelector('button[data-cy="download-button"]', {
//         visible: true,
//         timeout: 10000,
//       });

//       await page.evaluate(() => {
//         const btn = document.querySelector('button[data-cy="download-button"]');
//         if (btn) btn.scrollIntoView({ behavior: "smooth", block: "center" });
//       });

//       await page.click('button[data-cy="download-button"]');
//     } catch (err) {
//       await browser.close();
//       reject({
//         error: "Failed to find or click download button",
//       });
//     }

//     setTimeout(async () => {
//       if (!matched) {
//         await browser.close();
//         reject({
//           error: "Download URL not found",
//         });
//       }
//     }, 15000);
//   });
// }

// app.post("/download", async (req, res) => {
//   try {
//     const { url } = req.body;

//     if (!url || typeof url !== "string") {
//       return res.status(400).json({ error: "Invalid input" });
//     }

//     // Read cookies from file (no locking here for simplicity)
//     const cookies = readCookiesFromFile();

//     const result = await getDownloadResponseUrl(url, cookies);

//     // NO cookie writing here!

//     res.json({
//       type: "download?resource",
//       url: result.url,
//       contentType: result.contentType,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.error || err.toString() });
//   }
// });

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on ${PORT} PORT`);
// });

import express from "express";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import cors from "cors";

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
    console.error("Failed to read cookies file:", err);
    return [];
  }
}

function writeCookiesToFile(cookies) {
  try {
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write cookies to file:", err);
  }
}

async function getDownloadResponseUrl(freepikUrl, cookies) {
  const browser = await puppeteerExtra.launch({ headless: "new" });
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

setInterval(async () => {
  const cookies = readCookiesFromFile();
  const browser = await puppeteerExtra.launch({ headless: "new" });
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
    console.error("❌ Interval error:", err);
  } finally {
    await browser.close();
  }
}, 5 * 60 * 1000); // 5 minutes

app.post("/download", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Invalid input" });
    }

    const cookies = readCookiesFromFile();

    const result = await getDownloadResponseUrl(url, cookies);

    res.json({
      type: "download?resource",
      url: result.url,
      contentType: result.contentType,
    });
  } catch (err) {
    res.status(500).json({ error: err.error || err.toString() });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT} PORT`);
});
