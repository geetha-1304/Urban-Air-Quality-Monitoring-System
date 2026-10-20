import { pool } from '../config/db';
import { Station } from '../types';

export const getAllStations = async (): Promise<Station[]> => (await pool.query('SELECT * FROM stations ORDER BY id ASC')).rows;
export const getStationById = async (id: number): Promise<Station | null> => (await pool.query('SELECT * FROM stations WHERE id = $1', [id])).rows[0] || null;
export const stationExists = async (id: number): Promise<boolean> => (await pool.query('SELECT id FROM stations WHERE id = $1', [id])).rowCount !== 0;
export const createStation = async (name: string, location_name: string, latitude: number | null, longitude: number | null): Promise<Station> =>
  (await pool.query('INSERT INTO stations(name,location_name,latitude,longitude) VALUES($1,$2,$3,$4) RETURNING *',[name,location_name,latitude,longitude])).rows[0];
export const updateStation = async (id:number,name:string,location_name:string,latitude:number|null,longitude:number|null):Promise<Station|null>=>
  (await pool.query('UPDATE stations SET name=$1,location_name=$2,latitude=$3,longitude=$4 WHERE id=$5 RETURNING *',[name,location_name,latitude,longitude,id])).rows[0]||null;
export const deleteStation = async (id:number):Promise<boolean> => (await pool.query('DELETE FROM stations WHERE id=$1',[id])).rowCount !== 0;

export const seedStations = async () => {
  const places = [
    ['Anna Nagar Station','Anna Nagar, Chennai',13.0857,80.2104],['T Nagar Station','T Nagar, Chennai',13.0413,80.2334],['Velachery Station','Velachery, Chennai',12.9792,80.2212],
    ['Alandur Station','Alandur, Chennai',13.0025,80.2061],['Adyar Station','Adyar, Chennai',13.0063,80.2574],['Perungudi Station','Perungudi, Chennai',12.9600,80.2400],
    ['Royapuram Station','Royapuram, Chennai',13.1137,80.2954],['Manali Station','Manali, Chennai',13.1667,80.2667],['Kodungaiyur Station','Kodungaiyur, Chennai',13.1333,80.2500],
    ['Thiruvottiyur Station','Thiruvottiyur, Chennai',13.1600,80.3000],['Thoraipakkam Station','Thoraipakkam, Chennai',12.9416,80.2362],['Sholinganallur Station','Sholinganallur, Chennai',12.9010,80.2279],
    ['Guindy Station','Guindy, Chennai',13.0067,80.2206],['Mylapore Station','Mylapore, Chennai',13.0368,80.2676],['Nungambakkam Station','Nungambakkam, Chennai',13.0569,80.2425],
  ] as const;
  for (const [name, location, latitude, longitude] of places) {
    const found = await pool.query('SELECT id FROM stations WHERE name=$1 LIMIT 1',[name]);
    if (!found.rowCount) await pool.query('INSERT INTO stations(name,location_name,latitude,longitude) VALUES($1,$2,$3,$4)',[name,location,latitude,longitude]);
  }
};
