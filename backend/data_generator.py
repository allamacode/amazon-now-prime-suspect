import asyncio
import json
import random
import time
import uuid

# Broad regions
REGIONS = ["US-East", "US-West", "Europe", "Asia", "South America"]

# Mock users
REGULAR_USERS = [f"user_{i}" for i in range(100, 150)]
SOCKPUPPET_USERS = [f"sockpuppet_{i}" for i in range(1, 5)] # These will share the same style and IP
BOT_USERS = [f"bot_{i}" for i in range(1, 5)]

# IP Mappings
USER_IPS = {u: f"192.168.1.{10 + i}" for i, u in enumerate(REGULAR_USERS)}
for u in BOT_USERS:
    USER_IPS[u] = f"45.33.{random.randint(1, 250)}.{random.randint(1, 250)}"
for u in SOCKPUPPET_USERS:
    USER_IPS[u] = "104.28.31.22" # Sockpuppets explicitly share the exact same IP

# Stylistic templates
NORMAL_TEMPLATES = [
    "I really liked this product. It works exactly as described.",
    "Not bad, but the shipping was a bit slow.",
    "Five stars! Would highly recommend to anyone looking for this.",
    "It broke after two days. Very disappointed with the quality.",
    "Decent value for the price, though the packaging was damaged."
]

# Sockpuppet signature: Highly specific, strange phrasing and weird punctuation
SOCKPUPPET_SIGNATURES = [
    "ABSOLUTELY outstanding!!!! The craftsmanship... is beyond compare... definitely buying again!!!",
    "TRULY remarkable!!!! The quality... is without equal... surely purchasing more!!!",
    "SIMPLY fantastic!!!! The design... is unmatched... absolutely getting another!!!"
]

# Bot signature: Highly repetitive, keyword stuffed
BOT_SIGNATURES = [
    "buy now cheap discount great price buy now cheap discount",
    "best product best price best product best price click here",
    "amazing amazing amazing amazing amazing amazing"
]

async def generate_stream():
    """Generates a continuous stream of mock reviews."""
    while True:
        await asyncio.sleep(random.uniform(0.5, 2.0)) # Simulate realistic arrival rates
        
        user_type = random.choices(["normal", "sockpuppet", "bot"], weights=[0.7, 0.2, 0.1])[0]
        
        if user_type == "normal":
            user_id = random.choice(REGULAR_USERS)
            
            # Add significant random noise to normal messages so they don't falsely trigger the NLP clustering
            import string
            noise_length = random.randint(1, 8)
            noise_words = [''.join(random.choices(string.ascii_lowercase, k=random.randint(2, 8))) for _ in range(noise_length)]
            noise = ' '.join(noise_words)
            punctuation = random.choice(['.', '!', '...', ''])
            text = random.choice(NORMAL_TEMPLATES) + f" {noise}{punctuation}"
            
            region = random.choice(REGIONS)
        elif user_type == "sockpuppet":
            # Sockpuppets come from different fake accounts but share the same region and style
            user_id = random.choice(SOCKPUPPET_USERS)
            text = random.choice(SOCKPUPPET_SIGNATURES)
            region = "Europe" # Anchor them to a region to simulate a localized farm
        else:
            user_id = random.choice(BOT_USERS)
            text = random.choice(BOT_SIGNATURES)
            region = random.choice(REGIONS)
            
        payload = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "text": text,
            "region": region,
            "ip_address": USER_IPS.get(user_id, "127.0.0.1"),
            "timestamp": time.time(),
            "type": user_type # Hidden truth for debugging, though the frontend will rely on NLP engine
        }
        
        yield payload
