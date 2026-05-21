import express from 'express';
import Pet from '../models/Pet.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

// GET /api/pets — All pets with search, filter, sort (Public)
router.get('/', async (req, res) => {
  try {
    const { search, species, sort } = req.query;
    let query = {};

    // Search by name using $regex
    if (search) {
      query.petName = { $regex: search, $options: 'i' };
    }

    // Filter by species using $in
    if (species && species !== 'all') {
      const speciesArray = species.split(',');
      query.species = { $in: speciesArray };
    }

    // Only show available pets on public listing
    query.status = 'available';

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'fee_asc') sortOption = { adoptionFee: 1 };
    if (sort === 'fee_desc') sortOption = { adoptionFee: -1 };
    if (sort === 'age_asc') sortOption = { age: 1 };

    const pets = await Pet.find(query).sort(sortOption);
    res.json({ success: true, pets, total: pets.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/pets/featured — 6 featured pets (Public)
router.get('/featured', async (req, res) => {
  try {
    const pets = await Pet.find({ status: 'available' })
      .sort({ createdAt: -1 })
      .limit(6);
    res.json({ success: true, pets });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/pets/my-listings — Owner's pets (Private)
router.get('/my-listings', verifyToken, async (req, res) => {
  try {
    const pets = await Pet.find({ ownerEmail: req.user.email }).sort({ createdAt: -1 });

    const totalListings = pets.length;
    const available = pets.filter(p => p.status === 'available').length;
    const adopted = pets.filter(p => p.status === 'adopted').length;

    res.json({
      success: true,
      pets,
      stats: { totalListings, available, adopted }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/pets/:id — Single pet details (Public)
router.get('/:id', async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    res.json({ success: true, pet });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/pets — Add new pet (Private)
router.post('/', verifyToken, async (req, res) => {
  try {
    const petData = {
      ...req.body,
      ownerEmail: req.user.email,
      ownerName: req.user.name || req.body.ownerName,
    };
    const pet = new Pet(petData);
    await pet.save();
    res.status(201).json({ success: true, message: 'Pet added successfully!', pet });
  } catch (error) {
    res.status(400).json({ message: 'Failed to add pet', error: error.message });
  }
});

// PUT /api/pets/:id — Update pet (Private, owner only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    if (pet.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized. You are not the owner.' });
    }

    const updated = await Pet.findByIdAndUpdate(
      req.params.id,
      { ...req.body, ownerEmail: pet.ownerEmail },
      { new: true, runValidators: true }
    );
    res.json({ success: true, message: 'Pet updated successfully!', pet: updated });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update pet', error: error.message });
  }
});

// DELETE /api/pets/:id — Delete pet (Private, owner only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    if (pet.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized. You are not the owner.' });
    }

    await Pet.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Pet deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
