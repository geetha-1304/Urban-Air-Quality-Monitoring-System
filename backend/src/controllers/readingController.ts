import { Request, Response } from 'express';
import * as ReadingModel from '../models/readingModel';
import * as StationModel from '../models/stationModel';
import { asyncHandler, AppError } from '../middleware/errorMiddleware';
import { syncLiveReadings } from '../services/liveAirQuality';
import { invalidateAirQualityCache } from '../config/redis';

export const refreshLiveData = asyncHandler(async (_req: Request, res: Response) => {
  await syncLiveReadings();
  res.status(200).json({ status: 'success', message: 'Current location-based air-quality data refreshed' });
});

const validateReadingBody = (body: any) => {
  const { station_id, aqi, pm2_5, pm10, no2, so2 } = body;

  if (
    station_id === undefined ||
    aqi === undefined ||
    pm2_5 === undefined ||
    pm10 === undefined ||
    no2 === undefined ||
    so2 === undefined
  ) {
    throw new AppError(
      'station_id, aqi, pm2_5, pm10, no2 and so2 are all required',
      400
    );
  }

  if (
    typeof aqi !== 'number' ||
    typeof pm2_5 !== 'number' ||
    typeof pm10 !== 'number' ||
    typeof no2 !== 'number' ||
    typeof so2 !== 'number'
  ) {
    throw new AppError('aqi, pm2_5, pm10, no2 and so2 must all be numbers', 400);
  }
};

// GET /api/readings  (optional ?station_id=)
export const getReadings = asyncHandler(async (req: Request, res: Response) => {
  const stationId = req.query.station_id ? Number(req.query.station_id) : undefined;
  const readings = await ReadingModel.getAllReadings(stationId);
  res.status(200).json({ status: 'success', data: readings });
});

// GET /api/readings/:id
export const getReading = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const reading = await ReadingModel.getReadingById(id);

  if (!reading) {
    throw new AppError('Reading not found', 404);
  }
  res.status(200).json({ status: 'success', data: reading });
});

// POST /api/readings (protected)
export const addReading = asyncHandler(async (req: Request, res: Response) => {
  validateReadingBody(req.body);
  const { station_id, aqi, pm2_5, pm10, no2, so2, recorded_at } = req.body;

  const stationFound = await StationModel.stationExists(station_id);
  if (!stationFound) {
    throw new AppError('station_id does not refer to an existing station', 400);
  }

  const reading = await ReadingModel.createReading(
    station_id,
    aqi,
    pm2_5,
    pm10,
    no2,
    so2,
    recorded_at
  );
  await invalidateAirQualityCache();
  res.status(201).json({ status: 'success', data: reading });
});

// PUT /api/readings/:id (protected)
export const editReading = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  validateReadingBody(req.body);
  const { station_id, aqi, pm2_5, pm10, no2, so2, recorded_at } = req.body;

  const stationFound = await StationModel.stationExists(station_id);
  if (!stationFound) {
    throw new AppError('station_id does not refer to an existing station', 400);
  }

  const reading = await ReadingModel.updateReading(
    id,
    station_id,
    aqi,
    pm2_5,
    pm10,
    no2,
    so2,
    recorded_at
  );

  if (!reading) {
    throw new AppError('Reading not found', 404);
  }
  await invalidateAirQualityCache();
  res.status(200).json({ status: 'success', data: reading });
});

// DELETE /api/readings/:id (protected)
export const removeReading = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const deleted = await ReadingModel.deleteReading(id);

  if (!deleted) {
    throw new AppError('Reading not found', 404);
  }
  await invalidateAirQualityCache();
  res.status(200).json({ status: 'success', message: 'Reading deleted successfully' });
});

// GET /api/readings/current/:stationId
export const getCurrentReading = asyncHandler(async (req: Request, res: Response) => {
  const stationId = Number(req.params.stationId);
  const reading = await ReadingModel.getLatestReadingByStation(stationId);

  if (!reading) {
    throw new AppError('No readings found for this station', 404);
  }
  res.status(200).json({ status: 'success', data: reading });
});

// GET /api/readings/history/:stationId?from=&to=
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const stationId = Number(req.params.stationId);
  const { from, to } = req.query as { from?: string; to?: string };

  const readings = await ReadingModel.getHistoryByStation(stationId, from, to);
  res.status(200).json({ status: 'success', data: readings });
});

// GET /api/readings/trends/:stationId
export const getTrends = asyncHandler(async (req: Request, res: Response) => {
  const stationId = Number(req.params.stationId);
  const trends = await ReadingModel.getTrendsByStation(stationId);
  res.status(200).json({ status: 'success', data: trends });
});
