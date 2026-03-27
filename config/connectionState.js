import mongoose from "mongoose";
import EventEmitter from "events";

class ConnectionState extends EventEmitter {
  connected = false;
  connecting = false;
  error = null;
}

const connectionState = new ConnectionState();

const connect = async () => {
  connectionState.connecting = true;
  console.log("Database connecting...");

  try {
    // Set mongoose connection options to improve reliability
    mongoose.set('bufferCommands', false); // Disable command buffering when disconnected
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'mbdb',
      serverSelectionTimeoutMS: 15000, // Timeout for server selection
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 30000, // Give up initial connection after 30 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      heartbeatFrequencyMS: 10000 // Check connection health every 10 seconds
    });

    // Set up connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      connectionState.connected = false;
      connectionState.error = err;
      connectionState.emit('error', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      connectionState.connected = false;
      connectionState.emit('disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      connectionState.connected = true;
      connectionState.error = null;
      connectionState.emit('reconnected');
    });

    connectionState.connected = true;
    connectionState.error = null;
    console.log("Database Connected!");
  } catch (error) {
    connectionState.error = error;
    console.error("Connection error:", error);
  } finally {
    connectionState.connecting = false;
  }
};

const disconnect = async () => {
  try {
    await mongoose.disconnect();
    connectionState.connected = false;
    console.log("Database is disconnected");
  } catch (error) {
    console.error("Error while disconnecting:", error);
  }
};

// Function to check connection health
const checkConnection = () => {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    error: connectionState.error
  };
};

export { connectionState, connect, disconnect, checkConnection };
