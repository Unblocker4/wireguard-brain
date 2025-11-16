import Gateway from '../models/gateway.model.js';
import User from '../models/user.model.js';

export const createGateway = async (req, res) => {
  try {
    const { name, apiEndpoint, apiKey, subnet, wgPublicKey } = req.body;

    // Basic validation
    if (!name || !apiEndpoint || !apiKey || !subnet || !wgPublicKey) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newGateway = new Gateway({
      name,
      apiEndpoint,
      apiKey,
      subnet,
      wgPublicKey
    });

    await newGateway.save();
    res.status(201).json(newGateway);

  } catch (error) {
    if (error.code === 11000) { // Duplicate key
      return res.status(409).json({ error: 'Gateway name already exists' });
    }
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

export const listGateways = async (req, res) => {
    try {
      const gateways = await Gateway.find()
        .select('-apiKey') // Always hide the API key
        .sort({ name: 1 }); // Sort alphabetically
        
      res.status(200).json(gateways);
    } catch (error) {
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  };


  export const updateGateway = async (req, res) => {
    try {
      const { id } = req.params;
      
      // Define which fields an admin is allowed to update
      const { name, apiEndpoint, apiKey, subnet, wgPublicKey } = req.body;
      
      const updateData = {};
      if (name) updateData.name = name;
      if (apiEndpoint) updateData.apiEndpoint = apiEndpoint;
      if (apiKey) updateData.apiKey = apiKey; // Allow updating the key
      if (subnet) updateData.subnet = subnet;
      if (wgPublicKey) updateData.wgPublicKey = wgPublicKey;
      
      // Find and update the document
      const updatedGateway = await Gateway.findByIdAndUpdate(
        id,
        { $set: updateData },
        { 
          new: true, // Return the modified document
          runValidators: true // Run schema validators (e.g., 'required')
        }
      ).select('-apiKey'); // Don't return the key
  
      if (!updatedGateway) {
        return res.status(404).json({ error: 'Gateway not found' });
      }
  
      res.status(200).json(updatedGateway);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: 'Gateway name already exists' });
      }
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  };
  
  export const deleteGateway = async (req, res) => {
    try {
      const { id } = req.params;
  
      // !! CRITICAL CHECK !!
      // Do not delete a gateway if users are still assigned to it.
      const userCount = await User.countDocuments({ assignedGateway: id });
      if (userCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete gateway: ${userCount} users are still assigned to it. Please re-assign them first.` 
        });
      }
  
      const gateway = await Gateway.findByIdAndDelete(id);
  
      if (!gateway) {
        return res.status(404).json({ error: 'Gateway not found' });
      }
  
      res.status(200).json({ message: 'Gateway deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  };