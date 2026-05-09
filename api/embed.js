const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
  let { url } = req.query;

  if (!url || !/^https:\/\/vidsrc\.[a-z]+\/embed\//.test(url)) {
    return res.status(400).send("Invalid or missing URL");
  }

  // vidsrc.in is often down, fallback to vidsrc.me
  url = url.replace(/^https:\/\/vidsrc\.in\//, "https://vidsrc.me/");

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(response.data);

    const iframe = $("iframe").first();
    const pageTitle = $("title").text().trim() || "VidSrc-Embeds-NoAds made by ScriptSRC.com";

    if (!iframe.length) {
      return res.status(404).send("The iframe was not found.");
    }

    // Fix protocol-relative URLs (//domain.com -> https://domain.com)
    let iframeSrc = iframe.attr("src") || "";
    if (iframeSrc.startsWith("//")) {
      iframeSrc = "https:" + iframeSrc;
      iframe.attr("src", iframeSrc);
    }

    // Remove sandbox to allow full video player functionality
    iframe.removeAttr("sandbox");

    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="referrer" content="origin">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            background: #000;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        ${$.html(iframe)}
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Proxy error:", error.message);
    res.status(500).send("Error processing URL.");
  }
};
