import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
export const connectMongo = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/airwatch';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB raw payload archive');
};
