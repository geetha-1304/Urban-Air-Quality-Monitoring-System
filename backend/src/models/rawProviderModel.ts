import mongoose, { Schema } from 'mongoose';
const RawProviderReadingSchema = new Schema({
  station_id: { type: Number, required: true, index: true },
  source: { type: String, required: true, default: 'open-meteo-cams' },
  observed_at: { type: Date, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  stored_at: { type: Date, default: Date.now },
}, { versionKey: false });
RawProviderReadingSchema.index({ station_id: 1, observed_at: 1 }, { unique: true });
export const RawProviderReading = mongoose.models.RawProviderReading || mongoose.model('RawProviderReading', RawProviderReadingSchema);
export const archiveProviderReading = (stationId: number, observedAt: Date, payload: unknown) =>
  RawProviderReading.updateOne({ station_id: stationId, observed_at: observedAt }, { $setOnInsert: { source: 'open-meteo-cams', payload } }, { upsert: true });
