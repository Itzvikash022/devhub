import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not defined.");
}

// Extend the global object to cache the connection across hot reloads in development.
declare global {
  var mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Returns a cached Mongoose connection, creating one if it doesn't exist.
 * This prevents creating multiple connections during Next.js hot reloads.
 */
export async function connectToDatabase(): Promise<mongoose.Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((m) => m.connection);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
