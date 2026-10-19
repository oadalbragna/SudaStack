import requests

print("--- اختبار عمليات GET و POST مع الإنترنت ---")
try:
    r_get = requests.get("https://httpbin.org/get", timeout=10)
    print("GET Status:", r_get.status_code)
    
    r_post = requests.post("https://httpbin.org/post", json={"bot": "telegram", "active": True}, timeout=10)
    print("POST Status:", r_post.status_code)
    print("POST Response JSON:", r_post.json())
except Exception as e:
    print("Error:", e)
print("--- انتهى الاختبار بنجاح ---")
