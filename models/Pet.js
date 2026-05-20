import mongoose from 'mongoose';

const petSchema = new mongoose.Schema({
  petName: { type: String, required: true, trim: true },
  species: {
    type: String, required: true,
    enum: ['Dog', 'Cat', 'Bird', 'Rabbit', 'Fish', 'Hamster', 'Other']
  },
  breed: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 0 },
  gender: { type: String, required: true, enum: ['Male', 'Female'] },
  image: { type: String, required: true },
  healthStatus: { type: String, required: true },
  vaccinationStatus: {
    type: String, required: true,
    enum: ['Vaccinated', 'Not Vaccinated', 'Partially Vaccinated']
  },
  location: { type: String, required: true },
  adoptionFee: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  ownerEmail: { type: String, required: true, lowercase: true },
  ownerName: { type: String, required: true },
  status: { type: String, enum: ['available', 'adopted'], default: 'available' },
}, { timestamps: true });

petSchema.index({ petName: 'text' });

export default mongoose.model('Pet', petSchema);
