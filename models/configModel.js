// configuration.js
import mongoose from 'mongoose';

const configurationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: false , default: "distance"},
  value: { type: mongoose.Schema.Types.Mixed, required: false,  default: 10000000},
});

const Configuration = mongoose.model('Configuration', configurationSchema);

export default Configuration;
