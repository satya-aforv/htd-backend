import EmployeeTravelLog from '../models/EmployeeTravelLog.js';

export const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query = search ? {
      $or: [
        { employeeId: { $regex: search, $options: 'i' } },
        { startFrom: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { purpose: { $regex: search, $options: 'i' } },
      ]
    } : {};
    const logs = await EmployeeTravelLog.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await EmployeeTravelLog.countDocuments(query);
    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
};

export const getLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await EmployeeTravelLog.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }
    res.json({ log });
  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ message: 'Failed to fetch log' });
  }
};

export const createLog = async (req, res) => {
  try {
    const data = req.body;
    const log = new EmployeeTravelLog({
      ...data,
      createdBy: req.user._id,
    });
    await log.save();
    await log.populate('createdBy', 'name email');
    res.status(201).json({ message: 'Log created successfully', log });
  } catch (error) {
    console.error('Create log error:', error);
    res.status(500).json({ message: 'Failed to create log' });
  }
};

export const updateLog = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const log = await EmployeeTravelLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }
    Object.assign(log, data);
    log.updatedBy = req.user._id;
    await log.save();
    await log.populate('updatedBy', 'name email');
    res.json({ message: 'Log updated successfully', log });
  } catch (error) {
    console.error('Update log error:', error);
    res.status(500).json({ message: 'Failed to update log' });
  }
};

export const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await EmployeeTravelLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }
    await EmployeeTravelLog.findByIdAndDelete(id);
    res.json({ message: 'Log deleted successfully' });
  } catch (error) {
    console.error('Delete log error:', error);
    res.status(500).json({ message: 'Failed to delete log' });
  }
}; 