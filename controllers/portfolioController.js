// controllers/portfolioController.js
import Portfolio from '../models/Portfolio.js';

export const getPortfolios = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query = {
      isActive: true,
      name: { $regex: search, $options: 'i' }
    };

    const total = await Portfolio.countDocuments(query);
    const portfolios = await Portfolio.find(query)
      .populate('createdBy updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ total, portfolios });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch portfolios' });
  }
};

export const getPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id).populate('createdBy updatedBy', 'name email');
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    res.json(portfolio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch portfolio' });
  }
};

export const createPortfolio = async (req, res) => {
  try {
    const portfolio = new Portfolio({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user?._id,
      isActive: true,
    });
    await portfolio.save();
    res.status(201).json({ message: 'Portfolio created', portfolio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create portfolio' });
  }
};

export const updatePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });

    portfolio.name = req.body.name;
    portfolio.description = req.body.description;
    portfolio.updatedBy = req.user?._id;

    await portfolio.save();
    res.json({ message: 'Portfolio updated', portfolio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update portfolio' });
  }
};

export const deletePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });

    await Portfolio.findByIdAndDelete(req.params.id);
    res.json({ message: 'Portfolio deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete portfolio' });
  }
};

export const togglePortfolioStatus = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });

    portfolio.isActive = !portfolio.isActive;
    portfolio.updatedBy = req.user?._id;
    await portfolio.save();

    res.json({ message: 'Portfolio status updated', isActive: portfolio.isActive });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to toggle portfolio status' });
  }
};
