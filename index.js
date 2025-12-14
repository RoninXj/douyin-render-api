const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
// Render 会通过环境变量 PORT 告诉我们用哪个端口，默认 3000
const PORT = process.env.PORT || 4000;

const extractUrl = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
};

// 特征扫描工具
const scan = (obj, key) => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj[key]) return obj;
    if (Array.isArray(obj)) {
        for (let i of obj) {
            const res = scan(i, key);
            if (res) return res;
        }
    } else {
        for (let k in obj) {
            if (k === 'log_pb' || k === 'extra') continue;
            const res = scan(obj[k], key);
            if (res) return res;
        }
    }
    return null;
};

const parseDouyin = async (shareText) => {
    let browser = null;
    try {
        const rawUrl = extractUrl(shareText);
        if (!rawUrl) throw new Error("未检测到链接");
        console.log(`[Render] 解析链接: ${rawUrl}`);

        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // 伪装成 iPhone (Render 的 IP 比较干净，通常用手机 UA 就能拿到数据)
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
        await page.setViewport({ width: 390, height: 844 });

        // 访问
        await page.goto(rawUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // 等待数据
        try {
            await page.waitForSelector('#RENDER_DATA', { timeout: 4000 });
        } catch(e) {
            await new Promise(r => setTimeout(r, 1500));
        }

        // 提取 JSON
        const data = await page.evaluate(() => {
            try {
                const el = document.getElementById('RENDER_DATA');
                if (el) return JSON.parse(decodeURIComponent(el.innerText));
                return window._ROUTER_DATA || window.__UNIVERSAL_DATA_FOR_REHYDRATION || null;
            } catch (e) {
                return null;
            }
        });

        if (!data) throw new Error("未提取到页面数据 (可能触发验证码)");

        // 扫描链接
        let videoObj = scan(data, 'play_addr');
        let musicObj = scan(data, 'play_url');

        let result = {
            title: "未知标题",
            author: "未知作者",
            cover: "",
            music_url: "",
            video_url: ""
        };

        if (videoObj && videoObj.play_addr?.url_list) {
            result.video_url = videoObj.play_addr.url_list[0].replace('playwm', 'play');
            result.cover = videoObj.cover?.url_list?.[0];
            if (videoObj.desc) result.title = videoObj.desc;
        }

        if (musicObj) {
            const m = musicObj.music || musicObj;
            if (m.play_url?.url_list) {
                result.music_url = m.play_url.url_list[0];
                result.author = m.author || result.author;
                result.title = m.title || result.title;
            }
        }

        if (!result.music_url && !result.video_url) {
            throw new Error("解析成功但未找到有效链接");
        }

        return result;

    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
};

app.get('/douyin', async (req, res) => {
    const { url } = req.query;
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (!url) return res.json({ code: 400, msg: '请提供 url 参数' });

    try {
        const result = await parseDouyin(url);
        res.json({
            code: 200,
            msg: "解析成功",
            data: {
                title: result.title,
                singer: result.author,
                cover: result.cover,
                url: result.music_url,
                video: result.video_url,
                lyric: ""
            }
        });
    } catch (error) {
        res.json({ code: 500, msg: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});