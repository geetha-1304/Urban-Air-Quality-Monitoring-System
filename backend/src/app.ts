import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import stationRoutes from './routes/stationRoutes';
import readingRoutes from './routes/readingRoutes';
import pollutionReportRoutes from './routes/pollutionReportRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { notFound, errorHandler } from './middleware/errorMiddleware';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Urban Air Quality Backend is running',
  });
});

// Feature routes
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/reports', pollutionReportRoutes);
app.use('/api/notifications', notificationRoutes);

// These must be registered LAST: notFound catches any unmatched route,
// and errorHandler catches any error thrown/passed anywhere above it.
app.use(notFound);
app.use(errorHandler);

export default app;
