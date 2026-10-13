import requests
import json

# Test 1: Greeting
print("=" * 50)
print("TEST 1: Greeting")
r = requests.post("http://127.0.0.1:8000/assistant/chat", json={"message": "привет"})
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Intent: {data['intent']['intent']}")
print(f"  Reply: {data['message']}")
print(f"  Products: {len(data['products'])}")
session_id = data["session_id"]

# Test 2: Product search (sweet)
print("=" * 50)
print("TEST 2: Sweet food search")
r = requests.post("http://127.0.0.1:8000/assistant/chat", json={
    "message": "хочу что-то сладкое",
    "session_id": session_id
})
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Intent: {data['intent']['intent']}")
print(f"  Category: {data['intent']['category']}")
print(f"  Filters: {data['intent']['filters']}")
print(f"  NeedsClarification: {data['intent']['needs_clarification']}")
print(f"  Reply: {data['message']}")
print(f"  Products: {len(data['products'])}")
for p in data["products"]:
    print(f"    - {p['name']} (${p['price']}) [cat={p['category']}, sweet={p['is_sweet']}]")

# Test 3: Drink search
print("=" * 50)
print("TEST 3: Drink search")
r = requests.post("http://127.0.0.1:8000/assistant/chat", json={"message": "men ichmoqchiman"})
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Intent: {data['intent']['intent']}")
print(f"  Category: {data['intent']['category']}")
print(f"  Filters: {data['intent']['filters']}")
print(f"  Reply: {data['message']}")
print(f"  Products: {len(data['products'])}")
for p in data["products"]:
    print(f"    - {p['name']} (${p['price']})")

# Test 4: Uzbek food request
print("=" * 50)
print("TEST 4: Uzbek food request")
r = requests.post("http://127.0.0.1:8000/assistant/chat", json={"message": "qornim och, yegulik bor?"})
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Intent: {data['intent']['intent']}")
print(f"  Category: {data['intent']['category']}")
print(f"  Filters: {data['intent']['filters']}")
print(f"  Reply: {data['message']}")
print(f"  Products: {len(data['products'])}")
for p in data["products"]:
    print(f"    - {p['name']} (${p['price']})")
