import { Request, Response } from 'express';
import * as StationModel from '../models/stationModel';
import { asyncHandler, AppError } from '../middleware/errorMiddleware';
import { invalidateAirQualityCache } from '../config/redis';

const validateStationBody = (body: any) => {
  const { name, location_name, latitude, longitude } = body;

  if (!name || !location_name) {
    throw new AppError('name and location_name are required', 400);
  }
  if (latitude !== undefined && latitude !== null && typeof latitude !== 'number') {
    throw new AppError('latitude must be a number', 400);
  }
  if (longitude !== undefined && longitude !== null && typeof longitude !== 'number') {
    throw new AppError('longitude must be a number', 400);
  }
};

// GET /api/stations
export const getStations = asyncHandler(async (req: Request, res: Response) => {
  const stations = await StationModel.getAllStations();
  res.status(200).json({ status: 'success', data: stations });
});

// GET /api/stations/:id
export const getStation = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const station = await StationModel.getStationById(id);

  if (!station) {
    throw new AppError('Station not found', 404);
  }
  res.status(200).json({ status: 'success', data: station });
});

// POST /api/stations (protected)
export const addStation = asyncHandler(async (req: Request, res: Response) => {
  validateStationBody(req.body);
  const { name, location_name, latitude, longitude } = req.body;

  const station = await StationModel.createStation(
    name,
    location_name,
    latitude ?? null,
    longitude ?? null
  );
  await invalidateAirQualityCache();
  res.status(201).json({ status: 'success', data: station });
});

// PUT /api/stations/:id (protected)
export const editStation = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  validateStationBody(req.body);
  const { name, location_name, latitude, longitude } = req.body;

  const station = await StationModel.updateStation(
    id,
    name,
    location_name,
    latitude ?? null,
    longitude ?? null
  );

  if (!station) {
    throw new AppError('Station not found', 404);
  }
  await invalidateAirQualityCache();
  res.status(200).json({ status: 'success', data: station });
});

// DELETE /api/stations/:id (protected)
export const removeStation = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const deleted = await StationModel.deleteStation(id);

  if (!deleted) {
    throw new AppError('Station not found', 404);
  }
  await invalidateAirQualityCache();
  res.status(200).json({ status: 'success', message: 'Station deleted successfully' });
});
