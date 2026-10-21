from playwright.sync_api import sync_playwright


def main():
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto("http://127.0.0.1:5173/login", wait_until="networkidle")
    page.screenshot(path="/tmp/yijing_login.png", full_page=True)

    email = f"e2e_{page.evaluate('Date.now()')}@example.com"
    password = "Admin123456!"

    page.get_by_placeholder("邮箱地址").fill(email)
    page.get_by_placeholder("密码").fill(password)
    page.get_by_role("button", name="没有账号？去注册").click()
    page.get_by_role("button", name="注册").click()

    page.wait_for_timeout(2500)
    page.screenshot(path="/tmp/yijing_after_signup.png", full_page=True)

    page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
    page.screenshot(path="/tmp/yijing_home.png", full_page=True)
    page.reload(wait_until="networkidle")
    page.screenshot(path="/tmp/yijing_home_after_reload.png", full_page=True)

    page.goto("http://127.0.0.1:5173/divination", wait_until="networkidle")
    page.locator("textarea").first.fill("我今年下半年事业发展如何？")
    page.get_by_role("button", name="起卦").click()
    page.wait_for_timeout(1500)
    for _ in range(60):
      if page.locator("text=依据（卦辞/爻辞）").count() > 0:
        break
      if page.locator("text=Unauthorized").count() > 0:
        break
      if page.locator("text=请求失败").count() > 0:
        break
      page.wait_for_timeout(500)
    page.screenshot(path="/tmp/yijing_divination.png", full_page=True)

    browser.close()


if __name__ == "__main__":
  main()
