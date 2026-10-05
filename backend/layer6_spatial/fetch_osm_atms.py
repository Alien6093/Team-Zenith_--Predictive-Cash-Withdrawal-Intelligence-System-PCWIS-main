import json
import requests
from pathlib import Path

def fetch_osm_atms():
    # Query Delhi, Mumbai, Bangalore ATMs via Overpass
    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = """
    [out:json];
    (
      node["amenity"="atm"](28.4, 76.9, 28.8, 77.4);
      node["amenity"="atm"](18.9, 72.8, 19.3, 73.1);
      node["amenity"="atm"](12.8, 77.5, 13.1, 77.8);
    );
    out center;
    """
    
    print("Fetching real ATMs from Overpass API...")
    headers = {"User-Agent": "PCWIS-Agentic-System/1.0"}
    response = requests.post(overpass_url, data={'data': overpass_query}, headers=headers)
    
    if response.status_code != 200:
        print(f"Failed to fetch ATMs from Overpass API: {response.status_code}")
        print(response.text)
        return
        
    data = response.json()
    
    atms = []
    for el in data.get('elements', []):
        atm_name = el.get('tags', {}).get('name', '')
        operator = el.get('tags', {}).get('operator', '')
        
        final_name = "OSM ATM"
        if atm_name:
            final_name = atm_name
        elif operator:
            final_name = f"{operator} ATM"
            
        lat = el['lat']
        lon = el['lon']
        
        city = "Delhi"
        if 18.9 <= lat <= 19.3:
            city = "Mumbai"
        elif 12.8 <= lat <= 13.1:
            city = "Bangalore"
            
        atms.append({
            "atm_id": f"ATM-OSM-{el['id']}",
            "lat": lat,
            "lon": lon,
            "name": f"{final_name} ({city})",
            "city": city
        })
        
    print(f"Fetched {len(atms)} real ATMs.")
    
    if not atms:
        print("No ATMs found, preserving existing data.")
        return
        
    # Update account_pool.json
    pool_file = Path(__file__).resolve().parent.parent / "data" / "account_pool.json"
    if pool_file.exists():
        with open(pool_file, 'r') as f:
            pool = json.load(f)
            
        pool['atms'] = atms
        
        with open(pool_file, 'w') as f:
            json.dump(pool, f, indent=2)
            
        print("Updated account_pool.json with real OSM ATMs.")
    else:
        print("account_pool.json not found. Run a producer script first to generate it.")

if __name__ == "__main__":
    fetch_osm_atms()
