// configurationController.js
import Configuration from '../models/configModel.js';

export const updateConfiguration = async (req, res) => {
  try {
    const { key, value } = req.body;
    let config = await Configuration.findOne({ key });

    if (config) {
      config.value = value;
    } else {
      config = new Configuration({ key, value });
    }

    await config.save();
    res.status(200).json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ success: false, message: 'Error updating configuration', error: error.message });
  }
};
