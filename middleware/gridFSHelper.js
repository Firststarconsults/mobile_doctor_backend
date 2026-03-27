import { connectionState, connect } from "../config/connectionState.js";
import pkg from 'gridfs-stream';

const { Grid } = pkg;
let gfs;

// Ensure that the connection is open before setting up the GridFS
if (connectionState.readyState === 1) {
  gfs = Grid(connectionState.db, connectionState.mongo);
  gfs.collection('uploads');
} else {
  console.error('MongoDB connection not open.');
}

// Helper function to save a file to GridFS
export async function saveFileToGridFS(fileBuffer, filename) {
  // Ensure that the connection is established before using GridFS
  if (!connectionState.connected) {
    // If not connected, try connecting
    await connect();
  }

  // Ensure that gfs is initialized before attempting to create a write stream
  if (!gfs) {
    throw new Error('GridFS not initialized. Check MongoDB connection.');
  }

  const writeStream = gfs.createWriteStream({
    filename,
  });

  writeStream.write(fileBuffer);
  writeStream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      resolve(writeStream.id);
    });

    writeStream.on('error', (error) => {
      reject(error);
    });
  });
}
