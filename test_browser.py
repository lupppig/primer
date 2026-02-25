import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: errors.append(str(err)))
        
        try:
            await page.goto("http://localhost:5174/", wait_until="networkidle")
        except Exception as e:
            errors.append(str(e))
            
        print("--- BROWSER ERRORS ---")
        for err in errors:
            print(err)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
