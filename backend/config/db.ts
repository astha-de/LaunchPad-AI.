import mongoose from 'mongoose';

let lastConnectionError: string | null = null;
let lastAttemptAt = 0;
let inFlightConnect: Promise<boolean> | null = null;

const RETRY_COOLDOWN_MS = 3000;

function formatMongoError(rawMessage: string): string {
  if (
    rawMessage.includes('whitelist') ||
    rawMessage.includes('Could not connect to any servers')
  ) {
    return (
      'Could not reach your MongoDB Atlas cluster from this cloud server. ' +
      'In MongoDB Atlas, go to Security > Network Access > Add IP Address and allow 0.0.0.0/0 (Allow Access from Anywhere), ' +
      'and verify your MONGODB_URI credentials and cluster are active.'
    );
  }
  if (rawMessage.includes('Authentication failed') || rawMessage.includes('bad auth')) {
    return 'MongoDB Atlas authentication failed. Verify the database username and password in MONGODB_URI.';
  }
  return rawMessage;
}

export async function connectDB(force = false): Promise<boolean> {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    lastConnectionError =
      'MONGODB_URI is not configured. Add your MongoDB Atlas connection string to .env or Secrets.';
    console.warn(`[MongoDB] ${lastConnectionError}`);
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    lastConnectionError = null;
    return true;
  }

  if (inFlightConnect) {
    return inFlightConnect;
  }

  const now = Date.now();
  if (!force && lastAttemptAt > 0 && now - lastAttemptAt < RETRY_COOLDOWN_MS) {
    return false;
  }

  lastAttemptAt = now;

  inFlightConnect = (async () => {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        family: 4,
      });
      lastConnectionError = null;
      console.log('[MongoDB] Connected to MongoDB Atlas successfully.');
      return true;
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : 'Unknown MongoDB connection error';
      lastConnectionError = formatMongoError(rawMessage);
      console.warn(`[MongoDB] Connection unavailable: ${lastConnectionError}`);
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
      } catch {
        // Ignore cleanup errors
      }
      return false;
    } finally {
      inFlightConnect = null;
    }
  })();

  return inFlightConnect;
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getDBStatus(): { connected: boolean; configured: boolean; error: string | null } {
  const configured = Boolean(process.env.MONGODB_URI?.trim());
  return {
    connected: isDBConnected(),
    configured,
    error: isDBConnected() ? null : lastConnectionError,
  };
}
