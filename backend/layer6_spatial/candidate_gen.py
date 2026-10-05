import psycopg2
from geopy.distance import geodesic
from shared.account_pool import get_pool
from shared.env_loader import POSTGIS_PARAMS

class CandidateGenerator:
    def __init__(self):
        pool = get_pool()
        self.atms = pool['atms']
        self.db_params = POSTGIS_PARAMS
        self.postgis_available = True
        
    def find_candidates_within_radius(self, lat: float, lon: float, radius_km: float = 5.0, limit: int = 50) -> list:
        """Find ATMs within a radius using PostGIS ST_DWithin and ST_Distance."""
        candidates = []
        if self.postgis_available:
            try:
                conn = psycopg2.connect(**self.db_params)
                cur = conn.cursor()
                
                query = """
                    SELECT 
                        osm_id, 
                        name, 
                        ST_Y(geom) as lat, 
                        ST_X(geom) as lon,
                        ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography) / 1000.0 as distance_km
                    FROM candidate_locations
                    WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
                    ORDER BY distance_km ASC
                    LIMIT %s;
                """
                
                cur.execute(query, (lon, lat, lon, lat, radius_km * 1000.0, limit))
                rows = cur.fetchall()
                
                for row in rows:
                    candidates.append({
                        "atm_id": f"ATM-PG-{row[0]}",
                        "name": row[1] if row[1] else "Unknown ATM",
                        "lat": row[2],
                        "lon": row[3],
                        "distance_km": row[4]
                    })
                    
                cur.close()
                conn.close()
                
                if candidates:
                    return candidates
            except Exception as e:
                self.postgis_available = False
                print("PostGIS database unavailable. Using in-memory spatial index.", flush=True)
            
        # Fallback to in-memory geopy method
        origin = (lat, lon)
        for atm in self.atms:
            atm_loc = (atm['lat'], atm['lon'])
            dist = geodesic(origin, atm_loc).kilometers
            if dist <= radius_km:
                candidates.append({
                    "atm_id": atm['atm_id'],
                    "name": atm['name'],
                    "lat": atm['lat'],
                    "lon": atm['lon'],
                    "distance_km": dist
                })
                
        candidates.sort(key=lambda x: x['distance_km'])
        return candidates[:limit]
