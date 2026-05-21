import express from 'express';
import AdoptionRequest from '../models/AdoptionRequest.js';
import Pet from '../models/Pet.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

// POST /api/requests — Submit adoption request (Private)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { petId, petName, pickupDate, message } = req.body;

    const pet = await Pet.findById(petId);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });

    // Owner cannot request their own pet
    if (pet.ownerEmail === req.user.email) {
      return res.status(403).json({ message: 'You cannot adopt your own pet listing.' });
    }

    // Pet must be available
    if (pet.status === 'adopted') {
      return res.status(400).json({ message: 'This pet has already been adopted.' });
    }

    // Check duplicate request
    const existing = await AdoptionRequest.findOne({
      petId,
      requesterEmail: req.user.email,
      status: { $in: ['pending', 'approved'] }
    });
    if (existing) {
      return res.status(400).json({ message: 'You have already submitted a request for this pet.' });
    }

    const request = new AdoptionRequest({
      petId,
      petName,
      requesterName: req.user.name,
      requesterEmail: req.user.email,
      ownerEmail: pet.ownerEmail,
      pickupDate,
      message,
    });

    await request.save();
    res.status(201).json({ success: true, message: 'Adoption request submitted!', request });
  } catch (error) {
    res.status(400).json({ message: 'Failed to submit request', error: error.message });
  }
});

// GET /api/requests/my-requests — Requester's own requests (Private)
router.get('/my-requests', verifyToken, async (req, res) => {
  try {
    const requests = await AdoptionRequest.find({ requesterEmail: req.user.email })
      .populate('petId', 'image petName species')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/requests/pet/:petId — Requests for a specific pet (Private, owner only)
router.get('/pet/:petId', verifyToken, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.petId);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    if (pet.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const requests = await AdoptionRequest.find({ petId: req.params.petId })
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH /api/requests/:id/approve — Approve request (Private, owner only)
router.patch('/:id/approve', verifyToken, async (req, res) => {
  try {
    const request = await AdoptionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed.' });
    }

    // Check if pet already adopted
    const pet = await Pet.findById(request.petId);
    if (pet.status === 'adopted') {
      return res.status(400).json({ message: 'Pet is already adopted.' });
    }

    // Approve this request
    request.status = 'approved';
    await request.save();

    // Mark pet as adopted
    await Pet.findByIdAndUpdate(request.petId, { status: 'adopted' });

    // Reject all other pending requests for this pet
    await AdoptionRequest.updateMany(
      { petId: request.petId, _id: { $ne: request._id }, status: 'pending' },
      { status: 'rejected' }
    );

    res.json({ success: true, message: 'Request approved! Pet is now adopted.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH /api/requests/:id/reject — Reject request (Private, owner only)
router.patch('/:id/reject', verifyToken, async (req, res) => {
  try {
    const request = await AdoptionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed.' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ success: true, message: 'Request rejected.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/requests/:id — Cancel request (Private, requester only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const request = await AdoptionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.requesterEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await AdoptionRequest.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Request cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
