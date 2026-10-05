import json
import random
from pathlib import Path
from faker import Faker

fake = Faker('en_IN')

# Keep seed constant so pool is consistent across runs
Faker.seed(42)
random.seed(42)

POOL_FILE = Path(__file__).resolve().parent.parent / "data" / "account_pool.json"

def generate_pool():
    print("Generating synthetic account pool...")
    victims = []
    for _ in range(50):
        victims.append({
            "account_number": str(fake.random_number(digits=10, fix_len=True)),
            "phone_number": fake.phone_number(),
            "name": fake.name(),
            "upi_id": f"{fake.user_name()}@upi"
        })

    mules = []
    for _ in range(100):
        mules.append({
            "account_number": str(fake.random_number(digits=10, fix_len=True)),
            "phone_number": fake.phone_number(),
            "name": fake.name(),
            "upi_id": f"{fake.user_name()}@muleupi",
            "device_id": f"DEV-{fake.uuid4()[:8]}"
        })

    atms = []
    # Real-ish coordinates for major Indian cities
    cities = {
        "Delhi": {"lat": (28.4, 28.8), "lon": (76.9, 77.4)},
        "Mumbai": {"lat": (18.9, 19.3), "lon": (72.8, 73.1)},
        "Bangalore": {"lat": (12.8, 13.1), "lon": (77.5, 77.8)},
        "Kolkata": {"lat": (22.4, 22.7), "lon": (88.3, 88.5)}
    }
    
    city_names = list(cities.keys())
    for _ in range(150): # 30 ATMs per city roughly
        city = random.choice(city_names)
        bounds = cities[city]
        atms.append({
            "atm_id": f"ATM-{fake.random_int(min=1000, max=9999)}",
            "lat": round(random.uniform(bounds["lat"][0], bounds["lat"][1]), 4),
            "lon": round(random.uniform(bounds["lon"][0], bounds["lon"][1]), 4),
            "name": f"{fake.company()} ATM ({city})",
            "city": city
        })

    # Create rings (chains of 3 mules)
    rings = []
    for i in range(20):
        ring_mules = random.sample(mules, 3)
        rings.append([m["account_number"] for m in ring_mules])

    pool_data = {
        "victims": victims,
        "mules": mules,
        "atms": atms,
        "rings": rings
    }

    # Ensure directory exists
    POOL_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    with open(POOL_FILE, 'w') as f:
        json.dump(pool_data, f, indent=2)
        
    return pool_data

def get_pool():
    if not POOL_FILE.exists():
        return generate_pool()
    
    with open(POOL_FILE, 'r') as f:
        return json.load(f)

if __name__ == "__main__":
    data = get_pool()
    print(f"Loaded {len(data['victims'])} victims, {len(data['mules'])} mules, {len(data['rings'])} rings.")
