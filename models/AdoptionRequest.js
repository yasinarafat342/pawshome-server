import mongoose from 'mongoose';

const adoptionRequestSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  petName: { type: String, required: true },
  requesterName: { type: String, required: true },
  requesterEmail: { type: String, required: true, lowercase: true },
  ownerEmail: { type: String, required: true, lowercase: true },
  pickupDate: { type: Date, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model('AdoptionRequest', adoptionRequestSchema);
