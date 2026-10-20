import * as StationModel from '../models/stationModel';
import * as ReadingModel from '../models/readingModel';
import { archiveProviderReading } from '../models/rawProviderModel';
import { invalidateAirQualityCache } from '../config/redis';

interface OpenMeteoCurrent { time:string; pm2_5?:number; pm10?:number; nitrogen_dioxide?:number; sulphur_dioxide?:number; us_aqi?:number }
interface OpenMeteoResponse { current?:OpenMeteoCurrent }

// This is modelled, frequently refreshed air-quality data, not a physical sensor feed.
export const syncLiveReadings = async () => {
  const stations = await StationModel.getAllStations();
  const outcomes = await Promise.allSettled(stations.map(async (station:any) => {
    if (station.latitude == null || station.longitude == null) return false;
    const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    url.searchParams.set('latitude',String(station.latitude));
    url.searchParams.set('longitude',String(station.longitude));
    url.searchParams.set('current','pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,us_aqi');
    url.searchParams.set('timezone','UTC');
    const response = await fetch(url,{signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error(`Air quality provider returned ${response.status}`);
    const payload = await response.json() as OpenMeteoResponse;
    const current = payload.current;
    if (!current || current.pm2_5 == null || current.pm10 == null) return false;
    const recordedAt = new Date(current.time);
    try {
      await archiveProviderReading(station.id, recordedAt, payload);
    } catch (error) {
      console.warn(`Could not archive the raw provider payload for station ${station.id}:`, error);
    }
    const previous = await ReadingModel.getLatestReadingByStation(station.id);
    if (previous && new Date(previous.recorded_at).getTime() >= recordedAt.getTime()) return false;
    const aqi = Math.round(current.us_aqi ?? Math.max(current.pm2_5 * 2.1, current.pm10 * 0.8));
    await ReadingModel.createReading(station.id,aqi,current.pm2_5,current.pm10,current.nitrogen_dioxide ?? 0,current.sulphur_dioxide ?? 0,recordedAt.toISOString());
    return true;
  }));
  if (outcomes.some((result) => result.status === 'fulfilled' && result.value)) {
    await invalidateAirQualityCache();
  }
};
