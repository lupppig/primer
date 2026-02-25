import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if "error" in msg.type else None)
        page.on("pageerror", lambda err: errors.append(str(err)))
        
        print("Navigating to site...")
        try:
            await page.goto("http://localhost:5176/dashboard", wait_until="networkidle")
            
            # Click standard new design button
            await page.click("text=Create New Design")
            await page.wait_for_timeout(2000)
            
        except Exception as e:
            errors.append(str(e))
            
        print("--- BROWSER ERRORS ---")
        for err in errors:
            print(err)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
