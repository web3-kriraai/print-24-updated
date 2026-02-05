import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not set");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ DB Connection Failed:");
    console.error("==========================================");

    if (error.message.includes("authentication failed") || error.message.includes("bad auth")) {
      console.error("🔐 Authentication Error - Check username/password");
    } else if (error.message.includes("IP") || error.message.includes("whitelist")) {
      console.error("🌐 IP Whitelist Error - Add your IP to MongoDB Atlas Network Access");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.error("🔌 Connection Refused - Check network/firewall settings");
    } else if (error.message.includes("ReplicaSetNoPrimary")) {
      console.error("🔄 Replica Set Error - Cluster may be initializing");
    }

    console.error("Full error:", error.message);
    console.error("==========================================");
    process.exit(1);
  }
};

export default connectDB;
