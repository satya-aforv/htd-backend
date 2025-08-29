import State from '../models/State.js';

export const getStates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
      ]
    } : {};
    
    const states = await State.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await State.countDocuments(query);
    
    res.json({
      states,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get states error:', error);
    res.status(500).json({ message: 'Failed to fetch states' });
  }
};

export const getState = async (req, res) => {
  try {
    const { id } = req.params;
    
    const state = await State.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!state) {
      return res.status(404).json({ message: 'State not found' });
    }
    
    res.json(state);
  } catch (error) {
    console.error('Get state error:', error);
    res.status(500).json({ message: 'Failed to fetch state' });
  }
};

export const createState = async (req, res) => {
  try {
    const { name, code, country, population, area, capital } = req.body;
    
    // Check if code already exists
    const existingState = await State.findOne({ code });
    if (existingState) {
      return res.status(400).json({ message: 'State code already exists' });
    }
    
    const state = new State({
      name,
      code,
      country,
      population,
      area,
      capital,
      createdBy: req.user._id,
    });
    
    await state.save();
    await state.populate('createdBy', 'name email');
    
    res.status(201).json({
      message: 'State created successfully',
      state,
    });
  } catch (error) {
    console.error('Create state error:', error);
    res.status(500).json({ message: 'Failed to create state' });
  }
};

export const updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, country, population, area, capital, isActive } = req.body;
    
    const state = await State.findById(id);
    if (!state) {
      return res.status(404).json({ message: 'State not found' });
    }
    
    // Check if code already exists (excluding current state)
    if (code !== state.code) {
      const existingState = await State.findOne({ code, _id: { $ne: id } });
      if (existingState) {
        return res.status(400).json({ message: 'State code already exists' });
      }
    }
    
    // Update fields
    state.name = name;
    state.code = code;
    state.country = country;
    state.population = population;
    state.area = area;
    state.capital = capital;
    state.isActive = isActive;
    state.updatedBy = req.user._id;
    
    await state.save();
    await state.populate('createdBy', 'name email');
    await state.populate('updatedBy', 'name email');
    
    res.json({
      message: 'State updated successfully',
      state,
    });
  } catch (error) {
    console.error('Update state error:', error);
    res.status(500).json({ message: 'Failed to update state' });
  }
};

export const deleteState = async (req, res) => {
  try {
    const { id } = req.params;
    
    const state = await State.findById(id);
    if (!state) {
      return res.status(404).json({ message: 'State not found' });
    }
    
    await State.findByIdAndDelete(id);
    
    res.json({ message: 'State deleted successfully' });
  } catch (error) {
    console.error('Delete state error:', error);
    res.status(500).json({ message: 'Failed to delete state' });
  }
};